/**
 * demo-export (v0.4)
 *
 * Filesystem side of the "Test in Demo" action. Kept out of the route handler so
 * the registry patching can be exercised directly against a temp directory.
 *
 * DEV ONLY — the caller (src/app/api/export-to-demo/route.ts) refuses to run this
 * when NODE_ENV === 'production'.
 */

import { promises as fs } from "fs";
import path from "path";

export function toKebabCase(str: string): string {
  return str
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();
}

export interface RegistrySnippetParts {
  /** `import { X } from './widgets/x/x';` lines. */
  imports: string[];
  /** The `'Key': { componentType: X, ... }` block, indentation preserved. */
  entry: string;
}

/**
 * Split the generated snippet (imports + a comment + the entry) into its parts.
 * The entry begins at the first line shaped like `'SomeKey': {`.
 */
export function splitRegistrySnippet(snippet: string): RegistrySnippetParts {
  const lines = snippet.split("\n");
  const imports = lines
    .filter((l) => /^\s*import\s/.test(l))
    .map((l) => l.trim());

  const entryStart = lines.findIndex((l) => /^\s*'[^']+'\s*:\s*\{/.test(l));
  const entry =
    entryStart >= 0 ? lines.slice(entryStart).join("\n").replace(/\s+$/, "") : "";

  return { imports, entry };
}

/** Escape regex metacharacters so a registry key can be interpolated into a RegExp safely. */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Index of the `}` that closes the `{` at `openIdx`. -1 when unbalanced. */
function matchingCloseBrace(source: string, openIdx: number): number {
  let depth = 0;
  for (let i = openIdx; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * Re-indent a snippet block so it lines up with the entries already in the file.
 * The generated entry is written at a fixed 4-space base; the host registry may
 * nest `widgets: {}` deeper than that.
 */
function reindentBlock(block: string, targetIndent: string): string {
  const lines = block.split("\n");
  const baseIndent = Math.min(
    ...lines
      .filter((l) => l.trim().length > 0)
      .map((l) => l.match(/^[ \t]*/)?.[0].length ?? 0)
  );
  return lines
    .map((l) => (l.trim().length === 0 ? "" : targetIndent + l.slice(baseIndent)))
    .join("\n");
}

/**
 * Insert the import lines after the last existing `import` statement, and the
 * registry entry just before the closing brace of the `widgets: { ... }` object.
 *
 * Idempotent: imports already present are skipped, and an entry whose key is
 * already registered is not added a second time.
 */
export function patchRegistrySource(
  source: string,
  parts: RegistrySnippetParts
): { patched: string; changed: boolean } {
  let content = source;
  let changed = false;

  // --- 1. imports, after the last existing import ---
  const newImports = parts.imports.filter((imp) => !content.includes(imp));
  if (newImports.length > 0) {
    const importRx = /^import\s.*$/gm;
    let m: RegExpExecArray | null;
    let lastEnd = -1;
    while ((m = importRx.exec(content)) !== null) {
      lastEnd = m.index + m[0].length;
    }
    if (lastEnd >= 0) {
      content =
        content.slice(0, lastEnd) + "\n" + newImports.join("\n") + content.slice(lastEnd);
    } else {
      content = newImports.join("\n") + "\n" + content;
    }
    changed = true;
  }

  // --- 2. entry, inside widgets: { ... } ---
  const keyMatch = parts.entry.match(/^\s*'([^']+)'/);
  const registryKey = keyMatch?.[1];

  const widgetsMatch = /widgets\s*:\s*\{/.exec(content);
  const alreadyRegistered =
    registryKey !== undefined &&
    new RegExp(`['"\`]?${escapeRegExp(registryKey)}['"\`]?\\s*:\\s*\\{`).test(
      widgetsMatch ? content.slice(widgetsMatch.index) : ""
    );

  if (parts.entry && widgetsMatch && !alreadyRegistered) {
    const openIdx = content.indexOf("{", widgetsMatch.index);
    const closeIdx = matchingCloseBrace(content, openIdx);
    if (closeIdx !== -1) {
      const before = content.slice(0, closeIdx);
      const after = content.slice(closeIdx); // starts at the closing `}`

      // Preserve the indentation the closing brace sat on, and indent the new
      // entry one level deeper — otherwise the host file's formatting degrades.
      // When `widgets: {}` sits on one line there is no newline before the brace,
      // so fall back to the indentation of the `widgets:` line itself.
      let closeIndent = before.match(/\n([ \t]*)$/)?.[1];
      if (closeIndent === undefined) {
        const lineStart = content.lastIndexOf("\n", widgetsMatch.index) + 1;
        closeIndent = content.slice(lineStart, widgetsMatch.index).match(/^[ \t]*/)?.[0] ?? "";
      }

      // Prefer the indentation the file already uses for its registry entries, so
      // we match its house style rather than imposing a 4-space step.
      const existingEntryIndent = content
        .slice(openIdx, closeIdx)
        .match(/\n([ \t]+)'[^']+'\s*:/)?.[1];
      const entry = reindentBlock(parts.entry, existingEntryIndent ?? closeIndent + "    ");

      const beforeTrimmed = before.replace(/\s*$/, "");
      // Empty `widgets: {}` needs no separator; a preceding entry needs a comma.
      const sep = beforeTrimmed.endsWith("{") || beforeTrimmed.endsWith(",") ? "" : ",";

      content = `${beforeTrimmed}${sep}\n${entry}\n${closeIndent}${after}`;
      changed = true;
    }
  }

  return { patched: content, changed };
}

export interface ExportArgs {
  widgetsDir: string;
  registryPath: string;
  widgetName: string;
  entityContent: string;
  componentContent: string;
  registrySnippet: string;
}

export interface ExportOutcome {
  filesWritten: string[];
  registryPatched: boolean;
}

/**
 * Write `<kebab>/<kebab>.entity.ts` + `<kebab>/<kebab>.tsx` into the demo's widgets
 * folder, then patch its widget-registry.ts. A missing registry is not fatal —
 * the caller surfaces `registryPatched: false` so the user can paste it manually.
 */
export async function exportWidgetToDemo(args: ExportArgs): Promise<ExportOutcome> {
  const kebab = toKebabCase(args.widgetName);
  const widgetDir = path.join(args.widgetsDir, kebab);

  await fs.mkdir(widgetDir, { recursive: true });

  const entityPath = path.join(widgetDir, `${kebab}.entity.ts`);
  const componentPath = path.join(widgetDir, `${kebab}.tsx`);

  await fs.writeFile(entityPath, args.entityContent, "utf8");
  await fs.writeFile(componentPath, args.componentContent, "utf8");

  let registryPatched = false;
  try {
    const current = await fs.readFile(args.registryPath, "utf8");
    const { patched, changed } = patchRegistrySource(
      current,
      splitRegistrySnippet(args.registrySnippet)
    );
    if (changed) {
      await fs.writeFile(args.registryPath, patched, "utf8");
    }
    registryPatched = true;
  } catch {
    // widget-registry.ts not found (or unreadable) — skip, don't fail the export.
    registryPatched = false;
  }

  return { filesWritten: [entityPath, componentPath], registryPatched };
}

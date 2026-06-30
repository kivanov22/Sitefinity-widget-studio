/**
 * parser-mvc-model (v0.3)
 *
 * Parses the Model class (or controller's own properties in the fallback case)
 * from a Sitefinity Legacy MVC widget source blob.
 *
 * Called by parser-mvc-controller.ts after it identifies which class to parse.
 *
 * Special detection rules (from mvc-samples-master reference analysis):
 *   - Guid XId + string XProviderName pair → ONE image property (MixedContentContext)
 *   - [DynamicLinksContainer] on string → renderHint: "html"
 *   - string with JSON-array backing field default → type: "string[]"
 *   - Known enum type (definition in same source blob) → renderHint: "choice"
 *   - [Flags] enum → isFlags: true (ChipChoice / multi-select)
 *   - DynamicContent ORM type → type: "unknown" (needs RestClient migration)
 */

import type { WidgetProperty, WidgetSchema, PropertyType, RenderHint } from "@/types/widget";
import type { MvcMetadata } from "@/types/widget";

// ---------------------------------------------------------------------------
// Internal raw property (before pair-collapse and renderHint inference)
// ---------------------------------------------------------------------------

interface RawMvcProp {
  name: string;
  csType: string;
  attrs: string[];  // full attribute lines above this property, e.g. "[DynamicLinksContainer]"
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toCamelCase(name: string): string {
  return name.charAt(0).toLowerCase() + name.slice(1);
}

/**
 * Extract the body of a named class from a multi-class source blob.
 * Uses brace-depth tracking so nested types don't confuse it.
 */
function extractClassBody(source: string, className: string): string | null {
  const classRx = new RegExp(`\\bclass\\s+${className}\\b[^{]*\\{`);
  const match = classRx.exec(source);
  if (!match) return null;

  let depth = 1;
  let i = match.index + match[0].length;
  const start = i;

  while (i < source.length && depth > 0) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}") depth--;
    i++;
  }

  return source.slice(start, i - 1);
}

/**
 * Walk class body line-by-line and collect all public property declarations.
 *
 * Handles three forms:
 *   A) Single-line auto-prop:  public TYPE NAME { get; [private] set; }
 *   B) Block prop, { on same line:  public TYPE NAME {\n    get { ... }\n}
 *   C) Block prop, { on next line:  public TYPE NAME\n{\n    get { ... }\n}
 *
 * Skips methods (detected by "(" before any "{" in the public declaration).
 */
function extractClassProps(classBody: string): RawMvcProp[] {
  const results: RawMvcProp[] = [];
  const lines = classBody.split("\n");
  let i = 0;
  let pendingAttrs: string[] = [];

  // Matches a full single-line property where the body { ... } has no nested braces.
  // Covers: { get; set; }  { get; private set; }  { get; }  { get { ... } set { ... } } on one line
  const SINGLE_LINE_PROP =
    /^public\s+(?:virtual\s+)?(?:override\s+)?([\w<>?\[\], ]+?)\s+(\w+)\s*\{[^{}]*\bget\b[^{}]*\}$/;

  // Matches a multi-line property header (type + name, possibly with opening { at end)
  const BLOCK_PROP_START =
    /^public\s+(?:virtual\s+)?(?:override\s+)?([\w<>?\[\], ]+?)\s+(\w+)\s*(\{?)$/;

  while (i < lines.length) {
    const line = lines[i].trim();

    // Blank lines and comments — skip, don't clear pending attrs
    if (
      line === "" ||
      line.startsWith("//") ||
      line.startsWith("///") ||
      line.startsWith("*") ||
      line.startsWith("/*")
    ) {
      i++;
      continue;
    }

    // Attribute line
    if (line.startsWith("[")) {
      pendingAttrs.push(line);
      i++;
      continue;
    }

    // Methods have "(" in the public declaration — skip them
    if (/^public\s+.*\(/.test(line)) {
      pendingAttrs = [];
      i++;
      continue;
    }

    // --- Form A: single-line property (body entirely on this line) ---
    const singleM = line.match(SINGLE_LINE_PROP);
    if (singleM) {
      results.push({ name: singleM[2], csType: singleM[1].trim(), attrs: [...pendingAttrs] });
      pendingAttrs = [];
      i++;
      continue;
    }

    // --- Forms B & C: property whose body spans multiple lines ---
    const blockM = line.match(BLOCK_PROP_START);
    if (blockM) {
      const csType = blockM[1].trim();
      const propName = blockM[2];
      const hasBrace = blockM[3] === "{";

      i++;

      // Form C: no brace on this line — find it on the next non-blank line
      if (!hasBrace) {
        while (i < lines.length && lines[i].trim() === "") i++;
        if (i >= lines.length || !lines[i].trim().startsWith("{")) {
          // Doesn't look like a property block — skip
          pendingAttrs = [];
          continue;
        }
      }

      // Now scan from the opening brace to the matching close.
      // depth tracks net open braces; we stop when it returns to 0.
      let depth: number;
      let isProperty = false;

      if (hasBrace) {
        // The { was the last char on the header line — start at depth 1.
        depth = 1;
        const headerRest = lines[i - 1].slice(lines[i - 1].lastIndexOf("{") + 1);
        if (/\bget\b|\bset\b/.test(headerRest)) isProperty = true;
        for (const ch of headerRest) {
          if (ch === "{") depth++;
          else if (ch === "}") depth--;
        }
        if (depth === 0) {
          if (isProperty) results.push({ name: propName, csType, attrs: [...pendingAttrs] });
          pendingAttrs = [];
          continue;
        }
      } else {
        // The { is on lines[i] (the line after the header) — start at depth 0
        // and let brace-counting bring it to 1.
        depth = 0;
        const braceLine = lines[i];
        if (/\bget\b|\bset\b/.test(braceLine)) isProperty = true;
        for (const ch of braceLine) {
          if (ch === "{") depth++;
          else if (ch === "}") depth--;
        }
        i++;
        if (depth === 0) {
          if (isProperty) results.push({ name: propName, csType, attrs: [...pendingAttrs] });
          pendingAttrs = [];
          continue;
        }
      }

      // Consume remaining lines until closing brace
      while (i < lines.length && depth > 0) {
        const bodyLine = lines[i];
        if (/\bget\b|\bset\b/.test(bodyLine)) isProperty = true;
        for (const ch of bodyLine) {
          if (ch === "{") depth++;
          else if (ch === "}") depth--;
        }
        i++;
        if (depth === 0) break;
      }

      if (isProperty) {
        results.push({ name: propName, csType, attrs: [...pendingAttrs] });
      }
      pendingAttrs = [];
      continue;
    }

    // Not a property or attribute — clear and move on
    pendingAttrs = [];
    i++;
  }

  return results;
}

/**
 * Scan the full source for `enum TypeName { Val, Val2 }` definitions.
 * Returns Map<typeName, memberNames[]>.
 */
function extractEnumDefinitions(source: string): Map<string, string[]> {
  const defs = new Map<string, string[]>();
  const enumRx = /\benum\s+(\w+)\s*\{([^}]+)\}/g;
  let m: RegExpExecArray | null;
  while ((m = enumRx.exec(source)) !== null) {
    const enumName = m[1];
    const body = m[2];
    const members = body
      .split(",")
      .map((s) => s.trim().replace(/\s*=\s*.*/, "").replace(/\/\/.*/, "").trim())
      .filter((s) => s && /^\w+$/.test(s));
    if (members.length > 0) defs.set(enumName, members);
  }
  return defs;
}

/**
 * Find backing-field defaults: `private TYPE fieldName = "value";`
 * Returns Map<camelCaseFieldName, rawValue>.
 */
function extractBackingFieldDefaults(classBody: string): Map<string, string> {
  const defaults = new Map<string, string>();
  // Match string literals (handles \" escapes inside)
  const rx =
    /private\s+[\w<>?\[\] ]+?\s+(\w+)\s*=\s*"((?:[^"\\]|\\.)*)"\s*;/g;
  let m: RegExpExecArray | null;
  while ((m = rx.exec(classBody)) !== null) {
    defaults.set(m[1], m[2]);
  }
  return defaults;
}

/**
 * Infer a render hint from the property name when no explicit attribute overrides it.
 * Matches the Renderer parser's heuristic but simplified for MVC model properties.
 */
function inferRenderHintMvc(name: string, type: PropertyType): RenderHint {
  if (type === "boolean") return "none";
  if (type === "number") return "text";
  const n = name.toLowerCase();
  if (n === "cssclass" || n.includes("cssclass") || n.includes("wrapperclass") || n.includes("classname"))
    return "css-class";
  if (n.includes("url") || n.includes("href") || n.includes("link") || n.includes("src"))
    return "url";
  if (n.includes("html") || n.includes("content") || n.includes("body") || n.includes("description"))
    return "html";
  return "text";
}

/** Map a C# type name to a PropertyType. */
function csTypeToPropertyType(csType: string): PropertyType {
  const t = csType.replace(/\?$/, "").trim().toLowerCase();
  if (t === "string") return "string";
  if (t === "bool" || t === "boolean") return "boolean";
  if (["int", "long", "float", "double", "decimal", "short", "byte", "uint"].includes(t))
    return "number";
  if (["guid"].includes(t)) return "string"; // Guid maps to string | null in TS
  if (["list<string>", "ienumerable<string>", "ilist<string>", "string[]"].includes(t))
    return "string[]";
  if (["list<int>", "ienumerable<int>", "ilist<int>", "int[]"].includes(t))
    return "number[]";
  return "unknown";
}

// ---------------------------------------------------------------------------
// Build final WidgetProperty from a raw prop
// ---------------------------------------------------------------------------

function buildWidgetProperty(
  raw: RawMvcProp,
  enumDefs: Map<string, string[]>,
  backingDefaults: Map<string, string>,
  source: string
): WidgetProperty {
  const { name, csType, attrs } = raw;
  const attrBlock = attrs.join("\n");

  // Explicit renderHint override from [DynamicLinksContainer]
  const isDynamicLinks = /\[DynamicLinksContainer\b/.test(attrBlock);

  let type = csTypeToPropertyType(csType);
  let renderHint: RenderHint;
  let enumChoices: string[] | undefined;
  let enumTypeName: string | undefined;
  let isFlags: boolean | undefined;

  const normalizedCsType = csType.replace(/\?$/, "").trim();

  // Check if it's an enum (type not recognised as a primitive, but defined in source)
  if (type === "unknown") {
    const enumValues = enumDefs.get(normalizedCsType);
    if (enumValues && enumValues.length > 0) {
      renderHint = "choice";
      enumChoices = enumValues;
      enumTypeName = normalizedCsType;
      // Check for [Flags] attribute on the enum definition
      const flagsRx = new RegExp(`\\[Flags\\][\\s\\S]*?\\benum\\s+${normalizedCsType}\\b`);
      isFlags = flagsRx.test(source);
    } else {
      // DynamicContent or other unknown ORM type
      renderHint = "text";
    }
  } else if (isDynamicLinks) {
    renderHint = "html";
  } else {
    // Check for JSON-array-style backing field (MVC IList<string> workaround)
    if (type === "string") {
      const camelName = toCamelCase(name);
      const backingVal = backingDefaults.get(camelName);
      if (backingVal && /^\s*\[/.test(backingVal)) {
        type = "string[]";
      }
    }
    renderHint = inferRenderHintMvc(name, type);
  }

  // Extract standard C# designer attributes if present (MVC models rarely have them,
  // but some widgets do use [DisplayName] / [Description])
  const displayNameM = attrBlock.match(/\[DisplayName\s*\(\s*"([^"]+)"\s*\)\]/);
  const descriptionM = attrBlock.match(/\[Description\s*\(\s*"([^"]+)"\s*\)\]/);
  const sectionM = attrBlock.match(/\[ContentSection\s*\(\s*"([^"]+)"\s*(?:,\s*\d+)?\s*\)\]/);
  const defaultM = attrBlock.match(/\[DefaultValue\s*\(\s*([^)]+)\)\]/);

  let defaultValue: string | number | boolean | undefined;
  if (defaultM) {
    const raw2 = defaultM[1].trim();
    if (raw2 === "true") defaultValue = true;
    else if (raw2 === "false") defaultValue = false;
    else if (!isNaN(Number(raw2))) defaultValue = Number(raw2);
    else defaultValue = raw2.replace(/^"(.*)"$/, "$1");
  }

  return {
    name,
    camelName: toCamelCase(name),
    type,
    renderHint,
    isNullable: true,
    enumChoices,
    enumTypeName,
    isFlags,
    ...(displayNameM ? { displayName: displayNameM[1] } : {}),
    ...(descriptionM ? { description: descriptionM[1] } : {}),
    ...(sectionM ? { section: sectionM[1] } : {}),
    ...(defaultValue !== undefined ? { defaultValue } : {}),
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse the named class from `source` and return a WidgetSchema that can flow
 * directly into generator-nextjs-entity.ts and generator-nextjs-component.ts.
 *
 * @param source   Full C# source blob (may contain controller + model classes)
 * @param className  The class to extract properties from
 * @param widgetName Sanitised TypeScript identifier (e.g. "Author")
 * @param mvcMetadata Toolbox info collected by parser-mvc-controller
 */
export function parseMvcModelClass(
  source: string,
  className: string,
  widgetName: string,
  mvcMetadata: MvcMetadata
): WidgetSchema {
  const classBody = extractClassBody(source, className) ?? source;

  const rawProps = extractClassProps(classBody);
  const enumDefs = extractEnumDefinitions(source);
  const backingDefaults = extractBackingFieldDefaults(classBody);

  // --- Image pair detection ---
  // Guid XId + string XProviderName → ONE image property named X
  const consumed = new Set<string>();
  const rawPropMap = new Map(rawProps.map((p) => [p.name, p]));

  // Pre-scan for potential image pairs
  for (const prop of rawProps) {
    if (prop.csType.replace(/\?$/, "").trim().toLowerCase() === "guid" && prop.name.endsWith("Id")) {
      const stem = prop.name.slice(0, -2); // strip "Id"
      const providerName = stem + "ProviderName";
      if (rawPropMap.has(providerName)) {
        consumed.add(prop.name);
        consumed.add(providerName);
      }
    }
  }

  const properties: WidgetProperty[] = [];

  for (const raw of rawProps) {
    if (consumed.has(raw.name)) {
      // Was a ProviderName companion — insert the image pair property at the
      // position of the original Guid XId property
      if (raw.name.endsWith("ProviderName")) continue; // skip — already emitted
      // It's the Guid XId entry: emit the collapsed image property instead
      const stem = raw.name.slice(0, -2);
      properties.push({
        name: stem,
        camelName: toCamelCase(stem),
        type: "object",
        renderHint: "image",
        isNullable: true,
      });
      continue;
    }

    properties.push(buildWidgetProperty(raw, enumDefs, backingDefaults, source));
  }

  // widgetKey: keep original toolbox Name for the @WidgetEntity key
  // widgetName: sanitised TS identifier used for class names
  const widgetKey =
    mvcMetadata.toolboxName !== widgetName ? mvcMetadata.toolboxName : undefined;

  return {
    className,
    widgetName,
    widgetKey,
    properties,
    rawSource: source,
    sourceType: "mvc",
    mvcMetadata,
  };
}

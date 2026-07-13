/**
 * enum-extractor (v0.4)
 *
 * Shared C# enum extraction for both parsers (parser-csharp.ts and
 * parser-mvc-model.ts). Kept in one place because the two parsers must agree
 * on what counts as an enum and how its members are read.
 *
 * Handles both declaration forms:
 *
 *   Form A — single line
 *     enum ListMode { Numbers, Bullets }
 *
 *   Form B — multi-line, with explicit numeric assignments and comments
 *     [Flags]
 *     public enum ListMode
 *     {
 *         Option1 = 0,   // first
 *         Option2 = 1,
 *     }
 *
 * Only the member NAMES are captured; numeric assignments are discarded.
 */

export interface EnumDefinition {
  /** Member names in declaration order, e.g. ["Numbers", "Bullets"]. */
  values: string[];
  /** True when the declaration is preceded by [Flags] → multi-select (ChipChoice). */
  isFlags: boolean;
}

/**
 * C# types that are NOT enums even though they resolve to `unknown`.
 * These are ORM / content types that need a RestClient migration, not a @Choice.
 * Confirmed from the reference projects (see CLAUDE.md type-mapping table).
 */
const ORM_TYPE_NAMES = new Set([
  "dynamiccontent",
  "sdkitem",
  "contentitem",
  "content",
]);

/** True when an unresolved C# type name is a known ORM/content type, not an enum. */
export function isKnownOrmType(csTypeName: string): boolean {
  return ORM_TYPE_NAMES.has(csTypeName.replace(/\?$/, "").trim().toLowerCase());
}

/**
 * Capture `[Flags]` (optional, group 1), the enum name (group 2) and the body (group 3).
 * Enum bodies never contain nested braces, so `[^}]*` is a safe body match.
 */
const ENUM_RX =
  /(\[\s*Flags\s*\]\s*)?(?:public\s+|internal\s+|private\s+|protected\s+)?enum\s+(\w+)\s*\{([^}]*)\}/g;

/** Strip line comments, split on commas, drop `= 0` assignments, keep identifiers. */
function parseEnumMembers(body: string): string[] {
  return body
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, ""))
    .join("\n")
    .split(",")
    .map((member) => member.trim().replace(/\s*=[\s\S]*$/, "").trim())
    .filter((member) => /^[A-Za-z_]\w*$/.test(member));
}

/**
 * Scan a C# source blob for every enum declaration.
 * Returns Map<enumTypeName, EnumDefinition>.
 */
export function extractEnumDefinitions(source: string): Map<string, EnumDefinition> {
  const defs = new Map<string, EnumDefinition>();

  ENUM_RX.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = ENUM_RX.exec(source)) !== null) {
    const isFlags = Boolean(match[1]);
    const name = match[2];
    const values = parseEnumMembers(match[3]);
    if (values.length > 0) {
      defs.set(name, { values, isFlags });
    }
  }

  return defs;
}

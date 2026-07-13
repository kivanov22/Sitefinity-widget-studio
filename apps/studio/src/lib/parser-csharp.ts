/**
 * parser-csharp (v0.2)
 *
 * A pure TypeScript parser that uses regex + heuristics to extract
 * property definitions and attributes from Sitefinity .NET Core
 * widget model/viewmodel classes.
 *
 * Roadmap:
 *   v0.1  — Regex-based, basic types + attributes ✓
 *   v0.2  — Nested object detection, render hints, enum stubs (current)
 *   v0.3  — Roslyn-powered via .NET WASM sidecar for 100% accuracy
 */

import type { WidgetProperty, WidgetSchema, PropertyType, RenderHint } from "@/types/widget";
import {
  extractEnumDefinitions,
  isKnownOrmType,
  type EnumDefinition,
} from "./enum-extractor";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toCamelCase(name: string): string {
  return name.charAt(0).toLowerCase() + name.slice(1);
}

function parseTypeName(csType: string): PropertyType {
  const t = csType.replace(/\?$/, "").trim();
  const lower = t.toLowerCase();

  if (lower === "string") return "string";
  if (lower === "int" || lower === "long" || lower === "float" || lower === "double" || lower === "decimal")
    return "number";
  if (lower === "bool") return "boolean";
  if (lower === "list<string>" || lower === "ienumerable<string>" || lower === "string[]")
    return "string[]";
  if (lower === "list<int>" || lower === "ienumerable<int>" || lower === "int[]")
    return "number[]";
  // Known complex types → object
  if (/viewmodel|model|image|video|file|document|media/i.test(lower))
    return "object";
  return "unknown";
}

function inferRenderHint(propName: string, type: PropertyType): RenderHint {
  const n = propName.toLowerCase();
  if (type === "boolean") return "none";
  if (type === "object") {
    if (n.includes("image") || n.includes("photo") || n.includes("banner") || n.includes("thumbnail"))
      return "image";
    if (n.includes("video")) return "video";
    return "text";
  }
  if (n.includes("cssclass") || n.includes("wrapperclass") || n.includes("classname"))
    return "css-class";
  // Image-named string props (e.g. BackgroundImageUrl) resolve to an image content
  // selector — this must win over the "url" suffix check below, since the Url suffix
  // is stripped and the prop becomes a MixedContentContext (see CLAUDE.md image rule).
  if (n.includes("image") || n.includes("photo") || n.includes("banner") || n.includes("thumbnail"))
    return "image";
  if (n.includes("url") || n.includes("href") || n.includes("link") || n.includes("src"))
    return "url";
  if (n.includes("html") || n.includes("content") || n.includes("body") || n.includes("description"))
    return "html";
  return "text";
}

function isNullable(csType: string): boolean {
  return csType.trim().endsWith("?");
}

// ---------------------------------------------------------------------------
// Attribute extraction
// ---------------------------------------------------------------------------

interface ParsedAttributes {
  displayName?: string;
  description?: string;
  defaultValue?: string | number | boolean | null;
  section?: string;
}

function extractAttributes(attributeBlock: string): ParsedAttributes {
  const attrs: ParsedAttributes = {};

  const displayNameMatch = attributeBlock.match(
    /\[DisplayName\(\s*"([^"]+)"\s*\)\]/
  );
  if (displayNameMatch) attrs.displayName = displayNameMatch[1];

  const descriptionMatch = attributeBlock.match(
    /\[Description\(\s*"([^"]+)"\s*\)\]/
  );
  if (descriptionMatch) attrs.description = descriptionMatch[1];

  const sectionMatch = attributeBlock.match(
    /\[ContentSection\(\s*"([^"]+)"\s*(?:,\s*\d+)?\s*\)\]/
  );
  if (sectionMatch) attrs.section = sectionMatch[1];

  const defaultValueMatch = attributeBlock.match(
    /\[DefaultValue\(\s*([^)]+)\)\]/
  );
  if (defaultValueMatch) {
    const raw = defaultValueMatch[1].trim();
    if (raw === "true") attrs.defaultValue = true;
    else if (raw === "false") attrs.defaultValue = false;
    else if (!isNaN(Number(raw))) attrs.defaultValue = Number(raw);
    else attrs.defaultValue = raw.replace(/^"(.*)"$/, "$1"); // strip quotes
  }

  return attrs;
}

// ---------------------------------------------------------------------------
// Class name extraction
// ---------------------------------------------------------------------------

function extractClassName(source: string): string {
  const match = source.match(/public\s+class\s+(\w+)/);
  return match ? match[1] : "UnknownWidget";
}

function extractNamespace(source: string): string | undefined {
  const match = source.match(/namespace\s+([\w.]+)/);
  return match ? match[1] : undefined;
}

function deriveWidgetName(className: string): string {
  // "HeroWidgetModel" → "HeroWidget"
  // "HeroModel"       → "Hero"
  // "HeroWidget"      → "HeroWidget"
  return className
    .replace(/Model$/, "")
    .replace(/ViewModel$/, "");
}

// ---------------------------------------------------------------------------
// Property extraction
// ---------------------------------------------------------------------------

/** Enum fields for a property whose C# type isn't a recognised primitive. */
interface EnumFields {
  enumValues?: string[];
  enumTypeName: string;
  isFlags: boolean;
}

/**
 * Decide whether an unresolved C# type is an enum, and if so gather its members.
 *
 * Returns null when the property is not a choice field (a primitive, a nested
 * object, or a known ORM/content type that needs a RestClient migration).
 * Returns `enumValues: undefined` when the type looks like an enum but its
 * declaration was not in the pasted source — the generator emits a TODO for that.
 */
function resolveEnum(
  csType: string,
  type: PropertyType,
  enumDefs: Map<string, EnumDefinition>
): EnumFields | null {
  if (type !== "unknown") return null;

  const enumTypeName = csType.replace(/\?$/, "").trim();
  const def = enumDefs.get(enumTypeName);
  if (def) {
    return { enumValues: def.values, enumTypeName, isFlags: def.isFlags };
  }
  if (isKnownOrmType(enumTypeName)) return null;

  return { enumValues: undefined, enumTypeName, isFlags: false };
}

/**
 * Split the class body into property blocks, each containing:
 * - Zero or more attribute lines before the property
 * - The property declaration line itself
 */
function extractProperties(
  classBody: string,
  enumDefs: Map<string, EnumDefinition>
): WidgetProperty[] {
  const properties: WidgetProperty[] = [];

  // Match attribute blocks + property declarations
  // This regex walks line by line and groups attributes above each property
  const lines = classBody.split("\n");
  let attributeLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Attribute line: starts with [ and ends with ]
    if (/^\[.*\]$/.test(trimmed)) {
      attributeLines.push(trimmed);
      continue;
    }

    // Property line: public <Type> <Name> { get; set; }
    const propMatch = trimmed.match(
      /^public\s+([\w<>?\[\],\s]+?)\s+(\w+)\s*\{\s*get;\s*set;\s*\}/
    );

    if (propMatch) {
      const csType = propMatch[1].trim();
      const propName = propMatch[2];

      const attrs = extractAttributes(attributeLines.join("\n"));
      const type = parseTypeName(csType);
      const enumFields = resolveEnum(csType, type, enumDefs);
      const renderHint: RenderHint = enumFields
        ? "choice"
        : inferRenderHint(propName, type);

      properties.push({
        name: propName,
        camelName: toCamelCase(propName),
        type,
        renderHint,
        isNullable: isNullable(csType),
        ...(enumFields ?? {}),
        ...attrs,
      });

      attributeLines = [];
      continue;
    }

    // Non-attribute, non-property line resets the attribute buffer
    if (trimmed !== "" && !trimmed.startsWith("//")) {
      attributeLines = [];
    }
  }

  return properties;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function parseWidget(csharpSource: string): WidgetSchema {
  const className = extractClassName(csharpSource);
  const widgetName = deriveWidgetName(className);
  const namespace = extractNamespace(csharpSource);

  // Isolate class body between outermost { }
  const classBodyMatch = csharpSource.match(/\{([\s\S]*)\}/);
  const classBody = classBodyMatch ? classBodyMatch[1] : csharpSource;

  // Enums may be declared alongside the class (same namespace / same file),
  // so scan the whole source, not just the class body.
  const enumDefs = extractEnumDefinitions(csharpSource);

  const properties = extractProperties(classBody, enumDefs);

  return {
    className,
    widgetName,
    namespace,
    properties,
    rawSource: csharpSource,
    sourceType: "viewmodel" as const,
  };
}

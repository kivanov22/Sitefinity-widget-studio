/**
 * parser-csharp (v0.1)
 *
 * A pure TypeScript parser that uses regex + heuristics to extract
 * property definitions and attributes from Sitefinity .NET Core
 * widget model classes.
 *
 * Roadmap:
 *   v0.1  — Regex-based (current) — handles 95% of real widget models
 *   v0.2  — Roslyn-powered via .NET WASM or API sidecar for 100% accuracy
 */

import type { WidgetProperty, WidgetSchema, PropertyType } from "@/types/widget";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toCamelCase(name: string): string {
  return name.charAt(0).toLowerCase() + name.slice(1);
}

function parseTypeName(csType: string): PropertyType {
  const t = csType.replace(/\?$/, "").trim(); // strip nullable marker
  const lower = t.toLowerCase();

  if (lower === "string") return "string";
  if (lower === "int" || lower === "long" || lower === "float" || lower === "double" || lower === "decimal")
    return "number";
  if (lower === "bool") return "boolean";
  if (lower === "list<string>" || lower === "ienumerable<string>" || lower === "string[]")
    return "string[]";
  if (
    lower === "list<int>" ||
    lower === "ienumerable<int>" ||
    lower === "int[]"
  )
    return "number[]";
  return "unknown";
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

/**
 * Split the class body into property blocks, each containing:
 * - Zero or more attribute lines before the property
 * - The property declaration line itself
 */
function extractProperties(classBody: string): WidgetProperty[] {
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

      properties.push({
        name: propName,
        camelName: toCamelCase(propName),
        type: parseTypeName(csType),
        isNullable: isNullable(csType),
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

  const properties = extractProperties(classBody);

  return {
    className,
    widgetName,
    namespace,
    properties,
    rawSource: csharpSource,
  };
}

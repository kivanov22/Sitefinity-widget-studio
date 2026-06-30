/**
 * generator-nextjs-entity (v0.3)
 *
 * Generates a <WidgetName>.entity.ts file that matches the real
 * @progress/sitefinity-widget-designers-sdk decorator pattern.
 *
 * Reference: nextjs-samples/src/hello-world/.../hello-world.entity.ts
 *            nextjs-samples/src/all-properties/.../all-properties.entity.ts
 */

import type { WidgetSchema, WidgetProperty } from "@/types/widget";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toKebabCase(str: string): string {
  return str.replace(/([A-Z])/g, (char, _, offset) =>
    offset === 0 ? char.toLowerCase() : "-" + char.toLowerCase()
  );
}

/** Strip trailing "Url" from an image property name since it's now a
 *  MixedContentContext content reference, not a URL string. */
function imagePropertyName(name: string): string {
  return name.replace(/Url$/i, "");
}

function getTsType(prop: WidgetProperty): string {
  if (prop.renderHint === "image") return "MixedContentContext | null";
  switch (prop.type) {
    case "string":   return "string | null";
    case "number":   return "number | null";
    case "boolean":  return "boolean | null";
    case "string[]": return "string[] | null";
    case "number[]": return "number[] | null";
    default:         return "string | null";
  }
}

/** TypeScript field initializer — @DefaultValue handles the runtime default;
 *  this initializer is just for TypeScript type safety. */
function getTsInit(prop: WidgetProperty): string {
  if (prop.renderHint === "image") return "= null";
  switch (prop.type) {
    case "number":  return "= 0";
    case "boolean": return "= false";
    default:        return "= null";
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function generateEntityFile(
  schema: WidgetSchema
): { filename: string; content: string } {
  const { widgetName, properties } = schema;
  const entityClassName = `${widgetName}Entity`;
  const kebabName = toKebabCase(widgetName);

  // Track which named exports we need from the SDK
  const imports = new Set<string>(["WidgetEntity"]);

  const propBlocks: string[] = [];

  for (const prop of properties) {
    const decorators: string[] = [];

    // 1. @DisplayName
    if (prop.displayName) {
      imports.add("DisplayName");
      decorators.push(`  @DisplayName('${prop.displayName}')`);
    }

    // 2. @Description
    if (prop.description) {
      imports.add("Description");
      // Escape any single quotes in the description
      const escaped = prop.description.replace(/'/g, "\\'");
      decorators.push(`  @Description('${escaped}')`);
    }

    // 3. @ContentSection
    if (prop.section) {
      imports.add("ContentSection");
      decorators.push(`  @ContentSection('${prop.section}', 0)`);
    }

    // 4. @DefaultValue
    if (prop.defaultValue !== undefined && prop.defaultValue !== null) {
      imports.add("DefaultValue");
      const val =
        typeof prop.defaultValue === "string"
          ? `'${prop.defaultValue}'`
          : String(prop.defaultValue);
      decorators.push(`  @DefaultValue(${val})`);
    }

    // 5. Render-hint specific decorators (@DataType / @Content — always last)
    if (prop.renderHint === "html") {
      imports.add("DataType");
      imports.add("KnownFieldTypes");
      imports.add("ContentContainer");
      decorators.push(`  @DataType(KnownFieldTypes.Html)`);
      decorators.push(`  @ContentContainer()`);
    } else if (prop.renderHint === "image") {
      imports.add("Content");
      imports.add("KnownContentTypes");
      imports.add("MixedContentContext");
      decorators.push(`  @Content({ Type: KnownContentTypes.Images })`);
    }

    const tsType = getTsType(prop);
    const tsInit = getTsInit(prop);
    const decoratorBlock =
      decorators.length > 0 ? decorators.join("\n") + "\n" : "";

    // Image properties: drop trailing "Url" from the name — it's now a
    // content reference (MixedContentContext), not a URL string.
    const emittedName =
      prop.renderHint === "image" ? imagePropertyName(prop.name) : prop.name;

    propBlocks.push(`${decoratorBlock}  public ${emittedName}: ${tsType} ${tsInit};`);
  }

  const sortedImports = Array.from(imports).sort().join(", ");
  const importLine = `import { ${sortedImports} } from '@progress/sitefinity-widget-designers-sdk';`;

  const content = `${importLine}

@WidgetEntity('${widgetName}', '${widgetName}')
export class ${entityClassName} {
${propBlocks.join("\n\n")}
}
`;

  return {
    filename: `${kebabName}.entity.ts`,
    content,
  };
}

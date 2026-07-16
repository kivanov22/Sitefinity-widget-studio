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
  return str
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();
}

/** Strip trailing "Url" from an image property name since it's now a
 *  MixedContentContext content reference, not a URL string. */
function imagePropertyName(name: string): string {
  return name.replace(/Url$/i, "");
}

/** True when we found the enum's members and can emit a real TS enum + choices array. */
function isResolvedEnum(prop: WidgetProperty): boolean {
  return (
    prop.renderHint === "choice" &&
    Boolean(prop.enumTypeName) &&
    Boolean(prop.enumValues?.length)
  );
}

function getTsType(prop: WidgetProperty): string {
  if (prop.renderHint === "image" || prop.renderHint === "content-reference")
    return "MixedContentContext | null";
  // Only reference the TS enum type when we actually emit that enum above the class.
  // An unresolved enum falls back to `string | null` so the file still compiles.
  if (isResolvedEnum(prop)) return `${prop.enumTypeName} | null`;
  if (prop.renderHint === "choice") return "string | null";
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
  if (prop.renderHint === "image" || prop.renderHint === "content-reference") return "= null";
  if (prop.renderHint === "choice") return "= null";
  switch (prop.type) {
    case "number":  return "= 0";
    case "boolean": return "= false";
    default:        return "= null";
  }
}

// ---------------------------------------------------------------------------
// Enum section builder (emitted above the entity class)
// ---------------------------------------------------------------------------

interface EnumDef {
  choices: string[];
  isFlags: boolean;
}

/**
 * Emit, above the entity class, a TS enum plus its ChoiceItem[] array — matching
 * all-properties.entity.ts:
 *
 *   enum ListMode {
 *       Numbers = 'Numbers',
 *   }
 *
 *   const ListModeChoices: ChoiceItem[] = [
 *       { Title: 'Numbers', Value: ListMode.Numbers }
 *   ];
 */
function buildEnumSection(enumDefs: Map<string, EnumDef>): string {
  const parts: string[] = [];
  for (const [name, def] of enumDefs) {
    const members = def.choices.map((c) => `    ${c} = '${c}',`).join("\n");
    const choiceItems = def.choices
      .map((c) => `    { Title: '${c}', Value: ${name}.${c} }`)
      .join(",\n");
    parts.push(
      `enum ${name} {\n${members}\n}\n\nconst ${name}Choices: ChoiceItem[] = [\n${choiceItems}\n];`
    );
  }
  return parts.join("\n\n") + "\n\n";
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

  // Collect enum definitions to emit above the class
  const enumDefs = new Map<string, EnumDef>();

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
    } else if (prop.renderHint === "content-reference") {
      imports.add("MixedContentContext");
      if (prop.contentItemType) {
        imports.add("Content");
        const escaped = prop.contentItemType.replace(/'/g, "\\'");
        decorators.push(`  @Content({ Type: '${escaped}' })`);
      } else {
        // ItemType wasn't resolvable from the pasted source (e.g. the controller
        // pane wasn't provided) — referencing an empty Type would compile but pick
        // the wrong content, so leave the decorator commented out like the
        // unresolved-enum case below.
        decorators.push(
          `  // TODO: set the dynamic content type name (e.g. 'Telerik.Sitefinity.DynamicTypes.Model.X.Y')`,
          `  // @Content({ Type: 'TODO' })`
        );
      }
    } else if (isResolvedEnum(prop)) {
      // Enum whose declaration we found — emit the enum + choices array above the
      // class and wire the decorators to it.
      imports.add("Choice");
      imports.add("ChoiceItem");
      imports.add("DataType");
      imports.add("KnownFieldTypes");
      enumDefs.set(prop.enumTypeName!, {
        choices: prop.enumValues!,
        isFlags: prop.isFlags ?? false,
      });
      decorators.push(`  @Choice({ Choices: ${prop.enumTypeName}Choices })`);
      const fieldType = prop.isFlags
        ? "KnownFieldTypes.ChipChoice"
        : "KnownFieldTypes.RadioChoice";
      decorators.push(`  @DataType(${fieldType})`);
    } else if (prop.renderHint === "choice" && prop.enumTypeName) {
      // Enum declared in a file the user didn't paste. Emit a TODO naming the array
      // they must define, and keep the decorators commented out — referencing an
      // undefined const here would produce a file that does not compile.
      decorators.push(
        `  // TODO: define ${prop.enumTypeName}Choices — enum declared in a separate file`,
        `  // @Choice({ Choices: ${prop.enumTypeName}Choices })`,
        `  // @DataType(KnownFieldTypes.RadioChoice)`
      );
    } else if (prop.type === "string[]") {
      // IList<string> / JSON-array-style string → @DataType(ComplexType.Enumerable, 'string')
      imports.add("DataType");
      imports.add("ComplexType");
      decorators.push(`  @DataType(ComplexType.Enumerable, 'string')`);
    }

    const tsType = getTsType(prop);
    const tsInit = getTsInit(prop);
    const decoratorBlock =
      decorators.length > 0 ? decorators.join("\n") + "\n" : "";

    // Image properties: drop trailing "Url" — it's now a MixedContentContext ref, not a URL.
    const emittedName =
      prop.renderHint === "image" ? imagePropertyName(prop.name) : prop.name;

    propBlocks.push(`${decoratorBlock}  public ${emittedName}: ${tsType} ${tsInit};`);
  }

  const sortedImports = Array.from(imports).sort().join(", ");
  const importLine = `import { ${sortedImports} } from '@progress/sitefinity-widget-designers-sdk';`;

  // @WidgetEntity args: key (toolbox Name) + display title
  const widgetKey = schema.widgetKey ?? widgetName;
  const widgetTitle = schema.mvcMetadata?.title ?? widgetName;

  // Enum section (emitted between imports and class declaration)
  const enumSection = enumDefs.size > 0 ? buildEnumSection(enumDefs) : "";

  const content = `${importLine}

${enumSection}@WidgetEntity('${widgetKey}', '${widgetTitle}')
export class ${entityClassName} {
${propBlocks.join("\n\n")}
}
`;

  return {
    filename: `${kebabName}.entity.ts`,
    content,
  };
}

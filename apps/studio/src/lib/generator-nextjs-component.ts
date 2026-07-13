/**
 * generator-nextjs-component (v0.3)
 *
 * Generates a <WidgetName>.tsx file that matches the real
 * @progress/sitefinity-nextjs-sdk component pattern.
 *
 * CRITICAL requirements from the SDK:
 *   1. `const dataAttributes = htmlAttributes(props)` — always present
 *   2. `{...dataAttributes}` spread on the root element — required for page editor
 *   3. Props accessed as `props.model.Properties.PropName` (not flat)
 *   4. Named export (not default): `export function WidgetName(...)`
 *      — the widget-registry imports the component by name (`{ WidgetName }`),
 *        so a default export would break registration. When an image property is
 *        present the component becomes `export async function WidgetName(...)`,
 *        still a NAMED export (matches sitefinity-data.tsx which is
 *        `export async function SitefinityData(...)`).
 *
 * Reference: nextjs-samples/src/hello-world/.../hello-world.tsx
 *            nextjs-samples/src/sitefinity-data/.../sitefinity-data.tsx (async fetch)
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

/** Mirror the entity generator's name-stripping for image props. */
function imagePropertyName(name: string): string {
  return name.replace(/Url$/i, "");
}

/** camelCase the entity property name for a local variable. */
function toCamelCase(name: string): string {
  return name.charAt(0).toLowerCase() + name.slice(1);
}

function find(props: WidgetProperty[], pattern: RegExp): WidgetProperty | undefined {
  return props.find((p) => pattern.test(p.name));
}

// ---------------------------------------------------------------------------
// Image bindings — MixedContentContext content selectors resolved via REST
// ---------------------------------------------------------------------------

interface ImageBinding {
  /** The property name on the WidgetProperty (may still carry a Url suffix). */
  originalName: string;
  /** The name the entity actually emits (Url suffix stripped, e.g. BackgroundImage). */
  emittedName: string;
  /** The local const the fetch result is assigned to (e.g. backgroundImage). */
  varName: string;
}

function imageBindings(properties: WidgetProperty[]): ImageBinding[] {
  return properties
    .filter((p) => p.renderHint === "image")
    .map((p) => {
      const emittedName = imagePropertyName(p.name);
      return {
        originalName: p.name,
        emittedName,
        varName: toCamelCase(emittedName),
      };
    });
}

/**
 * Server-side fetch for each image property. A `renderHint === "image"` property
 * is a `MixedContentContext | null` selector (see the entity generator + CLAUDE.md
 * image rule) — the selected library items live in `ItemIdsOrdered`, and are
 * resolved with `RestClient.getItems` filtered by Id.
 *
 * NOTE: the real `GetAllArgs` signature has NO `ids` field — it takes a `filter`.
 * This matches how the corianderLane demo's `getDetailedItem` resolves related
 * items (Or-combined `Id eq` clauses), verified against the installed SDK types.
 */
function buildImageFetches(images: ImageBinding[]): string {
  return images
    .map(
      (img) => `
    // Fetch image server-side — edit RestClient options as needed
    const ${img.varName}Items = props.model.Properties.${img.emittedName}
        ? await RestClient.getItems<SdkItem>({
            type: RestSdkTypes.Image,
            provider: undefined,
            filter: {
                Operator: 'OR',
                ChildFilters: (props.model.Properties.${img.emittedName}.ItemIdsOrdered ?? []).map((id: string) => ({
                    FieldName: 'Id',
                    FieldValue: id,
                    Operator: 'eq',
                })),
            },
          })
        : null;
    const ${img.varName} = ${img.varName}Items?.Items?.[0];`
    )
    .join("\n");
}

// ---------------------------------------------------------------------------
// JSX body — driven by renderHint, using props.model.Properties.X
// ---------------------------------------------------------------------------

function buildJsxBody(
  properties: WidgetProperty[],
  images: ImageBinding[]
): string {
  const lines: string[] = [];
  const handled = new Set<string>();

  const cssProp = properties.find((p) => p.renderHint === "css-class");
  const videoProp = properties.find((p) => p.renderHint === "video");
  const titleProp = find(properties, /^(Title|Heading|Headline)$/i);
  const subtitleProp = find(properties, /^(Subtitle|Subheading|Description|Body|Text|Content)$/i);
  const buttonTextProp = find(properties, /^(ButtonText|CtaText|LinkText|ButtonLabel)$/i);
  const buttonUrlProp = find(properties, /^(ButtonUrl|CtaUrl|LinkUrl|Href|ButtonHref)$/i);
  const showButtonProp = find(properties, /^(ShowButton|ShowCta|ShowLink)$/i);

  // css-class prop is applied to the root wrapper, not the body
  if (cssProp) handled.add(cssProp.name);

  // Video
  if (videoProp) {
    lines.push(
      `        {/* TODO: Video — props.model.Properties.${videoProp.name} is a MixedContentContext selector. */}`,
      `        {/* Async data fetching required — see sitefinity-data.tsx for the pattern. */}`
    );
    handled.add(videoProp.name);
  }

  // Images — rendered from the server-side fetch results (see buildImageFetches).
  for (const img of images) {
    lines.push(
      `        {${img.varName} && (`,
      `          <img`,
      `            src={${img.varName}.Url}`,
      `            alt={${img.varName}.AlternativeText ?? ${img.varName}.Title ?? ''}`,
      `          />`,
      `        )}`
    );
    handled.add(img.originalName);
  }

  // Title
  if (titleProp) {
    if (titleProp.renderHint === "html") {
      lines.push(
        `        {props.model.Properties.${titleProp.name} && (`,
        `          <h2 dangerouslySetInnerHTML={{ __html: props.model.Properties.${titleProp.name} }} />`,
        `        )}`
      );
    } else {
      lines.push(
        `        {props.model.Properties.${titleProp.name} && (`,
        `          <h2 className="text-4xl font-bold mb-4">`,
        `            {props.model.Properties.${titleProp.name}}`,
        `          </h2>`,
        `        )}`
      );
    }
    handled.add(titleProp.name);
  }

  // Subtitle / body text
  if (subtitleProp) {
    if (subtitleProp.renderHint === "html") {
      lines.push(
        `        {props.model.Properties.${subtitleProp.name} && (`,
        `          <div`,
        `            className="prose"`,
        `            dangerouslySetInnerHTML={{ __html: props.model.Properties.${subtitleProp.name} }}`,
        `          />`,
        `        )}`
      );
    } else {
      lines.push(
        `        {props.model.Properties.${subtitleProp.name} && (`,
        `          <p className="text-lg text-gray-600 mb-8">`,
        `            {props.model.Properties.${subtitleProp.name}}`,
        `          </p>`,
        `        )}`
      );
    }
    handled.add(subtitleProp.name);
  }

  // CTA button
  if (buttonTextProp && buttonUrlProp) {
    const showCond = showButtonProp
      ? `props.model.Properties.${showButtonProp.name} && `
      : "";
    lines.push(
      `        {${showCond}props.model.Properties.${buttonUrlProp.name} && (`,
      `          <a`,
      `            href={props.model.Properties.${buttonUrlProp.name}}`,
      `            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"`,
      `          >`,
      `            {props.model.Properties.${buttonTextProp.name}}`,
      `          </a>`,
      `        )}`
    );
    handled.add(buttonTextProp.name);
    handled.add(buttonUrlProp.name);
    if (showButtonProp) handled.add(showButtonProp.name);
  }

  // Remaining unhandled properties
  const remaining = properties.filter((p) => !handled.has(p.name));
  if (remaining.length > 0 && lines.length > 0) {
    lines.push(`        {/* --- additional properties --- */}`);
  }

  for (const prop of remaining) {
    if (prop.renderHint === "html") {
      lines.push(
        `        {props.model.Properties.${prop.name} && (`,
        `          <div dangerouslySetInnerHTML={{ __html: props.model.Properties.${prop.name} }} />`,
        `        )}`
      );
    } else if (prop.renderHint === "url") {
      lines.push(
        `        {props.model.Properties.${prop.name} && (`,
        `          <a href={props.model.Properties.${prop.name}}>`,
        `            {props.model.Properties.${prop.name}}`,
        `          </a>`,
        `        )}`
      );
    } else if (prop.type === "boolean") {
      lines.push(
        `        {props.model.Properties.${prop.name} && (`,
        `          <span className="badge">${prop.displayName ?? prop.name}</span>`,
        `        )}`
      );
    } else if (prop.type === "string") {
      lines.push(
        `        {props.model.Properties.${prop.name} && (`,
        `          <p className="text-sm">{props.model.Properties.${prop.name}}</p>`,
        `        )}`
      );
    } else if (prop.type === "number") {
      lines.push(
        `        <span>{props.model.Properties.${prop.name}}</span>`
      );
    } else if (prop.renderHint === "choice") {
      lines.push(
        `        {/* ${prop.name}: ${prop.enumTypeName ?? "enum"} — use to drive conditional rendering */}`,
        `        {/* e.g. props.model.Properties.${prop.name} === ${prop.enumTypeName ?? "EnumType"}.SomeValue && <... /> */}`
      );
    } else if (prop.type === "string[]") {
      lines.push(
        `        {props.model.Properties.${prop.name} && (`,
        `          <ul>`,
        `            {props.model.Properties.${prop.name}.map((item, i) => (`,
        `              <li key={i}>{item}</li>`,
        `            ))}`,
        `          </ul>`,
        `        )}`
      );
    }
  }

  if (lines.length === 0) {
    lines.push(`        {/* No renderable properties detected — add JSX here */}`);
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function generateNextjsComponent(
  schema: WidgetSchema
): { filename: string; content: string } {
  const { widgetName, properties, razorMetadata } = schema;
  const entityClassName = `${widgetName}Entity`;
  const kebabName = toKebabCase(widgetName);

  const images = imageBindings(properties);
  const hasImages = images.length > 0;

  const cssProp = properties.find((p) => p.renderHint === "css-class");
  const rootClass = cssProp
    ? `{props.model.Properties.${cssProp.name} ?? '${kebabName}'}`
    : `"${kebabName}"`;

  const jsxBody = buildJsxBody(properties, images);

  const animationNote =
    razorMetadata?.animationLibraries.length
      ? `// NOTE: Original view used: ${razorMetadata.animationLibraries.join(", ")}. Add the library and restore animation props as needed.\n`
      : "";
  const partialNote =
    razorMetadata?.partialViews.length
      ? `// NOTE: Original view had partial views: ${razorMetadata.partialViews.join(", ")}. Convert these to React components separately.\n`
      : "";

  // Image properties require an async server component + a REST fetch before render.
  const restImport = hasImages
    ? `import { RestClient, RestSdkTypes, SdkItem } from '@progress/sitefinity-nextjs-sdk/rest-sdk';\n`
    : "";
  const fnKeyword = hasImages ? "export async function" : "export function";
  const imageFetches = hasImages ? `\n${buildImageFetches(images)}\n` : "";

  const content = `import React from 'react';
import { WidgetContext, htmlAttributes } from '@progress/sitefinity-nextjs-sdk';
${restImport}import { ${entityClassName} } from './${kebabName}.entity';
${animationNote}${partialNote}
${fnKeyword} ${widgetName}(props: WidgetContext<${entityClassName}>) {
    // Required — spreads Sitefinity page-editor data attributes onto the root element
    const dataAttributes = htmlAttributes(props);
${imageFetches}
    return (
        <div {...dataAttributes} className=${rootClass}>
${jsxBody}
        </div>
    );
}
`;

  return {
    filename: `${kebabName}.tsx`,
    content,
  };
}

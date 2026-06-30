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
 *
 * Reference: nextjs-samples/src/hello-world/.../hello-world.tsx
 *            nextjs-samples/src/sitefinity-data/.../sitefinity-data.tsx
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

/** Mirror the entity generator's name-stripping for image props. */
function imagePropertyName(name: string): string {
  return name.replace(/Url$/i, "");
}

function find(props: WidgetProperty[], pattern: RegExp): WidgetProperty | undefined {
  return props.find((p) => pattern.test(p.name));
}

// ---------------------------------------------------------------------------
// JSX body — driven by renderHint, using props.model.Properties.X
// ---------------------------------------------------------------------------

function buildJsxBody(properties: WidgetProperty[]): string {
  const lines: string[] = [];
  const handled = new Set<string>();

  const cssProp = properties.find((p) => p.renderHint === "css-class");
  const imageProp = properties.find((p) => p.renderHint === "image");
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

  // Image — MixedContentContext requires an async REST fetch before rendering.
  // The entity emits the name without the "Url" suffix (e.g. BackgroundImageUrl → BackgroundImage).
  if (imageProp) {
    const emittedName = imagePropertyName(imageProp.name);
    lines.push(
      `        {/*`,
      `          TODO: ${emittedName} is a MixedContentContext content selector.`,
      `          Fetch the related item via RestClient before rendering:`,
      ``,
      `          const items = await RestClient.getItems({ type: KnownContentTypes.Images, ... });`,
      ``,
      `          See: references/Nextjs-projects-sitefinity/nextjs-samples/src/sitefinity-data/`,
      `               for the full async fetch pattern.`,
      `        */}`
    );
    handled.add(imageProp.name);
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

  const cssProp = properties.find((p) => p.renderHint === "css-class");
  const rootClass = cssProp
    ? `{props.model.Properties.${cssProp.name} ?? '${kebabName}'}`
    : `"${kebabName}"`;

  const jsxBody = buildJsxBody(properties);

  const animationNote =
    razorMetadata?.animationLibraries.length
      ? `// NOTE: Original view used: ${razorMetadata.animationLibraries.join(", ")}. Add the library and restore animation props as needed.\n`
      : "";
  const partialNote =
    razorMetadata?.partialViews.length
      ? `// NOTE: Original view had partial views: ${razorMetadata.partialViews.join(", ")}. Convert these to React components separately.\n`
      : "";

  const content = `import React from 'react';
import { WidgetContext, htmlAttributes } from '@progress/sitefinity-nextjs-sdk';
import { ${entityClassName} } from './${kebabName}.entity';
${animationNote}${partialNote}
export function ${widgetName}(props: WidgetContext<${entityClassName}>) {
    // Required — spreads Sitefinity page-editor data attributes onto the root element
    const dataAttributes = htmlAttributes(props);

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

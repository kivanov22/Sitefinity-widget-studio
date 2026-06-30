/**
 * parser-razor (v0.2)
 *
 * Parses a Sitefinity .NET Core Renderer Razor view (.cshtml) to extract:
 *   - Widget name (from @model directive)
 *   - All Model.X property usages
 *   - Nested object shapes (Model.Image?.Url → ImageObject { url, title, alt })
 *   - Render hints per property (Html.Raw → "html", image src → "image", etc.)
 *   - Conditional props (used in @if → isNullable = true)
 *   - Partial view dependencies
 *   - Animation library usage
 *   - Root CSS class names
 */

import type {
  WidgetProperty,
  WidgetSchema,
  RazorMetadata,
  NestedObjectShape,
  PropertyType,
  RenderHint,
} from "@/types/widget";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toCamelCase(name: string): string {
  return name.charAt(0).toLowerCase() + name.slice(1);
}

function toPascalCase(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function deriveWidgetName(modelClass: string): string {
  return modelClass
    .replace(/ViewModel$/, "Widget")
    .replace(/Model$/, "Widget");
}

// ---------------------------------------------------------------------------
// Step 1 — Extract @model directive
// ---------------------------------------------------------------------------

function extractModelClass(source: string): string {
  const match = source.match(/@model\s+([\w.]+)/);
  if (!match) return "UnknownViewModel";
  // Take last segment: "WebApp.ViewModels.Hero.HeroViewModel" → "HeroViewModel"
  const parts = match[1].split(".");
  return parts[parts.length - 1];
}

// ---------------------------------------------------------------------------
// Step 2 — Collect all Model.X and Model.X?.Y usages
// ---------------------------------------------------------------------------

interface ModelAccess {
  /** top-level prop name, e.g. "Image" */
  prop: string;
  /** nested field if present, e.g. "Url" from Model.Image?.Url */
  nestedField?: string;
  /** true if accessed with ?. (nullable) */
  isNullable: boolean;
  /** surrounding context — raw line for further analysis */
  context: string;
}

function collectModelAccesses(source: string): ModelAccess[] {
  const accesses: ModelAccess[] = [];
  const lines = source.split("\n");

  // Pattern: Model.PropName  or  Model.PropName?.FieldName  or  Model.PropName.FieldName
  const accessRegex = /Model\.([A-Z][a-zA-Z0-9]*)(\??\.[A-Za-z][a-zA-Z0-9]*)?/g;

  for (const line of lines) {
    let match: RegExpExecArray | null;
    accessRegex.lastIndex = 0;
    while ((match = accessRegex.exec(line)) !== null) {
      const prop = match[1];
      const nestedPart = match[2]; // e.g. "?.Url" or ".Title"
      const isNullable = nestedPart?.startsWith("?.") ?? false;
      const nestedField = nestedPart
        ? nestedPart.replace(/^\??\./, "")
        : undefined;

      accesses.push({ prop, nestedField, isNullable, context: line.trim() });
    }
  }

  return accesses;
}

// ---------------------------------------------------------------------------
// Step 3 — Group accesses into property definitions
// ---------------------------------------------------------------------------

interface PropGroup {
  prop: string;
  nestedFields: Set<string>;
  isNullable: boolean;
  contextLines: string[];
}

function groupAccesses(accesses: ModelAccess[]): Map<string, PropGroup> {
  const map = new Map<string, PropGroup>();

  for (const access of accesses) {
    if (!map.has(access.prop)) {
      map.set(access.prop, {
        prop: access.prop,
        nestedFields: new Set(),
        isNullable: false,
        contextLines: [],
      });
    }
    const group = map.get(access.prop)!;
    if (access.nestedField) group.nestedFields.add(access.nestedField);
    if (access.isNullable) group.isNullable = true;
    group.contextLines.push(access.context);
  }

  return map;
}

// ---------------------------------------------------------------------------
// Step 4 — Detect render hints from context
// ---------------------------------------------------------------------------

function detectRenderHint(prop: string, contextLines: string[], source: string, htmlRawProps: string[]): RenderHint {
  // Html.Raw usage → html
  if (htmlRawProps.includes(prop)) return "html";

  // Check context for image/video signals
  const allContext = contextLines.join(" ").toLowerCase();
  const propLower = prop.toLowerCase();

  if (propLower.includes("video")) return "video";
  if (
    propLower.includes("image") ||
    propLower.includes("photo") ||
    propLower.includes("thumbnail") ||
    propLower.includes("banner")
  )
    return "image";
  if (propLower.includes("cssclass") || propLower.includes("wrapperclass"))
    return "css-class";
  if (
    propLower.includes("url") ||
    propLower.includes("href") ||
    propLower.includes("link") ||
    allContext.includes("href=") ||
    allContext.includes("src=")
  )
    return "url";

  return "text";
}

// ---------------------------------------------------------------------------
// Step 5 — Determine property type from nested fields and hints
// ---------------------------------------------------------------------------

function determineType(group: PropGroup, hint: RenderHint): PropertyType {
  if (group.nestedFields.size > 0) return "object";
  if (hint === "image" || hint === "video") return "object";
  return "string";
}

// ---------------------------------------------------------------------------
// Step 6 — Build nested object shape for image/video/custom objects
// ---------------------------------------------------------------------------

const KNOWN_SHAPES: Record<string, NestedObjectShape> = {
  image: {
    interfaceName: "SfImage",
    fields: [
      { name: "url", type: "string", isNullable: false },
      { name: "title", type: "string", isNullable: true },
      { name: "alternativeText", type: "string", isNullable: true },
    ],
  },
  video: {
    interfaceName: "SfVideo",
    fields: [
      { name: "url", type: "string", isNullable: false },
      { name: "thumbnailUrl", type: "string", isNullable: true },
    ],
  },
};

function buildNestedShape(prop: string, nestedFields: Set<string>, widgetName: string): NestedObjectShape {
  const propLower = prop.toLowerCase();

  // Use known Sitefinity shapes for image/video
  if (propLower.includes("image") || propLower.includes("photo") || propLower.includes("banner")) {
    return KNOWN_SHAPES.image;
  }
  if (propLower.includes("video")) {
    return KNOWN_SHAPES.video;
  }

  // Build shape from observed nested fields
  return {
    interfaceName: `${widgetName}${toPascalCase(prop)}`,
    fields: Array.from(nestedFields).map((f) => ({
      name: toCamelCase(f),
      type: "string" as PropertyType,
      isNullable: true,
    })),
  };
}

// ---------------------------------------------------------------------------
// Step 7 — Extract conditional props (@if checks)
// ---------------------------------------------------------------------------

function extractConditionalProps(source: string): string[] {
  const conditionals: string[] = [];
  // @if (!string.IsNullOrEmpty(Model.X))  or  @if (Model.X != null)
  const patterns = [
    /IsNullOrEmpty\(Model\.([A-Z][a-zA-Z0-9]*)/g,
    /Model\.([A-Z][a-zA-Z0-9]*)\s*!=\s*null/g,
    /Model\.([A-Z][a-zA-Z0-9]*)\s*\?\.\s*\w+\s*!=\s*null/g,
    /!string\.IsNullOrEmpty\(Model\.([A-Z][a-zA-Z0-9]*)/g,
  ];
  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(source)) !== null) {
      if (!conditionals.includes(match[1])) conditionals.push(match[1]);
    }
  }
  return conditionals;
}

// ---------------------------------------------------------------------------
// Step 8 — Extract Html.Raw props
// ---------------------------------------------------------------------------

function extractHtmlRawProps(source: string): string[] {
  const props: string[] = [];
  const pattern = /Html\.Raw\(.*?Model\.([A-Z][a-zA-Z0-9]*)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source)) !== null) {
    if (!props.includes(match[1])) props.push(match[1]);
  }
  return props;
}

// ---------------------------------------------------------------------------
// Step 9 — Extract partial views
// ---------------------------------------------------------------------------

function extractPartialViews(source: string): string[] {
  const partials: string[] = [];
  const pattern = /PartialAsync\(\s*"([^"]+)"/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source)) !== null) {
    partials.push(match[1]);
  }
  return partials;
}

// ---------------------------------------------------------------------------
// Step 10 — Detect animation libraries
// ---------------------------------------------------------------------------

function detectAnimationLibraries(source: string): string[] {
  const libs: string[] = [];
  if (/data-aos/.test(source)) libs.push("aos");
  if (/gsap|TweenMax|TweenLite/.test(source)) libs.push("gsap");
  if (/swiper/i.test(source)) libs.push("swiper");
  if (/trig-fade|trig-down|enable-trig/.test(source)) libs.push("custom-trig");
  return libs;
}

// ---------------------------------------------------------------------------
// Step 11 — Extract root CSS classes
// ---------------------------------------------------------------------------

function extractRootCssClasses(source: string): string[] {
  // Find the first section/div/article with a class
  const match = source.match(/<(?:section|div|article|header)\s+class="([^"]+)"/);
  if (!match) return [];
  return match[1].split(/\s+/).filter((c) => !c.includes("@"));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function parseRazorView(razorSource: string): WidgetSchema {
  const modelClass = extractModelClass(razorSource);
  const widgetName = deriveWidgetName(modelClass);

  const accesses = collectModelAccesses(razorSource);
  const grouped = groupAccesses(accesses);

  const htmlRawProps = extractHtmlRawProps(razorSource);
  const conditionalProps = extractConditionalProps(razorSource);

  const properties: WidgetProperty[] = [];

  for (const [prop, group] of grouped) {
    const hint = detectRenderHint(prop, group.contextLines, razorSource, htmlRawProps);
    const type = determineType(group, hint);
    const isNullable =
      group.isNullable || conditionalProps.includes(prop);

    const property: WidgetProperty = {
      name: prop,
      camelName: toCamelCase(prop),
      type,
      renderHint: hint,
      isNullable,
    };

    if (type === "object") {
      property.nestedShape = buildNestedShape(prop, group.nestedFields, widgetName);
    }

    properties.push(property);
  }

  const razorMetadata: RazorMetadata = {
    modelClass,
    partialViews: extractPartialViews(razorSource),
    animationLibraries: detectAnimationLibraries(razorSource),
    cssClasses: extractRootCssClasses(razorSource),
    hasVideo: properties.some((p) => p.renderHint === "video"),
    hasImage: properties.some((p) => p.renderHint === "image"),
    hasHtmlRawProps: htmlRawProps.map(toCamelCase),
    conditionalProps: conditionalProps.map(toCamelCase),
  };

  return {
    className: modelClass,
    widgetName,
    properties,
    rawSource: razorSource,
    sourceType: "cshtml",
    razorMetadata,
  };
}

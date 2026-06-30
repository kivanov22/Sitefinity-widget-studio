// ---------------------------------------------------------------------------
// Property types
// ---------------------------------------------------------------------------

export type PropertyType =
  | "string"
  | "number"
  | "boolean"
  | "string[]"
  | "number[]"
  | "object"      // nested model (e.g. ImageViewModel)
  | "unknown";

export type RenderHint =
  | "text"               // plain string
  | "html"               // dangerouslySetInnerHTML (Html.Raw in Razor)
  | "image"              // nested image object (url + alt + title)
  | "video"              // nested video object (url + thumbnailUrl)
  | "css-class"          // CSS class override prop
  | "url"                // href / src
  | "none";              // boolean flag, no direct render

// ---------------------------------------------------------------------------
// Nested object shape detected from Razor view
// ---------------------------------------------------------------------------

export interface NestedObjectShape {
  /** TypeScript interface name, e.g. "HeroImage" */
  interfaceName: string;
  fields: {
    name: string;
    type: PropertyType;
    isNullable: boolean;
  }[];
}

// ---------------------------------------------------------------------------
// Single widget property
// ---------------------------------------------------------------------------

export interface WidgetProperty {
  name: string;
  camelName: string;
  type: PropertyType;
  renderHint: RenderHint;

  // From C# attributes
  displayName?: string;
  description?: string;
  defaultValue?: string | number | boolean | null;
  section?: string;
  isRequired?: boolean;
  isNullable?: boolean;

  // Set when type === "object"
  nestedShape?: NestedObjectShape;
}

// ---------------------------------------------------------------------------
// Parser source type
// ---------------------------------------------------------------------------

export type SourceType = "viewmodel" | "cshtml" | "both";

// ---------------------------------------------------------------------------
// Razor-specific metadata extracted from the view
// ---------------------------------------------------------------------------

export interface RazorMetadata {
  modelClass: string;           // from @model HeroViewModel
  partialViews: string[];       // from Html.PartialAsync("...")
  animationLibraries: string[]; // "aos", "gsap" etc detected
  cssClasses: string[];         // root BEM classes detected
  hasVideo: boolean;
  hasImage: boolean;
  hasHtmlRawProps: string[];    // prop names rendered with Html.Raw
  conditionalProps: string[];   // props used in @if checks
}

// ---------------------------------------------------------------------------
// Parsed widget schema
// ---------------------------------------------------------------------------

export interface WidgetSchema {
  className: string;
  widgetName: string;
  properties: WidgetProperty[];
  namespace?: string;
  rawSource: string;
  sourceType: SourceType;
  razorMetadata?: RazorMetadata;
}

// ---------------------------------------------------------------------------
// Generated output
// ---------------------------------------------------------------------------

export interface GeneratedWidget {
  /** @deprecated v0.2 flat format — use entityFile for SDK-compatible output */
  typesFile: {
    filename: string;
    content: string;
  };
  /** @deprecated v0.2 flat format — use entityFile for SDK-compatible output */
  metadataFile: {
    filename: string;
    content: string;
  };
  componentFile: {
    filename: string;
    content: string;
  };
  // v0.3 — SDK-compatible outputs (@progress/sitefinity-widget-designers-sdk pattern)
  entityFile: {
    filename: string;
    content: string;
  };
  /** Paste into your widget-registry.ts inside the widgets: {} object */
  registryEntrySnippet: string;
}

// ---------------------------------------------------------------------------
// Saved widget (Supabase row shape)
// ---------------------------------------------------------------------------

export interface SavedWidget {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  source_type: SourceType;
  raw_source: string;
  schema: WidgetSchema;
  generated: GeneratedWidget;
  tags: string[];
  is_public: boolean;
  version: number;
}

// ---------------------------------------------------------------------------
// API contracts
// ---------------------------------------------------------------------------

export interface ConvertRequest {
  csharpSource?: string;
  razorSource?: string;
  sourceType: SourceType;
}

export interface ConvertResult {
  schema: WidgetSchema;
  generated: GeneratedWidget;
}

export interface ConvertErrorResponse {
  error: string;
  details?: string;
}

export interface SaveWidgetRequest {
  result: ConvertResult;
  tags?: string[];
}

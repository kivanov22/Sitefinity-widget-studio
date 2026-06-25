// ---------------------------------------------------------------------------
// Widget property types
// ---------------------------------------------------------------------------

export type PropertyType =
  | "string"
  | "number"
  | "boolean"
  | "string[]"
  | "number[]"
  | "unknown";

export interface WidgetProperty {
  name: string;
  /** camelCase version for TypeScript/React */
  camelName: string;
  type: PropertyType;
  /** from [DisplayName] attribute */
  displayName?: string;
  /** from [Description] attribute */
  description?: string;
  /** from [DefaultValue] attribute */
  defaultValue?: string | number | boolean | null;
  /** from [ContentSection] attribute */
  section?: string;
  isRequired?: boolean;
  isNullable?: boolean;
}

// ---------------------------------------------------------------------------
// Parsed widget schema (output of parser-csharp)
// ---------------------------------------------------------------------------

export interface WidgetSchema {
  /** PascalCase class name, e.g. "HeroWidgetModel" */
  className: string;
  /** Derived widget name, e.g. "HeroWidget" */
  widgetName: string;
  properties: WidgetProperty[];
  /** Namespace from C# file */
  namespace?: string;
  /** Raw C# source passed in */
  rawSource: string;
}

// ---------------------------------------------------------------------------
// Generated output (output of widget-generator)
// ---------------------------------------------------------------------------

export interface GeneratedWidget {
  /** e.g. HeroWidget.types.ts */
  typesFile: {
    filename: string;
    content: string;
  };
  /** e.g. HeroWidget.metadata.ts */
  metadataFile: {
    filename: string;
    content: string;
  };
  /** e.g. HeroWidget.tsx */
  componentFile: {
    filename: string;
    content: string;
  };
}

// ---------------------------------------------------------------------------
// API contract
// ---------------------------------------------------------------------------

export interface ConvertRequest {
  csharpSource: string;
}

export interface ConvertResult {
  schema: WidgetSchema;
  generated: GeneratedWidget;
}

export interface ConvertErrorResponse {
  error: string;
  details?: string;
}

"use client";

import { useMemo, useState, Component, type ReactNode } from "react";
import type { WidgetProperty, WidgetSchema } from "@/types/widget";
import { imagePropertyName } from "@/lib/generator-nextjs-entity";
import { transpileComponent, type TranspiledComponent } from "@/lib/preview-transpile";
import { AlertTriangle, Info } from "lucide-react";

interface Props {
  schema: WidgetSchema;
  componentSource: string;
}

type PanelValue = string | number | boolean | string[];

const PLACEHOLDER_IMAGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="240"><rect width="100%" height="100%" fill="#e2e8f0"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" font-family="sans-serif" font-size="16" fill="#94a3b8">No image selected</text></svg>`
  );

// ---------------------------------------------------------------------------
// Panel default seeding — pulled straight from the same WidgetProperty[] the
// generators consume (schema.properties), never re-derived from the TSX text.
// ---------------------------------------------------------------------------

function defaultValueFor(prop: WidgetProperty): PanelValue {
  if (prop.renderHint === "image") return "";
  if (prop.type === "boolean") return typeof prop.defaultValue === "boolean" ? prop.defaultValue : true;
  if (prop.type === "number") return typeof prop.defaultValue === "number" ? prop.defaultValue : 3;
  if (prop.type === "string[]") return [];
  if (prop.renderHint === "choice") return prop.enumValues?.[0] ?? "";
  if (typeof prop.defaultValue === "string") return prop.defaultValue;
  return `Sample ${prop.displayName ?? prop.name}`;
}

function buildInitialPanelState(properties: WidgetProperty[]): Record<string, PanelValue> {
  const state: Record<string, PanelValue> = {};
  for (const prop of properties) {
    if (prop.renderHint === "content-reference" || prop.renderHint === "video") continue; // not editable
    state[prop.name] = defaultValueFor(prop);
  }
  return state;
}

/**
 * The mock `props.model.Properties` the transpiled component actually reads.
 * Keyed the same way the generators key it: image props use the Url-stripped
 * name (see imagePropertyName), everything else uses the raw prop name.
 */
function buildMockProps(
  schema: WidgetSchema,
  panelValues: Record<string, PanelValue>
): { model: { Properties: Record<string, unknown> } } {
  const properties: Record<string, unknown> = {};

  for (const prop of schema.properties) {
    const key = prop.renderHint === "image" ? imagePropertyName(prop.name) : prop.name;

    if (prop.renderHint === "content-reference" || prop.renderHint === "video") {
      // The generated component only emits a TODO comment for these — no
      // code ever reads this key, so the value here is inert.
      properties[key] = null;
      continue;
    }

    if (prop.renderHint === "image") {
      const urlText = (panelValues[prop.name] as string) ?? "";
      properties[key] = {
        Url: urlText.trim() || PLACEHOLDER_IMAGE,
        AlternativeText: "",
        Title: "",
      };
      continue;
    }

    properties[key] = panelValues[prop.name];
  }

  return { model: { Properties: properties } };
}

// ---------------------------------------------------------------------------
// Prop controls
// ---------------------------------------------------------------------------

function PropControl({
  prop,
  value,
  onChange,
}: {
  prop: WidgetProperty;
  value: PanelValue;
  onChange: (v: PanelValue) => void;
}) {
  if (prop.renderHint === "content-reference") {
    return (
      <div className="text-xs text-muted-foreground italic px-3 py-2 border border-dashed border-border rounded-md">
        Static content reference — not live-editable in preview
        {prop.contentItemType && (
          <span className="block mt-1 font-mono text-[10px] opacity-70 break-all">
            {prop.contentItemType}
          </span>
        )}
      </div>
    );
  }

  if (prop.renderHint === "video") {
    return (
      <div className="text-xs text-muted-foreground italic px-3 py-2 border border-dashed border-border rounded-md">
        Video reference — not live-editable in preview
      </div>
    );
  }

  if (prop.renderHint === "image") {
    return (
      <input
        type="text"
        className="w-full text-sm border border-border rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        placeholder="https://example.com/sample.jpg — blank shows a placeholder"
        value={value as string}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  if (prop.renderHint === "choice") {
    if (prop.enumValues?.length) {
      return (
        <select
          className="w-full text-sm border border-border rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
        >
          {prop.enumValues.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      );
    }
    return (
      <input
        type="text"
        className="w-full text-sm border border-border rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        placeholder={`enum "${prop.enumTypeName ?? "unknown"}" not resolved — type a value`}
        value={value as string}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  if (prop.type === "boolean") {
    const checked = Boolean(value);
    return (
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors ${checked ? "bg-primary" : "bg-muted"}`}
        aria-pressed={checked}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
            checked ? "translate-x-4" : ""
          }`}
        />
      </button>
    );
  }

  if (prop.type === "number") {
    return (
      <input
        type="number"
        className="w-full text-sm border border-border rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        value={value as number}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    );
  }

  if (prop.type === "string[]") {
    const arr = (value as string[] | undefined) ?? [];
    return (
      <textarea
        className="w-full text-sm font-mono border border-border rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        rows={3}
        placeholder="one item per line"
        value={arr.join("\n")}
        onChange={(e) => onChange(e.target.value.split("\n").filter((l) => l.trim().length > 0))}
      />
    );
  }

  // Default: plain string input — covers renderHint text/html/url/css-class.
  return (
    <input
      type="text"
      className="w-full text-sm border border-border rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
      value={value as string}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

// ---------------------------------------------------------------------------
// Error boundary — catches runtime render errors from the dynamically
// created component. Transpile errors are caught separately (see below),
// since they happen before any element is created.
// ---------------------------------------------------------------------------

interface BoundaryState {
  error: Error | null;
}

class PreviewErrorBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="p-4 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="font-medium mb-1 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" /> Render error
          </p>
          <p className="font-mono text-xs whitespace-pre-wrap">{this.state.error.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

// ---------------------------------------------------------------------------
// Main pane
// ---------------------------------------------------------------------------

export function PreviewPane({ schema, componentSource }: Props) {
  // GeneratedOutput mounts a fresh PreviewPane instance (key={componentSource})
  // for every new conversion, so this lazy initializer is the only place
  // panel defaults are computed — no effect-based reset needed, and no render
  // frame where panelValues' keys can lag behind a just-changed schema.
  const [panelValues, setPanelValues] = useState<Record<string, PanelValue>>(() =>
    buildInitialPanelState(schema.properties)
  );

  const transpileResult = useMemo((): { component: TranspiledComponent | null; error: string | null } => {
    try {
      return { component: transpileComponent(componentSource), error: null };
    } catch (err) {
      return { component: null, error: err instanceof Error ? err.message : String(err) };
    }
  }, [componentSource]);

  const mockProps = useMemo(() => buildMockProps(schema, panelValues), [schema, panelValues]);

  const Component_ = transpileResult.component?.component as
    | React.ComponentType<Record<string, unknown>>
    | undefined;

  return (
    <div className="flex h-full gap-4">
      {/* Left: prop control panel */}
      <div className="w-64 flex-shrink-0 overflow-y-auto space-y-3 pr-3 border-r border-border">
        {schema.properties.length === 0 && (
          <p className="text-xs text-muted-foreground">No properties parsed.</p>
        )}
        {schema.properties.map((prop) => (
          <div key={prop.name}>
            <label className="block text-xs font-medium mb-1">{prop.displayName ?? prop.name}</label>
            <PropControl
              prop={prop}
              value={panelValues[prop.name]}
              onChange={(v) => setPanelValues((s) => ({ ...s, [prop.name]: v }))}
            />
          </div>
        ))}
      </div>

      {/* Right: live render */}
      <div className="flex-1 overflow-y-auto">
        {transpileResult.component?.wasAsync && (
          <div className="mb-3 flex items-start gap-2 p-2.5 text-xs bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-400 rounded-md">
            <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>Preview shows static prop values — async data resolution is not simulated.</span>
          </div>
        )}

        {transpileResult.error ? (
          <div className="p-4 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="font-medium mb-1 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" /> Transpile error
            </p>
            <p className="font-mono text-xs whitespace-pre-wrap">{transpileResult.error}</p>
          </div>
        ) : (
          <PreviewErrorBoundary key={componentSource}>
            <div className="border border-border rounded-lg p-4 bg-white text-black">
              {Component_ && <Component_ {...mockProps} />}
            </div>
          </PreviewErrorBoundary>
        )}
      </div>
    </div>
  );
}

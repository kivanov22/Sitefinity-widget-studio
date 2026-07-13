"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  type ConvertRequest,
  type ConvertResult,
  type ConvertErrorResponse,
  type SourceType,
} from "@/types/widget";
import {
  HERO_WIDGET_SAMPLE,
  HERO_RAZOR_SAMPLE,
  FAQ_WIDGET_SAMPLE,
  CARD_GRID_WIDGET_SAMPLE,
  MVC_AUTHOR_CONTROLLER_SAMPLE,
  MVC_AUTHOR_MODEL_SAMPLE,
  MVC_AUTHOR_INTERFACE_SAMPLE,
  MVC_CUSTOM_IMAGE_CONTROLLER_SAMPLE,
  MVC_CUSTOM_IMAGE_MODEL_SAMPLE,
  MVC_SIMPLE_CONTENT_BLOCK_SAMPLE,
  MVC_LIST_WIDGET_SAMPLE,
} from "@/lib/samples";
import { AlertCircle, ChevronDown, ChevronUp, Loader2, Save, Wand2 } from "lucide-react";

interface Props {
  onResult: (result: ConvertResult) => void;
}

/** The four MVC input panes. */
interface MvcSources {
  controller: string;
  model: string;
  iface: string;
  view: string;
}

const EMPTY_MVC: MvcSources = { controller: "", model: "", iface: "", view: "" };

/**
 * A controller using [TypeConverter(ExpandableObjectConverter)] keeps its properties on a
 * nested Model class, so the Model pane is required. Fallback widgets (SimpleContentBlock,
 * ListWidget) declare properties on the controller itself and need no Model.
 */
function requiresModel(controller: string): boolean {
  return controller.includes("[TypeConverter(");
}

// ---- API calls ----

async function convertWidget(payload: ConvertRequest): Promise<ConvertResult> {
  const res = await fetch("/api/parse-widget", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error((data as ConvertErrorResponse).error ?? "Conversion failed");
  return data as ConvertResult;
}

async function saveWidget(result: ConvertResult): Promise<void> {
  const res = await fetch("/api/widgets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ result }),
  });
  if (!res.ok && res.status !== 503) {
    const err = await res.json();
    throw new Error(err.error ?? "Save failed");
  }
}

// ---- Samples ----

const SINGLE_SAMPLES: Record<"viewmodel" | "cshtml", { label: string; value: string }[]> = {
  viewmodel: [
    { label: "Hero Widget", value: HERO_WIDGET_SAMPLE },
    { label: "FAQ Widget", value: FAQ_WIDGET_SAMPLE },
    { label: "Card Grid Widget", value: CARD_GRID_WIDGET_SAMPLE },
  ],
  cshtml: [{ label: "Hero Razor View", value: HERO_RAZOR_SAMPLE }],
};

const MVC_SAMPLES: { label: string; sources: Partial<MvcSources> }[] = [
  {
    label: "Author Widget (TypeConverter + image pair)",
    sources: { controller: MVC_AUTHOR_CONTROLLER_SAMPLE, model: MVC_AUTHOR_MODEL_SAMPLE },
  },
  {
    label: "Author Widget + interface (additive props)",
    sources: {
      controller: MVC_AUTHOR_CONTROLLER_SAMPLE,
      model: MVC_AUTHOR_MODEL_SAMPLE,
      iface: MVC_AUTHOR_INTERFACE_SAMPLE,
    },
  },
  {
    label: "Custom Image Widget (Guid pair)",
    sources: {
      controller: MVC_CUSTOM_IMAGE_CONTROLLER_SAMPLE,
      model: MVC_CUSTOM_IMAGE_MODEL_SAMPLE,
    },
  },
  {
    label: "Simple Content Block (no Model)",
    sources: { controller: MVC_SIMPLE_CONTENT_BLOCK_SAMPLE },
  },
  {
    label: "List Widget (enum + JSON array, no Model)",
    sources: { controller: MVC_LIST_WIDGET_SAMPLE },
  },
];

// ---- MVC pane ----

function MvcField({
  label,
  hint,
  required,
  value,
  onChange,
  placeholder,
  rows,
}: {
  label: string;
  hint?: string;
  required: boolean;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  rows: number;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="flex items-baseline gap-2 text-xs font-medium">
        <span>{label}</span>
        {required ? (
          <span className="text-destructive text-[10px] uppercase tracking-wide">required</span>
        ) : (
          <span className="text-muted-foreground/60 text-[10px] uppercase tracking-wide">optional</span>
        )}
        {hint && <span className="text-muted-foreground/70 font-normal">{hint}</span>}
      </label>
      <textarea
        className={`font-mono text-xs bg-muted/30 border rounded-lg p-3 resize-y focus:outline-none focus:ring-2 focus:ring-ring ${
          required ? "border-border" : "border-border/60"
        }`}
        style={{ minHeight: `${rows * 1.5}rem` }}
        rows={rows}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
      />
    </div>
  );
}

// ---- Component ----

export function ConverterPanel({ onResult }: Props) {
  const [sourceType, setSourceType] = useState<SourceType>("viewmodel");
  const [source, setSource] = useState("");
  const [mvc, setMvc] = useState<MvcSources>(EMPTY_MVC);
  const [showSamples, setShowSamples] = useState(false);
  const [lastResult, setLastResult] = useState<ConvertResult | null>(null);
  const [savedOk, setSavedOk] = useState(false);

  const convertMutation = useMutation({
    mutationFn: (payload: ConvertRequest) => convertWidget(payload),
    onSuccess: (result) => {
      setLastResult(result);
      onResult(result);
      setSavedOk(false);
    },
  });

  const saveMutation = useMutation({
    mutationFn: (result: ConvertResult) => saveWidget(result),
    onSuccess: () => setSavedOk(true),
  });

  const modelRequired = requiresModel(mvc.controller);
  const canConvert =
    sourceType === "mvc"
      ? mvc.controller.trim().length > 0 && (!modelRequired || mvc.model.trim().length > 0)
      : source.trim().length > 0;

  function handleConvert() {
    if (!canConvert) return;

    if (sourceType === "mvc") {
      convertMutation.mutate({
        sourceType,
        mvcController: mvc.controller,
        mvcModel: mvc.model || undefined,
        mvcInterface: mvc.iface || undefined,
        mvcView: mvc.view || undefined,
      });
    } else if (sourceType === "cshtml") {
      convertMutation.mutate({ sourceType, razorSource: source });
    } else {
      convertMutation.mutate({ sourceType, csharpSource: source });
    }
  }

  function resetAll() {
    setSource("");
    setMvc(EMPTY_MVC);
    convertMutation.reset();
    setLastResult(null);
    setSavedOk(false);
  }

  function handleTabChange(tab: SourceType) {
    setSourceType(tab);
    resetAll();
  }

  const hasAnyInput =
    sourceType === "mvc" ? Object.values(mvc).some((v) => v.trim()) : Boolean(source);

  const placeholder =
    sourceType === "cshtml"
      ? `@model HeroViewModel\n\n<section class="hero">\n  @if (!string.IsNullOrEmpty(Model.Title))\n  {\n    <h1>@Html.Raw(Model.Title)</h1>\n  }\n</section>`
      : `public class HeroWidgetModel\n{\n    public string Title { get; set; }\n    // ...\n}`;

  return (
    <div className="flex flex-col h-full p-6 gap-4 overflow-y-auto">
      {/* Title */}
      <div>
        <h2 className="font-semibold text-sm">Widget Source</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Paste a ViewModel class, a Razor .cshtml view, or an MVC widget
        </p>
      </div>

      {/* Source type tabs */}
      <div className="flex rounded-lg border border-border overflow-hidden text-xs font-medium">
        {(["viewmodel", "cshtml", "mvc"] as SourceType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={`flex-1 py-2 transition-colors ${
              sourceType === tab
                ? "bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {tab === "viewmodel" ? "ViewModel (.cs)" : tab === "cshtml" ? "Razor View (.cshtml)" : "MVC Widget"}
          </button>
        ))}
      </div>

      {/* Samples dropdown */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {sourceType === "cshtml"
            ? "Paste the .cshtml view — @model directive required"
            : sourceType === "mvc"
            ? "Paste each file into its own field"
            : "Paste the C# ViewModel or Model class"}
        </p>
        <button
          onClick={() => setShowSamples((s) => !s)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 border border-border rounded-md"
        >
          Samples
          {showSamples ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {showSamples && (
        <div className="rounded-lg border border-border bg-muted/40 divide-y divide-border">
          {sourceType === "mvc"
            ? MVC_SAMPLES.map((s) => (
                <button
                  key={s.label}
                  onClick={() => {
                    setMvc({ ...EMPTY_MVC, ...s.sources });
                    setShowSamples(false);
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors"
                >
                  {s.label}
                </button>
              ))
            : SINGLE_SAMPLES[sourceType as "viewmodel" | "cshtml"].map((s) => (
                <button
                  key={s.label}
                  onClick={() => {
                    setSource(s.value);
                    setShowSamples(false);
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors"
                >
                  {s.label}
                </button>
              ))}
        </div>
      )}

      {/* Inputs */}
      {sourceType === "mvc" ? (
        <div className="flex flex-col gap-3">
          <MvcField
            label="Controller (.cs)"
            required
            rows={10}
            value={mvc.controller}
            onChange={(v) => setMvc((m) => ({ ...m, controller: v }))}
            placeholder={`[ControllerToolboxItem(Name = "Author", Title = "Author", SectionName = "Feather samples")]\npublic class AuthorController : Controller\n{\n    [TypeConverter(typeof(ExpandableObjectConverter))]\n    public AuthorModel Model { get; }\n}`}
          />
          <MvcField
            label="Model (.cs)"
            hint={modelRequired ? "controller uses [TypeConverter]" : "not needed — props are on the controller"}
            required={modelRequired}
            rows={8}
            value={mvc.model}
            onChange={(v) => setMvc((m) => ({ ...m, model: v }))}
            placeholder={`public class AuthorModel\n{\n    public Guid ImageId { get; set; }\n    public string ImageProviderName { get; set; }\n    public string Name { get; set; }\n}`}
          />
          <MvcField
            label="IModel (.cs)"
            hint="properties are additive"
            required={false}
            rows={5}
            value={mvc.iface}
            onChange={(v) => setMvc((m) => ({ ...m, iface: v }))}
            placeholder={`public interface IAuthorModel\n{\n    string TwitterHandle { get; set; }\n}`}
          />
          <MvcField
            label="View (.cshtml)"
            hint="accepted, not yet parsed"
            required={false}
            rows={5}
            value={mvc.view}
            onChange={(v) => setMvc((m) => ({ ...m, view: v }))}
            placeholder={`@model AuthorWidget.MVC.Models.Author.AuthorViewModel\n\n<div class="author">@Model.Name</div>`}
          />
        </div>
      ) : (
        <textarea
          className="flex-1 font-mono text-xs bg-muted/30 border border-border rounded-lg p-4 resize-none focus:outline-none focus:ring-2 focus:ring-ring min-h-[360px]"
          placeholder={placeholder}
          value={source}
          onChange={(e) => setSource(e.target.value)}
          spellCheck={false}
        />
      )}

      {/* Error */}
      {convertMutation.isError && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{convertMutation.error.message}</span>
        </div>
      )}

      {/* Actions row */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={handleConvert}
          disabled={!canConvert || convertMutation.isPending}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
        >
          {convertMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Wand2 className="w-4 h-4" />
          )}
          Convert to Next.js
        </button>

        {lastResult && (
          <button
            onClick={() => saveMutation.mutate(lastResult)}
            disabled={saveMutation.isPending || savedOk}
            className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saveMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {savedOk ? "Saved ✓" : "Save to Marketplace"}
          </button>
        )}

        {hasAnyInput && (
          <button
            onClick={resetAll}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors ml-auto"
          >
            Clear
          </button>
        )}
      </div>

      {saveMutation.isError && (
        <p className="text-xs text-destructive">{saveMutation.error.message}</p>
      )}
      {savedOk && (
        <p className="text-xs text-green-600">Saved — view it in <a href="/marketplace" className="underline">Marketplace</a></p>
      )}

      {/* Hints */}
      <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t border-border">
        {sourceType === "viewmodel" ? (
          <>
            <p>Attributes: <code className="bg-muted px-1 rounded">[DisplayName]</code> <code className="bg-muted px-1 rounded">[ContentSection]</code> <code className="bg-muted px-1 rounded">[DefaultValue]</code></p>
            <p>Types: <code className="bg-muted px-1 rounded">string</code> <code className="bg-muted px-1 rounded">bool</code> <code className="bg-muted px-1 rounded">int</code> <code className="bg-muted px-1 rounded">ImageViewModel</code></p>
          </>
        ) : sourceType === "mvc" ? (
          <>
            <p>Detects: <code className="bg-muted px-1 rounded">[TypeConverter(ExpandableObjectConverter)]</code> → parses the Model class</p>
            <p>Collapses: <code className="bg-muted px-1 rounded">Guid ImageId + string ImageProviderName</code> → MixedContentContext image</p>
            <p>Detects: <code className="bg-muted px-1 rounded">[DynamicLinksContainer]</code>, enums, JSON-array strings</p>
            <p>No <code className="bg-muted px-1 rounded">[TypeConverter]</code>? Properties are read from the controller — leave Model empty.</p>
          </>
        ) : (
          <>
            <p>Detects: <code className="bg-muted px-1 rounded">Model.X</code> usages, <code className="bg-muted px-1 rounded">Html.Raw</code>, <code className="bg-muted px-1 rounded">PartialAsync</code>, <code className="bg-muted px-1 rounded">data-aos</code></p>
            <p>Produces: typed nested interfaces for Image, Video, and custom objects</p>
          </>
        )}
      </div>
    </div>
  );
}

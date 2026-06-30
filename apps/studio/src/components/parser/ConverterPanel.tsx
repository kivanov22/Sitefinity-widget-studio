"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { type ConvertResult, type ConvertErrorResponse, type SourceType } from "@/types/widget";
import { HERO_WIDGET_SAMPLE, HERO_RAZOR_SAMPLE, FAQ_WIDGET_SAMPLE, CARD_GRID_WIDGET_SAMPLE } from "@/lib/samples";
import { AlertCircle, ChevronDown, ChevronUp, Loader2, Save, Wand2 } from "lucide-react";

interface Props {
  onResult: (result: ConvertResult) => void;
}

// ---- API calls ----

async function convertWidget(
  source: string,
  sourceType: SourceType
): Promise<ConvertResult> {
  const body =
    sourceType === "cshtml"
      ? { razorSource: source, sourceType }
      : { csharpSource: source, sourceType };

  const res = await fetch("/api/parse-widget", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
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

// ---- Samples per tab ----

const SAMPLES: Record<SourceType, { label: string; value: string }[]> = {
  viewmodel: [
    { label: "Hero Widget", value: HERO_WIDGET_SAMPLE },
    { label: "FAQ Widget", value: FAQ_WIDGET_SAMPLE },
    { label: "Card Grid Widget", value: CARD_GRID_WIDGET_SAMPLE },
  ],
  cshtml: [{ label: "Hero Razor View", value: HERO_RAZOR_SAMPLE }],
  both: [],
};

// ---- Component ----

export function ConverterPanel({ onResult }: Props) {
  const [sourceType, setSourceType] = useState<SourceType>("viewmodel");
  const [source, setSource] = useState("");
  const [showSamples, setShowSamples] = useState(false);
  const [lastResult, setLastResult] = useState<ConvertResult | null>(null);
  const [savedOk, setSavedOk] = useState(false);

  const convertMutation = useMutation({
    mutationFn: ({ src, type }: { src: string; type: SourceType }) =>
      convertWidget(src, type),
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

  function handleConvert() {
    if (!source.trim()) return;
    convertMutation.mutate({ src: source, type: sourceType });
  }

  function handleTabChange(tab: SourceType) {
    setSourceType(tab);
    setSource("");
    convertMutation.reset();
    setLastResult(null);
    setSavedOk(false);
  }

  const placeholder =
    sourceType === "cshtml"
      ? `@model HeroViewModel\n\n<section class="hero">\n  @if (!string.IsNullOrEmpty(Model.Title))\n  {\n    <h1>@Html.Raw(Model.Title)</h1>\n  }\n</section>`
      : `public class HeroWidgetModel\n{\n    public string Title { get; set; }\n    // ...\n}`;

  return (
    <div className="flex flex-col h-full p-6 gap-4">
      {/* Title */}
      <div>
        <h2 className="font-semibold text-sm">Widget Source</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Paste a ViewModel class or a Razor .cshtml view
        </p>
      </div>

      {/* Source type tabs */}
      <div className="flex rounded-lg border border-border overflow-hidden text-xs font-medium">
        {(["viewmodel", "cshtml"] as SourceType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={`flex-1 py-2 transition-colors ${
              sourceType === tab
                ? "bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {tab === "viewmodel" ? "ViewModel (.cs)" : "Razor View (.cshtml)"}
          </button>
        ))}
      </div>

      {/* Samples dropdown */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {sourceType === "cshtml"
            ? "Paste the .cshtml view — @model directive required"
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
          {SAMPLES[sourceType].map((s) => (
            <button
              key={s.label}
              onClick={() => { setSource(s.value); setShowSamples(false); }}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors"
            >
              {s.label}
            </button>
          ))}
          {SAMPLES[sourceType].length === 0 && (
            <p className="px-4 py-3 text-xs text-muted-foreground">No samples for this type yet.</p>
          )}
        </div>
      )}

      {/* Textarea */}
      <textarea
        className="flex-1 font-mono text-xs bg-muted/30 border border-border rounded-lg p-4 resize-none focus:outline-none focus:ring-2 focus:ring-ring min-h-[360px]"
        placeholder={placeholder}
        value={source}
        onChange={(e) => setSource(e.target.value)}
        spellCheck={false}
      />

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
          disabled={!source.trim() || convertMutation.isPending}
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

        {source && (
          <button
            onClick={() => {
              setSource("");
              convertMutation.reset();
              setLastResult(null);
              setSavedOk(false);
            }}
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

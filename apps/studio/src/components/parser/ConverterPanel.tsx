"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { type ConvertResult, type ConvertErrorResponse } from "@/types/widget";
import { HERO_WIDGET_SAMPLE } from "@/lib/samples";
import { AlertCircle, ChevronDown, ChevronUp, Loader2, Wand2 } from "lucide-react";

interface Props {
  onResult: (result: ConvertResult) => void;
}

async function convertWidget(source: string): Promise<ConvertResult> {
  const res = await fetch("/api/parse-widget", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ csharpSource: source }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error((data as ConvertErrorResponse).error ?? "Conversion failed");
  }
  return data as ConvertResult;
}

export function ConverterPanel({ onResult }: Props) {
  const [source, setSource] = useState("");
  const [showSample, setShowSample] = useState(false);

  const mutation = useMutation({
    mutationFn: convertWidget,
    onSuccess: onResult,
  });

  function handleConvert() {
    if (!source.trim()) return;
    mutation.mutate(source);
  }

  function loadSample() {
    setSource(HERO_WIDGET_SAMPLE);
    setShowSample(false);
  }

  return (
    <div className="flex flex-col h-full p-6 gap-4">
      {/* Title row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-sm">C# Widget Model</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Paste a Sitefinity .NET Core Renderer widget model class
          </p>
        </div>

        <button
          onClick={() => setShowSample((s) => !s)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 border border-border rounded-md"
        >
          Samples
          {showSample ? (
            <ChevronUp className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )}
        </button>
      </div>

      {/* Sample dropdown */}
      {showSample && (
        <div className="rounded-lg border border-border bg-muted/40 divide-y divide-border">
          {[
            { label: "Hero Widget", action: loadSample },
          ].map((s) => (
            <button
              key={s.label}
              onClick={s.action}
              className="w-full text-left px-4 py-3 text-sm hover:bg-muted transition-colors"
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* Code textarea */}
      <textarea
        className="flex-1 font-mono text-xs bg-muted/30 border border-border rounded-lg p-4 resize-none focus:outline-none focus:ring-2 focus:ring-ring min-h-[400px]"
        placeholder={`public class HeroWidgetModel\n{\n    public string Title { get; set; }\n    // ...\n}`}
        value={source}
        onChange={(e) => setSource(e.target.value)}
        spellCheck={false}
      />

      {/* Error */}
      {mutation.isError && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{mutation.error.message}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleConvert}
          disabled={!source.trim() || mutation.isPending}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
        >
          {mutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Wand2 className="w-4 h-4" />
          )}
          Convert to Next.js
        </button>

        {source && (
          <button
            onClick={() => {
              setSource("");
              mutation.reset();
            }}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Hints */}
      <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t border-border">
        <p>Supported attributes: <code className="bg-muted px-1 rounded">[DisplayName]</code> <code className="bg-muted px-1 rounded">[Description]</code> <code className="bg-muted px-1 rounded">[ContentSection]</code> <code className="bg-muted px-1 rounded">[DefaultValue]</code></p>
        <p>Supported types: <code className="bg-muted px-1 rounded">string</code> <code className="bg-muted px-1 rounded">bool</code> <code className="bg-muted px-1 rounded">int</code> <code className="bg-muted px-1 rounded">List&lt;string&gt;</code></p>
      </div>
    </div>
  );
}

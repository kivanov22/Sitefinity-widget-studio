"use client";

import { useState } from "react";
import { ConverterPanel } from "@/components/parser/ConverterPanel";
import { GeneratedOutput } from "@/components/parser/GeneratedOutput";
import { type ConvertResult } from "@/types/widget";
import { Layers } from "lucide-react";
import Link from "next/link";

export default function ConvertPage() {
  const [result, setResult] = useState<ConvertResult | null>(null);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-6 h-14 flex items-center gap-4 flex-shrink-0">
        <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
            <Layers className="w-3 h-3 text-primary-foreground" />
          </div>
          <span className="font-semibold text-sm">Widget Studio</span>
        </Link>
        <span className="text-border">/</span>
        <span className="text-sm font-medium">Convert Widget</span>
      </header>

      {/* Main split pane */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Input */}
        <div className="w-1/2 border-r border-border overflow-y-auto">
          <ConverterPanel onResult={setResult} />
        </div>

        {/* Right: Output */}
        <div className="w-1/2 overflow-y-auto">
          <GeneratedOutput result={result} />
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { type ConvertResult } from "@/types/widget";
import {
  Check,
  Copy,
  Download,
  FileCode2,
  Layers,
  Package,
} from "lucide-react";

interface Props {
  result: ConvertResult | null;
}

type Tab = "entity" | "component" | "registry" | "schema";

export function GeneratedOutput({ result }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("entity");
  const [copied, setCopied] = useState(false);

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-12">
        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
          <FileCode2 className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">Generated files will appear here</p>
        <p className="text-xs text-muted-foreground max-w-xs">
          Paste a C# model on the left and click &ldquo;Convert to Next.js&rdquo; to see the SDK-compatible output.
        </p>
      </div>
    );
  }

  const { schema, generated } = result;

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    {
      id: "entity",
      label: generated.entityFile.filename,
      icon: <FileCode2 className="w-3.5 h-3.5" />,
    },
    {
      id: "component",
      label: generated.componentFile.filename,
      icon: <Layers className="w-3.5 h-3.5" />,
    },
    {
      id: "registry",
      label: "Registry Entry",
      icon: <Package className="w-3.5 h-3.5" />,
    },
    {
      id: "schema",
      label: "schema.json",
      icon: <FileCode2 className="w-3.5 h-3.5" />,
    },
  ];

  const activeContent: Record<Tab, string> = {
    entity: generated.entityFile.content,
    component: generated.componentFile.content,
    registry: generated.registryEntrySnippet,
    schema: JSON.stringify(schema, null, 2),
  };

  async function copyToClipboard() {
    await navigator.clipboard.writeText(activeContent[activeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function downloadAll() {
    const files = [generated.entityFile, generated.componentFile];
    for (const file of files) {
      const blob = new Blob([file.content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.filename;
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 pt-4 pb-0 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-semibold text-sm">{schema.widgetName}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {schema.properties.length} properties · from{" "}
              <code className="bg-muted px-1 rounded">{schema.className}</code>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded-md hover:bg-muted transition-colors"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-green-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              {copied ? "Copied!" : "Copy"}
            </button>
            <button
              onClick={downloadAll}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity"
            >
              <Download className="w-3.5 h-3.5" />
              Download (.entity.ts + .tsx)
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-mono border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Code */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === "registry" && (
          <p className="text-xs text-muted-foreground mb-3">
            Paste the imports at the top of your{" "}
            <code className="bg-muted px-1 rounded">widget-registry.ts</code>,
            then add the entry inside the{" "}
            <code className="bg-muted px-1 rounded">widgets: {"{}"}</code> object.
          </p>
        )}
        <pre className="font-mono text-xs leading-relaxed text-foreground whitespace-pre">
          {activeContent[activeTab]}
        </pre>
      </div>

      {/* Property summary */}
      <div className="px-6 py-4 border-t border-border bg-muted/30">
        <p className="text-xs text-muted-foreground font-medium mb-2">
          Parsed Properties
        </p>
        <div className="flex flex-wrap gap-2">
          {schema.properties.map((p) => (
            <span
              key={p.camelName}
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-background border border-border text-xs"
            >
              <span className="text-muted-foreground font-mono">{p.type}</span>
              <span className="font-medium">{p.camelName}</span>
              {p.renderHint !== "text" && p.renderHint !== "none" && (
                <span className="text-blue-500 opacity-70 font-mono">
                  {p.renderHint}
                </span>
              )}
              {p.section && (
                <span className="text-muted-foreground opacity-60">
                  · {p.section}
                </span>
              )}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

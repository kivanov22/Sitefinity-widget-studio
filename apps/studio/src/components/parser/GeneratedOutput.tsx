"use client";

import { useState } from "react";
import { type ConvertResult } from "@/types/widget";
import {
  Check,
  Copy,
  Download,
  FileCode2,
  FileType,
  Layers,
} from "lucide-react";

interface Props {
  result: ConvertResult | null;
}

type Tab = "component" | "types" | "metadata" | "schema";

export function GeneratedOutput({ result }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("component");
  const [copied, setCopied] = useState(false);

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-12">
        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
          <FileCode2 className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">Generated files will appear here</p>
        <p className="text-xs text-muted-foreground max-w-xs">
          Paste a C# model on the left and click &ldquo;Convert to Next.js&rdquo; to see the TypeScript output.
        </p>
      </div>
    );
  }

  const { schema, generated } = result;

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    {
      id: "component",
      label: generated.componentFile.filename,
      icon: <Layers className="w-3.5 h-3.5" />,
    },
    {
      id: "types",
      label: generated.typesFile.filename,
      icon: <FileType className="w-3.5 h-3.5" />,
    },
    {
      id: "metadata",
      label: generated.metadataFile.filename,
      icon: <FileCode2 className="w-3.5 h-3.5" />,
    },
    {
      id: "schema",
      label: "schema.json",
      icon: <FileCode2 className="w-3.5 h-3.5" />,
    },
  ];

  const activeContent = {
    component: generated.componentFile.content,
    types: generated.typesFile.content,
    metadata: generated.metadataFile.content,
    schema: JSON.stringify(schema, null, 2),
  }[activeTab];

  async function copyToClipboard() {
    await navigator.clipboard.writeText(activeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function downloadAll() {
    const files = [
      generated.componentFile,
      generated.typesFile,
      generated.metadataFile,
    ];
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
              Download all
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
        <pre className="font-mono text-xs leading-relaxed text-foreground whitespace-pre">
          {activeContent}
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

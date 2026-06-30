"use client";

import { useState } from "react";
import type { SavedWidget } from "@/types/widget";
import {
  Code2,
  Download,
  FileCode2,
  MoreVertical,
  Trash2,
} from "lucide-react";
import Link from "next/link";

interface Props {
  widget: SavedWidget;
  onDelete: () => void;
  isDeleting: boolean;
}

const SOURCE_TYPE_LABELS: Record<string, string> = {
  viewmodel: "ViewModel",
  cshtml: "Razor View",
  both: "Full",
};

const SOURCE_TYPE_COLORS: Record<string, string> = {
  viewmodel: "bg-blue-50 text-blue-700 border-blue-200",
  cshtml: "bg-purple-50 text-purple-700 border-purple-200",
  both: "bg-green-50 text-green-700 border-green-200",
};

export function WidgetCard({ widget, onDelete, isDeleting }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const propCount = widget.schema?.properties?.length ?? 0;
  const dateStr = new Date(widget.created_at).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  function downloadAll() {
    const files = [
      widget.generated.componentFile,
      widget.generated.typesFile,
      widget.generated.metadataFile,
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
    <div className="relative group rounded-xl border border-border bg-card hover:shadow-sm transition-shadow overflow-hidden">
      {/* Top accent bar */}
      <div className="h-1 bg-gradient-to-r from-primary/60 to-primary/20" />

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <Code2 className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm truncate">{widget.name}</h3>
              <p className="text-xs text-muted-foreground">{dateStr}</p>
            </div>
          </div>

          {/* Menu */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="p-1.5 rounded-md hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
            >
              <MoreVertical className="w-3.5 h-3.5 text-muted-foreground" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-8 z-10 w-36 bg-background border border-border rounded-lg shadow-lg overflow-hidden">
                <button
                  onClick={() => { downloadAll(); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download files
                </button>
                <button
                  onClick={() => { setConfirmDelete(true); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-destructive hover:bg-destructive/5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Source type badge */}
        <div className="flex items-center gap-2 mb-4">
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
              SOURCE_TYPE_COLORS[widget.source_type] ?? "bg-muted text-muted-foreground"
            }`}
          >
            {SOURCE_TYPE_LABELS[widget.source_type] ?? widget.source_type}
          </span>
          <span className="text-xs text-muted-foreground">
            {propCount} prop{propCount !== 1 ? "s" : ""}
          </span>
          {widget.tags?.length > 0 && (
            <span className="text-xs text-muted-foreground">
              · {widget.tags.slice(0, 2).join(", ")}
            </span>
          )}
        </div>

        {/* Property chips */}
        <div className="flex flex-wrap gap-1.5 mb-4 min-h-[28px]">
          {widget.schema?.properties?.slice(0, 5).map((p) => (
            <span
              key={p.camelName}
              className="px-2 py-0.5 rounded bg-muted text-xs font-mono text-muted-foreground"
            >
              {p.camelName}
            </span>
          ))}
          {propCount > 5 && (
            <span className="px-2 py-0.5 rounded bg-muted text-xs text-muted-foreground">
              +{propCount - 5} more
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-3 border-t border-border">
          <Link
            href={`/convert?restore=${widget.id}`}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs border border-border rounded-lg hover:bg-muted transition-colors"
          >
            <FileCode2 className="w-3.5 h-3.5" />
            View source
          </Link>
          <button
            onClick={downloadAll}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
          >
            <Download className="w-3.5 h-3.5" />
            Download
          </button>
        </div>
      </div>

      {/* Confirm delete overlay */}
      {confirmDelete && (
        <div className="absolute inset-0 bg-background/95 flex flex-col items-center justify-center gap-3 p-6 text-center">
          <p className="text-sm font-medium">Delete &ldquo;{widget.name}&rdquo;?</p>
          <p className="text-xs text-muted-foreground">This cannot be undone.</p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-4 py-2 text-xs border border-border rounded-lg hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => { onDelete(); setConfirmDelete(false); }}
              disabled={isDeleting}
              className="px-4 py-2 text-xs bg-destructive text-destructive-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

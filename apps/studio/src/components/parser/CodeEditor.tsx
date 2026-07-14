"use client";

import { Editor, type OnMount } from "@monaco-editor/react";

export type CodeEditorLanguage = "csharp" | "html" | "typescript" | "json";

interface Props {
  value: string;
  onChange?: (value: string) => void;
  language: CodeEditorLanguage;
  readOnly?: boolean;
  placeholder?: string;
  /** Fixed CSS height (e.g. "12rem"). Defaults to "100%" — parent must have a definite height. */
  height?: string;
}

const handleMount: OnMount = (editor) => {
  editor.updateOptions({ tabSize: 4, insertSpaces: true });
};

/**
 * Thin wrapper around @monaco-editor/react so every input/output pane shares the
 * same look and options. Loads monaco from the default CDN — self-hosting the
 * worker bundle under Turbopack isn't set up, and the studio only runs locally.
 */
export function CodeEditor({
  value,
  onChange,
  language,
  readOnly = false,
  placeholder,
  height = "100%",
}: Props) {
  const showPlaceholder = !readOnly && value.length === 0 && Boolean(placeholder);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg border border-border bg-muted/30">
      {showPlaceholder && (
        <div className="pointer-events-none absolute inset-0 z-10 whitespace-pre-wrap p-3 font-mono text-xs text-muted-foreground/60">
          {placeholder}
        </div>
      )}
      <Editor
        height={height}
        language={language}
        value={value}
        theme="light"
        onChange={(v) => onChange?.(v ?? "")}
        onMount={handleMount}
        loading={
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            Loading editor…
          </div>
        }
        options={{
          readOnly,
          domReadOnly: readOnly,
          minimap: { enabled: false },
          fontSize: 12,
          fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
          scrollBeyondLastLine: false,
          automaticLayout: true,
          wordWrap: "off",
          padding: { top: 12, bottom: 12 },
          lineNumbersMinChars: 3,
          renderLineHighlight: readOnly ? "none" : "line",
          overviewRulerLanes: 0,
          hideCursorInOverviewRuler: true,
          scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
        }}
      />
    </div>
  );
}

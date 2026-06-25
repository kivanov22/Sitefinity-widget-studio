# Architecture — Sitefinity Widget Studio

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser (Studio App)                      │
│                                                              │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐    │
│  │  Converter   │   │   Preview    │   │   Builder    │    │
│  │   /convert   │   │   /preview   │   │   /builder   │    │
│  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘    │
│         │                  │                   │            │
│         └──────────────────┼───────────────────┘            │
│                            │                               │
│                    Zustand Store                           │
│              (widget registry, builder state)             │
└────────────────────────────┬────────────────────────────────┘
                             │ fetch
┌────────────────────────────▼────────────────────────────────┐
│                   Next.js API Routes                         │
│                                                              │
│  POST /api/parse-widget    ← accepts csharpSource string    │
│  POST /api/convert-batch   ← (v0.5) multiple files         │
│  GET  /api/registry        ← (v0.3) list saved widgets     │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│                     Package Layer                            │
│                                                              │
│  parser-csharp  ──→  metadata-engine  ──→  widget-generator │
│                                                              │
│  Input: string (C# source)                                  │
│  Middle: WidgetSchema (typed, normalized)                   │
│  Output: GeneratedWidget (3 file contents as strings)       │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

```
User pastes C# source
        │
        ▼
POST /api/parse-widget
        │
        ▼
parser-csharp.parseWidget(source)
        │
        ▼
WidgetSchema {
  className: "HeroWidgetModel"
  widgetName: "HeroWidget"
  properties: [
    { name: "Title", camelName: "title", type: "string", section: "Content" }
    ...
  ]
}
        │
        ▼
widget-generator.generateWidget(schema)
        │
        ▼
GeneratedWidget {
  typesFile:    { filename: "HeroWidget.types.ts",    content: "..." }
  metadataFile: { filename: "HeroWidget.metadata.ts", content: "..." }
  componentFile:{ filename: "HeroWidget.tsx",         content: "..." }
}
        │
        ▼
API returns ConvertResult { schema, generated }
        │
        ▼
UI renders tabs with generated file content
User downloads files
```

## Package Responsibilities

### `parser-csharp`
- **Input:** Raw C# source string
- **Output:** `WidgetSchema`
- **v0.1:** Regex-based line scanner
- **v0.2:** ts-morph for reliable TypeScript-side generation; Roslyn WASM for full C# AST
- **Does NOT:** generate any files, call APIs, touch the DOM

### `metadata-engine`
- **Input:** `WidgetSchema`
- **Output:** `WidgetMetadataJSON` (Sitefinity designer-compatible)
- Validates against a JSON Schema
- Will produce `widget.manifest.json` in v1.0

### `widget-generator`
- **Input:** `WidgetSchema`
- **Output:** `GeneratedWidget` (3 file contents as strings)
- Smart render body: detects title/subtitle/button patterns
- Uses ts-morph to write type-safe TypeScript AST (v0.2+)

### `preview-engine`
- Wraps Sandpack to render a generated widget in an iframe
- Accepts `GeneratedWidget` + current prop values
- Exposes a `<WidgetPreview />` React component

### `widget-registry`
- Persists `ConvertResult` objects
- v0.1–v0.2: localStorage
- v0.3+: Postgres via Prisma

### `visual-builder`
- Drag and drop canvas (dnd-kit)
- Reads widgets from `widget-registry`
- Writes layout JSON compatible with Sitefinity's Next.js renderer

## Key Design Decisions

### Why regex parser first, not Roslyn?

Roslyn requires a .NET runtime. To ship a pure browser+Node product without a .NET sidecar in v0.1, we start with a TypeScript regex parser. This covers ~95% of real-world Sitefinity widget models because they follow a consistent convention. We upgrade to Roslyn in v0.2 via either:
1. A small ASP.NET minimal API sidecar (Docker)
2. Roslyn compiled to WASM

### Why monorepo?

Each package has independent versioning and can be published to npm separately. `parser-csharp` could be used as a standalone CLI tool. `widget-registry` will be extracted into a SaaS backend. The separation keeps the code testable and the concerns clean.

### Why Next.js App Router?

Sitefinity's Next.js Renderer already uses Next.js. The Studio should generate widgets that work seamlessly in that environment. Using the same framework reduces context switching for developers.

### Why Zustand over Redux?

The builder state (canvas, selected widget, layout JSON) is complex but local. Zustand's minimal API keeps it readable. TanStack Query handles server state separately.

## Sitefinity Next.js Renderer Compatibility

Generated widgets follow the Sitefinity Next.js Renderer convention:

```tsx
// Widget component receives flat props (not a model object)
export default function HeroWidget(props: HeroWidgetProps) { ... }
```

Metadata follows the `IWidgetModel` interface pattern:

```ts
export const heroWidgetMetadata = {
  title: { type: "string", displayName: "Title", section: "Content" }
}
```

This maps to Sitefinity's `SdkItem` designer registration in the full Renderer SDK.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands run from `apps/studio/`:

```bash
npm run dev          # Start dev server (Next.js 15 + Turbopack) at localhost:3000
npm run build        # Production build
npm run lint         # ESLint
npm run type-check   # tsc --noEmit (no build output)
```

There is no test suite yet (v0.1). The monorepo has no root-level scripts — operate from `apps/studio/`.

## Goal

Convert Sitefinity .NET Core Renderer C# widget models into TypeScript/TSX files compatible with the Sitefinity Next.js Renderer. The system must understand widget architectures across three generations:

1. Legacy Sitefinity MVC (controllers + Razor views + designers)
2. Sitefinity ASP.NET Core Renderer (ViewComponents + Entities + attributes)
3. Sitefinity Next.js Renderer (React + TypeScript + widget registry)

Reference implementations for all three live in `references/` (gitignored). Always inspect them before generating conversion output.

## Architecture

This is a **Next.js 15 App Router** application (React 19). The `@/` path alias resolves to `apps/studio/src/`. The root layout wraps children in `QueryProvider` (TanStack Query v5) — all API calls in client components use `useMutation`.

### Conversion pipeline

The core flow is synchronous and runs inside the API route:

```
C# source string
  → parseWidget()     (src/lib/parser-csharp.ts)
  → WidgetSchema
  → generateWidget()  (src/lib/widget-generator.ts)
  → GeneratedWidget (3 file contents as strings)
```

`POST /api/parse-widget` (`src/app/api/parse-widget/route.ts`) calls these two functions and returns `ConvertResult`. All shared types live in `src/types/widget.ts` — `WidgetSchema`, `GeneratedWidget`, `ConvertResult`, etc.

### Parser (`src/lib/parser-csharp.ts`)

Regex-based line scanner (v0.1). Key behaviours:
- Derives widget name from class name: `HeroWidgetModel` → `HeroWidget` (strips `Model` / `ViewModel` suffix)
- Collects attribute decorators grouped above each `public <Type> <Name> { get; set; }` property
- Supported C# attributes: `[DisplayName]`, `[Description]`, `[ContentSection]`, `[DefaultValue]`
- Supported C# types → `PropertyType`: `string`, `int/long/float/double/decimal` → `number`, `bool` → `boolean`, `List<string>/IEnumerable<string>/string[]`, `List<int>/IEnumerable<int>/int[]`; everything else → `unknown`
- Nullable marker (`?`) is stripped for type mapping but sets `isNullable: true` on the property
- Attribute buffer resets on any non-attribute, non-blank, non-comment line — attributes must be immediately above their property

Known parser limits (v0.1): enum types, nested model references, multi-line attribute arguments, and `init`-only properties are not supported. Roslyn/AST upgrade planned for v0.2.

### Generator (`src/lib/widget-generator.ts`)

Produces three files from a `WidgetSchema`:
- `*.types.ts` — TypeScript props interface; nullable C# types become `T | null` optional props
- `*.metadata.ts` — metadata object typed as `Record<keyof Props, MetaProperty>`; camelCase variable name (`heroWidgetMetadata`)
- `*.tsx` — React scaffold with a heuristic render body that recognises name patterns (`title/heading/headline`, `subtitle/description/body/text/content`, `buttonText/ctaText`, `buttonUrl/ctaUrl/href`, `showButton/showCta`) and renders them with semantic HTML; remaining props fall back to generic `<p>` or boolean spans

Generated widgets must follow Sitefinity Next.js Renderer conventions:
- Component receives flat props (not a model object): `export default function HeroWidget(props: HeroWidgetProps)`
- Metadata keys match `keyof Props` exactly
- Component file has default export only — no named exports

> **v0.1 vs planned output**: Future versions will also generate `mapper.ts` and `widget.config.ts`. Do not add these until the generator is upgraded to v0.2+.

### UI structure

- `/` — landing page with feature grid and roadmap summary (`src/app/page.tsx`)
- `/convert` — split-pane: `ConverterPanel` (left, C# textarea + TanStack Query mutation) | `GeneratedOutput` (right, tabs: `component` | `types` | `metadata` | `schema`)
- `/preview` — placeholder (v0.3, Sandpack-powered)

`ConverterPanel` holds the `source` string in local state and calls the mutation on submit. It passes `onResult` up to the page which owns the `ConvertResult` state and passes it down to `GeneratedOutput`. There is no global state yet — Zustand is installed for the upcoming builder in v0.4.

### Samples (`src/lib/samples.ts`)

Three named exports exist: `HERO_WIDGET_SAMPLE`, `FAQ_WIDGET_SAMPLE`, `CARD_GRID_WIDGET_SAMPLE`. Only `HERO_WIDGET_SAMPLE` is currently wired into the UI. To expose others, add entries to the array at `ConverterPanel.tsx:73–76`.

### Monorepo layout

```
apps/studio/        ← the only implemented app
packages/           ← empty scaffolds (no source yet)
  parser-csharp/    ← planned standalone npm package
  metadata-engine/
  widget-generator/
  preview-engine/
  widget-registry/
  visual-builder/
  ui/
  shared/
docs/               ← ARCHITECTURE.md, ROADMAP.md, DAILY_PLAN.md
references/         ← local-only reference projects (gitignored)
examples/           ← local-only examples (gitignored)
```

All parser and generator logic lives in `apps/studio/src/lib/` until extracted into packages.

### Styling

Tailwind CSS 3 with shadcn/ui conventions. CSS variables: `--background`, `--foreground`, `--primary`, `--muted`, `--border`, `--ring`. Use `cn()` (clsx + tailwind-merge) for conditional class merging. No Radix component wrappers are used yet — raw HTML elements styled with Tailwind.

## Conversion rules

### MVC → Next.js

| MVC | Next.js |
|-----|---------|
| Controller + action | Server function / fetcher / hook |
| Model | TypeScript interface |
| Razor view | JSX component |
| Designer | Widget config schema |

### Renderer → Next.js

| Renderer | Next.js |
|----------|---------|
| ViewComponent | React component |
| Entity | TypeScript interface |
| Razor view | JSX component |
| C# attributes | Metadata config object |

Preserve widget naming, property semantics, content binding logic, and rendering behaviour across conversions. When uncertain, search the reference implementations first before generating.

## Version roadmap (context for upcoming work)

| Version | Focus |
|---------|-------|
| v0.1 | Parser + Generator (current) |
| v0.2 | Metadata Engine — enum support, `[Category]`/`[ReadOnly]`/`[Browsable]`, Monaco Editor, Roslyn AST |
| v0.3 | Preview Studio — Sandpack iframe, prop editor form, widget registry |
| v0.4 | Visual Builder — drag-and-drop canvas, `@dnd-kit`, layout JSON export |
| v0.5 | AI-assisted conversion for complex widgets |
| v1.0 | Marketplace — publish/install widgets, subscription tiers |


# Sitefinity Widget Studio

## Goal

This project converts Sitefinity widgets into Next.js widgets.

The system must understand and map widget architectures across:

1. Legacy Sitefinity MVC
2. Sitefinity ASP.NET Core Renderer
3. Sitefinity Next.js Renderer

---

## Reference projects

### references/mvc-reference

Purpose:
Learn legacy Sitefinity MVC widget architecture.

Study:

- Controllers
- Models
- Views
- Designers
- Widget registration
- Content binding
- Custom properties
- Partial views

Patterns:

- Controllers inherit from Controller
- Actions return View()
- Models define widget configuration
- Razor views render output
- Designers configure widget settings

---

### references/renderer-reference

Purpose:
Learn Sitefinity ASP.NET Core Renderer widget architecture.

Study:

- ViewComponents
- Entities
- Views
- Widget attributes
- Content resolvers
- REST integrations

Patterns:

- ViewComponents replace Controllers
- Entities replace MVC Models
- Widget metadata via attributes
- Strongly typed Razor views

---

### references/nextjs-reference

Purpose:
Learn modern Sitefinity Next.js architecture.

Study:

- React widgets
- TypeScript models
- Widget registry
- Sitefinity SDK integration
- API data fetching
- SSR / ISR patterns

Patterns:

- React components replace Razor views
- TypeScript replaces C# models
- Widget registry maps components
- API-driven rendering

---

## Conversion rules

### MVC → Next.js

Controller:
- Remove controller logic
- Convert data logic into fetchers/hooks/server functions

Model:
- Convert into TypeScript interfaces

View:
- Convert Razor syntax into JSX

Designer:
- Convert settings into widget config schema

---

### Renderer → Next.js

ViewComponent:
- Convert into React component

Entity:
- Convert into TypeScript interfaces

View:
- Convert Razor into JSX

Attributes:
- Convert into metadata config

---

## Required output

Each generated widget must include:

- component.tsx
- types.ts
- mapper.ts
- widget.config.ts

Optional:

- server.ts
- queries.ts
- helpers.ts

---

## Rules

Always inspect reference implementations before generating.

Prefer matching existing architecture patterns.

Preserve:
- widget naming
- property semantics
- content binding logic
- rendering behavior

When uncertain:
search references first before generating.
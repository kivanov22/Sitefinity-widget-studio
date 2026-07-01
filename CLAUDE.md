# Sitefinity Widget Studio — Claude Context

This file is read automatically by Claude Code on every session.
It is the single source of truth — chat conversations do not transfer
between sessions or projects, only this file (and the actual code) does.

**Before doing anything, confirm:** run `pwd` and `git log --oneline -5`
and state the result, so we are certain we are working in the correct
project folder on the correct branch.

---

## Project goal

A Next.js 15 developer platform that migrates Sitefinity widgets to Next.js.
Two migration paths are in scope:

1. **Sitefinity .NET Core Renderer** → Next.js (Days 1-3, complete)
2. **Sitefinity Legacy MVC** → Next.js (Day 3, complete)

After both migration engines work we build:
3. Visual Widget Builder (drag & drop canvas)
4. Widget Marketplace (publish, discover, install)

---

## Commands

All commands run from `apps/studio/`:

```bash
npm install          # Install dependencies (run once after cloning)
npm run dev          # Start dev server at localhost:3000 (Next.js 15 + Turbopack)
npm run build        # Production build
npm run lint         # ESLint
npm run type-check   # tsc --noEmit
```

No test suite yet. Monorepo has no root-level scripts — always operate from `apps/studio/`.

---

## Current version: v0.3.0 (Day 3 complete — Part A + Part B)

### CRITICAL CONTEXT — the output format changed on Day 3 Part A

The original v0.1-0.2 generator (`widget-generator.ts`) produced flat-interface
output: `props.title`, a `.types.ts` interface file, a `.metadata.ts` object file.

**This was WRONG** and has been replaced. The real Sitefinity Next.js SDK
(confirmed by reading actual reference projects, not assumed) uses:
- A decorator-based Entity class (`@WidgetEntity`, `@DisplayName`, etc.)
- Props accessed as `props.model.Properties.X`, never flat `props.x`
- `htmlAttributes(props)` spread on the root element — required for the
  Sitefinity page editor to function, non-negotiable in every component

`widget-generator.ts` is DEPRECATED and fully orphaned — confirmed by grep,
nothing calls it. Safe to delete in a future cleanup pass. The active generators are:
- `src/lib/generator-nextjs-entity.ts`
- `src/lib/generator-nextjs-component.ts`
- `src/lib/generator-widget-registry-entry.ts`

---

## What is built and working

| File | Purpose |
|------|---------|
| `src/lib/parser-csharp.ts` | Parses Sitefinity .NET Core Renderer ViewModel `.cs` files. Regex-based. Extracts properties, types, `[DisplayName]`, `[Description]`, `[ContentSection]`, `[DefaultValue]`. Infers `renderHint` per property from name patterns. |
| `src/lib/parser-razor.ts` | Parses Sitefinity `.cshtml` Razor views. Extracts `@model`, all `Model.X` usages, nested object shapes (Image/Video), `Html.Raw` → `renderHint: "html"`, `Html.PartialAsync` dependencies, `data-aos` detection. |
| `src/lib/parser-mvc-controller.ts` | **(Day 3 Part B)** Parses MVC Controller `.cs`. Finds `[ControllerToolboxItem(Name, Title, SectionName)]`. Finds `[TypeConverter(typeof(ExpandableObjectConverter))]` property → extracts nested Model class name. **Fallback:** if no `[TypeConverter]`, parses controller's own properties directly (SimpleContentBlock pattern). Stores original toolbox `Name` as `widgetKey` — see critical note below. |
| `src/lib/parser-mvc-model.ts` | **(Day 3 Part B)** Parses the Model class (nested or controller-direct). Collapses `Guid XId` + `string XProviderName` pairs → ONE image property. Collapses `SelectedItemId` + `ItemType` pairs → content-reference property. Detects `[DynamicLinksContainer]` → `renderHint: "html"`. Detects plain vs `[Flags]` enum. Detects JSON-array strings → `string[]`. Handles all three C# property syntax forms including multi-line brace-on-own-line (Form C) — see bug note below. |
| `src/lib/generator-nextjs-entity.ts` | **(Day 3 Part A)** `WidgetSchema` → TypeScript class with `@WidgetEntity`, `@DisplayName`, `@Description`, `@ContentSection`, `@DefaultValue`, `@Content`/`@DataType` decorators. `renderHint === "image"` → `MixedContentContext \| null` + `@Content({Type: KnownContentTypes.Images})` — always, regardless of original source type. |
| `src/lib/generator-nextjs-component.ts` | **(Day 3 Part A)** `WidgetSchema` → function component. Always includes `const dataAttributes = htmlAttributes(props)` spread on root. Props accessed as `props.model.Properties.X`. `renderHint === "html"` → `dangerouslySetInnerHTML`. `renderHint === "image"` → TODO comment (needs real async REST fetch). Handles `renderHint === "choice"` and `type === "string[]"` cases. |
| `src/lib/generator-widget-registry-entry.ts` | **(Day 3 Part A+B)** Registry snippet. Uses `schema.widgetKey ?? widgetName` as the dictionary key — original toolbox name takes priority over sanitized identifier. See critical note below. |
| `src/lib/widget-generator.ts` | **DEPRECATED — do not use or extend.** Confirmed orphaned (no callers). Remove in future cleanup. |
| `src/lib/supabase.ts` | Supabase client. `saveWidget`, `listWidgets`, `getWidget`, `deleteWidget`. Returns null gracefully if env vars not set. |
| `src/lib/samples.ts` | Renderer, Razor, and MVC sample source strings for converter UI. MVC samples: `MVC_AUTHOR_WIDGET_SAMPLE`, `MVC_CUSTOM_IMAGE_WIDGET_SAMPLE`, `MVC_SIMPLE_CONTENT_BLOCK_SAMPLE`, `MVC_LIST_WIDGET_SAMPLE`. |
| `src/types/widget.ts` | All shared types. `WidgetSchema` now has `widgetKey?: string` (MVC original toolbox name) and `mvcMetadata?: MvcMetadata`. `SourceType` includes `"mvc"`. `GeneratedWidget` has `entityFile`, `componentFile`, `registryEntrySnippet` (primary v0.3) and `@deprecated` `typesFile`, `metadataFile` (v0.2, kept for backward compat). |
| `src/app/api/parse-widget/route.ts` | POST endpoint. Routes `sourceType === "viewmodel"` → `parseWidget()`, `"cshtml"` → `parseRazorView()`, `"mvc"` → `parseMvcController()`. Calls `generateEntityFile`, `generateNextjsComponent`, `generateRegistryEntry` directly (not the deprecated `generateWidget`). |
| `src/app/api/widgets/route.ts` | GET (list all) + POST (save) widgets via Supabase. |
| `src/app/api/widgets/[id]/route.ts` | GET (single) + DELETE widget by id. |
| `src/app/convert/page.tsx` | Split-pane converter. Left: `ConverterPanel`. Right: `GeneratedOutput`. |
| `src/app/marketplace/page.tsx` | Grid of saved widgets. Download / delete. Shows setup instructions if Supabase not configured. |
| `src/components/parser/ConverterPanel.tsx` | Three-tab input: "ViewModel (.cs)" \| "Razor View (.cshtml)" \| "MVC Widget". Convert + Save to Marketplace buttons. |
| `src/components/parser/GeneratedOutput.tsx` | Tabs: Entity (`.entity.ts`) \| Component (`.tsx`) \| Registry Entry \| Schema. |
| `src/components/marketplace/` | `MarketplaceHeader`, `MarketplaceGrid`, `WidgetCard` components. |

---

## CRITICAL — widgetKey vs widgetName (do not regress this)

`WidgetSchema` carries both:
- `widgetName` — sanitized valid TS/JS identifier (e.g. `CustomImageMVC`), used for class names
- `widgetKey` (optional, MVC-only) — the **original** Sitefinity toolbox `Name` from
  `[ControllerToolboxItem(Name = "...")]` (e.g. `CustomImage_MVC`)

`generator-widget-registry-entry.ts` uses `schema.widgetKey ?? widgetName` as the
**registry dictionary key**, falling back to `widgetName` for Renderer/ViewModel sources.

**Why this matters:** the registry key must match what's already stored on any existing
live Sitefinity pages using the widget. Using the sanitized identifier as the key
instead of the original toolbox name would silently break every existing page placement
of that widget after migration — the widget would convert successfully but never render.
**Do not collapse `widgetKey` and `widgetName` back into one field in any future refactor.**

---

## CRITICAL — Image handling rule

Any property with `renderHint === "image"` is ALWAYS generated as `MixedContentContext | null`
with `@Content({Type: KnownContentTypes.Images})`, regardless of what the original
source type was (C# `string` URL, MVC `Guid + ProviderName` pair, etc.).

Property names ending in `Url` get that suffix stripped when `renderHint === "image"`
(e.g. `BackgroundImageUrl` → `BackgroundImage`) since it's a content reference, not a URL.

The component generator does NOT fake-render these — it emits an honest TODO comment
pointing at the `sitefinity-data` reference sample for the real async REST fetch pattern.

---

## CRITICAL — Form C multi-line property syntax (regression guard)

The MVC parser handles three C# property declaration forms:
- Form A: `public string Title { get; set; }` (single line)
- Form B: attributes on preceding lines, then Form A
- Form C: brace on its own line with explicit get/set bodies

Form C previously had a brace-depth-counting bug that silently dropped every property
after the first Form C property in a class (depth counter started at 1 instead of 0,
so the closing brace never returned to 0, consuming the rest of the file).

**Fixed.** Regression guard: `MVC_LIST_WIDGET_SAMPLE` uses Form C exclusively for all
three of its properties (`ListTitle`, `ListType`, `ListItems`). If this bug ever
regresses, converting that sample will show only `ListTitle` in the output instead of
all three — that sample IS the regression test until a real test suite exists.

---

## Architecture

```
Browser
  └── /convert page
        ├── ConverterPanel (left) — three source type tabs
        │     └── POST /api/parse-widget { sourceType, csharpSource | razorSource | mvcSource }
        │               ├── "viewmodel" → parseWidget()        [parser-csharp.ts]
        │               ├── "cshtml"    → parseRazorView()     [parser-razor.ts]
        │               └── "mvc"       → parseMvcController() [parser-mvc-controller.ts]
        │                                   → parseMvcModel()  [parser-mvc-model.ts]
        │     → WidgetSchema (same shape from all three parsers)
        │     → generateEntityFile()     [generator-nextjs-entity.ts]
        │     → generateNextjsComponent()[generator-nextjs-component.ts]
        │     → generateRegistryEntry()  [generator-widget-registry-entry.ts]
        └── GeneratedOutput (right) — Entity | Component | Registry | Schema tabs

  └── /marketplace page
        └── GET /api/widgets → Supabase → SavedWidget[]
```

Path alias `@/` → `apps/studio/src/`
Root layout wraps in `QueryProvider` (TanStack Query v5).
All API calls in client components use `useMutation` or `useQuery`.

---

## REFERENCES FOLDER — always read before generating

```
references/
├── Renderer-sitefinity/
│   └── SitefinityMain/SitefinityRenderer/    ← Real .NET Core Renderer project
│
├── Mvc-project-sitefinity/
│   ├── mvc-samples-master/                   ← TRUE legacy MVC (System.Web.Mvc, SF 13.1, .NET 4.7.2)
│   │   ├── AuthorWidget/       ← [TypeConverter] nested-Model + Guid image pair + [DynamicLinksContainer]
│   │   ├── CustomImageWidget/  ← Guid+ProviderName image pair; toolbox Name ≠ clean identifier
│   │   ├── ListWidget/         ← enum + [Flags] enum + JSON-array string + Form C properties (regression sample)
│   │   ├── SimpleContentBlock/ ← fallback pattern, no nested Model
│   │   └── SingleDynamicContent/ ← DynamicContent ORM pattern
│   └── sitefinity-aspnetcore-mvc-samples-master/
│       ⚠️ MISLABELED — NOT legacy MVC. It's a Renderer-pattern project (SF 15.4, ViewComponents).
│       └── src/all-properties/Entities/AllProperties/AllPropertiesEntity.cs
│           ← THE definitive reference for every Renderer C# attribute
│
└── Nextjs-projects-sitefinity/
    ├── nextjs-corianderLaneDemo-main/  ← production site, older SDK beta — useful but NOT canonical target
    └── nextjs-samples/                 ← OFFICIAL SDK samples, LATEST SDK (15.4.8631)
        ⚠️ THIS IS THE CANONICAL TARGET — always generate to match this
        ├── src/hello-world/src/app/widgets/hello-world.entity.ts   ← entity pattern
        ├── src/hello-world/src/app/widgets/hello-world.tsx         ← component pattern
        ├── src/hello-world/src/app/widget-registry.ts              ← registry format
        └── src/all-properties/src/app/widgets/all-properties.entity.ts ← every decorator
```

**Always read the relevant reference files before generating or modifying generator code.**

---

## Key reference file paths

| Purpose | Path |
|---------|------|
| Every Renderer C# attribute | `references/Mvc-project-sitefinity/sitefinity-aspnetcore-mvc-samples-master/src/all-properties/Entities/AllProperties/AllPropertiesEntity.cs` |
| Every Next.js decorator | `references/Nextjs-projects-sitefinity/nextjs-samples/src/all-properties/src/app/widgets/all-properties.entity.ts` |
| Canonical Next.js widget pattern | `references/Nextjs-projects-sitefinity/nextjs-samples/src/hello-world/src/app/widgets/` |
| Widget registry format | `references/Nextjs-projects-sitefinity/nextjs-samples/src/hello-world/src/app/widget-registry.ts` |
| Async data-fetching pattern | `references/Nextjs-projects-sitefinity/nextjs-samples/src/sitefinity-data/src/app/widgets/` |
| MVC — TypeConverter + image pair | `references/Mvc-project-sitefinity/mvc-samples-master/AuthorWidget/AuthorWidget/MVC/Controllers/AuthorController.cs` |
| MVC — image Guid pair + mismatched toolbox name | `references/Mvc-project-sitefinity/mvc-samples-master/CustomImageWidget/CustomImageWidget/Mvc/Controllers/CustomImageController.cs` |
| MVC — no nested Model (fallback) | `references/Mvc-project-sitefinity/mvc-samples-master/SimpleContentBlock/` |
| MVC — DynamicContent pattern | `references/Mvc-project-sitefinity/mvc-samples-master/SingleDynamicContent/SingleDynamicContent/Mvc/Models/SingleDynamicContentModel.cs` |
| MVC — enum + Form C + JSON-array (regression) | `references/Mvc-project-sitefinity/mvc-samples-master/ListWidget/` |
| Renderer ViewComponent + Entity | `references/Mvc-project-sitefinity/sitefinity-aspnetcore-mvc-samples-master/src/hello-world/ViewComponents/HelloWorldViewComponent.cs` |

---

## Confirmed type mapping (from actual reference analysis — do not guess)

| Legacy MVC | Renderer (.NET Core) | Next.js | Notes |
|------------|---------------------|---------|-------|
| `string` | `string?` | `string \| null` | All strings nullable in TS |
| `Guid ImageId` + `string ImageProviderName` (pair) | `MixedContentContext` + `[Content(Type=Images)]` | `MixedContentContext \| null` + `@Content(...)` | Always a pair — collapse to ONE property |
| `string SelectedItemId` + `string ItemType` (pair) | `MixedContentContext` | `MixedContentContext \| null` | Content reference pair |
| `DynamicContent` (ORM) | `MixedContentContext` → `IRestClient.GetItems<T>()` | `SdkItem[]` or typed interface | ORM → REST |
| `[TypeConverter(ExpandableObjectConverter)] TModel Model` on Controller | Separate Entity class | Entity class with decorators | This IS the MVC designer — parse `TModel`, not the controller |
| `IList<string>` as JSON string | `IList<string>` | `string[] \| null` + `@DataType(ComplexType.Enumerable, 'string')` | Detect by JSON-array-looking default value |
| plain `enum` | `enum` + `[DataType(RadioChoice)]` | TS `enum` + `@Choice(...)` + `@DataType(RadioChoice)` | Single-select |
| `[Flags] enum` | `enum` + `[DataType(ChipChoice)]` | TS `enum` + `@Choice(...)` + `@DataType(ChipChoice)` | Multi-select |
| `[DynamicLinksContainer] string` | `[DataType(Html)] [ContentContainer]` | `@DataType(Html) @ContentContainer()` | Rich text |
| `bool` | `bool?` | `boolean \| null` | |
| `int` | `int?` | `number \| null` | |
| `[ControllerToolboxItem(Name, Title, SectionName)]` | `[SitefinityWidget(Title)]` | `@WidgetEntity('Key', 'Title')` + registry entry | |

No `[DataMember]`, `Lstring`, or `RelatedData` exist in `mvc-samples-master`.
Those were placeholder guesses — do not implement them unless found in a real customer project.

---

## Parser behaviour — what is and isn't supported

### parser-csharp.ts (Renderer ViewModels)
Supported: `string/bool/int/float/double/decimal/List<T>` props, `[DisplayName]` `[Description]` `[ContentSection]` `[DefaultValue]`, nullable types, nested object detection, `renderHint` inference.
Not supported: enum types (→ `unknown`), `[Flags]` detection, inheritance, multi-line attribute args, `init`-only properties.

### parser-razor.ts (Renderer .cshtml views)
Supported: `@model`, `Model.X`/`Model.X?.Y`, `Html.Raw` → `"html"`, `PartialAsync`, `data-aos`, conditional props → `isNullable`.
Not supported: MVC Razor syntax (`@Html.ActionLink`, `@Html.EditorFor`, `@Url.Action`) — deferred, may not be needed since MVC designer metadata lives on controller/model, not the view.

### parser-mvc-controller.ts + parser-mvc-model.ts
Supported: `[ControllerToolboxItem]`, `[TypeConverter(ExpandableObjectConverter)]` nested Model unwrap, fallback to controller-direct props, Guid+ProviderName image pair collapsing, `[DynamicLinksContainer]`, plain + `[Flags]` enum, JSON-array string, all three C# property syntax forms (A/B/C).
Not yet verified: `SelectedItemId` + `ItemType` pair collapsing (logic is in parser but not tested against `SingleDynamicContent` explicitly), `DynamicContent` direct type detection.

---

## MVC sample coverage (regression guide)

| Sample | Pattern covered | Regression catches |
|--------|----------------|-------------------|
| `MVC_AUTHOR_WIDGET_SAMPLE` | `[TypeConverter]` nested Model + Guid image pair + `[DynamicLinksContainer]` html | Image pair collapsing, html renderHint |
| `MVC_CUSTOM_IMAGE_WIDGET_SAMPLE` | Guid+ProviderName only; toolbox Name ≠ clean identifier | `widgetKey` vs `widgetName` fix |
| `MVC_SIMPLE_CONTENT_BLOCK_SAMPLE` | No `[TypeConverter]`, props on controller directly | Fallback parse path |
| `MVC_LIST_WIDGET_SAMPLE` | Enum, `[Flags]` enum, JSON-array string, **Form C properties** | Form C depth-counter bug regression |

---

## Git workflow

```
main                          ← stable, tagged on version bumps
feature/dayN-description      ← one branch per day/feature
```

```bash
# Start a new day
git checkout main
git checkout -b feature/day4-description

# Commit during work
git add -A
git commit -m "feat: description"

# End of day — merge + tag
git checkout main
git merge --no-ff feature/day4-description -m "merge: Day 4"
git tag v0.4.0
```

Commit prefixes: `feat:` `fix:` `refactor:` `chore:` `docs:`
Version bumps: patch = bug fix, minor = feature complete, major = v1.0 Marketplace launch.

---

## What to build next (Day 4)

**Branch:** `feature/day4-monaco-preview`

Priority order:
1. Replace the `<textarea>` inputs in `ConverterPanel.tsx` with Monaco Editor
   (`@monaco-editor/react` — already installed, not yet wired up).
   C# tab → C# language mode. Razor tab → HTML language mode. MVC tab → C# language mode.
   Output panes in `GeneratedOutput.tsx` → TypeScript read-only mode.
2. Widget history in `localStorage` — save each successful conversion, show a
   history sidebar in the converter so you can reload a previous conversion
   without re-pasting the source.
3. Begin Renderer preview (if time): a simple prop-editing panel driven by
   the parsed `WidgetSchema` — one input per property, output updates live.
   `react-hook-form` + `zod` are already installed.

---

## Supabase setup (required for Marketplace)

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```
Run `docs/supabase-schema.sql` in Supabase SQL Editor.
Run `npm install @supabase/supabase-js` in `apps/studio/`.

---

## Packages (future — not yet implemented)

Keep all code in `apps/studio/src/lib/` until features are stable.
```
packages/parser-csharp/     packages/widget-generator/   packages/preview-engine/
packages/metadata-engine/   packages/widget-registry/    packages/visual-builder/
```

---

## Already-installed packages not yet wired up

| Package | Planned use |
|---------|-------------|
| `@monaco-editor/react` + `monaco-editor` | **Day 4** — replace textarea |
| `ts-morph` | AST-based parser upgrade (replaces regex) |
| `@codesandbox/sandpack-react` | Preview Studio iframe |
| `@dnd-kit/core` + sortable + utilities | Visual Builder canvas |
| `react-hook-form` + `@hookform/resolvers` + `zod` | Prop editor forms |
| `zustand` | Global builder state |

---

## Styling conventions

Tailwind CSS 3 + shadcn/ui conventions.
CSS vars: `--background`, `--foreground`, `--primary`, `--muted`, `--border`, `--ring`.
Use `cn(clsx, tailwind-merge)` for conditional classes.
Radix UI primitives installed but not yet wired — use raw HTML + Tailwind for now.

---

## Full version roadmap

| Version | Status | Focus |
|---------|--------|-------|
| v0.1 | ✅ | Renderer parser + generator + converter UI |
| v0.2 | ✅ | Razor parser + render hints + Supabase + Marketplace |
| v0.3 | ✅ | Generator retargeted to real SDK pattern + MVC migration engine |
| v0.4 | 🔨 next | Monaco editor + widget history + Renderer prop preview |
| v0.5 | | Metadata engine — enum support, `[Flags]`, inheritance in Renderer parser |
| v0.6 | | Preview Studio (Sandpack iframe + prop editor forms) |
| v0.7 | | Visual Builder (dnd-kit canvas) |
| v0.8 | | AI-assisted conversion |
| v1.0 | | Marketplace — publish, install, licensing |

### .NET project (planned, not yet started)
ASP.NET minimal API sidecar (`apps/roslyn-sidecar/`) for:
- Roslyn parser (100% accurate C# AST)
- Reflection-based widget validator (compares generated TS against compiled .dll)
- Sitefinity integration bridge (reads all registered widgets from live SF instance)

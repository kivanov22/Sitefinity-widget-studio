# Sitefinity Widget Studio — Claude Context

This file is read automatically by Claude Code on every session.
It is the single source of truth — chat conversations do not transfer
between sessions or projects, only this file (and the actual code) does.

**Before doing anything, confirm:** run `pwd` and `git remote -v` (or
`git log --oneline -5` if no remote) and state the result, so we are
certain we are working in the correct project folder.

---

## Project goal

A Next.js 15 developer platform that migrates Sitefinity widgets to Next.js.
Two migration paths are in scope:

1. **Sitefinity .NET Core Renderer** → Next.js (Day 1-2, generator retargeted Day 3 Part A)
2. **Sitefinity Legacy MVC** → Next.js (Day 3 Part B — next up)

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

## Current version: v0.3.0-dev (Day 3 Part A complete, Part B not started)

### CRITICAL CONTEXT — the output format changed on Day 3

The original v0.1-0.2 generator (`widget-generator.ts`) produced flat-interface
output: `props.title`, a `.types.ts` interface file, a `.metadata.ts` object file.

**This was WRONG** and has been replaced. The real Sitefinity Next.js SDK
(confirmed by reading actual reference projects, not assumed) uses:
- A decorator-based Entity class (`@WidgetEntity`, `@DisplayName`, etc.)
- Props accessed as `props.model.Properties.X`, never flat `props.x`
- `htmlAttributes(props)` spread on the root element — required for the
  Sitefinity page editor to function, non-negotiable in every component

`widget-generator.ts` is DEPRECATED. Do not extend it. The active generators are:
- `src/lib/generator-nextjs-entity.ts`
- `src/lib/generator-nextjs-component.ts`
- `src/lib/generator-widget-registry-entry.ts`

### What is built and working

| File | Purpose |
|------|---------|
| `src/lib/parser-csharp.ts` | Parses Sitefinity .NET Core Renderer ViewModel `.cs` files. Regex-based. Extracts properties, types, attributes (`[DisplayName]`, `[Description]`, `[ContentSection]`, `[DefaultValue]`). Infers `renderHint` per property from name patterns. |
| `src/lib/parser-razor.ts` | Parses Sitefinity `.cshtml` Razor views. Extracts `@model`, all `Model.X` usages, nested object shapes (Image/Video), `Html.Raw` props → `renderHint: "html"`, `Html.PartialAsync` dependencies, `data-aos` detection. |
| `src/lib/generator-nextjs-entity.ts` | **(Day 3 Part A)** Takes `WidgetSchema` → outputs a TypeScript class string matching `references/Nextjs-projects-sitefinity/nextjs-samples/.../hello-world.entity.ts`. Decorators: `@WidgetEntity`, `@DisplayName`, `@Description`, `@ContentSection`, `@DefaultValue`, `@Content`/`@DataType` where applicable. Properties where `renderHint === "image"` emit `MixedContentContext \| null` with `@Content({Type: KnownContentTypes.Images})` instead of a plain string — this is correct and intentional, see "Image handling" below. |
| `src/lib/generator-nextjs-component.ts` | **(Day 3 Part A)** Takes `WidgetSchema` + entity class name → outputs a function component matching `hello-world.tsx` pattern. Always includes `const dataAttributes = htmlAttributes(props)` and spreads `{...dataAttributes}` on root. Props accessed as `props.model.Properties.X`. `renderHint === "html"` → `dangerouslySetInnerHTML`. `renderHint === "image"` → emits a TODO comment (related content needs an actual REST fetch, not faked — see `sitefinity-data` sample for the real async pattern). |
| `src/lib/generator-widget-registry-entry.ts` | **(Day 3 Part A)** Outputs just the registry snippet (not a full file) matching the format in `widget-registry.ts` — `componentType`, `entity`, `ssr: true`. |
| `src/lib/widget-generator.ts` | **DEPRECATED — do not use or extend.** Old flat-interface generator from v0.1-0.2. Left in place only so old code doesn't break mid-refactor; remove once all callers are migrated. |
| `src/lib/supabase.ts` | Supabase client. `saveWidget`, `listWidgets`, `getWidget`, `deleteWidget`. Returns null gracefully if env vars not set. |
| `src/lib/samples.ts` | Sample C# and Razor source strings for the converter UI. |
| `src/types/widget.ts` | All shared types: `WidgetProperty`, `WidgetSchema`, `GeneratedWidget`, `ConvertResult`, `SavedWidget`, `RenderHint`, `SourceType`, `RazorMetadata`, `NestedObjectShape`. |
| `src/app/api/parse-widget/route.ts` | POST endpoint. Routes to correct parser based on `sourceType`. Now calls the new entity+component generators, not `widget-generator.ts`. |
| `src/app/api/widgets/route.ts` | GET (list all) + POST (save) widgets via Supabase. |
| `src/app/api/widgets/[id]/route.ts` | GET (single) + DELETE widget by id. |
| `src/app/convert/page.tsx` | Split-pane converter. Left: `ConverterPanel`. Right: `GeneratedOutput`. |
| `src/app/marketplace/page.tsx` | Grid of saved widgets. Download / delete. Shows setup instructions if Supabase not configured. |
| `src/components/parser/ConverterPanel.tsx` | Dual-tab input: "ViewModel (.cs)" and "Razor View (.cshtml)". Convert + Save to Marketplace buttons. |
| `src/components/parser/GeneratedOutput.tsx` | Tabs updated to: Entity (`.entity.ts`) \| Component (`.tsx`) \| Registry Entry \| Schema. Old "metadata" tab removed/repurposed. |
| `src/components/marketplace/` | `MarketplaceHeader`, `MarketplaceGrid`, `WidgetCard` components. |

### Image handling — the rule that matters most

Any property with `renderHint === "image"` is ALWAYS generated as `MixedContentContext | null`
with `@Content({Type: KnownContentTypes.Images})`, regardless of what the original
source type was (C# `string` URL, MVC `Guid + ProviderName` pair, etc.). This is
deliberate — `MixedContentContext` is the universal Sitefinity content selector type
and is what lets an editor actually pick an image in the Sitefinity UI. A property
left as a plain string URL is a broken/incomplete conversion.

Property names ending in `Url` get that suffix stripped when the renderHint is
`"image"` (e.g. `BackgroundImageUrl` → `BackgroundImage`) since it's no longer a URL,
it's a content reference.

The component generator does NOT fake-render these — it emits an honest TODO comment
pointing at the `sitefinity-data` reference sample for the real async REST fetch pattern,
since rendering a `MixedContentContext` requires an actual `RestClient.getItems()` call
server-side, not a direct `<img src=...>`.

### Supabase setup (required for Marketplace)

1. Create free project at supabase.com
2. Run `docs/supabase-schema.sql` in Supabase SQL Editor
3. Create `apps/studio/.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```
4. `npm install @supabase/supabase-js` inside `apps/studio/`

---

## Architecture

```
Browser
  └── /convert page
        ├── ConverterPanel (left)
        │     └── POST /api/parse-widget
        │               ├── sourceType=viewmodel → parseWidget() [parser-csharp.ts]
        │               └── sourceType=cshtml    → parseRazorView() [parser-razor.ts]
        │     → WidgetSchema
        │     → generateEntity() [generator-nextjs-entity.ts]
        │     → generateComponent() [generator-nextjs-component.ts]
        │     → generateRegistryEntry() [generator-widget-registry-entry.ts]
        └── GeneratedOutput (right)
              └── displays ConvertResult { schema, entityFile, componentFile, registryEntrySnippet }

  └── /marketplace page
        └── GET /api/widgets → Supabase → list of SavedWidget[]
```

Path alias `@/` → `apps/studio/src/`

Root layout wraps in `QueryProvider` (TanStack Query v5).
All API calls in client components use `useMutation` or `useQuery`.

---

## REFERENCES FOLDER — the actual ground truth (read this, not the old MVC table below)

```
references/
├── Renderer-sitefinity/
│   └── SitefinityMain/
│       └── SitefinityRenderer/        ← Real .NET Core Renderer project
│           ├── Dto/, Entities/Director/, Models/, ViewComponents/, ViewModels/
│           └── Views/Shared/Components/
│
├── Mvc-project-sitefinity/
│   ├── mvc-samples-master/            ← TRUE legacy MVC (System.Web.Mvc, Sitefinity 13.1, .NET 4.7.2)
│   │   ├── AuthorWidget/              ← [TypeConverter(ExpandableObjectConverter)] nested-Model pattern
│   │   ├── CustomImageWidget/         ← Guid ImageId + string ImageProviderName pattern
│   │   ├── ListWidget/                ← enum + JSON-serialized IList<string> pattern
│   │   ├── SimpleContentBlock/        ← simplest pattern, props directly on controller
│   │   ├── SingleDynamicContent/      ← DynamicContent ORM pattern
│   │   └── 14 more samples...
│   └── sitefinity-aspnetcore-mvc-samples-master/
│       ⚠️ MISLABELED — this is NOT legacy MVC. It's a second Renderer-pattern
│       project (Progress.Sitefinity.AspNetCore v15.4, ViewComponents, Entities).
│       └── src/all-properties/Entities/AllProperties/AllPropertiesEntity.cs
│           ← THE definitive reference for every Renderer attribute combination
│
└── Nextjs-projects-sitefinity/
    ├── nextjs-corianderLaneDemo-main/ ← production site, OLDER SDK beta (0.3.0-beta.0)
    │   └── useful for: real-world patterns, but NOT the canonical target
    └── nextjs-samples/                ← OFFICIAL SDK samples, LATEST SDK (15.4.8631)
        ⚠️ THIS IS THE CANONICAL TARGET PATTERN — always generate to match this
        └── src/hello-world/src/app/widgets/
            ├── hello-world.entity.ts  ← entity pattern reference
            ├── hello-world.tsx        ← component pattern reference
            └── widget-registry.ts     ← registration format reference
        └── src/all-properties/.../all-properties.entity.ts
            ← THE definitive reference for every Next.js decorator
```

**Always read the relevant reference files before generating or modifying
generator code.** Real naming conventions and real SDK usage live here —
they cannot be guessed or assumed from training data. The old "references/mvc/"
"references/renderer/" "references/nextjs/" structure described in earlier
versions of this file was a PLACEHOLDER GUESS made before the real projects
were added — ignore any prior mention of `[DataMember]`, `Lstring`, `RelatedData`
as if they were confirmed MVC types. They are NOT present in the real
`mvc-samples-master` project. See "Confirmed type mapping" below for what's real.

---

## Confirmed type mapping (from actual reference project analysis — Day 3)

| Legacy MVC (mvc-samples-master) | Renderer (.NET Core) | Next.js (nextjs-samples) | Notes |
|----------------------------------|----------------------|---------------------------|-------|
| `string` | `string?` | `string \| null` | All strings nullable in TS |
| `Guid ImageId` + `string ImageProviderName` (always a pair) | `MixedContentContext` + `[Content(Type=Images)]` | `MixedContentContext \| null` + `@Content({Type: KnownContentTypes.Images})` | MVC stores as Guid pair resolved at runtime via `LibrariesManager`; parser MUST recognize the pair and collapse to ONE property |
| `string SelectedItemId` + `string ItemType` (GUID + type name pair) | `MixedContentContext` + `[Content(Type="full.type.name")]` | `MixedContentContext` entity → `RestClient.getItems()` | Dynamic content reference |
| `DynamicContent` (ORM object) | `MixedContentContext` → `IRestClient.GetItems<T>()` | `SdkItem[]` or typed interface | ORM → REST |
| `[TypeConverter(typeof(ExpandableObjectConverter))] public TModel Model { get; set; }` on Controller | Separate `Entity` class | `Entity` class with decorators | **This IS the MVC designer** — parser must find this property on the controller, then parse the nested `TModel` class's properties, not the controller's own props |
| `IList<string>` serialized as single JSON string (`"[\"a\",\"b\"]"`) | `IList<string>` | `string[] \| null` with `@DataType(ComplexType.Enumerable, 'string')` | MVC-era workaround — detect via JSON-array-looking string content, not just type name |
| plain `enum` | `enum` + `[DataType(KnownFieldTypes.RadioChoice)]` | TS `enum` + `@Choice({Choices:[...]})` + `@DataType(KnownFieldTypes.RadioChoice)` | Single-select |
| `[Flags] enum` | `[Flags] enum` + `[DataType(KnownFieldTypes.ChipChoice)]` | TS `enum` + `@Choice(...)` + `@DataType(KnownFieldTypes.ChipChoice)` | Multi-select — check for `[Flags]` |
| `[DynamicLinksContainer] string` | `[DataType(KnownFieldTypes.Html)] [ContentContainer] string` | `@DataType(KnownFieldTypes.Html) @ContentContainer()` | Rich text |
| `bool` | `bool?` | `boolean \| null` | |
| `int` | `int?` | `number \| null` | |
| `[ControllerToolboxItem(Name, Title, SectionName)]` on Controller | `[SitefinityWidget(Title)]` on ViewComponent | `@WidgetEntity('Key', 'Title')` + `widget-registry.ts` entry | Widget registration |

No `[DataMember]`, `Lstring`, or `RelatedData` types exist in the real
`mvc-samples-master` reference project. Those were placeholder guesses from
before references were added — do not implement parsing for them unless they
turn up in an actual customer project being migrated.

---

## Day 3 Part A — STATUS: COMPLETE (pending final review)

Retargeted the generator from flat-interface output to the real SDK
decorator/entity pattern. Built:
- `generator-nextjs-entity.ts`
- `generator-nextjs-component.ts`
- `generator-widget-registry-entry.ts`

Fixes applied after initial review:
- `@Description` decorator now wired up (was parsed but not emitted)
- `renderHint === "image"` properties now correctly emit `MixedContentContext`
  + `@Content` decorator instead of staying as plain `string`

Verify before considering Part A fully closed:
1. Convert Hero Widget sample through the UI
2. Confirm `Title` property has `@DisplayName`, `@Description`, `@ContentSection` in that order
3. Confirm `BackgroundImage` (renamed from `BackgroundImageUrl`) is `MixedContentContext | null`
   with `@Content({Type: KnownContentTypes.Images})`
4. Confirm component has the TODO comment instead of a fake `<img src=...>` for that property
5. Confirm `htmlAttributes(props)` is spread on root element

---

## Day 3 Part B — NOT YET STARTED — build next

**Branch:** `feature/day3-mvc-migration-engine` (continue on same branch as Part A)

### New files to create

```
src/lib/parser-mvc-controller.ts
  - Finds [ControllerToolboxItem(Name, Title, SectionName)] on the class
  - Finds [TypeConverter(typeof(ExpandableObjectConverter))] property
    → this gives the nested Model class name to parse next
  - FALLBACK: if no [TypeConverter] property found, parse the controller's
    own public properties directly (this is the SimpleContentBlock pattern —
    see references/Mvc-project-sitefinity/mvc-samples-master/SimpleContentBlock/)

src/lib/parser-mvc-model.ts
  - Parses the nested Model class found by parser-mvc-controller.ts
    (or the controller's own properties, in the fallback case)
  - Detects Guid+ProviderName image pairs (by naming convention: XId + XProviderName,
    or similar) → collapses to ONE WidgetProperty with renderHint: "image"
  - Detects SelectedItemId+ItemType pairs → collapses to one content-reference property
  - Detects [DynamicLinksContainer] → renderHint: "html"
  - Detects JSON-array-style string defaults/values → type: "string[]"
  - Detects plain enum vs [Flags] enum

docs/MVC_MIGRATION_GUIDE.md
  - The confirmed type mapping table above
  - Links to the exact reference files (see "Key reference file paths" below)
```

### Files to modify

```
src/types/widget.ts
  - Add "mvc" as a SourceType value (single value covers controller+model
    together, since the controller parser hands off to the model parser
    internally — no need for separate mvc-controller/mvc-model source types)
  - Add MvcMetadata interface if controller-level info needs to be tracked
    (toolbox name, section, module name)

src/app/api/parse-widget/route.ts
  - Route sourceType === "mvc" to parser-mvc-controller.ts, which internally
    calls parser-mvc-model.ts

src/components/parser/ConverterPanel.tsx
  - Add "MVC Widget" as a third input tab
  - Note: MVC input is two files conceptually (controller + model) but the
    UI can take a single paste if the user includes both classes in one
    textarea, OR add two separate textareas — decide based on what's
    easiest to test with; AuthorWidget sample is a good test case since
    it has both patterns

src/lib/samples.ts
  - Add MVC samples: AuthorWidget (TypeConverter pattern), CustomImageWidget
    (image Guid pattern), SimpleContentBlock (fallback/no-Model pattern)

CHANGELOG.md
  - v0.3.0 entry once Part B is done and verified
```

### Before writing any Part B code

1. Read `references/Mvc-project-sitefinity/mvc-samples-master/AuthorWidget/.../AuthorController.cs`
   (TypeConverter pattern)
2. Read `references/Mvc-project-sitefinity/mvc-samples-master/CustomImageWidget/.../CustomImageController.cs`
   (image Guid pair pattern)
3. Read `references/Mvc-project-sitefinity/mvc-samples-master/SimpleContentBlock/.../SimpleContentBlockController.cs`
   (fallback, no nested Model)
4. Read `references/Mvc-project-sitefinity/mvc-samples-master/SingleDynamicContent/.../SingleDynamicContentModel.cs`
   (DynamicContent pattern)
5. Read `references/Mvc-project-sitefinity/mvc-samples-master/ListWidget/.../ListController.cs`
   (enum + JSON-string-array pattern)
6. Re-confirm output target by re-reading `hello-world.entity.ts` and
   `all-properties.entity.ts` — Part B output must match the SAME entity/component
   pattern Part A established, just sourced from MVC input instead of Renderer input

---

## Key reference file paths (use these exact paths when reading)

| Purpose | Path |
|---------|------|
| Every Renderer attribute documented | `references/Mvc-project-sitefinity/sitefinity-aspnetcore-mvc-samples-master/src/all-properties/Entities/AllProperties/AllPropertiesEntity.cs` |
| Every Next.js decorator documented | `references/Nextjs-projects-sitefinity/nextjs-samples/src/all-properties/src/app/widgets/all-properties.entity.ts` |
| Simplest Next.js widget (canonical target pattern) | `references/Nextjs-projects-sitefinity/nextjs-samples/src/hello-world/src/app/widgets/` |
| Widget registry format | `references/Nextjs-projects-sitefinity/nextjs-samples/src/hello-world/src/app/widget-registry.ts` |
| Async data-fetching pattern (for image/related content TODOs) | `references/Nextjs-projects-sitefinity/nextjs-samples/src/sitefinity-data/src/app/widgets/` |
| MVC controller — nested Model (TypeConverter) pattern | `references/Mvc-project-sitefinity/mvc-samples-master/AuthorWidget/AuthorWidget/MVC/Controllers/AuthorController.cs` |
| MVC controller — image Guid pattern | `references/Mvc-project-sitefinity/mvc-samples-master/CustomImageWidget/CustomImageWidget/Mvc/Controllers/CustomImageController.cs` |
| MVC controller — no nested Model (simplest) | `references/Mvc-project-sitefinity/mvc-samples-master/SimpleContentBlock/` |
| MVC model — DynamicContent pattern | `references/Mvc-project-sitefinity/mvc-samples-master/SingleDynamicContent/SingleDynamicContent/Mvc/Models/SingleDynamicContentModel.cs` |
| MVC controller — enum + JSON-string-array | `references/Mvc-project-sitefinity/mvc-samples-master/ListWidget/` |
| Renderer ViewComponent + Entity | `references/Mvc-project-sitefinity/sitefinity-aspnetcore-mvc-samples-master/src/hello-world/ViewComponents/HelloWorldViewComponent.cs` |
| Renderer image resolution in a view | `references/Renderer-sitefinity/SitefinityMain/SitefinityRenderer/Views/Shared/Components/SitefinityContentList/List.ActorsCard.cshtml` |
| Next.js production image rendering + related content | `references/Nextjs-projects-sitefinity/nextjs-corianderLaneDemo-main/src/components/templates/content-list/details-news.tsx` |
| Next.js interface definitions (production patterns) | `references/Nextjs-projects-sitefinity/nextjs-corianderLaneDemo-main/src/interfaces/interface.ts` |

---

## Parser behaviour — what is and isn't supported

### parser-csharp.ts (Renderer ViewModels)

Supported:
- `public string/bool/int/float/double/decimal/List<T> PropName { get; set; }`
- `[DisplayName]`, `[Description]`, `[ContentSection]`, `[DefaultValue]`
- Nullable types (`string?`)
- Nested object detection by type name pattern (contains "ViewModel", "Image", "Video")
- `renderHint` inference from property name

Not supported yet:
- Enum types → `unknown`
- `[Flags]` enum detection
- Inheritance (`class Foo : Bar`) — only parses declared properties
- Multi-line attribute arguments
- `init`-only properties

### parser-razor.ts (Renderer .cshtml views)

Supported:
- `@model` directive → widget name
- All `Model.X` and `Model.X?.Y` accesses
- `Html.Raw(Model.X)` → `renderHint: "html"`
- `Html.PartialAsync("...")` → noted in razorMetadata.partialViews
- `data-aos` → noted in razorMetadata.animationLibraries
- Conditional props (`@if (!string.IsNullOrEmpty(Model.X))`) → `isNullable: true`
- Known nested shapes: `SfImage` for image props, `SfVideo` for video props

Not yet: MVC-specific Razor syntax (`@Html.ActionLink`, `@Html.EditorFor`, `@Url.Action`)
— this is Part B scope via `parser-mvc-view.ts` if/when view parsing is needed
(may not be needed for v0.3 — entity/component generation from controller+model
alone may be sufficient; views are largely presentational and don't carry
designer metadata in the MVC pattern, per the reference analysis)

### generator-nextjs-entity.ts / generator-nextjs-component.ts (Day 3 Part A)

See "Image handling" section above for the renderHint==="image" rule.
Always read `all-properties.entity.ts` before extending decorator support —
it is the exhaustive reference for what decorators exist and how they're used.

---

## Git workflow

```
main                          ← stable, tagged on version bumps
feature/dayN-description      ← one branch per day/feature
```

```bash
# Continue Day 3 (Part A done, Part B next — same branch)
git checkout feature/day3-mvc-migration-engine

# Commit during work (atomic, descriptive)
git add -A
git commit -m "feat: add mvc controller parser — TypeConverter + fallback pattern"

# End of day — merge + tag if version bump
git checkout main
git merge --no-ff feature/day3-mvc-migration-engine -m "merge: Day 3 — generator retarget + MVC engine"
git tag v0.3.0
```

Commit message prefixes: `feat:` `fix:` `refactor:` `chore:` `docs:`

Version bump rules:
- Patch (0.2.x): bug fixes, parser edge cases
- Minor (0.x.0): new feature complete (new parser, new UI section, Supabase added)
- Major (x.0.0): v1.0 = Marketplace launch

---

## Packages (future — not yet implemented)

```
packages/parser-csharp/      ← Will extract src/lib/parser-csharp.ts
packages/metadata-engine/    ← Rich attribute extraction
packages/widget-generator/   ← Will extract generator-nextjs-entity.ts + generator-nextjs-component.ts
packages/preview-engine/     ← Sandpack iframe renderer (later)
packages/widget-registry/    ← Widget store with Supabase (later)
packages/visual-builder/     ← dnd-kit canvas (later)
```

Do not move code into packages yet — keep everything in `apps/studio/src/lib/`
until the feature is stable and the API is settled.

---

## Already-installed packages not yet wired up

| Package | When to use |
|---------|-------------|
| `@monaco-editor/react` + `monaco-editor` | Replace textarea with Monaco (C# + TypeScript syntax highlighting) |
| `ts-morph` | AST-based parser upgrade (replaces regex parsers eventually) |
| `@codesandbox/sandpack-react` | Preview Studio iframe |
| `@dnd-kit/core` + sortable + utilities | Visual Builder canvas |
| `react-hook-form` + `@hookform/resolvers` + `zod` | Prop editor forms |
| `zustand` | Global builder state |
| `@supabase/supabase-js` | Run `npm install @supabase/supabase-js` if not already done |

Also check whether the real `MixedContentContext` import path needs a new
package — confirm via `references/Nextjs-projects-sitefinity/nextjs-samples/.../all-properties.entity.ts`
import statements rather than guessing the package name.

---

## Styling conventions

Tailwind CSS 3 + shadcn/ui conventions.
CSS variables: `--background`, `--foreground`, `--primary`, `--muted`, `--border`, `--ring`.
Use `cn(clsx, tailwind-merge)` for conditional classes.
Radix UI primitives installed but not yet wired — use raw HTML + Tailwind for now.

---

## Full version roadmap

| Version | Branch prefix | Focus |
|---------|--------------|-------|
| v0.1 ✅ | day1 | Renderer parser + generator + converter UI (flat-interface output, since superseded) |
| v0.2 ✅ | day2 | Razor parser + render hints + Supabase + Marketplace |
| v0.3 🔨 | day3 | Part A ✅ Generator retargeted to real SDK entity/component pattern. Part B 🔨 MVC migration engine (current priority) |
| v0.4 | day4-5 | Monaco editor + widget history + Renderer preview |
| v0.5 | day6-7 | Metadata engine — enum + `[Flags]` support, `init`-only props, inheritance |
| v0.6 | day8-10 | Preview Studio (Sandpack + prop editor forms) |
| v0.7 | day11-15 | Visual Builder (dnd-kit canvas) |
| v0.8 | day16-18 | AI-assisted conversion |
| v1.0 | day19+ | Marketplace — publish, install, licensing |

### .NET project (planned, not yet started)
A separate ASP.NET minimal API sidecar for:
- Roslyn parser (100% accurate C# AST) — replaces regex parsers
- Reflection-based widget validator (loads compiled .dll, compares against generated TS)
- Sitefinity integration bridge (reads all registered widgets from a live Sitefinity instance)

Add as `apps/roslyn-sidecar/` when ready. Not started.

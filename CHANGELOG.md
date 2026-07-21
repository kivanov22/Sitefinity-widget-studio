# Changelog

All notable changes to Sitefinity Widget Studio.

## [0.1.0] — 2024

### Added
- Next.js 15 monorepo scaffold with App Router
- C# widget model parser (regex-based, covers string/bool/int/List<T> + [DisplayName]/[Description]/[ContentSection]/[DefaultValue])
- TypeScript interface generator (`HeroWidget.types.ts`)
- Sitefinity metadata file generator (`HeroWidget.metadata.ts`)
- React component generator (`HeroWidget.tsx`) with smart render patterns
- `/api/parse-widget` POST endpoint
- Split-pane converter UI at `/convert`
- Hero Widget C# sample + reference Next.js output
- Download all generated files
- Monorepo packages scaffolded: parser-csharp, metadata-engine, widget-generator, preview-engine, widget-registry, visual-builder, ui, shared
- Docker + docker-compose setup
- Full documentation: README, ROADMAP, ARCHITECTURE, DAILY_PLAN, SAMPLE_WIDGETS

## [Unreleased — v0.2]

- Monaco Editor (replace textarea)
- Enum support
- Full attribute extraction
- More sample widgets

## [0.5.0] — Day 5

### Added
- Monaco Editor across every input pane (ViewModel, Razor, all four MVC panes) and the read-only output panes
- Conversion history in `localStorage` (last 20 conversions, reload input + output together)
- ESLint flat config for `apps/studio`
- MVC `SelectedItemId` + `ItemType` → single `content-reference` property collapsing (the real pattern splits the two properties across the Controller and Model classes)
- Renderer prop-preview panel — live client-side render of the generated component with editable sample props (`@babel/standalone`, no bundler)

### Fixed
- Output panel no longer keeps showing a stale conversion after switching input tabs

### Removed
- Orphaned `widget-generator.ts` (superseded by the entity/component generators since v0.3)

### Deferred
- FAQ Widget `List<FaqItem>` (custom list-item type) support — moved to Day 6, not investigated in this release

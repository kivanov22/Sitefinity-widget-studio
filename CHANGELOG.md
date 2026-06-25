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

# Sitefinity Widget Studio

> Convert Sitefinity .NET Core Renderer widgets to Next.js — parse, generate, preview, and publish.

[![version](https://img.shields.io/badge/version-0.5.0-blue)](./CHANGELOG.md)
[![license](https://img.shields.io/badge/license-MIT-green)](#)

---

## What this is

Sitefinity Widget Studio is a developer platform that solves one core problem:

> "We have hundreds of existing .NET Core Renderer widgets. How do we migrate them to Next.js without rewriting every widget by hand?"

You drop in a C# widget model, and Studio gives you:

- A typed TypeScript props interface
- A Sitefinity-compatible metadata file
- A scaffolded React component ready to drop into your Next.js Sitefinity project

---

## Quick Start

### Prerequisites

- Node.js 20+
- npm 10+

### 1. Install dependencies

```bash
cd apps/studio
npm install
```

### 2. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 3. Try the converter

Go to [http://localhost:3000/convert](http://localhost:3000/convert), click **Samples → Hero Widget**, then **Convert to Next.js**.

You'll see three generated files appear immediately.

---

## Project Structure

```
sitefinity-widget-studio/
│
├── apps/
│   └── studio/                  ← Next.js 15 app (main UI)
│       └── src/
│           ├── app/             ← App Router pages + API routes
│           ├── components/      ← React components
│           ├── lib/             ← Parser + generator logic
│           └── types/           ← Shared TypeScript types
│
├── packages/
│   ├── parser-csharp/           ← C# → WidgetSchema (v0.1: regex, v0.2: Roslyn)
│   ├── metadata-engine/         ← Schema → Sitefinity designer JSON
│   ├── widget-generator/        ← Schema → .tsx + .types.ts + .metadata.ts
│   ├── preview-engine/          ← Live widget renderer (v0.3)
│   ├── widget-registry/         ← Widget store + versioning (v0.3)
│   ├── visual-builder/          ← Drag & drop page composer (v0.4)
│   ├── ui/                      ← Shared component library
│   └── shared/                  ← Cross-package TypeScript types
│
├── infrastructure/
│   └── docker/                  ← Dockerfile + docker-compose
│
└── docs/
    ├── ROADMAP.md               ← Full version roadmap
    ├── ARCHITECTURE.md          ← System design decisions
    ├── DAILY_PLAN.md            ← Day-by-day build guide
    └── SAMPLE_WIDGETS.md        ← Reference .NET and Next.js widget pairs
```

---

## What's done (v0.1)

| Feature | Status |
|---------|--------|
| Next.js 15 app scaffold | ✅ |
| Monorepo structure | ✅ |
| C# model parser (regex) | ✅ |
| TypeScript interface generator | ✅ |
| Metadata file generator | ✅ |
| React component generator | ✅ |
| `/api/parse-widget` endpoint | ✅ |
| Convert UI (split-pane editor) | ✅ |
| Hero Widget sample | ✅ |
| Download generated files | ✅ |

---

## Day 5 (v0.5.0) — latest

> Note: this section (and the "What's done" table above) is the only part of
> this README tracking day-by-day progress; the rest of the file is still
> the original v0.1 draft. See `CLAUDE.md` for the full, currently-maintained
> day-by-day project history.

- Monaco Editor across every input pane (ViewModel, Razor, all four MVC panes) and the read-only output panes
- Conversion history in `localStorage` (last 20 conversions, reload input + output together)
- ESLint flat config for `apps/studio` (`next lint` had no config file and fell into an interactive prompt)
- MVC `SelectedItemId` + `ItemType` → single `content-reference` property collapsing (the real pattern splits the two properties across the Controller and Model classes)
- Renderer prop-preview panel — live client-side render of the generated component with editable sample props (`@babel/standalone`, no bundler)
- Removed the orphaned `widget-generator.ts` (superseded by the entity/component generators since v0.3)
- Fixed: the output panel no longer keeps showing a stale conversion after switching input tabs

**Deferred to Day 6:** FAQ Widget `List<FaqItem>` (custom list-item type) support — investigation not included in this release.

---

## What's coming

See [`docs/ROADMAP.md`](./docs/ROADMAP.md) for the full versioned roadmap.

| Version | Focus | ETA |
|---------|-------|-----|
| v0.2 | Metadata Engine — richer attributes, enum support | Sprint 2 |
| v0.3 | Preview Studio — live iframe render, responsive | Sprint 3–4 |
| v0.4 | Visual Builder — drag/drop, layout JSON export | Sprint 5–7 |
| v0.5 | AI Conversion — GPT-assisted widget migration | Sprint 8–9 |
| v1.0 | Marketplace — widget packages, licensing | Sprint 10+ |

---

## Sample: What a conversion looks like

**Input (C# model):**
```csharp
public class HeroWidgetModel
{
    [DisplayName("Title")]
    [ContentSection("Content")]
    public string Title { get; set; }

    [DisplayName("Button Text")]
    [ContentSection("Call to Action")]
    public string ButtonText { get; set; }

    [DefaultValue(true)]
    public bool ShowButton { get; set; }
}
```

**Output: `HeroWidget.types.ts`**
```ts
export interface HeroWidgetProps {
  title: string;
  buttonText: string;
  showButton: boolean;
}
```

**Output: `HeroWidget.tsx`**
```tsx
import type { HeroWidgetProps } from "./HeroWidget.types";

export default function HeroWidget(props: HeroWidgetProps) {
  return (
    <section className="py-16">
      <div className="container mx-auto px-6 max-w-5xl">
        <h2 className="text-4xl font-bold mb-4">{props.title}</h2>
        {props.showButton && (
          <a href={props.buttonUrl} className="...">
            {props.buttonText}
          </a>
        )}
      </div>
    </section>
  );
}
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15, React 19 |
| Language | TypeScript 5.7 |
| Styling | Tailwind CSS 3, shadcn/ui conventions |
| State | Zustand 5 |
| Server state | TanStack Query 5 |
| Forms | React Hook Form 7 + Zod |
| Code editor | Monaco Editor |
| DnD (v0.4) | @dnd-kit |
| Parser v0.2 | ts-morph / Roslyn WASM |

---

## Contributing

This is currently a closed internal project. See `docs/DAILY_PLAN.md` for the development schedule.

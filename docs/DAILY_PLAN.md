# Daily Build Plan — Sitefinity Widget Studio

A realistic session-by-session guide. Each "day" is one focused Claude session (~2–3 hours of work).

Work in order. Each day depends on the previous one.

---

## Phase 1 — v0.1 Foundation (Days 1–5)

### Day 1 ✅ — Project scaffold + Hero Widget conversion
- [x] Monorepo structure
- [x] Next.js 15 app
- [x] All packages scaffolded
- [x] C# regex parser
- [x] TypeScript + metadata + component generator
- [x] `/api/parse-widget` endpoint
- [x] Converter split-pane UI
- [x] Hero Widget C# sample + Next.js reference output

**Verify:** `npm run dev` starts. Open `/convert`, load Hero sample, convert, see 3 generated files.

---

### Day 2 — Polish parser + add 3 more sample widgets
- [ ] Fix parser edge cases: nullable generics (`List<string?>`)
- [ ] Add FAQ Widget sample
- [ ] Add Card Grid Widget sample  
- [ ] Add Pricing Table Widget sample
- [ ] Improve component generator: smarter JSX for list props, enum detection
- [ ] Add "Copy to clipboard" per-file button in GeneratedOutput
- [ ] Show namespace in output header

**Verify:** All 4 samples convert cleanly. Generated component compiles without TS errors.

---

### Day 3 — Monaco Editor + keyboard shortcuts
- [ ] Replace `<textarea>` with Monaco Editor (C# syntax highlighting)
- [ ] Replace output `<pre>` with Monaco read-only (TypeScript syntax highlighting)
- [ ] `Ctrl/Cmd + Enter` triggers conversion
- [ ] Line numbers + gutter in both panels
- [ ] Monaco dark/light theme synced with page

**Verify:** Paste real C# from a project. Syntax highlights correctly. Shortcut works.

---

### Day 4 — Widget history + local registry
- [ ] Save each conversion to `localStorage`
- [ ] History sidebar: list of converted widgets with timestamp
- [ ] Click to restore a previous conversion
- [ ] Delete from history
- [ ] Export history as JSON

**Verify:** Convert 3 widgets. Refresh page. All 3 still in sidebar. Click one → it loads back.

---

### Day 5 — v0.1 cleanup + README polish
- [ ] Error handling edge cases (empty class, no properties, private props only)
- [ ] Better error messages with actionable hints
- [ ] `npm run type-check` passes with zero errors
- [ ] Update README with current state
- [ ] Write `CHANGELOG.md` entry for v0.1

**Verify:** Type check passes. Submit a malformed C# class — get a helpful error message.

---

## Phase 2 — v0.2 Metadata Engine (Days 6–9)

### Day 6 — Rich attribute extraction
- [ ] Parse `[Category]` attribute
- [ ] Parse `[Browsable(false)]` (hidden fields)
- [ ] Parse `[ReadOnly(true)]`
- [ ] Parse `[EnumDataType(typeof(MyEnum))]`
- [ ] Show all attributes in the property summary panel

---

### Day 7 — Enum support
- [ ] Detect enum properties in C#
- [ ] Extract enum value names from the source
- [ ] Generate TypeScript `const enum` + union type
- [ ] Metadata: `type: "enum", options: ["Value1", "Value2"]`
- [ ] Component generator: render enum as string for now

---

### Day 8 — Metadata JSON validator + export
- [ ] Define JSON Schema for WidgetMetadata
- [ ] Validate generated metadata against schema
- [ ] Export metadata as `widget.manifest.json` (early format)
- [ ] Schema viewer tab in GeneratedOutput

---

### Day 9 — ts-morph upgrade (optional Roslyn path)
- [ ] Integrate `ts-morph` on server for TypeScript AST generation
- [ ] Research Roslyn WASM feasibility
- [ ] Document parser architecture decision in `ARCHITECTURE.md`
- [ ] Add parser comparison test: regex vs ts-morph outputs match

---

## Phase 3 — v0.3 Preview Studio (Days 10–15)

### Day 10 — Preview page layout
- [ ] `/preview` page: left prop editor, right iframe
- [ ] Pass `ConvertResult` from converter to preview (URL param or store)
- [ ] Iframe with basic "hello world" widget render

### Day 11 — Sandpack integration
- [ ] Install `@codesandbox/sandpack-react`
- [ ] Render generated `.tsx` in Sandpack with hot reload
- [ ] Inject generated `.types.ts` as virtual file

### Day 12 — Auto-generated prop editor
- [ ] Build `PropEditorForm` component
- [ ] String → `<Input>`
- [ ] Boolean → `<Switch>`
- [ ] Number → `<Input type="number">`
- [ ] Enum → `<Select>`
- [ ] Form drives Sandpack props in real time

### Day 13 — Viewport toggle
- [ ] Mobile / Tablet / Desktop preset buttons
- [ ] iframe width changes, content stays responsive
- [ ] "Detach preview" → open in new tab

### Day 14 — Widget registry (persistence)
- [ ] Move history from localStorage to proper registry store (Zustand)
- [ ] Widget cards: name, properties count, last converted
- [ ] Quick-launch from registry → opens in converter + preview

### Day 15 — v0.3 integration + polish
- [ ] "Convert → Preview" button in converter goes directly to preview
- [ ] Preview shares URL (base64 encoded state)
- [ ] Responsive on 1280px+ screens

---

## Phase 4 — v0.4 Visual Builder (Days 16–22)

### Day 16 — Builder layout scaffold
- [ ] `/builder` page
- [ ] Three-panel layout: Widget Palette | Canvas | Property Panel

### Day 17 — Canvas with drop zones
- [ ] `@dnd-kit` droppable canvas rows
- [ ] Drop a widget from palette → appears in canvas

### Day 18 — Widget palette
- [ ] Lists converted widgets from registry
- [ ] Search/filter palette
- [ ] Widget preview thumbnail (small)

### Day 19 — Property panel
- [ ] Click widget in canvas → property panel shows
- [ ] Uses same `PropEditorForm` from preview
- [ ] Changes reflect in canvas widget

### Day 20 — Reorder + delete
- [ ] Drag widgets within canvas to reorder
- [ ] Delete widget from canvas
- [ ] Multi-column row support (1/2, 1/3, 2/3 columns)

### Day 21 — Layout JSON export
- [ ] Export canvas state as Sitefinity-compatible layout JSON
- [ ] Copy layout JSON
- [ ] Download as `layout.json`

### Day 22 — v0.4 polish
- [ ] Undo/redo (Zustand history)
- [ ] Empty state / instructions
- [ ] Keyboard: `Delete` removes selected widget, `Escape` deselects

---

## Phase 5 — v0.5 AI Conversion (Days 23–26)

### Day 23 — AI mode UI
- [ ] Toggle "AI-assisted" in converter
- [ ] Call Claude/GPT-4o API with C# source
- [ ] Stream response into Monaco output

### Day 24 — AI prompt engineering
- [ ] System prompt: Sitefinity expert, Next.js 15, TypeScript strict
- [ ] Handle complex types: nested models, interfaces
- [ ] "Explain conversion" side panel

### Day 25 — Batch conversion UI
- [ ] Multi-file upload (`.cs` files)
- [ ] Queue + progress
- [ ] Download all as `.zip`

### Day 26 — AI v0.5 polish
- [ ] Confidence score per property (AI vs parser)
- [ ] Diff view: parser result vs AI result
- [ ] Accept/reject individual AI suggestions

---

## Phase 6 — v1.0 Marketplace (Days 27+)

### Day 27–28 — Widget package format
- [ ] `widget.manifest.json` spec
- [ ] Publisher CLI scaffold

### Day 29–30 — Marketplace UI
- [ ] Browse page
- [ ] Widget detail page
- [ ] Install button → download package

### Day 31–35 — Subscriptions + licensing
- [ ] Auth (Clerk or Auth.js)
- [ ] Stripe integration
- [ ] License key validation

---

## Notes

- Each session: bring the relevant feature file to Claude, say "we're on Day N"
- Always run `npm run type-check` before ending a session
- Git commit at the end of every day with the day number in the message

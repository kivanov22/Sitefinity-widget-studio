# Roadmap — Sitefinity Widget Studio

Each version has a single clear goal. We build the hardest, most valuable thing first: the conversion engine. Marketplace and subscriptions come last, after we've validated the core.

---

## v0.1 — Widget Conversion Engine (Current)

**Goal:** Prove that a C# widget model can be parsed and converted to a usable Next.js widget automatically.

### Deliverables
- [x] Next.js 15 monorepo scaffold
- [x] C# regex parser (`parser-csharp`)
- [x] TypeScript generator (`widget-generator`)
- [x] `/api/parse-widget` REST endpoint
- [x] Split-pane converter UI
- [x] Hero Widget sample (C# + Next.js reference pair)
- [x] Download generated files

### Parser support
- `string`, `bool`, `int`, `float`, `double`, `decimal`
- Nullable types (`string?`, `int?`)
- `List<string>`, `List<int>`
- Attributes: `[DisplayName]`, `[Description]`, `[DefaultValue]`, `[ContentSection]`

### Not yet
- Roslyn-based AST (regex may miss edge cases)
- Enum properties
- Nested model types
- Live preview

---

## v0.2 — Metadata Engine

**Goal:** Preserve all Sitefinity designer metadata so converted widgets behave correctly in the page editor.

### Deliverables
- [ ] Full attribute extraction: `[Category]`, `[ReadOnly]`, `[Browsable]`, `[EnumDataType]`
- [ ] Enum type support — generate TypeScript enum + union type
- [ ] `[SectionDefaultOpen]` support
- [ ] Metadata JSON schema validator
- [ ] Monaco Editor integration (replace `<textarea>` with syntax highlighting)
- [ ] Keyboard shortcut: `Ctrl+Enter` to convert
- [ ] Multiple sample widgets: FAQ, Card Grid, Pricing Table, Testimonials

### Parser upgrade
- Roslyn via `ts-morph` for full AST parsing on the server side
- Fallback to regex if AST fails

---

## v0.3 — Preview Studio

**Goal:** See the generated widget render with real props, across device viewports, without leaving the Studio.

### Deliverables
- [ ] `preview-engine` package
- [ ] Sandpack-powered iframe sandbox (renders generated `.tsx` in-browser)
- [ ] Auto-generated prop editor form (driven by metadata)
  - String → `<input>`
  - Boolean → `<Switch>`
  - Number → `<input type="number">`
  - Enum → `<Select>`
- [ ] Viewport toggle: Mobile / Tablet / Desktop
- [ ] Auto-refresh on prop change (debounced 200ms)
- [ ] Copy component + props as ready-to-paste JSX

### Widget Registry (v0.3 scope)
- [ ] Save converted widgets to local storage
- [ ] Widget list / history panel
- [ ] Re-open and re-edit a previously converted widget

---

## v0.4 — Visual Builder

**Goal:** Assemble full page layouts from converted widgets with drag and drop. Export as JSON layout consumable by the Next.js Sitefinity renderer.

### Deliverables
- [ ] `visual-builder` package
- [ ] Canvas with droppable zones
- [ ] Widget palette (sidebar with registry of converted widgets)
- [ ] `@dnd-kit` drag and drop between zones
- [ ] Property panel for selected widget (same form as v0.3 preview)
- [ ] Layout JSON export compatible with Sitefinity's Next.js layout format
- [ ] Responsive preview toggle on the canvas

### Sitefinity layout format support
- Compatible with `SfLayoutServiceResponse` JSON structure
- Widget component map for Next.js `<RenderComponent />`

---

## v0.5 — AI-Assisted Conversion

**Goal:** Handle complex widgets that the regex/AST parser can't convert cleanly, using an AI step.

### Deliverables
- [ ] AI conversion mode toggle in the converter UI
- [ ] GPT-4o call for: nested models, custom type mappings, complex render logic
- [ ] AI-generated component JSX reviewed in Monaco before accepting
- [ ] "Explain this conversion" tooltip — why each prop was mapped the way it was
- [ ] Batch mode: upload multiple `.cs` files, convert in parallel

### Parser upgrade
- [ ] .NET WASM Roslyn sidecar for 100% accurate C# AST

---

## v1.0 — Marketplace

**Goal:** Let agencies publish, discover, and install pre-built Next.js widgets for Sitefinity.

### Deliverables
- [ ] Widget package format spec (`widget.manifest.json`)
- [ ] Publisher CLI: `npx studio publish`
- [ ] Marketplace UI: browse, filter, preview
- [ ] One-click install into Next.js project
- [ ] Versioning + changelogs
- [ ] Subscription tiers: Starter €19/mo · Agency €99/mo · Enterprise €299/mo
- [ ] License enforcement
- [ ] Widget rating + reviews

### Widget categories at launch
- Layout: Hero, Card Grid, Banner, Divider
- Navigation: Mega Menu, Breadcrumb, Sidebar
- Content: FAQ, Accordion, Tabs, Timeline
- Commerce: Pricing Table, Feature Comparison
- Media: Image Gallery, Video Hero
- Forms: Contact, Newsletter, Lead Gen

---

## Post-v1.0 (Backlog)

- Storybook integration for widget documentation
- GitHub Action: auto-convert changed `.cs` files on PR
- Figma → Widget scaffold (design-to-code)
- Multi-tenant SaaS (team workspaces, shared widget libraries)
- Sitefinity Cloud integration (direct widget upload)

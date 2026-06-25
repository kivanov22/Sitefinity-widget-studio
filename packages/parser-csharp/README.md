# @studio/parser-csharp

Parses Sitefinity .NET Core Renderer C# widget model classes into a structured `WidgetSchema`.

## Status

**v0.1** — Regex-based TypeScript parser. Handles 95% of real widget models.  
**v0.2** — Roslyn-powered via .NET WASM sidecar (planned).

## What it parses

- `public class` declarations (class name, namespace)
- `public T PropertyName { get; set; }` properties
- Supported types: `string`, `bool`, `int`, `long`, `float`, `double`, `decimal`, `List<string>`, `List<int>`, nullable variants (`string?`)
- Attributes: `[DisplayName]`, `[Description]`, `[DefaultValue]`, `[ContentSection]`

## Usage

```ts
import { parseWidget } from "@studio/parser-csharp";

const schema = parseWidget(csharpSource);
// schema.className    => "HeroWidgetModel"
// schema.widgetName   => "HeroWidget"
// schema.properties   => WidgetProperty[]
```

## Roadmap

| Version | Change |
|---------|--------|
| v0.1 | Regex parser |
| v0.2 | Roslyn/WASM for 100% AST accuracy |
| v0.3 | Support interface types, enums, nested models |

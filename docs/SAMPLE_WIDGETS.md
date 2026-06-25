# Sample Widgets Reference

Full reference pairs: Sitefinity .NET Core Renderer model → Next.js widget.

Use these to:
1. Test the parser and generator
2. Understand what "correct" output looks like
3. Validate new parser features

---

## 1. Hero Widget

### C# Model
```csharp
using System.ComponentModel;
using Telerik.Sitefinity.Web.UI.ContentUI.Enums;

namespace MyProject.Widgets
{
    public class HeroWidgetModel
    {
        [DisplayName("Title")]
        [Description("Main heading text")]
        [ContentSection("Content", 0)]
        public string Title { get; set; }

        [DisplayName("Subtitle")]
        [ContentSection("Content", 1)]
        public string Subtitle { get; set; }

        [DisplayName("Background Image URL")]
        [ContentSection("Design", 0)]
        public string BackgroundImageUrl { get; set; }

        [DisplayName("Button Text")]
        [ContentSection("Call to Action", 0)]
        public string ButtonText { get; set; }

        [DisplayName("Button URL")]
        [ContentSection("Call to Action", 1)]
        public string ButtonUrl { get; set; }

        [DisplayName("Show Button")]
        [DefaultValue(true)]
        [ContentSection("Call to Action", 2)]
        public bool ShowButton { get; set; }
    }
}
```

### Next.js Widget
```tsx
// HeroWidget.tsx
import type { HeroWidgetProps } from "./HeroWidget.types";

export default function HeroWidget(props: HeroWidgetProps) {
  return (
    <section
      className="relative min-h-[600px] flex items-center"
      style={
        props.backgroundImageUrl
          ? { backgroundImage: `url(${props.backgroundImageUrl})`, backgroundSize: "cover" }
          : undefined
      }
    >
      <div className="container mx-auto px-6 max-w-5xl">
        <h1 className="text-5xl font-bold mb-4">{props.title}</h1>
        {props.subtitle && (
          <p className="text-xl text-gray-600 mb-8">{props.subtitle}</p>
        )}
        {props.showButton && props.buttonUrl && (
          <a
            href={props.buttonUrl}
            className="inline-flex items-center px-8 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
          >
            {props.buttonText}
          </a>
        )}
      </div>
    </section>
  );
}
```

---

## 2. FAQ Widget

### C# Model
```csharp
public class FaqWidgetModel
{
    [DisplayName("Section Title")]
    [ContentSection("Content")]
    public string SectionTitle { get; set; }

    [DisplayName("Show Search")]
    [DefaultValue(false)]
    public bool ShowSearch { get; set; }

    [DisplayName("Visible Items")]
    [DefaultValue(5)]
    public int VisibleCount { get; set; }
}
```

### Next.js Widget
```tsx
// FaqWidget.tsx — items come from Sitefinity content API in production
import type { FaqWidgetProps } from "./FaqWidget.types";

export default function FaqWidget(props: FaqWidgetProps) {
  return (
    <section className="py-16">
      <div className="container mx-auto px-6 max-w-3xl">
        {props.sectionTitle && (
          <h2 className="text-3xl font-bold mb-8">{props.sectionTitle}</h2>
        )}
        {props.showSearch && (
          <input
            type="search"
            placeholder="Search FAQs..."
            className="w-full px-4 py-3 border rounded-lg mb-6"
          />
        )}
        {/* Items loaded from Sitefinity SDK in real implementation */}
        <div className="space-y-4">
          <p className="text-gray-400 text-sm">
            Showing up to {props.visibleCount} items
          </p>
        </div>
      </div>
    </section>
  );
}
```

---

## 3. Card Grid Widget

### C# Model
```csharp
public class CardGridWidgetModel
{
    [DisplayName("Section Title")]
    [ContentSection("Content")]
    public string Title { get; set; }

    [DisplayName("Columns")]
    [DefaultValue(3)]
    [ContentSection("Layout")]
    public int Columns { get; set; }

    [DisplayName("Show Images")]
    [DefaultValue(true)]
    [ContentSection("Layout")]
    public bool ShowImages { get; set; }

    [DisplayName("CTA Label")]
    [DefaultValue("Read more")]
    [ContentSection("Content")]
    public string CtaLabel { get; set; }

    [DisplayName("Content Type")]
    [ContentSection("Data")]
    public string ContentTypeName { get; set; }
}
```

### Next.js Widget
```tsx
// CardGridWidget.tsx
import type { CardGridWidgetProps } from "./CardGridWidget.types";

const GRID_CLASSES: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
};

export default function CardGridWidget(props: CardGridWidgetProps) {
  const gridClass = GRID_CLASSES[props.columns] ?? GRID_CLASSES[3];

  return (
    <section className="py-16">
      <div className="container mx-auto px-6 max-w-7xl">
        {props.title && (
          <h2 className="text-3xl font-bold mb-10">{props.title}</h2>
        )}
        <div className={`grid ${gridClass} gap-6`}>
          {/* Cards loaded from Sitefinity SDK via contentTypeName */}
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border overflow-hidden">
              {props.showImages && (
                <div className="aspect-video bg-gray-100" />
              )}
              <div className="p-6">
                <h3 className="font-semibold mb-2">Card Title {i}</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Card description placeholder
                </p>
                <a href="#" className="text-blue-600 text-sm font-medium">
                  {props.ctaLabel} →
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

---

## 4. Pricing Table Widget

### C# Model
```csharp
public class PricingTableWidgetModel
{
    [DisplayName("Section Title")]
    [ContentSection("Content")]
    public string Title { get; set; }

    [DisplayName("Subtitle")]
    [ContentSection("Content")]
    public string Subtitle { get; set; }

    [DisplayName("Show Toggle (Monthly/Annual)")]
    [DefaultValue(true)]
    public bool ShowBillingToggle { get; set; }

    [DisplayName("Currency Symbol")]
    [DefaultValue("€")]
    public string CurrencySymbol { get; set; }

    [DisplayName("Highlight Plan Index")]
    [Description("0-based index of the plan to highlight (e.g. 1 = second plan)")]
    [DefaultValue(1)]
    public int HighlightedPlanIndex { get; set; }
}
```

### Next.js Widget
```tsx
// PricingTableWidget.tsx
"use client";

import { useState } from "react";
import type { PricingTableWidgetProps } from "./PricingTableWidget.types";

export default function PricingTableWidget(props: PricingTableWidgetProps) {
  const [annual, setAnnual] = useState(false);

  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-6 max-w-6xl text-center">
        {props.title && (
          <h2 className="text-4xl font-bold mb-4">{props.title}</h2>
        )}
        {props.subtitle && (
          <p className="text-lg text-gray-600 mb-10">{props.subtitle}</p>
        )}
        {props.showBillingToggle && (
          <div className="flex items-center justify-center gap-3 mb-12">
            <span className={!annual ? "font-semibold" : "text-gray-500"}>Monthly</span>
            <button
              onClick={() => setAnnual((a) => !a)}
              className={`relative w-12 h-6 rounded-full transition-colors ${annual ? "bg-blue-600" : "bg-gray-300"}`}
            >
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${annual ? "translate-x-7" : "translate-x-1"}`} />
            </button>
            <span className={annual ? "font-semibold" : "text-gray-500"}>Annual</span>
          </div>
        )}
        {/* Plans loaded from Sitefinity or hardcoded in designer */}
        <p className="text-gray-400 text-sm">
          Currency: {props.currencySymbol} · Highlighted plan: #{props.highlightedPlanIndex}
        </p>
      </div>
    </section>
  );
}
```

---

## Conversion Accuracy by Widget Type

| Widget | Parser Accuracy | Notes |
|--------|----------------|-------|
| Hero | ✅ 100% | All props + attributes |
| FAQ | ✅ 100% | |
| Card Grid | ✅ 100% | |
| Pricing Table | ✅ 100% | |
| Mega Menu | ⚠️ 80% | Nested model refs fail (v0.2) |
| Timeline | ⚠️ 75% | List<CustomModel> fails (v0.2) |
| Form Widget | ⚠️ 60% | Event handlers, validation attrs |
| Search Widget | ❌ 40% | Complex DI, async patterns |

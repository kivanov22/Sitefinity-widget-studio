import Link from "next/link";
import { ArrowRight, Code2, Eye, Layers, Zap } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Layers className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg">Widget Studio</span>
            <span className="ml-2 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-mono">
              v0.1.0
            </span>
          </div>
          <nav className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="/convert" className="hover:text-foreground transition-colors">
              Convert
            </Link>
            <Link href="/preview" className="hover:text-foreground transition-colors">
              Preview
            </Link>
            <Link
              href="/convert"
              className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Get Started
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="mx-auto max-w-7xl px-6 py-20">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-muted/50 text-xs text-muted-foreground mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            v0.1 — Widget Conversion Engine
          </div>
          <h1 className="text-5xl font-bold tracking-tight mb-6">
            Convert Sitefinity widgets
            <br />
            <span className="text-muted-foreground">to Next.js. Instantly.</span>
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Paste your <code className="font-mono text-sm bg-muted px-1.5 py-0.5 rounded">.cs</code> model, get a fully typed React component with props interface, metadata, and live preview — in seconds.
          </p>
          <div className="flex items-center justify-center gap-4 mt-8">
            <Link
              href="/convert"
              className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              Try the converter
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="https://github.com/your-org/sitefinity-widget-studio"
              className="flex items-center gap-2 px-6 py-3 border border-border rounded-lg font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              View on GitHub
            </a>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              icon: Code2,
              title: "Parse C# Models",
              description:
                "Drop a Sitefinity .NET Core widget model and extract all properties, attributes, and types automatically.",
              status: "Available",
              statusColor: "bg-green-100 text-green-700",
            },
            {
              icon: Zap,
              title: "Generate TypeScript",
              description:
                "Outputs a typed props interface, metadata file, and a ready-to-use React component.",
              status: "Available",
              statusColor: "bg-green-100 text-green-700",
            },
            {
              icon: Eye,
              title: "Live Preview",
              description:
                "Edit props in a form panel and see the generated widget render in real time.",
              status: "v0.3",
              statusColor: "bg-blue-100 text-blue-700",
            },
            {
              icon: Layers,
              title: "Visual Builder",
              description:
                "Drag, drop, and assemble page layouts with your converted widgets. Export as JSON.",
              status: "v0.4",
              statusColor: "bg-purple-100 text-purple-700",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="p-6 rounded-xl border border-border bg-card hover:shadow-sm transition-shadow"
            >
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mb-4">
                <feature.icon className="w-5 h-5 text-foreground" />
              </div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm">{feature.title}</h3>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${feature.statusColor}`}
                >
                  {feature.status}
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Roadmap summary */}
        <div className="mt-20 rounded-xl border border-border bg-muted/30 p-8">
          <h2 className="text-xl font-semibold mb-6">Version Roadmap</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            {[
              { version: "v0.1", label: "Parser + Generator", done: true },
              { version: "v0.2", label: "Metadata Engine", done: false },
              { version: "v0.3", label: "Preview Studio", done: false },
              { version: "v0.4", label: "Visual Builder", done: false },
              { version: "v0.5", label: "AI Conversion", done: false },
              { version: "v1.0", label: "Marketplace", done: false },
            ].map((item) => (
              <div key={item.version} className="flex items-start gap-3">
                <div
                  className={`mt-0.5 w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${
                    item.done
                      ? "bg-primary text-primary-foreground"
                      : "bg-border text-muted-foreground"
                  }`}
                >
                  {item.done ? "✓" : "·"}
                </div>
                <div>
                  <div className="font-mono text-xs text-muted-foreground">
                    {item.version}
                  </div>
                  <div className="text-sm font-medium">{item.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

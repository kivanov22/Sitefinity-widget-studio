import Link from "next/link";
import { Layers, Plus } from "lucide-react";

export function MarketplaceHeader() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto max-w-7xl px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
              <Layers className="w-3 h-3 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sm">Widget Studio</span>
          </Link>
          <span className="text-border">/</span>
          <span className="text-sm font-medium">Marketplace</span>
        </div>

        <Link
          href="/convert"
          className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-3.5 h-3.5" />
          Convert widget
        </Link>
      </div>
    </header>
  );
}

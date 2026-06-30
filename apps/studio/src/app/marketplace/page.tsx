import { Suspense } from "react";
import { MarketplaceGrid } from "@/components/marketplace/MarketplaceGrid";
import { MarketplaceHeader } from "@/components/marketplace/MarketplaceHeader";

export default function MarketplacePage() {
  return (
    <div className="min-h-screen bg-background">
      <MarketplaceHeader />
      <main className="mx-auto max-w-7xl px-6 py-8">
        <Suspense fallback={<MarketplaceGridSkeleton />}>
          <MarketplaceGrid />
        </Suspense>
      </main>
    </div>
  );
}

function MarketplaceGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-52 rounded-xl bg-muted animate-pulse" />
      ))}
    </div>
  );
}

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { SavedWidget } from "@/types/widget";
import { WidgetCard } from "./WidgetCard";
import { Database, Plus } from "lucide-react";
import Link from "next/link";

async function fetchWidgets(): Promise<SavedWidget[]> {
  const res = await fetch("/api/widgets");
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? "Failed to load widgets");
  }
  return res.json();
}

async function deleteWidgetApi(id: string): Promise<void> {
  const res = await fetch(`/api/widgets/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) throw new Error("Delete failed");
}

export function MarketplaceGrid() {
  const queryClient = useQueryClient();

  const { data: widgets, isLoading, isError, error } = useQuery({
    queryKey: ["widgets"],
    queryFn: fetchWidgets,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteWidgetApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["widgets"] }),
  });

  // Supabase not configured
  if (isError && error.message.includes("not configured")) {
    return <NotConfiguredState />;
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-52 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-8 text-center">
        <p className="text-destructive font-medium">Failed to load widgets</p>
        <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
      </div>
    );
  }

  if (!widgets || widgets.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {widgets.length} widget{widgets.length !== 1 ? "s" : ""} saved
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {widgets.map((widget) => (
          <WidgetCard
            key={widget.id}
            widget={widget}
            onDelete={() => deleteMutation.mutate(widget.id)}
            isDeleting={deleteMutation.isPending}
          />
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
        <Plus className="w-6 h-6 text-muted-foreground" />
      </div>
      <div>
        <p className="font-semibold">No widgets yet</p>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs">
          Convert a Sitefinity widget and click &ldquo;Save to Marketplace&rdquo; to see it here.
        </p>
      </div>
      <Link
        href="/convert"
        className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
      >
        Convert your first widget
      </Link>
    </div>
  );
}

function NotConfiguredState() {
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-10 text-center space-y-4">
      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto">
        <Database className="w-6 h-6 text-muted-foreground" />
      </div>
      <div>
        <p className="font-semibold">Supabase not configured</p>
        <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
          Add your Supabase credentials to <code className="bg-muted px-1.5 py-0.5 rounded text-xs">apps/studio/.env.local</code> to enable widget persistence.
        </p>
      </div>
      <div className="bg-muted rounded-lg p-4 text-left max-w-sm mx-auto">
        <p className="text-xs font-mono text-muted-foreground leading-relaxed">
          NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co<br />
          NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
        </p>
      </div>
      <p className="text-xs text-muted-foreground">
        Then run the SQL in <code className="bg-muted px-1 rounded">docs/supabase-schema.sql</code> in your Supabase project.
      </p>
    </div>
  );
}

/**
 * Supabase client — initialised from environment variables.
 *
 * Required env vars in apps/studio/.env.local:
 *   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
 *
 * To set up:
 *   1. Create a free project at https://supabase.com
 *   2. Run docs/supabase-schema.sql in the Supabase SQL Editor
 *   3. Copy Project URL + anon key into .env.local
 *   4. Install: npm install @supabase/supabase-js
 */

import { createClient } from "@supabase/supabase-js";
import type { SavedWidget } from "@/types/widget";

// ---------------------------------------------------------------------------
// Client singleton
// ---------------------------------------------------------------------------

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Returns null with a warning if env vars are not set.
 * This allows the app to run without Supabase (converter still works,
 * marketplace shows "not configured" state).
 */
function createSupabaseClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }
  return createClient(supabaseUrl, supabaseAnonKey);
}

export const supabase = createSupabaseClient();

export function isSupabaseConfigured(): boolean {
  return supabase !== null;
}

// ---------------------------------------------------------------------------
// Widget CRUD helpers
// ---------------------------------------------------------------------------

export async function saveWidget(
  payload: Omit<SavedWidget, "id" | "created_at" | "updated_at">
): Promise<SavedWidget | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("widgets")
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error("[supabase] saveWidget error:", error.message);
    return null;
  }
  return data as SavedWidget;
}

export async function listWidgets(): Promise<SavedWidget[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("widgets")
    .select("id, name, created_at, updated_at, source_type, tags, schema, generated, is_public, version")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[supabase] listWidgets error:", error.message);
    return [];
  }
  return (data ?? []) as SavedWidget[];
}

export async function getWidget(id: string): Promise<SavedWidget | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("widgets")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("[supabase] getWidget error:", error.message);
    return null;
  }
  return data as SavedWidget;
}

export async function deleteWidget(id: string): Promise<boolean> {
  if (!supabase) return false;

  const { error } = await supabase.from("widgets").delete().eq("id", id);
  if (error) {
    console.error("[supabase] deleteWidget error:", error.message);
    return false;
  }
  return true;
}

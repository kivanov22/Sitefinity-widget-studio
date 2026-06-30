/**
 * GET  /api/widgets  — list all saved widgets
 * POST /api/widgets  — save a converted widget
 */

import { NextRequest, NextResponse } from "next/server";
import { saveWidget, listWidgets, isSupabaseConfigured } from "@/lib/supabase";
import type { SaveWidgetRequest } from "@/types/widget";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local" },
      { status: 503 }
    );
  }

  const widgets = await listWidgets();
  return NextResponse.json(widgets);
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 }
    );
  }

  try {
    const body = (await request.json()) as SaveWidgetRequest;
    const { result, tags = [] } = body;

    if (!result?.schema || !result?.generated) {
      return NextResponse.json(
        { error: "Missing result.schema or result.generated in request body." },
        { status: 400 }
      );
    }

    const saved = await saveWidget({
      name: result.schema.widgetName,
      source_type: result.schema.sourceType,
      raw_source: result.schema.rawSource,
      schema: result.schema,
      generated: result.generated,
      tags,
      is_public: false,
      version: 1,
    });

    if (!saved) {
      return NextResponse.json(
        { error: "Failed to save widget to Supabase." },
        { status: 500 }
      );
    }

    return NextResponse.json(saved, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

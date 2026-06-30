/**
 * GET    /api/widgets/:id  — get a single widget
 * DELETE /api/widgets/:id  — delete a widget
 */

import { NextRequest, NextResponse } from "next/server";
import { getWidget, deleteWidget, isSupabaseConfigured } from "@/lib/supabase";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase not configured." }, { status: 503 });
  }
  const { id } = await params;
  const widget = await getWidget(id);
  if (!widget) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json(widget);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase not configured." }, { status: 503 });
  }
  const { id } = await params;
  const ok = await deleteWidget(id);
  if (!ok) return NextResponse.json({ error: "Delete failed." }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}

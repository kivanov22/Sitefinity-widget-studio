import { existsSync } from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { exportWidgetToDemo } from "@/lib/demo-export";

// fs access — this handler must run on the Node runtime, not Edge.
export const runtime = "nodejs";

export interface ExportToDemoRequest {
  entityContent: string;
  componentContent: string;
  widgetName: string;
  registrySnippet: string;
}

export interface ExportToDemoResponse {
  success: true;
  filesWritten: string[];
  registryPatched: boolean;
  message: string;
}

export interface ExportToDemoError {
  error: string;
}

const DEMO_NOT_FOUND =
  "Demo project not found at expected path. Expected: ../../demo/src/app/widgets relative to apps/studio. See README.md for the expected monorepo structure.";

export async function POST(
  request: NextRequest
): Promise<NextResponse<ExportToDemoResponse | ExportToDemoError>> {
  // This route writes files to disk. Never expose it on a deployed instance.
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Export to demo is only available in development mode." },
      { status: 403 }
    );
  }

  try {
    const body = (await request.json()) as ExportToDemoRequest;
    const { entityContent, componentContent, widgetName, registrySnippet } = body;

    if (!widgetName?.trim() || !entityContent?.trim() || !componentContent?.trim()) {
      return NextResponse.json(
        { error: "Missing widgetName, entityContent or componentContent." },
        { status: 400 }
      );
    }

    // Resolved relative to the Studio app (process.cwd() === apps/studio when running `npm run dev`).
    const widgetsDir = path.resolve(process.cwd(), "../../demo/src/app/widgets");
    const appDir = path.dirname(widgetsDir); // ../../demo/src/app
    const registryPath = path.join(appDir, "widget-registry.ts");

    // The demo's app dir must exist; the widgets/ folder itself may not yet.
    if (!existsSync(appDir)) {
      return NextResponse.json({ error: DEMO_NOT_FOUND }, { status: 404 });
    }

    const { filesWritten, registryPatched } = await exportWidgetToDemo({
      widgetsDir,
      registryPath,
      widgetName,
      entityContent,
      componentContent,
      registrySnippet: registrySnippet ?? "",
    });

    return NextResponse.json(
      {
        success: true as const,
        filesWritten,
        registryPatched,
        message: "Widget added to demo project. Restart demo dev server to test.",
      },
      { status: 200 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Export failed: ${message}` },
      { status: 500 }
    );
  }
}

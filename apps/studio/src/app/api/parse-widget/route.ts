import { NextRequest, NextResponse } from "next/server";
import { parseWidget } from "@/lib/parser-csharp";
import { parseRazorView } from "@/lib/parser-razor";
import { generateWidget } from "@/lib/widget-generator";
import type {
  ConvertRequest,
  ConvertResult,
  ConvertErrorResponse,
} from "@/types/widget";

export async function POST(
  request: NextRequest
): Promise<NextResponse<ConvertResult | ConvertErrorResponse>> {
  try {
    const body = (await request.json()) as ConvertRequest;
    const { sourceType = "viewmodel", csharpSource, razorSource } = body;

    // --- Validate input ---
    if (sourceType === "cshtml") {
      if (!razorSource?.trim()) {
        return NextResponse.json(
          { error: "Missing razorSource for cshtml sourceType." },
          { status: 400 }
        );
      }
      if (!razorSource.includes("@model")) {
        return NextResponse.json(
          {
            error: "No @model directive found. Make sure this is a Sitefinity Razor view (.cshtml) with @model at the top.",
          },
          { status: 422 }
        );
      }
    } else {
      if (!csharpSource?.trim()) {
        return NextResponse.json(
          { error: "Missing csharpSource for viewmodel sourceType." },
          { status: 400 }
        );
      }
    }

    // --- Parse ---
    const schema =
      sourceType === "cshtml"
        ? parseRazorView(razorSource!)
        : parseWidget(csharpSource!);

    if (schema.properties.length === 0) {
      return NextResponse.json(
        {
          error:
            sourceType === "cshtml"
              ? "No Model.X property usages found in the view. Is this a Sitefinity Razor view that uses @Model?"
              : "No public properties found. Make sure your C# class has public { get; set; } properties.",
          details: `Detected class: "${schema.className}"`,
        },
        { status: 422 }
      );
    }

    // --- Generate ---
    const generated = generateWidget(schema);

    return NextResponse.json({ schema, generated }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Parse failed", details: message },
      { status: 500 }
    );
  }
}

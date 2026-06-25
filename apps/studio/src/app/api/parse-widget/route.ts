import { NextRequest, NextResponse } from "next/server";
import { parseWidget } from "@/lib/parser-csharp";
import { generateWidget } from "@/lib/widget-generator";
import type { ConvertRequest, ConvertResult, ConvertErrorResponse } from "@/types/widget";

export async function POST(
  request: NextRequest
): Promise<NextResponse<ConvertResult | ConvertErrorResponse>> {
  try {
    const body = (await request.json()) as ConvertRequest;

    if (!body.csharpSource || typeof body.csharpSource !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid csharpSource in request body." },
        { status: 400 }
      );
    }

    if (body.csharpSource.trim().length < 10) {
      return NextResponse.json(
        { error: "Source is too short to be a valid C# class." },
        { status: 400 }
      );
    }

    const schema = parseWidget(body.csharpSource);

    if (schema.properties.length === 0) {
      return NextResponse.json(
        {
          error:
            "No public properties found. Make sure your C# class has public { get; set; } properties.",
          details: `Detected class: "${schema.className}"`,
        },
        { status: 422 }
      );
    }

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

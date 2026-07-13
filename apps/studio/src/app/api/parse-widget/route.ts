import { NextRequest, NextResponse } from "next/server";
import { parseWidget } from "@/lib/parser-csharp";
import { parseRazorView } from "@/lib/parser-razor";
import { parseMvcController } from "@/lib/parser-mvc-controller";
import { generateEntityFile } from "@/lib/generator-nextjs-entity";
import { generateNextjsComponent } from "@/lib/generator-nextjs-component";
import { generateRegistryEntry } from "@/lib/generator-widget-registry-entry";
import type {
  ConvertRequest,
  ConvertResult,
  ConvertErrorResponse,
  GeneratedWidget,
} from "@/types/widget";

export async function POST(
  request: NextRequest
): Promise<NextResponse<ConvertResult | ConvertErrorResponse>> {
  try {
    const body = (await request.json()) as ConvertRequest;
    const {
      sourceType = "viewmodel",
      csharpSource,
      razorSource,
      mvcModel,
      mvcInterface,
    } = body;

    // Back-compat: older callers posted the combined controller+model blob as
    // csharpSource. Treat it as the controller pane.
    const mvcController = body.mvcController ?? csharpSource;

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
    } else if (sourceType === "mvc") {
      if (!mvcController?.trim()) {
        return NextResponse.json(
          { error: "Missing mvcController for mvc sourceType." },
          { status: 400 }
        );
      }
      if (!mvcController.includes("ControllerToolboxItem")) {
        return NextResponse.json(
          {
            error: "No [ControllerToolboxItem] attribute found. Make sure this is a Sitefinity MVC widget controller with [ControllerToolboxItem(Name, Title, SectionName)].",
          },
          { status: 422 }
        );
      }
      // The Model pane is only meaningful for the nested-Model (TypeConverter) pattern.
      // Fallback widgets (SimpleContentBlock, ListWidget) keep their props on the controller.
      if (mvcController.includes("[TypeConverter(") && !mvcModel?.trim()) {
        return NextResponse.json(
          {
            error: "This controller uses [TypeConverter(typeof(ExpandableObjectConverter))], so its properties live on a nested Model class. Paste that Model class into the Model (.cs) field.",
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
    // NOTE: mvcView is accepted by the API but not yet parsed — MVC designer metadata
    // lives on the controller/model, not the view (see CLAUDE.md parser notes).
    let schema;
    if (sourceType === "cshtml") {
      schema = parseRazorView(razorSource!);
    } else if (sourceType === "mvc") {
      schema = parseMvcController(mvcController!, mvcModel, mvcInterface);
    } else {
      schema = parseWidget(csharpSource!);
    }

    if (schema.properties.length === 0) {
      return NextResponse.json(
        {
          error:
            sourceType === "cshtml"
              ? "No Model.X property usages found in the view. Is this a Sitefinity Razor view that uses @Model?"
              : sourceType === "mvc"
              ? "No public properties found in the Model class. Make sure the controller uses [TypeConverter(typeof(ExpandableObjectConverter))] on a Model property, or has its own public properties."
              : "No public properties found. Make sure your C# class has public { get; set; } properties.",
          details: `Detected class: "${schema.className}"`,
        },
        { status: 422 }
      );
    }

    // --- Generate ---
    const entity = generateEntityFile(schema);
    const component = generateNextjsComponent(schema);
    const registryEntrySnippet = generateRegistryEntry(schema);

    const generated: GeneratedWidget = {
      entityFile: entity,
      componentFile: component,
      registryEntrySnippet,
      // deprecated v0.2 fields — kept for SavedWidget DB compatibility
      typesFile: { filename: "", content: "" },
      metadataFile: { filename: "", content: "" },
    };

    return NextResponse.json({ schema, generated }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Parse failed", details: message },
      { status: 500 }
    );
  }
}

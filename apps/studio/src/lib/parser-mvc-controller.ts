/**
 * parser-mvc-controller (v0.3)
 *
 * Entry point for Sitefinity Legacy MVC widget parsing.
 *
 * Two patterns (from mvc-samples-master):
 *   1. TypeConverter pattern — [TypeConverter(typeof(ExpandableObjectConverter))]
 *      on a Model property → parse the referenced Model class
 *      (AuthorWidget, CustomImageWidget)
 *
 *   2. Fallback — no TypeConverter → parse the controller's own public properties
 *      (SimpleContentBlock, ListWidget)
 *
 * The input is a single C# source blob that may contain both controller and
 * model classes pasted together.  The parser hands off to parser-mvc-model.ts
 * to do the actual property extraction.
 */

import type { WidgetSchema } from "@/types/widget";
import type { MvcMetadata } from "@/types/widget";
import { parseMvcModelClass } from "./parser-mvc-model";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract a named argument value from a ControllerToolboxItem attribute string. */
function extractNamedArg(attrArgs: string, argName: string): string | undefined {
  const m = attrArgs.match(new RegExp(`\\b${argName}\\s*=\\s*"([^"]+)"`));
  return m?.[1];
}

/**
 * Convert a toolbox Name (e.g. "CustomImage_MVC", "Sample List") into a valid
 * PascalCase TypeScript identifier (e.g. "CustomImageMvc", "SampleList").
 */
function sanitiseIdentifier(name: string): string {
  return name
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function parseMvcController(source: string): WidgetSchema {
  // 1. Extract [ControllerToolboxItem(Name, Title, SectionName, ModuleName)]
  const toolboxAttrMatch = source.match(/\[ControllerToolboxItem\s*\(([^)]+)\)\]/);
  const attrArgs = toolboxAttrMatch?.[1] ?? "";

  const toolboxName = extractNamedArg(attrArgs, "Name") ?? "Widget";
  const title = extractNamedArg(attrArgs, "Title") ?? toolboxName;
  const sectionName = extractNamedArg(attrArgs, "SectionName") ?? "";
  const moduleName = extractNamedArg(attrArgs, "ModuleName");

  // Sanitise toolboxName → valid TS identifier used for class/function names
  const widgetName = sanitiseIdentifier(toolboxName);

  // 2. Find [TypeConverter(typeof(ExpandableObjectConverter))] property
  //    This is the MVC designer pattern — the nested Model class holds the real props.
  let nestedModelClassName: string | undefined;

  const TC_MARKER = "[TypeConverter(typeof(ExpandableObjectConverter))]";
  const tcIdx = source.indexOf(TC_MARKER);
  if (tcIdx !== -1) {
    // Look in the ~300 chars after the attribute for the property type name
    const after = source.slice(tcIdx + TC_MARKER.length, tcIdx + TC_MARKER.length + 300);
    // Match: optional whitespace/newlines, then `public [virtual] TypeName PropName {`
    const m = after.match(
      /\s*(?:public\s+)?(?:virtual\s+)?(\w+)\s+\w+\s*(?:\r?\n\s*)?\{/
    );
    if (m) nestedModelClassName = m[1];
  }

  const mvcMetadata: MvcMetadata = {
    toolboxName,
    title,
    sectionName,
    moduleName,
    nestedModelClassName,
    usedFallback: !nestedModelClassName,
  };

  // 3. Route to model class parser
  if (nestedModelClassName) {
    return parseMvcModelClass(source, nestedModelClassName, widgetName, mvcMetadata);
  }

  // Fallback: parse the controller's own public properties directly.
  // Find the controller class name to locate its body.
  const controllerClassMatch = source.match(
    /public\s+class\s+(\w+)\s*(?::\s*[^{]+)?\{/
  );
  const controllerClassName = controllerClassMatch?.[1] ?? "Widget";

  return parseMvcModelClass(source, controllerClassName, widgetName, mvcMetadata);
}

/**
 * preview-transpile (Day 5)
 *
 * Turns a generated component .tsx string into a runnable React function
 * component, client-side, for the Preview pane. No bundler — @babel/standalone
 * transpiles TSX/TS in the browser, then the result is evaluated with
 * `new Function`. Neither @babel/standalone nor react-live was already a
 * project dependency (checked package.json first); @codesandbox/sandpack-react
 * IS already installed, but its iframe/module-bundling architecture doesn't
 * fit this design — it wants a real resolvable module graph, not the
 * string-level "strip async, inline mock props" transform this needs.
 *
 * The generated component always imports from module specifiers that don't
 * resolve outside a real bundler (@progress/sitefinity-nextjs-sdk, its own
 * .entity.ts). Those imports are dropped; the runtime values they'd have
 * supplied are mocked instead (see htmlAttributes below — the entity class
 * import is never referenced at runtime, only as a type annotation, so it
 * needs no mock at all once Babel erases the types).
 *
 * Async handling: components with image properties (Day 4 Part 1) are real
 * async Server Components doing a RestClient fetch — that can't run in a
 * client-side sandbox. Rather than simulate the fetch, the one async shape
 * generator-nextjs-component.ts emits (buildImageFetches) is statically
 * rewritten to read directly from props.model.Properties.<prop> — the caller
 * (PreviewPane) feeds that key an already-resolved { Url, AlternativeText,
 * Title } object built from the prop panel's current value. This keeps the
 * transpile step (rare — only runs when the generated source changes) fully
 * decoupled from prop-value edits (frequent — every keystroke), so editing
 * the sample image URL never needs a re-transpile.
 */

import * as Babel from "@babel/standalone";
import React from "react";

/** Matches `export async function Name(` — the shape emitted only when the widget has image properties. */
export function isAsyncComponentSource(source: string): boolean {
  return /\basync\s+function\s+\w+\s*\(/.test(source);
}

/**
 * Matches the exact block buildImageFetches() emits, e.g.:
 *
 *   const backgroundImageItems = props.model.Properties.BackgroundImage
 *       ? await RestClient.getItems<SdkItem>({ ... })
 *       : null;
 *   const backgroundImage = backgroundImageItems?.Items?.[0];
 *
 * Only this shape is recognized — anything else with `await` is left alone,
 * which will fail to parse/run as a non-async function and surface as a
 * preview error. That's an honest signal this needs a new case, not a silent
 * mis-render.
 */
const IMAGE_FETCH_BLOCK_RX =
  /const (\w+)Items = props\.model\.Properties\.(\w+)\s*\?\s*await RestClient\.getItems<SdkItem>\(\{[\s\S]*?\}\)\s*:\s*null;\s*\n\s*const (\w+) = \1Items\?\.Items\?\.\[0\];/g;

/** Rewrite each recognized image-fetch block to a direct props read. */
export function stripAsyncImageFetches(source: string): string {
  return source.replace(
    IMAGE_FETCH_BLOCK_RX,
    (_match, _itemsVar, propName: string, varName: string) =>
      `const ${varName} = props.model.Properties.${propName};`
  );
}

function prepareSource(rawSource: string): { code: string; wasAsync: boolean } {
  const wasAsync = isAsyncComponentSource(rawSource);
  let code = rawSource;

  // Drop all import lines — none of their module specifiers resolve outside a
  // real bundler; runtime values they'd supply are mocked in transpileComponent.
  code = code.replace(/^import\s.*$/gm, "");

  // `export function X` / `export async function X` isn't valid inside a plain
  // function body passed to `new Function` — drop the `export` keyword only.
  code = code.replace(/export\s+(async\s+)?function/, (_m, asyncKw: string | undefined) =>
    asyncKw ? "async function" : "function"
  );

  if (wasAsync) {
    code = stripAsyncImageFetches(code);
    // No more `await` after stripping — drop `async` so the function can be
    // called and used synchronously as a normal component.
    code = code.replace(/\basync(\s+function)/, "$1");
  }

  return { code, wasAsync };
}

function extractFunctionName(preparedCode: string): string | null {
  const m = preparedCode.match(/function\s+(\w+)\s*\(/);
  return m?.[1] ?? null;
}

/** The real htmlAttributes() spreads Sitefinity page-editor data attributes —
 *  meaningless outside a real page editor context, so the preview no-ops it. */
function mockHtmlAttributes(): Record<string, unknown> {
  return {};
}

export interface TranspiledComponent {
  component: (props: Record<string, unknown>) => unknown;
  wasAsync: boolean;
}

/**
 * Transpile a generated component's .tsx source into a callable function
 * component. Throws on parse/transpile failure, or if the component's
 * function declaration can't be found — callers should catch this and show
 * the message rather than crash.
 */
export function transpileComponent(componentSource: string): TranspiledComponent {
  const { code, wasAsync } = prepareSource(componentSource);

  const functionName = extractFunctionName(code);
  if (!functionName) {
    throw new Error("Could not find the generated component's function declaration.");
  }

  const result = Babel.transform(code, {
    presets: ["react", "typescript"],
    filename: "preview-component.tsx",
  });

  if (!result.code) {
    throw new Error("Babel produced no output for the generated component.");
  }

  const factory = new Function("React", "htmlAttributes", `${result.code}\nreturn ${functionName};`);

  const component = factory(React, mockHtmlAttributes) as (props: Record<string, unknown>) => unknown;

  return { component, wasAsync };
}

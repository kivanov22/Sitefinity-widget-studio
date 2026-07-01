/**
 * generator-widget-registry-entry (v0.3)
 *
 * Generates the widget-registry.ts entry snippet for one widget.
 * The user pastes this into the `widgets: {}` object in their
 * existing widget-registry.ts file.
 *
 * Reference: nextjs-samples/src/hello-world/src/app/widget-registry.ts
 *
 * Full registry shape (for context — NOT generated here):
 *
 *   import { WidgetRegistry, initRegistry, defaultWidgetRegistry } from '@progress/sitefinity-nextjs-sdk';
 *   import { HelloWorld } from './widgets/hello-world/hello-world';
 *   import { HelloWorldEntity } from './widgets/hello-world/hello-world.entity';
 *
 *   const customWidgetRegistry: WidgetRegistry = {
 *     widgets: {
 *       'HelloWorld': { componentType: HelloWorld, entity: HelloWorldEntity, ssr: true }
 *     }
 *   };
 *   Object.keys(defaultWidgetRegistry.widgets).forEach(key => {
 *     customWidgetRegistry.widgets[key] = defaultWidgetRegistry.widgets[key];
 *   });
 *   export const widgetRegistry: WidgetRegistry = initRegistry(customWidgetRegistry);
 */

import type { WidgetSchema } from "@/types/widget";

function toKebabCase(str: string): string {
  return str
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();
}

export function generateRegistryEntry(schema: WidgetSchema): string {
  const { widgetName } = schema;
  // Registry key must be the original Sitefinity toolbox Name so existing pages
  // that reference the widget by that name continue to resolve it.
  // widgetKey is only set when it differs from widgetName (MVC source with
  // non-identifier chars like underscores). Renderer/ViewModel sources derive
  // widgetName directly from the class name so no mismatch is possible.
  const registryKey = schema.widgetKey ?? widgetName;
  const entityClassName = `${widgetName}Entity`;
  const kebabName = toKebabCase(widgetName);

  const importLines = [
    `import { ${widgetName} } from './widgets/${kebabName}/${kebabName}';`,
    `import { ${entityClassName} } from './widgets/${kebabName}/${kebabName}.entity';`,
  ].join("\n");

  const registryEntry = [
    `    '${registryKey}': {`,
    `        componentType: ${widgetName},`,
    `        entity: ${entityClassName},`,
    `        ssr: true`,
    `    }`,
  ].join("\n");

  return `${importLines}\n\n// Add to your widget-registry.ts inside widgets: {}\n${registryEntry}`;
}

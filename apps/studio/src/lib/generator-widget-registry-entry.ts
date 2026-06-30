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
  return str.replace(/([A-Z])/g, (char, _, offset) =>
    offset === 0 ? char.toLowerCase() : "-" + char.toLowerCase()
  );
}

export function generateRegistryEntry(schema: WidgetSchema): string {
  const { widgetName } = schema;
  const entityClassName = `${widgetName}Entity`;
  const kebabName = toKebabCase(widgetName);

  const importLines = [
    `import { ${widgetName} } from './widgets/${kebabName}/${kebabName}';`,
    `import { ${entityClassName} } from './widgets/${kebabName}/${kebabName}.entity';`,
  ].join("\n");

  const registryEntry = [
    `    '${widgetName}': {`,
    `        componentType: ${widgetName},`,
    `        entity: ${entityClassName},`,
    `        ssr: true`,
    `    }`,
  ].join("\n");

  return `${importLines}\n\n// Add to your widget-registry.ts inside widgets: {}\n${registryEntry}`;
}

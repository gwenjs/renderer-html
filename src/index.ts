/**
 * @file Public API for @gwenjs/renderer-html.
 *
 * @example
 * ```ts
 * import { useHTML } from '@gwenjs/renderer-html'
 * ```
 */

// Composable
export { useHTML } from "./composables/use-html.js";

// Service factory + types
export { HTMLRenderer } from "./html-renderer-service.js";
export type { HTMLRendererOptions, HTMLRendererService } from "./html-renderer-service.js";

// Plugin
export { HTMLRendererPlugin } from "./html-plugin.js";
export type { HTMLRendererPluginOptions } from "./html-plugin.js";

// Handle internals (for framework adapters)
export type { FrameworkRenderFn } from "./html-handle.js";

// GwenProvides augmentation — typed useService('renderer:html')
declare module "@gwenjs/core" {
  interface GwenProvides {
    "renderer:html": import("./html-renderer-service.js").HTMLRendererService;
  }
}

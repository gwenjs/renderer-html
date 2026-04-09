/**
 * @file GwenModule for @gwenjs/renderer-html.
 *
 * Add to gwen.config.ts:
 * ```ts
 * modules: [
 *   ['@gwenjs/renderer-html', {
 *     layers: {
 *       background: { order: 0   },
 *       hud:        { order: 100 },
 *     }
 *   }]
 * ]
 * ```
 *
 * IMPORTANT: Never import from './index.js' here — always import from './html-plugin.js'.
 */

import { defineGwenModule } from "@gwenjs/kit/module";
import { definePluginTypes } from "@gwenjs/kit/plugin";
import type { HTMLRendererPluginOptions } from "./html-plugin.js";

export default defineGwenModule<HTMLRendererPluginOptions>({
  meta: {
    name: "@gwenjs/renderer-html",
    configKey: "rendererHtml",
  },
  defaults: {
    layers: { main: { order: 0 } },
  },
  async setup(options, kit) {
    const { HTMLRendererPlugin } = await import("./html-plugin.js");

    kit.addPlugin(HTMLRendererPlugin(options));

    kit.addAutoImports([{ name: "useHTML", from: "@gwenjs/renderer-html" }]);

    kit.addTypeTemplate({
      filename: "renderer-html.d.ts",
      getContents: () =>
        definePluginTypes({
          imports: ["import type { HTMLRendererService } from '@gwenjs/renderer-html'"],
          provides: { "renderer:html": "HTMLRendererService" },
        }),
    });
  },
});

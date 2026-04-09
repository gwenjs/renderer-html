/**
 * @file GwenPlugin for the HTML renderer.
 *
 * Registers the HTMLRenderer service with the engine, wires up LayerManager,
 * and calls flush() each frame via onRender().
 */

/// <reference types="vite/client" />

import { definePlugin } from "@gwenjs/kit/plugin";
import { getOrCreateLayerManager } from "@gwenjs/renderer-core";
import { HTMLRenderer } from "./html-renderer-service.js";
import type { HTMLRendererOptions } from "./html-renderer-service.js";

export type HTMLRendererPluginOptions = HTMLRendererOptions & {
  /** DOM container to mount layers into. Defaults to document.body. */
  container?: HTMLElement;
};

export const HTMLRendererPlugin = definePlugin(
  (opts: HTMLRendererPluginOptions = { layers: { main: { order: 0 } } }) => {
    const service = HTMLRenderer({ layers: opts.layers, renderFn: opts.renderFn });

    return {
      name: "renderer:html",

      setup(engine) {
        engine.provide("renderer:html", service);

        const manager = getOrCreateLayerManager(engine, opts.container ?? document.body);
        if (import.meta.env.DEV || engine.debug) {
          manager.enableStats();
        }
        manager.register(service);

        engine.hooks.hook("engine:init", () => manager.mount());
        engine.hooks.hook("engine:stop", () => manager.unregister("renderer:html"));
      },

      onRender() {
        service.flush();
      },
    };
  },
);

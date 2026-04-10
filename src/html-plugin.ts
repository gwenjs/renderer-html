/**
 * @file GwenPlugin for the HTML renderer.
 *
 * Registers the HTMLRenderer service with the engine, wires up LayerManager,
 * and calls flush() each frame via onRender().
 *
 * Camera integration (optional):
 * When @gwenjs/camera-core is installed, world-coordinate layers automatically
 * follow the active camera. The plugin reads CameraManager and ViewportManager
 * from the engine after init and applies an orthographic CSS transform each frame.
 * Perspective cameras are not supported for CSS transforms.
 *
 * Multi-viewport:
 * Each HTMLRendererPlugin instance follows one viewport (via `viewportId` option,
 * or the first registered viewport by default). Split-screen across multiple
 * viewports is not supported in this version — the plugin name `"renderer:html"`
 * is unique and the engine deduplicates plugins by name.
 */

/// <reference types="vite/client" />

import { definePlugin } from "@gwenjs/kit/plugin";
import { getOrCreateLayerManager } from "@gwenjs/renderer-core";
import { HTMLRenderer } from "./html-renderer-service.js";
import type { HTMLRendererOptions } from "./html-renderer-service.js";
import type { CameraManager, ViewportManager } from "./camera-types.js";

export type HTMLRendererPluginOptions = HTMLRendererOptions & {
  /** DOM container to mount layers into. Defaults to document.body. */
  container?: HTMLElement;
  /**
   * Which viewport's camera to follow for world-coordinate layers.
   * Defaults to the first viewport registered with ViewportManager.
   */
  viewportId?: string;
};

export const HTMLRendererPlugin = definePlugin(
  (opts: HTMLRendererPluginOptions = { layers: { main: { order: 0 } } }) => {
    const service = HTMLRenderer({
      layers: opts.layers,
      layerTemplates: opts.layerTemplates,
      renderFn: opts.renderFn,
      viewportId: opts.viewportId,
    });

    let cameraManager: CameraManager | undefined;
    let viewportManager: ViewportManager | undefined;

    return {
      name: "renderer:html",

      setup(engine) {
        engine.provide("renderer:html", service);

        const manager = getOrCreateLayerManager(engine, opts.container ?? document.body);
        if (import.meta.env.DEV || engine.debug) {
          manager.enableStats();
        }
        manager.register(service);

        engine.hooks.hook("engine:init", () => {
          manager.mount();
          // Optional camera integration — undefined when camera-core is not installed.
          cameraManager = engine.tryInject("cameraManager");
          viewportManager = engine.tryInject("viewportManager");
        });

        engine.hooks.hook("engine:stop", () => manager.unregister("renderer:html"));
      },

      onRender() {
        service.flush();

        if (!cameraManager || !viewportManager) return;

        const allViewports = viewportManager.getAll();
        const targetId = opts.viewportId ?? allViewports.keys().next().value;
        if (targetId === undefined) return;

        const vpCtx = viewportManager.get(targetId);
        const camState = cameraManager.get(targetId);
        if (!vpCtx || !camState || !camState.active) return;

        // Only orthographic projection can be represented as a CSS transform.
        if (camState.projection.type !== "orthographic") return;

        service.applyViewportTransforms(
          targetId,
          camState.worldTransform.position.x,
          camState.worldTransform.position.y,
          camState.projection.zoom,
          vpCtx.region,
        );
      },
    };
  },
);

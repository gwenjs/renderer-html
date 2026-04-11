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
 * Each layer can declare its own `viewportId` in `HTMLLayerDef` to bind it to a specific
 * viewport. Layers without `viewportId` fall back to `opts.viewportId` (plugin-level),
 * then to the first active viewport (global fallback).
 * The plugin iterates all active viewports each frame and calls `applyViewportTransforms`
 * for each. Static viewports declared in `gwen.config.ts` are bootstrapped in `engine:init`.
 * Dynamic viewports added via `useViewportManager()` are handled by the
 * `viewport:add`, `viewport:resize`, and `viewport:remove` hooks.
 */

/// <reference types="vite/client" />

import { definePlugin } from "@gwenjs/kit/plugin";
import { getOrCreateLayerManager } from "@gwenjs/renderer-core";
import { HTMLRenderer } from "./html-renderer-service.js";
import type { HTMLRendererOptions } from "./html-renderer-service.js";
import type { CameraManager, ViewportManager, ViewportContext } from "./camera-types.js";

export type HTMLRendererPluginOptions = HTMLRendererOptions & {
  /** DOM container to mount layers into. Defaults to document.body. */
  container?: HTMLElement;
};

export const HTMLRendererPlugin = definePlugin(
  (opts: HTMLRendererPluginOptions = { layers: { main: { order: 0 } } }) => {
    let service: ReturnType<typeof HTMLRenderer>;
    let cameraManager: CameraManager | undefined;
    let viewportManager: ViewportManager | undefined;

    return {
      name: "renderer:html",

      setup(engine) {
        const log = engine.logger.child("@gwenjs/renderer-html");
        service = HTMLRenderer({
          layers: opts.layers,
          layerTemplates: opts.layerTemplates,
          renderFn: opts.renderFn,
          viewportId: opts.viewportId,
          log,
        });

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

          if (cameraManager && viewportManager) {
            log.debug("camera integration active — world-space layers will track the camera");
          } else {
            log.debug(
              "camera integration not available — install @gwenjs/camera-core to enable world-space transforms",
            );
          }

          // Bootstrap static viewports declared in gwen.config.ts.
          // These emit viewport:add before engine:init runs, so we enumerate
          // them explicitly here rather than relying on the hook.
          const staticViewports = viewportManager?.getAll() ?? new Map<string, ViewportContext>();
          for (const [id, vpCtx] of staticViewports) {
            log.debug("bootstrapping static viewport", { id });
            service.instantiateTemplates(id, vpCtx.region);
          }

          // Viewport hooks are registered here (inside engine:init) rather than in setup()
          // to guarantee that cameraManager and viewportManager are resolved before
          // any viewport hook callback can fire.
          // React to viewports added dynamically at runtime via useViewportManager().
          engine.hooks.hook("viewport:add", ({ id, region }) => {
            log.debug("viewport:add", { id });
            // Restore visibility of static layers that were hidden by a prior
            // viewport:remove for this same id.
            service.showViewportLayers(id);
            // Create template layers for the new viewport.
            service.instantiateTemplates(id, region);
          });

          engine.hooks.hook("viewport:resize", ({ id, region }) => {
            log.debug("viewport:resize", { id });
            // Re-apply transforms immediately so clip regions update without
            // waiting for the next onRender frame.
            const camState = cameraManager?.get(id);
            if (camState?.active && camState.projection.type === "orthographic") {
              service.applyViewportTransforms(
                id,
                camState.worldTransform.position.x,
                camState.worldTransform.position.y,
                camState.projection.zoom,
                region,
              );
            } else {
              // No active orthographic camera — still update clip regions for
              // screen layers bound to this viewport.
              service.applyViewportTransforms(id, 0, 0, 1, region);
            }
          });

          engine.hooks.hook("viewport:remove", ({ id }) => {
            log.debug("viewport:remove", { id });
            service.clearViewportLayers(id);
            service.destroyTemplateLayers(id);
          });
        });

        engine.hooks.hook("engine:stop", () => manager.unregister("renderer:html"));
      },

      onRender() {
        service.flush();

        if (!cameraManager || !viewportManager) return;

        for (const [vpId, vpCtx] of viewportManager.getAll()) {
          const camState = cameraManager.get(vpId);
          if (!camState?.active) continue;
          // Only orthographic projection can be represented as a CSS transform.
          if (camState.projection.type !== "orthographic") continue;
          service.applyViewportTransforms(
            vpId,
            camState.worldTransform.position.x,
            camState.worldTransform.position.y,
            camState.projection.zoom,
            vpCtx.region,
          );
        }
      },
    };
  },
);

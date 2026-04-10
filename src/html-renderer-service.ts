/**
 * @file HTMLRenderer — RendererService factory for HTML/CSS rendering.
 *
 * Built with defineRendererService. The extension field adds two methods:
 * - `allocateHandle` — returns an HTMLHandle for a given layer and slot key
 * - `applyWorldTransforms` — applies the orthographic camera transform to all
 *   world-coordinate layers each frame (called by HTMLPlugin.onRender)
 */

import {
  defineRendererService,
  UnknownLayerError,
  type LayerDef,
  type HTMLHandle,
} from "@gwenjs/renderer-core";
import { HTMLLayer } from "./html-layer.js";
import { HTMLHandleImpl, type FrameworkRenderFn } from "./html-handle.js";
import type { ViewportRegion } from "./camera-types.js";

export interface HTMLRendererOptions {
  /** Named layers this renderer manages. At least one required. */
  layers: Record<string, LayerDef>;
  /**
   * Optional framework render function (e.g. a React adapter).
   * When provided, unknown-type content passed to handle.mount() is rendered
   * via this function.
   */
  renderFn?: FrameworkRenderFn;
}

export const HTMLRenderer = defineRendererService<
  HTMLRendererOptions,
  {
    allocateHandle(layerName: string, slotKey: string): HTMLHandle;
    /**
     * Apply the orthographic camera transform to all world-coordinate layers.
     * Called by HTMLPlugin.onRender() when CameraManager is available.
     *
     * @param camX   - Camera world X (viewport center).
     * @param camY   - Camera world Y (viewport center).
     * @param zoom   - World units per pixel (from CameraState.projection.zoom).
     * @param region - Normalised viewport region [0–1].
     */
    applyWorldTransforms(camX: number, camY: number, zoom: number, region: ViewportRegion): void;
  }
>((opts) => {
  const htmlLayers = new Map<string, HTMLLayer>();
  for (const [name, def] of Object.entries(opts.layers)) {
    htmlLayers.set(name, new HTMLLayer(name, def));
  }

  let containerW = 0;
  let containerH = 0;

  return {
    name: "renderer:html",
    layers: opts.layers,
    createElement: (layerName) => htmlLayers.get(layerName)!.element,
    mount: () => {},
    unmount: () => {
      for (const layer of htmlLayers.values()) layer.element.remove();
    },
    resize: (w, h) => {
      containerW = w;
      containerH = h;
    },
    flush: ({ reportFrameTime, reportLayer }) => {
      for (const [name, layer] of htmlLayers.entries())
        reportLayer(name, { domNodes: layer.activeCount });
      reportFrameTime(0);
    },
    extension: {
      allocateHandle(layerName: string, slotKey: string): HTMLHandle {
        const layer = htmlLayers.get(layerName);
        if (!layer) throw new UnknownLayerError(layerName, "renderer:html");
        return new HTMLHandleImpl(layer, slotKey, opts.renderFn);
      },

      applyWorldTransforms(camX: number, camY: number, zoom: number, region: ViewportRegion): void {
        for (const layer of htmlLayers.values()) {
          layer.applyTransform(camX, camY, zoom, containerW, containerH, region);
        }
      },
    },
  };
});

export type HTMLRendererService = ReturnType<typeof HTMLRenderer>;

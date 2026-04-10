/**
 * @file HTMLRenderer — RendererService factory for HTML/CSS rendering.
 *
 * Built with defineRendererService. The extension adds:
 * - `allocateHandle`          — returns an HTMLHandle for a given layer and slot key
 * - `applyViewportTransforms` — applies the orthographic CSS transform to all layers
 *   whose resolved viewport matches the given id (called by HTMLPlugin.onRender)
 * - `clearViewportLayers`     — clears slots and hides layers bound to a viewport
 *   (called on viewport:remove)
 * - `showViewportLayers`      — shows layers bound to a viewport (called on viewport:add)
 * - `instantiateTemplates`    — creates template-defined layers for a new viewport
 * - `destroyTemplateLayers`   — removes template layers when their viewport is removed
 */

import {
  defineRendererService,
  UnknownLayerError,
  type LayerDef,
  type HTMLHandle,
  type RendererMountContext,
} from "@gwenjs/renderer-core";
import { HTMLLayer } from "./html-layer.js";
import type { HTMLLayerDef, HTMLLayerTemplate } from "./html-layer.js";
import { HTMLHandleImpl, type FrameworkRenderFn } from "./html-handle.js";
import type { ViewportRegion } from "./camera-types.js";
import type { GwenLogger } from "@gwenjs/core";

export interface HTMLRendererOptions {
  /**
   * Named layers this renderer manages. At least one required.
   * Use `HTMLLayerDef` (instead of `LayerDef`) to bind a layer to a specific viewport
   * via the optional `viewportId` field.
   */
  layers: Record<string, HTMLLayerDef>;
  /**
   * Layer templates instantiated for each viewport added at runtime.
   * The key pattern supports `{id}` as a placeholder for the viewport ID.
   * `viewportId` is injected automatically — do not set it in the template.
   *
   * @example
   * ```ts
   * layerTemplates: {
   *   'world_{id}': { order: 10, coordinate: 'world' },
   *   'hud_{id}':   { order: 100 },
   * }
   * // viewport 'p1' added → creates 'world_p1' and 'hud_p1'
   * ```
   */
  layerTemplates?: Record<string, HTMLLayerTemplate>;
  /**
   * Optional framework render function (e.g. a React adapter).
   * When provided, unknown-type content passed to handle.mount() is rendered
   * via this function.
   */
  renderFn?: FrameworkRenderFn;
  /**
   * Plugin-level fallback viewport ID for layers that do not declare their own
   * `viewportId`. Defaults to the first viewport registered with ViewportManager.
   */
  viewportId?: string;
  /**
   * Child logger from `engine.logger.child('@gwenjs/renderer-html')`.
   * Optional — when omitted, diagnostic output is suppressed (e.g. in unit tests).
   */
  log?: GwenLogger;
}

export const HTMLRenderer = defineRendererService<
  HTMLRendererOptions,
  {
    /**
     * Return an HTMLHandle for the given layer and slot key.
     * Throws `UnknownLayerError` for undeclared layers.
     */
    allocateHandle(layerName: string, slotKey: string): HTMLHandle;
    /**
     * Apply the orthographic camera transform to all layers whose resolved
     * viewport matches `viewportId`. Called by HTMLPlugin.onRender() for each
     * active viewport.
     *
     * Viewport resolution per layer (decreasing priority):
     * 1. `layer.def.viewportId` — explicit binding
     * 2. `opts.viewportId`      — plugin-level fallback
     * 3. First viewport ID seen by any service method — global fallback
     *
     * @param viewportId - ID of the viewport being rendered.
     * @param camX       - Camera world X (viewport centre).
     * @param camY       - Camera world Y (viewport centre).
     * @param zoom       - World units per pixel.
     * @param region     - Normalised viewport region [0–1].
     */
    applyViewportTransforms(
      viewportId: string,
      camX: number,
      camY: number,
      zoom: number,
      region: ViewportRegion,
    ): void;
    /**
     * Clear all slots and hide all layers whose resolved viewport matches
     * `viewportId`. Called on `viewport:remove`.
     * Entities must remount when the viewport is re-added.
     *
     * @param viewportId - ID of the viewport being removed.
     */
    clearViewportLayers(viewportId: string): void;
    /**
     * Show all layers whose resolved viewport matches `viewportId`.
     * Called on `viewport:add` to restore layers that were hidden by a
     * previous `viewport:remove`.
     *
     * @param viewportId - ID of the viewport being added.
     */
    showViewportLayers(viewportId: string): void;
    /**
     * Create a layer for every template in `opts.layerTemplates`, replacing
     * `{id}` in the key with `viewportId`. The new layers are appended to the
     * root container and registered in the internal layer map.
     * Called on `viewport:add` and during the `engine:init` bootstrap for
     * static viewports.
     *
     * @param viewportId - ID of the viewport being added.
     * @param region     - Normalised viewport region [0–1] for initial clipping.
     */
    instantiateTemplates(viewportId: string, region: ViewportRegion): void;
    /**
     * Remove all template-created layers for the given viewport from the DOM
     * and the internal layer map. Called on `viewport:remove`.
     *
     * @param viewportId - ID of the viewport being removed.
     */
    destroyTemplateLayers(viewportId: string): void;
  }
>((opts) => {
  const htmlLayers = new Map<string, HTMLLayer>();
  /**
   * Live layer-def registry shared with defineRendererService.
   * We keep it as a mutable object so that dynamically instantiated template
   * layers (added by `instantiateTemplates`) are visible to `getLayerElement`.
   */
  const layerRegistry: Record<string, LayerDef> = { ...opts.layers };
  for (const [name, def] of Object.entries(opts.layers)) {
    htmlLayers.set(name, new HTMLLayer(name, def));
  }

  let containerW = 0;
  let containerH = 0;
  let _container: HTMLElement | undefined;
  /** First viewport ID seen by any service method — used as global fallback for layers with no explicit binding. */
  let _firstViewportId: string | undefined;
  /** Layers created from templates, keyed by layer name. */
  const _templateLayers = new Map<string, HTMLLayer>();
  /** Template layer names grouped by the viewport ID that created them. */
  const _templateLayersByViewport = new Map<string, string[]>();
  /**
   * Resolve which viewport a layer is bound to using the three-level priority chain.
   * Returns `undefined` only when no viewport has been seen yet.
   */
  function resolveViewport(layer: HTMLLayer): string | undefined {
    return layer.def.viewportId ?? opts.viewportId ?? _firstViewportId;
  }

  return {
    name: "renderer:html",
    layers: layerRegistry,
    createElement: (layerName: string) => htmlLayers.get(layerName)!.element,
    mount: (ctx: RendererMountContext) => {
      _container = ctx.container;
    },
    unmount: () => {
      for (const layer of htmlLayers.values()) layer.element.remove();
      htmlLayers.clear();
      _templateLayers.clear();
      _templateLayersByViewport.clear();
      _container = undefined;
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
        if (!layer) {
          opts.log?.error("unknown layer requested", { layerName });
          throw new UnknownLayerError(layerName, "renderer:html");
        }
        return new HTMLHandleImpl(layer, slotKey, opts.renderFn);
      },

      applyViewportTransforms(
        viewportId: string,
        camX: number,
        camY: number,
        zoom: number,
        region: ViewportRegion,
      ): void {
        if (!_firstViewportId) _firstViewportId = viewportId;
        for (const layer of htmlLayers.values()) {
          if (resolveViewport(layer) !== viewportId) continue;
          layer.applyTransform(camX, camY, zoom, containerW, containerH, region);
        }
      },

      clearViewportLayers(viewportId: string): void {
        if (!_firstViewportId) _firstViewportId = viewportId;
        for (const layer of htmlLayers.values()) {
          if (resolveViewport(layer) !== viewportId) continue;
          layer.clearSlots();
          layer.setLayerVisible(false);
        }
      },

      showViewportLayers(viewportId: string): void {
        if (!_firstViewportId) _firstViewportId = viewportId;
        for (const layer of htmlLayers.values()) {
          if (resolveViewport(layer) !== viewportId) continue;
          layer.setLayerVisible(true);
        }
      },

      instantiateTemplates(viewportId: string, region: ViewportRegion): void {
        if (!opts.layerTemplates) return;
        if (_templateLayersByViewport.has(viewportId)) return; // already instantiated for this viewport
        const names: string[] = [];
        for (const [pattern, def] of Object.entries(opts.layerTemplates)) {
          const name = pattern.replace("{id}", viewportId);
          const layerDef: HTMLLayerDef = { ...def, viewportId };
          const layer = new HTMLLayer(name, layerDef);
          if (_container) _container.appendChild(layer.element);
          htmlLayers.set(name, layer);
          layerRegistry[name] = layerDef;
          _templateLayers.set(name, layer);
          names.push(name);
          opts.log?.debug("template layer instantiated", { name, viewportId });
          // Apply an initial clip (camera at origin, zoom 1) so the layer is
          // positioned correctly before the first onRender frame.
          layer.applyTransform(0, 0, 1, containerW, containerH, region);
        }
        _templateLayersByViewport.set(viewportId, names);
      },

      destroyTemplateLayers(viewportId: string): void {
        const names = _templateLayersByViewport.get(viewportId) ?? [];
        for (const name of names) {
          const layer = _templateLayers.get(name);
          if (layer) {
            layer.element.remove();
            htmlLayers.delete(name);
            delete layerRegistry[name];
            _templateLayers.delete(name);
            opts.log?.debug("template layer destroyed", { name, viewportId });
          }
        }
        _templateLayersByViewport.delete(viewportId);
      },
    },
  };
});

export type HTMLRendererService = ReturnType<typeof HTMLRenderer>;

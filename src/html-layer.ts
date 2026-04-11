/**
 * @file HTMLLayer — manages a single named <div> container within the HTML renderer.
 *
 * Each entity that calls useHTML() receives an allocated slot (a child div) inside
 * this layer's root element. The layer element is mounted by LayerManager into the
 * game root container.
 *
 * For `coordinate: 'world'` layers, the layer uses a two-div structure:
 * - `element` (outer) — positioned and clipped to the viewport region
 * - inner div — hosts the camera transform; entity slots are children here
 *
 * For `coordinate: 'screen'` (or unset) layers with a `viewportId`, the outer div
 * is clipped to the viewport region but carries no camera transform.
 *
 * For `coordinate: 'screen'` (or unset) layers without a `viewportId`, no
 * transform is applied — the layer remains fullscreen (managed by LayerManager).
 */

import type { GwenLogger } from "@gwenjs/core";
import type { LayerDef } from "@gwenjs/renderer-core";
import type { ViewportRegion } from "./camera-types.js";

/**
 * Layer definition for `@gwenjs/renderer-html`.
 * Extends the base `LayerDef` with an optional viewport binding.
 */
export interface HTMLLayerDef extends LayerDef {
  /**
   * Viewport this layer is bound to.
   * - Set   → layer clips (and for world layers, transforms) to this viewport's region.
   * - Unset → falls back to plugin-level `opts.viewportId`, then the first active viewport.
   */
  viewportId?: string;
}

/**
 * Template definition for a layer that is instantiated automatically for each
 * viewport added at runtime. `viewportId` is injected automatically — do not set it here.
 */
export type HTMLLayerTemplate = Omit<HTMLLayerDef, "viewportId">;

export class HTMLLayer {
  /** The root <div> element for this layer. Mounted by LayerManager. */
  readonly element: HTMLDivElement;
  /**
   * For world layers: the inner camera-transform div (entity slots are appended here).
   * For screen layers: same reference as `element`.
   */
  private readonly _inner: HTMLDivElement;
  private readonly _slots = new Map<string, HTMLDivElement>();
  /**
   * Detached div returned by `allocate()` while the layer is suspended.
   * Writes to this div are silently discarded (it is never in the DOM).
   */
  private _dummySlot: HTMLDivElement | undefined;
  /**
   * When `true`, `allocate()` returns a detached dummy slot instead of creating
   * a real DOM node. Set by `setLayerVisible(false)`, cleared by `setLayerVisible(true)`.
   * Prevents handle operations (mount, syncWorldPosition…) from recreating slots
   * after a viewport:remove — entities must remount when the viewport returns.
   */
  private _suspended = false;
  /**
   * Tracks keys that have already received a suspension warning in the current
   * suspend cycle. Cleared on `setLayerVisible(true)` to allow a fresh warning
   * if the same key operates after a future `viewport:remove`.
   */
  private _warnedSuspendedKeys = new Set<string>();
  private readonly _log: GwenLogger | undefined;
  readonly layerName: string;
  readonly def: HTMLLayerDef;

  constructor(layerName: string, def: HTMLLayerDef, log?: GwenLogger) {
    this.layerName = layerName;
    this.def = def;
    this._log = log;

    this.element = document.createElement("div");
    this.element.setAttribute("data-gwen-layer", `renderer:html:${layerName}`);

    if (def.coordinate === "world") {
      this.element.style.position = "absolute";
      this.element.style.overflow = "hidden";

      const inner = document.createElement("div");
      inner.style.position = "absolute";
      inner.style.transformOrigin = "0 0";
      this.element.appendChild(inner);
      this._inner = inner;
    } else {
      this._inner = this.element;
    }
  }

  /**
   * Allocate a container div for the given slot key (typically an entity ID string).
   * Returns the existing container if already allocated.
   * For world layers, slots are children of the inner camera-transform div.
   *
   * While the layer is suspended (viewport removed), returns a detached dummy div
   * so that handle operations become no-ops — slots are not recreated in the DOM.
   * A warning is logged when a handle operates on a suspended layer, as the entity
   * will need to remount its content when the viewport returns.
   */
  allocate(key: string): HTMLDivElement {
    if (this._suspended) {
      if (!this._warnedSuspendedKeys.has(key)) {
        this._warnedSuspendedKeys.add(key);
        this._log?.warn(
          "slot operation on suspended layer — changes are discarded until the viewport returns",
          { layer: this.layerName, key },
        );
      }
      return (this._dummySlot ??= document.createElement("div"));
    }
    if (this._slots.has(key)) return this._slots.get(key)!;

    const container = document.createElement("div");
    container.setAttribute("data-gwen-slot", key);
    container.style.position = "absolute";
    this._inner.appendChild(container);
    this._slots.set(key, container);
    return container;
  }

  /**
   * Release a slot and remove its container from the DOM.
   * Safe to call with an unknown key.
   */
  release(key: string): void {
    const container = this._slots.get(key);
    if (!container) return;
    container.remove();
    this._slots.delete(key);
  }

  /**
   * Release all active slots and remove their containers from the DOM.
   * Called when the bound viewport is removed — entities must remount when
   * the viewport is re-added.
   */
  clearSlots(): void {
    const count = this._slots.size;
    this._log?.debug("clearing all slots", { layer: this.layerName, count });
    for (const key of Array.from(this._slots.keys())) {
      this.release(key);
    }
  }

  /** Show or hide an individual slot's container. */
  setVisible(key: string, visible: boolean): void {
    const container = this._slots.get(key);
    if (!container) return;
    container.style.display = visible ? "" : "none";
  }

  /**
   * Show or hide the entire layer element and toggle the suspension flag.
   * Called by the plugin on `viewport:remove` (hide) and `viewport:add` (show).
   * Distinct from `setVisible(key)`, which acts on a single slot.
   *
   * When hidden, `allocate()` returns a detached dummy slot so that any handle
   * operations (mount, syncWorldPosition…) during suspension are safe no-ops.
   * On the next `viewport:add`, entities must remount their content.
   *
   * @param visible - `true` to show and resume, `false` to hide and suspend.
   */
  setLayerVisible(visible: boolean): void {
    this._suspended = !visible;
    if (visible) this._warnedSuspendedKeys.clear();
    this.element.style.display = visible ? "" : "none";
    this._log?.debug(visible ? "layer resumed" : "layer suspended", { layer: this.layerName });
  }

  /**
   * Apply the orthographic camera transform for this layer.
   *
   * Behaviour by layer type:
   * - **World layer**: outer div clipped to region + inner div gets
   *   `translate(vpW/2 − camX/zoom, vpH/2 − camY/zoom) scale(1/zoom)`.
   * - **Screen layer + viewportId**: outer div clipped to region, no camera transform.
   * - **Screen layer, no viewportId**: no-op — fullscreen via LayerManager.
   *
   * Entity slots using `syncWorldPosition(wx, wy)` need no changes —
   * their `translate(wx, wy)` is in world-unit space and is scaled by
   * the layer transform.
   *
   * @param camX       - Camera world X (center of viewport).
   * @param camY       - Camera world Y (center of viewport).
   * @param zoom       - World units per pixel (1 = no zoom, 2 = zoomed out 2×).
   * @param containerW - Total container width in CSS pixels.
   * @param containerH - Total container height in CSS pixels.
   * @param region     - Normalised viewport region [0–1].
   */
  applyTransform(
    camX: number,
    camY: number,
    zoom: number,
    containerW: number,
    containerH: number,
    region: ViewportRegion,
  ): void {
    if (this.def.coordinate === "world") {
      const vpX = region.x * containerW;
      const vpY = region.y * containerH;
      const vpW = region.width * containerW;
      const vpH = region.height * containerH;

      // Reset right/bottom so inset:0 from LayerManager does not fight width/height.
      this.element.style.right = "auto";
      this.element.style.bottom = "auto";
      this.element.style.left = `${vpX}px`;
      this.element.style.top = `${vpY}px`;
      this.element.style.width = `${vpW}px`;
      this.element.style.height = `${vpH}px`;

      const tx = vpW / 2 - camX / zoom;
      const ty = vpH / 2 - camY / zoom;
      this._inner.style.transform = `translate(${tx}px, ${ty}px) scale(${1 / zoom})`;
      return;
    }

    // Screen layer with viewportId: clip to viewport region, no camera transform.
    if (this.def.viewportId !== undefined) {
      const vpX = region.x * containerW;
      const vpY = region.y * containerH;
      const vpW = region.width * containerW;
      const vpH = region.height * containerH;

      // position + overflow are set here rather than in the constructor because
      // they only apply when viewportId is present at the HTMLLayerDef level —
      // a screen layer without viewportId stays fullscreen (managed by LayerManager)
      // and must not be clipped or absolutely positioned.
      // Reset right/bottom so inset:0 from LayerManager does not fight width/height.
      this.element.style.right = "auto";
      this.element.style.bottom = "auto";
      this.element.style.position = "absolute";
      this.element.style.overflow = "hidden";
      this.element.style.left = `${vpX}px`;
      this.element.style.top = `${vpY}px`;
      this.element.style.width = `${vpW}px`;
      this.element.style.height = `${vpH}px`;
      return;
    }

    // Screen layer without viewportId: fullscreen via LayerManager — no-op.
  }

  /** Number of currently allocated slots. */
  get activeCount(): number {
    return this._slots.size;
  }
}

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
 * For `coordinate: 'screen'` (or unset) layers, no camera transform is applied.
 */

import type { LayerDef } from "@gwenjs/renderer-core";
import type { ViewportRegion } from "./camera-types.js";

export class HTMLLayer {
  /** The root <div> element for this layer. Mounted by LayerManager. */
  readonly element: HTMLDivElement;
  /**
   * For world layers: the inner camera-transform div (entity slots are appended here).
   * For screen layers: same reference as `element`.
   */
  private readonly _inner: HTMLDivElement;
  private readonly _slots = new Map<string, HTMLDivElement>();
  readonly layerName: string;
  readonly def: LayerDef;

  constructor(layerName: string, def: LayerDef) {
    this.layerName = layerName;
    this.def = def;

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
   */
  allocate(key: string): HTMLDivElement {
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

  /** Show or hide a slot's container. */
  setVisible(key: string, visible: boolean): void {
    const container = this._slots.get(key);
    if (!container) return;
    container.style.display = visible ? "" : "none";
  }

  /**
   * Apply the orthographic camera transform for this world layer.
   * No-op for screen layers (`coordinate !== 'world'`).
   *
   * The outer element is positioned and sized to the viewport pixel region.
   * The inner element receives:
   * `translate(vpW/2 - camX/zoom, vpH/2 - camY/zoom) scale(1/zoom)`
   *
   * Entity slots using `syncWorldPosition(wx, wy)` need no changes —
   * their `translate(wx, wy)` is in world-unit space and is scaled by
   * the layer transform.
   *
   * @param camX      - Camera world X (center of viewport).
   * @param camY      - Camera world Y (center of viewport).
   * @param zoom      - World units per pixel (1 = no zoom, 2 = zoomed out 2×).
   * @param containerW - Total container width in CSS pixels.
   * @param containerH - Total container height in CSS pixels.
   * @param region    - Normalised viewport region [0–1].
   */
  applyTransform(
    camX: number,
    camY: number,
    zoom: number,
    containerW: number,
    containerH: number,
    region: ViewportRegion,
  ): void {
    if (this.def.coordinate !== "world") return;

    const vpX = region.x * containerW;
    const vpY = region.y * containerH;
    const vpW = region.width * containerW;
    const vpH = region.height * containerH;

    // Clear any inset shorthand (LayerManager mounts with inset:0) so that
    // explicit width/height are not over-constrained by a residual right/bottom:0.
    this.element.style.right = "auto";
    this.element.style.bottom = "auto";
    this.element.style.left = `${vpX}px`;
    this.element.style.top = `${vpY}px`;
    this.element.style.width = `${vpW}px`;
    this.element.style.height = `${vpH}px`;

    const tx = vpW / 2 - camX / zoom;
    const ty = vpH / 2 - camY / zoom;
    this._inner.style.transform = `translate(${tx}px, ${ty}px) scale(${1 / zoom})`;
  }

  /** Number of currently allocated slots. */
  get activeCount(): number {
    return this._slots.size;
  }
}

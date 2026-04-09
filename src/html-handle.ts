/**
 * @file HTMLHandle implementation.
 *
 * HTMLHandleImpl wraps one entity's slot inside an HTMLLayer. Game code
 * interacts with the HTMLHandle interface — the slot key and layer reference
 * are internal details.
 *
 * JSX support: when content is not a string and not an HTMLElement, the handle
 * calls the optional renderFn (e.g. a React adapter). If no renderFn is
 * provided, the content is coerced to a string and set as innerHTML.
 */

import type { HTMLHandle } from "@gwenjs/renderer-core";
import type { HTMLLayer } from "./html-layer.js";

/**
 * Mounts arbitrary framework content (JSX, VDOM node…) into a DOM element.
 * Provided by the renderer service when initialised with a UI framework adapter.
 *
 * @returns A cleanup function called on unmount.
 */
export type FrameworkRenderFn = (content: unknown, container: HTMLElement) => () => void;

/** @internal Concrete HTMLHandle bound to a specific layer slot. */
export class HTMLHandleImpl implements HTMLHandle {
  private readonly _layer: HTMLLayer;
  private readonly _key: string;
  private readonly _renderFn: FrameworkRenderFn | undefined;
  private _cleanup: (() => void) | undefined;

  constructor(layer: HTMLLayer, key: string, renderFn?: FrameworkRenderFn) {
    this._layer = layer;
    this._key = key;
    this._renderFn = renderFn;
  }

  mount(content: unknown): void {
    this._cleanup?.();
    this._cleanup = undefined;

    const container = this._layer.allocate(this._key);
    container.innerHTML = "";

    if (typeof content === "string") {
      container.innerHTML = content;
    } else if (content instanceof HTMLElement) {
      container.appendChild(content);
    } else if (this._renderFn) {
      this._cleanup = this._renderFn(content, container);
    } else {
      container.innerHTML = String(content);
    }
  }

  update(props: Record<string, unknown>): void {
    const container = this._layer.allocate(this._key);
    if (!this._renderFn) {
      for (const [key, value] of Object.entries(props)) {
        container.setAttribute(`data-prop-${key}`, String(value));
      }
    }
  }

  setVisible(visible: boolean): void {
    this._layer.setVisible(this._key, visible);
  }

  syncWorldPosition(x: number, y: number): void {
    const container = this._layer.allocate(this._key);
    container.style.transform = `translate(${x}px, ${y}px)`;
    container.style.position = "absolute";
    container.style.top = "0";
    container.style.left = "0";
  }

  unmount(): void {
    this._cleanup?.();
    this._cleanup = undefined;
    const container = this._layer.allocate(this._key);
    container.innerHTML = "";
    this._layer.release(this._key);
  }
}

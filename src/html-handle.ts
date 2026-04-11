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

import type { GwenLogger } from "@gwenjs/core";
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
  private readonly _log: GwenLogger | undefined;
  private _cleanup: (() => void) | undefined;

  constructor(layer: HTMLLayer, key: string, renderFn?: FrameworkRenderFn, log?: GwenLogger) {
    this._layer = layer;
    this._key = key;
    this._renderFn = renderFn;
    this._log = log;
  }

  /**
   * Mount content into this entity's slot.
   *
   * Accepts three content types:
   * - **`string`** — inserted as `innerHTML`. Content must be trusted; no
   *   sanitisation is performed. Do not pass untrusted user input here.
   * - **`HTMLElement`** — appended directly. The element is *moved* into the
   *   slot (not cloned); detach it from any existing parent before mounting.
   * - **anything else** — forwarded to the `renderFn` adapter (e.g. a JSX
   *   element). Requires `renderFn` to be configured in `HTMLRendererOptions`.
   *   If no `renderFn` is set, the value is coerced to a string via `String()`.
   *
   * Calling `mount()` a second time cleanly unmounts the previous content
   * before mounting the new one.
   *
   * @param content - Content to render into the slot.
   */
  mount(content: unknown): void {
    this._cleanup?.();
    this._cleanup = undefined;

    const container = this._layer.allocate(this._key);
    container.innerHTML = "";

    if (typeof content === "string") {
      this._log?.debug("mount html string", { layer: this._layer.layerName, key: this._key });
      container.innerHTML = content;
    } else if (content instanceof HTMLElement) {
      this._log?.debug("mount element", { layer: this._layer.layerName, key: this._key });
      container.appendChild(content);
    } else if (this._renderFn) {
      this._log?.debug("mount framework content", { layer: this._layer.layerName, key: this._key });
      this._cleanup = this._renderFn(content, container);
    } else {
      this._log?.debug("mount coerced string (no renderFn)", {
        layer: this._layer.layerName,
        key: this._key,
      });
      container.innerHTML = String(content);
    }
  }

  /**
   * Update data props on the slot container as `data-prop-*` attributes.
   *
   * **Framework-rendered slots**: when a `renderFn` was provided at init time,
   * this method is intentionally a **no-op**. The framework component receives
   * its own reactive props; attributes cannot drive a VDOM re-render. Pass
   * updated props directly to your component instead.
   *
   * @param props - Key-value pairs written as `data-prop-<key>` attributes.
   */
  update(props: Record<string, unknown>): void {
    if (this._renderFn) {
      this._log?.debug(
        "update() called on a framework-rendered slot — props are not forwarded; pass them directly to the component",
        { layer: this._layer.layerName, key: this._key },
      );
      return;
    }
    const container = this._layer.allocate(this._key);
    for (const [key, value] of Object.entries(props)) {
      container.setAttribute(`data-prop-${key}`, String(value));
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
    this._log?.debug("unmount", { layer: this._layer.layerName, key: this._key });
    this._cleanup?.();
    this._cleanup = undefined;
    const container = this._layer.allocate(this._key);
    container.innerHTML = "";
    this._layer.release(this._key);
  }
}

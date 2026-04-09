/**
 * @file HTMLLayer — manages a single named <div> container within the HTML renderer.
 *
 * Each entity that calls useHTML() receives an allocated slot (a child div) inside
 * this layer's root element. The layer element is mounted by LayerManager into the
 * game root container.
 */

import type { LayerDef } from '@gwenjs/renderer-core'

/**
 * A single named HTML rendering layer — one <div> at a specific z-index.
 * Manages per-entity slot allocation inside the layer.
 */
export class HTMLLayer {
  /** The root <div> element for this layer. Mounted by LayerManager. */
  readonly element: HTMLDivElement
  private readonly _slots = new Map<string, HTMLDivElement>()
  readonly layerName: string
  readonly def: LayerDef

  constructor(layerName: string, def: LayerDef) {
    this.layerName = layerName
    this.def = def

    this.element = document.createElement('div')
    this.element.setAttribute('data-gwen-layer', `renderer:html:${layerName}`)
  }

  /**
   * Allocate a container div for the given slot key (typically an entity ID string).
   * Returns the existing container if already allocated.
   */
  allocate(key: string): HTMLDivElement {
    if (this._slots.has(key)) return this._slots.get(key)!

    const container = document.createElement('div')
    container.setAttribute('data-gwen-slot', key)
    container.style.position = 'absolute'
    this.element.appendChild(container)
    this._slots.set(key, container)
    return container
  }

  /**
   * Release a slot and remove its container from the DOM.
   * Safe to call with an unknown key.
   */
  release(key: string): void {
    const container = this._slots.get(key)
    if (!container) return
    container.remove()
    this._slots.delete(key)
  }

  /**
   * Show or hide a slot's container.
   */
  setVisible(key: string, visible: boolean): void {
    const container = this._slots.get(key)
    if (!container) return
    container.style.display = visible ? '' : 'none'
  }

  /** Number of currently allocated slots. */
  get activeCount(): number {
    return this._slots.size
  }
}

/**
 * @file HTMLRenderer — RendererService factory for HTML/CSS rendering.
 *
 * Built with defineRendererService. allocateHandle is declared in the extension
 * field so defineRendererService merges it into the returned service with full
 * type safety — no Object.assign needed.
 *
 * TODO: once @gwenjs/renderer-core publishes the `extension` field support,
 * remove the cast on HTMLRendererService and bump the package version.
 */

import {
  defineRendererService,
  UnknownLayerError,
  type LayerDef,
  type HTMLHandle,
} from '@gwenjs/renderer-core'
import { HTMLLayer } from './html-layer.js'
import { HTMLHandleImpl, type FrameworkRenderFn } from './html-handle.js'

export interface HTMLRendererOptions {
  /** Named layers this renderer manages. At least one required. */
  layers: Record<string, LayerDef>
  /**
   * Optional framework render function (e.g. a React adapter).
   * When provided, unknown-type content passed to handle.mount() is rendered via this function.
   */
  renderFn?: FrameworkRenderFn
}

export const HTMLRenderer = defineRendererService<
  HTMLRendererOptions,
  { allocateHandle(layerName: string, slotKey: string): HTMLHandle }
>((opts) => {
  const htmlLayers = new Map<string, HTMLLayer>()
  for (const [name, def] of Object.entries(opts.layers)) {
    htmlLayers.set(name, new HTMLLayer(name, def))
  }

  return {
    name: 'renderer:html',
    layers: opts.layers,
    createElement: (layerName) => htmlLayers.get(layerName)!.element,
    mount: () => {},
    unmount: () => { for (const layer of htmlLayers.values()) layer.element.remove() },
    resize: () => {},
    flush: ({ reportFrameTime, reportLayer }) => {
      for (const [name, layer] of htmlLayers.entries())
        reportLayer(name, { domNodes: layer.activeCount })
      reportFrameTime(0)
    },
    extension: {
      allocateHandle(layerName: string, slotKey: string): HTMLHandle {
        const layer = htmlLayers.get(layerName)
        if (!layer) throw new UnknownLayerError(layerName, 'renderer:html')
        return new HTMLHandleImpl(layer, slotKey, opts.renderFn)
      },
    },
  }
})

export type HTMLRendererService = ReturnType<typeof HTMLRenderer>

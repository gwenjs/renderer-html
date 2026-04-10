import { describe, it, expect, beforeEach, vi } from 'vitest'
import { RENDERER_CONTRACT_VERSION } from '@gwenjs/renderer-core'
import { HTMLRenderer } from '../src/html-renderer-service.js'

describe('HTMLRenderer (defineRendererService)', () => {
  let service: ReturnType<typeof HTMLRenderer>

  beforeEach(() => {
    service = HTMLRenderer({
      layers: {
        background: { order: 0 },
        hud: { order: 100 },
      },
    })
  })

  it('has the correct name', () => {
    expect(service.name).toBe('renderer:html')
  })

  it('has the correct contract version', () => {
    expect(service.contractVersion).toBe(RENDERER_CONTRACT_VERSION)
  })

  it('exposes declared layers', () => {
    expect(Object.keys(service.layers)).toContain('background')
    expect(Object.keys(service.layers)).toContain('hud')
  })

  it('getLayerElement() returns a div element for a declared layer', () => {
    const el = service.getLayerElement('background')
    expect(el.tagName).toBe('DIV')
  })

  it('getLayerElement() throws for an unknown layer', () => {
    expect(() => service.getLayerElement('unknown')).toThrow()
  })

  it('mount() does not throw', () => {
    expect(() => service.mount(document.createElement('div'))).not.toThrow()
  })

  it('unmount() does not throw', () => {
    expect(() => service.unmount()).not.toThrow()
  })

  it('resize() does not throw', () => {
    expect(() => service.resize(800, 600)).not.toThrow()
  })

  it('flush() does not throw', () => {
    expect(() => service.flush()).not.toThrow()
  })

  it('allocateHandle() returns an HTMLHandle for a known layer', () => {
    const handle = service.allocateHandle('hud', 'slot-42')
    expect(typeof handle.mount).toBe('function')
    expect(typeof handle.update).toBe('function')
    expect(typeof handle.setVisible).toBe('function')
    expect(typeof handle.syncWorldPosition).toBe('function')
    expect(typeof handle.unmount).toBe('function')
  })

  it('allocateHandle() throws UnknownLayerError for an undeclared layer', () => {
    expect(() => service.allocateHandle('ghost', 'slot-1')).toThrow()
  })

  it('flush() calls reportLayer with active slot counts', () => {
    const reportLayer = vi.fn()
    const reportFrameTime = vi.fn()
    service.setStatsCollector!({ reportLayer, reportFrameTime })
    const handle = service.allocateHandle('hud', 'slot-1')
    handle.mount('<div></div>')
    service.flush()
    expect(reportLayer).toHaveBeenCalledWith('hud', expect.objectContaining({ domNodes: 1 }))
  })
})

describe('HTMLRenderer — resize + applyViewportTransforms', () => {
  it('applyViewportTransforms applies camera transform to world layers bound to the given viewport', () => {
    const service = HTMLRenderer({
      layers: {
        world: { order: 10, coordinate: 'world', viewportId: 'main' },
        hud:   { order: 100, viewportId: 'main' },
      },
    })
    service.resize(800, 600)
    service.applyViewportTransforms('main', 100, 50, 1, { x: 0, y: 0, width: 1, height: 1 })

    const worldEl = service.getLayerElement('world')
    const inner = worldEl.firstElementChild as HTMLElement
    // tx = 400 - 100/1 = 300, ty = 300 - 50/1 = 250, scale = 1
    expect(inner.style.transform).toBe('translate(300px, 250px) scale(1)')
  })

  it('applyViewportTransforms skips layers bound to a different viewport', () => {
    const service = HTMLRenderer({
      layers: {
        world_p1: { order: 10, coordinate: 'world', viewportId: 'p1' },
        world_p2: { order: 11, coordinate: 'world', viewportId: 'p2' },
      },
    })
    service.resize(800, 600)
    service.applyViewportTransforms('p1', 100, 50, 1, { x: 0, y: 0, width: 0.5, height: 1 })

    const inner_p1 = service.getLayerElement('world_p1').firstElementChild as HTMLElement
    const inner_p2 = service.getLayerElement('world_p2').firstElementChild as HTMLElement
    // p1 layer was transformed: vpW=400, tx=200-100=100, ty=300-50=250
    expect(inner_p1.style.transform).toBe('translate(100px, 250px) scale(1)')
    // p2 layer was NOT transformed
    expect(inner_p2.style.transform).toBe('')
  })

  it('applyViewportTransforms leaves screen layers untouched (no camera transform)', () => {
    const service = HTMLRenderer({
      layers: {
        world: { order: 10, coordinate: 'world', viewportId: 'main' },
        hud:   { order: 100, viewportId: 'main' },
      },
    })
    service.resize(800, 600)
    service.applyViewportTransforms('main', 100, 50, 1, { x: 0, y: 0, width: 1, height: 1 })

    const hudEl = service.getLayerElement('hud')
    expect(hudEl.style.transform).toBe('')
  })

  it('applyViewportTransforms uses opts.viewportId fallback for unbound layers', () => {
    const service = HTMLRenderer({
      layers: { world: { order: 10, coordinate: 'world' } },
      viewportId: 'main',
    })
    service.resize(800, 600)
    service.applyViewportTransforms('main', 0, 0, 1, { x: 0, y: 0, width: 1, height: 1 })

    const inner = service.getLayerElement('world').firstElementChild as HTMLElement
    expect(inner.style.transform).toBe('translate(400px, 300px) scale(1)')
  })

  it('applyViewportTransforms uses first-seen viewport as fallback when no viewportId set', () => {
    const service = HTMLRenderer({
      layers: { world: { order: 10, coordinate: 'world' } },
    })
    service.resize(800, 600)
    // First call establishes 'main' as the default
    service.applyViewportTransforms('main', 0, 0, 1, { x: 0, y: 0, width: 1, height: 1 })
    const inner = service.getLayerElement('world').firstElementChild as HTMLElement
    expect(inner.style.transform).toBe('translate(400px, 300px) scale(1)')

    // Subsequent call with a different id does NOT transform the unbound layer
    service.applyViewportTransforms('other', 999, 999, 1, { x: 0, y: 0, width: 1, height: 1 })
    expect(inner.style.transform).toBe('translate(400px, 300px) scale(1)')
  })

  it('applyViewportTransforms does not throw before resize is called', () => {
    const service = HTMLRenderer({
      layers: { world: { order: 10, coordinate: 'world', viewportId: 'main' } },
    })
    expect(() =>
      service.applyViewportTransforms('main', 0, 0, 1, { x: 0, y: 0, width: 1, height: 1 }),
    ).not.toThrow()
  })
})

describe('HTMLRenderer — clearViewportLayers', () => {
  it('clears slots and hides layers bound to the given viewport', () => {
    const service = HTMLRenderer({
      layers: {
        world: { order: 10, coordinate: 'world', viewportId: 'p1' },
        hud:   { order: 100, viewportId: 'p1' },
      },
    })
    service.resize(800, 600)
    service.allocateHandle('world', 'e1').mount('<div>player</div>')

    service.clearViewportLayers('p1')

    const worldEl = service.getLayerElement('world')
    expect(worldEl.querySelectorAll('[data-gwen-slot]').length).toBe(0)
    expect(worldEl.style.display).toBe('none')
    expect(service.getLayerElement('hud').style.display).toBe('none')
  })

  it('leaves layers bound to other viewports untouched', () => {
    const service = HTMLRenderer({
      layers: {
        world_p1: { order: 10, coordinate: 'world', viewportId: 'p1' },
        world_p2: { order: 11, coordinate: 'world', viewportId: 'p2' },
      },
    })
    service.allocateHandle('world_p2', 'e1').mount('<div></div>')
    service.clearViewportLayers('p1')

    expect(service.getLayerElement('world_p2').style.display).not.toBe('none')
  })
})

describe('HTMLRenderer — showViewportLayers', () => {
  it('shows layers that were hidden by clearViewportLayers', () => {
    const service = HTMLRenderer({
      layers: { hud: { order: 100, viewportId: 'p1' } },
    })
    service.clearViewportLayers('p1')
    expect(service.getLayerElement('hud').style.display).toBe('none')

    service.showViewportLayers('p1')
    expect(service.getLayerElement('hud').style.display).toBe('')
  })
})

describe('HTMLRenderer — instantiateTemplates + destroyTemplateLayers', () => {
  it('instantiateTemplates creates a layer with the viewport id substituted', () => {
    const container = document.createElement('div')
    const service = HTMLRenderer({
      layers: {},
      layerTemplates: { 'hud_{id}': { order: 100 } },
    })
    service.mount(container)
    service.instantiateTemplates('p1', { x: 0, y: 0, width: 0.5, height: 1 })

    const el = service.getLayerElement('hud_p1')
    expect(el.getAttribute('data-gwen-layer')).toBe('renderer:html:hud_p1')
    expect(container.contains(el)).toBe(true)
  })

  it('instantiateTemplates injects viewportId into the layer def', () => {
    const container = document.createElement('div')
    const service = HTMLRenderer({
      layers: {},
      layerTemplates: { 'world_{id}': { order: 10, coordinate: 'world' } },
    })
    service.mount(container)
    service.resize(800, 600)
    service.instantiateTemplates('p1', { x: 0, y: 0, width: 0.5, height: 1 })

    service.applyViewportTransforms('p1', 0, 0, 1, { x: 0, y: 0, width: 0.5, height: 1 })
    const inner = service.getLayerElement('world_p1').firstElementChild as HTMLElement
    expect(inner.style.transform).toBe('translate(200px, 300px) scale(1)')
  })

  it('instantiateTemplates is a no-op when called twice for the same viewport', () => {
    const container = document.createElement('div')
    const service = HTMLRenderer({
      layers: {},
      layerTemplates: { 'hud_{id}': { order: 100 } },
    })
    service.mount(container)
    service.instantiateTemplates('p1', { x: 0, y: 0, width: 1, height: 1 })
    service.instantiateTemplates('p1', { x: 0, y: 0, width: 1, height: 1 })

    // Still only one element in the container
    expect(container.querySelectorAll('[data-gwen-layer="renderer:html:hud_p1"]').length).toBe(1)
  })

  it('destroyTemplateLayers removes the layer from DOM and layer map', () => {
    const container = document.createElement('div')
    const service = HTMLRenderer({
      layers: {},
      layerTemplates: { 'hud_{id}': { order: 100 } },
    })
    service.mount(container)
    service.instantiateTemplates('p1', { x: 0, y: 0, width: 1, height: 1 })
    const el = service.getLayerElement('hud_p1')

    service.destroyTemplateLayers('p1')

    expect(container.contains(el)).toBe(false)
    expect(() => service.getLayerElement('hud_p1')).toThrow()
  })

  it('destroyTemplateLayers is a no-op when no templates were instantiated', () => {
    const service = HTMLRenderer({
      layers: {},
      layerTemplates: { 'hud_{id}': { order: 100 } },
    })
    expect(() => service.destroyTemplateLayers('p1')).not.toThrow()
  })

  it('re-instantiation after destroy creates a fresh layer', () => {
    const container = document.createElement('div')
    const service = HTMLRenderer({
      layers: {},
      layerTemplates: { 'hud_{id}': { order: 100 } },
    })
    service.mount(container)
    service.instantiateTemplates('p1', { x: 0, y: 0, width: 1, height: 1 })
    const elFirst = container.querySelector('[data-gwen-layer="renderer:html:hud_p1"]') as HTMLElement
    service.allocateHandle('hud_p1', 'slot-a').mount('<div>old</div>')

    service.destroyTemplateLayers('p1')
    service.instantiateTemplates('p1', { x: 0, y: 0, width: 1, height: 1 })

    // The layer is re-registered and accessible
    const elSecond = container.querySelector('[data-gwen-layer="renderer:html:hud_p1"]') as HTMLElement
    // Re-instantiated layer must be a new element, not the same reference
    expect(elSecond).not.toBe(elFirst)
    // Re-instantiated layer has no stale slots from the previous lifecycle
    expect(elSecond.querySelectorAll('[data-gwen-slot]').length).toBe(0)
    // The layer element is present in the container
    expect(container.contains(elSecond)).toBe(true)
  })
})

describe('HTMLRenderer — logging', () => {
  function makeLogger() {
    return {
      debug: vi.fn(),
      info:  vi.fn(),
      warn:  vi.fn(),
      error: vi.fn(),
      child: vi.fn(),
      setSink: vi.fn(),
    }
  }

  it('logs error when allocateHandle is called with an unknown layer', () => {
    const log = makeLogger()
    const service = HTMLRenderer({ layers: {}, log })
    expect(() => service.allocateHandle('ghost', 'slot')).toThrow()
    expect(log.error).toHaveBeenCalledWith(
      'unknown layer requested',
      expect.objectContaining({ layerName: 'ghost' }),
    )
  })

  it('logs debug when a template layer is instantiated', () => {
    const log = makeLogger()
    const container = document.createElement('div')
    const service = HTMLRenderer({
      layers: {},
      layerTemplates: { 'hud_{id}': { order: 100 } },
      log,
    })
    service.mount(container)
    service.instantiateTemplates('p1', { x: 0, y: 0, width: 1, height: 1 })
    expect(log.debug).toHaveBeenCalledWith(
      'template layer instantiated',
      expect.objectContaining({ name: 'hud_p1', viewportId: 'p1' }),
    )
  })

  it('logs debug when a template layer is destroyed', () => {
    const log = makeLogger()
    const container = document.createElement('div')
    const service = HTMLRenderer({
      layers: {},
      layerTemplates: { 'hud_{id}': { order: 100 } },
      log,
    })
    service.mount(container)
    service.instantiateTemplates('p1', { x: 0, y: 0, width: 1, height: 1 })
    service.destroyTemplateLayers('p1')
    expect(log.debug).toHaveBeenCalledWith(
      'template layer destroyed',
      expect.objectContaining({ name: 'hud_p1', viewportId: 'p1' }),
    )
  })

  it('does not throw when log is not provided', () => {
    const service = HTMLRenderer({ layers: {} })
    const container = document.createElement('div')
    service.mount(container)
    expect(() => service.instantiateTemplates('p1', { x: 0, y: 0, width: 1, height: 1 })).not.toThrow()
    expect(() => service.destroyTemplateLayers('p1')).not.toThrow()
    expect(() => service.allocateHandle('ghost', 'slot')).toThrow() // throws UnknownLayerError, not log error
  })
})

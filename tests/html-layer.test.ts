import { describe, it, expect, beforeEach } from 'vitest'
import { HTMLLayer } from '../src/html-layer.js'
import type { HTMLLayerDef } from '../src/html-layer.js'
import type { ViewportRegion } from '../src/camera-types.js'

describe('HTMLLayer', () => {
  let layer: HTMLLayer

  beforeEach(() => {
    layer = new HTMLLayer('hud', { order: 100 })
  })

  it('creates a div element', () => {
    expect(layer.element.tagName).toBe('DIV')
  })

  it('sets data-gwen-layer attribute', () => {
    expect(layer.element.getAttribute('data-gwen-layer')).toBe('renderer:html:hud')
  })

  it('allocates a container element for each entity slot', () => {
    const container = layer.allocate('entity-1')
    expect(container).toBeInstanceOf(HTMLElement)
    expect(layer.element.contains(container)).toBe(true)
  })

  it('returns the same container for the same slot key', () => {
    const a = layer.allocate('entity-1')
    const b = layer.allocate('entity-1')
    expect(a).toBe(b)
  })

  it('releases a container and removes it from the DOM', () => {
    const container = layer.allocate('entity-1')
    layer.release('entity-1')
    expect(layer.element.contains(container)).toBe(false)
  })

  it('is a no-op to release an unknown slot', () => {
    expect(() => layer.release('unknown')).not.toThrow()
  })

  it('tracks visible state per slot', () => {
    layer.allocate('entity-1')
    layer.setVisible('entity-1', false)
    const container = layer.allocate('entity-1')
    expect(container.style.display).toBe('none')
    layer.setVisible('entity-1', true)
    expect(container.style.display).not.toBe('none')
  })

  it('returns the number of active slots', () => {
    expect(layer.activeCount).toBe(0)
    layer.allocate('a')
    layer.allocate('b')
    expect(layer.activeCount).toBe(2)
    layer.release('a')
    expect(layer.activeCount).toBe(1)
  })
})

describe('HTMLLayer — world coordinate', () => {
  let layer: HTMLLayer

  beforeEach(() => {
    layer = new HTMLLayer('game', { order: 10, coordinate: 'world' })
  })

  it('creates an outer overflow-hidden element', () => {
    expect(layer.element.style.overflow).toBe('hidden')
    expect(layer.element.style.position).toBe('absolute')
  })

  it('mounts an inner transform div as first child of element', () => {
    const inner = layer.element.firstElementChild as HTMLElement
    expect(inner).toBeTruthy()
    expect(inner.style.position).toBe('absolute')
    expect(inner.style.transformOrigin).toBe('0 0')
  })

  it('allocates entity slots inside the inner div, not the outer element', () => {
    const slot = layer.allocate('e1')
    const inner = layer.element.firstElementChild as HTMLElement
    expect(inner.contains(slot)).toBe(true)
    expect([...layer.element.children].includes(slot)).toBe(false)
  })

  it('element.contains(slot) is still true (transitive)', () => {
    const slot = layer.allocate('e1')
    expect(layer.element.contains(slot)).toBe(true)
  })

  it('applyTransform sets inner div transform and outer clip region', () => {
    layer.applyTransform(100, 50, 1, 800, 600, { x: 0, y: 0, width: 1, height: 1 } as ViewportRegion)
    const inner = layer.element.firstElementChild as HTMLElement
    expect(inner.style.transform).toBe('translate(300px, 250px) scale(1)')
    expect(layer.element.style.left).toBe('0px')
    expect(layer.element.style.top).toBe('0px')
    expect(layer.element.style.width).toBe('800px')
    expect(layer.element.style.height).toBe('600px')
    expect(layer.element.style.right).toBe('auto')
    expect(layer.element.style.bottom).toBe('auto')
  })

  it('applyTransform applies zoom scaling', () => {
    layer.applyTransform(100, 50, 2, 800, 600, { x: 0, y: 0, width: 1, height: 1 } as ViewportRegion)
    const inner = layer.element.firstElementChild as HTMLElement
    expect(inner.style.transform).toBe('translate(350px, 275px) scale(0.5)')
  })

  it('applyTransform handles non-full-screen viewport region', () => {
    layer.applyTransform(0, 0, 1, 800, 600, { x: 0, y: 0, width: 0.5, height: 1 } as ViewportRegion)
    const inner = layer.element.firstElementChild as HTMLElement
    expect(inner.style.transform).toBe('translate(200px, 300px) scale(1)')
    expect(layer.element.style.width).toBe('400px')
  })

  it('applyTransform is a no-op on screen layers without viewportId', () => {
    const screenLayer = new HTMLLayer('hud', { order: 100 })
    screenLayer.applyTransform(100, 50, 1, 800, 600, { x: 0, y: 0, width: 1, height: 1 } as ViewportRegion)
    expect(screenLayer.element.style.transform).toBe('')
  })
})

describe('HTMLLayer — clearSlots', () => {
  it('releases all active slots and removes them from the DOM', () => {
    const layer = new HTMLLayer('game', { order: 10, coordinate: 'world' })
    layer.allocate('a')
    layer.allocate('b')
    layer.clearSlots()
    expect(layer.activeCount).toBe(0)
    expect(layer.element.querySelectorAll('[data-gwen-slot]').length).toBe(0)
  })

  it('is a no-op when there are no slots', () => {
    const layer = new HTMLLayer('hud', { order: 100 })
    expect(() => layer.clearSlots()).not.toThrow()
  })
})

describe('HTMLLayer — setLayerVisible', () => {
  it('hides the layer element', () => {
    const layer = new HTMLLayer('hud', { order: 100 })
    layer.setLayerVisible(false)
    expect(layer.element.style.display).toBe('none')
  })

  it('shows the layer element after hiding it', () => {
    const layer = new HTMLLayer('hud', { order: 100 })
    layer.setLayerVisible(false)
    layer.setLayerVisible(true)
    expect(layer.element.style.display).toBe('')
  })
})

describe('HTMLLayerDef — type compatibility', () => {
  it('accepts a plain LayerDef without viewportId (backward-compatible)', () => {
    const def: HTMLLayerDef = { order: 10 }
    expect(() => new HTMLLayer('test', def)).not.toThrow()
  })

  it('accepts a def with viewportId', () => {
    const def: HTMLLayerDef = { order: 10, viewportId: 'p1' }
    expect(() => new HTMLLayer('test', def)).not.toThrow()
  })
})

describe('HTMLLayer — screen layer with viewportId', () => {
  it('clips the layer to the viewport region', () => {
    const layer = new HTMLLayer('hud_p1', { order: 100, viewportId: 'p1' })
    layer.applyTransform(0, 0, 1, 800, 600, { x: 0, y: 0, width: 0.5, height: 1 } as ViewportRegion)
    expect(layer.element.style.position).toBe('absolute')
    expect(layer.element.style.overflow).toBe('hidden')
    expect(layer.element.style.left).toBe('0px')
    expect(layer.element.style.top).toBe('0px')
    expect(layer.element.style.width).toBe('400px')
    expect(layer.element.style.height).toBe('600px')
  })

  it('does NOT apply a camera transform to the element', () => {
    const layer = new HTMLLayer('hud_p1', { order: 100, viewportId: 'p1' })
    layer.applyTransform(100, 50, 2, 800, 600, { x: 0, y: 0, width: 0.5, height: 1 } as ViewportRegion)
    expect(layer.element.style.transform).toBe('')
  })

  it('screen layer without viewportId is fully untouched by applyTransform', () => {
    const layer = new HTMLLayer('overlay', { order: 200 })
    layer.applyTransform(100, 50, 1, 800, 600, { x: 0, y: 0, width: 1, height: 1 } as ViewportRegion)
    expect(layer.element.style.position).toBe('')
    expect(layer.element.style.left).toBe('')
  })
})

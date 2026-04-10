/**
 * Integration test: full call chain
 * HTMLPlugin.onRender() → service.applyViewportTransforms() → HTMLLayer.applyTransform() → DOM
 */
import { describe, it, expect } from 'vitest'
import { HTMLRenderer } from '../src/html-renderer-service.js'

describe('camera integration — applyViewportTransforms call chain', () => {
  it('world-space entity stays correct as camera moves', () => {
    const service = HTMLRenderer({
      layers: { world: { order: 10, coordinate: 'world', viewportId: 'main' } },
    })
    service.resize(800, 600)

    const handle = service.allocateHandle('world', 'player')
    handle.syncWorldPosition(200, 150)

    const inner = (service.getLayerElement('world')).firstElementChild as HTMLElement
    const slot = inner.querySelector('[data-gwen-slot="player"]') as HTMLElement
    expect(slot.style.transform).toContain('translate(200px, 150px)')

    // Camera at (0, 0): entity appears at (400+200, 300+150) from top-left
    service.applyViewportTransforms('main', 0, 0, 1, { x: 0, y: 0, width: 1, height: 1 })
    expect(inner.style.transform).toBe('translate(400px, 300px) scale(1)')

    // Camera moves to (100, 75): layer shifts left and up
    service.applyViewportTransforms('main', 100, 75, 1, { x: 0, y: 0, width: 1, height: 1 })
    expect(inner.style.transform).toBe('translate(300px, 225px) scale(1)')

    // Entity slot is UNCHANGED — only the layer transform moves
    expect(slot.style.transform).toContain('translate(200px, 150px)')
  })

  it('zoom scales down world-space elements', () => {
    const service = HTMLRenderer({
      layers: { world: { order: 10, coordinate: 'world', viewportId: 'main' } },
    })
    service.resize(800, 600)
    // zoom=2 → 2 world units per pixel → zoomed out, scale=0.5
    service.applyViewportTransforms('main', 0, 0, 2, { x: 0, y: 0, width: 1, height: 1 })
    const inner = (service.getLayerElement('world')).firstElementChild as HTMLElement
    expect(inner.style.transform).toBe('translate(400px, 300px) scale(0.5)')
  })

  it('HUD screen layer is never affected by camera transforms', () => {
    const service = HTMLRenderer({
      layers: {
        world: { order: 10, coordinate: 'world', viewportId: 'main' },
        hud:   { order: 100, viewportId: 'main' },
      },
    })
    service.resize(800, 600)
    service.applyViewportTransforms('main', 999, 999, 1, { x: 0, y: 0, width: 1, height: 1 })
    expect((service.getLayerElement('hud')).style.transform).toBe('')
  })

  it('two viewports each transform only their own world layer', () => {
    const service = HTMLRenderer({
      layers: {
        world_p1: { order: 10, coordinate: 'world', viewportId: 'p1' },
        world_p2: { order: 11, coordinate: 'world', viewportId: 'p2' },
      },
    })
    service.resize(800, 600)
    service.applyViewportTransforms('p1', 0, 0, 1, { x: 0, y: 0, width: 0.5, height: 1 })
    service.applyViewportTransforms('p2', 50, 25, 1, { x: 0.5, y: 0, width: 0.5, height: 1 })

    const inner_p1 = service.getLayerElement('world_p1').firstElementChild as HTMLElement
    const inner_p2 = service.getLayerElement('world_p2').firstElementChild as HTMLElement

    // p1 viewport: vpW=400, vpH=600, camX=0, camY=0 → tx=200, ty=300
    expect(inner_p1.style.transform).toBe('translate(200px, 300px) scale(1)')
    // p2 viewport: vpW=400, vpH=600, camX=50, camY=25 → tx=200-50=150, ty=300-25=275
    expect(inner_p2.style.transform).toBe('translate(150px, 275px) scale(1)')
  })
})

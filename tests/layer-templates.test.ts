/**
 * Integration test: layer template lifecycle
 * instantiateTemplates → mount content → destroyTemplateLayers → re-instantiate → content gone
 */
import { describe, it, expect } from 'vitest'
import { HTMLRenderer } from '../src/html-renderer-service.js'

describe('layer templates — full lifecycle', () => {
  function makeService() {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const service = HTMLRenderer({
      layers: {
        overlay: { order: 200 },
      },
      layerTemplates: {
        'world_{id}': { order: 10, coordinate: 'world' },
        'hud_{id}':   { order: 100 },
      },
    })
    service.mount(container)
    service.resize(800, 600)
    return { service, container }
  }

  it('instantiateTemplates creates both template layers with correct names', () => {
    const { service } = makeService()
    service.instantiateTemplates('p1', { x: 0, y: 0, width: 0.5, height: 1 })

    expect(() => service.getLayerElement('world_p1')).not.toThrow()
    expect(() => service.getLayerElement('hud_p1')).not.toThrow()
  })

  it('instantiateTemplates injects the viewport id into each template layer', () => {
    const { service } = makeService()
    service.instantiateTemplates('p1', { x: 0, y: 0, width: 0.5, height: 1 })

    // world_p1 should respond to applyViewportTransforms('p1', ...)
    service.applyViewportTransforms('p1', 0, 0, 1, { x: 0, y: 0, width: 0.5, height: 1 })
    const inner = service.getLayerElement('world_p1').firstElementChild as HTMLElement
    expect(inner.style.transform).toBe('translate(200px, 300px) scale(1)')
  })

  it('static overlay layer (no viewportId) is not affected by template lifecycle', () => {
    const { service } = makeService()
    service.instantiateTemplates('p1', { x: 0, y: 0, width: 0.5, height: 1 })
    service.destroyTemplateLayers('p1')

    expect(() => service.getLayerElement('overlay')).not.toThrow()
  })

  it('destroyTemplateLayers removes both template layers from DOM and map', () => {
    const { service, container } = makeService()
    service.instantiateTemplates('p1', { x: 0, y: 0, width: 0.5, height: 1 })
    const el = service.getLayerElement('world_p1')

    service.destroyTemplateLayers('p1')

    expect(container.contains(el)).toBe(false)
    expect(() => service.getLayerElement('world_p1')).toThrow()
    expect(() => service.getLayerElement('hud_p1')).toThrow()
  })

  it('content mounted before destroy is gone after re-instantiation', () => {
    const { service, container } = makeService()
    service.instantiateTemplates('p1', { x: 0, y: 0, width: 1, height: 1 })
    service.allocateHandle('hud_p1', 'hud-root').mount('<div id="old-hud">Player HUD</div>')
    expect(service.getLayerElement('hud_p1').innerHTML).toContain('old-hud')

    service.destroyTemplateLayers('p1')
    service.instantiateTemplates('p1', { x: 0, y: 0, width: 1, height: 1 })

    // After re-instantiation, use DOM query to get the new element (avoids internal cache)
    const newEl = container.querySelector('[data-gwen-layer="renderer:html:hud_p1"]') as HTMLElement
    expect(newEl).not.toBeNull()
    expect(newEl.innerHTML).not.toContain('old-hud')
  })

  it('two viewports each get their own independent template layers', () => {
    const { service } = makeService()
    service.instantiateTemplates('p1', { x: 0, y: 0, width: 0.5, height: 1 })
    service.instantiateTemplates('p2', { x: 0.5, y: 0, width: 0.5, height: 1 })

    expect(() => service.getLayerElement('world_p1')).not.toThrow()
    expect(() => service.getLayerElement('world_p2')).not.toThrow()

    service.destroyTemplateLayers('p1')

    // p1 layers gone, p2 layers untouched
    expect(() => service.getLayerElement('world_p1')).toThrow()
    expect(() => service.getLayerElement('world_p2')).not.toThrow()
  })

  it('clearViewportLayers + showViewportLayers round-trip restores static layer visibility', () => {
    const { service } = makeService()
    // Establish 'main' as first viewport
    service.applyViewportTransforms('main', 0, 0, 1, { x: 0, y: 0, width: 1, height: 1 })

    service.clearViewportLayers('main')
    expect(service.getLayerElement('overlay').style.display).toBe('none')

    service.showViewportLayers('main')
    expect(service.getLayerElement('overlay').style.display).toBe('')
  })
})

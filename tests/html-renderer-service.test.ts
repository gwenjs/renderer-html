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

import { describe, it, expect, beforeEach } from 'vitest'
import { HTMLLayer } from '../src/html-layer.js'

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

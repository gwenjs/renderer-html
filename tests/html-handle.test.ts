import { describe, it, expect, beforeEach, vi } from 'vitest'
import { HTMLHandleImpl } from '../src/html-handle.js'
import { HTMLLayer } from '../src/html-layer.js'

describe('HTMLHandleImpl', () => {
  let layer: HTMLLayer
  let handle: HTMLHandleImpl

  beforeEach(() => {
    layer = new HTMLLayer('hud', { order: 100 })
    handle = new HTMLHandleImpl(layer, 'slot-1')
  })

  it('mount() with a string inserts the HTML into the container', () => {
    handle.mount('<span>Hello</span>')
    const container = layer.allocate('slot-1')
    expect(container.innerHTML).toBe('<span>Hello</span>')
  })

  it('mount() with an HTMLElement appends the element', () => {
    const span = document.createElement('span')
    span.textContent = 'World'
    handle.mount(span)
    const container = layer.allocate('slot-1')
    expect(container.contains(span)).toBe(true)
  })

  it('mount() replaces previous content on second call', () => {
    handle.mount('<p>First</p>')
    handle.mount('<p>Second</p>')
    const container = layer.allocate('slot-1')
    expect(container.querySelectorAll('p').length).toBe(1)
    expect(container.textContent).toBe('Second')
  })

  it('update() sets data attributes on the container', () => {
    handle.mount('<div></div>')
    handle.update({ score: 42 })
    const container = layer.allocate('slot-1')
    expect(container.getAttribute('data-prop-score')).toBe('42')
  })

  it('setVisible(false) hides the slot container', () => {
    handle.mount('<div></div>')
    handle.setVisible(false)
    const container = layer.allocate('slot-1')
    expect(container.style.display).toBe('none')
  })

  it('setVisible(true) restores visibility', () => {
    handle.mount('<div></div>')
    handle.setVisible(false)
    handle.setVisible(true)
    const container = layer.allocate('slot-1')
    expect(container.style.display).not.toBe('none')
  })

  it('syncWorldPosition() sets transform on the container', () => {
    handle.mount('<div></div>')
    handle.syncWorldPosition(100, 200)
    const container = layer.allocate('slot-1')
    expect(container.style.transform).toContain('translate')
  })

  it('unmount() clears the container content and releases the slot', () => {
    handle.mount('<span>test</span>')
    handle.unmount()
    // After unmount the slot is released; a new allocate returns a fresh empty container
    const container = layer.allocate('slot-1')
    expect(container.innerHTML).toBe('')
  })

  it('calls framework renderFn when content is not a string or HTMLElement', () => {
    const cleanup = vi.fn()
    const renderFn = vi.fn(() => cleanup)
    const h = new HTMLHandleImpl(layer, 'slot-2', renderFn)
    const jsxNode = { type: 'div' } // fake JSX node

    h.mount(jsxNode)
    expect(renderFn).toHaveBeenCalledWith(jsxNode, expect.any(HTMLElement))

    h.unmount()
    expect(cleanup).toHaveBeenCalled()
  })
})

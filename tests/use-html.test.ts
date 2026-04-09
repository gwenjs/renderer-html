import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockUseService, mockOnCleanup } = vi.hoisted(() => ({
  mockUseService: vi.fn(),
  mockOnCleanup: vi.fn(),
}))

vi.mock('@gwenjs/core', () => ({ onCleanup: mockOnCleanup, useService: mockUseService }))
vi.mock('@gwenjs/core/system', () => ({ onCleanup: mockOnCleanup, useService: mockUseService }))

import { useHTML } from '../src/composables/use-html.js'

describe('useHTML', () => {
  const mockHandle = {
    mount: vi.fn(),
    update: vi.fn(),
    setVisible: vi.fn(),
    syncWorldPosition: vi.fn(),
    unmount: vi.fn(),
  }
  const mockService = {
    allocateHandle: vi.fn(() => mockHandle),
    layers: { background: { order: 0 }, hud: { order: 100 } },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseService.mockReturnValue(mockService)
    mockService.allocateHandle.mockReturnValue(mockHandle)
  })

  it('retrieves the renderer:html service', () => {
    useHTML('hud', 'slot-1')
    expect(mockUseService).toHaveBeenCalledWith('renderer:html')
  })

  it('calls allocateHandle with the given layer and slot key', () => {
    useHTML('hud', 'slot-1')
    expect(mockService.allocateHandle).toHaveBeenCalledWith('hud', 'slot-1')
  })

  it('defaults to the first declared layer when no layerName given', () => {
    useHTML(undefined, 'slot-2')
    expect(mockService.allocateHandle).toHaveBeenCalledWith('background', 'slot-2')
  })

  it('returns an HTMLHandle', () => {
    const handle = useHTML('hud', 'slot-1')
    expect(typeof handle.mount).toBe('function')
    expect(typeof handle.update).toBe('function')
    expect(typeof handle.setVisible).toBe('function')
    expect(typeof handle.syncWorldPosition).toBe('function')
    expect(typeof handle.unmount).toBe('function')
  })

  it('registers onCleanup to auto-unmount the handle', () => {
    useHTML('hud', 'slot-1')
    expect(mockOnCleanup).toHaveBeenCalledWith(expect.any(Function))
  })

  it('onCleanup callback calls handle.unmount()', () => {
    useHTML('hud', 'slot-1')
    const cleanupCb = mockOnCleanup.mock.calls[0][0]
    cleanupCb()
    expect(mockHandle.unmount).toHaveBeenCalled()
  })
})

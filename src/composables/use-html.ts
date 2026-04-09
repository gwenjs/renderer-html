/**
 * @file useHTML composable — the primary DX entry point for HTML rendering.
 *
 * Call inside defineActor() to get an HTMLHandle for one entity.
 * The handle is automatically unmounted when the actor is destroyed.
 *
 * @example
 * ```ts
 * export const HUDActor = defineActor(HUDPrefab, () => {
 *   const hud = useHTML('hud', String(entityId))
 *
 *   onStart(() => hud.mount('<HealthBar />'))
 *   onUpdate(() => hud.setVisible(Health.current[id] > 0))
 * })
 * ```
 */

import { onCleanup } from '@gwenjs/core'
import { useService } from '@gwenjs/core/system'
import type { HTMLHandle } from '@gwenjs/renderer-core'
import type { HTMLRendererService } from '../html-renderer-service.js'

/**
 * Returns an HTMLHandle backed by the named layer in the HTML renderer.
 * The handle is automatically unmounted when the actor is destroyed.
 *
 * @param layerName - The layer name declared in gwen.config.ts. When omitted,
 *                    the first declared layer is used (by declaration order).
 * @param slotKey   - A unique key for this entity's DOM slot (e.g. String(entityId)).
 *
 * @throws {GwenPluginNotFoundError} If `@gwenjs/renderer-html` is not installed.
 * @throws {UnknownLayerError}       If `layerName` was not declared in the renderer config.
 */
export function useHTML(layerName?: string, slotKey?: string): HTMLHandle {
  const service = useService('renderer:html')
  const resolvedLayer = layerName ?? Object.keys(service.layers)[0]
  const handle = service.allocateHandle(resolvedLayer, slotKey ?? '')
  onCleanup(() => handle.unmount())
  return handle
}

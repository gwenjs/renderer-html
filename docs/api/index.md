# useHTML()

Composable that allocates a DOM slot for one entity in a named HTML layer.

```ts
function useHTML(layerName?: string, slotKey?: string): HTMLHandle
```

**Must be called inside `defineActor()`.**

| Parameter   | Type     | Default               | Description                                                  |
|-------------|----------|-----------------------|--------------------------------------------------------------|
| `layerName` | `string` | first declared layer  | Layer name as declared in `gwen.config.ts`.                  |
| `slotKey`   | `string` | `''`                  | Unique key for this slot within the layer. Use a fixed string for singleton actors (`'hud'`, `'score'`), or `String(entityId)` when multiple instances of the same actor can coexist (NPCs, enemies…). `entityId` is the ECS entity ID available in the `defineActor` factory scope. |

**Throws**
- `GwenPluginNotFoundError` — if `@gwenjs/renderer-html` is not installed.
- `UnknownLayerError` — if `layerName` was not declared in the renderer config.

**Returns** an [`HTMLHandle`](/api/html-handle).

The handle is automatically unmounted when the actor is destroyed (`onDestroy` is registered internally).

## Example

```ts
import { defineActor, useEntityId } from '@gwenjs/core/actor'

export const BossActor = defineActor(BossPrefab, () => {
  const entityId = useEntityId()
  const nameplate = useHTML('bubbles', String(entityId))

  onStart(() => nameplate.mount('<div class="nameplate">Boss</div>'))
  onDestroy(() => { /* handle.unmount() already registered — nothing to do */ })
})
```

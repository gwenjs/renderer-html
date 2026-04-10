# Camera Integration

`@gwenjs/renderer-html` integrates automatically with `@gwenjs/camera-core` when
both plugins are installed. World-coordinate layers follow the active camera each
frame without any extra setup in entity code.

## How it works

- **Screen layers** (`coordinate: 'screen'` or unset): positions are in CSS pixels
  relative to the viewport — no camera transform applied.
- **World layers** (`coordinate: 'world'`): the layer element receives a CSS
  `translate + scale` transform derived from the active `CameraState` each frame.
  Entity slots positioned via `syncWorldPosition(wx, wy)` stay visually correct
  as the camera moves or zooms.

The plugin reads `CameraManager` and `ViewportManager` from the engine after
`engine:init`. When `@gwenjs/camera-core` is not installed both managers are
`undefined` and the camera path is silently skipped — no crash, no setup required.

## Setup

```ts
// gwen.config.ts
import { HTMLRendererPlugin } from '@gwenjs/renderer-html'

engine.use(HTMLRendererPlugin({
  layers: {
    world: { order: 10, coordinate: 'world' },
    hud:   { order: 100 },
  },
  viewportId: 'main', // optional — defaults to first registered viewport
}))
```

## Entity code

```ts
import { defineActor, useEntityId } from '@gwenjs/core/actor'
import { useHTML } from '@gwenjs/renderer-html'
import { Position } from './components.js'

export const CharacterActor = defineActor(CharacterPrefab, () => {
  const id = useEntityId()
  const handle = useHTML('world', String(id))

  onStart(() => handle.mount('<div class="label">Player</div>'))

  onRender(() => {
    // Move the DOM slot to the entity's world position each frame.
    // The layer camera transform handles projection — no camera access needed here.
    handle.syncWorldPosition(Position.x[id], Position.y[id])
  })
})
```

## Camera transform math

For an orthographic camera with zoom (world units per pixel) centered at
`(camX, camY)` over a viewport of pixel size `(vpW, vpH)`:

```
layer inner div:
  transform-origin: 0 0
  transform: translate(vpW/2 - camX/zoom, vpH/2 - camY/zoom) scale(1/zoom)

entity slot (syncWorldPosition):
  transform: translate(worldX, worldY)

Result: screenX = vpW/2 + (worldX - camX) / zoom ✓
```

Because the inner div carries the camera transform and each entity slot is a child
of that div, `syncWorldPosition` never needs to know about the camera — it simply
sets the slot's world-unit position and CSS composition does the rest.

## Limitations

- **Perspective cameras (3D):** skipped — CSS cannot represent perspective projection.
- **Split-screen:** use two `HTMLRendererPlugin` instances with different containers
  and `viewportId` values.
- **Camera rotation (2D z-axis):** not applied in this version.

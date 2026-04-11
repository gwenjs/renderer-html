# Camera Integration

`@gwenjs/renderer-html` integrates automatically with `@gwenjs/camera-core` when
both plugins are installed. World-coordinate layers follow the active camera each
frame without any extra setup in entity code.

## How it works

- **Screen layers** (`coordinate: 'screen'` or unset): positions are in CSS pixels
  relative to the viewport — no camera transform applied.
- **World layers** (`coordinate: 'world'`): the outer layer element provides
  viewport sizing/clipping, while its inner camera-transform div receives the CSS
  `translate + scale` transform derived from the active `CameraState` each frame.
  Entity slots positioned via `syncWorldPosition(wx, wy)` stay visually correct
  as the camera moves or zooms.

The plugin reads `CameraManager` and `ViewportManager` from the engine after
`engine:init`. When `@gwenjs/camera-core` is not installed both managers are
`undefined` and the camera path is silently skipped — no crash, no setup required.

## Setup

**Module system (`gwen.config.ts`):**

```ts
export default defineConfig({
  modules: [
    ['@gwenjs/renderer-html', {
      layers: {
        world: { order: 10, coordinate: 'world' },
        hud:   { order: 100 },
      },
      viewportId: 'main', // optional — defaults to first registered viewport
    }],
  ],
})
```

**Direct plugin registration:**

```ts
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

## Viewports

Viewports are declared in `gwen.config.ts` under the `viewports` key — GWEN
registers them automatically at startup, before any renderer plugin runs. You do
not configure viewports in `HTMLRendererPlugin`.

```ts
// gwen.config.ts
export default defineConfig({
  modules: ['@gwenjs/camera2d', '@gwenjs/renderer-html'],
  viewports: {
    main: { x: 0, y: 0, width: 1, height: 1 },
  },
})
```

::: tip Default viewport
If you omit `viewports` entirely, GWEN creates a single fullscreen viewport named
`'main'` automatically. You only need to declare it explicitly when you want more
than one.
:::

`HTMLRendererPlugin` follows the **first registered viewport** by default. Use
`viewportId` to target a specific one — useful when multiple viewports are declared:

```ts
// gwen.config.ts
export default defineConfig({
  modules: [
    '@gwenjs/camera2d',
    ['@gwenjs/renderer-html', { layers: { world: { order: 10, coordinate: 'world' } }, viewportId: 'main' }],
  ],
  viewports: {
    main:    { x: 0,    y: 0,    width: 1,    height: 1    },
    minimap: { x: 0.75, y: 0.75, width: 0.25, height: 0.25 },
  },
})
```

World layers clip and transform themselves to the target viewport's region
automatically — no extra CSS or container setup needed.

For viewport layouts (split-screen, minimap, 4-player grid), the dynamic
`useViewportManager()` API, and how to bind a camera to a viewport, see the
[Viewports guide](https://gwenjs.github.io/docs/rendering/viewports).

## Limitations

- **Perspective cameras (3D):** skipped — CSS cannot represent a perspective
  projection as a 2D CSS transform.
- **Split-screen:** not supported in this version. The engine deduplicates plugins
  by name and `HTMLRendererPlugin` always registers as `"renderer:html"`, so a
  second instance is silently ignored. Only one viewport can be followed per game
  instance.
- **Camera rotation (2D z-axis):** not applied in this version.

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
- **Per-layer viewport binding** (`viewportId`): each layer can declare which viewport
  it belongs to. Screen layers with a `viewportId` are clipped to that viewport's
  region.

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

For more on viewport layouts, the dynamic `useViewportManager()` API, and how to
bind a camera to a viewport, see the
[Viewports guide](https://gwenjs.github.io/docs/rendering/viewports).

## Split-screen

Bind each layer to its viewport using `viewportId` in `HTMLLayerDef`:

```ts
// gwen.config.ts
export default defineConfig({
  modules: [
    '@gwenjs/camera2d',
    ['@gwenjs/renderer-html', {
      layers: {
        world_p1: { order: 10,  coordinate: 'world', viewportId: 'p1' },
        world_p2: { order: 11,  coordinate: 'world', viewportId: 'p2' },
        hud_p1:   { order: 100, viewportId: 'p1' },
        hud_p2:   { order: 101, viewportId: 'p2' },
        overlay:  { order: 200 }, // fullscreen — no viewportId
      },
    }],
  ],
  viewports: {
    p1: { x: 0,   y: 0, width: 0.5, height: 1 },
    p2: { x: 0.5, y: 0, width: 0.5, height: 1 },
  },
})
```

Each world layer clips and transforms itself to its bound viewport's region —
no extra CSS or container setup required.

## Dynamic viewport (minimap)

Add or remove viewports at runtime via `useViewportManager()`. The plugin
reacts immediately via the `viewport:add` and `viewport:remove` hooks:

```ts
// LayoutSystem.ts
import { useViewportManager } from '@gwenjs/renderer-core'
import { defineSystem } from '@gwenjs/core/system'

export const LayoutSystem = defineSystem('LayoutSystem', () => {
  const viewports = useViewportManager()

  // When minimap is toggled on:
  viewports.set('minimap', { x: 0.75, y: 0.75, width: 0.25, height: 0.25 })
  // HTMLPlugin reacts via viewport:add — shows layers bound to 'minimap'

  // When minimap is toggled off:
  viewports.remove('minimap')
  // HTMLPlugin reacts via viewport:remove — clears and hides layers bound to 'minimap'
})
```

## N-player split-screen with layer templates

Use `layerTemplates` to create layers automatically for each viewport added at
runtime. The `{id}` placeholder in the key is replaced by the viewport ID:

```ts
// gwen.config.ts
export default defineConfig({
  modules: [
    '@gwenjs/camera2d',
    ['@gwenjs/renderer-html', {
      layers: {
        overlay: { order: 200 }, // global fullscreen layer
      },
      layerTemplates: {
        'world_{id}': { order: 10, coordinate: 'world' },
        'hud_{id}':   { order: 100 },
      },
    }],
  ],
  // Static viewports OR added at runtime via useViewportManager()
  viewports: {
    p1: { x: 0, y: 0, width: 0.5, height: 1 },
  },
})
```

```ts
// PlayerSystem.ts — mount HUD for each player that joins
import { useEngine } from '@gwenjs/core'
import { useHTML } from '@gwenjs/renderer-html'
import { defineSystem } from '@gwenjs/core/system'

export const PlayerSystem = defineSystem('PlayerSystem', () => {
  const engine = useEngine()
  const viewports = useViewportManager()

  engine.hooks.hook('viewport:add', ({ id }) => {
    // 'world_p2' and 'hud_p2' are now available — mount HUD content
    const hud = useHTML(`hud_${id}`, 'hud-root')
    hud.mount(`<div class="hud">Player ${id}</div>`)
  })

  engine.hooks.hook('viewport:remove', ({ id }) => {
    // Template layers are destroyed automatically — add local cleanup here if needed
  })

  // Player 2 joins — layers 'world_p2' and 'hud_p2' are created instantly
  viewports.set('p2', { x: 0.5, y: 0, width: 0.5, height: 1 })
})
```

## Limitations

- **Perspective cameras (3D):** skipped — CSS cannot represent a perspective
  projection as a 2D CSS transform.
- **Camera rotation (2D z-axis):** not applied in this version.

# Architecture

This page describes the internal design of `@gwenjs/renderer-html` for contributors and
integrators who need to understand how the pieces fit together.

## Data flow

```
useHTML(layerName, slotKey)
  └─ HTMLRendererService.allocateHandle()
       └─ HTMLHandleImpl  (one per entity)
            └─ HTMLLayer  (one per named layer)
                 └─ DOM <div> slots
```

The plugin drives the lifecycle from the outside:

```
HTMLRendererPlugin
  ├─ setup()         → registers service, wires LayerManager
  ├─ engine:init     → mounts layers, injects camera managers, bootstraps static viewports
  ├─ viewport:add    → showViewportLayers() + instantiateTemplates()
  ├─ viewport:resize → applyViewportTransforms() (immediate, no frame wait)
  ├─ viewport:remove → clearViewportLayers() + destroyTemplateLayers()
  └─ onRender()      → flush() + applyViewportTransforms() for each active viewport
```

## Component responsibilities

| Component | File | Responsibility |
|-----------|------|---------------|
| `HTMLRendererPlugin` | `html-plugin.ts` | Engine lifecycle, camera injection, viewport hooks |
| `HTMLRenderer` (service) | `html-renderer-service.ts` | Layer registry, handle allocation, viewport dispatch |
| `HTMLLayer` | `html-layer.ts` | DOM slot allocation, camera transform, suspension |
| `HTMLHandleImpl` | `html-handle.ts` | Per-entity mount/unmount/update interface |
| `useHTML()` | `composables/use-html.ts` | DX composable, auto-cleanup on actor destroy |

## Viewport resolution

Each layer resolves its target viewport through a three-level priority chain:

```
1. layer.def.viewportId   — explicit per-layer binding (highest priority)
2. opts.viewportId        — plugin-level fallback
3. _firstViewportId       — first viewport seen by any service method (global fallback)
```

The global fallback (`_firstViewportId`) is set the first time any service method receives
a viewport ID. A `debug` log entry is emitted at that moment if at least one layer has no
explicit binding, so you can detect unintentional reliance on this fallback.

To opt out of the fallback entirely, set `viewportId` in `HTMLRendererOptions` or in each
`HTMLLayerDef`.

## World-space coordinate math

For `coordinate: 'world'` layers, the layer uses a **two-div structure**:

```
<div data-gwen-layer="renderer:html:myLayer">   ← outer: clipped to viewport region (px)
  <div style="transform-origin: 0 0; ...">      ← inner: camera transform applied here
    <div data-gwen-slot="entityId" .../>         ← entity slot: translate(wx, wy) in world units
  </div>
</div>
```

The inner div's transform is:

```
translate(vpW/2 − camX/zoom, vpH/2 − camY/zoom) scale(1/zoom)
```

Where:
- `vpW / vpH` — viewport size in CSS pixels
- `camX / camY` — camera world-space centre
- `zoom` — world units per pixel (1 = no zoom, 2 = zoomed out 2×)

Entity slots set `translate(wx, wy)` in **world units** via `handle.syncWorldPosition(wx, wy)`.
The `scale(1/zoom)` on the inner div converts world units to pixels automatically — no per-entity
zoom math is needed.

`transform-origin: 0 0` on the inner div is critical: without it, the scale pivot would be at
the element centre and the translate math would be incorrect.

### Why reset `right` and `bottom`?

LayerManager sets `inset: 0` on all registered layer elements (equivalent to
`top: 0; right: 0; bottom: 0; left: 0`). World and viewport-bound screen layers override
`left`, `top`, `width`, and `height` with pixel values derived from the normalised region.
Without explicitly resetting `right: auto; bottom: auto`, the inherited `inset: 0` values
would conflict with the explicit `width`/`height`, causing incorrect sizing.

## Layer suspension

When a viewport is removed (`viewport:remove`), its bound layers are **suspended**:

1. `clearSlots()` removes all DOM slots (entities must remount on the next `viewport:add`).
2. `setLayerVisible(false)` hides the layer element and sets `_suspended = true`.

While suspended, `HTMLLayer.allocate()` returns a single detached **dummy slot** instead of
creating real DOM nodes. This makes all subsequent handle operations (`mount`, `syncWorldPosition`,
`setVisible`) safe no-ops — no DOM is created, no errors are thrown.

When the viewport returns (`viewport:add`), `setLayerVisible(true)` clears the suspension flag
and the layer is ready to receive new slots.

> **Note:** A `warn` log is emitted each time a handle method is called on a suspended layer.
> This surfaces entities that are still active after their viewport was removed.

## Template layers

Layer templates allow the same layer structure to be instantiated once per viewport:

```ts
layerTemplates: {
  'world_{id}': { order: 10, coordinate: 'world' },
  'hud_{id}':   { order: 100 },
}
// viewport 'p1' added → creates 'world_p1' and 'hud_p1'
// viewport 'p1' removed → destroys 'world_p1' and 'hud_p1'
```

Template layers are created by `instantiateTemplates(viewportId, region)`:

1. The `{id}` placeholder in the key pattern is replaced with the viewport ID.
2. `viewportId` is injected automatically into the layer definition.
3. The layer element is appended to the root container.
4. An initial `applyTransform(0, 0, 1, ...)` positions the layer before the first frame.
5. The layer is registered in both `htmlLayers` (service registry) and `_templateLayers`
   (for cleanup tracking).

Template layer names are grouped by viewport in `_templateLayersByViewport` so that
`destroyTemplateLayers(viewportId)` can clean up exactly the layers created for that viewport.

## Logging

The plugin creates a child logger at `engine.logger.child('@gwenjs/renderer-html')` and
passes it down to the service, layers, and handles. All diagnostic output flows through
this logger — no `console.*` calls are used.

Log levels used:

| Level | When |
|-------|------|
| `debug` | Normal lifecycle events: handle allocated, layer suspended/resumed, viewport hooks, template create/destroy |
| `warn` | Unexpected but recoverable: slot operation on a suspended layer |
| `error` | Unrecoverable configuration errors: unknown layer name passed to `allocateHandle` |

`debug` and `info` entries are suppressed in production (when `engine.debug === false`).
`warn` and `error` are always emitted.

# Design Spec — Multi-Viewport Layer Support

**Date:** 2026-04-10  
**Status:** Approved  
**Branch:** feat/html-renderer-camera (base), new branch `feat/multi-viewport-layers`

---

## Context

The current `HTMLRendererPlugin` follows a single viewport per plugin instance and
applies the same camera transform to all world layers. The plugin name
`"renderer:html"` is hardcoded, so registering it twice is silently deduplicated
by the engine — split-screen is not supported.

This spec adds per-layer viewport targeting, immediate reaction to dynamic viewport
lifecycle events, and a clean fallback chain for the simple single-viewport case.

---

## Goals

- Bind individual layers to specific viewports (`world_p1` follows `p1`, `hud_p1` clips to `p1`)
- Screen layers without a `viewportId` remain fullscreen (backward compatible)
- React immediately to `viewport:add`, `viewport:resize`, `viewport:remove` hooks
- On `viewport:remove`: clear all slots in bound layers and hide them — entities must remount when the viewport returns
- Preserve the existing `opts.viewportId` fallback for single-viewport projects (no migration required)

## Non-Goals

- Perspective camera support (CSS cannot represent it)
- Camera rotation (2D z-axis)
- A separate `ViewportLayerBridge` abstraction (over-engineering at this stage)

---

## Absolute Rules

- JSDoc in English on all new or modified code
- Tests written in English
- VitePress docs updated (`docs/guide/camera-integration.md`, `docs/api/options.md`)
- Validation before each commit: `pnpm format && pnpm lint && pnpm typecheck && pnpm test`
- Commits without co-author

---

## Architecture

### 1. Types — `HTMLLayerDef`

New type in `src/html-layer.ts`, extending `LayerDef` from `@gwenjs/renderer-core`.
`LayerDef` itself is not modified.

```ts
export interface HTMLLayerDef extends LayerDef {
  /**
   * Viewport this layer is bound to.
   * - Set   → layer clips and/or transforms to this viewport's region only.
   * - Unset → falls back to plugin-level opts.viewportId, then first active viewport.
   */
  viewportId?: string;
}
```

`HTMLRendererOptions.layers` changes from `Record<string, LayerDef>` to
`Record<string, HTMLLayerDef>`. Backward compatible — existing configs compile
without modification.

**Viewport resolution rule (decreasing priority):**

| Priority | Source | When used |
|---|---|---|
| 1 | `layer.def.viewportId` | Layer explicitly bound to a viewport |
| 2 | `opts.viewportId` | Plugin-level fallback |
| 3 | First active viewport | Global fallback |

---

### 2. `HTMLLayer`

**`applyTransform` — extended to screen layers with `viewportId`**

| Layer type | Behaviour |
|---|---|
| World layer | Outer div clipped to region + inner div camera transform (unchanged) |
| Screen layer + `viewportId` | Outer div clipped to region only, no inner transform |
| Screen layer, no `viewportId` | No-op — fullscreen via LayerManager (unchanged) |

**`clearSlots()` — new method**

Releases all active slots (`release(key)` for each). Called on `viewport:remove`.
The layer element remains in the DOM but is empty. Entities must remount when the
viewport is re-added.

**`setLayerVisible(visible: boolean)` — new method**

Toggles `display: none` on the outer element. Distinct from `setVisible(key)`
which acts on an individual slot. Called on `viewport:remove` (hide) and
`viewport:add` (show).

Constructor signature: `LayerDef` parameter type changes to `HTMLLayerDef`.

---

### 3. `HTMLRendererService` extension

**`applyViewportTransforms` — replaces `applyWorldTransforms`**

```ts
applyViewportTransforms(
  viewportId: string,
  camX: number,
  camY: number,
  zoom: number,
  region: ViewportRegion,
): void
```

Applies to all layers whose resolved viewport matches `viewportId`. For screen
layers with `viewportId`, applies only the clip region (no camera transform).
For world layers, applies the full two-div orthographic transform.

`applyWorldTransforms` is removed. Existing tests are migrated.

**`clearViewportLayers(viewportId: string)` — new method**

Iterates layers whose resolved viewport matches `viewportId`, calls `clearSlots()`
and `setLayerVisible(false)` on each.

---

### 4. `HTMLPlugin`

**Viewport hooks — wired in `setup()` after `engine:init`**

```ts
engine.hooks.hook("viewport:add", ({ id, region }) => {
  // show layers bound to id, apply initial transform
})

engine.hooks.hook("viewport:resize", ({ id, region }) => {
  // re-apply transform for layers bound to id
})

engine.hooks.hook("viewport:remove", ({ id }) => {
  // clearViewportLayers(id)
})
```

Hooks are registered inside the `engine:init` handler (after managers are
injected), so `cameraManager` and `viewportManager` are always available when
they fire.

**Timing note:** Static viewports declared in `gwen.config.ts` emit `viewport:add`
before `engine:init` runs — those events are missed by our hooks. This is
intentional: static viewports are handled by the `onRender` loop on the first
frame. The `viewport:add` / `viewport:resize` hooks are only needed for viewports
added **dynamically at runtime** via `useViewportManager()`.

On `viewport:add`, call `setLayerVisible(true)` on bound layers before applying
the transform — the layer may have been hidden by a previous `viewport:remove`.

**`onRender` — iterates all active viewports**

```ts
for (const [vpId, vpCtx] of viewportManager.getAll()) {
  const camState = cameraManager.get(vpId);
  if (!camState?.active) continue;
  if (camState.projection.type !== "orthographic") continue;
  service.applyViewportTransforms(vpId, ..., vpCtx.region);
}
```

Replaces the current single-viewport targeting.

**`opts.viewportId` — preserved**

Remains in `HTMLRendererPluginOptions` as a fallback for layers without an
explicit `viewportId`. No migration required for existing projects.

---

## Usage Examples

### Single viewport (unchanged from today)

```ts
// gwen.config.ts
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

### Split-screen (new)

```ts
// gwen.config.ts
export default defineConfig({
  modules: [
    '@gwenjs/camera2d',
    ['@gwenjs/renderer-html', {
      layers: {
        world_p1: { order: 10, coordinate: 'world', viewportId: 'p1' },
        world_p2: { order: 11, coordinate: 'world', viewportId: 'p2' },
        hud_p1:   { order: 100, viewportId: 'p1' },
        hud_p2:   { order: 101, viewportId: 'p2' },
        overlay:  { order: 200 }, // fullscreen, no viewportId
      },
    }],
  ],
  viewports: {
    p1: { x: 0,   y: 0, width: 0.5, height: 1 },
    p2: { x: 0.5, y: 0, width: 0.5, height: 1 },
  },
})
```

### Dynamic viewport (minimap toggles on at runtime)

```ts
// LayoutSystem.ts
const viewports = useViewportManager()
// When minimap is enabled:
viewports.set('minimap', { x: 0.75, y: 0.75, width: 0.25, height: 0.25 })
// HTMLPlugin reacts immediately via viewport:add hook
// When disabled:
viewports.remove('minimap')
// HTMLPlugin clears and hides layers bound to 'minimap'
```

---

## Files Changed

| File | Change |
|---|---|
| `src/html-layer.ts` | `HTMLLayerDef`, `applyTransform` extended, `clearSlots()`, `setLayerVisible()` |
| `src/html-renderer-service.ts` | `applyViewportTransforms` (replaces `applyWorldTransforms`), `clearViewportLayers()` |
| `src/html-plugin.ts` | `viewport:add/resize/remove` hooks, `onRender` loop over all viewports |
| `tests/html-layer.test.ts` | New tests: screen layer with viewportId, `clearSlots`, `setLayerVisible` |
| `tests/html-renderer-service.test.ts` | Migrate `applyWorldTransforms` → `applyViewportTransforms`, add `clearViewportLayers` tests |
| `tests/camera-integration.test.ts` | Update to multi-viewport call chain |
| `docs/guide/camera-integration.md` | Add split-screen and dynamic viewport examples |
| `docs/api/options.md` | Document `viewportId` on `HTMLLayerDef` |

---

## Testing Strategy

- Unit: `HTMLLayer` — `applyTransform` for screen+viewportId, `clearSlots`, `setLayerVisible`
- Unit: `HTMLRendererService` — `applyViewportTransforms` filter by viewportId, `clearViewportLayers`
- Integration: multi-viewport transform chain (two world layers, two viewports)
- Integration: `clearViewportLayers` removes DOM content and hides layer
- Integration: `viewport:add` after `viewport:remove` — layer becomes visible again (empty)

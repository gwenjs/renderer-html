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
- VitePress docs updated in **both English and French** (`docs/guide/`, `docs/fr/guide/`, `docs/api/`, `docs/fr/api/`)
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
before `engine:init` runs — those events are missed by our hooks. The `engine:init`
handler compensates with an explicit bootstrap:

```ts
engine.hooks.hook("engine:init", () => {
  cameraManager  = engine.tryInject("cameraManager")
  viewportManager = engine.tryInject("viewportManager")

  // Bootstrap static viewports — templates + initial transforms
  for (const [id, vpCtx] of viewportManager?.getAll() ?? []) {
    service.instantiateTemplates(id, vpCtx.region)
    // transforms applied on first onRender
  }

  // Dynamic viewports from this point on handled by hooks below
})
```

The `viewport:add` / `viewport:resize` / `viewport:remove` hooks therefore only
fire for viewports added **dynamically at runtime** via `useViewportManager()`.

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

### 5. `HTMLLayerTemplate` — Dynamic layer instantiation

New type and option in `HTMLRendererOptions`. Allows layers to be created
automatically for each viewport added at runtime.

```ts
/**
 * Template for a layer instantiated automatically when a viewport is added.
 * `viewportId` is injected automatically — do not set it here.
 */
export type HTMLLayerTemplate = Omit<HTMLLayerDef, 'viewportId'>

export interface HTMLRendererOptions {
  layers: Record<string, HTMLLayerDef>;
  /**
   * Layer templates instantiated for each viewport added at runtime.
   * Key pattern: `{id}` is replaced by the viewport ID.
   *
   * @example
   * ```ts
   * layerTemplates: {
   *   'hud_{id}':   { order: 100 },
   *   'world_{id}': { order: 10, coordinate: 'world' },
   * }
   * // viewport:add 'p1' → creates 'hud_p1' and 'world_p1'
   * ```
   */
  layerTemplates?: Record<string, HTMLLayerTemplate>;
  renderFn?: FrameworkRenderFn;
  /** Child logger from engine.logger.child('@gwenjs/renderer-html'). Optional in tests. */
  log?: GwenLogger;
}
```

`{id}` is the only supported placeholder. `viewportId` is injected automatically.

**Template layer lifecycle:**

| Event | Static layer | Template layer |
|---|---|---|
| `viewport:add` | `setLayerVisible(true)` + apply transform | Instantiated, inserted into DOM, transform applied |
| `viewport:remove` | `clearSlots()` + `setLayerVisible(false)` | Destroyed — `element.remove()` + deleted from map |
| viewport re-added | Becomes visible again (empty) | Re-instantiated from scratch |

**Z-order:** Template layers from multiple viewports share the same base `order`
(e.g. `hud_p1` and `hud_p2` both at `order: 100`). LayerManager warns on conflicts.
Since they occupy distinct regions this is visually correct — the plugin logs a
`debug` entry per instantiation so the developer can verify intent.

**New service methods:**

```ts
// Instantiates all templates for the given viewport and inserts layers into the DOM.
instantiateTemplates(viewportId: string, region: ViewportRegion): void

// Destroys all template-created layers for the given viewport (removes from DOM + map).
destroyTemplateLayers(viewportId: string): void

// Stores container ref for late DOM insertion of template layers.
mount(container: HTMLElement): void  // was no-op, now stores ref
```

---

### 6. Logging — child logger

The plugin creates a child logger in `setup()` and passes it to the service:

```ts
setup(engine) {
  const log = engine.logger.child('@gwenjs/renderer-html')
  const service = HTMLRenderer({ layers, layerTemplates, renderFn, log })
}
```

`log` is stored on the service and used for all diagnostic output:

| Situation | Level |
|---|---|
| Template layer instantiated | `debug` |
| Template layer destroyed | `debug` |
| Z-order conflict between template layers | `warn` |
| Viewport not found during transform | `debug` |
| Unknown layer name requested | `error` |

`log` is optional in `HTMLRendererOptions` so unit tests that construct the
service directly do not need a mock logger.

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

### N-player split-screen with layer templates

```ts
// gwen.config.ts — declare templates, not fixed layers
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
  // viewports declared statically OR added at runtime via useViewportManager()
  viewports: {
    p1: { x: 0, y: 0, width: 0.5, height: 1 },
  },
})

// PlayerSystem.ts — mounts HUD for any player that joins
engine.hooks.hook('viewport:add', ({ id }) => {
  // 'world_p2' and 'hud_p2' are now created — mount HUD content
  const hud = useHTML(`hud_${id}`, 'hud-root')
  hud.mount(<PlayerHUD playerId={id} />)
})

engine.hooks.hook('viewport:remove', ({ id }) => {
  // template layers for this viewport are destroyed automatically
  // handle any local cleanup here if needed
})

// At runtime — player 2 joins
viewports.set('p2', { x: 0.5, y: 0, width: 0.5, height: 1 })
// → 'world_p2' and 'hud_p2' created, PlayerHUD mounted
```

---

## Files Changed

| File | Change |
|---|---|
| `src/html-layer.ts` | `HTMLLayerDef`, `HTMLLayerTemplate`, `applyTransform` extended, `clearSlots()`, `setLayerVisible()` |
| `src/html-renderer-service.ts` | `applyViewportTransforms` (replaces `applyWorldTransforms`), `clearViewportLayers()`, `instantiateTemplates()`, `destroyTemplateLayers()`, `mount()` stores container ref, `log` option |
| `src/html-plugin.ts` | child logger, `viewport:add/resize/remove` hooks, `onRender` loop over all viewports |
| `tests/html-layer.test.ts` | New: screen+viewportId clip, `clearSlots`, `setLayerVisible` |
| `tests/html-renderer-service.test.ts` | Migrate `applyWorldTransforms` → `applyViewportTransforms`, add `clearViewportLayers`, `instantiateTemplates`, `destroyTemplateLayers` tests |
| `tests/camera-integration.test.ts` | Update to multi-viewport + template layer call chain |
| `tests/layer-templates.test.ts` | New: full template lifecycle (instantiate → destroy → re-instantiate) |
| `docs/guide/camera-integration.md` | Split-screen, dynamic viewport, N-player template examples |
| `docs/fr/guide/camera-integration.md` | French translation of the above |
| `docs/api/options.md` | Document `HTMLLayerDef.viewportId`, `layerTemplates`, `log` |
| `docs/fr/api/options.md` | French translation of the above |

---

## Testing Strategy

- Unit: `HTMLLayer` — `applyTransform` for screen+viewportId, `clearSlots`, `setLayerVisible`
- Unit: `HTMLRendererService` — `applyViewportTransforms` filter by viewportId, `clearViewportLayers`, logger calls
- Unit: `instantiateTemplates` — layer created with correct name, order, viewportId; inserted into DOM
- Unit: `destroyTemplateLayers` — layer removed from DOM and map
- Integration: multi-viewport transform chain (two world layers, two distinct viewports)
- Integration: `clearViewportLayers` — slots cleared, layer hidden, content gone
- Integration: `viewport:add` after `viewport:remove` — static layer visible again (empty)
- Integration: template full lifecycle — `instantiateTemplates` → mount content → `destroyTemplateLayers` → re-instantiate → content gone

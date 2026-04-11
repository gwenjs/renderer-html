# HTMLRendererOptions

Options passed to the module in `gwen.config.ts` or directly to `HTMLRendererPlugin`.

```ts
interface HTMLRendererPluginOptions {
  layers: Record<string, HTMLLayerDef>
  layerTemplates?: Record<string, HTMLLayerTemplate>
  renderFn?: FrameworkRenderFn
  container?: HTMLElement
  viewportId?: string
  log?: GwenLogger
}
```

---

## layers

**Required.** At least one layer must be declared.

Each entry is an `HTMLLayerDef` — a `LayerDef` with an optional `viewportId` field
that binds the layer to a specific viewport.

```ts
layers: {
  background: { order: 0 },
  hud:        { order: 100 },
}
```

### HTMLLayerDef

| Field | Type | Description |
|---|---|---|
| `order` | `number` | Z-order (from `LayerDef`). |
| `coordinate` | `'world' \| 'screen'` | `'world'` = camera-transformed; `'screen'` = fullscreen (from `LayerDef`). |
| `viewportId` | `string?` | Viewport this layer clips/transforms to. Unset = fallback chain (see below). |

**Viewport resolution rule (decreasing priority):**

| Priority | Source | When used |
|---|---|---|
| 1 | `layer.viewportId` | Layer explicitly bound to a viewport |
| 2 | `opts.viewportId` | Plugin-level fallback |
| 3 | First active viewport | Global fallback (single-viewport projects) |

See [Camera Integration](/guide/camera-integration) for split-screen examples.

---

## layerTemplates

**Optional.** Layer templates instantiated automatically for each viewport added at
runtime. The key pattern supports `{id}` as a placeholder for the viewport ID.
`viewportId` is injected automatically.

```ts
layerTemplates: {
  'world_{id}': { order: 10, coordinate: 'world' },
  'hud_{id}':   { order: 100 },
}
// viewport 'p1' added → creates 'world_p1' and 'hud_p1'
// viewport 'p1' removed → destroys 'world_p1' and 'hud_p1'
```

See [N-player split-screen](/guide/camera-integration#n-player-split-screen-with-layer-templates) for a full example.

---

## renderFn

**Optional.** Adapter function for mounting JSX or VDOM nodes.

```ts
type FrameworkRenderFn = (content: unknown, container: HTMLElement) => () => void
```

See [JSX Adapters](/guide/jsx-adapters) for framework-specific examples.

---

## container

**Optional.** Root DOM element to mount layers into. Defaults to `document.body`.

```ts
container: document.getElementById('game-root')!
```

Only the first renderer plugin to call `getOrCreateLayerManager()` determines the container — subsequent plugins share the same `LayerManager` instance regardless of what they pass.

---

## viewportId

**Optional.** Plugin-level fallback viewport for layers that do not declare their
own `viewportId`. Defaults to the first viewport registered with `ViewportManager`.

```ts
viewportId: 'main'
```

Only relevant when `@gwenjs/camera-core` is installed. When all layers have their
own `viewportId`, this field is not needed.

See [Camera Integration](/guide/camera-integration) for details.

---

## log

**Optional.** Child logger from `engine.logger.child('@gwenjs/renderer-html')`.
When provided, the renderer emits structured diagnostic output.

```ts
// In a custom plugin setup:
const log = engine.logger.child('@gwenjs/renderer-html')
engine.use(HTMLRendererPlugin({ layers, log }))
```

When using the module system (`gwen.config.ts`), the logger is created automatically
by the plugin — you do not need to pass it.

| Event | Level |
|---|---|
| Template layer instantiated | `debug` |
| Template layer destroyed | `debug` |
| Unknown layer name requested | `error` |

# HTMLRendererOptions

Options passed to the module in `gwen.config.ts` or directly to `HTMLRendererPlugin`.

```ts
interface HTMLRendererOptions {
  layers: Record<string, LayerDef>
  renderFn?: FrameworkRenderFn
  container?: HTMLElement
}
```

---

## layers

**Required.** At least one layer must be declared.

```ts
layers: {
  background: { order: 0 },
  hud:        { order: 100 },
}
```

See [Layers](/guide/layers) for the full `LayerDef` reference.

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

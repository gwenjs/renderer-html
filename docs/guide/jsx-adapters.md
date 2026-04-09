# JSX Adapters

By default, `handle.mount()` accepts strings and `HTMLElement` instances. To mount JSX or VDOM nodes from a framework (React, Preact, Solid…), provide a `renderFn` adapter.

::: tip Vite plugin required
`renderFn` handles runtime mounting only. To use JSX syntax in actor code, the framework's Vite plugin must also be registered so `.tsx` files are transformed at build time.

Add it via the `vite` field in `gwen.config.ts`:

```ts
// gwen.config.ts
import { defineConfig } from '@gwenjs/app'
import react from '@vitejs/plugin-react'

export default defineConfig({
  modules: [
    ['@gwenjs/renderer-html', {
      layers: { hud: { order: 100 } },
      renderFn: reactAdapter,
    }],
  ],
  vite: {
    plugins: [react()],
  },
})
```

Available plugins: `@vitejs/plugin-react`, `@preact/preset-vite`, `vite-plugin-solid`, etc.
:::

## What is FrameworkRenderFn

```ts
type FrameworkRenderFn = (content: unknown, container: HTMLElement) => () => void
//                                                                      └── cleanup fn
```

The adapter receives the framework element and the slot container. It must return a cleanup function called on `handle.unmount()`.

## React example

```ts
import { createRoot } from 'react-dom/client'
import { HTMLRendererPlugin } from '@gwenjs/renderer-html'
import type { FrameworkRenderFn } from '@gwenjs/renderer-html'

const reactAdapter: FrameworkRenderFn = (content, container) => {
  const root = createRoot(container)
  root.render(content as React.ReactNode)
  return () => root.unmount()
}

await engine.use(HTMLRendererPlugin({
  layers: { hud: { order: 100 } },
  renderFn: reactAdapter,
}))
```

Then in actor code:

```tsx
import { useHTML } from '@gwenjs/renderer-html'

const hud = useHTML('hud', String(entityId))

onStart(() => {
  hud.mount(<HealthBar max={100} />)
})

onUpdate(() => {
  hud.mount(<HealthBar current={Health.current[entityId]} max={100} />)
})
```

## Preact example

```ts
import { render, h } from 'preact'
import type { FrameworkRenderFn } from '@gwenjs/renderer-html'

const preactAdapter: FrameworkRenderFn = (content, container) => {
  render(content as preact.VNode, container)
  return () => render(null, container)
}
```

## Content without renderFn

When no `renderFn` is provided, passing a non-string/non-HTMLElement to `handle.mount()` falls back to `String(content)` as innerHTML. This is intentional for simple templating scenarios where no framework is needed.

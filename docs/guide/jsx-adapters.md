# JSX Adapters

By default, `handle.mount()` accepts strings and `HTMLElement` instances. To mount JSX or VDOM nodes from a framework (React, Preact, Solid…), provide a `renderFn` adapter.

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

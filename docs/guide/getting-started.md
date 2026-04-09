# Getting Started

## Installation

```bash
pnpm add @gwenjs/renderer-html
```

## Module registration

Add the module in `gwen.config.ts`. At minimum declare one layer:

```ts
// gwen.config.ts
export default defineConfig({
  modules: [
    ['@gwenjs/renderer-html', {
      layers: {
        background: { order: 0   },   // behind everything
        hud:        { order: 100 },   // above everything
      },
    }],
  ],
})
```

Each key becomes a named `<div>` container inserted by `LayerManager` in z-index order.

## Basic usage

Call `useHTML()` inside `defineActor()`. The handle is automatically unmounted when the actor is destroyed.

```ts
import { defineActor } from '@gwenjs/core/actor'
import { useHTML } from '@gwenjs/renderer-html'

export const ScoreActor = defineActor(ScorePrefab, () => {
  // 'score' is a fixed key — this actor is a singleton, only one slot needed.
  const hud = useHTML('hud', 'score')

  onStart(() => {
    hud.mount('<div class="score">0</div>')
  })

  onUpdate(() => {
    hud.update({ score: Score.current[entityId] })
  })
})
```

## Manual plugin registration

If you are not using the module system, register the plugin directly:

```ts
import { createEngine } from '@gwenjs/core'
import { HTMLRendererPlugin } from '@gwenjs/renderer-html'

const engine = await createEngine()
await engine.use(HTMLRendererPlugin({
  layers: {
    hud: { order: 100 },
  },
}))
engine.start()
```

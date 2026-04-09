# @gwenjs/renderer-html

[![npm version](https://img.shields.io/npm/v/@gwenjs/renderer-html)](https://www.npmjs.com/package/@gwenjs/renderer-html)
[![CI](https://github.com/gwenjs/renderer-html/actions/workflows/ci.yml/badge.svg)](https://github.com/gwenjs/renderer-html/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

HTML/CSS renderer plugin for the [Gwen](https://github.com/gwenjs/gwen) game engine.

Mount DOM elements, JSX components, and HTML templates directly into named game layers — HUDs, speech bubbles, world-space health bars, and more.

## Features

- **Named layers** — declare background, game, and HUD layers at different z-indices
- **String · HTMLElement · JSX** — pass raw HTML strings, existing DOM nodes, or JSX elements from any framework via a `FrameworkRenderFn` adapter
- **World-space projection** — attach UI to world coordinates with `syncWorldPosition()` for speech bubbles, floating labels, and similar effects
- **Auto-cleanup** — `useHTML()` registers `onCleanup()` automatically; works in actors, systems, and scenes

## Documentation

**[gwenjs.github.io/renderer-html](https://gwenjs.github.io/renderer-html)**

## Installation

```bash
pnpm add @gwenjs/renderer-html
```

## Quick start

```ts
// gwen.config.ts
export default defineConfig({
  modules: [
    ['@gwenjs/renderer-html', {
      layers: {
        background: { order: 0 },
        hud:        { order: 100 },
      },
    }],
  ],
})
```

```ts
import { defineActor, useEntityId } from '@gwenjs/core/actor'
import { useHTML } from '@gwenjs/renderer-html'

export const EnemyActor = defineActor(EnemyPrefab, () => {
  const entityId = useEntityId()
  const label = useHTML('hud', String(entityId))

  onStart(() => label.mount(`<div class="label">Enemy</div>`))
  onUpdate(() => label.syncWorldPosition(Position.x[entityId], Position.y[entityId] - 40))
})
```

## License

MIT

# HUD Example

A health bar and score display mounted in the `hud` layer.

## Setup

```ts
// gwen.config.ts
['@gwenjs/renderer-html', {
  layers: {
    hud: { order: 100 },
  },
}]
```

## Actor

```ts
import { defineActor } from '@gwenjs/core/actor'
import { useHTML } from '@gwenjs/renderer-html'
import { Health, Score } from './components'

export const HUDActor = defineActor(HUDPrefab, () => {
  const hud = useHTML('hud', 'hud-root')

  onStart(() => {
    hud.mount(`
      <div class="hud">
        <div class="health-bar"><div class="fill" style="width:100%"></div></div>
        <div class="score">0</div>
      </div>
    `)
  })

  onUpdate(() => {
    const pct = (Health.current[entityId] / Health.max[entityId]) * 100
    hud.update({ health: pct, score: Score.total[entityId] })
  })
})
```

## CSS

```css
.hud { position: absolute; top: 16px; left: 16px; }
.health-bar { width: 200px; height: 12px; background: #333; border-radius: 6px; }
.health-bar .fill {
  height: 100%;
  background: #e74c3c;
  border-radius: 6px;
  transition: width 0.2s ease;
  width: attr(data-prop-health %);
}
.score { color: white; font-size: 24px; margin-top: 8px; }
```

# World-Space Bubbles

Speech bubbles that follow entities in world coordinates.

## Setup

```ts
// gwen.config.ts
['@gwenjs/renderer-html', {
  layers: {
    background: { order: 0 },
    bubbles:    { order: 20, coordinate: 'world' },
    hud:        { order: 100 },
  },
}]
```

## Actor

```ts
import { defineActor, useEntityId } from '@gwenjs/core/actor'
import { useHTML } from '@gwenjs/renderer-html'
import { Position, Dialogue } from './components'

export const NPCActor = defineActor(NPCPrefab, () => {
  const entityId = useEntityId()
  const bubble = useHTML('bubbles', String(entityId))

  onStart(() => {
    bubble.mount(`<div class="bubble">${Dialogue.line[entityId]}</div>`)
  })

  onUpdate(() => {
    const x = Position.x[entityId]
    const y = Position.y[entityId]
    bubble.syncWorldPosition(x, y - 60) // 60px above the entity
    bubble.setVisible(Dialogue.active[entityId])
  })
})
```

## CSS

```css
.bubble {
  position: absolute;
  background: white;
  border: 2px solid #333;
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 14px;
  white-space: nowrap;
  transform: translateX(-50%); /* centre horizontally on the anchor point */
  pointer-events: none;
}

.bubble::after {
  content: '';
  position: absolute;
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
  border: 5px solid transparent;
  border-top-color: #333;
}
```

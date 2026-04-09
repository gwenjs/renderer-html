# Scene Decorations

Background decorations mounted directly inside a scene's `onEnter`, cleaned up automatically on `onExit`.

## How it works

`useHTML()` uses `onCleanup()` internally, which hooks into Gwen's cleanup-context system. When the scene router wraps `onEnter` in `withCleanup()`, any handle allocated during entry is automatically unmounted on `onExit` — no manual cleanup needed.

## Setup

```ts
// gwen.config.ts
['@gwenjs/renderer-html', {
  layers: {
    background: { order: 0, coordinate: 'screen' },
    hud:        { order: 100 },
  },
}]
```

## Scene

```ts
import { defineScene } from '@gwenjs/core'
import { useHTML } from '@gwenjs/renderer-html'

export const ForestScene = defineScene({
  name: 'Forest',
  systems: [TreeSystem, AmbientSystem],

  async onEnter() {
    const sky = useHTML('background', 'forest-sky')
    sky.mount(`
      <div class="forest-bg">
        <div class="sky"></div>
        <div class="clouds"></div>
        <div class="treeline"></div>
      </div>
    `)
    // sky.unmount() is registered automatically — no onExit cleanup needed
  },
})
```

## CSS

```css
.forest-bg {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.sky {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, #87ceeb, #c9e8f5);
}

.clouds {
  position: absolute;
  inset: 0;
  background: url('/assets/clouds.png') repeat-x center 20%;
  animation: drift 60s linear infinite;
}

.treeline {
  position: absolute;
  bottom: 0;
  width: 100%;
  height: 40%;
  background: url('/assets/treeline.png') repeat-x bottom;
}

@keyframes drift {
  from { background-position-x: 0; }
  to   { background-position-x: 100vw; }
}
```

## Compared to using an actor

| | Scene `onEnter` | Dedicated actor |
|---|---|---|
| Cleanup | Automatic on scene exit | Automatic on actor destroy |
| ECS entity | None | One entity per actor instance |
| Best for | Static scene decoration | Dynamic / per-entity elements |

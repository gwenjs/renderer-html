# Démarrage rapide

## Installation

```bash
pnpm add @gwenjs/renderer-html
```

## Enregistrement du module

Ajoutez le module dans `gwen.config.ts`. Déclarez au minimum un layer :

```ts
// gwen.config.ts
export default defineConfig({
  modules: [
    ['@gwenjs/renderer-html', {
      layers: {
        background: { order: 0   },   // derrière tout
        hud:        { order: 100 },   // au-dessus de tout
      },
    }],
  ],
})
```

Chaque clé devient un conteneur `<div>` nommé inséré par `LayerManager` dans l'ordre des z-index.

## Utilisation de base

Appelez `useHTML()` à l'intérieur de `defineActor()`. Le handle est automatiquement démonté lorsque l'acteur est détruit.

```ts
import { defineActor } from '@gwenjs/core/actor'
import { useHTML } from '@gwenjs/renderer-html'

export const ScoreActor = defineActor(ScorePrefab, () => {
  // 'score' est une clé fixe — cet acteur est un singleton, un seul slot suffit.
  const hud = useHTML('hud', 'score')

  onStart(() => {
    hud.mount('<div class="score">0</div>')
  })

  onUpdate(() => {
    hud.update({ score: Score.current[entityId] })
  })
})
```

## Enregistrement manuel du plugin

Si vous n'utilisez pas le système de modules, enregistrez le plugin directement :

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

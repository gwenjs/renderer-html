# Intégration caméra

`@gwenjs/renderer-html` s'intègre automatiquement avec `@gwenjs/camera-core` lorsque
les deux plugins sont installés. Les layers en coordonnées monde suivent la caméra active
à chaque frame sans configuration supplémentaire dans le code des entités.

## Fonctionnement

- **Layers écran** (`coordinate: 'screen'` ou absent) : les positions sont en pixels CSS
  relatifs au viewport — aucune transformation caméra n'est appliquée.
- **Layers monde** (`coordinate: 'world'`): l'élément layer extérieur assure le
  dimensionnement et le clipping du viewport, tandis que sa div intérieure de transformation
  caméra reçoit la transformation CSS `translate + scale` dérivée du `CameraState` actif
  à chaque frame. Les slots d'entités positionnés via `syncWorldPosition(wx, wy)` restent
  visuellement corrects lorsque la caméra se déplace ou zoome.

Le plugin lit `CameraManager` et `ViewportManager` depuis le moteur après `engine:init`.
Lorsque `@gwenjs/camera-core` n'est pas installé, les deux managers sont `undefined`
et le chemin caméra est ignoré silencieusement — pas de crash, aucune configuration requise.

## Configuration

**Système de modules (`gwen.config.ts`) :**

```ts
export default defineConfig({
  modules: [
    ['@gwenjs/renderer-html', {
      layers: {
        world: { order: 10, coordinate: 'world' },
        hud:   { order: 100 },
      },
      viewportId: 'main', // optionnel — utilise le premier viewport enregistré par défaut
    }],
  ],
})
```

**Enregistrement direct du plugin :**

```ts
import { HTMLRendererPlugin } from '@gwenjs/renderer-html'

engine.use(HTMLRendererPlugin({
  layers: {
    world: { order: 10, coordinate: 'world' },
    hud:   { order: 100 },
  },
  viewportId: 'main', // optionnel — utilise le premier viewport enregistré par défaut
}))
```

## Code des entités

```ts
import { defineActor, useEntityId } from '@gwenjs/core/actor'
import { useHTML } from '@gwenjs/renderer-html'
import { Position } from './components.js'

export const CharacterActor = defineActor(CharacterPrefab, () => {
  const id = useEntityId()
  const handle = useHTML('world', String(id))

  onStart(() => handle.mount('<div class="label">Joueur</div>'))

  onRender(() => {
    // Déplace le slot DOM à la position monde de l'entité à chaque frame.
    // La transformation caméra du layer gère la projection — pas d'accès caméra nécessaire ici.
    handle.syncWorldPosition(Position.x[id], Position.y[id])
  })
})
```

## Mathématiques de la transformation caméra

Pour une caméra orthographique avec zoom (unités monde par pixel) centrée en
`(camX, camY)` sur un viewport de taille pixel `(vpW, vpH)` :

```
div intérieure du layer :
  transform-origin: 0 0
  transform: translate(vpW/2 - camX/zoom, vpH/2 - camY/zoom) scale(1/zoom)

slot entité (syncWorldPosition) :
  transform: translate(worldX, worldY)

Résultat : screenX = vpW/2 + (worldX - camX) / zoom ✓
```

Comme la div intérieure porte la transformation caméra et que chaque slot d'entité en est
un enfant, `syncWorldPosition` n'a jamais besoin de connaître la caméra.

## Viewports

Les viewports sont déclarés dans `gwen.config.ts` sous la clé `viewports` — GWEN
les enregistre automatiquement au démarrage, avant l'exécution de tout plugin renderer.

```ts
// gwen.config.ts
export default defineConfig({
  modules: ['@gwenjs/camera2d', '@gwenjs/renderer-html'],
  viewports: {
    main: { x: 0, y: 0, width: 1, height: 1 },
  },
})
```

::: tip Viewport par défaut
Si vous omettez `viewports`, GWEN crée automatiquement un seul viewport plein écran nommé
`'main'`. Vous ne devez le déclarer explicitement que lorsque vous en voulez plusieurs.
:::

## Limitations

- **Caméras perspective (3D) :** ignorées — CSS ne peut pas représenter une projection
  perspective comme une transformation CSS 2D.
- **Split-screen :** non supporté dans cette version.
- **Rotation caméra (axe z 2D) :** non appliquée dans cette version.

# Intégration de la caméra

`@gwenjs/renderer-html` s'intègre automatiquement avec `@gwenjs/camera-core`
lorsque les deux plugins sont installés. Les layers en coordonnées monde suivent
la caméra active à chaque frame sans configuration supplémentaire dans le code
des entités.

## Fonctionnement

- **Layers écran** (`coordinate: 'screen'` ou non défini) : les positions sont en
  pixels CSS relatifs au viewport — aucune transformation caméra n'est appliquée.
- **Layers monde** (`coordinate: 'world'`) : l'élément layer reçoit une transformation
  CSS `translate + scale` dérivée du `CameraState` actif à chaque frame. Les slots
  d'entités positionnés via `syncWorldPosition(wx, wy)` restent visuellement corrects
  quand la caméra se déplace ou change de zoom.
- **Binding viewport par layer** (`viewportId`) : chaque layer peut déclarer le
  viewport auquel il appartient. Les layers écran avec un `viewportId` sont découpés
  à la région de ce viewport.

Le plugin lit `CameraManager` et `ViewportManager` depuis le moteur après
`engine:init`. Lorsque `@gwenjs/camera-core` n'est pas installé, les deux managers
sont `undefined` et le chemin caméra est silencieusement ignoré.

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
    // La transformation caméra du layer gère la projection.
    handle.syncWorldPosition(Position.x[id], Position.y[id])
  })
})
```

## Mathématiques de la transformation caméra

Pour une caméra orthographique avec zoom (unités monde par pixel) centrée en
`(camX, camY)` sur un viewport de taille `(vpW, vpH)` en pixels :

```
div intérieure du layer :
  transform-origin: 0 0
  transform: translate(vpW/2 - camX/zoom, vpH/2 - camY/zoom) scale(1/zoom)

slot d'entité (syncWorldPosition) :
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

Pour plus d'informations sur les layouts de viewports, l'API dynamique
`useViewportManager()` et comment lier une caméra à un viewport, consultez le
[guide Viewports](https://gwenjs.github.io/docs/rendering/viewports).

## Split-screen

Liez chaque layer à son viewport via `viewportId` dans `HTMLLayerDef` :

```ts
// gwen.config.ts
export default defineConfig({
  modules: [
    '@gwenjs/camera2d',
    ['@gwenjs/renderer-html', {
      layers: {
        world_p1: { order: 10,  coordinate: 'world', viewportId: 'p1' },
        world_p2: { order: 11,  coordinate: 'world', viewportId: 'p2' },
        hud_p1:   { order: 100, viewportId: 'p1' },
        hud_p2:   { order: 101, viewportId: 'p2' },
        overlay:  { order: 200 }, // plein écran — pas de viewportId
      },
    }],
  ],
  viewports: {
    p1: { x: 0,   y: 0, width: 0.5, height: 1 },
    p2: { x: 0.5, y: 0, width: 0.5, height: 1 },
  },
})
```

## Viewport dynamique (minimap)

Ajoutez ou supprimez des viewports à l'exécution via `useViewportManager()`. Le
plugin réagit immédiatement via les hooks `viewport:add` et `viewport:remove` :

```ts
// LayoutSystem.ts
import { useViewportManager } from '@gwenjs/renderer-core'
import { defineSystem } from '@gwenjs/core/system'

export const LayoutSystem = defineSystem('LayoutSystem', () => {
  const viewports = useViewportManager()

  // Activation de la minimap :
  viewports.set('minimap', { x: 0.75, y: 0.75, width: 0.25, height: 0.25 })

  // Désactivation de la minimap :
  viewports.remove('minimap')
})
```

## Split-screen N joueurs avec les templates de layers

Utilisez `layerTemplates` pour créer des layers automatiquement pour chaque viewport
ajouté à l'exécution. Le placeholder `{id}` dans la clé est remplacé par l'identifiant
du viewport :

```ts
// gwen.config.ts
export default defineConfig({
  modules: [
    '@gwenjs/camera2d',
    ['@gwenjs/renderer-html', {
      layers: {
        overlay: { order: 200 },
      },
      layerTemplates: {
        'world_{id}': { order: 10, coordinate: 'world' },
        'hud_{id}':   { order: 100 },
      },
    }],
  ],
  viewports: {
    p1: { x: 0, y: 0, width: 0.5, height: 1 },
  },
})
```

```ts
// PlayerSystem.ts
import { useEngine } from '@gwenjs/core'
import { useHTML } from '@gwenjs/renderer-html'
import { defineSystem } from '@gwenjs/core/system'

export const PlayerSystem = defineSystem('PlayerSystem', () => {
  const engine = useEngine()
  const viewports = useViewportManager()

  engine.hooks.hook('viewport:add', ({ id }) => {
    // Les layers 'world_p2' et 'hud_p2' sont maintenant disponibles
    const hud = useHTML(`hud_${id}`, 'hud-root')
    hud.mount(`<div class="hud">Joueur ${id}</div>`)
  })

  // Le joueur 2 rejoint — les layers 'world_p2' et 'hud_p2' sont créés instantanément
  viewports.set('p2', { x: 0.5, y: 0, width: 0.5, height: 1 })
})
```

## Limitations

- **Caméras en perspective (3D) :** ignorées — CSS ne peut pas représenter une
  projection en perspective comme une transformation CSS 2D.
- **Rotation de caméra (axe z en 2D) :** non appliquée dans cette version.

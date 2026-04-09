# Décors de scène

Décors de fond montés directement dans le `onEnter` d'une scène, nettoyés automatiquement sur `onExit`.

## Comment ça fonctionne

`useHTML()` utilise `onCleanup()` en interne, qui s'accroche au système de cleanup-context de Gwen. Lorsque le router de scène enveloppe `onEnter` dans `withCleanup()`, tout handle alloué lors de l'entrée est automatiquement démonté sur `onExit` — aucun nettoyage manuel nécessaire.

## Configuration

```ts
// gwen.config.ts
['@gwenjs/renderer-html', {
  layers: {
    background: { order: 0, coordinate: 'screen' },
    hud:        { order: 100 },
  },
}]
```

## Scène

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
    // sky.unmount() est enregistré automatiquement — pas de cleanup dans onExit
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

## Comparaison avec un acteur

| | `onEnter` de scène | Acteur dédié |
|---|---|---|
| Nettoyage | Automatique à la sortie de scène | Automatique à la destruction de l'acteur |
| Entité ECS | Aucune | Une entité par instance d'acteur |
| Idéal pour | Décors statiques de scène | Éléments dynamiques / par entité |

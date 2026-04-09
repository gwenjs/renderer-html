# Layers

Un layer est un conteneur `<div>` nommé géré par `LayerManager`. Une instance de renderer peut déclarer autant de layers que nécessaire.

## Configuration

```ts
['@gwenjs/renderer-html', {
  layers: {
    background: { order: 0   },          // ciel, animations CSS parallaxe
    bubbles:    { order: 20, coordinate: 'world' }, // bulles de dialogue en espace monde
    hud:        { order: 100 },          // barre de vie, score, minimap
  },
}]
```

| Champ        | Type                      | Défaut     | Description                                              |
|--------------|---------------------------|------------|----------------------------------------------------------|
| `order`      | `number`                  | requis     | z-index. Doit être unique parmi tous les renderers.      |
| `coordinate` | `'screen'` \| `'world'`  | `'screen'` | `'world'` active `syncWorldPosition()` sur les handles.  |

## Comment les layers sont montés

`LayerManager` trie tous les layers de tous les plugins renderer par `order`, puis les insère en tant qu'enfants du conteneur racine. Chaque `<div>` reçoit :

```html
<div
  data-gwen-layer="renderer:html:hud"
  style="position:absolute; inset:0; z-index:100; pointer-events:none"
></div>
```

`pointer-events: none` est appliqué automatiquement sur les layers en coordonnées `screen` afin que l'overlay DOM ne bloque pas les entrées du jeu. Supprimez-le sur des éléments enfants spécifiques lorsqu'une interface interactive est nécessaire.

## Slots par entité

À l'intérieur de chaque layer, chaque entité qui appelle `useHTML(layerName)` obtient son propre `<div>` enfant :

```html
<div data-gwen-layer="renderer:html:hud">
  <div data-gwen-slot="42" style="position:absolute"><!-- contenu entité 42 --></div>
  <div data-gwen-slot="43" style="position:absolute"><!-- contenu entité 43 --></div>
</div>
```

Les slots sont alloués au premier appel de `useHTML()` et libérés automatiquement lors de la destruction de l'acteur.

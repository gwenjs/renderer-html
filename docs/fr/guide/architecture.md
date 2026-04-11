# Architecture

Cette page décrit le fonctionnement interne de `@gwenjs/renderer-html` à destination des contributeurs et des intégrateurs qui ont besoin de comprendre comment les différentes pièces s'articulent.

## Flux de données

```
useHTML(layerName, slotKey)
  └─ HTMLRendererService.allocateHandle()
       └─ HTMLHandleImpl  (une instance par entité)
            └─ HTMLLayer  (une instance par layer nommé)
                 └─ Slots <div> dans le DOM
```

Le plugin pilote le cycle de vie depuis l'extérieur :

```
HTMLRendererPlugin
  ├─ setup()         → enregistre le service, câble le LayerManager
  ├─ engine:init     → monte les layers, injecte les managers caméra, bootstrap les viewports statiques
  ├─ viewport:add    → showViewportLayers() + instantiateTemplates()
  ├─ viewport:resize → applyViewportTransforms() (immédiat, sans attendre le prochain frame)
  ├─ viewport:remove → clearViewportLayers() + destroyTemplateLayers()
  └─ onRender()      → flush() + applyViewportTransforms() pour chaque viewport actif
```

## Responsabilités des composants

| Composant | Fichier | Responsabilité |
|-----------|---------|----------------|
| `HTMLRendererPlugin` | `html-plugin.ts` | Cycle de vie moteur, injection caméra, hooks viewport |
| `HTMLRenderer` (service) | `html-renderer-service.ts` | Registre des layers, allocation des handles, dispatch viewport |
| `HTMLLayer` | `html-layer.ts` | Allocation des slots DOM, transform caméra, suspension |
| `HTMLHandleImpl` | `html-handle.ts` | Interface mount/unmount/update par entité |
| `useHTML()` | `composables/use-html.ts` | Composable DX, nettoyage automatique à la destruction de l'acteur |

## Résolution de viewport

Chaque layer résout son viewport cible via une chaîne de priorité à trois niveaux :

```
1. layer.def.viewportId   — binding explicite par layer (priorité la plus haute)
2. opts.viewportId        — fallback au niveau du plugin
3. _firstViewportId       — premier viewport vu par n'importe quelle méthode du service (fallback global)
```

Le fallback global (`_firstViewportId`) est enregistré la première fois qu'une méthode du service reçoit un ID de viewport. Une entrée de log `debug` est émise à ce moment-là si au moins un layer n'a pas de binding explicite, afin de détecter une utilisation non intentionnelle de ce fallback.

Pour désactiver le fallback, définissez `viewportId` dans `HTMLRendererOptions` ou dans chaque `HTMLLayerDef`.

## Calcul des coordonnées monde

Pour les layers `coordinate: 'world'`, le layer utilise une **structure à deux divs** :

```
<div data-gwen-layer="renderer:html:monLayer">   ← outer : clippé à la région du viewport (px)
  <div style="transform-origin: 0 0; ...">       ← inner : transform caméra appliqué ici
    <div data-gwen-slot="entityId" .../>          ← slot entité : translate(wx, wy) en unités monde
  </div>
</div>
```

Le transform de la div inner est :

```
translate(vpW/2 − camX/zoom, vpH/2 − camY/zoom) scale(1/zoom)
```

Où :
- `vpW / vpH` — taille du viewport en pixels CSS
- `camX / camY` — centre de la caméra en espace monde
- `zoom` — unités monde par pixel (1 = pas de zoom, 2 = dézoomé ×2)

Les slots d'entité définissent `translate(wx, wy)` en **unités monde** via `handle.syncWorldPosition(wx, wy)`. Le `scale(1/zoom)` sur la div inner convertit automatiquement les unités monde en pixels — aucun calcul de zoom par entité n'est nécessaire.

`transform-origin: 0 0` sur la div inner est critique : sans lui, le pivot du scale serait au centre de l'élément et les calculs de translate seraient incorrects.

### Pourquoi réinitialiser `right` et `bottom` ?

`LayerManager` applique `inset: 0` sur tous les éléments de layer enregistrés (équivalent à `top: 0; right: 0; bottom: 0; left: 0`). Les layers world et les layers screen liés à un viewport écrasent `left`, `top`, `width` et `height` avec des valeurs en pixels calculées à partir de la région normalisée. Sans réinitialiser explicitement `right: auto; bottom: auto`, les valeurs héritées de `inset: 0` entrerait en conflit avec `width`/`height` et provoqueraient un dimensionnement incorrect.

## Suspension de layer

Lorsqu'un viewport est supprimé (`viewport:remove`), les layers qui lui sont liés sont **suspendus** :

1. `clearSlots()` supprime tous les slots DOM (les entités doivent remonter leur contenu au prochain `viewport:add`).
2. `setLayerVisible(false)` masque l'élément du layer et passe `_suspended` à `true`.

En état suspendu, `HTMLLayer.allocate()` retourne un unique **slot fantôme** détaché du DOM au lieu de créer de vrais nœuds. Cela rend toutes les opérations de handle (`mount`, `syncWorldPosition`, `setVisible`) des no-ops sûres — aucun DOM n'est créé, aucune erreur n'est levée.

Lorsque le viewport revient (`viewport:add`), `setLayerVisible(true)` désactive le flag de suspension et le layer est prêt à recevoir de nouveaux slots.

> **Note :** Un log `warn` est émis à chaque fois qu'une méthode de handle est appelée sur un layer suspendu. Cela permet de détecter les entités encore actives après la suppression de leur viewport.

## Layers templates

Les templates de layers permettent d'instancier la même structure de layer une fois par viewport :

```ts
layerTemplates: {
  'world_{id}': { order: 10, coordinate: 'world' },
  'hud_{id}':   { order: 100 },
}
// viewport 'p1' ajouté → crée 'world_p1' et 'hud_p1'
// viewport 'p1' supprimé → détruit 'world_p1' et 'hud_p1'
```

Les layers templates sont créés par `instantiateTemplates(viewportId, region)` :

1. Le placeholder `{id}` dans le pattern de clé est remplacé par l'ID du viewport.
2. `viewportId` est injecté automatiquement dans la définition du layer.
3. L'élément du layer est ajouté au conteneur racine.
4. Un `applyTransform(0, 0, 1, ...)` initial positionne le layer avant le premier frame.
5. Le layer est enregistré dans `htmlLayers` (registre du service) et dans `_templateLayers` (suivi pour le nettoyage).

Les noms des layers templates sont regroupés par viewport dans `_templateLayersByViewport` afin que `destroyTemplateLayers(viewportId)` nettoie exactement les layers créés pour ce viewport.

## Logs

Le plugin crée un logger enfant via `engine.logger.child('@gwenjs/renderer-html')` et le transmet en cascade au service, aux layers et aux handles. Tous les diagnostics transitent par ce logger — aucun `console.*` n'est utilisé.

Niveaux de log utilisés :

| Niveau | Quand |
|--------|-------|
| `debug` | Événements de cycle de vie normaux : handle alloué, layer suspendu/repris, hooks viewport, création/destruction de templates |
| `warn` | Inattendu mais récupérable : opération sur un slot d'un layer suspendu |
| `error` | Erreurs de configuration irrécupérables : nom de layer inconnu passé à `allocateHandle` |

Les entrées `debug` et `info` sont supprimées en production (quand `engine.debug === false`). `warn` et `error` sont toujours émis.

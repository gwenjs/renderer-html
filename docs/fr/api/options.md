# HTMLRendererOptions

Options passées au module dans `gwen.config.ts` ou directement à `HTMLRendererPlugin`.

```ts
interface HTMLRendererPluginOptions {
  layers: Record<string, HTMLLayerDef>
  layerTemplates?: Record<string, HTMLLayerTemplate>
  renderFn?: FrameworkRenderFn
  container?: HTMLElement
  viewportId?: string
  log?: GwenLogger
}
```

---

## layers

**Requis.** Au moins un layer doit être déclaré.

Chaque entrée est un `HTMLLayerDef` — un `LayerDef` avec un champ optionnel `viewportId`
qui lie le layer à un viewport spécifique.

```ts
layers: {
  background: { order: 0 },
  hud:        { order: 100 },
}
```

### HTMLLayerDef

| Champ | Type | Description |
|---|---|---|
| `order` | `number` | Ordre d'empilement Z (hérité de `LayerDef`). |
| `coordinate` | `'world' \| 'screen'` | `'world'` = transformé par caméra ; `'screen'` = plein écran (hérité de `LayerDef`). |
| `viewportId` | `string?` | Viewport auquel ce layer est associé. Non défini = chaîne de repli (voir ci-dessous). |

**Règle de résolution du viewport (priorité décroissante) :**

| Priorité | Source | Utilisé quand |
|---|---|---|
| 1 | `layer.viewportId` | Layer explicitement lié à un viewport |
| 2 | `opts.viewportId` | Repli au niveau du plugin |
| 3 | Premier viewport actif | Repli global (projets mono-viewport) |

Voir [Intégration de la caméra](/fr/guide/camera-integration) pour des exemples split-screen.

---

## layerTemplates

**Optionnel.** Templates de layers instanciés automatiquement pour chaque viewport
ajouté à l'exécution. Le pattern de clé accepte `{id}` comme placeholder pour
l'identifiant du viewport. `viewportId` est injecté automatiquement.

```ts
layerTemplates: {
  'world_{id}': { order: 10, coordinate: 'world' },
  'hud_{id}':   { order: 100 },
}
// viewport 'p1' ajouté → crée 'world_p1' et 'hud_p1'
// viewport 'p1' supprimé → détruit 'world_p1' et 'hud_p1'
```

Voir [Split-screen N joueurs](/fr/guide/camera-integration#split-screen-n-joueurs-avec-les-templates-de-layers) pour un exemple complet.

---

## renderFn

**Optionnel.** Fonction adaptateur pour monter des nœuds JSX ou VDOM.

```ts
type FrameworkRenderFn = (content: unknown, container: HTMLElement) => () => void
```

Voir [Adaptateurs JSX](/fr/guide/jsx-adapters) pour des exemples spécifiques aux frameworks.

---

## container

**Optionnel.** Élément DOM racine dans lequel monter les layers. Par défaut `document.body`.

```ts
container: document.getElementById('game-root')!
```

Seul le premier plugin renderer à appeler `getOrCreateLayerManager()` détermine le
conteneur — les plugins suivants partagent la même instance de `LayerManager` quel
que soit ce qu'ils passent.

---

## viewportId

**Optionnel.** Viewport de repli au niveau du plugin pour les layers qui ne déclarent
pas leur propre `viewportId`. Par défaut, le premier viewport enregistré dans `ViewportManager`.

```ts
viewportId: 'main'
```

Uniquement pertinent lorsque `@gwenjs/camera-core` est installé.

Voir [Intégration de la caméra](/fr/guide/camera-integration) pour plus de détails.

---

## log

**Optionnel.** Logger enfant issu de `engine.logger.child('@gwenjs/renderer-html')`.
Lorsqu'il est fourni, le renderer émet des diagnostics structurés.

```ts
// Dans une configuration de plugin personnalisée :
const log = engine.logger.child('@gwenjs/renderer-html')
engine.use(HTMLRendererPlugin({ layers, log }))
```

Lors de l'utilisation du système de modules (`gwen.config.ts`), le logger est créé
automatiquement par le plugin — il n'est pas nécessaire de le passer manuellement.

| Événement | Niveau |
|---|---|
| Template de layer instancié | `debug` |
| Template de layer détruit | `debug` |
| Nom de layer inconnu demandé | `error` |

# HTMLRendererOptions

Options passées au module dans `gwen.config.ts` ou directement à `HTMLRendererPlugin`.

```ts
interface HTMLRendererOptions {
  layers: Record<string, LayerDef>
  renderFn?: FrameworkRenderFn
  container?: HTMLElement
}
```

---

## layers

**Requis.** Au moins un layer doit être déclaré.

```ts
layers: {
  background: { order: 0 },
  hud:        { order: 100 },
}
```

Voir [Layers](/fr/guide/layers) pour la référence complète de `LayerDef`.

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

Seul le premier plugin renderer à appeler `getOrCreateLayerManager()` détermine le conteneur — les plugins suivants partagent la même instance de `LayerManager` quel que soit ce qu'ils passent.

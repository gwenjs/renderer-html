# Adaptateurs JSX

Par défaut, `handle.mount()` accepte des chaînes de caractères et des instances `HTMLElement`. Pour monter des nœuds JSX ou VDOM depuis un framework (React, Preact, Solid…), fournissez un adaptateur `renderFn`.

## Qu'est-ce que FrameworkRenderFn

```ts
type FrameworkRenderFn = (content: unknown, container: HTMLElement) => () => void
//                                                                      └── fonction de nettoyage
```

L'adaptateur reçoit l'élément framework et le conteneur du slot. Il doit retourner une fonction de nettoyage appelée lors de `handle.unmount()`.

## Exemple React

```ts
import { createRoot } from 'react-dom/client'
import { HTMLRendererPlugin } from '@gwenjs/renderer-html'
import type { FrameworkRenderFn } from '@gwenjs/renderer-html'

const reactAdapter: FrameworkRenderFn = (content, container) => {
  const root = createRoot(container)
  root.render(content as React.ReactNode)
  return () => root.unmount()
}

await engine.use(HTMLRendererPlugin({
  layers: { hud: { order: 100 } },
  renderFn: reactAdapter,
}))
```

Puis dans le code de l'acteur :

```tsx
import { useHTML } from '@gwenjs/renderer-html'

const hud = useHTML('hud', String(entityId))

onStart(() => {
  hud.mount(<HealthBar max={100} />)
})

onUpdate(() => {
  hud.mount(<HealthBar current={Health.current[entityId]} max={100} />)
})
```

## Exemple Preact

```ts
import { render, h } from 'preact'
import type { FrameworkRenderFn } from '@gwenjs/renderer-html'

const preactAdapter: FrameworkRenderFn = (content, container) => {
  render(content as preact.VNode, container)
  return () => render(null, container)
}
```

## Contenu sans renderFn

Lorsqu'aucun `renderFn` n'est fourni, passer un non-string/non-HTMLElement à `handle.mount()` se replie sur `String(content)` en tant qu'innerHTML. C'est intentionnel pour les scénarios de templating simple où aucun framework n'est nécessaire.

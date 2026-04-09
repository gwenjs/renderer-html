# HTMLHandle

Interface retournée par [`useHTML()`](/fr/api/). Contrôle le slot DOM d'une entité dans un layer.

```ts
interface HTMLHandle {
  mount(content: unknown): void
  update(props: Record<string, unknown>): void
  setVisible(visible: boolean): void
  syncWorldPosition(x: number, y: number): void
  unmount(): void
}
```

---

## mount(content)

Remplace le contenu du slot. Nettoie tout contenu précédent en premier.

| Type de contenu | Comportement                                                            |
|-----------------|-------------------------------------------------------------------------|
| `string`        | Défini comme `innerHTML`                                                |
| `HTMLElement`   | Ajouté en tant que nœud enfant                                          |
| autre           | Passé à `renderFn` si configuré, sinon `String(content)` comme innerHTML |

```ts
hud.mount('<div class="score">42</div>')
hud.mount(document.createElement('canvas'))
hud.mount(<ScoreWidget value={42} />)  // avec adaptateur renderFn
```

---

## update(props)

Reflète les données mises à jour sur le conteneur du slot sans remplacer le contenu.

Pour le contenu **string/HTMLElement**, les props sont écrits en tant qu'attributs `data-prop-*` afin que le CSS et les scripts externes puissent les lire :

```ts
hud.update({ score: 99, combo: 3 })
// → container.setAttribute('data-prop-score', '99')
// → container.setAttribute('data-prop-combo', '3')
```

Pour le contenu **JSX** (lorsque `renderFn` est défini), appelez à nouveau `mount()` avec les props mises à jour — le framework gère la réconciliation.

---

## setVisible(visible)

Affiche ou masque le slot sans le démonter.

```ts
hud.setVisible(false)  // display: none
hud.setVisible(true)   // display: ''
```

---

## syncWorldPosition(x, y)

Positionne le conteneur du slot en coordonnées d'espace monde. Uniquement significatif sur les layers déclarés avec `coordinate: 'world'`.

```ts
hud.syncWorldPosition(entity.x, entity.y)
// → container.style.transform = 'translate(Xpx, Ypx)'
```

Appelez ceci dans `onUpdate()` pour suivre une entité en mouvement.

---

## unmount()

Supprime le contenu du slot et le libère du layer. Appelé automatiquement par `useHTML()` via `onDestroy` — n'appelez manuellement que si vous avez besoin d'un nettoyage anticipé.

```ts
hud.unmount()
```

# HTMLHandle

Interface returned by [`useHTML()`](/api/). Controls one entity's DOM slot inside a layer.

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

Replaces the slot's content. Cleans up any previous content first.

| Content type   | Behaviour                                                     |
|----------------|---------------------------------------------------------------|
| `string`       | Set as `innerHTML`                                            |
| `HTMLElement`  | Appended as a child node                                      |
| anything else  | Passed to `renderFn` if configured, otherwise `String(content)` as innerHTML |

```ts
hud.mount('<div class="score">42</div>')
hud.mount(document.createElement('canvas'))
hud.mount(<ScoreWidget value={42} />)  // with renderFn adapter
```

---

## update(props)

Reflects updated data on the slot container without replacing content.

For **string/HTMLElement** content, props are written as `data-prop-*` attributes so CSS and external scripts can read them:

```ts
hud.update({ score: 99, combo: 3 })
// → container.setAttribute('data-prop-score', '99')
// → container.setAttribute('data-prop-combo', '3')
```

For **JSX** content (when `renderFn` is set), call `mount()` again with updated props — the framework handles reconciliation.

---

## setVisible(visible)

Shows or hides the slot without unmounting it.

```ts
hud.setVisible(false)  // display: none
hud.setVisible(true)   // display: ''
```

---

## syncWorldPosition(x, y)

Positions the slot container in world-space coordinates. Only meaningful on layers declared with `coordinate: 'world'`.

```ts
hud.syncWorldPosition(entity.x, entity.y)
// → container.style.transform = 'translate(Xpx, Ypx)'
```

Call this in `onUpdate()` to follow a moving entity.

---

## unmount()

Removes the slot content and releases it from the layer. Called automatically by `useHTML()` via `onDestroy` — only call manually if you need early cleanup.

```ts
hud.unmount()
```

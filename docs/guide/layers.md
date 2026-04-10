# Layers

A layer is a named `<div>` container managed by `LayerManager`. One renderer instance can declare as many layers as needed.

## Configuration

```ts
['@gwenjs/renderer-html', {
  layers: {
    background: { order: 0   },          // sky, parallax CSS animations
    bubbles:    { order: 20, coordinate: 'world' }, // world-space speech bubbles
    hud:        { order: 100 },          // health bar, score, minimap
  },
}]
```

| Field        | Type                      | Default    | Description                                      |
|--------------|---------------------------|------------|--------------------------------------------------|
| `order`      | `number`                  | required   | z-index. Must be unique across all renderers.    |
| `coordinate` | `'screen'` \| `'world'`  | `'screen'` | `'world'` applies a camera transform to the layer each frame and enables `syncWorldPosition()` on handles. |

## How layers are mounted

`LayerManager` sorts all layers from all renderer plugins by `order`, then inserts them as children of the root container. Each `<div>` gets:

```html
<div
  data-gwen-layer="renderer:html:hud"
  style="position:absolute; inset:0; z-index:100; pointer-events:none"
></div>
```

`pointer-events: none` is applied automatically on `screen`-coordinate layers so the DOM overlay does not block game input. Remove it on specific child elements when interactive UI is needed.

## Per-entity slots

Inside each layer, every entity that calls `useHTML(layerName)` gets its own child `<div>`.

**Screen layer** — single div, slots are direct children:

```html
<div data-gwen-layer="renderer:html:hud">
  <div data-gwen-slot="42" style="position:absolute"><!-- entity 42 content --></div>
  <div data-gwen-slot="43" style="position:absolute"><!-- entity 43 content --></div>
</div>
```

**World layer** — two-div structure: an outer clip div and an inner camera-transform div. Slots live inside the inner div so the camera transform is applied automatically:

```html
<div data-gwen-layer="renderer:html:bubbles"
     style="position:absolute; overflow:hidden; /* viewport region */">
  <div style="position:absolute; transform-origin:0 0;
              transform:translate(vpW/2 - camX/zoom, vpH/2 - camY/zoom) scale(1/zoom)">
    <div data-gwen-slot="42" style="position:absolute"><!-- entity 42 content --></div>
    <div data-gwen-slot="43" style="position:absolute"><!-- entity 43 content --></div>
  </div>
</div>
```

Slots are allocated on first `useHTML()` call and released automatically on actor destroy.

See [Camera Integration](/guide/camera-integration) for how the inner transform is computed.

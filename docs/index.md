---
layout: home

hero:
  name: "@gwenjs/renderer-html"
  text: "HTML/CSS renderer for Gwen"
  tagline: Mount DOM elements, JSX components, and HTML templates directly into your game layers.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: API Reference
      link: /api/

features:
  - title: Multiple named layers
    details: Declare background, game, and HUD layers at different z-indices — all managed by a single plugin instance.
  - title: String · HTMLElement · JSX
    details: Pass raw HTML strings, existing DOM nodes, or JSX elements from any framework via a FrameworkRenderFn adapter.
  - title: World-space projection
    details: Attach UI elements to world coordinates with syncWorldPosition() for speech bubbles, health bars above characters, and similar effects.
  - title: Auto-cleanup
    details: useHTML() registers onDestroy() automatically — no manual unmount needed in actor code.
---

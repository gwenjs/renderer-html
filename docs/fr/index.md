---
layout: home

hero:
  name: "@gwenjs/renderer-html"
  text: "Renderer HTML/CSS pour Gwen"
  tagline: Montez des éléments DOM, des composants JSX et des templates HTML directement dans vos layers de jeu.
  actions:
    - theme: brand
      text: Démarrage rapide
      link: /fr/guide/getting-started
    - theme: alt
      text: Référence API
      link: /fr/api/

features:
  - title: Layers nommés multiples
    details: Déclarez des layers background, game et HUD à différents z-indices — tous gérés par une seule instance de plugin.
  - title: String · HTMLElement · JSX
    details: Passez des chaînes HTML brutes, des nœuds DOM existants ou des éléments JSX depuis n'importe quel framework via un adaptateur FrameworkRenderFn.
  - title: Projection en espace monde
    details: Attachez des éléments UI à des coordonnées monde avec syncWorldPosition() pour les bulles de dialogue, barres de vie au-dessus des personnages, et effets similaires.
  - title: Nettoyage automatique
    details: useHTML() enregistre onDestroy() automatiquement — aucun unmount manuel nécessaire dans le code des acteurs.
---

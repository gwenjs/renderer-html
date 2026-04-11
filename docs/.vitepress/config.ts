import { defineConfig } from 'vitepress'

export default defineConfig({
  title: '@gwenjs/renderer-html',
  description: 'HTML/CSS renderer plugin for the Gwen game engine.',
  base: '/renderer-html/',

  locales: {
    root: {
      label: 'English',
      lang: 'en',
    },
    fr: {
      label: 'Français',
      lang: 'fr',
      themeConfig: {
        nav: [
          { text: 'Guide', link: '/fr/guide/getting-started' },
          { text: 'API', link: '/fr/api/' },
          { text: 'Exemples', link: '/fr/examples/' },
        ],
        sidebar: [
          {
            text: 'Guide',
            items: [
              { text: 'Démarrage rapide', link: '/fr/guide/getting-started' },
              { text: 'Layers', link: '/fr/guide/layers' },
              { text: 'Intégration caméra', link: '/fr/guide/camera-integration' },
              { text: 'Adaptateurs JSX', link: '/fr/guide/jsx-adapters' },
              { text: 'Architecture', link: '/fr/guide/architecture' },
            ],
          },
          {
            text: 'API',
            items: [
              { text: 'useHTML()', link: '/fr/api/' },
              { text: 'HTMLHandle', link: '/fr/api/html-handle' },
              { text: 'HTMLRendererOptions', link: '/fr/api/options' },
            ],
          },
          {
            text: 'Exemples',
            items: [
              { text: 'HUD', link: '/fr/examples/' },
              { text: 'Bulles monde', link: '/fr/examples/world-space' },
              { text: 'Décors de scène', link: '/fr/examples/scene-decor' },
            ],
          },
        ],
      },
    },
  },

  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API', link: '/api/' },
      { text: 'Examples', link: '/examples/' },
    ],
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Getting Started', link: '/guide/getting-started' },
          { text: 'Layers', link: '/guide/layers' },
          { text: 'Camera Integration', link: '/guide/camera-integration' },
          { text: 'JSX Adapters', link: '/guide/jsx-adapters' },
          { text: 'Architecture', link: '/guide/architecture' },
        ],
      },
      {
        text: 'API',
        items: [
          { text: 'useHTML()', link: '/api/' },
          { text: 'HTMLHandle', link: '/api/html-handle' },
          { text: 'HTMLRendererOptions', link: '/api/options' },
        ],
      },
      {
        text: 'Examples',
        items: [
          { text: 'HUD', link: '/examples/' },
          { text: 'World-space bubbles', link: '/examples/world-space' },
          { text: 'Scene decorations', link: '/examples/scene-decor' },
        ],
      },
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/gwenjs/gwen' },
    ],
  },
})

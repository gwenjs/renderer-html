# Changelog

## [0.2.0](https://github.com/gwenjs/renderer-html/compare/renderer-html-v0.1.0...renderer-html-v0.2.0) (2026-04-11)


### Features

* HTML layer, handle, and renderer service ([b58fd33](https://github.com/gwenjs/renderer-html/commit/b58fd33428f1958002bce81ba06cc11b93be74a5))
* **html-layer:** two-div world layer structure with camera applyTransform ([cd5cca3](https://github.com/gwenjs/renderer-html/commit/cd5cca351914acaa54622b085fcb8dbc1073be8f))
* **html-plugin:** inject camera/viewport managers, apply world transforms per frame ([46115c7](https://github.com/gwenjs/renderer-html/commit/46115c72815eb95a2170237e30fdeb2cd7fc7584))
* **html-renderer-service:** track container size, add applyWorldTransforms ([83ea76e](https://github.com/gwenjs/renderer-html/commit/83ea76ea1c7d2490db131c502efca95fe5c9918d))
* plugin, useHTML composable, and public API ([205dd68](https://github.com/gwenjs/renderer-html/commit/205dd685b56fc63269599e8c22baa004ae9b7a08))


### Bug Fixes

* **ci:** add setup pnpm action ([561d3b5](https://github.com/gwenjs/renderer-html/commit/561d3b5482fac96d5183bd797a1467f4a3cfc82b))
* **ci:** deploy docs ([e99fdca](https://github.com/gwenjs/renderer-html/commit/e99fdca00bbd592d2fd6deceab936769bce59118))
* **ci:** OICD release pipeline ([eeeff34](https://github.com/gwenjs/renderer-html/commit/eeeff3462efd2c95e0ad947410d2ff96168a4244))
* **docs+plugin:** split-screen not supported — engine deduplicates by plugin name ([4dfcce7](https://github.com/gwenjs/renderer-html/commit/4dfcce7c06137d29208fd28596f78b2cf85391aa))
* **renderer-html:** address review feedback on camera integration ([75bf712](https://github.com/gwenjs/renderer-html/commit/75bf712f3137490dce7e1c5a6e82f8ef0609ea53))
* resolve lint and format issues ([5fa32d0](https://github.com/gwenjs/renderer-html/commit/5fa32d0c3ead99a74950110c3116cdfde04f00de))

## 0.1.0 (2026-04-09)

### Features

* HTML layer with per-entity slot allocation ([b58fd33](https://github.com/gwenjs/renderer-html/commit/b58fd33))
* HTMLHandle implementing mount, update, setVisible, syncWorldPosition, unmount ([b58fd33](https://github.com/gwenjs/renderer-html/commit/b58fd33))
* HTMLRenderer service via `defineRendererService` with `allocateHandle` extension ([b58fd33](https://github.com/gwenjs/renderer-html/commit/b58fd33))
* `useHTML()` composable with automatic `onCleanup` — works in actors, systems, and scenes ([205dd68](https://github.com/gwenjs/renderer-html/commit/205dd68))
* `HTMLRendererPlugin` wired into engine lifecycle via `engine.hooks` ([205dd68](https://github.com/gwenjs/renderer-html/commit/205dd68))
* `defineGwenModule` integration for `gwen.config.ts` ([205dd68](https://github.com/gwenjs/renderer-html/commit/205dd68))

### Bug Fixes

* Resolve lint and format issues, fix `__dirname` in ESM context ([5fa32d0](https://github.com/gwenjs/renderer-html/commit/5fa32d0))

### Documentation

* VitePress documentation in English and French — guide, API reference, examples ([4563ae6](https://github.com/gwenjs/renderer-html/commit/4563ae6))
* README with badges, project description, and docs link ([ff7900a](https://github.com/gwenjs/renderer-html/commit/ff7900a))

# Changelog

## [0.2.1](https://github.com/gwenjs/renderer-html/compare/renderer-html-v0.2.0...renderer-html-v0.2.1) (2026-04-11)


### Bug Fixes

* **ci:** Update .github/workflows/ci.yml renaming ([4f25d53](https://github.com/gwenjs/renderer-html/commit/4f25d532bce0cb1bc81728af5e6dd3aa0ad37f6c))
* **ci:** Update .github/workflows/ci.yml status ([e4452de](https://github.com/gwenjs/renderer-html/commit/e4452de17152527190aa2d1bd18959e5e758dbf4))
* **ci:** Update .github/workflows/release.yml ([397973d](https://github.com/gwenjs/renderer-html/commit/397973d2d7487d6d4e3c32f31dea3d7901dd764b))

## [0.2.0](https://github.com/gwenjs/renderer-html/compare/renderer-html-v0.1.0...renderer-html-v0.2.0) (2026-04-11)


### Features

* HTML layer, handle, and renderer service ([b58fd33](https://github.com/gwenjs/renderer-html/commit/b58fd33428f1958002bce81ba06cc11b93be74a5))
* **html-layer:** two-div world layer structure with camera applyTransform ([cd5cca3](https://github.com/gwenjs/renderer-html/commit/cd5cca351914acaa54622b085fcb8dbc1073be8f))
* **html-plugin:** inject camera/viewport managers, apply world transforms per frame ([46115c7](https://github.com/gwenjs/renderer-html/commit/46115c72815eb95a2170237e30fdeb2cd7fc7584))
* **html-renderer-service:** track container size, add applyWorldTransforms ([83ea76e](https://github.com/gwenjs/renderer-html/commit/83ea76ea1c7d2490db131c502efca95fe5c9918d))
* **layer:** add HTMLLayerDef, clearSlots, setLayerVisible, screen+viewportId clip ([3399133](https://github.com/gwenjs/renderer-html/commit/339913333e0d2b058776f1e69195c14e7e5f6687))
* plugin, useHTML composable, and public API ([205dd68](https://github.com/gwenjs/renderer-html/commit/205dd685b56fc63269599e8c22baa004ae9b7a08))
* **plugin:** child logger, viewport hooks, bootstrap static viewports, multi-viewport onRender loop ([bac6d77](https://github.com/gwenjs/renderer-html/commit/bac6d770bab56e5eee84737bd81d74a96f8d2131))
* **service:** replace applyWorldTransforms with applyViewportTransforms, add viewport-scoped methods ([ebe368a](https://github.com/gwenjs/renderer-html/commit/ebe368a1440f50ecbf6dd2dd72f20fc822172953))


### Bug Fixes

* **ci:** add setup pnpm action ([561d3b5](https://github.com/gwenjs/renderer-html/commit/561d3b5482fac96d5183bd797a1467f4a3cfc82b))
* **ci:** deploy docs ([e99fdca](https://github.com/gwenjs/renderer-html/commit/e99fdca00bbd592d2fd6deceab936769bce59118))
* **ci:** OICD release pipeline ([eeeff34](https://github.com/gwenjs/renderer-html/commit/eeeff3462efd2c95e0ad947410d2ff96168a4244))
* **docs+plugin:** split-screen not supported — engine deduplicates by plugin name ([4dfcce7](https://github.com/gwenjs/renderer-html/commit/4dfcce7c06137d29208fd28596f78b2cf85391aa))
* **layer:** export HTMLLayerDef and HTMLLayerTemplate from public API ([852057e](https://github.com/gwenjs/renderer-html/commit/852057ef6e465316add2d1470d8bce5536ec96dd))
* **layer:** replace spread with Array.from for safe Map iteration in clearSlots ([bc17afd](https://github.com/gwenjs/renderer-html/commit/bc17afd9c0b7e3d0c7e530fde6a245cea312fa0e))
* **layer:** reset right/bottom before viewport clip to prevent inset:0 conflict ([48d0a58](https://github.com/gwenjs/renderer-html/commit/48d0a58eea25c30be002e0b6ed5da92120714486))
* **layer:** suspend allocate() on viewport:remove to prevent slot recreation ([efe9cda](https://github.com/gwenjs/renderer-html/commit/efe9cdac29df931ab2f5107fdfb29caab204c652))
* **renderer-html:** address review feedback on camera integration ([75bf712](https://github.com/gwenjs/renderer-html/commit/75bf712f3137490dce7e1c5a6e82f8ef0609ea53))
* resolve lint and format issues ([5fa32d0](https://github.com/gwenjs/renderer-html/commit/5fa32d0c3ead99a74950110c3116cdfde04f00de))
* **service:** forward log to service, guard double-instantiate, clean tracking maps on unmount ([114da3c](https://github.com/gwenjs/renderer-html/commit/114da3ce8ff63d2537fab3b873836e6073dde767))
* **service:** set zIndex and pointerEvents on template layers at instantiation ([3c9f5e5](https://github.com/gwenjs/renderer-html/commit/3c9f5e5b14ec5d66856c96b28d7c60dff475dc07))
* **test:** use DOM query for element identity, remove fragile renderer-core patch ([db5f228](https://github.com/gwenjs/renderer-html/commit/db5f2282ea487dafac8154516393ef24171aa423))

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

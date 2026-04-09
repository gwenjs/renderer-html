# Changelog

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

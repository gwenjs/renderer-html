# useHTML()

Composable qui alloue un slot DOM pour une entité dans un layer HTML nommé.

```ts
function useHTML(layerName?: string, slotKey?: string): HTMLHandle
```

**Doit être appelé à l'intérieur de `defineActor()`.**

| Paramètre   | Type     | Défaut                | Description                                                          |
|-------------|----------|-----------------------|----------------------------------------------------------------------|
| `layerName` | `string` | premier layer déclaré | Nom du layer tel que déclaré dans `gwen.config.ts`.                  |
| `slotKey`   | `string` | `''`                  | Clé unique pour ce slot dans le layer. Utilisez une chaîne fixe pour les acteurs singleton (`'hud'`, `'score'`), ou `String(entityId)` quand plusieurs instances du même acteur peuvent coexister (NPC, ennemis…). `entityId` est l'identifiant ECS disponible dans la factory de `defineActor`. |

**Exceptions levées**
- `GwenPluginNotFoundError` — si `@gwenjs/renderer-html` n'est pas installé.
- `UnknownLayerError` — si `layerName` n'a pas été déclaré dans la config du renderer.

**Retourne** un [`HTMLHandle`](/fr/api/html-handle).

Le handle est automatiquement démonté lorsque l'acteur est détruit (`onDestroy` est enregistré en interne).

## Exemple

```ts
import { defineActor, useEntityId } from '@gwenjs/core/actor'

export const BossActor = defineActor(BossPrefab, () => {
  const entityId = useEntityId()
  const nameplate = useHTML('bubbles', String(entityId))

  onStart(() => nameplate.mount('<div class="nameplate">Boss</div>'))
  onDestroy(() => { /* handle.unmount() déjà enregistré — rien à faire */ })
})
```

/**
 * Conformance test — verifies @gwenjs/renderer-html satisfies the RendererService contract.
 *
 * Run: pnpm test
 */

import { describe, it } from 'vitest'
import { runConformanceTests } from '@gwenjs/renderer-core/testing'
import { HTMLRenderer } from '../src/html-renderer-service.js'

describe('@gwenjs/renderer-html conformance', () => {
  it('satisfies the RendererService contract', () => {
    const service = HTMLRenderer({
      layers: {
        background: { order: 0 },
        hud: { order: 100 },
      },
    })
    runConformanceTests(service)
  })
})

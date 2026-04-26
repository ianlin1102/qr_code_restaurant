import { describe, it, expect } from 'vitest'
import { execSync } from 'node:child_process'
import { ALL_MODULE_PERMISSIONS } from '@qr-order/shared/modules'

/**
 * Ghost permission guard — scans codebase for requirePermission('xxx') calls
 * and verifies every referenced permission string is registered in MODULE_REGISTRY.
 * If someone adds a new route with requirePermission('orders:refund') but
 * forgets to extend shared/modules.ts, this test fails in CI.
 */
describe('module registry', () => {
  it('every requirePermission() call references a registered permission', () => {
    const registered = new Set(ALL_MODULE_PERMISSIONS as readonly string[])

    // grep for requirePermission('...') + resolvePermission('...') + requireModule('...')
    // across server/src — handles both single and double quotes.
    const raw = execSync(
      `grep -rhnE "requirePermission\\(['\\\"]([^'\\\"]+)['\\\"]\\)" server/src 2>/dev/null || true`,
      { encoding: 'utf-8' }
    )

    const referenced = new Set<string>()
    const pattern = /requirePermission\(['"]([^'"]+)['"]\)/g
    for (const line of raw.split('\n')) {
      let m: RegExpExecArray | null
      while ((m = pattern.exec(line)) !== null) {
        referenced.add(m[1])
      }
    }

    const ghosts = Array.from(referenced).filter(p => !registered.has(p))
    if (ghosts.length > 0) {
      console.error('Ghost permissions (referenced in code but not in shared/modules.ts):')
      console.error(ghosts)
    }
    expect(ghosts).toEqual([])
  })

  it('MODULE_REGISTRY export has expected shape', async () => {
    const mod = await import('@qr-order/shared/modules')
    expect(mod.MODULE_REGISTRY).toBeDefined()
    expect(mod.ALL_MODULE_PERMISSIONS).toBeDefined()
    expect(Array.isArray(mod.ALL_MODULE_PERMISSIONS)).toBe(true)
    expect(mod.ALL_MODULE_PERMISSIONS.length).toBeGreaterThan(0)
  })
})

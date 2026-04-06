import { describe, it, expect } from 'vitest'
import { MODULE_REGISTRY, ALL_MODULE_PERMISSIONS, getModulePermissions } from '../modules'
import type { ModuleId } from '../modules'

describe('MODULE_REGISTRY', () => {
  it('has core as required', () => {
    expect(MODULE_REGISTRY.core.required).toBe(true)
  })

  it('all optional modules are not required', () => {
    const optional = Object.entries(MODULE_REGISTRY)
      .filter(([id]) => id !== 'core')
    for (const [id, mod] of optional) {
      expect(mod.required, `${id} should not be required`).toBe(false)
    }
  })

  it('every permission belongs to exactly one module', () => {
    const seen = new Map<string, string>()
    for (const [modId, mod] of Object.entries(MODULE_REGISTRY)) {
      for (const perm of mod.permissions) {
        expect(seen.has(perm), `"${perm}" in both "${seen.get(perm)}" and "${modId}"`).toBe(false)
        seen.set(perm, modId)
      }
    }
  })

  it('ALL_MODULE_PERMISSIONS contains all permissions from all modules', () => {
    const expected = Object.values(MODULE_REGISTRY).flatMap(m => [...m.permissions])
    expect(ALL_MODULE_PERMISSIONS).toHaveLength(expected.length)
    for (const p of expected) {
      expect(ALL_MODULE_PERMISSIONS).toContain(p)
    }
  })

  it('ALL_MODULE_PERMISSIONS has 18 permissions', () => {
    expect(ALL_MODULE_PERMISSIONS).toHaveLength(18)
  })
})

describe('getModulePermissions', () => {
  it('core-only returns 10 permissions', () => {
    const perms = getModulePermissions(['core'])
    expect(perms).toHaveLength(10)
    expect(perms).toContain('orders:read')
    expect(perms).toContain('billing:write')
    expect(perms).not.toContain('analytics:read')
  })

  it('auto-includes core even if not specified', () => {
    const perms = getModulePermissions(['analytics' as ModuleId])
    expect(perms).toContain('orders:read')
    expect(perms).toContain('analytics:read')
  })

  it('all modules returns 18 permissions', () => {
    const allIds = Object.keys(MODULE_REGISTRY) as ModuleId[]
    const perms = getModulePermissions(allIds)
    expect(perms).toHaveLength(18)
  })

  it('core + waitlist returns 12 permissions', () => {
    const perms = getModulePermissions(['core', 'waitlist'])
    expect(perms).toHaveLength(12)
    expect(perms).toContain('waitlist:read')
    expect(perms).toContain('waitlist:write')
    expect(perms).not.toContain('analytics:read')
  })

  it('handles unknown module gracefully', () => {
    const perms = getModulePermissions(['core', 'nonexistent' as ModuleId])
    expect(perms).toHaveLength(10)
  })
})

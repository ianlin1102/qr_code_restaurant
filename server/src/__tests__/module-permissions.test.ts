import { describe, it, expect, afterEach } from 'vitest'
import { getStoreModulePermissions, getStoreModules } from '../lib/module-permissions'
import { moduleLicenseStore } from '../repositories/stores'
import { resolvePermissions } from '../controllers/role.service'

const TEST_IDS: string[] = []
function track(id: string) { TEST_IDS.push(id); return id }

afterEach(() => {
  for (const id of TEST_IDS) moduleLicenseStore.delete(id)
  TEST_IDS.length = 0
})

describe('getStoreModulePermissions', () => {
  it('returns all permissions for store with no license record (backward compat)', () => {
    const perms = getStoreModulePermissions('nonexistent-store')
    expect(perms).toHaveLength(18)
    expect(perms).toContain('analytics:read')
    expect(perms).toContain('waitlist:write')
  })

  it('returns only core permissions for core-only store', () => {
    moduleLicenseStore.upsert(track('test-core-only'), {
      modules: ['core'],
      grantedAt: new Date().toISOString(),
    })
    const perms = getStoreModulePermissions('test-core-only')
    expect(perms).toHaveLength(10)
    expect(perms).toContain('orders:read')
    expect(perms).not.toContain('analytics:read')
    expect(perms).not.toContain('waitlist:read')
  })

  it('returns core + module permissions for licensed store', () => {
    moduleLicenseStore.upsert(track('test-partial'), {
      modules: ['core', 'analytics', 'waitlist'],
      grantedAt: new Date().toISOString(),
    })
    const perms = getStoreModulePermissions('test-partial')
    expect(perms).toHaveLength(13)
    expect(perms).toContain('analytics:read')
    expect(perms).toContain('waitlist:read')
    expect(perms).not.toContain('coupons:read')
    expect(perms).not.toContain('printer:write')
  })

  it('force-includes core even if license omits it', () => {
    moduleLicenseStore.upsert(track('test-no-core'), {
      modules: ['analytics'],
      grantedAt: new Date().toISOString(),
    })
    const perms = getStoreModulePermissions('test-no-core')
    expect(perms).toContain('orders:read')
    expect(perms).toContain('analytics:read')
  })
})

describe('getStoreModules', () => {
  it('returns all modules for store with no record', () => {
    const modules = getStoreModules('nonexistent')
    expect(modules).toHaveLength(6)
    expect(modules).toContain('core')
    expect(modules).toContain('analytics')
  })

  it('returns licensed modules for configured store', () => {
    moduleLicenseStore.upsert(track('test-modules'), {
      modules: ['core', 'printer'],
      grantedAt: new Date().toISOString(),
    })
    const modules = getStoreModules('test-modules')
    expect(modules).toContain('core')
    expect(modules).toContain('printer')
    expect(modules).not.toContain('analytics')
  })
})

describe('resolvePermissions with module intersection', () => {
  it('owner of core-only store gets only core permissions', () => {
    moduleLicenseStore.upsert(track('test-owner-core'), {
      modules: ['core'],
      grantedAt: new Date().toISOString(),
    })
    const perms = resolvePermissions('test-owner-core', undefined, 'owner')
    expect(perms).toHaveLength(10)
    expect(perms).toContain('orders:read')
    expect(perms).not.toContain('analytics:read')
    expect(perms).not.toContain('waitlist:read')
  })

  it('owner of full-module store gets all 18 permissions', () => {
    const perms = resolvePermissions('nonexistent-store', undefined, 'owner')
    expect(perms).toHaveLength(18)
  })

  it('waiter of core+waitlist store gets waitlist:read but not analytics', () => {
    moduleLicenseStore.upsert(track('test-waiter-store'), {
      modules: ['core', 'waitlist'],
      grantedAt: new Date().toISOString(),
    })
    const perms = resolvePermissions('test-waiter-store', undefined, 'staff')
    expect(perms).toContain('orders:read')
    expect(perms).toContain('waitlist:read')
    expect(perms).not.toContain('analytics:read')
  })
})

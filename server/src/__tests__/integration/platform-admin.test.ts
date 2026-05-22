import { describe, it, expect } from 'vitest'
import { testDb, withTestPlatform } from './setup.js'
import { seedMinimalStore } from './fixtures.js'
import { platformAdminRepo } from '../../repositories/platform-admin.js'

describe('platform-admin repository — integration (BYPASSRLS, withTestPlatform)', () => {
  // ============================================================
  // §1 Admin CRUD — createAdmin + find (5 tests)
  // ============================================================
  describe('§1 Admin CRUD', () => {
    it('createAdmin → findAdminById round-trip: role stored correctly + isActive default true + createdAt populated', async () => {
      const created = await withTestPlatform((tx) =>
        platformAdminRepo.createAdmin({
          email: 'admin@test.local',
          passwordHash: 'hash-test',
          role: 'platform_admin',
        }, tx)
      )
      const fetched = await withTestPlatform((tx) =>
        platformAdminRepo.findAdminById(created.id, tx)
      )
      expect(fetched).not.toBeNull()
      expect(fetched!.id).toBe(created.id)
      expect(fetched!.email).toBe('admin@test.local')
      expect(fetched!.passwordHash).toBe('hash-test')
      expect(fetched!.role).toBe('platform_admin')
      expect(fetched!.isActive).toBe(true)
      expect(fetched!.lastLoginAt).toBeNull()
      expect(fetched!.createdAt).toBeInstanceOf(Date)
    })

    it('createAdmin → findAdminByEmail: query by email returns the admin', async () => {
      await withTestPlatform((tx) =>
        platformAdminRepo.createAdmin({
          email: 'find@test.local',
          passwordHash: 'h',
          role: 'platform_admin',
        }, tx)
      )
      const found = await withTestPlatform((tx) =>
        platformAdminRepo.findAdminByEmail('find@test.local', tx)
      )
      expect(found).not.toBeNull()
      expect(found!.email).toBe('find@test.local')
    })

    it('findAdminByEmail non-existent email → null', async () => {
      const found = await withTestPlatform((tx) =>
        platformAdminRepo.findAdminByEmail('nonexistent@test.local', tx)
      )
      expect(found).toBeNull()
    })

    it('findAdminById non-existent id → null', async () => {
      const found = await withTestPlatform((tx) =>
        platformAdminRepo.findAdminById('00000000-0000-0000-0000-000000000000', tx)
      )
      expect(found).toBeNull()
    })

    it('createAdmin duplicate email → throws (email @unique)', async () => {
      await withTestPlatform((tx) =>
        platformAdminRepo.createAdmin({
          email: 'dup@test.local',
          passwordHash: 'h',
          role: 'platform_admin',
        }, tx)
      )
      await expect(
        withTestPlatform((tx) =>
          platformAdminRepo.createAdmin({
            email: 'dup@test.local',
            passwordHash: 'h2',
            role: 'platform_admin',
          }, tx)
        )
      ).rejects.toThrow()
    })
  })

  // ============================================================
  // §2 updateLastLoginAt (1 test)
  // ============================================================
  describe('§2 updateLastLoginAt', () => {
    it('updateLastLoginAt: lastLoginAt null → given Date', async () => {
      const created = await withTestPlatform((tx) =>
        platformAdminRepo.createAdmin({
          email: 'login@test.local',
          passwordHash: 'h',
          role: 'platform_admin',
        }, tx)
      )
      expect(created.lastLoginAt).toBeNull()
      const now = new Date('2026-05-22T10:30:00Z')
      const updated = await withTestPlatform((tx) =>
        platformAdminRepo.updateLastLoginAt(created.id, now, tx)
      )
      expect(updated.lastLoginAt?.toISOString()).toBe(now.toISOString())
    })
  })

  // ============================================================
  // §3 listAllStores cross-tenant visibility (1 test)
  // ============================================================
  describe('§3 listAllStores cross-tenant visibility', () => {
    it('2 different stores seeded → listAllStores returns both (BYPASSRLS sees all tenants)', async () => {
      const { storeA, storeB } = await withTestPlatform(async (tx) => ({
        storeA: await seedMinimalStore(tx, { name: 'Store A' }),
        storeB: await seedMinimalStore(tx, { name: 'Store B' }),
      }))
      const allStores = await withTestPlatform((tx) =>
        platformAdminRepo.listAllStores(tx)
      )
      const ids = allStores.map((s) => s.id).sort()
      expect(ids).toContain(storeA.id)
      expect(ids).toContain(storeB.id)
      expect(allStores).toHaveLength(2)
    })
  })

  // ============================================================
  // §4 grantModules upsert (3 tests)
  // ============================================================
  describe('§4 grantModules upsert', () => {
    it('grantModules on store with NO license → creates ModuleLicense (upsert create branch)', async () => {
      const store = await withTestPlatform(async (tx) =>
        tx.store.create({
          data: { name: 'No License Store', tipBase: 'pretax' },
        })
      )
      const admin = await withTestPlatform((tx) =>
        platformAdminRepo.createAdmin({
          email: 'grant1@test.local',
          passwordHash: 'h',
          role: 'platform_admin',
        }, tx)
      )
      const license = await withTestPlatform((tx) =>
        platformAdminRepo.grantModules(store.id, ['analytics', 'coupons'], admin.id, tx)
      )
      expect(license.storeId).toBe(store.id)
      expect(license.modules).toContain('core')
      expect(license.modules).toContain('analytics')
      expect(license.modules).toContain('coupons')
      expect(license.grantedBy).toBe(admin.id)
    })

    it('grantModules on store with existing license → updates (upsert update branch)', async () => {
      const store = await withTestPlatform((tx) => seedMinimalStore(tx))
      const admin = await withTestPlatform((tx) =>
        platformAdminRepo.createAdmin({
          email: 'grant2@test.local',
          passwordHash: 'h',
          role: 'platform_admin',
        }, tx)
      )
      const license = await withTestPlatform((tx) =>
        platformAdminRepo.grantModules(store.id, ['core', 'waitlist'], admin.id, tx)
      )
      expect(license.modules).toContain('core')
      expect(license.modules).toContain('waitlist')
      expect(license.grantedBy).toBe(admin.id)
    })

    it('grantModules normalization: input WITHOUT core → core prepended (business invariant)', async () => {
      const store = await withTestPlatform(async (tx) =>
        tx.store.create({
          data: { name: 'Norm Store', tipBase: 'pretax' },
        })
      )
      const admin = await withTestPlatform((tx) =>
        platformAdminRepo.createAdmin({
          email: 'norm@test.local',
          passwordHash: 'h',
          role: 'platform_admin',
        }, tx)
      )
      const license = await withTestPlatform((tx) =>
        platformAdminRepo.grantModules(store.id, ['analytics'], admin.id, tx)
      )
      expect(license.modules[0]).toBe('core')
      expect(license.modules).toContain('analytics')
    })
  })

  // ============================================================
  // §5 revokeModules + 'core' protection (4 tests) ⭐⭐
  // ============================================================
  describe('§5 revokeModules + core protection', () => {
    it('revokeModules removes non-core: [core, analytics, coupons] revoke [analytics] → [core, coupons]', async () => {
      const store = await withTestPlatform((tx) =>
        seedMinimalStore(tx, { modules: ['core', 'analytics', 'coupons'] })
      )
      const admin = await withTestPlatform((tx) =>
        platformAdminRepo.createAdmin({
          email: 'rev1@test.local',
          passwordHash: 'h',
          role: 'platform_admin',
        }, tx)
      )
      const license = await withTestPlatform((tx) =>
        platformAdminRepo.revokeModules(store.id, ['analytics'], admin.id, tx)
      )
      expect(license.modules).toContain('core')
      expect(license.modules).toContain('coupons')
      expect(license.modules).not.toContain('analytics')
    })

    it('⭐ revokeModules cannot remove core: [core, analytics] revoke [core, analytics] → license still contains core', async () => {
      const store = await withTestPlatform((tx) =>
        seedMinimalStore(tx, { modules: ['core', 'analytics'] })
      )
      const admin = await withTestPlatform((tx) =>
        platformAdminRepo.createAdmin({
          email: 'rev2@test.local',
          passwordHash: 'h',
          role: 'platform_admin',
        }, tx)
      )
      const license = await withTestPlatform((tx) =>
        platformAdminRepo.revokeModules(store.id, ['core', 'analytics'], admin.id, tx)
      )
      expect(license.modules).toContain('core')
      expect(license.modules).not.toContain('analytics')
    })

    it('⭐ revokeModules with [core] only in removeList → license unchanged (core silently filtered)', async () => {
      const store = await withTestPlatform((tx) =>
        seedMinimalStore(tx, { modules: ['core', 'waitlist'] })
      )
      const admin = await withTestPlatform((tx) =>
        platformAdminRepo.createAdmin({
          email: 'rev3@test.local',
          passwordHash: 'h',
          role: 'platform_admin',
        }, tx)
      )
      const license = await withTestPlatform((tx) =>
        platformAdminRepo.revokeModules(store.id, ['core'], admin.id, tx)
      )
      expect(license.modules).toContain('core')
      expect(license.modules).toContain('waitlist')
    })

    it('revokeModules on store WITHOUT license → throws', async () => {
      const store = await withTestPlatform(async (tx) =>
        tx.store.create({
          data: { name: 'No License', tipBase: 'pretax' },
        })
      )
      const admin = await withTestPlatform((tx) =>
        platformAdminRepo.createAdmin({
          email: 'rev4@test.local',
          passwordHash: 'h',
          role: 'platform_admin',
        }, tx)
      )
      await expect(
        withTestPlatform((tx) =>
          platformAdminRepo.revokeModules(store.id, ['analytics'], admin.id, tx)
        )
      ).rejects.toThrow(/Cannot revokeModules/)
    })
  })
})

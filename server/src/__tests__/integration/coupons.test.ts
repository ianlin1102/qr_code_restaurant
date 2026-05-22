import { describe, it, expect } from 'vitest'
import { testDb, withTestTenant, withTestPlatform } from './setup.js'
import { seedMinimalStore } from './fixtures.js'
import { couponRepo } from '../../repositories/coupons.js'

describe('coupons repository — integration', () => {
  // ============================================================
  // §1 CRUD round-trip
  // ============================================================
  describe('§1 CRUD round-trip', () => {
    it('create → findById round-trip all fields equal', async () => {
      const store = await withTestPlatform((tx) => seedMinimalStore(tx))
      const expiresAt = new Date('2030-01-01T00:00:00Z')
      const created = await withTestTenant(store.id, (tx) =>
        couponRepo.create({
          storeId: store.id,
          code: 'WELCOME10',
          discountType: 'percent',
          discountValue: 10,
          minOrderAmount: 500,
          maxUses: 100,
          isActive: true,
          expiresAt,
        }, tx)
      )
      const fetched = await withTestTenant(store.id, (tx) =>
        couponRepo.findById(created.id, tx)
      )
      expect(fetched).not.toBeNull()
      expect(fetched!.id).toBe(created.id)
      expect(fetched!.code).toBe('WELCOME10')
      expect(fetched!.discountType).toBe('percent')
      expect(fetched!.discountValue).toBe(10)
      expect(fetched!.minOrderAmount).toBe(500)
      expect(fetched!.maxUses).toBe(100)
      expect(fetched!.isActive).toBe(true)
      expect(fetched!.expiresAt?.toISOString()).toBe(expiresAt.toISOString())
      expect(fetched!.currentUses).toBe(0)
    })

    it('create without isActive → defaults to true (schema @default + plan ?? true)', async () => {
      const store = await withTestPlatform((tx) => seedMinimalStore(tx))
      const created = await withTestTenant(store.id, (tx) =>
        couponRepo.create({
          storeId: store.id,
          code: 'NODEFAULT',
          discountType: 'fixed',
          discountValue: 200,
        }, tx)
      )
      expect(created.isActive).toBe(true)
      expect(created.currentUses).toBe(0)
      expect(created.minOrderAmount).toBeNull()
      expect(created.maxUses).toBeNull()
      expect(created.expiresAt).toBeNull()
    })

    it('findByStoreId returns all coupons sorted by createdAt desc', async () => {
      const store = await withTestPlatform((tx) => seedMinimalStore(tx))
      await withTestTenant(store.id, async (tx) => {
        await couponRepo.create({ storeId: store.id, code: 'A', discountType: 'percent', discountValue: 5 }, tx)
        await new Promise((r) => setTimeout(r, 10))
        await couponRepo.create({ storeId: store.id, code: 'B', discountType: 'percent', discountValue: 10 }, tx)
        await new Promise((r) => setTimeout(r, 10))
        await couponRepo.create({ storeId: store.id, code: 'C', discountType: 'percent', discountValue: 15 }, tx)
      })
      const list = await withTestTenant(store.id, (tx) => couponRepo.findByStoreId(store.id, tx))
      expect(list).toHaveLength(3)
      // orderBy createdAt desc → most recent first
      expect(list[0].code).toBe('C')
      expect(list[1].code).toBe('B')
      expect(list[2].code).toBe('A')
    })

    it('update partial passthrough: single field update preserves other fields', async () => {
      // partial update 保留其他字段 (Prisma `data: patch` undefined-handling — keys absent
      // → fields unchanged). NOTE: mechanism differs from Task 23 roles.ts conditional spread,
      // but observable behavior same. Test validates Prisma undefined-handling at runtime.
      const store = await withTestPlatform((tx) => seedMinimalStore(tx))
      const created = await withTestTenant(store.id, (tx) =>
        couponRepo.create({
          storeId: store.id,
          code: 'BEFORE',
          discountType: 'percent',
          discountValue: 10,
          minOrderAmount: 500,
          maxUses: 50,
        }, tx)
      )
      await withTestTenant(store.id, (tx) =>
        couponRepo.update(created.id, { code: 'AFTER' }, tx)
      )
      const fetched = await withTestTenant(store.id, (tx) =>
        couponRepo.findById(created.id, tx)
      )
      expect(fetched!.code).toBe('AFTER')
      // Other fields preserved
      expect(fetched!.discountType).toBe('percent')
      expect(fetched!.discountValue).toBe(10)
      expect(fetched!.minOrderAmount).toBe(500)
      expect(fetched!.maxUses).toBe(50)
      expect(fetched!.isActive).toBe(true)
    })

    it('delete → findById returns null', async () => {
      const store = await withTestPlatform((tx) => seedMinimalStore(tx))
      const created = await withTestTenant(store.id, (tx) =>
        couponRepo.create({ storeId: store.id, code: 'DELME', discountType: 'percent', discountValue: 10 }, tx)
      )
      await withTestTenant(store.id, (tx) => couponRepo.delete(created.id, tx))
      const fetched = await withTestTenant(store.id, (tx) =>
        couponRepo.findById(created.id, tx)
      )
      expect(fetched).toBeNull()
    })
  })

  // ============================================================
  // §2 findActiveByCode semantic (类型 1 盲区核心)
  // ============================================================
  describe('§2 findActiveByCode semantic', () => {
    it('active + code match → returns coupon', async () => {
      const store = await withTestPlatform((tx) => seedMinimalStore(tx))
      await withTestTenant(store.id, (tx) =>
        couponRepo.create({
          storeId: store.id,
          code: 'ACTIVE10',
          discountType: 'percent',
          discountValue: 10,
          isActive: true,
        }, tx)
      )
      const found = await withTestTenant(store.id, (tx) =>
        couponRepo.findActiveByCode(store.id, 'ACTIVE10', tx)
      )
      expect(found).not.toBeNull()
      expect(found!.code).toBe('ACTIVE10')
      expect(found!.isActive).toBe(true)
    })

    it('inactive (isActive=false) + code match → null (isActive filter core)', async () => {
      const store = await withTestPlatform((tx) => seedMinimalStore(tx))
      await withTestTenant(store.id, (tx) =>
        couponRepo.create({
          storeId: store.id,
          code: 'INACTIVE',
          discountType: 'percent',
          discountValue: 10,
          isActive: false,
        }, tx)
      )
      const found = await withTestTenant(store.id, (tx) =>
        couponRepo.findActiveByCode(store.id, 'INACTIVE', tx)
      )
      expect(found).toBeNull()
    })

    it('active + code mismatch → null', async () => {
      const store = await withTestPlatform((tx) => seedMinimalStore(tx))
      await withTestTenant(store.id, (tx) =>
        couponRepo.create({ storeId: store.id, code: 'KNOWN', discountType: 'percent', discountValue: 10 }, tx)
      )
      const found = await withTestTenant(store.id, (tx) =>
        couponRepo.findActiveByCode(store.id, 'UNKNOWN', tx)
      )
      expect(found).toBeNull()
    })

    it('multiple coupons, only matching code returned', async () => {
      const store = await withTestPlatform((tx) => seedMinimalStore(tx))
      await withTestTenant(store.id, async (tx) => {
        await couponRepo.create({ storeId: store.id, code: 'A', discountType: 'percent', discountValue: 5 }, tx)
        await couponRepo.create({ storeId: store.id, code: 'B', discountType: 'percent', discountValue: 10 }, tx)
        await couponRepo.create({ storeId: store.id, code: 'C', discountType: 'percent', discountValue: 15 }, tx)
      })
      const found = await withTestTenant(store.id, (tx) =>
        couponRepo.findActiveByCode(store.id, 'B', tx)
      )
      expect(found).not.toBeNull()
      expect(found!.code).toBe('B')
      expect(found!.discountValue).toBe(10)
    })

    it('same code different stores → RLS isolation, only current store coupon visible', async () => {
      const { storeA, storeB } = await withTestPlatform(async (tx) => ({
        storeA: await seedMinimalStore(tx, { name: 'Store A' }),
        storeB: await seedMinimalStore(tx, { name: 'Store B' }),
      }))
      // Seed same code in both stores via BYPASSRLS (avoid tenant context mismatch on insert)
      await withTestPlatform(async (tx) => {
        await tx.coupon.create({ data: { storeId: storeA.id, code: 'SHARED', discountType: 'percent', discountValue: 5, isActive: true, currentUses: 0 } })
        await tx.coupon.create({ data: { storeId: storeB.id, code: 'SHARED', discountType: 'percent', discountValue: 20, isActive: true, currentUses: 0 } })
      })
      const fromA = await withTestTenant(storeA.id, (tx) =>
        couponRepo.findActiveByCode(storeA.id, 'SHARED', tx)
      )
      expect(fromA).not.toBeNull()
      expect(fromA!.discountValue).toBe(5) // Store A's coupon, NOT B's (20)
    })

    it('active + expired (expiresAt past) + code match → null (业务: expired coupon unusable)', async () => {
      // Oracle 独立于 plan: 业务需求 = "已过期 coupon 不可用". 即使 plan where 漏过期过滤, 此 test 应 fail = test catches 盲区.
      const store = await withTestPlatform((tx) => seedMinimalStore(tx))
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
      await withTestTenant(store.id, (tx) =>
        couponRepo.create({
          storeId: store.id,
          code: 'EXPIRED',
          discountType: 'percent',
          discountValue: 10,
          isActive: true,
          expiresAt: pastDate,
        }, tx)
      )
      const found = await withTestTenant(store.id, (tx) =>
        couponRepo.findActiveByCode(store.id, 'EXPIRED', tx)
      )
      expect(found).toBeNull()
    })

    it('active + expiresAt null + code match → returns (never expires)', async () => {
      const store = await withTestPlatform((tx) => seedMinimalStore(tx))
      await withTestTenant(store.id, (tx) =>
        couponRepo.create({
          storeId: store.id,
          code: 'NEVEREXPIRES',
          discountType: 'percent',
          discountValue: 10,
          isActive: true,
          expiresAt: null,
        }, tx)
      )
      const found = await withTestTenant(store.id, (tx) =>
        couponRepo.findActiveByCode(store.id, 'NEVEREXPIRES', tx)
      )
      expect(found).not.toBeNull()
      expect(found!.expiresAt).toBeNull()
    })

    it('active + expiresAt future + code match → returns (not yet expired)', async () => {
      const store = await withTestPlatform((tx) => seedMinimalStore(tx))
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      await withTestTenant(store.id, (tx) =>
        couponRepo.create({
          storeId: store.id,
          code: 'FUTURE',
          discountType: 'percent',
          discountValue: 10,
          isActive: true,
          expiresAt: futureDate,
        }, tx)
      )
      const found = await withTestTenant(store.id, (tx) =>
        couponRepo.findActiveByCode(store.id, 'FUTURE', tx)
      )
      expect(found).not.toBeNull()
    })
  })

  // ============================================================
  // §3 incrementUses atomicity
  // ============================================================
  describe('§3 incrementUses atomicity', () => {
    it('one call → currentUses + 1', async () => {
      const store = await withTestPlatform((tx) => seedMinimalStore(tx))
      const created = await withTestTenant(store.id, (tx) =>
        couponRepo.create({ storeId: store.id, code: 'INC1', discountType: 'percent', discountValue: 5 }, tx)
      )
      expect(created.currentUses).toBe(0)
      await withTestTenant(store.id, (tx) => couponRepo.incrementUses(created.id, tx))
      const after = await withTestTenant(store.id, (tx) =>
        couponRepo.findById(created.id, tx)
      )
      expect(after!.currentUses).toBe(1)
    })

    it('three sequential calls → +3 cumulative', async () => {
      const store = await withTestPlatform((tx) => seedMinimalStore(tx))
      const created = await withTestTenant(store.id, (tx) =>
        couponRepo.create({ storeId: store.id, code: 'INC3', discountType: 'percent', discountValue: 5 }, tx)
      )
      await withTestTenant(store.id, async (tx) => {
        await couponRepo.incrementUses(created.id, tx)
        await couponRepo.incrementUses(created.id, tx)
        await couponRepo.incrementUses(created.id, tx)
      })
      const after = await withTestTenant(store.id, (tx) =>
        couponRepo.findById(created.id, tx)
      )
      expect(after!.currentUses).toBe(3)
    })

    it('two concurrent parallel calls → +2 (runtime smoke check; atomicity statically guaranteed)', async () => {
      // Runtime smoke check — atomicity statically guaranteed by Prisma `{ increment: 1 }`
      // SQL gen (UPDATE col = col + 1 with Postgres row-level lock) + Stage 1.5 grep gate.
      // Test value: catches if impl ever changes to read-modify-write pattern.
      // Discrimination power depends on Prisma pool real concurrency (multiple connections).
      const store = await withTestPlatform((tx) => seedMinimalStore(tx))
      const created = await withTestTenant(store.id, (tx) =>
        couponRepo.create({ storeId: store.id, code: 'CONC', discountType: 'percent', discountValue: 5 }, tx)
      )
      // Parallel calls — each in its own tenant transaction
      await Promise.all([
        withTestTenant(store.id, (tx) => couponRepo.incrementUses(created.id, tx)),
        withTestTenant(store.id, (tx) => couponRepo.incrementUses(created.id, tx)),
      ])
      const after = await withTestTenant(store.id, (tx) =>
        couponRepo.findById(created.id, tx)
      )
      expect(after!.currentUses).toBe(2) // atomic; lost update would yield 1
    })

    it('incrementUses past maxUses still increments (repo NO cap, business enforce in service)', async () => {
      // Oracle: business 规则 (maxUses cap) 在 service layer NOT repo. repo `incrementUses` 只 atomic increment.
      const store = await withTestPlatform((tx) => seedMinimalStore(tx))
      const created = await withTestTenant(store.id, (tx) =>
        couponRepo.create({
          storeId: store.id,
          code: 'CAPPED',
          discountType: 'percent',
          discountValue: 5,
          maxUses: 2,
        }, tx)
      )
      await withTestTenant(store.id, async (tx) => {
        await couponRepo.incrementUses(created.id, tx)
        await couponRepo.incrementUses(created.id, tx)
        await couponRepo.incrementUses(created.id, tx) // exceeds maxUses 2 → repo still increments
      })
      const after = await withTestTenant(store.id, (tx) =>
        couponRepo.findById(created.id, tx)
      )
      expect(after!.currentUses).toBe(3) // repo NO cap; service layer enforces business
      expect(after!.maxUses).toBe(2)
    })
  })

  // ============================================================
  // §4 multi-tenant isolation (RLS) 安全关键
  // ============================================================
  describe('§4 multi-tenant isolation (RLS)', () => {
    it('store A coupon → store B context findByStoreId returns []', async () => {
      const { storeA, storeB } = await withTestPlatform(async (tx) => ({
        storeA: await seedMinimalStore(tx, { name: 'A' }),
        storeB: await seedMinimalStore(tx, { name: 'B' }),
      }))
      await withTestPlatform(async (tx) => {
        await tx.coupon.create({
          data: {
            storeId: storeA.id,
            code: 'A_COUPON',
            discountType: 'percent',
            discountValue: 5,
            isActive: true,
            currentUses: 0,
          },
        })
      })
      // From store B's tenant context, querying store A's storeId → RLS filter empty
      const fromB = await withTestTenant(storeB.id, (tx) =>
        couponRepo.findByStoreId(storeA.id, tx)
      )
      expect(fromB).toEqual([])
    })

    it('store A coupon id → store B context findById returns null (RLS filter on findUnique)', async () => {
      const { storeA, storeB } = await withTestPlatform(async (tx) => ({
        storeA: await seedMinimalStore(tx, { name: 'A' }),
        storeB: await seedMinimalStore(tx, { name: 'B' }),
      }))
      const coupon = await withTestPlatform((tx) =>
        tx.coupon.create({
          data: {
            storeId: storeA.id,
            code: 'A_C',
            discountType: 'percent',
            discountValue: 5,
            isActive: true,
            currentUses: 0,
          },
        })
      )
      const fromB = await withTestTenant(storeB.id, (tx) =>
        couponRepo.findById(coupon.id, tx)
      )
      expect(fromB).toBeNull() // RLS filter: findUnique with id-only respects RLS via app.current_store_id
    })

    it('store B context delete on store A coupon → throws (RLS filter)', async () => {
      const { storeA, storeB } = await withTestPlatform(async (tx) => ({
        storeA: await seedMinimalStore(tx, { name: 'A' }),
        storeB: await seedMinimalStore(tx, { name: 'B' }),
      }))
      const coupon = await withTestPlatform((tx) =>
        tx.coupon.create({
          data: {
            storeId: storeA.id,
            code: 'A_D',
            discountType: 'percent',
            discountValue: 5,
            isActive: true,
            currentUses: 0,
          },
        })
      )
      // Prisma delete with mismatched RLS context → throws Record not found or RLS violation
      await expect(
        withTestTenant(storeB.id, (tx) => couponRepo.delete(coupon.id, tx))
      ).rejects.toThrow()
    })
  })

  // ============================================================
  // §5 boundary data
  // ============================================================
  describe('§5 boundary data', () => {
    it('isActive explicit false NOT returned by findActiveByCode', async () => {
      const store = await withTestPlatform((tx) => seedMinimalStore(tx))
      await withTestTenant(store.id, (tx) =>
        couponRepo.create({
          storeId: store.id,
          code: 'EXPLICITFALSE',
          discountType: 'percent',
          discountValue: 10,
          isActive: false,
        }, tx)
      )
      const found = await withTestTenant(store.id, (tx) =>
        couponRepo.findActiveByCode(store.id, 'EXPLICITFALSE', tx)
      )
      expect(found).toBeNull()
    })

    it('duplicate code same store throws (@@unique([storeId, code]))', async () => {
      const store = await withTestPlatform((tx) => seedMinimalStore(tx))
      await withTestTenant(store.id, (tx) =>
        couponRepo.create({ storeId: store.id, code: 'DUP', discountType: 'percent', discountValue: 5 }, tx)
      )
      await expect(
        withTestTenant(store.id, (tx) =>
          couponRepo.create({ storeId: store.id, code: 'DUP', discountType: 'percent', discountValue: 10 }, tx)
        )
      ).rejects.toThrow() // Prisma unique constraint violation
    })

    it('empty string code create accepted (no app-level validation in repo)', async () => {
      const store = await withTestPlatform((tx) => seedMinimalStore(tx))
      const created = await withTestTenant(store.id, (tx) =>
        couponRepo.create({ storeId: store.id, code: '', discountType: 'percent', discountValue: 5 }, tx)
      )
      expect(created.code).toBe('')
    })
  })
})

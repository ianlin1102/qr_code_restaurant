import { describe, it, expect } from 'vitest'
import { testDb, withTestTenant } from './setup.js'
import { seedStoreWithMenu } from './fixtures.js'

describe('tenant isolation — RLS strict mode', () => {
  it('bare prisma query without tenant context throws', async () => {
    // A2 防御：set_config 严格模式下，current_setting 无 fallback → 抛 unrecognized configuration parameter。
    // 证明忘记包 withTenantContext 不会静默返回空，而是显式失败。
    await expect(
      testDb.order.findMany()
    ).rejects.toThrow(/app\.current_store_id|unrecognized configuration/i)
  })

  it('INSERT without tenant context throws (WITH CHECK defense)', async () => {
    // Plan 阶段补强：WITH CHECK 挡住 "漏写 store_id 的 insert"。
    // Prisma 要求 storeId 在 payload 里，即使给了也要经过 RLS policy 校验 current_setting。
    await expect(
      testDb.order.create({
        data: {
          storeId: '00000000-0000-0000-0000-000000000999',
          tableId: '00000000-0000-0000-0000-000000000000',
          status: 'pending' as any,
          version: 0,
        } as any,
      })
    ).rejects.toThrow()  // 具体 error message 取决于哪个 constraint 先挡
  })

  it('tenant A cannot see tenant B data', async () => {
    // 用 platform role 建两个 store + 各自的订单，然后用租户 context 验证看不到对方
    const { storeA, storeB } = await testDb.$transaction(async (tx) => {
      await tx.$executeRaw`SET LOCAL ROLE platform_admin`
      const a = await seedStoreWithMenu(tx, { name: 'Store A' })
      const b = await seedStoreWithMenu(tx, { name: 'Store B' })
      // 各自建一个 order
      await tx.order.create({
        data: { storeId: a.store.id, tableId: a.table.id, tableName: a.table.name, status: 'pending' as any, version: 0 },
      })
      await tx.order.create({
        data: { storeId: b.store.id, tableId: b.table.id, tableName: b.table.name, status: 'pending' as any, version: 0 },
      })
      return { storeA: a.store, storeB: b.store }
    })

    const ordersA = await withTestTenant(storeA.id, (tx) => tx.order.findMany())
    const ordersB = await withTestTenant(storeB.id, (tx) => tx.order.findMany())

    expect(ordersA).toHaveLength(1)
    expect(ordersA[0].storeId).toBe(storeA.id)
    expect(ordersB).toHaveLength(1)
    expect(ordersB[0].storeId).toBe(storeB.id)
  })

  it('INSERT with mismatching storeId in tenant context is rejected by WITH CHECK', async () => {
    const { storeA, storeB } = await testDb.$transaction(async (tx) => {
      await tx.$executeRaw`SET LOCAL ROLE platform_admin`
      const a = await seedStoreWithMenu(tx, { name: 'A' })
      const b = await seedStoreWithMenu(tx, { name: 'B' })
      return { storeA: a.store, storeB: b.store }
    })

    // 在 storeA 的 context 里试图 insert 一个属于 storeB 的 order
    await expect(
      withTestTenant(storeA.id, (tx) =>
        tx.order.create({
          data: {
            storeId: storeB.id,  // ❌ 不匹配
            tableId: '00000000-0000-0000-0000-000000000000',
            tableName: 'placeholder-table',
            status: 'pending' as any,
            version: 0,
          },
        })
      )
    ).rejects.toThrow(/row-level security|new row violates/i)
  })
})

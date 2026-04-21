import { describe, it, expect } from 'vitest'
import { testDb, withTestTenant } from './setup.js'
import { seedMinimalStore, seedStoreWithMenu, seedFullTenant } from './fixtures.js'

describe('fixtures', () => {
  it('seedMinimalStore creates a store with module license', async () => {
    // fixture 传 testDb（非事务）给它，不开 tenant context——因为 store/module_license 的
    // RLS policy 要求 storeId，而我们此时还在 *创建* store。
    // 正确做法：用 platform context 创建，然后在 tenant context 下验证。
    const result = await testDb.$transaction(async (tx) => {
      await tx.$executeRaw`SET LOCAL ROLE platform_admin`
      return seedMinimalStore(tx, { name: 'Fixture Test' })
    })
    expect(result.id).toBeTruthy()
    expect(result.name).toBe('Fixture Test')

    const license = await testDb.moduleLicense.findUnique({ where: { storeId: result.id } })
    expect(license?.modules).toEqual(['core'])
  })

  it('seedStoreWithMenu creates menu items', async () => {
    const { store, menuItems, table } = await testDb.$transaction(async (tx) => {
      await tx.$executeRaw`SET LOCAL ROLE platform_admin`
      return seedStoreWithMenu(tx)
    })
    expect(menuItems).toHaveLength(2)
    expect(menuItems[0].price).toBe(1000)
    expect(table.name).toBe('T1')
  })

  it('seedFullTenant includes owner + roles', async () => {
    const { ownerRole, ownerStaff } = await testDb.$transaction(async (tx) => {
      await tx.$executeRaw`SET LOCAL ROLE platform_admin`
      return seedFullTenant(tx)
    })
    expect(ownerRole.name).toBe('owner')
    expect(ownerStaff.username).toBe('owner@test.local')
    expect(ownerStaff.roleId).toBe(ownerRole.id)
  })
})

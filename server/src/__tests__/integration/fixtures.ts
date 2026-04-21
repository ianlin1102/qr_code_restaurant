import type { Prisma } from '@prisma/client'
import bcrypt from 'bcryptjs'

const MODULES_FULL = ['core', 'analytics', 'coupons', 'waitlist', 'printer', 'staff-management']

type Tx = Prisma.TransactionClient

/**
 * Seed just a store + empty module license. Caller provides tx (rule 3).
 * Returns the created store.
 */
export async function seedMinimalStore(
  tx: Tx,
  overrides?: { id?: string; name?: string; modules?: string[] }
) {
  const id = overrides?.id ?? crypto.randomUUID()
  const store = await tx.store.create({
    data: {
      id,
      name: overrides?.name ?? 'Test Store',
      tipBase: 'pretax',
    },
  })
  await tx.moduleLicense.create({
    data: {
      storeId: store.id,
      modules: overrides?.modules ?? ['core'],
      grantedAt: new Date(),
      grantedBy: 'test-fixture',
    },
  })
  return store
}

/**
 * Store + 1 category + 2 menu items + 1 table. No staff.
 * Useful for menu/cart/order tests.
 */
export async function seedStoreWithMenu(tx: Tx, storeOverrides?: Parameters<typeof seedMinimalStore>[1]) {
  const store = await seedMinimalStore(tx, storeOverrides)
  const category = await tx.category.create({
    data: { storeId: store.id, name: 'Test Category', sortOrder: 0 },
  })
  const menuItem1 = await tx.menuItem.create({
    data: { storeId: store.id, categoryId: category.id, name: 'Item A', price: 1000, sortOrder: 0 },
  })
  const menuItem2 = await tx.menuItem.create({
    data: { storeId: store.id, categoryId: category.id, name: 'Item B', price: 2000, sortOrder: 1 },
  })
  const table = await tx.table.create({
    data: {
      storeId: store.id,
      name: 'T1',
      number: 1,
      qrCode: `test-${store.id.slice(0, 8)}-t1`,
    },
  })
  return { store, category, menuItems: [menuItem1, menuItem2], table }
}

/**
 * Full tenant: store + modules + system roles + owner staff + menu + tables.
 * Use when tests need auth/login or session creation flows.
 */
export async function seedFullTenant(tx: Tx, storeOverrides?: { modules?: string[] }) {
  const { store, category, menuItems, table } = await seedStoreWithMenu(tx, {
    modules: storeOverrides?.modules ?? MODULES_FULL,
  })

  // Minimal system roles (real ensureSystemRoles exercised in Phase E/H tests)
  const ownerRole = await tx.role.create({
    data: { storeId: store.id, name: 'owner', permissions: ['*'], isSystem: true },
  })
  await tx.role.create({
    data: { storeId: store.id, name: 'staff', permissions: ['orders:read', 'menu:read'], isSystem: true },
  })

  const passwordHash = await bcrypt.hash('test-password', 4)  // cost=4 for speed in tests
  const ownerStaff = await tx.staff.create({
    data: {
      storeId: store.id,
      username: 'owner@test.local',
      passwordHash,
      roleId: ownerRole.id,
      displayName: 'Test Owner',
    },
  })

  return { store, category, menuItems, table, ownerRole, ownerStaff }
}

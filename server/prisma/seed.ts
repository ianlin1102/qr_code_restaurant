import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { DEMO_STORE, DEMO_PLATFORM_ADMIN_EMAIL, SEEDER_GRANTED_BY } from './seed-data/store.js'
import { ensureSystemRoles } from '../src/lib/ensure-system-roles.js'
import { DEMO_CATEGORIES, DEMO_MENU_ITEMS, DEMO_MENU_OPTIONS } from './seed-data/menu.js'
import { DEMO_TABLES } from './seed-data/tables.js'

// MODULES lives in shared workspace. For seed we just hard-list keys to avoid
// pulling the whole modules.ts into Prisma's seed context (which uses tsx).
// If you add a new module, update this list AND shared/modules.ts.
const ALL_MODULES = [
  'core',
  'analytics',
  'coupons',
  'waitlist',
  'printer',
  'staff-management',
]

const prisma = new PrismaClient()

async function main() {
  console.log('[seed] Starting…')

  // ---- Step 1: Reset super-admin password (idempotent) ----
  // The admin row is inserted by migration 20260417000003_seed_platform_admin.
  // Here we ensure the password is synced to DEMO_PLATFORM_ADMIN_PASSWORD env,
  // if set. Otherwise leave the migration's 'changeme' placeholder.
  const adminPassword = process.env.DEMO_PLATFORM_ADMIN_PASSWORD
  if (adminPassword) {
    // Upsert (not update) — if migration 20260417000003 rolled back or was
    // manually cleared, update would throw "Record not found". Seed must be
    // runnable against any DB state.
    const hash = await bcrypt.hash(adminPassword, 10)
    await prisma.platformAdmin.upsert({
      where: { email: DEMO_PLATFORM_ADMIN_EMAIL },
      create: {
        email: DEMO_PLATFORM_ADMIN_EMAIL,
        passwordHash: hash,
        role: 'super-admin',
        isActive: true,
      },
      update: { passwordHash: hash },
    })
    console.log('[seed] Super-admin password reset from DEMO_PLATFORM_ADMIN_PASSWORD env')
  } else {
    console.log('[seed] Super-admin password left as migration default ("changeme") — change immediately')
  }

  // ---- Step 2: Demo store (upsert) ----
  const demoStore = await prisma.store.upsert({
    where: { id: DEMO_STORE.id },
    create: {
      id: DEMO_STORE.id,
      name: DEMO_STORE.name,
      description: DEMO_STORE.description,
      tipBase: DEMO_STORE.tipBase,
    },
    update: {
      name: DEMO_STORE.name,
      description: DEMO_STORE.description,
    },
  })
  console.log(`[seed] Demo store: ${demoStore.id}`)

  // ---- Step 3: Module license ----
  // Dev: grant all modules for full feature testing.
  // Prod: only 'core' (new stores in prod default to core per D19).
  const modules = process.env.NODE_ENV === 'production' ? ['core'] : ALL_MODULES
  await prisma.moduleLicense.upsert({
    where: { storeId: demoStore.id },
    create: {
      storeId: demoStore.id,
      modules,
      grantedAt: new Date(),
      grantedBy: SEEDER_GRANTED_BY,
    },
    update: {
      modules,
    },
  })
  console.log(`[seed] Module license: ${modules.join(', ')}`)

  // ---- Step 4: System roles ----
  await ensureSystemRoles(prisma, demoStore.id)
  console.log('[seed] System roles (owner/manager/staff) ensured')

  // ---- Step 5: Owner staff account ----
  const ownerRole = await prisma.role.findFirst({
    where: { storeId: demoStore.id, name: 'owner' },
  })
  if (!ownerRole) throw new Error('owner role not found after ensureSystemRoles')
  const ownerPassword = process.env.DEMO_OWNER_PASSWORD ?? 'changeme'
  const ownerHash = await bcrypt.hash(ownerPassword, 10)
  await prisma.staff.upsert({
    where: { storeId_username: { storeId: demoStore.id, username: 'owner@demo.local' } },
    create: {
      storeId: demoStore.id,
      username: 'owner@demo.local',
      passwordHash: ownerHash,
      roleId: ownerRole.id,
      displayName: 'Demo Owner',
    },
    update: { passwordHash: ownerHash, roleId: ownerRole.id },
  })
  console.log(`[seed] Owner staff: owner@demo.local (password: ${process.env.DEMO_OWNER_PASSWORD ? '<env>' : 'changeme'})`)

  // ---- Step 6: Menu + tables ----
  for (const cat of DEMO_CATEGORIES) {
    await prisma.category.upsert({
      where: { id: cat.id },
      create: { id: cat.id, storeId: demoStore.id, name: cat.name, sortOrder: cat.sortOrder },
      update: { name: cat.name, sortOrder: cat.sortOrder },
    })
  }
  console.log(`[seed] Categories: ${DEMO_CATEGORIES.length}`)

  for (const item of DEMO_MENU_ITEMS) {
    await prisma.menuItem.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        storeId: demoStore.id,
        categoryId: item.categoryId,
        name: item.name,
        price: item.price,
        sortOrder: item.sortOrder,
      },
      update: { name: item.name, price: item.price, sortOrder: item.sortOrder },
    })
  }
  console.log(`[seed] Menu items: ${DEMO_MENU_ITEMS.length}`)

  for (const opt of DEMO_MENU_OPTIONS) {
    await prisma.menuItemOption.upsert({
      where: { id: opt.id },
      create: {
        id: opt.id,
        storeId: demoStore.id,
        menuItemId: opt.menuItemId,
        groupName: opt.groupName,
        name: opt.name,
        priceAdjust: opt.priceAdjust,
        isDefault: opt.isDefault,
        sortOrder: opt.sortOrder,
      },
      update: {
        priceAdjust: opt.priceAdjust,
        isDefault: opt.isDefault,
      },
    })
  }
  console.log(`[seed] Menu options: ${DEMO_MENU_OPTIONS.length}`)

  for (const t of DEMO_TABLES) {
    await prisma.table.upsert({
      where: { id: t.id },
      create: {
        id: t.id,
        storeId: demoStore.id,
        name: t.name,
        number: t.number,
        qrCode: t.qrCode,
        capacity: t.capacity,
      },
      update: { name: t.name, number: t.number, capacity: t.capacity },
    })
  }
  console.log(`[seed] Tables: ${DEMO_TABLES.length}`)

  console.log('[seed] Complete ✓')

}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error('[seed] FAILED:', e)
    prisma.$disconnect()
    process.exit(1)
  })

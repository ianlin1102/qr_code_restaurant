import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { DEMO_STORE, DEMO_PLATFORM_ADMIN_EMAIL, SEEDER_GRANTED_BY } from './seed-data/store.js'

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

  console.log('[seed] Phase 9a complete — roles/staff/menu/tables pending (Task 9b)')
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error('[seed] FAILED:', e)
    prisma.$disconnect()
    process.exit(1)
  })

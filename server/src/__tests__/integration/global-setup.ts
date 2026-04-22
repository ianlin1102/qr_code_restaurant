import { execSync } from 'node:child_process'
import { PrismaClient } from '@prisma/client'

/**
 * Global setup — runs once before the entire test suite.
 *
 * Dual-URL model (plan patch v5, L1 最严 review catch):
 *   TEST_ADMIN_DATABASE_URL = postgres superuser (migrate + ALTER ROLE only)
 *   TEST_DATABASE_URL       = app_user (tests connect as this, RLS subject)
 *
 * Why dual URL: postgres is bootstrap SUPERUSER → implicit BYPASSRLS (PG 16).
 * Tests must run as app_user to exercise RLS real apply semantics.
 * Task 14 tenant-isolation.test.ts depends on this for 4-test semantic validity.
 *
 * app_user password override: migration `20260417000002_rls_and_roles` hardcodes
 * app_user with PASSWORD 'placeholder_set_by_env' (Phase J Task 48 runtime
 * replaces via ALTER ROLE). In test env, we override here to match
 * TEST_DATABASE_URL literal. Migration itself unchanged (Rule 1 ironclad).
 *
 * Container must already be up (pnpm test:db:up).
 */
export async function setup() {
  const adminUrl = process.env.TEST_ADMIN_DATABASE_URL
  const testUrl = process.env.TEST_DATABASE_URL
  if (!adminUrl || !testUrl) {
    // Non-integration run (pnpm test path) — skip migrate + ALTER.
    // Main routing via package.json scripts --exclude 'src/__tests__/integration/**'.
    return
  }

  console.log('[global-setup] Applying migrations to test DB…')
  execSync('pnpm prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: adminUrl },
    stdio: 'inherit',
  })
  console.log('[global-setup] Migrations applied.')

  console.log('[global-setup] Overriding app_user password for test env…')
  const adminDb = new PrismaClient({ datasources: { db: { url: adminUrl } } })
  try {
    // Parse TEST_DATABASE_URL with WHATWG URL parser (same decoding contract as
    // Prisma's connection-string parser) so password with URL-encoded chars
    // (%40, %23, etc) decodes to the raw DB-storage form. Using regex here
    // would extract the still-encoded form and drift from what Prisma sends
    // on connect — silent breakage when password contains non-alphanumeric.
    const parsed = new URL(testUrl)
    if (parsed.username !== 'app_user') {
      throw new Error(
        `TEST_DATABASE_URL username must be 'app_user', got '${parsed.username}'. ` +
          `Dual-URL model requires app_user runtime identity (see plan patch v5).`,
      )
    }
    const password = parsed.password  // already URL-decoded by WHATWG URL
    if (!password) {
      throw new Error(
        `TEST_DATABASE_URL missing password for app_user. URL: ${testUrl}`,
      )
    }
    // PG ALTER ROLE ... WITH PASSWORD does not support parameterized binding
    // (password must be literal per PG grammar). Use $executeRawUnsafe with
    // manual single-quote escape. Password is already URL-decoded, so escape
    // handles the sole SQL injection surface (embedded single-quote).
    await adminDb.$executeRawUnsafe(
      `ALTER ROLE app_user WITH PASSWORD '${password.replace(/'/g, "''")}'`,
    )
    console.log('[global-setup] app_user password aligned to TEST_DATABASE_URL.')
  } finally {
    await adminDb.$disconnect()
  }
}

export async function teardown() {
  // tmpfs container dies on compose down — no explicit cleanup needed
}

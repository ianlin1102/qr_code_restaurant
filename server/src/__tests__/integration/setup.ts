import { beforeEach, afterAll } from 'vitest'
import { PrismaClient, Prisma } from '@prisma/client'

const testDbUrl = process.env.TEST_DATABASE_URL
const testAdminUrl = process.env.TEST_ADMIN_DATABASE_URL

/**
 * Shared Prisma client for integration tests.
 *
 * Dual-URL model (plan patch v5, L1 最严 review catch + plan patch v7
 * D85 家族 drift #3 forward-fix):
 *   testDb  = app_user runtime (RLS subject, tests connect as this)
 *   adminDb = postgres superuser (beforeEach TRUNCATE infra, bypass RLS +
 *             privilege cascade)
 *
 * Why separate adminDb for TRUNCATE: app_user lacks TRUNCATE privilege
 * (migration 20260417000002_rls_and_roles GRANTs only SELECT/INSERT/UPDATE/DELETE,
 * intentionally least-privilege for prod runtime). Test setup TRUNCATE is
 * infra cleanup not test subject behavior — use admin identity (same pattern
 * as global-setup.ts ALTER ROLE).
 *
 * Main routing for Phase C is via package.json CLI (--exclude / positional include):
 *   pnpm test             → --exclude 'src/__tests__/integration/**'  (no integration test loads)
 *   pnpm test:integration → vitest run 'src/__tests__/integration/**' (this file instantiated)
 *
 * null-guard below is defense-in-depth: if a future test outside integration/ imports
 * testDb, it will fail fast at null deref instead of silently connecting to dev DB.
 */
export const testDb: PrismaClient = testDbUrl
  ? new PrismaClient({ datasources: { db: { url: testDbUrl } } })
  : (null as unknown as PrismaClient)

const adminDb: PrismaClient | null = testAdminUrl
  ? new PrismaClient({ datasources: { db: { url: testAdminUrl } } })
  : null

beforeEach(async () => {
  if (!testDb || !adminDb) return // non-integration run — no DB to truncate
  // TRUNCATE all non-Prisma-meta tables via admin identity (app_user lacks
  // TRUNCATE privilege). RESTART IDENTITY CASCADE resets sequences and
  // follows FKs. Fast — tmpfs + in-memory WAL.
  const tables = await adminDb.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables
    WHERE schemaname='public' AND tablename NOT LIKE '_prisma%'
  `
  for (const { tablename } of tables) {
    await adminDb.$executeRawUnsafe(`TRUNCATE TABLE "${tablename}" RESTART IDENTITY CASCADE`)
  }
})

afterAll(async () => {
  if (testDb) await testDb.$disconnect()
  if (adminDb) await adminDb.$disconnect()
})

/**
 * Tenant-scoped test helper — mirrors production withTenantContext
 * but uses testDb so tests don't hit the dev DB.
 */
export async function withTestTenant<T>(
  storeId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return testDb.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_store_id', ${storeId}, true)`
    return fn(tx)
  })
}

/**
 * Platform-scoped test helper — BYPASSRLS via SET LOCAL ROLE.
 * Note: requires test DB user to have been GRANTed platform_admin role,
 * which is done by the rls_and_roles migration.
 */
export async function withTestPlatform<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return testDb.$transaction(async (tx) => {
    await tx.$executeRaw`SET LOCAL ROLE platform_admin`
    return fn(tx)
  })
}

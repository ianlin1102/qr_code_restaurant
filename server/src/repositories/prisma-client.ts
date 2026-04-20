import { PrismaClient, Prisma } from '@prisma/client'

/**
 * Primary Prisma client — connects as app_user (RLS-bound).
 * Every request MUST wrap DB work in withTenantContext (or withPlatformContext/withSystemContext).
 * Bare `prisma.order.findMany()` from a request handler will throw
 * "unrecognized configuration parameter app.current_store_id" because RLS policy runs first.
 */
export const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
})

/**
 * System worker Prisma client — connects as system_worker (BYPASSRLS).
 * For cron jobs, webhook retry queues, cross-tenant cleanup tasks.
 * Uses separate connection pool — won't interfere with app_user capacity.
 *
 * @cross-phase: SYSTEM_DATABASE_URL must be defined in docker-compose.yml (Task 10).
 * If undefined, systemPrisma instantiation succeeds but any DB operation throws
 * connection error. Verify in Task 10 implementation: env vars include both
 * DATABASE_URL (app_user) and SYSTEM_DATABASE_URL (system_worker).
 */
export const systemPrisma = new PrismaClient({
  datasources: { db: { url: process.env.SYSTEM_DATABASE_URL } },
})

export type Db = PrismaClient | Prisma.TransactionClient

/**
 * UUID validation — prevents SQL injection via SET LOCAL.
 */
function assertUuid(value: string): void {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(value)) {
    throw new Error(`Invalid UUID passed to tenant context: ${value}`)
  }
}

/**
 * Open a transaction with RLS tenant context set.
 * All DB operations inside fn see only rows matching storeId.
 * INSERT rows must have matching store_id or WITH CHECK rejects.
 *
 * Defense-in-depth:
 *   1. assertUuid rejects malformed input at app layer
 *   2. set_config() with parameterized $executeRaw — Prisma escapes the value
 *      so no SQL injection even if assertUuid were bypassed
 *
 * set_config(name, value, is_local=true) is equivalent to SET LOCAL and resets
 * at tx commit/rollback. RLS policies compare current_setting(...)::text
 * against store_id::text at query time (Task 4 β decision: explicit text alignment,
 * not UUID cast — store_id column is TEXT per Prisma String @default(uuid())).
 *
 * @param storeId - tenant UUID (validated + parameterized)
 * @param fn - callback receiving transaction client
 *
 * @see Phase D Task 8 — withTenantContextAndHooks (G7-4) extends this signature
 *      with afterCommit hook registration (required by Phase G Task 41 webhook
 *      D62 implementation). Current signature stays stable; *AndHooks wraps it.
 */
export async function withTenantContext<T>(
  storeId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  assertUuid(storeId)
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_store_id', ${storeId}, true)`
    return fn(tx)
  })
}

/**
 * Open a transaction with platform_admin role (BYPASSRLS).
 * For platform API routes where the caller is a PlatformAdmin, not a tenant.
 * SET LOCAL ROLE resets on tx commit/rollback — safe for connection pool reuse.
 */
export async function withPlatformContext<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    // Style parity with withTenantContext: use tagged template (no string concat).
    // Role name is a static identifier, not user input — Prisma treats it as SQL.
    await tx.$executeRaw`SET LOCAL ROLE platform_admin`
    return fn(tx)
  })
}

/**
 * Transaction for system tasks (cron, webhook retry).
 * Uses systemPrisma which connects as system_worker (BYPASSRLS).
 */
export async function withSystemContext<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return systemPrisma.$transaction(async (tx) => fn(tx))
}

/**
 * Like withTenantContext, but also exposes a registerAfterCommit(hook)
 * function that the callback can use to enqueue post-commit side effects.
 *
 * For non-Express scenarios where tenantAwareRoute cannot be used:
 *   - Webhook handlers (e.g., Stripe payment_intent.succeeded → SSE emit)
 *   - Cron jobs that need tenant scope + post-commit notifications
 *   - Tests that need to assert hook ordering
 *
 * Semantics (mirror tenantAwareRoute in middleware/tenant-aware.ts):
 *   - tx commits successfully → hooks fire in registration order (FIFO)
 *   - tx throws → hooks NEVER fire (rollback = no events; atomicity)
 *   - hook throws → logged via console.error, does NOT stop other hooks,
 *     does NOT propagate (tx is already durable; event loss is degrade-only)
 *
 * Why a separate helper instead of extending withTenantContext signature:
 *   Blast radius = 0 — existing withTenantContext call sites untouched.
 *   withTenantContext stays the minimal primitive; *AndHooks layers on top.
 *
 * Why console.error instead of logger:
 *   prisma-client.ts intentionally has no logger dependency (DB primitive layer).
 *   tenantAwareRoute (Express middleware layer) uses logger; this helper mirrors
 *   the prisma-client.ts style. Phase H/I may unify logging strategy.
 *
 * @see Phase G Task 41 webhook D62 — primary consumer (Stripe payment_intent.succeeded)
 * @see middleware/tenant-aware.ts tenantAwareRoute — Express-bound equivalent
 */
export async function withTenantContextAndHooks<T>(
  storeId: string,
  fn: (
    tx: Prisma.TransactionClient,
    registerAfterCommit: (hook: () => void | Promise<void>) => void
  ) => Promise<T>
): Promise<T> {
  const hooks: Array<() => void | Promise<void>> = []
  const registerAfterCommit = (hook: () => void | Promise<void>): void => {
    hooks.push(hook)
  }
  const result = await withTenantContext(storeId, async (tx) =>
    fn(tx, registerAfterCommit)
  )
  // tx committed — fire hooks in registration order.
  // Errors here are logged, not propagated: caller already moved on,
  // tx is durable, event loss is degrade-only.
  for (const hook of hooks) {
    try {
      await hook()
    } catch (err) {
      console.error(
        'withTenantContextAndHooks: afterCommit hook failed (tx already committed)',
        err
      )
    }
  }
  return result
}

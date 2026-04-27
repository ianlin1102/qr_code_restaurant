/**
 * Store entity repository.
 *
 * Scope: operations on a single Store row, plus its 1:1 ModuleLicense.
 *
 * NOT in scope (other repos own these):
 *   - Staff / orders / sessions management → respective repos
 *   - Module grant/revoke → platform-admin.ts
 *   - Coupons, menu, tables → respective repos
 *
 * Most reads are self-tenant (operator reading their own store). Use the
 * tx from withTenantContext — RLS will ensure only the current tenant's
 * row is accessible.
 *
 * For platform admin flows (listAll across all tenants, create new store),
 * callers wrap in withPlatformContext (BYPASSRLS) and pass that tx.
 */

import type { Prisma, Store, ModuleLicense } from '@prisma/client'
import { prisma, type Db } from './prisma-client.js'

export const storeRepo = {
  /**
   * Read a single Store by id.
   * Under RLS (app_user), only returns the row if storeId matches current tenant.
   * Under platform_admin (BYPASSRLS), returns any store.
   */
  findById: (id: string, db: Db = prisma): Promise<Store | null> =>
    db.store.findUnique({ where: { id } }),

  /**
   * List all stores. Only meaningful under platform_admin context.
   * Called from platform API routes (/api/platform/stores).
   * Under app_user RLS, this returns only the current tenant's single row.
   */
  listAll: (db: Db = prisma): Promise<Store[]> =>
    db.store.findMany({ orderBy: { createdAt: 'asc' } }),

  /**
   * Create a new Store + default ModuleLicense in one transaction.
   * Called from platform admin flows (createStore / onboarding).
   * Caller wraps in withPlatformContext to bypass RLS for the insert.
   *
   * D19: new stores default to ['core'] only in production. Dev seeder
   * overrides with full module list (see prisma/seed.ts).
   *
   * Rule 3: write operation — db is mandatory.
   */
  create: async (
    data: {
      name: string
      description?: string | null
      tipBase?: 'pretax' | 'posttax'
      grantedBy: string // PlatformAdmin.id performing the creation (audit)
      modules?: string[] // defaults to ['core']
    },
    db: Db
  ): Promise<Store> => {
    return db.store.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        tipBase: data.tipBase ?? 'pretax',
        moduleLicense: {
          create: {
            modules: data.modules ?? ['core'],
            grantedAt: new Date(),
            grantedBy: data.grantedBy,
          },
        },
      },
    })
  },

  /**
   * Update mutable settings on a Store. Does NOT allow modifying id,
   * createdAt, or relations — those are managed elsewhere.
   *
   * Rule 3: write operation — db is mandatory.
   */
  updateSettings: (
    id: string,
    patch: {
      name?: string
      description?: string | null
      openingHours?: string | null
      announcement?: string | null
      logo?: string | null
      tipBase?: 'pretax' | 'posttax'
    },
    db: Db
  ): Promise<Store> => db.store.update({ where: { id }, data: patch }),

  /**
   * Read Store + its ModuleLicense in a single round-trip.
   * Common pattern: permission checks need both "who is this store" and
   * "what modules are licensed" — avoid two sequential queries.
   */
  withinLicense: (
    id: string,
    db: Db = prisma
  ): Promise<(Store & { moduleLicense: ModuleLicense | null }) | null> =>
    db.store.findUnique({
      where: { id },
      include: { moduleLicense: true },
    }),
}

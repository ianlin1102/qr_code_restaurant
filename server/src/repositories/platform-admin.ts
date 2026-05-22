/**
 * PlatformAdmin + ModuleLicense repository — BYPASSRLS operations.
 *
 * ALL methods in this file require a tx from withPlatformContext. The Postgres
 * role platform_admin has BYPASSRLS, letting these methods see and mutate rows
 * across all tenants. TypeScript enforces caller discipline by requiring
 * TransactionClient (D55) on every method.
 *
 * Scope:
 *   - PlatformAdmin identity (login lookup, creation for seed)
 *   - ModuleLicense grant / revoke / update
 *   - Cross-tenant Store listing (operations dashboard)
 *
 * NOT in scope:
 *   - Per-tenant Store reads — use storeRepo under tenant context
 *   - Permission checks — service layer (is this admin authorized to grant?)
 *   - JWT issuance — auth.service
 *
 * Core module protection:
 *   revokeModules silently ignores 'core' in removeList — core is required
 *   (shared/modules.ts: required: true). Revoking it would break every store.
 */

import { Prisma } from '@prisma/client'
import type { PlatformAdmin, ModuleLicense, Store } from '@prisma/client'
import type { ModuleId } from '@qr-order/shared/modules'
import { prisma, type Db } from './prisma-client.js'

// ========== PlatformAdmin ==========

export const platformAdminRepo = {
  /**
   * Login lookup. Caller must be in withPlatformContext (BYPASSRLS) —
   * platform_admins table has its own RLS policy restricting to platform role.
   */
  findAdminByEmail: (
    email: string,
    tx: Prisma.TransactionClient
  ): Promise<PlatformAdmin | null> =>
    tx.platformAdmin.findUnique({ where: { email } }),

  findAdminById: (
    id: string,
    tx: Prisma.TransactionClient
  ): Promise<PlatformAdmin | null> =>
    tx.platformAdmin.findUnique({ where: { id } }),

  /**
   * Creation: seed script + (future) platform admin onboarding UI.
   */
  createAdmin: (
    data: {
      email: string
      passwordHash: string
      role: string
    },
    tx: Prisma.TransactionClient
  ): Promise<PlatformAdmin> =>
    tx.platformAdmin.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        role: data.role,
      },
    }),

  /**
   * Phase F 回填 F-1: login 成功副作用，更新 lastLoginAt。
   * 单步写——tx 从 platformAwareRoute 进来。
   * 失败非关键（审计由 PlatformAuditLog 独立记录）——但语义保证 login 事务一致性.
   */
  updateLastLoginAt: (
    id: string,
    at: Date,
    tx: Prisma.TransactionClient
  ): Promise<PlatformAdmin> =>
    tx.platformAdmin.update({
      where: { id },
      data: { lastLoginAt: at },
    }),

  /**
   * BYPASSRLS cross-tenant Store list. Under tenant (app_user) context, this
   * returns only the current tenant's Store row — caller must ensure platform
   * context for real multi-tenant visibility.
   */
  listAllStores: (tx: Prisma.TransactionClient): Promise<Store[]> =>
    tx.store.findMany({ orderBy: { createdAt: 'asc' } }),

  // ========== ModuleLicense ==========

  /**
   * Full-replace the Store's licensed modules. Upsert semantics: creates
   * ModuleLicense if missing (store that predates module system), else replaces
   * modules[] + bumps grantedAt/grantedBy.
   *
   * core is auto-prepended if caller omitted it (business invariant).
   */
  grantModules: async (
    storeId: string,
    modules: ModuleId[],
    grantedBy: string, // PlatformAdmin.id
    tx: Prisma.TransactionClient
  ): Promise<ModuleLicense> => {
    const normalized = modules.includes('core') ? modules : ['core', ...modules]
    return tx.moduleLicense.upsert({
      where: { storeId },
      create: {
        storeId,
        modules: normalized,
        grantedAt: new Date(),
        grantedBy,
      },
      update: {
        modules: normalized,
        grantedAt: new Date(),
        grantedBy,
      },
    })
  },

  /**
   * Alias for grantModules — semantic clarity when caller intends to "update
   * the module set" rather than "grant new access".
   */
  updateModules: async (
    storeId: string,
    modules: ModuleId[],
    grantedBy: string,
    tx: Prisma.TransactionClient
  ): Promise<ModuleLicense> =>
    platformAdminRepo.grantModules(storeId, modules, grantedBy, tx),

  /**
   * Remove specific module ids from the Store's license.
   * Multi-step: read current → compute diff → write. Atomic under the tx.
   *
   * 'core' is silently preserved — ignored if present in removeList.
   * Returns the updated license (or throws if no license row exists).
   */
  revokeModules: async (
    storeId: string,
    removeList: ModuleId[],
    grantedBy: string,
    tx: Prisma.TransactionClient
  ): Promise<ModuleLicense> => {
    const current = await tx.moduleLicense.findUnique({ where: { storeId } })
    if (!current) {
      throw new Error(
        `Cannot revokeModules: no ModuleLicense for storeId=${storeId}`
      )
    }

    const currentIds = current.modules as ModuleId[]
    const toRemove = new Set<ModuleId>(removeList.filter(m => m !== 'core'))
    const remaining = currentIds.filter(id => !toRemove.has(id))

    // Ensure core persists even if it wasn't originally listed (defensive).
    const normalized = remaining.includes('core' as ModuleId)
      ? remaining
      : ['core' as ModuleId, ...remaining]

    return tx.moduleLicense.update({
      where: { storeId },
      data: {
        modules: normalized,
        grantedAt: new Date(),
        grantedBy,
      },
    })
  },
}

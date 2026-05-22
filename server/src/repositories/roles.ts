/**
 * Role entity repository + licensed permission resolution helper.
 *
 * Scope:
 *   - CRUD on Role rows
 *   - System role guarantee (ensureSystemRoles) — owner/manager/waiter
 *   - Permission resolution: role perms ∩ store's licensed module perms
 *
 * NOT in scope:
 *   - isSystem guards on update/delete — caller responsibility (matches legacy
 *     role.service.ts lines 108, 122). Repo just applies the mutation.
 *   - SSE emit — repo layer never emits (rule 2)
 *
 * System role migration:
 *   ensureSystemRoles creates owner/manager/waiter if missing AND syncs owner
 *   to full ALL_PERMISSIONS on each call. Mirrors legacy role.service.ts:72-74:
 *   "Only migrate owner role — manager/waiter user-editable, don't overwrite."
 */

import { Prisma } from '@prisma/client'
import type { Role, ModuleLicense, Staff } from '@prisma/client'
import type { Permission } from '@qr-order/shared'
import { MODULE_REGISTRY, getModulePermissions } from '@qr-order/shared/modules'
import type { ModuleId } from '@qr-order/shared/modules'
import { prisma, type Db } from './prisma-client.js'

// ========== System role permission presets ==========
// Mirrored from server/src/controllers/role.service.ts:7-31 at Phase D write time.
// Owner = all permissions. Manager = all except staff:manage. Waiter = curated subset.

const ALL_PERMISSIONS: Permission[] = [
  'orders:read', 'orders:write',
  'tables:read', 'tables:write',
  'menu:read', 'menu:write',
  'settings:read', 'settings:write',
  'billing:read', 'billing:write',
  'analytics:read',
  'coupons:read', 'coupons:write',
  'waitlist:read', 'waitlist:write',
  'staff:manage',
  'printer:read', 'printer:write',
]

const MANAGER_PERMISSIONS: Permission[] =
  ALL_PERMISSIONS.filter(p => p !== 'staff:manage')

const WAITER_PERMISSIONS: Permission[] = [
  'orders:read', 'orders:write',
  'menu:read',
  'tables:read', 'tables:write',
  'waitlist:read',
  'printer:write',
]

// ========== Repo ==========

export const roleRepo = {
  findByStoreId: (storeId: string, db: Db = prisma): Promise<Role[]> =>
    db.role.findMany({
      where: { storeId },
      orderBy: { createdAt: 'asc' },
    }),

  findById: (id: string, db: Db = prisma): Promise<Role | null> =>
    db.role.findUnique({ where: { id } }),

  /**
   * Phase E 段 3b 回填: name-based lookup within a store scope.
   * Used by staff.changeRole (Agent B decision point E) to resolve legacy
   * role name strings ('owner' / 'manager' / 'waiter' / custom name) to roleId.
   */
  findByName: (
    storeId: string,
    name: string,
    db: Db = prisma
  ): Promise<Role | null> =>
    db.role.findFirst({ where: { storeId, name } }),

  /**
   * Create a custom role. isSystem=false by default (custom roles only).
   * System roles should flow through ensureSystemRoles, not this.
   *
   * Rule 3: write operation — db mandatory.
   */
  create: (
    data: {
      storeId: string
      name: string
      nameEn?: string
      permissions: Permission[]
    },
    db: Db
  ): Promise<Role> =>
    db.role.create({
      data: {
        storeId: data.storeId,
        name: data.name,
        nameEn: data.nameEn ?? null,
        permissions: data.permissions,
        isSystem: false,
      },
    }),

  /**
   * Update mutable fields. Caller enforces isSystem + owner-protection guards
   * (see role.service.ts:107-110 for legacy semantics).
   */
  update: (
    id: string,
    patch: {
      name?: string
      nameEn?: string | null
      permissions?: Permission[]
    },
    db: Db
  ): Promise<Role> =>
    db.role.update({
      where: { id },
      data: {
        ...(patch.name !== undefined && { name: patch.name }),
        ...(patch.nameEn !== undefined && { nameEn: patch.nameEn }),
        ...(patch.permissions !== undefined && {
          permissions: patch.permissions,
        }),
      },
    }),

  /**
   * Hard delete. Caller enforces isSystem guard (role.service.ts:122).
   */
  delete: (id: string, db: Db): Promise<Role> =>
    db.role.delete({ where: { id } }),

  /**
   * Idempotent: ensure owner/manager/waiter exist; sync owner to ALL_PERMISSIONS.
   *
   * Multi-step (up to 4 round-trips: read existing + up to 3 creates + owner
   * sync update) — TransactionClient required (D55).
   *
   * Legacy behavior preserved (role.service.ts:33-75):
   *   - Manager/waiter permissions NOT overwritten if they exist (user-editable)
   *   - Owner permissions ALWAYS overwritten with ALL_PERMISSIONS (Phase 4 new
   *     modules auto-grant to owner)
   */
  ensureSystemRoles: async (
    storeId: string,
    tx: Prisma.TransactionClient
  ): Promise<void> => {
    const existing = await tx.role.findMany({ where: { storeId } })
    const byName = new Map(existing.map(r => [r.name, r]))

    if (!byName.has('owner')) {
      await tx.role.create({
        data: {
          storeId,
          name: 'owner',
          nameEn: 'Owner',
          permissions: ALL_PERMISSIONS,
          isSystem: true,
        },
      })
    }
    if (!byName.has('manager')) {
      await tx.role.create({
        data: {
          storeId,
          name: 'manager',
          nameEn: 'Manager',
          permissions: MANAGER_PERMISSIONS,
          isSystem: true,
        },
      })
    }
    if (!byName.has('waiter')) {
      await tx.role.create({
        data: {
          storeId,
          name: 'waiter',
          nameEn: 'Waiter',
          permissions: WAITER_PERMISSIONS,
          isSystem: true,
        },
      })
    }

    // Owner sync (system role only — if somehow turned custom we skip defensively).
    const owner = byName.get('owner')
    if (owner && owner.isSystem) {
      const currentPerms = owner.permissions as unknown as Permission[]
      if (currentPerms.length !== ALL_PERMISSIONS.length) {
        await tx.role.update({
          where: { id: owner.id },
          data: {
            permissions: ALL_PERMISSIONS,
          },
        })
      }
    }
  },

  /**
   * L1 CORE: resolve a user's effective permissions.
   *
   * Mirrors legacy role.service.ts:130-159 (resolvePermissions):
   *   1. Determine "role permissions" from roleId OR legacyRole string
   *   2. Intersect with store's licensed module permissions
   *
   * Returns permissions the user may ACTUALLY invoke in this store (tenant's
   * license × role grant). Empty array means "no permissions resolved" — caller
   * decides whether that's a deny or an error (usually deny).
   *
   * Read operation — db defaults to prisma. Reads under tenant context thanks to RLS.
   *
   * Design note: this helper lives in roles.ts (not module-permissions.ts) because
   * the core query joins Role + ModuleLicense in a single round-trip via Prisma
   * include. Splitting across repos would force two sequential queries.
   */
  resolveLicensedPermissions: async (
    input: {
      storeId: string
      roleId?: string | null
      legacyRole?: string | null
    },
    db: Db = prisma
  ): Promise<Permission[]> => {
    // Phase 1: role permissions
    let rolePerms: Permission[] = []

    if (input.roleId) {
      const role = await db.role.findUnique({ where: { id: input.roleId } })
      if (role) {
        rolePerms = role.permissions as unknown as Permission[]
      }
    } else if (input.legacyRole === 'owner') {
      rolePerms = ALL_PERMISSIONS
    } else if (input.legacyRole === 'manager') {
      rolePerms = MANAGER_PERMISSIONS
    } else if (input.legacyRole === 'staff' || input.legacyRole === 'waiter') {
      rolePerms = WAITER_PERMISSIONS
    } else if (input.legacyRole) {
      // Unknown legacy role string — try match by name on this store's roles.
      const named = await db.role.findFirst({
        where: { storeId: input.storeId, name: input.legacyRole },
      })
      rolePerms = (named?.permissions as unknown as Permission[]) ?? []
    }

    // Early return equivalent to legacy role.service.ts:130-159: in legacy,
    // rolePerms=[] would proceed to read ModuleLicense then filter the empty
    // array → []. Result identical; we skip the extra DB round-trip.
    if (rolePerms.length === 0) return []

    // Phase 2: module license → permission pool
    const license = await db.moduleLicense.findUnique({
      where: { storeId: input.storeId },
    })

    // Backward-compat mirror of module-permissions.ts:13-15:
    // no license record → grant all module permissions.
    // Phase 5 prisma/seed.ts should create a default license for every Store,
    // so this branch is the fallback for legacy/edge data only.
    let modulePerms: Permission[]
    if (!license) {
      modulePerms = Object.values(MODULE_REGISTRY).flatMap(m => [...m.permissions])
    } else {
      const moduleIds = license.modules as ModuleId[]
      modulePerms = getModulePermissions(moduleIds)
    }

    // Phase 3: intersect
    return rolePerms.filter(p => modulePerms.includes(p))
  },
}

import type { Prisma } from '@prisma/client'

export const SYSTEM_ROLE_TEMPLATES = {
  owner: {
    // Owner gets every permission that exists in MODULES (subject to licensing).
    // We use a wildcard sentinel — at query time, effectivePerms = all permissions
    // intersected with store's licensed modules.
    permissions: ['*'] as const,
  },
  manager: {
    permissions: [
      'orders:read', 'orders:write',
      'menu:read', 'menu:write',
      'staff:read', 'staff:write',
      'clock:read', 'clock:write',
      'coupons:read', 'coupons:write',
      'analytics:read',
      'waitlist:read', 'waitlist:write',
      'printer:read',
    ] as const,
  },
  staff: {
    permissions: [
      'orders:read', 'orders:write',
      'menu:read',
      'clock:read', 'clock:write',
      'waitlist:read', 'waitlist:write',
    ] as const,
  },
} as const

export type SystemRoleName = keyof typeof SYSTEM_ROLE_TEMPLATES

type Db = Prisma.TransactionClient | {
  role: { upsert: (args: Prisma.RoleUpsertArgs) => unknown }
}

/**
 * Idempotent: creates or updates the three system roles for a store.
 * Called from seed.ts and from createStore (platform admin action).
 */
export async function ensureSystemRoles(db: Db, storeId: string): Promise<void> {
  for (const [name, template] of Object.entries(SYSTEM_ROLE_TEMPLATES)) {
    await db.role.upsert({
      where: { storeId_name: { storeId, name } },
      create: {
        storeId,
        name,
        permissions: [...template.permissions],
        isSystem: true,
      },
      update: {
        // Keep permissions synced with latest template (D20 intent).
        // Admin-created roles are not touched (isSystem: false).
        permissions: [...template.permissions],
        isSystem: true,
      },
    })
  }
}

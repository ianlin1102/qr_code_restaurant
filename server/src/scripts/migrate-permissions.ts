/**
 * One-time migration: rename billing:read/write → coupons:read/write
 * in all custom RoleDefinition records.
 * System roles are auto-updated by ensureSystemRoles() on restart.
 */
import { roleStore } from '../repositories/stores'

const RENAMES: Record<string, string> = {
  'billing:read': 'coupons:read',
  'billing:write': 'coupons:write',
}

console.log('Migrating permission names in role definitions...')

const roles = roleStore.getAll()
let updated = 0

for (const role of roles) {
  const newPerms = role.permissions.map(p => RENAMES[p] ?? p)
  const changed = role.permissions.some((p, i) => p !== newPerms[i])

  if (changed) {
    roleStore.upsert(role.id, { ...role, permissions: newPerms as any })
    console.log(`  Updated role "${role.name}" (${role.id}): ${role.permissions.join(',')} → ${newPerms.join(',')}`)
    updated++
  }
}

console.log(`Done. ${updated} role(s) updated, ${roles.length - updated} unchanged.`)

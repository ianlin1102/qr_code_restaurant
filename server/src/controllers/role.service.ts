import { v4 as uuid } from 'uuid'
import type { RoleDefinition, Permission } from '@qr-order/shared'
import logger from '../lib/logger.js'
import { roleStore } from '../repositories/stores.js'
import { getStoreModulePermissions } from '../lib/module-permissions.js'

const ALL_PERMISSIONS: Permission[] = [
  // core
  'orders:read', 'orders:write',
  'tables:read', 'tables:write',
  'menu:read', 'menu:write',
  'settings:read', 'settings:write',
  'billing:read', 'billing:write',
  // optional modules
  'analytics:read',
  'coupons:read', 'coupons:write',
  'waitlist:read', 'waitlist:write',
  'staff:manage',
  'printer:read', 'printer:write',
]

const WAITER_PERMISSIONS: Permission[] = [
  'orders:read', 'orders:write',
  'menu:read',
  'tables:read', 'tables:write',
  'waitlist:read',
  'printer:write',
]

const MANAGER_PERMISSIONS: Permission[] =
  ALL_PERMISSIONS.filter(p => p !== 'staff:manage')

export function ensureSystemRoles(storeId: string): void {
  const existing = roleStore.getByField('storeId', storeId)
  const names = new Set(existing.map(r => r.name))
  const now = new Date().toISOString()

  if (!names.has('owner')) {
    // Check one more time (in case of concurrent creation)
    const existingOwner = roleStore.getByField('storeId', storeId).find(r => r.name === 'owner')
    if (!existingOwner) {
      roleStore.create({
        id: `${storeId}-role-owner`, storeId, name: 'owner', nameEn: 'Owner',
        permissions: ALL_PERMISSIONS, isSystem: true, createdAt: now,
      })
    }
  }
  if (!names.has('manager')) {
    // Check one more time (in case of concurrent creation)
    const existingManager = roleStore.getByField('storeId', storeId).find(r => r.name === 'manager')
    if (!existingManager) {
      roleStore.create({
        id: `${storeId}-role-manager`, storeId, name: 'manager', nameEn: 'Manager',
        permissions: MANAGER_PERMISSIONS, isSystem: true, createdAt: now,
      })
    }
  }
  if (!names.has('waiter')) {
    // Check one more time (in case of concurrent creation)
    const existingWaiter = roleStore.getByField('storeId', storeId).find(r => r.name === 'waiter')
    if (!existingWaiter) {
      roleStore.create({
        id: `${storeId}-role-waiter`, storeId, name: 'waiter', nameEn: 'Waiter',
        permissions: WAITER_PERMISSIONS, isSystem: true, createdAt: now,
      })
    }
  }

  // Only migrate owner role (always has all permissions — not user-editable)
  // Manager and waiter permissions are user-editable, do NOT overwrite.
  const ownerRole = existing.find(r => r.name === 'owner' && r.isSystem)
  if (ownerRole && ownerRole.permissions.length !== ALL_PERMISSIONS.length) {
    roleStore.update(ownerRole.id, { permissions: ALL_PERMISSIONS })
  }
}

export function getRoles(storeId: string): RoleDefinition[] {
  ensureSystemRoles(storeId)
  return roleStore.getByField('storeId', storeId)
}

export function getRoleById(roleId: string): RoleDefinition | undefined {
  return roleStore.getById(roleId)
}

export function createRole(
  storeId: string,
  name: string,
  nameEn: string | undefined,
  permissions: Permission[]
): RoleDefinition {
  const role: RoleDefinition = {
    id: uuid(), storeId, name, nameEn,
    permissions, isSystem: false, createdAt: new Date().toISOString(),
  }
  roleStore.create(role)
  logger.info({ storeId, roleId: role.id, name }, 'custom role created')
  return role
}

export function updateRole(
  storeId: string,
  roleId: string,
  updates: { name?: string; nameEn?: string; permissions?: Permission[] }
): RoleDefinition | { error: string } {
  const role = roleStore.getById(roleId)
  if (!role || role.storeId !== storeId) return { error: 'Role not found' }
  if (role.isSystem && role.name === 'owner') {
    return { error: 'Cannot modify owner role' }
  }

  const updated = roleStore.update(roleId, updates)
  return updated!
}

export function deleteRole(
  storeId: string,
  roleId: string
): { success: true } | { error: string } {
  const role = roleStore.getById(roleId)
  if (!role || role.storeId !== storeId) return { error: 'Role not found' }
  if (role.isSystem) return { error: 'Cannot delete system roles' }

  roleStore.delete(roleId)
  logger.info({ storeId, roleId }, 'custom role deleted')
  return { success: true }
}

/** Resolve permissions for a user — from roleId or legacy role string */
export function resolvePermissions(
  storeId: string,
  roleId?: string,
  legacyRole?: string
): Permission[] {
  let rolePerms: Permission[]

  if (roleId) {
    const role = roleStore.getById(roleId)
    if (role) {
      rolePerms = role.permissions
    } else {
      rolePerms = []
    }
  } else if (legacyRole === 'owner') {
    rolePerms = ALL_PERMISSIONS
  } else if (legacyRole === 'manager') {
    rolePerms = MANAGER_PERMISSIONS
  } else if (legacyRole === 'staff' || legacyRole === 'waiter') {
    rolePerms = WAITER_PERMISSIONS
  } else {
    // Unknown role — try to find a matching system role by name
    const systemRole = roleStore.getByField('storeId', storeId)
      .find(r => r.name === legacyRole)
    rolePerms = systemRole?.permissions ?? []
  }

  // Intersect with store's licensed module permissions
  const modulePerms = getStoreModulePermissions(storeId)
  return rolePerms.filter(p => modulePerms.includes(p))
}

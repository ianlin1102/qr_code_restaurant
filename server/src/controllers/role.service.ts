import { v4 as uuid } from 'uuid'
import type { RoleDefinition, Permission } from '@qr-order/shared'
import logger from '../lib/logger.js'
import { roleStore } from '../repositories/stores.js'

const ALL_PERMISSIONS: Permission[] = [
  'orders:read', 'orders:write',
  'menu:read', 'menu:write',
  'tables:read', 'tables:write',
  'billing:read', 'billing:write',
  'analytics:read',
  'staff:manage',
  'settings:read', 'settings:write',
]

const WAITER_PERMISSIONS: Permission[] = [
  'orders:read', 'orders:write',
  'menu:read',
  'tables:read', 'tables:write',
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

  // Migrate existing system roles to new permission set
  const ownerRole = existing.find(r => r.name === 'owner' && r.isSystem)
  if (ownerRole && ownerRole.permissions.length !== ALL_PERMISSIONS.length) {
    roleStore.update(ownerRole.id, { permissions: ALL_PERMISSIONS })
  }
  const managerRole = existing.find(r => r.name === 'manager' && r.isSystem)
  if (managerRole && JSON.stringify(managerRole.permissions) !== JSON.stringify(MANAGER_PERMISSIONS)) {
    roleStore.update(managerRole.id, { permissions: MANAGER_PERMISSIONS })
  }
  const waiterRole = existing.find(r => r.name === 'waiter' && r.isSystem)
  if (waiterRole && JSON.stringify(waiterRole.permissions) !== JSON.stringify(WAITER_PERMISSIONS)) {
    roleStore.update(waiterRole.id, { permissions: WAITER_PERMISSIONS })
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
  if (roleId) {
    const role = roleStore.getById(roleId)
    if (role) return role.permissions
  }
  // Fallback for legacy JWT tokens
  if (legacyRole === 'owner') return ALL_PERMISSIONS
  if (legacyRole === 'staff') return WAITER_PERMISSIONS
  return []
}

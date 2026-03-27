import { v4 as uuid } from 'uuid'
import { JsonStore } from '../repositories/json-store.js'
import type { RoleDefinition, Permission } from '@qr-order/shared'
import logger from '../lib/logger.js'

export const roleStore = new JsonStore<RoleDefinition>('roles.json')

const ALL_PERMISSIONS: Permission[] = [
  'menu:read', 'menu:write', 'orders:read', 'orders:write',
  'tables:read', 'tables:write', 'analytics:read',
  'coupons:read', 'coupons:write', 'staff:manage',
  'settings:write', 'floor-plan:write', 'bill:write',
]

const WAITER_PERMISSIONS: Permission[] = [
  'menu:read', 'orders:read', 'orders:write',
  'tables:read', 'tables:write', 'bill:write',
]

const MANAGER_PERMISSIONS: Permission[] =
  ALL_PERMISSIONS.filter(p => p !== 'staff:manage')

export function ensureSystemRoles(storeId: string): void {
  const existing = roleStore.getByField('storeId', storeId)
  const names = new Set(existing.map(r => r.name))
  const now = new Date().toISOString()

  if (!names.has('owner')) {
    roleStore.create({
      id: `${storeId}-role-owner`, storeId, name: 'owner', nameEn: 'Owner',
      permissions: ALL_PERMISSIONS, isSystem: true, createdAt: now,
    })
  }
  if (!names.has('manager')) {
    roleStore.create({
      id: `${storeId}-role-manager`, storeId, name: 'manager', nameEn: 'Manager',
      permissions: MANAGER_PERMISSIONS, isSystem: true, createdAt: now,
    })
  }
  if (!names.has('waiter')) {
    roleStore.create({
      id: `${storeId}-role-waiter`, storeId, name: 'waiter', nameEn: 'Waiter',
      permissions: WAITER_PERMISSIONS, isSystem: true, createdAt: now,
    })
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

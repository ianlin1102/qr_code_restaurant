import type { Permission } from '@qr-order/shared'
import { MODULE_REGISTRY, ALL_MODULE_PERMISSIONS, getModulePermissions } from '@qr-order/shared/modules'
import type { ModuleId } from '@qr-order/shared/modules'
import { moduleLicenseStore } from '../repositories/stores'

/**
 * Get the permission pool for a store based on its licensed modules.
 * Stores without a license record get all permissions (backward compat).
 */
export function getStoreModulePermissions(storeId: string): Permission[] {
  const license = moduleLicenseStore.getById(storeId)

  if (!license) {
    return [...ALL_MODULE_PERMISSIONS]
  }

  const moduleIds = license.modules as ModuleId[]
  return getModulePermissions(moduleIds)
}

/**
 * Get the list of licensed module IDs for a store.
 */
export function getStoreModules(storeId: string): ModuleId[] {
  const license = moduleLicenseStore.getById(storeId)
  if (!license) {
    return Object.keys(MODULE_REGISTRY) as ModuleId[]
  }
  const ids = license.modules as ModuleId[]
  return ids.includes('core') ? ids : ['core', ...ids]
}

import type { Permission } from './types'

export const MODULE_REGISTRY = {
  core: {
    name: 'Core',
    required: true,
    permissions: [
      'orders:read', 'orders:write',
      'tables:read', 'tables:write',
      'menu:read', 'menu:write',
      'settings:read', 'settings:write',
      'billing:read', 'billing:write',
    ] as Permission[],
  },
  analytics: {
    name: 'Analytics',
    required: false,
    permissions: ['analytics:read'] as Permission[],
  },
  coupons: {
    name: 'Coupons',
    required: false,
    permissions: ['coupons:read', 'coupons:write'] as Permission[],
  },
  waitlist: {
    name: 'Waitlist',
    required: false,
    permissions: ['waitlist:read', 'waitlist:write'] as Permission[],
  },
  'staff-management': {
    name: 'Staff Management',
    required: false,
    permissions: ['staff:manage'] as Permission[],
  },
  printer: {
    name: 'Printer',
    required: false,
    permissions: ['printer:read', 'printer:write'] as Permission[],
  },
} as const

export type ModuleId = keyof typeof MODULE_REGISTRY

/** All permissions across all modules */
export const ALL_MODULE_PERMISSIONS: Permission[] = Object.values(MODULE_REGISTRY)
  .flatMap(m => [...m.permissions])

/** Get permissions unlocked by a set of modules */
export function getModulePermissions(moduleIds: ModuleId[]): Permission[] {
  const ids = moduleIds.includes('core') ? moduleIds : ['core' as ModuleId, ...moduleIds]
  return ids.flatMap(id => [...(MODULE_REGISTRY[id]?.permissions ?? [])])
}

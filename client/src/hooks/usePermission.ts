import { useAuthStore } from '@/stores/auth-store'
import type { Permission } from '@qr-order/shared'

export function usePermission(perm: Permission): boolean {
  const user = useAuthStore(s => s.user)
  if (!user?.permissions) {
    // Fallback for legacy tokens
    if (user?.role === 'owner') return true
    if (user?.role === 'manager') {
      const mgrPerms: Permission[] = [
        'orders:read', 'orders:write',
        'menu:read', 'menu:write',
        'tables:read', 'tables:write',
        'settings:read', 'settings:write',
        'billing:read', 'billing:write',
        'analytics:read',
        'coupons:read', 'coupons:write',
        'waitlist:read', 'waitlist:write',
        'printer:read', 'printer:write',
      ]
      return mgrPerms.includes(perm)
    }
    if (user?.role === 'staff' || user?.role === 'waiter') {
      const staffPerms: Permission[] = [
        'orders:read', 'orders:write',
        'menu:read',
        'tables:read', 'tables:write',
        'waitlist:read', 'printer:write',
      ]
      return staffPerms.includes(perm)
    }
    return false
  }
  return user.permissions.includes(perm)
}

export function useIsOwner(): boolean {
  return usePermission('staff:manage')
}

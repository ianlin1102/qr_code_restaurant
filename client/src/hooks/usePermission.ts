import { useAuthStore } from '@/stores/auth-store'
import type { Permission } from '@qr-order/shared'

export function usePermission(perm: Permission): boolean {
  const user = useAuthStore(s => s.user)
  if (!user?.permissions) {
    // Fallback for legacy tokens
    if (user?.role === 'owner') return true
    if (user?.role === 'staff') {
      const staffPerms: Permission[] = [
        'menu:read', 'orders:read', 'orders:write',
        'tables:read', 'tables:write', 'bill:write',
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

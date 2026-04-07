import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth-store'
import { usePermission } from '@/hooks/usePermission'
import type { Permission } from '@qr-order/shared'

export default function ProtectedRoute({ children, perm }: {
  children: React.ReactNode
  perm?: Permission
}) {
  const token = useAuthStore(s => s.token)
  const hasAccess = usePermission(perm ?? 'orders:read')

  if (!token) return <Navigate to="/admin/login" replace />
  if (perm && !hasAccess) return <Navigate to="/admin/dashboard" replace />
  return <>{children}</>
}

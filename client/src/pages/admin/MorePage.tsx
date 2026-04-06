import { useNavigate } from 'react-router-dom'
import { useT } from '@/i18n/useT'
import { usePermission } from '@/hooks/usePermission'
import type { Permission } from '@qr-order/shared'

type NavKey = 'categories' | 'coupons' | 'staff' | 'analytics' | 'settings' | 'waitlist' | 'clock'

const ITEMS: { to: string; navKey: NavKey; icon: string; perm?: Permission }[] = [
  { to: '/admin/settings', navKey: 'settings', icon: '⚙️', perm: 'settings:read' },
  { to: '/admin/categories', navKey: 'categories', icon: '📂', perm: 'menu:read' },
  { to: '/admin/coupons', navKey: 'coupons', icon: '🎟️', perm: 'coupons:read' },
  { to: '/admin/staff', navKey: 'staff', icon: '👥', perm: 'staff:manage' },
  { to: '/admin/analytics', navKey: 'analytics', icon: '📊', perm: 'analytics:read' },
  { to: '/admin/waitlist', navKey: 'waitlist', icon: '📋', perm: 'waitlist:read' },
  { to: '/admin/clock', navKey: 'clock', icon: '⏰', perm: 'staff:manage' },
]

export default function MorePage() {
  const navigate = useNavigate()
  const { t } = useT()

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold mb-6">{t.nav.more}</h1>
      <div className="grid grid-cols-2 gap-3">
        {ITEMS.map(item => (
          <MoreCard key={item.to} item={item} t={t} onClick={() => navigate(item.to)} />
        ))}
      </div>
    </div>
  )
}

function MoreCard({ item, t, onClick }: {
  item: typeof ITEMS[number]
  t: ReturnType<typeof useT>['t']
  onClick: () => void
}) {
  const hasAccess = usePermission(item.perm ?? 'orders:read')
  if (item.perm && !hasAccess) return null
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-6 rounded-xl border bg-card hover:bg-accent transition-colors"
    >
      <span className="text-3xl">{item.icon}</span>
      <span className="text-sm font-medium">{t.nav[item.navKey]}</span>
    </button>
  )
}

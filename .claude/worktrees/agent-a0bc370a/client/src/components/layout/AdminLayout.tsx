import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Globe, LogOut, Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import { useT } from '@/i18n/useT'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import type { Permission } from '@qr-order/shared'

type NavKey = 'orders' | 'floorPlan' | 'menu' | 'categories' | 'tables' | 'coupons' | 'staff' | 'analytics' | 'settings'

const NAV_ITEMS: { to: string; navKey: NavKey; icon: string; perm?: Permission }[] = [
  { to: '/admin/dashboard', navKey: 'orders', icon: '📋', perm: 'orders:read' },
  { to: '/admin/floor-plan', navKey: 'floorPlan', icon: '🗺️', perm: 'tables:read' },
  { to: '/admin/menu', navKey: 'menu', icon: '🍜', perm: 'menu:read' },
  { to: '/admin/categories', navKey: 'categories', icon: '📂', perm: 'menu:read' },
  { to: '/admin/tables', navKey: 'tables', icon: '🪑', perm: 'tables:read' },
  { to: '/admin/coupons', navKey: 'coupons', icon: '🎟️', perm: 'billing:read' },
  { to: '/admin/staff', navKey: 'staff', icon: '👥', perm: 'staff:manage' },
  { to: '/admin/analytics', navKey: 'analytics', icon: '📊', perm: 'analytics:read' },
  { to: '/admin/settings', navKey: 'settings', icon: '⚙️' },  // everyone can see settings
]

export default function AdminLayout() {
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)
  const userPerms = useAuthStore(s => s.user?.permissions) ?? []
  const { t, lang, toggle } = useT()
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebar-collapsed') === '1')
  const [mobileOpen, setMobileOpen] = useState(false)

  const visibleNavItems = NAV_ITEMS.filter(item => {
    if (!item.perm) return true
    if (user?.role === 'owner') return true
    return userPerms.includes(item.perm)
  })

  const handleLogout = () => {
    const storeId = user?.storeId
    logout()
    // Full page redirect — bypasses React render cycle so ProtectedRoute doesn't race
    window.location.href = storeId ? `/admin/login?store=${storeId}` : '/admin/login'
  }

  const toggleCollapse = () => {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('sidebar-collapsed', next ? '1' : '0')
  }

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden">
      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 z-50 flex items-center gap-3 border-b bg-card px-4 py-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2.5 -ml-2 rounded-lg hover:bg-gray-100 min-h-[44px] min-w-[44px]"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold font-display">{t.nav.title}</h1>
        </div>
        <button onClick={toggle}
          className="px-2.5 py-1 rounded-lg border border-border text-xs font-medium hover:bg-card transition-colors">
          {lang === 'zh' ? 'EN' : '中文'}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={cn('shrink-0 bg-muted hidden md:flex flex-col transition-all duration-200', collapsed ? 'w-16' : 'w-56')}>
        <div className={cn('border-b flex items-center', collapsed ? 'px-2 py-3 justify-center' : 'px-4 py-5 justify-between')}>
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div>
                <h1 className="text-lg font-bold font-display">{t.nav.title}</h1>
                <p className="text-xs text-muted-foreground">{t.nav.subtitle}</p>
              </div>
              <button onClick={toggle}
                className="px-2.5 py-1 rounded-lg border border-border text-xs font-medium hover:bg-card transition-colors">
                {lang === 'zh' ? 'EN' : '中文'}
              </button>
            </div>
          )}
          <button onClick={toggleCollapse} className="p-2 rounded hover:bg-gray-200 text-gray-500 min-h-[44px] min-w-[44px]">
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        <nav className="flex-1 py-2">
          {visibleNavItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center transition-colors',
                  collapsed ? 'justify-center px-2 py-3' : 'gap-3 px-4 py-2.5',
                  'text-sm',
                  isActive
                    ? 'bg-card font-semibold text-primary'
                    : 'text-gray-600 hover:bg-card hover:text-gray-900'
                )
              }
              title={collapsed ? t.nav[item.navKey] : undefined}
            >
              <span className="text-base">{item.icon}</span>
              {!collapsed && t.nav[item.navKey]}
            </NavLink>
          ))}
        </nav>

        <div className="border-t">
          {/* Language toggle */}
          <button
            onClick={toggle}
            className={cn(
              'flex items-center w-full text-sm font-semibold text-primary hover:bg-primary/10 transition-colors min-h-[44px]',
              collapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-4 py-2.5'
            )}
            title={collapsed ? t.common.langSwitch : undefined}
          >
            <Globe className="h-4 w-4 shrink-0" />
            {!collapsed && t.common.langSwitch}
          </button>

          {/* User info + logout */}
          {user && (
            <div className={cn('px-4 py-3', collapsed && 'px-2 py-2')}>
              {collapsed ? (
                <button
                  onClick={handleLogout}
                  className="flex justify-center w-full text-gray-500 hover:text-red-600 min-h-[44px]"
                  title={t.nav.logout}
                >
                  <LogOut className="h-4 w-4" />
                </button>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <div className="font-medium">{user.username}</div>
                    <div className="text-xs text-muted-foreground">
                      {user.role === 'owner' ? t.nav.owner : t.nav.staffRole}
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="text-xs text-gray-500 hover:text-red-600 min-h-[44px]"
                  >
                    {t.nav.logout}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Mobile navigation sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetHeader className="px-4 py-5 border-b">
            <SheetTitle className="text-left">{t.nav.title}</SheetTitle>
            <p className="text-xs text-muted-foreground">{t.nav.subtitle}</p>
          </SheetHeader>
          <nav className="flex-1 py-2">
            {visibleNavItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-4 py-3 text-sm transition-colors',
                    isActive
                      ? 'bg-card font-semibold text-primary'
                      : 'text-gray-600 hover:bg-card hover:text-gray-900'
                  )
                }
              >
                <span className="text-base">{item.icon}</span>
                {t.nav[item.navKey]}
              </NavLink>
            ))}
          </nav>
          <div className="border-t">
            <button
              onClick={toggle}
              className="flex items-center gap-3 w-full px-4 py-3 text-sm font-semibold text-primary hover:bg-primary/10 min-h-[44px]"
            >
              <Globe className="h-4 w-4" />
              {t.common.langSwitch}
            </button>
            {user && (
              <div className="px-4 py-3 border-t flex items-center justify-between">
                <div className="text-sm">
                  <div className="font-medium">{user.username}</div>
                  <div className="text-xs text-muted-foreground">
                    {user.role === 'owner' ? t.nav.owner : t.nav.staffRole}
                  </div>
                </div>
                <button onClick={handleLogout} className="text-xs text-gray-500 hover:text-red-600 min-h-[44px]">
                  {t.nav.logout}
                </button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <main className="flex-1 overflow-auto min-w-0">
        <Outlet />
      </main>
    </div>
  )
}

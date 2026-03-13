import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, Globe, LogOut, Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

const NAV_ITEMS = [
  { to: '/admin/dashboard', labelKey: 'nav.orders', icon: '📋' },
  { to: '/admin/menu', labelKey: 'nav.menu', icon: '🍜' },
  { to: '/admin/categories', labelKey: 'nav.categories', icon: '📂' },
  { to: '/admin/tables', labelKey: 'nav.tables', icon: '🪑' },
  { to: '/admin/settings', labelKey: 'nav.settings', icon: '⚙️' },
]

export default function AdminLayout() {
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)
  const { t, i18n } = useTranslation('admin')
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebar-collapsed') === '1')
  const [mobileOpen, setMobileOpen] = useState(false)

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

  const toggleLang = () => {
    const next = i18n.language === 'zh' ? 'en' : 'zh'
    i18n.changeLanguage(next)
    localStorage.setItem('i18n-lang', next)
  }

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden">
      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 z-50 flex items-center gap-3 border-b bg-white px-4 py-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 -ml-2 rounded-lg hover:bg-gray-100"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-base font-bold">{t('nav.title')}</h1>
        </div>
      </div>

      {/* Sidebar */}
      <aside className={cn('shrink-0 border-r bg-gray-50 hidden md:flex flex-col transition-all duration-200', collapsed ? 'w-16' : 'w-56')}>
        <div className={cn('border-b flex items-center', collapsed ? 'px-2 py-3 justify-center' : 'px-4 py-5 justify-between')}>
          {!collapsed && (
            <div>
              <h1 className="text-lg font-bold">{t('nav.title')}</h1>
              <p className="text-xs text-muted-foreground">{t('nav.subtitle')}</p>
            </div>
          )}
          <button onClick={toggleCollapse} className="p-1 rounded hover:bg-gray-200 text-gray-500">
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        <nav className="flex-1 py-2">
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center transition-colors',
                  collapsed ? 'justify-center px-2 py-3' : 'gap-3 px-4 py-2.5',
                  'text-sm',
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-medium border-r-2 border-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )
              }
              title={collapsed ? t(item.labelKey) : undefined}
            >
              <span className="text-base">{item.icon}</span>
              {!collapsed && t(item.labelKey)}
            </NavLink>
          ))}
        </nav>

        <div className="border-t">
          {/* Language toggle */}
          <button
            onClick={toggleLang}
            className={cn(
              'flex items-center w-full text-sm text-gray-600 hover:bg-gray-100 transition-colors',
              collapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-4 py-2.5'
            )}
            title={collapsed ? t('common:langSwitch') : undefined}
          >
            <Globe className="h-4 w-4 shrink-0" />
            {!collapsed && t('common:langSwitch')}
          </button>

          {/* User info + logout */}
          {user && (
            <div className={cn('px-4 py-3', collapsed && 'px-2 py-2')}>
              {collapsed ? (
                <button
                  onClick={handleLogout}
                  className="flex justify-center w-full text-gray-500 hover:text-red-600"
                  title={t('nav.logout')}
                >
                  <LogOut className="h-4 w-4" />
                </button>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <div className="font-medium">{user.username}</div>
                    <div className="text-xs text-muted-foreground">
                      {user.role === 'owner' ? t('nav.owner') : t('nav.staff')}
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="text-xs text-gray-500 hover:text-red-600"
                  >
                    {t('nav.logout')}
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
            <SheetTitle className="text-left">{t('nav.title')}</SheetTitle>
            <p className="text-xs text-muted-foreground">{t('nav.subtitle')}</p>
          </SheetHeader>
          <nav className="flex-1 py-2">
            {NAV_ITEMS.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-4 py-3 text-sm transition-colors',
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  )
                }
              >
                <span className="text-base">{item.icon}</span>
                {t(item.labelKey)}
              </NavLink>
            ))}
          </nav>
          <div className="border-t">
            <button
              onClick={toggleLang}
              className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-600 hover:bg-gray-100"
            >
              <Globe className="h-4 w-4" />
              {t('common:langSwitch')}
            </button>
            {user && (
              <div className="px-4 py-3 border-t flex items-center justify-between">
                <div className="text-sm">
                  <div className="font-medium">{user.username}</div>
                  <div className="text-xs text-muted-foreground">
                    {user.role === 'owner' ? t('nav.owner') : t('nav.staff')}
                  </div>
                </div>
                <button onClick={handleLogout} className="text-xs text-gray-500 hover:text-red-600">
                  {t('nav.logout')}
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

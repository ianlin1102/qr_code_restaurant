import { NavLink, Outlet } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'

const NAV_ITEMS = [
  { to: '/admin/dashboard', label: '订单管理', icon: '📋' },
  { to: '/admin/menu', label: '菜品管理', icon: '🍜' },
  { to: '/admin/categories', label: '分类管理', icon: '📂' },
  { to: '/admin/tables', label: '桌台管理', icon: '🪑' },
  { to: '/admin/settings', label: '门店设置', icon: '⚙️' },
]

export default function AdminLayout() {
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)

  const handleLogout = () => {
    const storeId = user?.storeId
    logout()
    // Full page redirect — bypasses React render cycle so ProtectedRoute doesn't race
    window.location.href = storeId ? `/admin/login?store=${storeId}` : '/admin/login'
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r bg-gray-50 flex flex-col">
        <div className="px-4 py-5 border-b">
          <h1 className="text-lg font-bold">扫码点餐</h1>
          <p className="text-xs text-muted-foreground">后台管理</p>
        </div>
        <nav className="flex-1 py-2">
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-medium border-r-2 border-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )
              }
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User info + logout */}
        <div className="border-t px-4 py-3">
          {user && (
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <div className="font-medium">{user.username}</div>
                <div className="text-xs text-muted-foreground">
                  {user.role === 'owner' ? '店主' : '员工'}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="text-xs text-gray-500 hover:text-red-600"
              >
                退出
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}

import { Component, type ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useSessionStore } from './stores/session-store'

/** Global error boundary — prevents white screen on crash */
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) { return { error } }
  render() {
    if (this.state.error) return (
      <div style={{ padding: 32, textAlign: 'center', fontFamily: 'system-ui' }}>
        <h2 style={{ marginBottom: 8 }}>Something went wrong</h2>
        <p style={{ color: '#888', fontSize: 14, marginBottom: 16 }}>{this.state.error.message}</p>
        <button onClick={() => { localStorage.clear(); window.location.href = '/' }}
          style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #ddd', cursor: 'pointer' }}>
          Clear Data &amp; Restart
        </button>
      </div>
    )
    return this.props.children
  }
}
import ScanPage from './pages/customer/ScanPage'
import LangSelectPage from './pages/customer/LangSelectPage'
import MenuPage from './pages/customer/MenuPage'
import CartPage from './pages/customer/CartPage'
import OrderConfirmPage from './pages/customer/OrderConfirmPage'
import CheckoutPage from './pages/customer/CheckoutPage'
import OrderHistoryPage from './pages/customer/OrderHistoryPage'
import AdminLayout from './components/layout/AdminLayout'
import LoginPage from './pages/admin/LoginPage'
import ProtectedRoute from './components/layout/ProtectedRoute'
import DashboardPage from './pages/admin/DashboardPage'
import TablesPage from './pages/admin/TablesPage'
import MenuManagePage from './pages/admin/MenuManagePage'
import CategoryManagePage from './pages/admin/CategoryManagePage'
import StoreSettingsPage from './pages/admin/StoreSettingsPage'
import FloorPlanPage from './pages/admin/FloorPlanPage'
import AnalyticsPage from './pages/admin/AnalyticsPage'
import CouponManagePage from './pages/admin/CouponManagePage'
import FloorPlanEditorPage from './pages/admin/FloorPlanEditorPage'
import StaffManagePage from './pages/admin/StaffManagePage'
import ClockPage from './pages/admin/ClockPage'
import WaitlistPage from './pages/admin/WaitlistPage'
import MorePage from './pages/admin/MorePage'

function FallbackRedirect() {
  const storeId = useSessionStore(s => s.storeId)
  if (storeId) return <Navigate to={`/menu/${storeId}`} replace />
  return <Navigate to="/admin/login" replace />
}

export default function App() {
  return (
    <ErrorBoundary>
    <BrowserRouter>
      <Routes>
        {/* Customer routes */}
        <Route path="/lang-select/:storeId/:tableId" element={<LangSelectPage />} />
        <Route path="/scan/:storeId/:tableId" element={<ScanPage />} />
        <Route path="/menu/:storeId" element={<MenuPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/store/:storeId/checkout" element={<CheckoutPage />} />
        <Route path="/order/confirm" element={<OrderConfirmPage />} />
        <Route path="/orders/:storeId" element={<OrderHistoryPage />} />

        {/* Login (no auth required) */}
        <Route path="/admin/login" element={<LoginPage />} />

        {/* Admin routes with sidebar layout (protected) */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="menu" element={<MenuManagePage />} />
          <Route path="categories" element={<CategoryManagePage />} />
          <Route path="tables" element={<TablesPage />} />
          <Route path="settings" element={<StoreSettingsPage />} />
          <Route path="floor-plan" element={<FloorPlanPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="coupons" element={<CouponManagePage />} />
          <Route path="floor-plan/editor" element={<FloorPlanEditorPage />} />
          <Route path="staff" element={<StaffManagePage />} />
          <Route path="clock" element={<ClockPage />} />
          <Route path="waitlist" element={<WaitlistPage />} />
          <Route path="more" element={<MorePage />} />
          <Route index element={<Navigate to="dashboard" />} />
        </Route>

        <Route path="*" element={<FallbackRedirect />} />
      </Routes>
    </BrowserRouter>
    </ErrorBoundary>
  )
}

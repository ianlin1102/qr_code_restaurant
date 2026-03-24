import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ScanPage from './pages/customer/ScanPage'
import LangSelectPage from './pages/customer/LangSelectPage'
import MenuPage from './pages/customer/MenuPage'
import CartPage from './pages/customer/CartPage'
import OrderConfirmPage from './pages/customer/OrderConfirmPage'
import CheckoutPage from './pages/customer/CheckoutPage'
import OrderHistoryPage from './pages/customer/OrderHistoryPage'
import AdminLayout from './components/AdminLayout'
import LoginPage from './pages/admin/LoginPage'
import ProtectedRoute from './components/ProtectedRoute'
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

export default function App() {
  return (
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
          <Route index element={<Navigate to="dashboard" />} />
        </Route>

        <Route path="*" element={<Navigate to="/admin/dashboard" />} />
      </Routes>
    </BrowserRouter>
  )
}

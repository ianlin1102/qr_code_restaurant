import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ScanPage from './pages/customer/ScanPage'
import MenuPage from './pages/customer/MenuPage'
import CartPage from './pages/customer/CartPage'
import OrderConfirmPage from './pages/customer/OrderConfirmPage'
import AdminLayout from './components/AdminLayout'
import LoginPage from './pages/admin/LoginPage'
import ProtectedRoute from './components/ProtectedRoute'
import DashboardPage from './pages/admin/DashboardPage'
import TablesPage from './pages/admin/TablesPage'
import MenuManagePage from './pages/admin/MenuManagePage'
import CategoryManagePage from './pages/admin/CategoryManagePage'
import StoreSettingsPage from './pages/admin/StoreSettingsPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Customer routes */}
        <Route path="/scan/:storeId/:tableId" element={<ScanPage />} />
        <Route path="/menu/:storeId" element={<MenuPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/order/confirm" element={<OrderConfirmPage />} />

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
          <Route index element={<Navigate to="dashboard" />} />
        </Route>

        <Route path="*" element={<Navigate to="/admin/dashboard" />} />
      </Routes>
    </BrowserRouter>
  )
}

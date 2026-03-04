import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ScanPage from './views/customer/ScanPage'
import MenuPage from './views/customer/MenuPage'
import CartPage from './views/customer/CartPage'
import OrderConfirmPage from './views/customer/OrderConfirmPage'
import DashboardPage from './views/admin/DashboardPage'
import TablesPage from './views/admin/TablesPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/scan/:storeId/:tableId" element={<ScanPage />} />
        <Route path="/menu/:storeId" element={<MenuPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/order/confirm" element={<OrderConfirmPage />} />
        <Route path="/admin/dashboard" element={<DashboardPage />} />
        <Route path="/admin/tables" element={<TablesPage />} />
        <Route path="*" element={<Navigate to="/admin/dashboard" />} />
      </Routes>
    </BrowserRouter>
  )
}

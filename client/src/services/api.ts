import type { MenuResponse, CreateOrderRequest, Order, OrderStatus, OrderItem, MenuItem, Category, Table, Store, UpdateStoreRequest, LoginResponse, AnalyticsResponse, Coupon, WaitlistEntry, AuthUser, Bill, Split, RoleDefinition } from '@qr-order/shared'
import { useAuthStore } from '@/stores/auth-store'

// DEPRECATED: replaced by BillSettleDialog (Phase 3)
interface SplitBillShare { personName: string; items: { menuItemId: string; name: string; quantity: number; amount: number }[]; amount: number }
interface SplitBillRequest { orderId: string; mode: 'equal' | 'by-item'; numberOfPeople?: number; shares?: SplitBillShare[] }
interface SplitBillSession { orderId: string; shares: (SplitBillShare & { clientSecret?: string; paid: boolean })[]; totalAmount: number }

const BASE = '/api'

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const token = useAuthStore.getState().token
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${url}`, { ...options, headers })

  if (res.status === 401) {
    const storeId = useAuthStore.getState().user?.storeId
    useAuthStore.getState().logout()
    window.location.href = storeId ? `/admin/login?store=${storeId}` : '/admin/login'
    throw new Error('Session expired')
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Network error' }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export const api = {
  // Auth
  login: (storeId: string, username: string, password: string) =>
    fetchJSON<LoginResponse>(`/stores/${storeId}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  // Store
  getStore: (storeId: string) =>
    fetchJSON<Store>(`/stores/${storeId}`),

  updateStore: (storeId: string, data: UpdateStoreRequest) =>
    fetchJSON<Store>(`/stores/${storeId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Customer
  getMenu: (storeId: string) =>
    fetchJSON<MenuResponse>(`/stores/${storeId}/menu`),

  createOrder: (storeId: string, data: CreateOrderRequest) =>
    fetchJSON<Order>(`/stores/${storeId}/orders`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getOrders: (storeId: string, status?: OrderStatus, tableId?: string) => {
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    if (tableId) params.set('tableId', tableId)
    const qs = params.toString()
    return fetchJSON<Order[]>(`/stores/${storeId}/orders${qs ? `?${qs}` : ''}`)
  },

  updateOrderStatus: (storeId: string, orderId: string, status: OrderStatus) =>
    fetchJSON<Order>(`/stores/${storeId}/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  transferOrder: (storeId: string, orderId: string, targetTableId: string) =>
    fetchJSON<Order>(`/stores/${storeId}/orders/${orderId}/transfer`, {
      method: 'POST',
      body: JSON.stringify({ targetTableId }),
    }),

  updateOrderItems: (storeId: string, orderId: string, items: OrderItem[]) =>
    fetchJSON<Order>(`/stores/${storeId}/orders/${orderId}/items`, {
      method: 'PUT',
      body: JSON.stringify({ items }),
    }),

  // Admin: Menu Items
  getMenuItems: (storeId: string) =>
    fetchJSON<MenuItem[]>(`/stores/${storeId}/menu/items`),

  createMenuItem: (storeId: string, data: Omit<MenuItem, 'id' | 'storeId'>) =>
    fetchJSON<MenuItem>(`/stores/${storeId}/menu/items`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateMenuItem: (storeId: string, itemId: string, data: Partial<MenuItem>) =>
    fetchJSON<MenuItem>(`/stores/${storeId}/menu/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteMenuItem: (storeId: string, itemId: string) =>
    fetchJSON<void>(`/stores/${storeId}/menu/items/${itemId}`, {
      method: 'DELETE',
    }),

  batchImportMenuItems: (storeId: string, items: Array<{ name: string; nameEn?: string; price: number; categoryId: string; description?: string; descriptionEn?: string }>) =>
    fetchJSON<{ created: MenuItem[]; skipped: Array<{ row: number; reason: string }> }>(`/stores/${storeId}/menu/items/batch`, {
      method: 'POST',
      body: JSON.stringify({ items }),
    }),

  // Admin: Categories
  getCategories: (storeId: string) =>
    fetchJSON<Category[]>(`/stores/${storeId}/menu/categories`),

  createCategory: (storeId: string, data: { name: string; nameEn?: string; sortOrder: number }) =>
    fetchJSON<Category>(`/stores/${storeId}/menu/categories`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateCategory: (storeId: string, catId: string, data: Partial<Category>) =>
    fetchJSON<Category>(`/stores/${storeId}/menu/categories/${catId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteCategory: (storeId: string, catId: string) =>
    fetchJSON<void>(`/stores/${storeId}/menu/categories/${catId}`, {
      method: 'DELETE',
    }),

  // Tables
  getTables: (storeId: string, includeDisabled = false) =>
    fetchJSON<Table[]>(`/stores/${storeId}/tables${includeDisabled ? '?includeDisabled=true' : ''}`),

  getTable: (storeId: string, tableId: string) =>
    fetchJSON<Table>(`/stores/${storeId}/tables/${tableId}`),

  enableTable: (storeId: string, number: number, name?: string, nameEn?: string) =>
    fetchJSON<Table>(`/stores/${storeId}/tables/enable`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${useAuthStore.getState().token ?? ''}` },
      body: JSON.stringify({ number, name, nameEn }),
    }),

  disableTable: (storeId: string, tableId: string) =>
    fetchJSON<Table>(`/stores/${storeId}/tables/${tableId}/disable`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${useAuthStore.getState().token ?? ''}` },
    }),

  regenerateQr: (storeId: string, tableId: string) =>
    fetchJSON<Table>(`/stores/${storeId}/tables/${tableId}/regenerate-qr`, {
      method: 'POST',
    }),

  getNextTableNumber: (storeId: string) =>
    fetchJSON<{ number: number; allFull: boolean }>(`/stores/${storeId}/tables/next-number`, {
      headers: { Authorization: `Bearer ${useAuthStore.getState().token ?? ''}` },
    }),

  updateTable: (storeId: string, tableId: string, data: { name?: string; nameEn?: string }) =>
    fetchJSON<Table>(`/stores/${storeId}/tables/${tableId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  closeTable: (storeId: string, tableId: string) =>
    fetchJSON<{ closed: number }>(`/stores/${storeId}/tables/${tableId}/close`, {
      method: 'POST',
    }),

  // Customer: get orders for a specific table
  getTableOrders: (storeId: string, tableId: string) =>
    fetchJSON<Order[]>(`/stores/${storeId}/orders?tableId=${tableId}`),

  // Checkout — creates Stripe PaymentIntent only, no order
  createCheckout: (storeId: string, data: { tableId: string; items: { menuItemId: string; quantity: number; remark?: string; selectedOptions?: unknown[] }[]; customerName?: string; tipAmount?: number }) =>
    fetchJSON<{ clientSecret: string; amount: number }>(
      `/stores/${storeId}/checkout`,
      { method: 'POST', body: JSON.stringify(data) },
    ),

  // Checkout for existing unpaid orders
  createCheckoutForOrders: (storeId: string, orderIds: string[]) =>
    fetchJSON<{ clientSecret: string; amount: number }>(
      `/stores/${storeId}/checkout`,
      { method: 'POST', body: JSON.stringify({ orderIds }) },
    ),

  // Analytics
  getAnalytics: (storeId: string, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams()
    if (startDate) params.set('startDate', startDate)
    if (endDate) params.set('endDate', endDate)
    const qs = params.toString()
    return fetchJSON<AnalyticsResponse>(`/stores/${storeId}/analytics${qs ? `?${qs}` : ''}`)
  },

  // Coupons
  getCoupons: (storeId: string) =>
    fetchJSON<Coupon[]>(`/stores/${storeId}/coupons`),

  createCoupon: (storeId: string, data: Omit<Coupon, 'id' | 'storeId' | 'currentUses' | 'createdAt'>) =>
    fetchJSON<Coupon>(`/stores/${storeId}/coupons`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateCoupon: (storeId: string, couponId: string, data: Partial<Coupon>) =>
    fetchJSON<Coupon>(`/stores/${storeId}/coupons/${couponId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteCoupon: (storeId: string, couponId: string) =>
    fetchJSON<void>(`/stores/${storeId}/coupons/${couponId}`, {
      method: 'DELETE',
    }),

  // Waitlist
  getWaitlist: (storeId: string) =>
    fetchJSON<WaitlistEntry[]>(`/stores/${storeId}/waitlist`),

  addToWaitlist: (storeId: string, data: { name: string; partySize: number; phone?: string }) =>
    fetchJSON<WaitlistEntry>(`/stores/${storeId}/waitlist`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  removeFromWaitlist: (storeId: string, entryId: string) =>
    fetchJSON<void>(`/stores/${storeId}/waitlist/${entryId}`, {
      method: 'DELETE',
    }),

  seatWaitlistEntry: (storeId: string, entryId: string) =>
    fetchJSON<WaitlistEntry>(`/stores/${storeId}/waitlist/${entryId}/seat`, {
      method: 'POST',
    }),

  // Split Bill
  createSplitBill: (storeId: string, data: SplitBillRequest) =>
    fetchJSON<SplitBillSession>(`/stores/${storeId}/split-bill`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Staff Management
  getStaff: (storeId: string) =>
    fetchJSON<AuthUser[]>(`/stores/${storeId}/staff`),

  createStaff: (storeId: string, data: { username: string; password: string; role: string }) =>
    fetchJSON<AuthUser>(`/stores/${storeId}/staff`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateStaff: (storeId: string, userId: string, data: { role?: string }) =>
    fetchJSON<AuthUser>(`/stores/${storeId}/staff/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteStaff: (storeId: string, userId: string) =>
    fetchJSON<void>(`/stores/${storeId}/staff/${userId}`, {
      method: 'DELETE',
    }),

  // Printer
  reprintOrder: (storeId: string, orderId: string) =>
    fetchJSON<{ success: boolean }>(`/stores/${storeId}/printer/print/${orderId}`, {
      method: 'POST',
    }),

  // Bills
  getActiveBill: (storeId: string, tableId: string) =>
    fetchJSON<(Bill & { splits: Split[] }) | null>(`/stores/${storeId}/bills?tableId=${tableId}`),

  getBill: (storeId: string, billId: string) =>
    fetchJSON<Bill & { splits: Split[] }>(`/stores/${storeId}/bills/${billId}`),

  createBillSplits: (storeId: string, billId: string, method: string, count?: number) =>
    fetchJSON<Split[]>(`/stores/${storeId}/bills/${billId}/splits`, {
      method: 'POST',
      body: JSON.stringify({ method, count }),
    }),

  markSplitPaid: (storeId: string, billId: string, splitId: string) =>
    fetchJSON<{ bill: Bill; split: Split }>(`/stores/${storeId}/bills/${billId}/splits/${splitId}`, {
      method: 'PATCH',
    }),

  applyBillCoupon: (storeId: string, billId: string, couponId: string, couponCode: string, discountType: string, discountValue: number) =>
    fetchJSON<Bill>(`/stores/${storeId}/bills/${billId}/apply-coupon`, {
      method: 'POST',
      body: JSON.stringify({ couponId, couponCode, discountType, discountValue }),
    }),

  removeBillCoupon: (storeId: string, billId: string) =>
    fetchJSON<Bill>(`/stores/${storeId}/bills/${billId}/coupon`, {
      method: 'DELETE',
    }),

  settleBill: (storeId: string, billId: string, paidBy?: string) =>
    fetchJSON<Bill>(`/stores/${storeId}/bills/${billId}/settle`, {
      method: 'POST',
      body: JSON.stringify({ paidBy }),
    }),

  // Roles
  getRoles: (storeId: string) =>
    fetchJSON<RoleDefinition[]>(`/stores/${storeId}/roles`),

  createRole: (storeId: string, data: { name: string; nameEn?: string; permissions: string[] }) =>
    fetchJSON<RoleDefinition>(`/stores/${storeId}/roles`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateRole: (storeId: string, roleId: string, data: { name?: string; nameEn?: string; permissions?: string[] }) =>
    fetchJSON<RoleDefinition>(`/stores/${storeId}/roles/${roleId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteRole: (storeId: string, roleId: string) =>
    fetchJSON<void>(`/stores/${storeId}/roles/${roleId}`, {
      method: 'DELETE',
    }),

  // Upload
  uploadImage: async (file: File): Promise<string> => {
    const token = useAuthStore.getState().token
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(`${BASE}/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Upload failed' }))
      throw new Error(err.error || `HTTP ${res.status}`)
    }
    const data = await res.json()
    return data.url
  },
}

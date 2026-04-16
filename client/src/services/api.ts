import type { MenuResponse, CreateOrderRequest, Order, OrderStatus, OrderItem, MenuItem, Category, Table, Store, UpdateStoreRequest, LoginResponse, AnalyticsResponse, Coupon, WaitlistEntry, AuthUser, Session, Payment, RoleDefinition, CartItem, TimeEntry, SplitBill } from '@qr-order/shared'
import { useAuthStore } from '@/stores/auth-store'

export type SessionSummary = Session & { orders: Order[]; payments: Payment[]; remaining: number; isPaid: boolean; netDue: number; tax: number; serviceFee: number; totalWithTax: number }

export interface AllowedActions {
  payByItems: boolean
  payByPercent: boolean
  cashPayment: boolean
  createSplitByItem: boolean
  createSplitByPercent: boolean
  paySplit: boolean
  deleteSplit: boolean
  closeSession: boolean
  reopenSession: boolean
}

export type SettlementResult = {
  ok: true
  data: Record<string, any>
  sessionStatus: string
  remaining: number
  allowedActions: AllowedActions
} | {
  ok: false
  code: string
  message: string
  allowedActions: AllowedActions
}

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
    // Don't auto-redirect for login attempts — let the login page handle the error
    const isLoginAttempt = url.includes('/auth/login')
    if (!isLoginAttempt) {
      const storeId = useAuthStore.getState().user?.storeId
      useAuthStore.getState().logout()
      window.location.href = storeId ? `/admin/login?store=${storeId}` : '/admin/login'
      throw new Error('Session expired')
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Network error' }))
    throw new Error(err.error || err.message || `HTTP ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

/**
 * Fetch for settlement gateway endpoints.
 * Returns unwrapped data (backward-compatible) with allowedActions attached.
 * Throws with the gateway error message on failure.
 */
async function settlementFetch<T>(url: string, options?: RequestInit): Promise<T & { allowedActions: AllowedActions; remaining: number; sessionStatus: string }> {
  const token = useAuthStore.getState().token
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${url}`, { ...options, headers })
  const body = await res.json().catch(() => ({ ok: false, message: 'Network error' }))

  if (body.ok === false) {
    throw new Error(body.message || body.code || `HTTP ${res.status}`)
  }
  return { ...body.data, allowedActions: body.allowedActions, remaining: body.remaining, sessionStatus: body.sessionStatus }
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

  deleteOrder: (storeId: string, orderId: string) =>
    fetchJSON<{ success: boolean }>(`/stores/${storeId}/orders/${orderId}`, {
      method: 'DELETE',
    }),

  voidItem: (storeId: string, orderId: string, itemIndex: number, reason?: string) =>
    fetchJSON<Order>(`/stores/${storeId}/orders/${orderId}/items/${itemIndex}/void`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
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

  updateTable: (storeId: string, tableId: string, data: Partial<Pick<Table, 'name' | 'nameEn' | 'zone' | 'shape' | 'capacity' | 'x' | 'y' | 'width' | 'height'>>) =>
    fetchJSON<Table>(`/stores/${storeId}/tables/${tableId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  closeTable: (storeId: string, tableId: string) =>
    fetchJSON<{ closed: number }>(`/stores/${storeId}/tables/${tableId}/close`, {
      method: 'POST',
    }),

  callWaiter: (storeId: string, tableId: string) =>
    fetchJSON<Table>(`/stores/${storeId}/tables/${tableId}/call-waiter`, { method: 'POST' }),

  ackWaiterCall: (storeId: string, tableId: string) =>
    fetchJSON<Table>(`/stores/${storeId}/tables/${tableId}/ack-waiter-call`, { method: 'POST' }),

  requestBill: (storeId: string, tableId: string) =>
    fetchJSON<Table>(`/stores/${storeId}/tables/${tableId}/request-bill`, { method: 'POST' }),

  setTableStatus: (storeId: string, tableId: string, status: Table['status']) =>
    fetchJSON<Table>(`/stores/${storeId}/tables/${tableId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
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

  // Checkout for session (pay-later: pay remaining balance)
  createCheckoutForSession: (storeId: string, sessionId: string, amount: number, settlement?: {
    type: 'by-item'; itemKeys: string[]
  } | {
    type: 'by-percent'; percent: number
  }, tipAmount?: number) =>
    fetchJSON<{ clientSecret: string; amount: number }>(
      `/stores/${storeId}/checkout`,
      { method: 'POST', body: JSON.stringify({
        sessionId, amount,
        ...(tipAmount ? { tipAmount } : {}),
        ...(settlement?.type === 'by-item' ? { settlementType: 'by-item', itemKeys: settlement.itemKeys } : {}),
        ...(settlement?.type === 'by-percent' ? { settlementType: 'by-percent', percent: settlement.percent } : {}),
      }) },
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

  // Staff Management
  getStaff: (storeId: string) =>
    fetchJSON<AuthUser[]>(`/stores/${storeId}/staff`),

  // Clock In/Out
  verifyClockPin: (storeId: string, pin: string) =>
    fetchJSON<{ user: { id: string; username: string }; clockedIn: boolean; currentEntry?: TimeEntry }>(
      `/stores/${storeId}/clock/pin`, { method: 'POST', body: JSON.stringify({ pin }) },
    ),

  clockIn: (storeId: string, pin: string) =>
    fetchJSON<TimeEntry>(`/stores/${storeId}/clock/in`, {
      method: 'POST', body: JSON.stringify({ pin }),
    }),

  clockOut: (storeId: string, pin: string) =>
    fetchJSON<TimeEntry>(`/stores/${storeId}/clock/out`, {
      method: 'POST', body: JSON.stringify({ pin }),
    }),

  getTimeEntries: (storeId: string, params?: { userId?: string; startDate?: string; endDate?: string }) => {
    const qs = params ? new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v))
    ).toString() : ''
    return fetchJSON<TimeEntry[]>(`/stores/${storeId}/clock/entries${qs ? '?' + qs : ''}`)
  },

  createStaff: (storeId: string, data: { username: string; password: string; role: string; clockPin?: string }) =>
    fetchJSON<AuthUser>(`/stores/${storeId}/staff`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateStaff: (storeId: string, userId: string, data: { role?: string; clockPin?: string }) =>
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

  // Sessions
  createSession: (storeId: string, tableId: string) =>
    fetchJSON<Session>(`/stores/${storeId}/sessions`, {
      method: 'POST', body: JSON.stringify({ tableId }),
    }),

  getActiveSession: (storeId: string, tableId: string) =>
    fetchJSON<SessionSummary | null>(`/stores/${storeId}/sessions?tableId=${tableId}`),

  getSessionSummary: (storeId: string, sessionId: string) =>
    fetchJSON<SessionSummary>(`/stores/${storeId}/sessions/${sessionId}/summary`),

  closeSession: (storeId: string, sessionId: string) =>
    settlementFetch<{}>(`/stores/${storeId}/sessions/${sessionId}/close`, { method: 'PATCH' }),

  reopenSession: (storeId: string, sessionId: string) =>
    settlementFetch<{}>(`/stores/${storeId}/sessions/${sessionId}/reopen`, { method: 'PATCH' }),

  addPayment: (storeId: string, sessionId: string, amount: number, paidBy?: string, tipAmount?: number) =>
    settlementFetch<{ payment: Payment }>(`/stores/${storeId}/sessions/${sessionId}/payments`, {
      method: 'POST',
      body: JSON.stringify({ amount, paidBy, tipAmount }),
    }),

  applySessionCoupon: (storeId: string, sessionId: string, couponId: string, couponCode: string, discountType: string, discountValue: number) =>
    fetchJSON<Session>(`/stores/${storeId}/sessions/${sessionId}/apply-coupon`, {
      method: 'POST',
      body: JSON.stringify({ couponId, couponCode, discountType, discountValue }),
    }),

  removeSessionCoupon: (storeId: string, sessionId: string) =>
    fetchJSON<Session>(`/stores/${storeId}/sessions/${sessionId}/coupon`, { method: 'DELETE' }),

  // Shared cart (syncs across devices for same table)
  getSessionCart: (storeId: string, sessionId: string) =>
    fetchJSON<{ items: CartItem[]; cartVersion: number; lastCartSubmitAt: string | null }>(
      `/stores/${storeId}/sessions/${sessionId}/cart`,
    ),

  updateSessionCart: (storeId: string, sessionId: string, deviceId: string, items: CartItem[]) =>
    fetchJSON<{ ok: boolean }>(`/stores/${storeId}/sessions/${sessionId}/cart`, {
      method: 'PUT',
      body: JSON.stringify({ deviceId, items }),
    }),

  submitSessionCart: (storeId: string, sessionId: string, cartVersion: number, customerName?: string) =>
    fetchJSON<{ order?: Order; items?: CartItem[]; paymentMode: string; tableId?: string }>(
      `/stores/${storeId}/sessions/${sessionId}/submit-cart`,
      { method: 'POST', body: JSON.stringify({ cartVersion, customerName }) },
    ),

  // Settlement
  startSettlement: (storeId: string, sessionId: string, mode: 'by-item' | 'by-percent') =>
    fetchJSON<Session>(`/stores/${storeId}/sessions/${sessionId}/start-settlement`, {
      method: 'PATCH', body: JSON.stringify({ mode }),
    }),

  payByItems: (storeId: string, sessionId: string, itemKeys: string[]) =>
    settlementFetch<{ amount: number; tax: number; serviceFee: number }>(
      `/stores/${storeId}/sessions/${sessionId}/pay-items`,
      { method: 'POST', body: JSON.stringify({ itemKeys }) },
    ),

  payByPercent: (storeId: string, sessionId: string, percent: number) =>
    settlementFetch<{ amount: number; tax: number; serviceFee: number }>(
      `/stores/${storeId}/sessions/${sessionId}/pay-percent`,
      { method: 'POST', body: JSON.stringify({ percent }) },
    ),

  recordCashPayment: (storeId: string, sessionId: string, amount: number, receivedAmount: number) =>
    settlementFetch<{ payment: Payment; change: number }>(
      `/stores/${storeId}/sessions/${sessionId}/cash-payment`,
      { method: 'POST', body: JSON.stringify({ amount, receivedAmount }) },
    ),

  // Split Bills (admin)
  getSplitBills: (storeId: string, sessionId: string) =>
    fetchJSON<{ splits: SplitBill[]; mainBill: { subtotal: number; tax: number; serviceFee: number; total: number; itemCount: number } }>(
      `/stores/${storeId}/sessions/${sessionId}/split-bills`,
    ),

  createSplitBill: (storeId: string, sessionId: string, data: { type: 'by-item' | 'by-percent'; itemKeys?: string[]; percent?: number; label?: string }) =>
    settlementFetch<{ splitBill: SplitBill }>(`/stores/${storeId}/sessions/${sessionId}/split-bills`, {
      method: 'POST', body: JSON.stringify(data),
    }),

  deleteSplitBill: (storeId: string, sessionId: string, splitBillId: string) =>
    settlementFetch<{}>(`/stores/${storeId}/sessions/${sessionId}/split-bills/${splitBillId}`, {
      method: 'DELETE',
    }),

  paySplitBillCard: (storeId: string, sessionId: string, splitBillId: string, tipAmount?: number, captureMethod?: 'manual') => {
    // Manual capture bypasses gateway (Stripe async flow)
    if (captureMethod === 'manual') {
      return fetchJSON<{ clientSecret: string; paymentIntentId: string; authorizedAmount: number }>(
        `/stores/${storeId}/sessions/${sessionId}/split-bills/${splitBillId}/pay-card`,
        { method: 'POST', body: JSON.stringify({ tipAmount, captureMethod }) },
      )
    }
    return settlementFetch<{ splitBill: SplitBill }>(
      `/stores/${storeId}/sessions/${sessionId}/split-bills/${splitBillId}/pay-card`,
      { method: 'POST', body: JSON.stringify({ tipAmount }) },
    )
  },

  paySplitBillCash: (storeId: string, sessionId: string, splitBillId: string, receivedAmount: number, tipAmount?: number) =>
    settlementFetch<{ splitBill: SplitBill; change: number }>(
      `/stores/${storeId}/sessions/${sessionId}/split-bills/${splitBillId}/pay-cash`,
      { method: 'POST', body: JSON.stringify({ receivedAmount, tipAmount }) },
    ),

  captureSplitBill: (storeId: string, sessionId: string, splitBillId: string, tipAmount: number) =>
    fetchJSON<{ splitBill: SplitBill; sessionFullyPaid: boolean }>(
      `/stores/${storeId}/sessions/${sessionId}/split-bills/${splitBillId}/capture`,
      { method: 'POST', body: JSON.stringify({ tipAmount }) },
    ),

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

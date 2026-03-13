import type { MenuResponse, CreateOrderRequest, Order, OrderStatus, OrderItem, MenuItem, Category, Table, Store, UpdateStoreRequest } from '@qr-order/shared'
import { useAuthStore } from '@/stores/auth-store'

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
  getTables: (storeId: string) =>
    fetchJSON<Table[]>(`/stores/${storeId}/tables`),

  getTable: (storeId: string, tableId: string) =>
    fetchJSON<Table>(`/stores/${storeId}/tables/${tableId}`),

  createTable: (storeId: string, name: string, nameEn?: string) =>
    fetchJSON<Table>(`/stores/${storeId}/tables`, {
      method: 'POST',
      body: JSON.stringify({ name, ...(nameEn ? { nameEn } : {}) }),
    }),

  updateTable: (storeId: string, tableId: string, data: { name?: string; nameEn?: string }) =>
    fetchJSON<Table>(`/stores/${storeId}/tables/${tableId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteTable: (storeId: string, tableId: string) =>
    fetchJSON<void>(`/stores/${storeId}/tables/${tableId}`, {
      method: 'DELETE',
    }),

  settleTable: (storeId: string, tableId: string) =>
    fetchJSON<{ settled: number }>(`/stores/${storeId}/tables/${tableId}/settle`, {
      method: 'POST',
    }),

  closeTable: (storeId: string, tableId: string) =>
    fetchJSON<{ closed: number }>(`/stores/${storeId}/tables/${tableId}/close`, {
      method: 'POST',
    }),

  // Customer: get orders for a specific table
  getTableOrders: (storeId: string, tableId: string) =>
    fetchJSON<Order[]>(`/stores/${storeId}/orders?tableId=${tableId}`),

  // Checkout
  createCheckout: (storeId: string, orderId: string) =>
    fetchJSON<{ clientSecret: string; amount: number }>(
      `/stores/${storeId}/orders/${orderId}/checkout`,
      { method: 'POST' },
    ),

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

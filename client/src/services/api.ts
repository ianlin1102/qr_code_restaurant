import type { MenuResponse, CreateOrderRequest, Order, OrderStatus } from '@qr-order/shared'

const BASE = '/api'

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Network error' }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

export const api = {
  getMenu: (storeId: string) =>
    fetchJSON<MenuResponse>(`/stores/${storeId}/menu`),

  createOrder: (storeId: string, data: CreateOrderRequest) =>
    fetchJSON<Order>(`/stores/${storeId}/orders`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getOrders: (storeId: string, status?: OrderStatus) =>
    fetchJSON<Order[]>(`/stores/${storeId}/orders${status ? `?status=${status}` : ''}`),

  updateOrderStatus: (storeId: string, orderId: string, status: OrderStatus) =>
    fetchJSON<Order>(`/stores/${storeId}/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
}

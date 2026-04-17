import type { CreateOrderRequest, Order, OrderStatus, OrderItem } from '@qr-order/shared'
import { fetchJSON } from './_client'

export const orderApi = {
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

  // Customer: get orders for a specific table
  getTableOrders: (storeId: string, tableId: string) =>
    fetchJSON<Order[]>(`/stores/${storeId}/orders?tableId=${tableId}`),
}

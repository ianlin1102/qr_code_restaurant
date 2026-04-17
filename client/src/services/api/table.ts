import type { Table, Payment } from '@qr-order/shared'
import { useAuthStore } from '@/stores/auth-store'
import { fetchJSON } from './_client'

export const tableApi = {
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

  adjustPaymentTip: (storeId: string, paymentId: string, tipAmount: number) =>
    fetchJSON<Payment>(`/stores/${storeId}/payments/${paymentId}/tip`, {
      method: 'PATCH',
      body: JSON.stringify({ tipAmount }),
    }),
}

import type { LoginResponse, Store, UpdateStoreRequest, AnalyticsResponse, Coupon, WaitlistEntry } from '@qr-order/shared'
import { useAuthStore } from '@/stores/auth-store'
import { fetchJSON, BASE } from './_client'

export const adminApi = {
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

  // Printer
  reprintOrder: (storeId: string, orderId: string) =>
    fetchJSON<{ success: boolean }>(`/stores/${storeId}/printer/print/${orderId}`, {
      method: 'POST',
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

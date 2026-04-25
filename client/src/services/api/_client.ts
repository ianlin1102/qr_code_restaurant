import type { Order, Payment, Session } from '@qr-order/shared'
import { useAuthStore } from '@/stores/auth-store'

export type SessionSummary = Session & {
  orders: Order[]; payments: Payment[]
  remaining: number; isPaid: boolean
  netDue: number; tax: number; serviceFee: number; totalWithTax: number
  // SSOT: derived server-side, surfaced on summary for UI use
  totalAmount: number
  discountAmount: number
  totalPaid: number; paidItemIds: string[]
}

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

export const BASE = '/api'

export async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const token = useAuthStore.getState().token
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${url}`, { ...options, headers })

  if (res.status === 401) {
    const isLoginAttempt = url.includes('/auth/login')
    const isAdminPage = typeof window !== 'undefined' &&
                         window.location.pathname.startsWith('/admin')
    if (!isLoginAttempt && isAdminPage) {
      // Only redirect on admin pages; customer pages just surface the error.
      const storeId = useAuthStore.getState().user?.storeId
      useAuthStore.getState().logout()
      window.location.href = storeId ? `/admin/login?store=${storeId}` : '/admin/login'
      throw new Error('Session expired')
    }
    // Non-admin page 401: throw without redirect, caller handles.
    // Skip for login attempts so the !res.ok branch below surfaces server message.
    if (!isLoginAttempt) throw new Error('Unauthorized')
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
export async function settlementFetch<T>(url: string, options?: RequestInit): Promise<T & { allowedActions: AllowedActions; remaining: number; sessionStatus: string }> {
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

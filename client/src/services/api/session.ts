import type { Session, Payment, CartItem, Order, SplitBill } from '@qr-order/shared'
import { fetchJSON, settlementFetch, type SessionSummary } from './_client'

export const sessionApi = {
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

  // Checkout — creates Stripe PaymentIntent only, no order
  createCheckout: (storeId: string, data: { tableId: string; items: { menuItemId: string; quantity: number; remark?: string; selectedOptions?: unknown[] }[]; customerName?: string; tipAmount?: number }) =>
    fetchJSON<{ clientSecret: string; amount: number; subtotal: number; tax: number; serviceFee: number }>(
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

  recordCashPayment: (storeId: string, sessionId: string, amount: number, receivedAmount: number, tipAmount?: number) =>
    settlementFetch<{ payment: Payment; change: number }>(
      `/stores/${storeId}/sessions/${sessionId}/cash-payment`,
      { method: 'POST', body: JSON.stringify({ amount, receivedAmount, tipAmount }) },
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
}

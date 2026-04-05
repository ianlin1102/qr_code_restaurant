import { create } from 'zustand'
import { api, type SessionSummary } from '@/services/api'

/**
 * Centralized session payment state — single source of truth for:
 * - Session summary (orders, remaining, tax, totalWithTax, isPaid, etc.)
 * - Polling lifecycle
 *
 * Both MenuPage and SettlementSheet read from this store.
 * After any payment action, call `refresh()` to re-fetch from server.
 */

interface PaymentState {
  summary: SessionSummary | null
  sessionId: string | null
  loading: boolean

  /** Initialize: fetch or create session, start polling */
  init: (storeId: string, tableId: string) => void
  /** Stop polling */
  stop: () => void
  /** Force refresh from server */
  refresh: () => void
}

let pollId: ReturnType<typeof setInterval> | null = null
let currentStoreId: string | null = null
let currentTableId: string | null = null

async function fetchSession(storeId: string, tableId: string): Promise<SessionSummary | null> {
  let s = await api.getActiveSession(storeId, tableId)
  if (!s) {
    await api.createSession(storeId, tableId)
    s = await api.getActiveSession(storeId, tableId)
    if (!s) return null
  }
  return s
}

export const usePaymentStore = create<PaymentState>()((set) => ({
  summary: null,
  sessionId: null,
  loading: false,

  init: (storeId, tableId) => {
    currentStoreId = storeId
    currentTableId = tableId

    // Initial fetch
    set({ loading: true })
    fetchSession(storeId, tableId)
      .then(s => set({ summary: s, sessionId: s?.id ?? null, loading: false }))
      .catch(() => set({ loading: false }))

    // Start polling every 10s
    if (pollId) clearInterval(pollId)
    pollId = setInterval(() => {
      if (!currentStoreId || !currentTableId) return
      api.getActiveSession(currentStoreId, currentTableId)
        .then(s => { if (s) set({ summary: s, sessionId: s.id }) })
        .catch(() => {})
    }, 10_000)
  },

  stop: () => {
    if (pollId) { clearInterval(pollId); pollId = null }
    currentStoreId = null
    currentTableId = null
  },

  refresh: () => {
    if (!currentStoreId || !currentTableId) return
    api.getActiveSession(currentStoreId, currentTableId)
      .then(s => { if (s) set({ summary: s, sessionId: s.id }) })
      .catch(() => {})
  },
}))

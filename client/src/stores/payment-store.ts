import { create } from 'zustand'
import { api, type SessionSummary } from '@/services/api'
import { POLL } from '@/lib/intervals'

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
  /** Handle SSE event — triggers immediate refresh (called by components with SSE access) */
  handleEvent: () => void
}

let pollId: ReturnType<typeof setInterval> | null = null
let currentStoreId: string | null = null
let currentTableId: string | null = null
let lastFp = ''

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

    // Fallback polling every 30s (SSE is primary, polling is safety net)
    if (pollId) clearInterval(pollId)
    pollId = setInterval(() => {
      if (!currentStoreId || !currentTableId) return
      api.getActiveSession(currentStoreId, currentTableId)
        .then(s => {
          if (!s) return
          const fp = `${s.totalPaid}|${s.remaining}|${s.status}|${s.settlementMode}`
          if (fp === lastFp) return
          lastFp = fp
          set({ summary: s, sessionId: s.id })
        })
        .catch(() => {})
    }, POLL.ADMIN_FALLBACK)
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

  handleEvent: () => {
    // SSE event received — fetch fresh data immediately (same as refresh)
    if (!currentStoreId || !currentTableId) return
    api.getActiveSession(currentStoreId, currentTableId)
      .then(s => {
        if (!s) return
        const fp = `${s.totalPaid}|${s.remaining}|${s.status}|${s.settlementMode}`
        if (fp === lastFp) return
        lastFp = fp
        set({ summary: s, sessionId: s.id })
      })
      .catch(() => {})
  },
}))

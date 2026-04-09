import { useState, useEffect, useCallback, useRef } from 'react'
import { api, type SessionSummary, type AllowedActions } from '@/services/api'
import type { SplitBill } from '@qr-order/shared'
import { deriveAllowedActions } from '@/lib/settlement'
import { notify } from '@/lib/notify'

interface SettlementPollOptions {
  storeId: string
  sessionId: string
  /** Whether the polling is active (e.g., dialog is open) */
  active: boolean
  /** Polling interval in ms (default: 10000). SSE is primary, polling is safety net. */
  interval?: number
  /** Whether to also fetch split bills (admin-side). Default: false */
  withSplits?: boolean
  /** SSE subscribe function from useSessionEvents. If provided, SSE is primary, polling is fallback. */
  subscribe?: (type: string, handler: (data: any) => void) => () => void
}

interface SettlementPollResult {
  session: SessionSummary | null
  splits: SplitBill[]
  mainBill: { total: number; itemCount: number } | null
  allowed: AllowedActions | null
  setAllowed: (a: AllowedActions) => void
  refresh: () => Promise<void>
}

export function useSettlementPoll({
  storeId, sessionId, active, interval = 10_000, withSplits = false, subscribe,
}: SettlementPollOptions): SettlementPollResult {
  const [session, setSession] = useState<SessionSummary | null>(null)
  const [splits, setSplits] = useState<SplitBill[]>([])
  const [mainBill, setMainBill] = useState<{ total: number; itemCount: number } | null>(null)
  const [allowed, setAllowed] = useState<AllowedActions | null>(null)
  const lastFp = useRef('')

  const refresh = useCallback(async () => {
    try {
      if (withSplits) {
        const [summary, data] = await Promise.all([
          api.getSessionSummary(storeId, sessionId),
          api.getSplitBills(storeId, sessionId),
        ])
        const freshSplits = data.splits ?? []
        const fp = `${summary.totalPaid}|${summary.remaining}|${summary.status}|${summary.settlementMode}|${freshSplits.map(s => s.id + s.status).join(',')}`
        if (fp === lastFp.current) return
        lastFp.current = fp
        setSession(summary)
        setSplits(freshSplits)
        setMainBill(data.mainBill ?? { total: 0, itemCount: 0 })
        setAllowed(deriveAllowedActions(summary, freshSplits))
      } else {
        const data = await api.getSessionSummary(storeId, sessionId)
        const fp = `${data.totalPaid}|${data.remaining}|${data.status}|${data.settlementMode}|${data.payments?.length}`
        if (fp === lastFp.current) return
        lastFp.current = fp
        setSession(data)
        setAllowed(deriveAllowedActions(data))
      }
    } catch (e) { notify.fromError(e) }
  }, [storeId, sessionId, withSplits])

  useEffect(() => {
    if (!active) return
    lastFp.current = ''
    refresh()
    // Fallback polling (SSE is primary if subscribe is provided)
    const id = setInterval(refresh, interval)
    return () => clearInterval(id)
  }, [active, refresh, interval])

  // SSE-driven updates: listen to session:summary and split:changed events
  useEffect(() => {
    if (!active || !subscribe) return
    const unsub1 = subscribe('session:summary', () => { refresh() })
    const unsub2 = subscribe('split:changed', () => { refresh() })
    return () => { unsub1(); unsub2() }
  }, [active, subscribe, refresh])

  return { session, splits, mainBill, allowed, setAllowed, refresh }
}

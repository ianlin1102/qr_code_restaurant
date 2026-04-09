import type { SessionSummary, AllowedActions } from '@/services/api'
import type { SplitBill } from '@qr-order/shared'

/**
 * Derive client-side AllowedActions from session + optional splits.
 * When splits are provided, split-aware conditions (effectiveMode, paySplit, deleteSplit) apply.
 * Without splits (customer-side / BillSettleDialog), split actions are disabled.
 */
export function deriveAllowedActions(session: SessionSummary, splits?: SplitBill[]): AllowedActions {
  const isClosed = session.status === 'closed'
  const isPaid = (session.remaining ?? 0) <= 0

  const hasUnpaidSplits = splits?.some(s => s.status === 'unpaid') ?? false
  const hasPercentSplits = splits?.some(s => s.type === 'by-percent') ?? false
  // effectiveMode: percent splits always enforce by-percent; otherwise trust session.settlementMode
  const effectiveMode = hasPercentSplits ? 'by-percent' : session.settlementMode

  return {
    payByItems: !isClosed && !isPaid && effectiveMode !== 'by-percent',
    payByPercent: !isClosed && !isPaid,
    cashPayment: !isClosed && !isPaid,
    createSplitByItem: !isClosed && !isPaid && effectiveMode !== 'by-percent',
    createSplitByPercent: !isClosed && !isPaid,
    paySplit: !isClosed && hasUnpaidSplits,
    deleteSplit: !isClosed && hasUnpaidSplits,
    closeSession: !isClosed && isPaid,
    reopenSession: isClosed,
  }
}

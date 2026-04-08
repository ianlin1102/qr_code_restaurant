import type { SettlementContext, AllowedActions } from './types'

export function computeAllowedActions(ctx: SettlementContext): AllowedActions {
  const { remaining, session, splits } = ctx
  const isPaid = remaining <= 0
  const hasUnpaidSplits = splits.some(s => s.status === 'unpaid')
  const isClosed = session.status === 'closed'

  // Effective mode: session.settlementMode OR derived from existing splits (defense layer)
  const hasPercentSplits = splits.some(s => s.type === 'by-percent')
  const effectiveMode = session.settlementMode || (hasPercentSplits ? 'by-percent' : undefined)

  return {
    // by-percent is hard lock: blocks by-item. by-item is soft lock: allows upgrade to by-percent.
    payByItems:          !isClosed && !isPaid && effectiveMode !== 'by-percent',
    payByPercent:        !isClosed && !isPaid,
    cashPayment:         !isClosed && !isPaid,
    createSplitByItem:   !isClosed && !isPaid && effectiveMode !== 'by-percent',
    createSplitByPercent:!isClosed && !isPaid,
    paySplit:            !isClosed && hasUnpaidSplits,
    deleteSplit:         !isClosed && hasUnpaidSplits,
    closeSession:        !isClosed && isPaid,
    reopenSession:       isClosed,
  }
}

export const EMPTY_ACTIONS: AllowedActions = {
  payByItems: false, payByPercent: false, cashPayment: false,
  createSplitByItem: false, createSplitByPercent: false,
  paySplit: false, deleteSplit: false, closeSession: false, reopenSession: false,
}

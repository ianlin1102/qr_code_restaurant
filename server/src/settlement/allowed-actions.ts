import type { SettlementContext, AllowedActions } from './types'

export function computeAllowedActions(ctx: SettlementContext): AllowedActions {
  const { remaining, session, splits } = ctx
  const mode = session.settlementMode
  const isPaid = remaining <= 0
  const hasUnpaidSplits = splits.some(s => s.status === 'unpaid')
  const isClosed = session.status === 'closed'

  return {
    // by-percent is hard lock: blocks by-item. by-item is soft lock: allows upgrade to by-percent.
    payByItems:          !isClosed && !isPaid && mode !== 'by-percent',
    payByPercent:        !isClosed && !isPaid,
    cashPayment:         !isClosed && !isPaid,
    createSplitByItem:   !isClosed && !isPaid && mode !== 'by-percent',
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

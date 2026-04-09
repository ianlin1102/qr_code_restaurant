import { sessionStore } from '../repositories/stores.js'
import { getSplitBills } from '../controllers/split-bill.service.js'
import logger from '../lib/logger.js'

/**
 * Recalculate and update session.settlementMode based on remaining splits + confirmed payments.
 * Called after split deletion or invalidation.
 */
export function recalculateMode(sessionId: string): void {
  const session = sessionStore.getById(sessionId)
  if (!session) return

  const remainingSplits = getSplitBills(sessionId)
  const hasPercentSplits = remainingSplits.some(s => s.type === 'by-percent')
  const hasItemSplits = remainingSplits.some(s => s.type === 'by-item')
  const hasPaidItems = (session.paidItemIds ?? []).length > 0

  let newMode: 'by-item' | 'by-percent' | undefined
  if (hasPercentSplits) newMode = 'by-percent'
  else if (hasItemSplits || hasPaidItems) newMode = 'by-item'
  else if (session.totalPaid > 0 || session.settlementMode === 'by-percent') newMode = session.settlementMode
  else newMode = undefined

  if (newMode !== session.settlementMode) {
    sessionStore.update(sessionId, { settlementMode: newMode })
    logger.info({ sessionId, oldMode: session.settlementMode, newMode }, 'settlementMode recalculated')
  }
}

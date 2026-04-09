import { splitBillStore, sessionStore } from '../repositories/stores.js'
import { getSplitBills, getMainBillSummary } from './split-bill.service.js'
import { recalculateMode } from '../settlement/mode.js'
import logger from '../lib/logger.js'

/**
 * Invalidate conflicting unpaid splits after a customer payment.
 * Called from webhook after payment confirmed.
 * - by-item: delete if any itemKeys overlap with newly paid items
 * - by-percent: delete if remaining balance changed (subtotal would differ)
 * Returns number of splits deleted.
 */
export function invalidateConflictingSplits(sessionId: string, storeId: string): number {
  const splits = getSplitBills(sessionId)
  const session = sessionStore.getById(sessionId)
  if (!session) return 0

  const paidQtyMap = new Map<string, number>()
  for (const pid of session.paidItemIds ?? []) {
    const parts = pid.split(':')
    const baseKey = `${parts[0]}:${parts[1]}`
    const qty = parts.length >= 3 ? parseInt(parts[2], 10) : Infinity
    paidQtyMap.set(baseKey, (paidQtyMap.get(baseKey) ?? 0) + qty)
  }

  let deleted = 0
  for (const sb of splits) {
    if (sb.status !== 'unpaid') continue

    let conflict = false
    let reason = ''

    if (sb.type === 'by-item' && sb.itemKeys) {
      for (const key of sb.itemKeys) {
        const parts = key.split(':')
        const baseKey = `${parts[0]}:${parts[1]}`
        if (paidQtyMap.has(baseKey)) {
          conflict = true
          reason = 'item overlap with paid items'
          break
        }
      }
      if (!conflict && session.settlementMode === 'by-percent') {
        conflict = true
        reason = 'mode upgraded to by-percent'
      }
    } else if (sb.type === 'by-percent') {
      const mainBill = getMainBillSummary(sessionId, storeId)
      if (mainBill) {
        const nowSubtotal = Math.round(mainBill.subtotal * (sb.percent ?? 0) / 100)
        if (Math.abs(nowSubtotal - sb.subtotal) > 1) {
          conflict = true
          reason = `subtotal changed: was ${sb.subtotal}, now ${nowSubtotal}`
        }
      }
    }

    if (conflict) {
      splitBillStore.delete(sb.id)
      logger.info({ splitBillId: sb.id, sessionId, type: sb.type, reason }, 'split bill auto-invalidated after customer payment')
      deleted++
    }
  }

  if (deleted > 0) {
    recalculateMode(sessionId)
  }

  return deleted
}

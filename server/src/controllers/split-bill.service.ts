import { v4 as uuid } from 'uuid'
import { splitBillStore, orderStore, sessionStore, storeStore } from '../repositories/stores.js'
import { calcTaxAndFees, validateSplit } from '@qr-order/shared/pricing'
import { getSessionSummary } from './session.service.js'
import { derivePaidState } from '../lib/session-state.js'
import { getMainBillSummary, calcByItemSubtotal } from './split-bill-summary.js'
import { recalculateMode } from '../settlement/mode.js'
import logger from '../lib/logger.js'
import type { SplitBill } from '@qr-order/shared'

// Re-export from split modules for backward compatibility
export { invalidateConflictingSplits } from './split-bill-invalidation.js'
export { getMainBillSummary } from './split-bill-summary.js'

// ===== Queries =====

export function getSplitBills(sessionId: string): SplitBill[] {
  return splitBillStore.getByField('sessionId', sessionId)
}

// ===== Create =====

/** @internal Called by settlement gateway. */
export function createSplitBill(
  storeId: string, sessionId: string,
  data: { type: 'by-item' | 'by-percent'; itemKeys?: string[]; percent?: number; label?: string },
): SplitBill | { error: string } {
  const session = sessionStore.getById(sessionId)
  if (!session || session.storeId !== storeId) return { error: 'Session not found' }

  // B3: Check settlement mode conflict (one-way lock: by-percent blocks by-item, but by-item allows upgrade to by-percent)
  if (session.settlementMode === 'by-percent' && data.type === 'by-item') {
    return { error: 'Cannot create by-item split: session is in by-percent settlement mode' }
  }

  let subtotal: number
  if (data.type === 'by-item') {
    // B2: Check against paidItemIds — can't split already-paid items (SSOT)
    const { paidItemIds } = derivePaidState(sessionId)
    const paidQtyMap = new Map<string, number>()
    for (const pid of paidItemIds) {
      const parts = pid.split(':')
      const baseKey = `${parts[0]}:${parts[1]}`
      const qty = parts.length >= 3 ? parseInt(parts[2], 10) : Infinity
      paidQtyMap.set(baseKey, (paidQtyMap.get(baseKey) ?? 0) + qty)
    }
    for (const key of data.itemKeys ?? []) {
      const parts = key.split(':')
      const baseKey = `${parts[0]}:${parts[1]}`
      const reqQty = parts.length >= 3 ? parseInt(parts[2], 10) : Infinity
      const paidQty = paidQtyMap.get(baseKey) ?? 0
      const orderId = parts[0]
      const idx = parseInt(parts[1], 10)
      const order = orderStore.getById(orderId)
      const totalQty = order?.items[idx]?.quantity ?? 0
      const assignedQty = buildAssignedQtyMap(getSplitBills(sessionId)).get(baseKey) ?? 0
      const available = totalQty - paidQty - assignedQty
      if (available < reqQty) {
        return { error: `Item ${baseKey} has insufficient unpaid quantity (available: ${available})` }
      }
    }

    const result = calcByItemSubtotal(session.orderIds, sessionId, data.itemKeys ?? [])
    if ('error' in result) return result
    subtotal = result.subtotal
  } else {
    const pct = data.percent ?? 0
    if (pct < 1 || pct > 100) return { error: 'Percent must be 1-100' }

    const summary = getSessionSummary(storeId, sessionId)
    const remaining = summary?.remaining ?? 0
    const existingSplits = getSplitBills(sessionId)
    const unpaidSplitTotal = existingSplits.filter((s: SplitBill) => s.status === 'unpaid').reduce((sum: number, s: SplitBill) => sum + s.total, 0)
    const availableForSplit = Math.max(0, remaining - unpaidSplitTotal)

    const store = storeStore.getById(storeId)
    const taxRate = (store?.taxRate ?? 0) / 100
    const feeRate = (store?.serviceFeeRate ?? 0) / 100
    const totalRate = 1 + taxRate + feeRate
    const availableSubtotal = Math.round(availableForSplit / totalRate)

    subtotal = Math.round(availableSubtotal * pct / 100)
  }

  const store = storeStore.getById(storeId)
  const { tax, serviceFee } = calcTaxAndFees(subtotal, {
    taxRate: store?.taxRate ?? 0,
    serviceFeeRate: store?.serviceFeeRate ?? 0,
  })
  const splitTotal = subtotal + tax + serviceFee

  const mainBillAfter = getMainBillSummary(sessionId, storeId)
  const remainingAfterSplit = (mainBillAfter?.total ?? 0) - splitTotal
  const pct = data.type === 'by-percent' ? (data.percent ?? 0) : 0
  const validation = validateSplit(splitTotal, remainingAfterSplit, pct)
  if (!validation.valid) {
    return { error: validation.reason ?? 'Split amount too small' }
  }

  const existing = getSplitBills(sessionId)
  const splitBill: SplitBill = {
    id: uuid(), storeId, sessionId,
    label: data.label || `Bill ${existing.length + 1}`,
    type: data.type,
    itemKeys: data.type === 'by-item' ? data.itemKeys : undefined,
    percent: data.type === 'by-percent' ? data.percent : undefined,
    subtotal, tax, serviceFee, total: subtotal + tax + serviceFee,
    status: 'unpaid', createdAt: new Date().toISOString(),
  }
  splitBillStore.create(splitBill)

  if (!session.settlementMode || (session.settlementMode === 'by-item' && data.type === 'by-percent')) {
    sessionStore.update(sessionId, { settlementMode: data.type })
  }

  logger.info({ splitBillId: splitBill.id, sessionId, type: data.type }, 'split bill created')
  return splitBill
}

// ===== Delete =====

/** @internal Called by settlement gateway. */
export function deleteSplitBill(
  storeId: string, splitBillId: string,
): { ok: true } | { error: string } {
  const sb = splitBillStore.getById(splitBillId)
  if (!sb || sb.storeId !== storeId) return { error: 'Split bill not found' }
  if (sb.status !== 'unpaid') return { error: 'Can only delete unpaid split bills' }
  splitBillStore.delete(splitBillId)

  recalculateMode(sb.sessionId)

  logger.info({ splitBillId, sessionId: sb.sessionId }, 'split bill deleted')
  return { ok: true }
}

// ===== Helpers =====

export function buildAssignedQtyMap(splits: SplitBill[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const sb of splits) {
    if (sb.type === 'by-item' && sb.itemKeys) {
      for (const key of sb.itemKeys) {
        const parts = key.split(':')
        const baseKey = `${parts[0]}:${parts[1]}`
        const qty = parts.length >= 3 ? parseInt(parts[2], 10) : Infinity
        map.set(baseKey, (map.get(baseKey) ?? 0) + qty)
      }
    }
  }
  return map
}

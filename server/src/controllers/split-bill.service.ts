import { v4 as uuid } from 'uuid'
import { splitBillStore, orderStore, sessionStore, storeStore } from '../repositories/stores.js'
import { unitPrice as calcUnitPrice, calcTaxAndFees, validateSplit } from '@qr-order/shared/pricing'
import logger from '../lib/logger.js'
import type { SplitBill } from '@qr-order/shared'

// ===== Queries =====

export function getSplitBills(sessionId: string): SplitBill[] {
  return splitBillStore.getByField('sessionId', sessionId)
}

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
    if (sb.type === 'by-item' && sb.itemKeys) {
      for (const key of sb.itemKeys) {
        const parts = key.split(':')
        const baseKey = `${parts[0]}:${parts[1]}`
        if (paidQtyMap.has(baseKey)) {
          conflict = true
          break
        }
      }
    } else if (sb.type === 'by-percent') {
      const mainBill = getMainBillSummary(sessionId, storeId)
      if (mainBill) {
        const nowSubtotal = Math.round(mainBill.subtotal * (sb.percent ?? 0) / 100)
        if (Math.abs(nowSubtotal - sb.subtotal) > 1) conflict = true
      }
    }

    if (conflict) {
      splitBillStore.delete(sb.id)
      logger.info({ splitBillId: sb.id, sessionId, type: sb.type }, 'split bill auto-invalidated after customer payment')
      deleted++
    }
  }
  return deleted
}

/** Items NOT assigned to any split bill — the "main bill" remainder. */
export function getMainBillSummary(sessionId: string, storeId: string) {
  const session = sessionStore.getById(sessionId)
  if (!session || session.storeId !== storeId) return null

  const orders = session.orderIds
    .map(id => orderStore.getById(id)).filter(Boolean)
  const splits = getSplitBills(sessionId)

  const assignedQty = buildAssignedQtyMap(splits)

  let subtotal = 0
  let itemCount = 0
  for (const order of orders) {
    if (!order) continue
    for (let idx = 0; idx < order.items.length; idx++) {
      const item = order.items[idx]
      if (item.voided) continue
      const assigned = assignedQty.get(`${order.id}:${idx}`) ?? 0
      const remaining = Math.max(0, item.quantity - assigned)
      if (remaining <= 0) continue
      const up = calcUnitPrice({ price: item.price, quantity: 1, options: item.selectedOptions?.map(o => ({ priceAdjust: o.priceAdjust })) })
      subtotal += up * remaining
      itemCount += remaining
    }
  }

  // Subtract percent-based split subtotals from unassigned total
  for (const sb of splits) {
    if (sb.type === 'by-percent') subtotal -= sb.subtotal
  }
  subtotal = Math.max(0, subtotal)

  const store = storeStore.getById(storeId)
  const { tax, serviceFee, totalWithTax } = calcTaxAndFees(subtotal, {
    taxRate: store?.taxRate ?? 0,
    serviceFeeRate: store?.serviceFeeRate ?? 0,
  })
  return { subtotal, tax, serviceFee, total: totalWithTax, itemCount }
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
    // B2: Check against paidItemIds — can't split already-paid items
    const paidQtyMap = new Map<string, number>()
    for (const pid of session.paidItemIds ?? []) {
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
    const mainBill = getMainBillSummary(sessionId, storeId)
    if (!mainBill) return { error: 'Cannot compute main bill' }
    const pct = data.percent ?? 0
    if (pct < 1 || pct > 100) return { error: 'Percent must be 1-100' }
    subtotal = Math.round(mainBill.subtotal * pct / 100)
  }

  const store = storeStore.getById(storeId)
  const { tax, serviceFee } = calcTaxAndFees(subtotal, {
    taxRate: store?.taxRate ?? 0,
    serviceFeeRate: store?.serviceFeeRate ?? 0,
  })
  const splitTotal = subtotal + tax + serviceFee

  // Validate $1.00 minimum on both sides of the split
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
  logger.info({ splitBillId, sessionId: sb.sessionId }, 'split bill deleted')
  return { ok: true }
}

// ===== Helpers =====

export function buildAssignedQtyMap(splits: SplitBill[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const sb of splits) {
    if (sb.type === 'by-item' && sb.itemKeys) {
      for (const key of sb.itemKeys) {
        // key format: "orderId:idx:qty" or "orderId:idx"
        const parts = key.split(':')
        const baseKey = `${parts[0]}:${parts[1]}`
        const qty = parts.length >= 3 ? parseInt(parts[2], 10) : Infinity
        map.set(baseKey, (map.get(baseKey) ?? 0) + qty)
      }
    }
  }
  return map
}

function calcByItemSubtotal(
  orderIds: string[], sessionId: string, itemKeys: string[],
): { subtotal: number } | { error: string } {
  const assignedQty = buildAssignedQtyMap(getSplitBills(sessionId))

  let subtotal = 0
  for (const key of itemKeys) {
    const parts = key.split(':')
    const orderId = parts[0]
    const idx = parseInt(parts[1], 10)
    const qty = parts.length >= 3 ? parseInt(parts[2], 10) : undefined

    const order = orderStore.getById(orderId)
    if (!order || !orderIds.includes(orderId)) return { error: `Order ${orderId} not found` }
    const item = order.items[idx]
    if (!item) return { error: `Item index ${idx} not found` }
    if (item.voided) return { error: 'Cannot assign voided item' }

    const baseKey = `${orderId}:${idx}`
    const alreadyAssigned = assignedQty.get(baseKey) ?? 0
    const remaining = item.quantity - alreadyAssigned
    const assignQty = qty != null ? Math.min(qty, remaining) : remaining
    if (assignQty <= 0) return { error: `Item ${baseKey} already fully assigned` }

    const up = calcUnitPrice({ price: item.price, quantity: 1, options: item.selectedOptions?.map(o => ({ priceAdjust: o.priceAdjust })) })
    subtotal += up * assignQty
  }
  return { subtotal }
}

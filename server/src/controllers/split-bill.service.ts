import { v4 as uuid } from 'uuid'
import { splitBillStore, orderStore, sessionStore } from '../repositories/stores.js'
import { calcTax, calcServiceFee } from './session.service.js'
import logger from '../lib/logger.js'
import type { SplitBill } from '@qr-order/shared'

// ===== Queries =====

export function getSplitBills(sessionId: string): SplitBill[] {
  return splitBillStore.getByField('sessionId', sessionId)
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
      const unitPrice = item.price +
        (item.selectedOptions ?? []).reduce((s, o) => s + o.priceAdjust, 0)
      subtotal += unitPrice * remaining
      itemCount += remaining
    }
  }

  // Subtract percent-based split subtotals from unassigned total
  for (const sb of splits) {
    if (sb.type === 'by-percent') subtotal -= sb.subtotal
  }
  subtotal = Math.max(0, subtotal)

  const tax = calcTax(storeId, subtotal)
  const serviceFee = calcServiceFee(storeId, subtotal)
  return { subtotal, tax, serviceFee, total: subtotal + tax + serviceFee, itemCount }
}

// ===== Create =====

export function createSplitBill(
  storeId: string, sessionId: string,
  data: { type: 'by-item' | 'by-percent'; itemKeys?: string[]; percent?: number; label?: string },
): SplitBill | { error: string } {
  const session = sessionStore.getById(sessionId)
  if (!session || session.storeId !== storeId) return { error: 'Session not found' }

  let subtotal: number
  if (data.type === 'by-item') {
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

  const tax = calcTax(storeId, subtotal)
  const serviceFee = calcServiceFee(storeId, subtotal)
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

    const unitPrice = item.price + (item.selectedOptions ?? []).reduce((s, o) => s + o.priceAdjust, 0)
    subtotal += unitPrice * assignQty
  }
  return { subtotal }
}

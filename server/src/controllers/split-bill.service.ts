import { v4 as uuid } from 'uuid'
import { splitBillStore, orderStore, sessionStore } from '../repositories/stores.js'
import { calcTax, calcServiceFee } from './session.service.js'
import logger from '../lib/logger.js'
import type { SplitBill, SplitBillItem } from '@qr-order/shared'

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

  // Build map of assigned qty per orderId:itemIndex
  const assignedQty = buildAssignedQtyMap(splits)

  let subtotal = 0
  let itemCount = 0
  for (const order of orders) {
    if (!order) continue
    for (let idx = 0; idx < order.items.length; idx++) {
      const item = order.items[idx]
      if ((item as Record<string, unknown>).voided) continue
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
    if (sb.method === 'by-percent') subtotal -= sb.subtotal
  }
  subtotal = Math.max(0, subtotal)

  const tax = calcTax(storeId, subtotal)
  const serviceFee = calcServiceFee(storeId, subtotal)
  return { subtotal, tax, serviceFee, total: subtotal + tax + serviceFee, itemCount }
}

// ===== Create =====

export function createSplitBill(
  storeId: string, sessionId: string,
  data: { method: 'by-item' | 'by-percent'; items?: SplitBillItem[]; percent?: number; label?: string },
): SplitBill | { error: string } {
  const session = sessionStore.getById(sessionId)
  if (!session || session.storeId !== storeId) return { error: 'Session not found' }

  let subtotal: number
  if (data.method === 'by-item') {
    const result = calcByItemSubtotal(session.orderIds, sessionId, data.items ?? [])
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
  const splitBill: SplitBill = {
    id: uuid(), storeId, sessionId, label: data.label,
    method: data.method,
    items: data.method === 'by-item' ? data.items : undefined,
    percent: data.method === 'by-percent' ? data.percent : undefined,
    subtotal, tax, serviceFee, total: subtotal + tax + serviceFee,
    status: 'unpaid', createdAt: new Date().toISOString(),
  }
  splitBillStore.create(splitBill)
  logger.info({ splitBillId: splitBill.id, sessionId, method: data.method }, 'split bill created')
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
    if (sb.method === 'by-item' && sb.items) {
      for (const si of sb.items) {
        const key = `${si.orderId}:${si.itemIndex}`
        map.set(key, (map.get(key) ?? 0) + si.quantity)
      }
    }
  }
  return map
}

function calcByItemSubtotal(
  orderIds: string[], sessionId: string, items: SplitBillItem[],
): { subtotal: number } | { error: string } {
  const assignedQty = buildAssignedQtyMap(getSplitBills(sessionId))

  let subtotal = 0
  for (const si of items) {
    const order = orderStore.getById(si.orderId)
    if (!order || !orderIds.includes(si.orderId)) {
      return { error: `Order ${si.orderId} not found` }
    }
    const item = order.items[si.itemIndex]
    if (!item) return { error: `Item index ${si.itemIndex} not found in order ${si.orderId}` }
    if ((item as Record<string, unknown>).voided) return { error: 'Cannot assign voided item' }

    const key = `${si.orderId}:${si.itemIndex}`
    const alreadyAssigned = assignedQty.get(key) ?? 0
    if (alreadyAssigned + si.quantity > item.quantity) {
      return { error: `Item ${key} over-assigned (available: ${item.quantity - alreadyAssigned})` }
    }
    const unitPrice = item.price +
      (item.selectedOptions ?? []).reduce((s, o) => s + o.priceAdjust, 0)
    subtotal += unitPrice * si.quantity
  }
  return { subtotal }
}

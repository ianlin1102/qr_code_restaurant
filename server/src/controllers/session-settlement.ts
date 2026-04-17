import { sessionStore, orderStore, storeStore } from '../repositories/stores.js'
import type { Session } from '@qr-order/shared'
import { unitPrice as calcUnitPrice, calcBillSummary } from '@qr-order/shared/pricing'
import { derivePaidState, deriveSessionTotalAmount, deriveSessionDiscount } from '../lib/session-state.js'
import { adoptOrphanedOrders } from './session-crud.js'
import { calcTax, calcServiceFee, getPayments } from './session-payment.js'

// ===== Summary =====

export function getSessionSummary(storeId: string, sessionId: string) {
  const session = sessionStore.getById(sessionId)
  if (!session || session.storeId !== storeId) return null

  adoptOrphanedOrders(session)

  const freshSession = sessionStore.getById(sessionId)!
  const orders = freshSession.orderIds
    .map(id => orderStore.getById(id)).filter(Boolean)
  const payments = getPayments(sessionId)
  const store = storeStore.getById(storeId)
  const rates = { taxRate: store?.taxRate ?? 0, serviceFeeRate: store?.serviceFeeRate ?? 0 }

  // SSOT: all money values derived from canonical sources.
  const { totalPaid, paidItemIds } = derivePaidState(sessionId)
  const totalAmount = deriveSessionTotalAmount(sessionId)
  const discountAmount = deriveSessionDiscount(sessionId)

  const bill = calcBillSummary({
    totalAmount,
    discountAmount,
    totalPaid,
    ...rates,
  })

  // Calculate remaining from unpaid items (avoids rounding drift).
  const paidQtyMap = new Map<string, number>()
  for (const pid of paidItemIds) {
    const parts = pid.split(':')
    const baseKey = `${parts[0]}:${parts[1]}`
    const qty = parts.length >= 3 ? parseInt(parts[2], 10) : Infinity
    paidQtyMap.set(baseKey, (paidQtyMap.get(baseKey) ?? 0) + qty)
  }
  let unpaidSubtotal = 0
  for (const order of orders) {
    if (!order) continue
    for (let idx = 0; idx < order.items.length; idx++) {
      const item = order.items[idx]
      if (item.voided) continue
      const baseKey = `${order.id}:${idx}`
      const paidQty = Math.min(paidQtyMap.get(baseKey) ?? 0, item.quantity)
      const remainingQty = item.quantity - paidQty
      if (remainingQty <= 0) continue
      const optAdj = (item.selectedOptions ?? []).reduce((s: number, o: any) => s + (o.priceAdjust ?? 0), 0)
      unpaidSubtotal += (item.price + optAdj) * remainingQty
    }
  }
  const unpaidTax = calcTax(storeId, unpaidSubtotal)
  const unpaidFee = calcServiceFee(storeId, unpaidSubtotal)
  const itemBasedRemaining = unpaidSubtotal + unpaidTax + unpaidFee

  return {
    ...freshSession,
    totalAmount, discountAmount, totalPaid, paidItemIds,
    orders, payments, ...bill,
    remaining: freshSession.settlementMode === 'by-item'
      ? Math.max(0, Math.min(itemBasedRemaining, bill.remaining))
      : bill.remaining,
  }
}

// ===== Settlement =====

export function startSettlement(
  storeId: string, sessionId: string, mode: 'by-item' | 'by-percent',
): Session | { error: string } {
  const session = sessionStore.getById(sessionId)
  if (!session || session.storeId !== storeId) return { error: 'Session not found' }
  if (session.status === 'closed') return { error: 'Session is closed' }
  if (session.settlementMode === 'by-percent' && mode === 'by-item') {
    return { error: 'Cannot switch from by-percent to by-item' }
  }
  return sessionStore.update(sessionId, { settlementMode: mode })!
}

/** @internal Called by settlement gateway. Pure calculator — returns amount. */
export function payByItems(
  storeId: string, sessionId: string, itemKeys: string[],
): { amount: number; tax: number; serviceFee: number } | { error: string } {
  const session = sessionStore.getById(sessionId)
  if (!session || session.storeId !== storeId) return { error: 'Session not found' }
  if (session.settlementMode === 'by-percent') {
    return { error: 'Session is in by-percent mode' }
  }

  adoptOrphanedOrders(session)
  const fresh = sessionStore.getById(sessionId)!
  const orders = fresh.orderIds
    .map(id => orderStore.getById(id)).filter(Boolean)
  const { totalPaid: derivedTotalPaid, paidItemIds: derivedPaidItemIds } = derivePaidState(sessionId)

  // Parse paid quantities from paidItemIds (format: "orderId:idx:qty")
  const paidQtyMap = new Map<string, number>()
  for (const pid of derivedPaidItemIds) {
    const parts = pid.split(':')
    const baseKey = `${parts[0]}:${parts[1]}`
    const qty = parts.length >= 3 ? parseInt(parts[2], 10) : Infinity
    paidQtyMap.set(baseKey, (paidQtyMap.get(baseKey) ?? 0) + qty)
  }

  let subtotal = 0
  for (const key of itemKeys) {
    const parts = key.split(':')
    const orderId = parts[0]
    const idx = parseInt(parts[1], 10)
    const qtyToPay = parts.length >= 3 ? parseInt(parts[2], 10) : undefined

    const order = orders.find(o => o!.id === orderId)
    if (!order) return { error: `Order ${orderId} not found` }
    const item = order.items[idx]
    if (!item) return { error: `Item index ${idx} not found` }

    const alreadyPaid = paidQtyMap.get(`${orderId}:${idx}`) ?? 0
    const remaining = item.quantity - Math.min(alreadyPaid, item.quantity)
    const qty = qtyToPay != null ? Math.min(qtyToPay, remaining) : remaining
    if (qty <= 0) return { error: `Item ${orderId}:${idx} already fully paid` }

    const up = calcUnitPrice({ price: item.price, quantity: 1, options: item.selectedOptions?.map(o => ({ priceAdjust: o.priceAdjust })) })
    subtotal += up * qty
  }

  const tax = calcTax(storeId, subtotal)
  const serviceFee = calcServiceFee(storeId, subtotal)
  const splitTotal = subtotal + tax + serviceFee

  // Validate $1.00 minimum on both sides
  const bill = calcBillSummary({
    totalAmount: deriveSessionTotalAmount(sessionId),
    discountAmount: deriveSessionDiscount(sessionId),
    totalPaid: derivedTotalPaid,
    taxRate: storeStore.getById(storeId)?.taxRate ?? 0,
    serviceFeeRate: storeStore.getById(storeId)?.serviceFeeRate ?? 0,
  })
  const leftover = bill.remaining - splitTotal
  if (splitTotal < 100) return { error: 'Split amount must be at least $1.00' }
  if (leftover > 0 && leftover < 100) return { error: 'Remaining balance after split must be at least $1.00' }

  return { amount: splitTotal, tax, serviceFee }
}

/** @internal Called by settlement gateway. Pure calculator — returns amount. */
export function payByPercent(
  storeId: string, sessionId: string, percent: number,
): { amount: number; tax: number; serviceFee: number } | { error: string } {
  const session = sessionStore.getById(sessionId)
  if (!session || session.storeId !== storeId) return { error: 'Session not found' }
  if (percent < 1 || percent > 100) return { error: 'Percent must be 1-100' }

  const store = storeStore.getById(storeId)
  const rates = { taxRate: store?.taxRate ?? 0, serviceFeeRate: store?.serviceFeeRate ?? 0 }

  adoptOrphanedOrders(session)
  const { totalPaid: derivedTotalPaid } = derivePaidState(sessionId)

  const bill = calcBillSummary({
    totalAmount: deriveSessionTotalAmount(sessionId),
    discountAmount: deriveSessionDiscount(sessionId),
    totalPaid: derivedTotalPaid,
    ...rates,
  })
  const remaining = bill.remaining
  const splitAmount = Math.round(remaining * percent / 100)

  if (percent < 100) {
    const leftover = remaining - splitAmount
    if (splitAmount < 100) return { error: 'Split amount must be at least $1.00' }
    if (leftover < 100) return { error: 'Remaining balance after split must be at least $1.00' }
  }

  // remaining already includes tax+fee, so split proportionally (no double tax)
  const taxRate = rates.taxRate / 100
  const feeRate = rates.serviceFeeRate / 100
  const totalRate = 1 + taxRate + feeRate
  const foodPortion = Math.round(splitAmount / totalRate)
  const tax = Math.round(foodPortion * taxRate)
  const serviceFee = Math.round(foodPortion * feeRate)
  return { amount: splitAmount, tax, serviceFee }
}

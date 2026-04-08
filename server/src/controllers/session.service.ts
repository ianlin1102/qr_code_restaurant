import { v4 as uuid } from 'uuid'
import { sessionStore, paymentStore, orderStore, tableStore, storeStore } from '../repositories/stores.js'
import type { Session, Payment, DiscountType, CartItem } from '@qr-order/shared'
import { unitPrice as calcUnitPrice, calcTax as sharedCalcTax, calcServiceFee as sharedCalcServiceFee, calcBillSummary, calcTaxAndFees } from '@qr-order/shared/pricing'
import logger from '../lib/logger.js'

// ===== Session CRUD =====

export function createSession(storeId: string, tableId: string): Session {
  const session: Session = {
    id: uuid(), storeId, tableId, status: 'active',
    orderIds: [], totalAmount: 0, totalPaid: 0,
    discountAmount: 0, createdAt: new Date().toISOString(),
  }
  sessionStore.create(session)
  tableStore.update(tableId, { currentSessionId: session.id })
  return session
}

export function getActiveSession(storeId: string, tableId: string): Session | undefined {
  return sessionStore.getByField('storeId', storeId)
    .find(s => s.tableId === tableId && s.status === 'active')
}

export function getSessionById(id: string): Session | undefined {
  return sessionStore.getById(id)
}

export function addOrderToSession(
  sessionId: string, orderId: string, orderTotal: number,
): Session | { error: string } {
  const session = sessionStore.getById(sessionId)
  if (!session) return { error: 'Session not found' }
  if (session.status === 'closed') return { error: 'Session is closed' }

  const newTotal = session.totalAmount + orderTotal
  const discountAmount = recalcDiscount(newTotal, session)
  return sessionStore.update(sessionId, {
    orderIds: [...session.orderIds, orderId],
    totalAmount: newTotal,
    discountAmount,
  })!
}

// ===== Close / Reopen =====

/** @internal Called by settlement gateway. */
export function closeSession(
  storeId: string, sessionId: string,
): Session | { error: string } {
  const session = sessionStore.getById(sessionId)
  if (!session || session.storeId !== storeId) return { error: 'Session not found' }
  if (session.status === 'closed') return { error: 'Already closed' }

  const updated = sessionStore.update(sessionId, {
    status: 'closed', closedAt: new Date().toISOString(),
  })!
  tableStore.update(session.tableId, {
    status: 'idle', currentSessionId: undefined,
  })
  logger.info({ sessionId, storeId }, 'session closed')
  return updated
}

/** @internal Called by settlement gateway. */
export function reopenSession(
  storeId: string, sessionId: string,
): Session | { error: string } {
  const session = sessionStore.getById(sessionId)
  if (!session || session.storeId !== storeId) return { error: 'Session not found' }
  if (session.status === 'active') return { error: 'Already active' }

  const updated = sessionStore.update(sessionId, {
    status: 'active', closedAt: undefined,
  })!
  tableStore.update(session.tableId, {
    status: 'occupied', currentSessionId: sessionId,
  })
  logger.info({ sessionId, storeId }, 'session reopened')
  return updated
}

// ===== Payments =====

/** @internal Called by settlement gateway. */
export function addPayment(
  storeId: string, sessionId: string,
  amount: number, paidBy?: string, stripePaymentIntentId?: string,
  tipAmount?: number,
): { session: Session; payment: Payment } | { error: string } {
  const session = sessionStore.getById(sessionId)
  if (!session || session.storeId !== storeId) return { error: 'Session not found' }

  const tip = tipAmount ?? 0
  const foodAmount = amount - tip

  // Calculate remaining before this payment
  const netDue = session.totalAmount - session.discountAmount
  const tax = calcTax(storeId, netDue)
  const fee = calcServiceFee(storeId, netDue)
  const totalWithTax = netDue + tax + fee
  const remaining = totalWithTax - session.totalPaid

  // Overpayment protection (3 cases):
  // Case 1: Session already fully paid → full reject
  if (remaining <= 0) {
    logger.warn({ sessionId, amount, totalPaid: session.totalPaid, totalWithTax }, 'payment rejected: session already fully paid')
    return { error: 'Session is already fully paid. Payment rejected to prevent overcharge.' }
  }

  // Case 2: Payment would exceed remaining → cap at remaining, flag refund needed
  const effectiveFood = Math.min(foodAmount, remaining)
  const refundAmount = foodAmount > remaining ? (foodAmount - remaining) : 0

  const payment: Payment = {
    id: uuid(), sessionId, storeId,
    amount: effectiveFood + tip,
    paidBy, stripePaymentIntentId,
    ...(tip > 0 ? { tipAmount: tip } : {}),
    ...(refundAmount > 0 ? { refundAmount } : {}),
    createdAt: new Date().toISOString(),
  }
  paymentStore.create(payment)

  const newTotalPaid = session.totalPaid + effectiveFood
  sessionStore.update(sessionId, { totalPaid: newTotalPaid })

  if (refundAmount > 0) {
    logger.warn(
      { sessionId, originalAmount: foodAmount, effectiveAmount: effectiveFood, refundAmount, totalPaid: newTotalPaid, totalWithTax },
      'payment capped at remaining — partial refund needed',
    )
  }

  logger.info(
    { sessionId, amount, totalPaid: newTotalPaid, totalWithTax, paidBy },
    'payment recorded',
  )

  // Auto-close when fully paid (payment is the strongest signal customer is leaving)
  if (newTotalPaid >= totalWithTax) {
    closeSession(storeId, sessionId)
  }

  return { session: sessionStore.getById(sessionId)!, payment }
}

export function getPayments(sessionId: string): Payment[] {
  return paymentStore.getByField('sessionId', sessionId)
}

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

  const bill = calcBillSummary({
    totalAmount: freshSession.totalAmount,
    discountAmount: freshSession.discountAmount,
    totalPaid: freshSession.totalPaid,
    ...rates,
  })

  // Calculate remaining from unpaid items (source of truth)
  // This avoids accumulated rounding errors from totalPaid
  const paidQtyMap = new Map<string, number>()
  for (const pid of freshSession.paidItemIds ?? []) {
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
    ...freshSession, orders, payments, ...bill,
    // Override remaining with item-based calculation when in by-item mode
    remaining: freshSession.settlementMode === 'by-item' ? itemBasedRemaining : bill.remaining,
  }
}

/** Link orders that belong to this table but have no sessionId */
function adoptOrphanedOrders(session: Session): void {
  const tableOrders = orderStore.getByField('tableId', session.tableId)
  const orphans = tableOrders.filter(o =>
    o.storeId === session.storeId && !o.sessionId &&
    o.status !== 'closed',
  )
  if (orphans.length === 0) return

  const newOrderIds = [...session.orderIds]
  let addedTotal = 0
  for (const o of orphans) {
    orderStore.update(o.id, { sessionId: session.id })
    if (!newOrderIds.includes(o.id)) {
      newOrderIds.push(o.id)
      addedTotal += o.totalPrice
    }
  }
  sessionStore.update(session.id, {
    orderIds: newOrderIds,
    totalAmount: session.totalAmount + addedTotal,
  })
  logger.info(
    { sessionId: session.id, adopted: orphans.length, addedTotal },
    'adopted orphaned orders into session',
  )
}

// ===== Coupon =====

function recalcDiscount(totalAmount: number, session: Session): number {
  if (!session.couponDiscountType) return 0
  if (session.couponDiscountType === 'percentage') {
    return Math.round(totalAmount * (session.couponDiscountValue ?? 0) / 100)
  }
  if (session.couponDiscountType === 'fixed') {
    return Math.min(session.couponDiscountValue ?? 0, totalAmount)
  }
  return session.discountAmount
}

export function applyCoupon(
  storeId: string, sessionId: string,
  couponId: string, couponCode: string,
  discountType: DiscountType, discountValue: number,
): Session | { error: string } {
  const session = sessionStore.getById(sessionId)
  if (!session || session.storeId !== storeId) return { error: 'Session not found' }
  if (session.status === 'closed') return { error: 'Session is closed' }
  if (session.couponId) return { error: 'Coupon already applied' }

  let discountAmount = 0
  if (discountType === 'percentage') {
    discountAmount = Math.round(session.totalAmount * discountValue / 100)
  } else if (discountType === 'fixed') {
    discountAmount = Math.min(discountValue, session.totalAmount)
  }

  return sessionStore.update(sessionId, {
    couponId, couponCode, couponDiscountType: discountType,
    couponDiscountValue: discountValue, discountAmount,
  })!
}

export function removeCoupon(
  storeId: string, sessionId: string,
): Session | { error: string } {
  const session = sessionStore.getById(sessionId)
  if (!session || session.storeId !== storeId) return { error: 'Session not found' }
  return sessionStore.update(sessionId, {
    couponId: undefined, couponCode: undefined,
    couponDiscountType: undefined, couponDiscountValue: undefined,
    discountAmount: 0,
  })!
}

// ===== Shared Cart (per-device storage, syncs across devices for same table) =====

export function getSessionCart(sessionId: string): CartItem[] {
  const session = sessionStore.getById(sessionId)
  if (!session || !session.pendingCart) return []
  const cart = session.pendingCart
  // Legacy migration: old format was CartItem[], new is Record<string, CartItem[]>
  if (Array.isArray(cart)) return cart as unknown as CartItem[]
  return Object.values(cart).flat()
}

export function updateDeviceCart(sessionId: string, deviceId: string, items: CartItem[]): void {
  const session = sessionStore.getById(sessionId)
  if (!session || session.status === 'closed') return
  const raw = session.pendingCart
  const cart: Record<string, CartItem[]> = (raw && !Array.isArray(raw)) ? { ...raw } : {}
  if (items.length === 0) {
    delete cart[deviceId]
  } else {
    cart[deviceId] = items
  }
  sessionStore.update(sessionId, { pendingCart: cart })
}

export function clearSessionCart(sessionId: string): void {
  const session = sessionStore.getById(sessionId)
  if (!session) return
  sessionStore.update(sessionId, { pendingCart: {} })
}

/**
 * Atomically submit the entire shared cart as an order.
 * Uses cartVersion for optimistic locking to prevent duplicate submissions.
 */
export function submitSessionCart(
  storeId: string, sessionId: string, expectedVersion: number,
): { items: CartItem[]; paymentMode: 'pay-first' | 'pay-later'; tableId: string } | { error: string; status?: number } {
  const session = sessionStore.getById(sessionId)
  if (!session || session.storeId !== storeId) return { error: 'Session not found', status: 404 }
  if (session.status === 'closed') return { error: 'Session is closed', status: 400 }

  if ((session.cartVersion ?? 0) !== expectedVersion) {
    return { error: 'Cart already submitted', status: 409 }
  }

  const cart = session.pendingCart ?? {}
  const allItems = Array.isArray(cart) ? cart as unknown as CartItem[] : Object.values(cart).flat()
  if (allItems.length === 0) return { error: 'Cart is empty', status: 400 }

  const table = tableStore.getById(session.tableId)
  const store = storeStore.getById(storeId)
  const paymentMode = (table?.paymentMode ?? store?.paymentMode ?? 'pay-first') as 'pay-first' | 'pay-later'

  sessionStore.update(sessionId, {
    pendingCart: {},
    cartVersion: (session.cartVersion ?? 0) + 1,
    lastCartSubmitAt: new Date().toISOString(),
  })

  logger.info({ sessionId, storeId, itemCount: allItems.length, paymentMode }, 'session cart submitted')
  return { items: allItems, paymentMode, tableId: session.tableId }
}

// ===== Recalculate (after order edit) =====

export function recalcSessionTotal(sessionId: string): void {
  const session = sessionStore.getById(sessionId)
  if (!session) return
  const orders = session.orderIds
    .map(id => orderStore.getById(id)).filter(Boolean)
  const totalAmount = orders.reduce((sum, o) => sum + (o?.totalPrice ?? 0), 0)
  const discountAmount = recalcDiscount(totalAmount, session)
  sessionStore.update(sessionId, { totalAmount, discountAmount })
}

// ===== Tax & Service Fee =====

export function calcTax(storeId: string, subtotal: number): number {
  const store = storeStore.getById(storeId)
  return sharedCalcTax(subtotal, store?.taxRate ?? 0)
}

export function calcServiceFee(storeId: string, subtotal: number): number {
  const store = storeStore.getById(storeId)
  return sharedCalcServiceFee(subtotal, store?.serviceFeeRate ?? 0)
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
  const paidSet = new Set(fresh.paidItemIds ?? [])

  // Parse paid quantities from paidItemIds (format: "orderId:idx:qty")
  const paidQtyMap = new Map<string, number>()
  for (const pid of fresh.paidItemIds ?? []) {
    const parts = pid.split(':')
    const baseKey = `${parts[0]}:${parts[1]}`
    const qty = parts.length >= 3 ? parseInt(parts[2], 10) : Infinity // old format = fully paid
    paidQtyMap.set(baseKey, (paidQtyMap.get(baseKey) ?? 0) + qty)
  }

  let subtotal = 0
  for (const key of itemKeys) {
    // key format: "orderId:idx:qtyToPay"
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
    totalAmount: fresh.totalAmount,
    discountAmount: fresh.discountAmount,
    totalPaid: fresh.totalPaid,
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
  const fresh = sessionStore.getById(sessionId)!

  const bill = calcBillSummary({
    totalAmount: fresh.totalAmount,
    discountAmount: fresh.discountAmount,
    totalPaid: fresh.totalPaid,
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
  // Back-calculate the tax/fee portion for display only
  const taxRate = rates.taxRate / 100
  const feeRate = rates.serviceFeeRate / 100
  const totalRate = 1 + taxRate + feeRate
  const foodPortion = Math.round(splitAmount / totalRate)
  const tax = Math.round(foodPortion * taxRate)
  const serviceFee = Math.round(foodPortion * feeRate)
  return { amount: splitAmount, tax, serviceFee }
}

/** Called by webhook AFTER payment confirmed — marks items as paid */
export function confirmItemPayment(sessionId: string, itemKeys: string[]): void {
  const session = sessionStore.getById(sessionId)
  if (!session) return

  // Race condition guard: if mode was already upgraded to by-percent by another
  // concurrent payment, don't downgrade back to by-item. Still record paidItemIds
  // so the items are tracked, but respect the mode lock.
  const newMode = session.settlementMode === 'by-percent' ? 'by-percent' : 'by-item'
  if (session.settlementMode === 'by-percent') {
    logger.warn({ sessionId, itemKeys, currentMode: 'by-percent' },
      'item payment confirmed but mode already locked to by-percent — keeping mode, still tracking paid items')
  }

  sessionStore.update(sessionId, {
    settlementMode: newMode,
    paidItemIds: [...(session.paidItemIds ?? []), ...itemKeys],
  })
  logger.info({ sessionId, itemKeys, mode: newMode }, 'items marked as paid after payment confirmation')
}

/** Called by webhook AFTER payment confirmed — locks to percent mode */
export function confirmPercentPayment(sessionId: string): void {
  const session = sessionStore.getById(sessionId)
  if (!session) return
  // by-item → by-percent upgrade is always allowed (one-way lock)
  sessionStore.update(sessionId, { settlementMode: 'by-percent' })
  logger.info({ sessionId, previousMode: session.settlementMode }, 'settlement mode locked to by-percent after payment confirmation')
}

// ===== Safety net: auto-close stale paid sessions =====

const STALE_SESSION_CHECK_MS = 5 * 60 * 1000   // check every 5 minutes
const STALE_SESSION_TIMEOUT_MS = 15 * 60 * 1000 // 15 minutes after last order

export function autoCloseStaleSessionsOnce() {
  const allSessions = sessionStore.getByField('status', 'active')
  const now = Date.now()
  let closed = 0

  for (const session of allSessions) {
    const store = storeStore.getById(session.storeId)
    if (!store) continue

    const netDue = session.totalAmount - session.discountAmount
    const tax = calcTax(session.storeId, netDue)
    const fee = calcServiceFee(session.storeId, netDue)
    const totalWithTax = netDue + tax + fee

    if (session.totalPaid < totalWithTax) continue // not fully paid

    // Find most recent order activity
    const orders = session.orderIds.map(id => orderStore.getById(id)).filter(Boolean)
    const latestOrder = orders.reduce((latest, o) => {
      const t = new Date(o!.createdAt).getTime()
      return t > latest ? t : latest
    }, 0)
    const latestPayment = paymentStore.getByField('sessionId', session.id)
      .reduce((latest, p) => {
        const t = new Date(p.createdAt).getTime()
        return t > latest ? t : latest
      }, 0)
    const lastActivity = Math.max(latestOrder, latestPayment, new Date(session.createdAt).getTime())

    if (now - lastActivity >= STALE_SESSION_TIMEOUT_MS) {
      closeSession(session.storeId, session.id)
      logger.info({ sessionId: session.id, storeId: session.storeId, idleMinutes: Math.round((now - lastActivity) / 60000) },
        'auto-closed stale paid session (safety net)')
      closed++
    }
  }
  return closed
}

// Start the safety net timer
setInterval(autoCloseStaleSessionsOnce, STALE_SESSION_CHECK_MS)
logger.info('session safety net started: checking for stale paid sessions every 5 minutes')

/** @internal Called by settlement gateway. */
export function recordCashPayment(
  storeId: string, sessionId: string,
  amount: number, receivedAmount: number,
): { session: Session; payment: Payment; change: number } | { error: string } {
  if (receivedAmount < amount) return { error: 'Received amount less than due' }

  const result = addPayment(storeId, sessionId, amount, 'waiter')
  if ('error' in result) return result

  paymentStore.update(result.payment.id, { method: 'cash' as const })
  const payment = paymentStore.getById(result.payment.id)!

  return {
    session: result.session,
    payment,
    change: receivedAmount - amount,
  }
}

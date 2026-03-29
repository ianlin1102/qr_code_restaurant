import { v4 as uuid } from 'uuid'
import { sessionStore, paymentStore, orderStore, tableStore } from '../repositories/stores.js'
import type { Session, Payment, DiscountType } from '@qr-order/shared'
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

export function addPayment(
  storeId: string, sessionId: string,
  amount: number, paidBy?: string, stripePaymentIntentId?: string,
): { session: Session; payment: Payment } | { error: string } {
  const session = sessionStore.getById(sessionId)
  if (!session || session.storeId !== storeId) return { error: 'Session not found' }

  const payment: Payment = {
    id: uuid(), sessionId, storeId, amount,
    paidBy, stripePaymentIntentId,
    createdAt: new Date().toISOString(),
  }
  paymentStore.create(payment)

  const newTotalPaid = session.totalPaid + amount
  const netDue = session.totalAmount - session.discountAmount
  sessionStore.update(sessionId, { totalPaid: newTotalPaid })

  logger.info(
    { sessionId, amount, totalPaid: newTotalPaid, netDue, paidBy },
    'payment recorded',
  )

  // Auto-close if fully paid and all orders served
  if (newTotalPaid >= netDue) {
    const orders = session.orderIds
      .map(id => orderStore.getById(id)).filter(Boolean)
    const allServed = orders.every(o => o!.status === 'served')
    if (allServed) {
      closeSession(storeId, sessionId)
    }
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

  const orders = session.orderIds
    .map(id => orderStore.getById(id)).filter(Boolean)
  const payments = getPayments(sessionId)
  const netDue = session.totalAmount - session.discountAmount
  const remaining = Math.max(0, netDue - session.totalPaid)
  const isPaid = session.totalPaid >= netDue && netDue > 0

  return { ...session, orders, payments, remaining, isPaid, netDue }
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

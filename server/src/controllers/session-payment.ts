import { v4 as uuid } from 'uuid'
import { sessionStore, paymentStore, storeStore } from '../repositories/stores.js'
import type { Session, Payment } from '@qr-order/shared'
import { calcTax as sharedCalcTax, calcServiceFee as sharedCalcServiceFee } from '@qr-order/shared/pricing'
import logger from '../lib/logger.js'
import { deriveFifoItemKeys, derivePaidState, deriveSessionTotalAmount, deriveSessionDiscount } from '../lib/session-state.js'

// ===== Tax & Service Fee =====

export function calcTax(storeId: string, subtotal: number): number {
  const store = storeStore.getById(storeId)
  return sharedCalcTax(subtotal, store?.taxRate ?? 0)
}

export function calcServiceFee(storeId: string, subtotal: number): number {
  const store = storeStore.getById(storeId)
  return sharedCalcServiceFee(subtotal, store?.serviceFeeRate ?? 0)
}

// ===== Payments =====

/** @internal Called by settlement gateway. */
export function addPayment(
  storeId: string, sessionId: string,
  amount: number, paidBy?: string, stripePaymentIntentId?: string,
  tipAmount?: number,
  itemKeys?: string[],
  percent?: number,
): { session: Session; payment: Payment } | { error: string } {
  const session = sessionStore.getById(sessionId)
  if (!session || session.storeId !== storeId) return { error: 'Session not found' }

  const tip = tipAmount ?? 0
  const foodAmount = amount - tip

  // Calculate remaining before this payment (SSOT: derive all values)
  const netDue = deriveSessionTotalAmount(sessionId) - deriveSessionDiscount(sessionId)
  const tax = calcTax(storeId, netDue)
  const fee = calcServiceFee(storeId, netDue)
  const totalWithTax = netDue + tax + fee
  const { totalPaid: priorTotalPaid } = derivePaidState(sessionId)
  const remaining = totalWithTax - priorTotalPaid

  // Overpayment protection
  if (remaining <= 0) {
    logger.warn({ sessionId, amount, totalPaid: priorTotalPaid, totalWithTax }, 'payment rejected: session already fully paid')
    return { error: 'Session is already fully paid. Payment rejected to prevent overcharge.' }
  }

  const effectiveFood = Math.min(foodAmount, remaining)
  const refundAmount = foodAmount > remaining ? (foodAmount - remaining) : 0

  // SSOT: resolve itemKeys for this payment.
  // If caller passed itemKeys, use them verbatim. Otherwise FIFO-derive.
  const resolvedItemKeys = itemKeys && itemKeys.length > 0
    ? itemKeys
    : (percent != null ? [] : deriveFifoItemKeys(sessionId, storeId, effectiveFood))

  const payment: Payment = {
    id: uuid(), sessionId, storeId,
    amount: effectiveFood + tip,
    paidBy, stripePaymentIntentId,
    ...(tip > 0 ? { tipAmount: tip } : {}),
    ...(refundAmount > 0 ? { refundAmount } : {}),
    ...(resolvedItemKeys.length > 0 ? { itemKeys: resolvedItemKeys } : {}),
    ...(percent != null ? { percent } : {}),
    createdAt: new Date().toISOString(),
  }
  paymentStore.create(payment)

  const newTotalPaid = priorTotalPaid + effectiveFood

  // Mode lock: percent payments upgrade to 'by-percent' (one-way).
  // itemKeys-based payments set 'by-item' only if no mode is set yet.
  const updates: Partial<Session> = {}
  if (percent != null) {
    updates.settlementMode = 'by-percent'
  } else if (resolvedItemKeys.length > 0 && !session.settlementMode) {
    updates.settlementMode = 'by-item'
  }
  if (Object.keys(updates).length > 0) {
    sessionStore.update(sessionId, updates)
  }

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

  return { session: sessionStore.getById(sessionId)!, payment }
}

export function getPayments(sessionId: string): Payment[] {
  return paymentStore.getByField('sessionId', sessionId)
}

/** @internal Called by settlement gateway. */
export function recordCashPayment(
  storeId: string, sessionId: string,
  amount: number, receivedAmount: number, tipAmount?: number,
  itemKeys?: string[],
): { session: Session; payment: Payment; change: number } | { error: string } {
  if (receivedAmount < amount) return { error: 'Received amount less than due' }

  const result = addPayment(storeId, sessionId, amount, 'waiter', undefined, tipAmount, itemKeys)
  if ('error' in result) return result

  paymentStore.update(result.payment.id, { method: 'cash' as const })
  const payment = paymentStore.getById(result.payment.id)!

  return {
    session: result.session,
    payment,
    change: receivedAmount - amount,
  }
}

/**
 * Back-compat helper: marks items as paid.
 *
 * Production webhook no longer calls this (addPayment now accepts itemKeys
 * directly). Kept for tests and any legacy callers.
 */
export function confirmItemPayment(sessionId: string, itemKeys: string[]): void {
  const session = sessionStore.getById(sessionId)
  if (!session) return

  const newMode = session.settlementMode === 'by-percent' ? 'by-percent' : 'by-item'
  if (session.settlementMode === 'by-percent') {
    logger.warn({ sessionId, itemKeys, currentMode: 'by-percent' },
      'item payment confirmed but mode already locked to by-percent — keeping mode, still tracking paid items')
  }
  sessionStore.update(sessionId, { settlementMode: newMode })

  // Attach itemKeys to the most recent un-attributed Payment, or create a
  // synthetic $0 Payment so SSOT derivation reflects them.
  const payments = paymentStore.getByField('sessionId', sessionId)
  const target = [...payments].reverse().find(p => !p.itemKeys?.length)
  if (target) {
    paymentStore.update(target.id, { itemKeys })
  } else {
    const synthetic: Payment = {
      id: uuid(), sessionId, storeId: session.storeId,
      amount: 0, itemKeys, paidBy: 'system-confirm',
      createdAt: new Date().toISOString(),
    }
    paymentStore.create(synthetic)
  }
  logger.info({ sessionId, itemKeys, mode: newMode }, 'items marked as paid after payment confirmation')
}

/** Called by webhook AFTER payment confirmed — locks to percent mode */
export function confirmPercentPayment(sessionId: string): void {
  const session = sessionStore.getById(sessionId)
  if (!session) return
  sessionStore.update(sessionId, { settlementMode: 'by-percent' })
  logger.info({ sessionId, previousMode: session.settlementMode }, 'settlement mode locked to by-percent after payment confirmation')
}

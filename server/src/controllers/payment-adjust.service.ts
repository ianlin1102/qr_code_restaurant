import { paymentStore, sessionStore } from '../repositories/stores.js'
import { emit } from '../lib/event-bus.js'
import logger from '../lib/logger.js'
import type { Payment } from '@qr-order/shared'

type Result<T> = T | { error: string; status?: number }

const MAX_TIP = 500_00

/**
 * Adjust the tip amount on an existing cash Payment. Stripe payments are
 * rejected here — they require capture/refund flows that are out of scope
 * for the current MVP.
 *
 * totalPaid is NOT affected (tip is excluded from it by project convention),
 * so remaining / allowedActions don't change. We still emit session:summary
 * so any open UI refreshes its displayed tip.
 */
export function adjustPaymentTip(
  storeId: string, paymentId: string, newTipAmount: number,
): Result<Payment> {
  if (!Number.isFinite(newTipAmount) || newTipAmount < 0) {
    return { error: 'Tip must be a non-negative number', status: 400 }
  }
  if (newTipAmount > MAX_TIP) {
    return { error: 'Tip exceeds maximum allowed', status: 400 }
  }

  const payment = paymentStore.getById(paymentId)
  if (!payment || payment.storeId !== storeId) {
    return { error: 'Payment not found', status: 404 }
  }

  if (payment.method !== 'cash') {
    return { error: 'Only cash payment tips can be adjusted in this release', status: 400 }
  }

  const session = sessionStore.getById(payment.sessionId)
  if (!session) {
    return { error: 'Session not found', status: 404 }
  }

  const previousTip = payment.tipAmount ?? 0
  const foodPortion = payment.amount - previousTip
  const updated = paymentStore.update(paymentId, {
    amount: foodPortion + newTipAmount,
    tipAmount: newTipAmount,
  })!
  logger.info(
    { storeId, paymentId, sessionId: payment.sessionId, from: previousTip, to: newTipAmount },
    'cash payment tip adjusted',
  )
  emit({ type: 'session:summary', storeId, sessionId: payment.sessionId })
  return updated
}

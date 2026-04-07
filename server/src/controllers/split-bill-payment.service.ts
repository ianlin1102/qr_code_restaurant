import { splitBillStore, paymentStore, sessionStore } from '../repositories/stores.js'
import { addPayment } from './session.service.js'
import { getStripe } from '../lib/stripe.js'
import logger from '../lib/logger.js'
import type { SplitBill } from '@qr-order/shared'

/** Mark split's items as paid in session.paidItemIds */
function markSplitItemsPaid(sb: SplitBill) {
  if (sb.type !== 'by-item' || !sb.itemKeys?.length) return
  const session = sessionStore.getById(sb.sessionId)
  if (!session) return
  const existing = session.paidItemIds ?? []
  sessionStore.update(sb.sessionId, {
    settlementMode: 'by-item',
    paidItemIds: [...existing, ...sb.itemKeys],
  })
}

// ===== Pay Card (MVP simple — marks paid immediately) =====

export function paySplitBillCard(
  storeId: string, splitBillId: string, tipAmount?: number,
): { splitBill: SplitBill } | { error: string } {
  const sb = splitBillStore.getById(splitBillId)
  if (!sb || sb.storeId !== storeId) return { error: 'Split bill not found' }
  if (sb.status !== 'unpaid') return { error: 'Already paid or pending' }

  const tip = tipAmount ?? 0
  const total = sb.total + tip
  const payResult = addPayment(storeId, sb.sessionId, total, 'waiter', undefined, tip)
  if ('error' in payResult) return payResult

  splitBillStore.update(splitBillId, {
    status: 'paid', paymentId: payResult.payment.id,
    paidAt: new Date().toISOString(), method: 'stripe',
  })
  markSplitItemsPaid(sb)
  return { splitBill: splitBillStore.getById(splitBillId)! }
}

// ===== Pay Cash =====

export function paySplitBillCash(
  storeId: string, splitBillId: string,
  receivedAmount: number, tipAmount?: number,
): { splitBill: SplitBill; change: number } | { error: string } {
  const sb = splitBillStore.getById(splitBillId)
  if (!sb || sb.storeId !== storeId) return { error: 'Split bill not found' }
  if (sb.status !== 'unpaid') return { error: 'Already paid or pending' }

  const tip = tipAmount ?? 0
  const total = sb.total + tip
  if (receivedAmount < total) return { error: 'Received amount less than due' }

  const payResult = addPayment(storeId, sb.sessionId, total, 'waiter', undefined, tip)
  if ('error' in payResult) return payResult

  paymentStore.update(payResult.payment.id, { method: 'cash' as const })
  splitBillStore.update(splitBillId, {
    status: 'paid', paymentId: payResult.payment.id,
    paidAt: new Date().toISOString(), method: 'cash',
  })
  markSplitItemsPaid(sb)
  return { splitBill: splitBillStore.getById(splitBillId)!, change: receivedAmount - total }
}

// ===== Stripe Manual Capture =====

export async function createManualCaptureIntent(
  storeId: string, splitBillId: string,
): Promise<{ clientSecret: string; paymentIntentId: string } | { error: string }> {
  const sb = splitBillStore.getById(splitBillId)
  if (!sb || sb.storeId !== storeId) return { error: 'Split bill not found' }
  if (sb.status !== 'unpaid') return { error: 'Already paid or pending' }

  const stripe = getStripe()
  const holdAmount = Math.round(sb.total * 1.25)
  const pi = await stripe.paymentIntents.create({
    amount: holdAmount, currency: 'usd',
    capture_method: 'manual',
    metadata: { splitBillId, sessionId: sb.sessionId, storeId },
  })

  splitBillStore.update(splitBillId, {
    status: 'pending-capture', paymentIntentId: pi.id,
  })
  logger.info({ splitBillId, piId: pi.id, holdAmount }, 'manual capture intent created')
  return { clientSecret: pi.client_secret!, paymentIntentId: pi.id }
}

export async function captureSplitBillPayment(
  storeId: string, splitBillId: string, tipAmount: number,
): Promise<{ splitBill: SplitBill } | { error: string }> {
  const sb = splitBillStore.getById(splitBillId)
  if (!sb || sb.storeId !== storeId) return { error: 'Split bill not found' }
  if (sb.status !== 'pending-capture' || !sb.paymentIntentId) {
    return { error: 'Not in pending-capture state' }
  }

  const captureAmount = sb.total + (tipAmount ?? 0)
  const stripe = getStripe()
  await stripe.paymentIntents.capture(sb.paymentIntentId, {
    amount_to_capture: captureAmount,
  })

  const payResult = addPayment(storeId, sb.sessionId, captureAmount, 'waiter', sb.paymentIntentId)
  if ('error' in payResult) return payResult

  splitBillStore.update(splitBillId, {
    status: 'paid', paymentId: payResult.payment.id,
    paidAt: new Date().toISOString(), method: 'stripe',
  })
  logger.info({ splitBillId, captureAmount }, 'split bill payment captured')
  return { splitBill: splitBillStore.getById(splitBillId)! }
}

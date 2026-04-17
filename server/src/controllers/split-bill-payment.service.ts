import { splitBillStore, paymentStore, sessionStore } from '../repositories/stores.js'
import { addPayment } from './session.service.js'
import { derivePaidState, deriveSessionTotalAmount } from '../lib/session-state.js'
import { getStripe } from '../lib/stripe.js'
import logger from '../lib/logger.js'
import type { SplitBill } from '@qr-order/shared'

/** Extract itemKeys and percent from a SplitBill for passing to addPayment. */
function splitAttribution(sb: SplitBill): { itemKeys?: string[]; percent?: number } {
  if (sb.type === 'by-item') return { itemKeys: sb.itemKeys }
  if (sb.type === 'by-percent') return { percent: sb.percent }
  return {}
}

// ===== Pay Card (MVP simple — marks paid immediately) =====

/** @internal Called by settlement gateway. */
export function paySplitBillCard(
  storeId: string, splitBillId: string, tipAmount?: number,
): { splitBill: SplitBill } | { error: string } {
  const sb = splitBillStore.getById(splitBillId)
  if (!sb || sb.storeId !== storeId) return { error: 'Split bill not found' }
  if (sb.status !== 'unpaid') return { error: 'Already paid or pending' }

  const tip = tipAmount ?? 0
  const total = sb.total + tip
  const attribution = splitAttribution(sb)
  const payResult = addPayment(
    storeId, sb.sessionId, total, 'waiter', undefined, tip,
    attribution.itemKeys, attribution.percent,
  )
  if ('error' in payResult) return payResult

  splitBillStore.update(splitBillId, {
    status: 'paid', paymentId: payResult.payment.id,
    paidAt: new Date().toISOString(), method: 'stripe',
  })
  return { splitBill: splitBillStore.getById(splitBillId)! }
}

// ===== Pay Cash =====

/** @internal Called by settlement gateway. */
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

  const attribution = splitAttribution(sb)
  const payResult = addPayment(
    storeId, sb.sessionId, total, 'waiter', undefined, tip,
    attribution.itemKeys, attribution.percent,
  )
  if ('error' in payResult) return payResult

  paymentStore.update(payResult.payment.id, { method: 'cash' as const })
  splitBillStore.update(splitBillId, {
    status: 'paid', paymentId: payResult.payment.id,
    paidAt: new Date().toISOString(), method: 'cash',
  })
  return { splitBill: splitBillStore.getById(splitBillId)!, change: receivedAmount - total }
}

// ===== Stripe Manual Capture =====

export async function createManualCaptureIntent(
  storeId: string, splitBillId: string,
): Promise<{ clientSecret: string; paymentIntentId: string; authorizedAmount: number } | { error: string }> {
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
  return { clientSecret: pi.client_secret!, paymentIntentId: pi.id, authorizedAmount: holdAmount }
}

export async function captureSplitBillPayment(
  storeId: string, splitBillId: string, tipAmount: number,
): Promise<{ splitBill: SplitBill; sessionFullyPaid: boolean } | { error: string }> {
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

  // Preserving original behavior: tip not separated here (Phase 2.5 manual
  // capture path is deferred, tip handling will be revisited when it lands).
  const attribution = splitAttribution(sb)
  const payResult = addPayment(
    storeId, sb.sessionId, captureAmount, 'waiter', sb.paymentIntentId, undefined,
    attribution.itemKeys, attribution.percent,
  )
  if ('error' in payResult) return payResult

  splitBillStore.update(splitBillId, {
    status: 'paid', paymentId: payResult.payment.id,
    paidAt: new Date().toISOString(), method: 'stripe',
  })

  // Check if session is fully paid (SSOT: derive both values)
  const sessionFullyPaid = sessionStore.getById(sb.sessionId)
    ? derivePaidState(sb.sessionId).totalPaid >= deriveSessionTotalAmount(sb.sessionId)
    : false

  logger.info({ splitBillId, captureAmount, sessionFullyPaid }, 'split bill payment captured')
  return { splitBill: splitBillStore.getById(splitBillId)!, sessionFullyPaid }
}

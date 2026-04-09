import { getStripe } from '../lib/stripe.js'
import { createOrder } from './order.service.js'
import { getActiveSession, addPayment, confirmItemPayment, confirmPercentPayment, calcTax, calcServiceFee } from './session.service.js'
import { invalidateConflictingSplits } from './split-bill.service.js'
import { orderStore, sessionStore, paymentStore } from '../repositories/stores.js'
import { emit } from '../lib/event-bus.js'
import logger from '../lib/logger.js'
import type { CreateOrderRequest } from '@qr-order/shared'

// ===== Pay-first: new cart checkout =====

interface CheckoutRequest {
  storeId: string
  tableId: string
  items: CreateOrderRequest['items']
  customerName?: string
  tipAmount?: number
}

export async function createPaymentIntent(req: CheckoutRequest) {
  const { getMenuItemById } = await import('./menu.service.js')

  let totalPrice = 0
  for (const item of req.items) {
    const menuItem = getMenuItemById(req.storeId, item.menuItemId)
    if (!menuItem || !menuItem.available) {
      return { error: `Menu item ${item.menuItemId} not available`, status: 400 }
    }
    const optAdjust = (item.selectedOptions ?? []).reduce((s, o) => s + o.priceAdjust, 0)
    totalPrice += (menuItem.price + optAdjust) * item.quantity
  }

  const tip = req.tipAmount && req.tipAmount > 0 ? req.tipAmount : 0
  totalPrice += tip

  if (totalPrice <= 0) {
    return { error: 'Invalid order total', status: 400 }
  }

  // Apply session discount if coupon was applied
  const session = getActiveSession(req.storeId, req.tableId)
  const chargeAmount = session?.couponId
    ? Math.max(0, totalPrice - (session.discountAmount ?? 0))
    : totalPrice

  // Compact cart metadata for Stripe (500 char limit per value)
  const compactItems = req.items.map(i => ({
    m: i.menuItemId, q: i.quantity, r: i.remark,
    o: i.selectedOptions?.map(o => ({ oi: o.optionId, ci: o.choiceId, p: o.priceAdjust })),
  }))
  const cartData = JSON.stringify({
    s: req.storeId, t: req.tableId, i: compactItems, c: req.customerName,
  })

  const metadata: Record<string, string> = {
    storeId: req.storeId,
    tableId: req.tableId,
    type: 'pay-first',
    ...(session ? { sessionId: session.id } : {}),
  }
  if (cartData.length <= 500) {
    metadata.cartData = cartData
  } else {
    for (let idx = 0; idx * 500 < cartData.length; idx++) {
      metadata[`cart_${idx}`] = cartData.slice(idx * 500, (idx + 1) * 500)
    }
    metadata.cartChunks = String(Math.ceil(cartData.length / 500))
  }

  const paymentIntent = await getStripe().paymentIntents.create({
    amount: chargeAmount, currency: 'usd', metadata,
  })

  logger.info(
    { storeId: req.storeId, paymentIntentId: paymentIntent.id, chargeAmount, sessionId: session?.id },
    'payment intent created (pay-first, no order yet)',
  )

  return { clientSecret: paymentIntent.client_secret, amount: chargeAmount }
}

// ===== Pay-later: pay for existing session =====

interface SessionCheckoutRequest {
  storeId: string
  sessionId: string
  amount: number
  paidBy?: string
  tipAmount?: number
  settlementType?: 'by-item' | 'by-percent'
  itemKeys?: string[]
  percent?: number
}

export async function createPaymentIntentForSession(req: SessionCheckoutRequest) {
  const session = sessionStore.getById(req.sessionId)
  if (!session || session.storeId !== req.storeId) {
    return { error: 'Session not found', status: 404 }
  }
  if (session.status === 'closed') {
    return { error: 'Session is already closed', status: 400 }
  }

  const netDue = session.totalAmount - session.discountAmount
  const tax = calcTax(req.storeId, netDue)
  const fee = calcServiceFee(req.storeId, netDue)
  const totalWithTax = netDue + tax + fee
  const remaining = totalWithTax - session.totalPaid
  const tip = req.tipAmount && req.tipAmount > 0 ? req.tipAmount : 0
  const chargeAmount = Math.min(req.amount, remaining) + tip

  if (chargeAmount <= 0) {
    return { error: 'Nothing to pay', status: 400 }
  }

  // Cap: max(100.00, totalWithTax × 2) — prevent unreasonable charges
  const maxAllowed = Math.max(10000, totalWithTax * 2)
  if (chargeAmount > maxAllowed) {
    return { error: `Amount exceeds maximum allowed (${(maxAllowed / 100).toFixed(2)})`, status: 400 }
  }

  const paymentIntent = await getStripe().paymentIntents.create({
    amount: chargeAmount,
    currency: 'usd',
    metadata: {
      storeId: req.storeId,
      sessionId: req.sessionId,
      type: 'session-payment',
      paidBy: req.paidBy ?? '',
      ...(req.settlementType ? { settlementType: req.settlementType } : {}),
      ...(req.itemKeys ? { itemKeys: JSON.stringify(req.itemKeys) } : {}),
      ...(req.percent ? { percent: String(req.percent) } : {}),
      ...(tip > 0 ? { tipAmount: String(tip) } : {}),
    },
  })

  logger.info(
    { storeId: req.storeId, sessionId: req.sessionId, chargeAmount, paidBy: req.paidBy },
    'payment intent created for session',
  )

  return { clientSecret: paymentIntent.client_secret, amount: chargeAmount }
}

// ===== Stripe Webhook =====

export async function handleWebhookEvent(
  payload: Buffer,
  signature: string,
): Promise<string> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured')
  }

  const event = getStripe().webhooks.constructEvent(payload, signature, webhookSecret)

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object
    const { storeId, sessionId, type: paymentType, paidBy } = pi.metadata

    // --- Session payment (pay-later or split) ---
    if (paymentType === 'session-payment' && sessionId) {
      const tipAmt = pi.metadata.tipAmount ? parseInt(pi.metadata.tipAmount, 10) : 0
      const result = addPayment(storeId, sessionId, pi.amount, paidBy || 'customer', pi.id, tipAmt)
      if ('error' in result) {
        logger.error({ error: result.error, paymentIntentId: pi.id }, 'webhook: failed to record session payment')
        // Full refund if session was already fully paid
        try {
          await getStripe().refunds.create({ payment_intent: pi.id })
          logger.info({ paymentIntentId: pi.id, amount: pi.amount }, 'auto-refunded: session already fully paid')
        } catch (refundErr) {
          logger.error({ paymentIntentId: pi.id, error: refundErr }, 'failed to auto-refund')
        }
      } else {
        // Apply settlement side effects ONLY after payment confirmed
        const { settlementType } = pi.metadata
        if (settlementType === 'by-item' && pi.metadata.itemKeys) {
          confirmItemPayment(sessionId, JSON.parse(pi.metadata.itemKeys))
          emit({ type: 'session:summary', storeId, sessionId })
          emit({ type: 'store:orders', storeId })
        } else if (settlementType === 'by-percent') {
          confirmPercentPayment(sessionId)
          emit({ type: 'session:summary', storeId, sessionId })
          emit({ type: 'store:orders', storeId })
        } else {
          emit({ type: 'session:summary', storeId, sessionId })
          emit({ type: 'store:orders', storeId })
          emit({ type: 'store:tables', storeId })
        }
        // Tag as stripe payment method
        if (result.payment) {
          paymentStore.update(result.payment.id, { method: 'stripe' })
        }
        // Partial refund if payment was capped (overpayment scenario)
        if (result.payment && (result.payment as any).refundAmount > 0) {
          const refundAmt = (result.payment as any).refundAmount
          try {
            await getStripe().refunds.create({ payment_intent: pi.id, amount: refundAmt })
            logger.info({ paymentIntentId: pi.id, refundAmount: refundAmt }, 'partial refund: payment exceeded remaining')
          } catch (refundErr) {
            logger.error({ paymentIntentId: pi.id, refundAmount: refundAmt, error: refundErr }, 'failed to partial refund')
          }
        }
        // Auto-delete conflicting unpaid splits after customer payment
        const invalidated = invalidateConflictingSplits(sessionId, storeId)
        logger.info(
          { storeId, sessionId, amount: pi.amount, settlementType, paymentIntentId: pi.id, invalidatedSplits: invalidated },
          'session payment recorded via webhook',
        )
      }
      return event.type
    }

    // --- Pay-first: create order from cart metadata ---
    let cartDataRaw = pi.metadata.cartData
    if (!cartDataRaw && pi.metadata.cartChunks) {
      const chunks = parseInt(pi.metadata.cartChunks)
      cartDataRaw = ''
      for (let i = 0; i < chunks; i++) cartDataRaw += pi.metadata[`cart_${i}`] ?? ''
    }

    if (!cartDataRaw || !storeId) {
      logger.warn({ paymentIntentId: pi.id }, 'webhook: missing cart metadata')
      return event.type
    }

    // Parse compact format
    const raw = JSON.parse(cartDataRaw)
    const cart: { storeId: string; tableId: string; items: CreateOrderRequest['items']; customerName?: string } =
      raw.s ? {
        storeId: raw.s, tableId: raw.t, customerName: raw.c,
        items: (raw.i as { m: string; q: number; r?: string; o?: { oi: string; ci: string; p: number }[] }[]).map(ci => ({
          menuItemId: ci.m, quantity: ci.q, remark: ci.r,
          selectedOptions: ci.o?.map(o => ({ optionId: o.oi, choiceId: o.ci, priceAdjust: o.p, optionName: '', choiceName: '' })),
        })),
      } : raw

    // Create order (isPaid: true for pay-first)
    const result = createOrder(cart.storeId, {
      tableId: cart.tableId, items: cart.items, customerName: cart.customerName,
    })

    if ('error' in result) {
      logger.error({ error: result.error, paymentIntentId: pi.id }, 'webhook: failed to create order')
      return event.type
    }

    // Mark order as paid (pay-first specific)
    orderStore.update(result.id, { isPaid: true, updatedAt: new Date().toISOString() })

    // Record payment on session
    const sid = sessionId || result.sessionId
    if (sid) {
      const payFirstTip = pi.metadata.tipAmount ? parseInt(pi.metadata.tipAmount, 10) : 0
      addPayment(storeId, sid, pi.amount, cart.customerName || 'customer', pi.id, payFirstTip)
    }

    if (sid) {
      emit({ type: 'session:summary', storeId, sessionId: sid })
    }
    emit({ type: 'store:orders', storeId })
    emit({ type: 'store:tables', storeId })

    logger.info(
      { orderId: result.id, orderNumber: result.orderNumber, storeId, sessionId: sid, paymentIntentId: pi.id },
      'order created (paid) via webhook',
    )
  }

  return event.type
}

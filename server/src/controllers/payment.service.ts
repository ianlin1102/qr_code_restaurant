import { getStripe } from '../lib/stripe.js'
import { createOrder, orderStore } from './order.service.js'
import logger from '../lib/logger.js'
import type { CreateOrderRequest, Order } from '@qr-order/shared'

interface CheckoutRequest {
  storeId: string
  tableId: string
  items: CreateOrderRequest['items']
  customerName?: string
  tipAmount?: number
}

interface CheckoutOrdersRequest {
  storeId: string
  orderIds: string[]
  tipAmount?: number
}

export async function createPaymentIntent(req: CheckoutRequest) {
  // Calculate total from menu items (validate server-side)
  const { getMenuItemById } = await import('./menu.service.js')

  let totalPrice = 0
  for (const item of req.items) {
    const menuItem = getMenuItemById(item.menuItemId)
    if (!menuItem || menuItem.storeId !== req.storeId || !menuItem.available) {
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

  // Store cart data in metadata — Stripe limits each value to 500 chars
  // Compact format: only IDs + quantities, strip option names
  const compactItems = req.items.map(i => ({
    m: i.menuItemId,
    q: i.quantity,
    r: i.remark,
    o: i.selectedOptions?.map(o => ({ oi: o.optionId, ci: o.choiceId, p: o.priceAdjust })),
  }))
  const cartData = JSON.stringify({
    s: req.storeId,
    t: req.tableId,
    i: compactItems,
    c: req.customerName,
  })

  // If still too long, split across multiple metadata keys
  const metadata: Record<string, string> = {
    storeId: req.storeId,
    tableId: req.tableId,
  }
  if (cartData.length <= 500) {
    metadata.cartData = cartData
  } else {
    // Split into chunks of 500 chars
    for (let idx = 0; idx * 500 < cartData.length; idx++) {
      metadata[`cart_${idx}`] = cartData.slice(idx * 500, (idx + 1) * 500)
    }
    metadata.cartChunks = String(Math.ceil(cartData.length / 500))
  }

  const paymentIntent = await getStripe().paymentIntents.create({
    amount: totalPrice,
    currency: 'usd',
    metadata,
  })

  logger.info(
    { storeId: req.storeId, paymentIntentId: paymentIntent.id, totalPrice },
    'payment intent created (no order yet)',
  )

  return { clientSecret: paymentIntent.client_secret, amount: totalPrice }
}

export async function createPaymentIntentForOrders(req: CheckoutOrdersRequest) {
  if (!req.orderIds || req.orderIds.length === 0) {
    return { error: 'orderIds are required', status: 400 }
  }

  const orders = req.orderIds.map(id => orderStore.getById(id)).filter(Boolean) as Order[]

  if (orders.length !== req.orderIds.length) {
    return { error: 'One or more orders not found', status: 404 }
  }

  for (const order of orders) {
    if (order.storeId !== req.storeId) {
      return { error: 'Order does not belong to this store', status: 403 }
    }
    if (order.isPaid) {
      return { error: `Order ${order.orderNumber} is already paid`, status: 400 }
    }
    if (order.status === 'completed' || order.status === 'closed') {
      return { error: `Order ${order.orderNumber} is ${order.status}`, status: 400 }
    }
  }

  let totalPrice = orders.reduce((sum, o) => sum + o.totalPrice, 0)
  const tip = req.tipAmount && req.tipAmount > 0 ? req.tipAmount : 0
  totalPrice += tip

  if (totalPrice <= 0) {
    return { error: 'Invalid order total', status: 400 }
  }

  const paymentIntent = await getStripe().paymentIntents.create({
    amount: totalPrice,
    currency: 'usd',
    metadata: {
      storeId: req.storeId,
      type: 'pay-existing-orders',
      orderIds: JSON.stringify(req.orderIds),
    },
  })

  logger.info(
    { storeId: req.storeId, paymentIntentId: paymentIntent.id, orderIds: req.orderIds, totalPrice },
    'payment intent created for existing unpaid orders',
  )

  return { clientSecret: paymentIntent.client_secret, amount: totalPrice }
}

export async function createSplitPaymentIntent(
  amount: number,
  storeId: string,
  orderId: string,
  personName: string,
): Promise<{ clientSecret: string }> {
  if (amount <= 0) throw new Error('Split amount must be positive')

  const paymentIntent = await getStripe().paymentIntents.create({
    amount,
    currency: 'usd',
    metadata: {
      storeId,
      orderId,
      splitPerson: personName,
      type: 'split-bill',
    },
  })

  logger.info(
    { storeId, orderId, personName, amount, paymentIntentId: paymentIntent.id },
    'split payment intent created',
  )

  return { clientSecret: paymentIntent.client_secret! }
}

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
    const paymentIntent = event.data.object
    const { storeId, type: paymentType } = paymentIntent.metadata

    // Handle payment for existing unpaid orders
    if (paymentType === 'pay-existing-orders') {
      const orderIds = JSON.parse(paymentIntent.metadata.orderIds ?? '[]') as string[]
      const now = new Date().toISOString()
      for (const oid of orderIds) {
        orderStore.update(oid, {
          isPaid: true,
          paymentIntentId: paymentIntent.id,
          updatedAt: now,
        })
      }
      logger.info(
        { storeId, orderIds, paymentIntentId: paymentIntent.id },
        'existing orders marked as paid via webhook',
      )
      return event.type
    }

    // Handle new order creation from cart checkout
    // Reassemble cartData (may be chunked if > 500 chars)
    let cartDataRaw = paymentIntent.metadata.cartData
    if (!cartDataRaw && paymentIntent.metadata.cartChunks) {
      const chunks = parseInt(paymentIntent.metadata.cartChunks)
      cartDataRaw = ''
      for (let i = 0; i < chunks; i++) cartDataRaw += paymentIntent.metadata[`cart_${i}`] ?? ''
    }

    if (!cartDataRaw || !storeId) {
      logger.warn({ paymentIntentId: paymentIntent.id }, 'webhook: missing cart metadata')
      return event.type
    }

    // Parse compact format: { s, t, i: [{ m, q, r, o: [{ oi, ci, p }] }], c }
    const raw = JSON.parse(cartDataRaw)
    const cart: { storeId: string; tableId: string; items: CreateOrderRequest['items']; customerName?: string } =
      raw.s ? {
        storeId: raw.s,
        tableId: raw.t,
        customerName: raw.c,
        items: (raw.i as { m: string; q: number; r?: string; o?: { oi: string; ci: string; p: number }[] }[]).map(ci => ({
          menuItemId: ci.m,
          quantity: ci.q,
          remark: ci.r,
          selectedOptions: ci.o?.map(o => ({ optionId: o.oi, choiceId: o.ci, priceAdjust: o.p, optionName: '', choiceName: '' })),
        })),
      } : raw

    // Create the order for the first time — status will be overridden to 'paid'
    const result = createOrder(cart.storeId, {
      tableId: cart.tableId,
      items: cart.items,
      customerName: cart.customerName,
    })

    if ('error' in result) {
      logger.error({ error: result.error, paymentIntentId: paymentIntent.id }, 'webhook: failed to create order')
      return event.type
    }

    // Mark as paid, keep status 'pending' so admin sees it in queue
    orderStore.update(result.id, {
      isPaid: true,
      paymentIntentId: paymentIntent.id,
      updatedAt: new Date().toISOString(),
    })

    logger.info(
      { orderId: result.id, orderNumber: result.orderNumber, storeId, paymentIntentId: paymentIntent.id },
      'order created (paid) via webhook',
    )
  }

  return event.type
}

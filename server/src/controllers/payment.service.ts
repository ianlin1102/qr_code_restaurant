import { getStripe } from '../lib/stripe.js'
import { createOrder } from './order.service.js'
import logger from '../lib/logger.js'
import type { CreateOrderRequest } from '@qr-order/shared'

interface CheckoutRequest {
  storeId: string
  tableId: string
  items: CreateOrderRequest['items']
  customerName?: string
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

  if (totalPrice <= 0) {
    return { error: 'Invalid order total', status: 400 }
  }

  // Store cart data in metadata (Stripe allows up to 500 chars per value)
  const cartData = JSON.stringify({
    storeId: req.storeId,
    tableId: req.tableId,
    items: req.items,
    customerName: req.customerName,
  })

  const paymentIntent = await getStripe().paymentIntents.create({
    amount: totalPrice,
    currency: 'usd',
    metadata: {
      storeId: req.storeId,
      tableId: req.tableId,
      cartData,
    },
  })

  logger.info(
    { storeId: req.storeId, paymentIntentId: paymentIntent.id, totalPrice },
    'payment intent created (no order yet)',
  )

  return { clientSecret: paymentIntent.client_secret, amount: totalPrice }
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
    const { storeId, cartData } = paymentIntent.metadata

    if (!cartData || !storeId) {
      logger.warn({ paymentIntentId: paymentIntent.id }, 'webhook: missing cart metadata')
      return event.type
    }

    const cart = JSON.parse(cartData) as {
      storeId: string
      tableId: string
      items: CreateOrderRequest['items']
      customerName?: string
    }

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

    // Override status to 'paid' and attach paymentIntentId
    const { orderStore } = await import('./order.service.js')
    orderStore.update(result.id, {
      status: 'paid',
      paymentIntentId: paymentIntent.id,
      updatedAt: new Date().toISOString(),
    })

    logger.info(
      { orderId: result.id, orderNumber: result.orderNumber, storeId, paymentIntentId: paymentIntent.id },
      'order created as paid via webhook',
    )
  }

  return event.type
}

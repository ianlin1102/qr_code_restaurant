import { stripe } from '../lib/stripe.js'
import { orderStore } from './order.service.js'
import logger from '../lib/logger.js'

export async function createCheckoutSession(storeId: string, orderId: string) {
  const order = orderStore.getById(orderId)
  if (!order) {
    return { error: 'Order not found', status: 404 }
  }
  if (order.storeId !== storeId) {
    return { error: 'Order not found', status: 404 }
  }
  if (order.status !== 'pending') {
    return { error: 'Order is not in pending status', status: 400 }
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: order.totalPrice,
    currency: 'usd',
    metadata: { orderId, storeId },
  })

  orderStore.update(orderId, { paymentIntentId: paymentIntent.id })

  logger.info(
    { storeId, orderId, paymentIntentId: paymentIntent.id },
    'payment intent created',
  )

  return { clientSecret: paymentIntent.client_secret, amount: order.totalPrice }
}

export async function handleWebhookEvent(
  payload: Buffer,
  signature: string,
): Promise<string> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured')
  }

  const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret)

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object
    const { orderId, storeId } = paymentIntent.metadata

    if (orderId) {
      const order = orderStore.getById(orderId)
      if (order && order.storeId === storeId) {
        orderStore.update(orderId, {
          status: 'paid',
          updatedAt: new Date().toISOString(),
        })
        logger.info({ orderId, storeId }, 'order marked as paid via webhook')
      }
    }
  }

  return event.type
}

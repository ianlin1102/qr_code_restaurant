import { orderStore } from './order.service.js'
import { createSplitPaymentIntent } from './payment.service.js'
import logger from '../lib/logger.js'
import type { SplitBillRequest, SplitBillSession, SplitBillShare } from '@qr-order/shared'

function buildEqualShares(
  totalPrice: number,
  numberOfPeople: number,
): SplitBillShare[] {
  const baseAmount = Math.floor(totalPrice / numberOfPeople)
  const remainder = totalPrice - baseAmount * numberOfPeople

  return Array.from({ length: numberOfPeople }, (_, i) => ({
    personName: `Person ${i + 1}`,
    items: [],
    // Distribute remainder cents to the first shares (1 cent each)
    amount: baseAmount + (i < remainder ? 1 : 0),
  }))
}

function validateByItemShares(
  shares: SplitBillShare[],
  totalPrice: number,
): string | null {
  if (shares.length < 2) {
    return 'At least 2 shares are required'
  }
  const sharesTotal = shares.reduce((sum, s) => sum + s.amount, 0)
  if (sharesTotal !== totalPrice) {
    return `Shares total (${sharesTotal}) does not match order total (${totalPrice})`
  }
  for (const share of shares) {
    if (share.amount <= 0) return `Share for ${share.personName} must be > 0`
  }
  return null
}

export async function createSplitBill(
  storeId: string,
  req: SplitBillRequest,
): Promise<SplitBillSession | { error: string }> {
  const order = orderStore.getById(req.orderId)
  if (!order || order.storeId !== storeId) {
    return { error: 'Order not found' }
  }
  if (order.isPaid) {
    return { error: 'Order is already paid' }
  }

  let shares: SplitBillShare[]

  if (req.mode === 'equal') {
    if (!req.numberOfPeople || req.numberOfPeople < 2) {
      return { error: 'numberOfPeople must be at least 2' }
    }
    shares = buildEqualShares(order.totalPrice, req.numberOfPeople)
  } else {
    if (!req.shares || req.shares.length === 0) {
      return { error: 'shares are required for by-item mode' }
    }
    const validationError = validateByItemShares(req.shares, order.totalPrice)
    if (validationError) return { error: validationError }
    shares = req.shares
  }

  // Create a Stripe PaymentIntent for each share
  const settledShares = await Promise.all(
    shares.map(async (share) => {
      const result = await createSplitPaymentIntent(
        share.amount,
        storeId,
        req.orderId,
        share.personName,
      )
      return {
        ...share,
        clientSecret: result.clientSecret,
        paid: false,
      }
    }),
  )

  logger.info(
    { storeId, orderId: req.orderId, mode: req.mode, shareCount: settledShares.length },
    'split bill session created',
  )

  return {
    orderId: req.orderId,
    shares: settledShares,
    totalAmount: order.totalPrice,
  }
}

import { paymentStore, orderStore, sessionStore, storeStore } from '../repositories/stores.js'
import { calcTax as sharedCalcTax, calcServiceFee as sharedCalcServiceFee, orderItemsTotal } from '@qr-order/shared/pricing'

/**
 * SSOT: derive session's coupon discount from (couponDiscountType, value, totalAmount).
 * Percentage coupons scale with totalAmount; fixed are capped at totalAmount.
 */
export function deriveSessionDiscount(sessionId: string): number {
  const session = sessionStore.getById(sessionId)
  if (!session || !session.couponDiscountType) return 0
  const totalAmount = deriveSessionTotalAmount(sessionId)
  const value = session.couponDiscountValue ?? 0
  if (session.couponDiscountType === 'percentage') {
    return Math.round(totalAmount * value / 100)
  }
  if (session.couponDiscountType === 'fixed') {
    return Math.min(value, totalAmount)
  }
  return 0
}

/**
 * SSOT: derive session's totalAmount from its orders (Σ non-voided items).
 * Also adopts any orphan orders belonging to the session's table.
 */
export function deriveSessionTotalAmount(sessionId: string): number {
  const session = sessionStore.getById(sessionId)
  if (!session) return 0
  const orders = session.orderIds
    .map(id => orderStore.getById(id))
    .filter((o): o is NonNullable<typeof o> => !!o)
  return orders.reduce((sum, o) => sum + orderItemsTotal(o.items), 0)
}

/**
 * SSOT: derive session's paid state from Payment records.
 * This is the single computed source for totalPaid and paidItemIds — never
 * read session.totalPaid / session.paidItemIds directly from callers that
 * need the current truth.
 *
 * totalPaid excludes tip (per project convention).
 * paidItemIds is the concatenation of all payments' itemKeys.
 */
export function derivePaidState(sessionId: string): {
  totalPaid: number
  paidItemIds: string[]
} {
  const payments = paymentStore.getByField('sessionId', sessionId)
  let totalPaid = 0
  const paidItemIds: string[] = []
  for (const p of payments) {
    totalPaid += p.amount - (p.tipAmount ?? 0)
    if (p.itemKeys?.length) paidItemIds.push(...p.itemKeys)
  }
  return { totalPaid, paidItemIds }
}

/**
 * Build a Set of paid item base keys (format "orderId:idx") from payment records.
 * Used to skip items that have already been attributed to prior payments.
 */
function buildPaidKeySet(sessionId: string, excludePaymentId?: string): Set<string> {
  const payments = paymentStore.getByField('sessionId', sessionId)
  const set = new Set<string>()
  for (const p of payments) {
    if (excludePaymentId && p.id === excludePaymentId) continue
    for (const k of p.itemKeys ?? []) {
      const parts = k.split(':')
      set.add(`${parts[0]}:${parts[1]}`)
    }
  }
  return set
}

/**
 * FIFO item attribution for a single payment.
 * Given the food amount (excluding tip) this payment covers, walk the session's
 * orders oldest-first and return the itemKeys it should be attributed to.
 *
 * Per-payment budgeting (not cumulative): this answers "which items does THIS
 * payment cover?" — correct by construction, independent of prior payment state
 * beyond skipping already-paid items.
 */
export function deriveFifoItemKeys(
  sessionId: string,
  storeId: string,
  foodAmount: number,
  excludePaymentId?: string,
): string[] {
  if (foodAmount <= 0) return []

  const session = sessionStore.getById(sessionId)
  if (!session) return []

  const store = storeStore.getById(storeId)
  const taxRate = store?.taxRate ?? 0
  const feeRate = store?.serviceFeeRate ?? 0

  const orders = session.orderIds.map(id => orderStore.getById(id)).filter(Boolean)
  const paidBaseKeys = buildPaidKeySet(sessionId, excludePaymentId)

  const attributed: string[] = []
  let budget = foodAmount

  for (const order of orders) {
    if (!order) continue
    for (let idx = 0; idx < order.items.length; idx++) {
      const item = order.items[idx]
      if (item.voided) continue
      const baseKey = `${order.id}:${idx}`
      if (paidBaseKeys.has(baseKey)) continue

      const optAdj = (item.selectedOptions ?? []).reduce((s: number, o: { priceAdjust?: number }) => s + (o.priceAdjust ?? 0), 0)
      const itemSubtotal = (item.price + optAdj) * item.quantity
      const itemTax = sharedCalcTax(itemSubtotal, taxRate)
      const itemFee = sharedCalcServiceFee(itemSubtotal, feeRate)
      const itemWithTax = itemSubtotal + itemTax + itemFee

      if (budget >= itemWithTax) {
        budget -= itemWithTax
        attributed.push(`${baseKey}:${item.quantity}`)
      }
    }
  }

  return attributed
}

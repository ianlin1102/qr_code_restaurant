import type { PricingItem } from './types'

/** Base price + all option adjustments (cents) */
export function unitPrice(item: PricingItem): number {
  const adjust = (item.options ?? []).reduce((sum, o) => sum + o.priceAdjust, 0)
  return item.price + adjust
}

/** Unit price * quantity (cents) */
export function lineTotal(item: PricingItem): number {
  return unitPrice(item) * item.quantity
}

/** Sum of all line totals (cents) */
export function subtotal(items: PricingItem[]): number {
  return items.reduce((sum, item) => sum + lineTotal(item), 0)
}

/**
 * Order-specific total: sum of non-voided items with options.
 * Structural type so this works for both OrderItem and CartItem shapes.
 * SSOT for Order.totalPrice — all write paths use this to avoid drift.
 */
export function orderItemsTotal(items: Array<{
  price: number
  quantity: number
  voided?: boolean
  selectedOptions?: Array<{ priceAdjust: number }>
}>): number {
  return items.reduce((sum, it) => {
    if (it.voided) return sum
    const optAdj = (it.selectedOptions ?? []).reduce((s, o) => s + o.priceAdjust, 0)
    return sum + (it.price + optAdj) * it.quantity
  }, 0)
}

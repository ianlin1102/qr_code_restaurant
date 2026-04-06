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

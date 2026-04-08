/**
 * Client-side pricing helpers.
 * Bridges business objects (OrderItem, CartItem) to shared/pricing pure functions.
 * All components should use these instead of inline reduce calculations.
 */
import { unitPrice as calcUnitPrice, lineTotal as calcLineTotal } from '@qr-order/shared/pricing'

/** Any item with price, quantity, and optional selectedOptions */
interface ItemLike {
  price: number
  quantity: number
  selectedOptions?: { priceAdjust?: number }[]
}

function toPricingItem(item: ItemLike) {
  return {
    price: item.price ?? 0,
    quantity: item.quantity ?? 1,
    options: item.selectedOptions?.map(o => ({ priceAdjust: o.priceAdjust ?? 0 })),
  }
}

/** Base price + option adjustments (cents). NaN-safe. */
export function itemUnitPrice(item: ItemLike): number {
  return calcUnitPrice(toPricingItem(item))
}

/** Unit price * quantity (cents). NaN-safe. */
export function itemLineTotal(item: ItemLike): number {
  return calcLineTotal(toPricingItem(item))
}

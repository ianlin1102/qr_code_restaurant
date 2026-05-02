import { useCartStore } from '@/stores/cart-store'
import { usePaymentStore } from '@/stores/payment-store'

export type FloatingButtonVariant =
  | 'goto-cart'
  | 'add-more'
  | 'settle'
  | 'empty-clean'

export interface FloatingButtonState {
  variant: FloatingButtonVariant
  cartCount: number
  remaining: number
}

export function useFloatingButtonState(): FloatingButtonState {
  const cartCount = useCartStore(s => s.totalItems())
  const summary = usePaymentStore(s => s.summary)

  const hasActiveSession = !!summary && summary.status !== 'closed'
  const remaining = hasActiveSession ? (summary?.remaining ?? 0) : 0
  const hasUnpaid = remaining > 0

  let variant: FloatingButtonVariant
  if (cartCount > 0) {
    variant = hasUnpaid ? 'add-more' : 'goto-cart'
  } else {
    variant = hasUnpaid ? 'settle' : 'empty-clean'
  }

  return { variant, cartCount, remaining }
}

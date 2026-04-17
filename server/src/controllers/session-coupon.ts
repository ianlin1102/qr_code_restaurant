import { sessionStore } from '../repositories/stores.js'
import type { Session, DiscountType } from '@qr-order/shared'
import { emit } from '../lib/event-bus.js'

// ===== Coupon =====

export function applyCoupon(
  storeId: string, sessionId: string,
  couponId: string, couponCode: string,
  discountType: DiscountType, discountValue: number,
): Session | { error: string } {
  const session = sessionStore.getById(sessionId)
  if (!session || session.storeId !== storeId) return { error: 'Session not found' }
  if (session.status === 'closed') return { error: 'Session is closed' }
  if (session.couponId) return { error: 'Coupon already applied' }

  const updated = sessionStore.update(sessionId, {
    couponId, couponCode, couponDiscountType: discountType,
    couponDiscountValue: discountValue,
  })!
  emit({ type: 'session:summary', storeId, sessionId })
  return updated
}

export function removeCoupon(
  storeId: string, sessionId: string,
): Session | { error: string } {
  const session = sessionStore.getById(sessionId)
  if (!session || session.storeId !== storeId) return { error: 'Session not found' }
  const updated = sessionStore.update(sessionId, {
    couponId: undefined, couponCode: undefined,
    couponDiscountType: undefined, couponDiscountValue: undefined,
  })!
  emit({ type: 'session:summary', storeId, sessionId })
  return updated
}

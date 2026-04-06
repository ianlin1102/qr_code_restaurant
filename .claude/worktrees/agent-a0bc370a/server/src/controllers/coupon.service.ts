import { v4 as uuid } from 'uuid'
import { JsonStore } from '../repositories/json-store.js'
import type { Coupon } from '@qr-order/shared'

const couponStore = new JsonStore<Coupon>('coupons.json')

export function getCoupons(storeId: string): Coupon[] {
  return couponStore.getByField('storeId', storeId)
}

export function createCoupon(
  storeId: string,
  data: Omit<Coupon, 'id' | 'storeId' | 'currentUses' | 'createdAt'>
): Coupon {
  const coupon: Coupon = {
    id: uuid(),
    storeId,
    code: data.code,
    discountType: data.discountType,
    discountValue: data.discountValue,
    minOrderAmount: data.minOrderAmount,
    maxUses: data.maxUses,
    currentUses: 0,
    active: data.active,
    expiresAt: data.expiresAt,
    createdAt: new Date().toISOString(),
  }
  return couponStore.create(coupon)
}

export function updateCoupon(
  storeId: string,
  couponId: string,
  updates: Partial<Coupon>
): Coupon | { error: string } {
  const existing = couponStore.getById(couponId)
  if (!existing || existing.storeId !== storeId) {
    return { error: 'Coupon not found' }
  }
  const updated = couponStore.update(couponId, updates)
  if (!updated) return { error: 'Failed to update coupon' }
  return updated
}

export function deleteCoupon(
  storeId: string,
  couponId: string
): boolean | { error: string } {
  const existing = couponStore.getById(couponId)
  if (!existing || existing.storeId !== storeId) {
    return { error: 'Coupon not found' }
  }
  return couponStore.delete(couponId)
}

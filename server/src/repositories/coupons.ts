/**
 * Coupon entity repository.
 *
 * Single-step CRUD — no multi-step tx required. All mutation methods use
 * atomic Prisma operations (update with increment for counter bumps).
 *
 * Scope:
 *   - Store-scoped coupons (no global/platform coupons)
 *   - findActiveByCode is the checkout-time lookup (active + non-expired)
 *   - incrementUses is atomic ({ increment: 1 })
 *
 * NOT in scope:
 *   - Discount calculation / validation (min order, max uses) — service layer
 *   - Apply-to-session flow — sessions.ts applyCouponSnapshot
 */

import type { Coupon } from '@prisma/client'
import { prisma, type Db } from './prisma-client.js'

export const couponRepo = {
  findByStoreId: (storeId: string, db: Db = prisma): Promise<Coupon[]> =>
    db.coupon.findMany({
      where: { storeId },
      orderBy: { createdAt: 'desc' },
    }),

  findById: (id: string, db: Db = prisma): Promise<Coupon | null> =>
    db.coupon.findUnique({ where: { id } }),

  /**
   * Checkout-time lookup: active coupon matching code, not past expiry.
   * Returns null if no match (unknown code, inactive, or expired).
   */
  findActiveByCode: (
    storeId: string,
    code: string,
    db: Db = prisma
  ): Promise<Coupon | null> =>
    db.coupon.findFirst({
      where: {
        storeId,
        code,
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    }),

  create: (
    data: {
      storeId: string
      code: string
      discountType: string
      discountValue: number
      minOrderAmount?: number | null
      maxUses?: number | null
      isActive?: boolean
      expiresAt?: Date | null
    },
    db: Db
  ): Promise<Coupon> =>
    db.coupon.create({
      data: {
        storeId: data.storeId,
        code: data.code,
        discountType: data.discountType,
        discountValue: data.discountValue,
        minOrderAmount: data.minOrderAmount ?? null,
        maxUses: data.maxUses ?? null,
        currentUses: 0,
        isActive: data.isActive ?? true,
        expiresAt: data.expiresAt ?? null,
      },
    }),

  update: (
    id: string,
    patch: {
      code?: string
      discountType?: string
      discountValue?: number
      minOrderAmount?: number | null
      maxUses?: number | null
      isActive?: boolean
      expiresAt?: Date | null
    },
    db: Db
  ): Promise<Coupon> =>
    db.coupon.update({ where: { id }, data: patch }),

  delete: (id: string, db: Db): Promise<Coupon> =>
    db.coupon.delete({ where: { id } }),

  /**
   * Atomic bump. Used by session.applyCoupon flow after server-side validation
   * (max uses check, etc.) — repo itself doesn't enforce limits.
   */
  incrementUses: (id: string, db: Db): Promise<Coupon> =>
    db.coupon.update({
      where: { id },
      data: { currentUses: { increment: 1 } },
    }),
}

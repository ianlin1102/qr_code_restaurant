/**
 * Payment entity repository (D56 FK model).
 *
 * PaymentItem is the normalized replacement for legacy Payment.itemKeys
 * string array — each row is (paymentId, orderItemId FK, paidQuantity).
 * Never emits or accepts the legacy "orderId:idx:qty" string here — that's
 * the API boundary's concern (see server/src/lib/legacy-itemkey.ts, Phase G task).
 *
 * derivePaidQuantityByOrderItem replaces legacy derivePaidState.paidItemIds
 * with a Map<orderItemId, qty> aggregate — used by settlement to skip
 * already-paid items during FIFO / split creation.
 */

import { Prisma } from '@prisma/client'
import type { Payment, PaymentItem } from '@prisma/client'
import { prisma, type Db } from './prisma-client.js'

type PaymentWithItems = Payment & { items: PaymentItem[] }

export const paymentRepo = {
  findById: (id: string, db: Db = prisma): Promise<PaymentWithItems | null> =>
    db.payment.findUnique({
      where: { id },
      include: { items: true },
    }) as Promise<PaymentWithItems | null>,

  findBySessionId: (sessionId: string, db: Db = prisma): Promise<PaymentWithItems[]> =>
    db.payment.findMany({
      where: { sessionId },
      include: { items: true },
      orderBy: { createdAt: 'asc' },
    }) as Promise<PaymentWithItems[]>,

  findByStripeId: (
    stripePaymentIntentId: string,
    db: Db = prisma
  ): Promise<PaymentWithItems | null> =>
    db.payment.findFirst({
      where: { stripePaymentIntentId },
      include: { items: true },
    }) as Promise<PaymentWithItems | null>,

  /**
   * Atomic: create Payment + its PaymentItem[] in one tx.
   * Multi-step (insert Payment, then N inserts for items) — TransactionClient required.
   * Single-step Prisma nested create would work too, but we use explicit two-phase
   * to match Task 17 replaceDraftItems style + allow future per-item validation.
   */
  create: async (
    input: {
      storeId: string
      sessionId: string
      method: string            // 'stripe' | 'cash'
      amount: number            // cents, excludes tip
      tipAmount?: number
      taxAmount?: number
      stripePaymentIntentId?: string
      status: 'pending' | 'confirmed' | 'refunded'
      items: { orderItemId: string; paidQuantity: number }[]
    },
    tx: Prisma.TransactionClient
  ): Promise<PaymentWithItems> => {
    const payment = await tx.payment.create({
      data: {
        storeId: input.storeId,
        sessionId: input.sessionId,
        method: input.method,
        amount: input.amount,
        tipAmount: input.tipAmount ?? 0,
        taxAmount: input.taxAmount ?? 0,
        stripePaymentIntentId: input.stripePaymentIntentId ?? null,
        status: input.status,
        items: {
          create: input.items.map(i => ({
            storeId: input.storeId,
            orderItemId: i.orderItemId,
            paidQuantity: i.paidQuantity,
          })),
        },
      },
      include: { items: true },
    })
    return payment as PaymentWithItems
  },

  /**
   * Webhook handler: mark a pending Payment as confirmed.
   * Idempotent — if already confirmed, returns existing row.
   * Throws if Payment with given stripe ID doesn't exist.
   */
  confirmStripe: async (
    stripePaymentIntentId: string,
    tx: Prisma.TransactionClient
  ): Promise<PaymentWithItems> => {
    const existing = await tx.payment.findFirst({
      where: { stripePaymentIntentId },
      include: { items: true },
    })
    if (!existing) throw new Error(`No Payment with stripe id ${stripePaymentIntentId}`)
    if (existing.status === 'confirmed') return existing as PaymentWithItems

    const confirmed = await tx.payment.update({
      where: { id: existing.id },
      data: { status: 'confirmed' },
      include: { items: true },
    })
    return confirmed as PaymentWithItems
  },

  /**
   * Sum of confirmed payment amounts (excludes tip, per project convention).
   */
  sumConfirmed: async (sessionId: string, db: Db = prisma): Promise<number> => {
    const agg = await db.payment.aggregate({
      where: { sessionId, status: 'confirmed' },
      _sum: { amount: true },
    })
    return agg._sum.amount ?? 0
  },

  /**
   * D56 core: paid quantity aggregation keyed by orderItemId.
   * Only counts items from CONFIRMED payments.
   *
   * Used by settlement gateway to:
   *   - skip already-paid items in FIFO attribution
   *   - validate split requests don't overlap paid quantity
   *   - compute "remaining" for by-item mode
   *
   * Returns Map<orderItemId, totalPaidQty>.
   */
  derivePaidQuantityByOrderItem: async (
    sessionId: string,
    db: Db = prisma
  ): Promise<Map<string, number>> => {
    const rows = await db.paymentItem.findMany({
      where: {
        payment: { sessionId, status: 'confirmed' },
      },
      select: { orderItemId: true, paidQuantity: true },
    })
    const map = new Map<string, number>()
    for (const r of rows) {
      map.set(r.orderItemId, (map.get(r.orderItemId) ?? 0) + r.paidQuantity)
    }
    return map
  },
}

export type { PaymentWithItems }

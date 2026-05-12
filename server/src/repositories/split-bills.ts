/**
 * SplitBill entity repository (D56 FK model).
 *
 * SplitBillItem is (splitBillId, orderItemId FK, quantity) — the D56
 * replacement for legacy itemKey string encoding.
 *
 * Conflict detection (for settlement gateway's createSplit):
 *   available(orderItemId) = orderItem.quantity
 *                          - derivePaidQuantityByOrderItem(orderItemId)
 *                          - sumAssignedQuantityByOrderItem(orderItemId)
 *   requested ≤ available → accept; otherwise reject
 *
 * Invalidation (physical delete via `delete`): when a payment lands that
 * overlaps an active split's items, the settlement gateway calls delete(id)
 * on conflicting splits. Historical splits aren't preserved — the payment
 * itself is the historical record of what was paid.
 */

import { Prisma } from '@prisma/client'
import type { SplitBill, SplitBillItem } from '@prisma/client'
import { prisma, type Db } from './prisma-client.js'

type SplitBillWithItems = SplitBill & { items: SplitBillItem[] }

export const splitBillRepo = {
  findById: (id: string, db: Db = prisma): Promise<SplitBillWithItems | null> =>
    db.splitBill.findUnique({
      where: { id },
      include: { items: true },
    }) as Promise<SplitBillWithItems | null>,

  findActive: (sessionId: string, db: Db = prisma): Promise<SplitBillWithItems[]> =>
    db.splitBill.findMany({
      where: { sessionId, status: 'active' },
      include: { items: true },
      orderBy: { createdAt: 'asc' },
    }) as Promise<SplitBillWithItems[]>,

  /**
   * Create SplitBill + items (by-item only; by-percent passes empty items[]).
   * Multi-step — TransactionClient required (D55).
   * Caller (settlement gateway) is responsible for pre-validating conflicts
   * via derivePaidQuantityByOrderItem + sumAssignedQuantityByOrderItem.
   */
  create: async (
    input: {
      storeId: string
      sessionId: string
      type: 'by-item' | 'by-percent'
      percent?: number
      subtotal: number
      tax: number
      tip?: number
      amount: number
      items: { orderItemId: string; quantity: number }[]
    },
    tx: Prisma.TransactionClient
  ): Promise<SplitBillWithItems> => {
    const created = await tx.splitBill.create({
      data: {
        storeId: input.storeId,
        sessionId: input.sessionId,
        type: input.type,
        percent: input.percent ?? null,
        subtotal: input.subtotal,
        tax: input.tax,
        tip: input.tip ?? 0,
        amount: input.amount,
        status: 'active',
        items: {
          create: input.items.map(i => ({
            storeId: input.storeId,
            orderItemId: i.orderItemId,
            quantity: i.quantity,
          })),
        },
      },
      include: { items: true },
    })
    return created as SplitBillWithItems
  },

  markPaid: (id: string, tx: Prisma.TransactionClient): Promise<SplitBill> =>
    tx.splitBill.update({ where: { id }, data: { status: 'paid' } }),

  /**
   * Physical delete. Matches legacy deleteSplitBill semantics — cancelled
   * splits leave no DB trace (payment rows carry audit instead).
   * Cascade deletes SplitBillItem via FK.
   */
  delete: (id: string, db: Db): Promise<SplitBill> =>
    db.splitBill.delete({ where: { id } }),

  /**
   * Sum of quantity assigned to ACTIVE splits, keyed by orderItemId.
   * Used by settlement gateway to check "how much of each orderItem is
   * already reserved by other active splits?" before accepting a new split.
   *
   * Returns Map<orderItemId, totalAssignedQty>.
   */
  sumAssignedQuantityByOrderItem: async (
    sessionId: string,
    db: Db = prisma
  ): Promise<Map<string, number>> => {
    const rows = await db.splitBillItem.findMany({
      where: {
        splitBill: { sessionId, status: 'active' },
      },
      select: { orderItemId: true, quantity: true },
    })
    const map = new Map<string, number>()
    for (const r of rows) {
      map.set(r.orderItemId, (map.get(r.orderItemId) ?? 0) + r.quantity)
    }
    return map
  },
}

export type { SplitBillWithItems }

/**
 * Session entity repository.
 *
 * Session is THE source of truth for table occupancy + settlement mode +
 * coupon snapshot. Has 1:N with orders (drafts + submitted) and payments.
 *
 * Coupon snapshot (D13-adjacent): flattened onto Session row at apply time
 * (coupon_code / coupon_type / coupon_value / coupon_applied_at) — not a
 * JSONB blob, not a FK. Keeps historical record of "what coupon was applied
 * to this session" even if the Coupon row later changes.
 *
 * Multi-step methods (createForTable/close/reopen) touch both sessions and
 * tables.current_session_id — tx mandatory per D55.
 */

import { Prisma } from '@prisma/client'
import type { Session, SessionStatus } from '@prisma/client'
import { prisma, type Db } from './prisma-client.js'

export const sessionRepo = {
  findById: (id: string, db: Db = prisma): Promise<Session | null> =>
    db.session.findUnique({ where: { id } }),

  /**
   * Find the currently-open session for a table. At most one row expected
   * (business invariant — enforced by application logic, not DB constraint).
   */
  findActiveByTable: (tableId: string, db: Db = prisma): Promise<Session | null> =>
    db.session.findFirst({ where: { tableId, status: 'open' } }),

  listByStore: (db: Db = prisma): Promise<Session[]> =>
    db.session.findMany({ orderBy: { createdAt: 'desc' } }),

  /**
   * Atomic: create session + set table.current_session_id.
   * Caller should first verify no existing open session for the table
   * (findActiveByTable) — otherwise two open sessions collide at application level.
   */
  createForTable: async (
    input: { storeId: string; tableId: string },
    tx: Prisma.TransactionClient
  ): Promise<Session> => {
    const session = await tx.session.create({
      data: {
        storeId: input.storeId,
        tableId: input.tableId,
        status: 'open',
        settlementMode: 'unset',
      },
    })
    await tx.table.update({
      where: { id: input.tableId },
      data: { currentSessionId: session.id },
    })
    return session
  },

  /**
   * Close: status='closed', closedAt=now, table.current_session_id=null.
   * Does NOT verify "fully paid" — that's service-layer concern (settlement gateway).
   */
  closeSession: async (id: string, tx: Prisma.TransactionClient): Promise<Session> => {
    const closed = await tx.session.update({
      where: { id },
      data: { status: 'closed', closedAt: new Date() },
    })
    await tx.table.update({
      where: { id: closed.tableId },
      data: { currentSessionId: null },
    })
    return closed
  },

  reopenSession: async (id: string, tx: Prisma.TransactionClient): Promise<Session> => {
    const reopened = await tx.session.update({
      where: { id },
      data: { status: 'open', closedAt: null },
    })
    await tx.table.update({
      where: { id: reopened.tableId },
      data: { currentSessionId: reopened.id },
    })
    return reopened
  },

  /**
   * Single-step: flatten coupon fields onto session row.
   * Snapshot semantics — if the referenced Coupon later changes, session keeps
   * the original values (couponType / couponValue frozen at apply time).
   */
  applyCouponSnapshot: (
    id: string,
    snapshot: {
      couponCode: string
      couponType: string
      couponValue: number
    },
    db: Db
  ): Promise<Session> =>
    db.session.update({
      where: { id },
      data: {
        couponCode: snapshot.couponCode,
        couponType: snapshot.couponType,
        couponValue: snapshot.couponValue,
        couponAppliedAt: new Date(),
      },
    }),

  updateSettlementMode: (
    id: string,
    mode: 'unset' | 'by-item' | 'by-percent',
    db: Db
  ): Promise<Session> =>
    db.session.update({ where: { id }, data: { settlementMode: mode } }),
}

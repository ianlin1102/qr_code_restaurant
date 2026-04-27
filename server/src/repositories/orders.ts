/**
 * Order entity repository — B2 core.
 *
 * B2 design (cart = orders WHERE status='draft'):
 *   - findSubmitted (default-exclude-draft) is the 95% use case for
 *     kitchen/settlement/summary/analytics
 *   - findDraft (explicit) is the 5% use case — only cart endpoints
 *   - Type discriminants at function boundaries reject draft at compile time
 *
 * Optimistic locking (D30):
 *   - version column bumped on every draft mutation
 *   - submitDraft + replaceDraftItems take expectedVersion
 *   - WHERE version=? AND status='draft' — affected_rows=0 → throw
 *     OPTIMISTIC_LOCK_CONFLICT (Phase G route layer maps to HTTP 409)
 *
 * Position contract (D57):
 *   - OrderItem.position is 0-indexed; @@unique(orderId, position)
 *   - createDraftOrder and replaceDraftItems both assign position from
 *     items[] array index (0..N-1)
 *   - items always loaded via orderBy: { position: 'asc' }
 *
 * No itemKey column (D56):
 *   - legacy `"orderId:idx:qty"` string never persisted on OrderItem
 *   - PaymentItem / SplitBillItem reference order items by FK + quantity
 *   - API boundary still emits/accepts legacy string via server/src/lib/legacy-itemkey.ts
 *
 * Partial unique constraint (schema-level):
 *   UNIQUE (session_id, device_id) WHERE status='draft'
 *   — enforces "one draft per device per session"
 */

import { Prisma } from '@prisma/client'
import type { Order, OrderItem, OrderItemOption } from '@prisma/client'
import { prisma, type Db } from './prisma-client.js'

type OrderWithItems = Order & {
  items: (OrderItem & { options: OrderItemOption[] })[]
}

// Narrow OrderWithItems to draft/submitted based on status at the type level.
type DraftOrderWithItems = OrderWithItems & { status: 'draft' }
type SubmittedOrderWithItems = OrderWithItems & {
  status: Exclude<Order['status'], 'draft'>
}

const includeItemsAndOptions = {
  items: {
    include: { options: true },
    orderBy: { position: 'asc' },
  },
} as const satisfies Prisma.OrderInclude

/**
 * Draft item input — used by createDraftOrder and replaceDraftItems.
 * position is NOT part of this — repo fills it from array index (D57).
 * itemKey is NOT part of this — legacy UUID design was spec error (D56).
 */
type DraftItemInput = {
  menuItemId: string
  name: string
  unitPrice: number
  quantity: number
  note?: string
  options: {
    groupName: string
    name: string
    priceAdjust: number
  }[]
}

// ========== Reads ==========

export const orderRepo = {
  findById: (id: string, db: Db = prisma): Promise<OrderWithItems | null> =>
    db.order.findUnique({
      where: { id },
      include: includeItemsAndOptions,
    }) as Promise<OrderWithItems | null>,

  /**
   * All orders attached to a session — EXCLUDES draft (use findDraft for cart).
   */
  findBySessionId: (
    sessionId: string,
    db: Db = prisma
  ): Promise<SubmittedOrderWithItems[]> =>
    db.order.findMany({
      where: { sessionId, status: { not: 'draft' } },
      include: includeItemsAndOptions,
      orderBy: { createdAt: 'asc' },
    }) as Promise<SubmittedOrderWithItems[]>,

  /**
   * DEFAULT-EXCLUDES draft — caller cannot accidentally include drafts.
   */
  findSubmitted: (
    where: Prisma.OrderWhereInput = {},
    db: Db = prisma
  ): Promise<SubmittedOrderWithItems[]> =>
    db.order.findMany({
      where: { ...where, status: { not: 'draft' } },
      include: includeItemsAndOptions,
      orderBy: { createdAt: 'desc' },
    }) as Promise<SubmittedOrderWithItems[]>,

  findActive: (
    storeId: string,
    db: Db = prisma
  ): Promise<SubmittedOrderWithItems[]> =>
    db.order.findMany({
      where: {
        storeId,
        status: { in: ['pending', 'preparing'] },
      },
      include: includeItemsAndOptions,
      orderBy: { createdAt: 'asc' },
    }) as Promise<SubmittedOrderWithItems[]>,

  /**
   * Partial unique index ensures at most one draft per (sessionId, deviceId).
   */
  findDraft: (
    sessionId: string,
    deviceId: string,
    db: Db = prisma
  ): Promise<DraftOrderWithItems | null> =>
    db.order.findFirst({
      where: { sessionId, deviceId, status: 'draft' },
      include: includeItemsAndOptions,
    }) as Promise<DraftOrderWithItems | null>,

  // ========== Writes ==========

  /**
   * Single-step atomic nested create (rule D55 exempt — one SQL round-trip).
   *
   * PRECONDITION: caller must verify no existing draft for (sessionId, deviceId)
   * via findDraft first. Partial unique index rejects duplicates with P2002.
   *
   * Typical controller flow:
   *   const existing = await orderRepo.findDraft(sessionId, deviceId, tx)
   *   if (existing)
   *     return orderRepo.replaceDraftItems(existing.id, newItems, existing.version, tx)
   *   return orderRepo.createDraftOrder({...}, tx)
   *
   * position is assigned from items[] array index (0, 1, 2, ...) — D57.
   */
  createDraftOrder: async (
    input: {
      storeId: string
      sessionId: string
      tableId: string
      tableName: string         // D68 Order snapshot — caller (Phase G route 层) 先 tableRepo.findById(tableId) 拿 name 后传入
      tableNameEn?: string      // D68 bilingual snapshot (optional)
      deviceId: string
      items: DraftItemInput[]
    },
    db: Db
  ): Promise<DraftOrderWithItems> => {
    const result = await db.order.create({
      data: {
        store: { connect: { id: input.storeId } },
        session: { connect: { id: input.sessionId } },
        table: { connect: { id: input.tableId } },
        tableName: input.tableName,                     // D68 Order snapshot — frozen at order time
        tableNameEn: input.tableNameEn ?? null,         // D68 bilingual snapshot
        deviceId: input.deviceId,
        status: 'draft',
        version: 0,
        lastCartActivityAt: new Date(),
        items: {
          create: input.items.map((i, idx) => ({
            storeId: input.storeId,                     // RLS denormalized raw column
            menuItemId: i.menuItemId,                   // raw FK (NO menuItem @relation per schema)
            position: idx,                              // D57: repo fills from array index
            name: i.name,
            unitPrice: i.unitPrice,
            quantity: i.quantity,
            note: i.note ?? null,
            options: {
              create: i.options.map(o => ({
                storeId: input.storeId,                 // RLS denormalized raw column
                groupName: o.groupName,
                name: o.name,
                priceAdjust: o.priceAdjust,
              })),
            },
          })),
        },
      },
      include: includeItemsAndOptions,
    })
    return result as DraftOrderWithItems
  },

  /**
   * Whole-array replacement — matches legacy updateDeviceCart semantics.
   *
   * Rationale (D56): cart-add/remove identity on server side was position+qty,
   * never a stable key. Frontend computes full CartItem[] for the device and
   * sends it; server wipes and re-inserts. No itemKey merge logic needed.
   *
   * Multi-step write (D55): tx MUST be a TransactionClient, not PrismaClient.
   * Optimistic lock spans version check + delete + insert — all one tx.
   *
   * Position reassigned 0..N-1 from items[] array order.
   */
  replaceDraftItems: async (
    orderId: string,
    items: DraftItemInput[],
    expectedVersion: number,
    tx: Prisma.TransactionClient
  ): Promise<DraftOrderWithItems> => {
    const bumped = await tx.order.updateMany({
      where: { id: orderId, version: expectedVersion, status: 'draft' },
      data: { version: { increment: 1 }, lastCartActivityAt: new Date() },
    })
    if (bumped.count === 0) {
      const err = new Error('Draft order version mismatch or order not in draft status')
      ;(err as any).code = 'OPTIMISTIC_LOCK_CONFLICT'
      throw err
    }

    // Wipe existing items (cascade deletes options via FK).
    await tx.orderItem.deleteMany({ where: { orderId } })

    // Need storeId to populate redundant store_id columns.
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: { storeId: true },
    })
    if (!order) throw new Error(`Order ${orderId} vanished mid-replace`)

    // Insert new set with position 0..N-1.
    // Sequential inserts (N round-trips) rather than createMany —
    // createMany doesn't support nested options.create. For typical
    // cart sizes (≤15 items), the overhead is acceptable.
    for (let idx = 0; idx < items.length; idx++) {
      const i = items[idx]
      await tx.orderItem.create({
        data: {
          storeId: order.storeId,                       // RLS denormalized raw column
          order: { connect: { id: orderId } },
          menuItemId: i.menuItemId,                     // raw FK (NO menuItem @relation per schema)
          position: idx,
          name: i.name,
          unitPrice: i.unitPrice,
          quantity: i.quantity,
          note: i.note ?? null,
          options: {
            create: i.options.map(o => ({
              storeId: order.storeId,                   // RLS denormalized raw column
              groupName: o.groupName,
              name: o.name,
              priceAdjust: o.priceAdjust,
            })),
          },
        },
      })
    }

    const updated = await tx.order.findUnique({
      where: { id: orderId },
      include: includeItemsAndOptions,
    })
    return updated as DraftOrderWithItems
  },

  /**
   * Promote draft → pending (order submit).
   * Optimistic lock: WHERE version=? AND status='draft'.
   *
   * Multi-step (version check + status flip + read) — tx MUST be TransactionClient (D55).
   *
   * This is THE B2 transition point. After this:
   *   - partial unique (session, device, status='draft') releases, allowing
   *     a new draft for subsequent cart-add
   *   - kitchen/KDS queries (findActive) start seeing this order
   *   - settlement queries (findSubmitted) include this order
   *   - SSE 'order:created' should fire from the controller AFTER tx commit (rule 2)
   */
  submitDraft: async (
    orderId: string,
    expectedVersion: number,
    tx: Prisma.TransactionClient
  ): Promise<SubmittedOrderWithItems> => {
    const bumped = await tx.order.updateMany({
      where: { id: orderId, version: expectedVersion, status: 'draft' },
      data: { version: { increment: 1 }, status: 'pending' },
    })
    if (bumped.count === 0) {
      const err = new Error('Draft order version mismatch or already submitted')
      ;(err as any).code = 'OPTIMISTIC_LOCK_CONFLICT'
      throw err
    }
    const submitted = await tx.order.findUnique({
      where: { id: orderId },
      include: includeItemsAndOptions,
    })
    return submitted as SubmittedOrderWithItems
  },

  /**
   * Advance a submitted order's status (pending → preparing → served).
   *
   * INTENTIONAL: no version check, last-write-wins.
   * Rationale: kitchen/KDS flow is physically mutex (one staff terminal /
   * single KDS display). Concurrent status flips on the same submitted order
   * do not happen in practice — draft was the real concurrency hotspot and
   * is already guarded by version lock.
   *
   * Status 'draft' is rejected at type level — drafts transition via submitDraft only.
   * Single-step write — `db: Db` OK (D55 exempt).
   */
  updateStatus: (
    id: string,
    status: Exclude<Order['status'], 'draft'>,
    db: Db
  ): Promise<Order> =>
    db.order.update({ where: { id }, data: { status } }),

  /**
   * Void a submitted order (admin action).
   *
   * State guard: only `pending` or `preparing` are voidable.
   *   - served orders require `refundOrder` (not yet implemented — touches Payment)
   *   - already-voided orders throw to surface bugs/double-click
   *
   * Single-step (updateMany + guard check is one tx round-trip counted as one step).
   */
  voidOrder: async (id: string, db: Db): Promise<Order> => {
    const result = await db.order.updateMany({
      where: { id, status: { in: ['pending', 'preparing'] } },
      data: { status: 'voided' },
    })
    if (result.count === 0) {
      throw new Error(`Cannot void order ${id}: not in voidable state (pending/preparing)`)
    }
    const voided = await db.order.findUnique({ where: { id } })
    if (!voided) throw new Error(`Order ${id} vanished after void`)
    return voided
  },
}

export type { OrderWithItems, DraftOrderWithItems, SubmittedOrderWithItems, DraftItemInput }

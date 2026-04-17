import { v4 as uuid } from 'uuid'
import { sessionStore, orderStore, tableStore } from '../repositories/stores.js'
import type { Session } from '@qr-order/shared'
import logger from '../lib/logger.js'

// ===== Session CRUD =====

export function createSession(storeId: string, tableId: string): Session {
  const session: Session = {
    id: uuid(), storeId, tableId, status: 'active',
    orderIds: [], createdAt: new Date().toISOString(),
  }
  sessionStore.create(session)
  tableStore.update(tableId, { currentSessionId: session.id })
  return session
}

export function getActiveSession(storeId: string, tableId: string): Session | undefined {
  return sessionStore.getByField('storeId', storeId)
    .find(s => s.tableId === tableId && s.status === 'active')
}

export function getSessionById(id: string): Session | undefined {
  return sessionStore.getById(id)
}

export function addOrderToSession(
  sessionId: string, orderId: string, _orderTotal: number,
): Session | { error: string } {
  const session = sessionStore.getById(sessionId)
  if (!session) return { error: 'Session not found' }
  if (session.status === 'closed') return { error: 'Session is closed' }

  // totalAmount and discountAmount are both derived on read.
  return sessionStore.update(sessionId, {
    orderIds: [...session.orderIds, orderId],
  })!
}

// ===== Close / Reopen =====

/** @internal Called by settlement gateway. */
export function closeSession(
  storeId: string, sessionId: string,
): Session | { error: string } {
  const session = sessionStore.getById(sessionId)
  if (!session || session.storeId !== storeId) return { error: 'Session not found' }
  if (session.status === 'closed') return { error: 'Already closed' }

  const updated = sessionStore.update(sessionId, {
    status: 'closed', closedAt: new Date().toISOString(),
  })!
  tableStore.update(session.tableId, {
    status: 'idle', currentSessionId: undefined,
  })
  logger.info({ sessionId, storeId }, 'session closed')
  return updated
}

/** @internal Called by settlement gateway. */
export function reopenSession(
  storeId: string, sessionId: string,
): Session | { error: string } {
  const session = sessionStore.getById(sessionId)
  if (!session || session.storeId !== storeId) return { error: 'Session not found' }
  if (session.status === 'active') return { error: 'Already active' }

  const updated = sessionStore.update(sessionId, {
    status: 'active', closedAt: undefined,
  })!
  tableStore.update(session.tableId, {
    status: 'occupied', currentSessionId: sessionId,
  })
  logger.info({ sessionId, storeId }, 'session reopened')
  return updated
}

/** Link orders that belong to this table but have no sessionId */
export function adoptOrphanedOrders(session: Session): void {
  const tableOrders = orderStore.getByField('tableId', session.tableId)
  const orphans = tableOrders.filter(o =>
    o.storeId === session.storeId && !o.sessionId &&
    o.status !== 'closed',
  )
  if (orphans.length === 0) return

  const newOrderIds = [...session.orderIds]
  for (const o of orphans) {
    orderStore.update(o.id, { sessionId: session.id })
    if (!newOrderIds.includes(o.id)) newOrderIds.push(o.id)
  }
  sessionStore.update(session.id, { orderIds: newOrderIds })
  logger.info(
    { sessionId: session.id, adopted: orphans.length },
    'adopted orphaned orders into session',
  )
}

/** Kept for API compat; totalAmount and discountAmount are derived on read. */
export function recalcSessionTotal(_sessionId: string): void {
  // No-op after SSOT migration. Callers can simply drop this call.
}

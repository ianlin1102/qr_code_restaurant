import { sessionStore, orderStore, paymentStore, storeStore } from '../repositories/stores.js'
import { closeSession, calcTax, calcServiceFee } from '../controllers/session.service.js'
import { derivePaidState, deriveSessionTotalAmount, deriveSessionDiscount } from '../lib/session-state.js'
import logger from '../lib/logger.js'

const STALE_SESSION_CHECK_MS = 5 * 60 * 1000   // check every 5 minutes
const STALE_SESSION_TIMEOUT_MS = 15 * 60 * 1000 // 15 minutes after last order

/**
 * Safety net: close sessions that are fully paid but were never explicitly closed.
 * Runs on a timer to catch edge cases (webhook arrived but auto-close didn't trigger).
 */
export function autoCloseStaleSessionsOnce(): number {
  const allSessions = sessionStore.getByField('status', 'active')
  const now = Date.now()
  let closed = 0

  for (const session of allSessions) {
    const store = storeStore.getById(session.storeId)
    if (!store) continue

    const netDue = deriveSessionTotalAmount(session.id) - deriveSessionDiscount(session.id)
    const tax = calcTax(session.storeId, netDue)
    const fee = calcServiceFee(session.storeId, netDue)
    const totalWithTax = netDue + tax + fee

    const { totalPaid } = derivePaidState(session.id)
    if (totalPaid < totalWithTax) continue // not fully paid

    // Find most recent order activity
    const orders = session.orderIds.map(id => orderStore.getById(id)).filter(Boolean)
    const latestOrder = orders.reduce((latest, o) => {
      const t = new Date(o!.createdAt).getTime()
      return t > latest ? t : latest
    }, 0)
    const latestPayment = paymentStore.getByField('sessionId', session.id)
      .reduce((latest, p) => {
        const t = new Date(p.createdAt).getTime()
        return t > latest ? t : latest
      }, 0)
    const lastActivity = Math.max(latestOrder, latestPayment, new Date(session.createdAt).getTime())

    if (now - lastActivity >= STALE_SESSION_TIMEOUT_MS) {
      closeSession(session.storeId, session.id)
      logger.info({ sessionId: session.id, storeId: session.storeId, idleMinutes: Math.round((now - lastActivity) / 60000) },
        'auto-closed stale paid session (safety net)')
      closed++
    }
  }
  return closed
}

/** Start the safety net timer. Call once at server startup. */
export function startAutoCloseTimer(): void {
  setInterval(autoCloseStaleSessionsOnce, STALE_SESSION_CHECK_MS)
  logger.info('session safety net started: checking for stale paid sessions every 5 minutes')
}

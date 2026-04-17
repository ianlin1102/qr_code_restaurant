import { sessionStore, tableStore, storeStore } from '../repositories/stores.js'
import type { CartItem } from '@qr-order/shared'
import logger from '../lib/logger.js'
import { emit } from '../lib/event-bus.js'

// ===== Shared Cart (per-device storage, syncs across devices for same table) =====

export function getSessionCart(sessionId: string): CartItem[] {
  const session = sessionStore.getById(sessionId)
  if (!session || !session.pendingCart) return []
  const cart = session.pendingCart
  // Legacy migration: old format was CartItem[], new is Record<string, CartItem[]>
  if (Array.isArray(cart)) return cart as unknown as CartItem[]
  return Object.values(cart).flat()
}

export function updateDeviceCart(sessionId: string, deviceId: string, items: CartItem[]): void {
  const session = sessionStore.getById(sessionId)
  if (!session || session.status === 'closed') return
  const raw = session.pendingCart
  const cart: Record<string, CartItem[]> = (raw && !Array.isArray(raw)) ? { ...raw } : {}
  if (items.length === 0) {
    delete cart[deviceId]
  } else {
    cart[deviceId] = items
  }
  sessionStore.update(sessionId, { pendingCart: cart })
  emit({ type: 'cart:updated', storeId: session!.storeId, sessionId })
}

export function clearSessionCart(sessionId: string): void {
  const session = sessionStore.getById(sessionId)
  if (!session) return
  sessionStore.update(sessionId, { pendingCart: {} })
}

/**
 * Atomically submit the entire shared cart as an order.
 * Uses cartVersion for optimistic locking to prevent duplicate submissions.
 */
export function submitSessionCart(
  storeId: string, sessionId: string, expectedVersion: number,
): { items: CartItem[]; paymentMode: 'pay-first' | 'pay-later'; tableId: string } | { error: string; status?: number } {
  const session = sessionStore.getById(sessionId)
  if (!session || session.storeId !== storeId) return { error: 'Session not found', status: 404 }
  if (session.status === 'closed') return { error: 'Session is closed', status: 400 }

  if ((session.cartVersion ?? 0) !== expectedVersion) {
    return { error: 'Cart already submitted', status: 409 }
  }

  const cart = session.pendingCart ?? {}
  const allItems = Array.isArray(cart) ? cart as unknown as CartItem[] : Object.values(cart).flat()
  if (allItems.length === 0) return { error: 'Cart is empty', status: 400 }

  const table = tableStore.getById(session.tableId)
  const store = storeStore.getById(storeId)
  const paymentMode = (table?.paymentMode ?? store?.paymentMode ?? 'pay-first') as 'pay-first' | 'pay-later'

  sessionStore.update(sessionId, {
    pendingCart: {},
    cartVersion: (session.cartVersion ?? 0) + 1,
    lastCartSubmitAt: new Date().toISOString(),
  })

  logger.info({ sessionId, storeId, itemCount: allItems.length, paymentMode }, 'session cart submitted')
  emit({ type: 'cart:submitted', storeId, sessionId })
  emit({ type: 'session:summary', storeId, sessionId })
  return { items: allItems, paymentMode, tableId: session.tableId }
}

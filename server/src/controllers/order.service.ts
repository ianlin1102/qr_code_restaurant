import { v4 as uuid } from 'uuid'
import { getMenuItemById } from './menu.service.js'
import { printOrder } from './printer.service.js'
import { createSession, getActiveSession, addOrderToSession, recalcSessionTotal } from './session.service.js'
import type { Order, OrderItem, CreateOrderRequest, OrderStatus } from '@qr-order/shared'
import logger from '../lib/logger.js'
import { orderStore, tableStore, storeStore, sessionStore } from '../repositories/stores.js'

const storeCounters = new Map<string, number>()

function getStoreCounter(storeId: string): number {
  if (!storeCounters.has(storeId)) {
    const count = orderStore.getByField('storeId', storeId).length
    storeCounters.set(storeId, count)
  }
  return storeCounters.get(storeId)!
}

function generateOrderNumber(storeId: string): string {
  const count = getStoreCounter(storeId) + 1
  storeCounters.set(storeId, count)
  const letter = String.fromCharCode(65 + Math.floor((count - 1) / 999) % 26)
  const num = ((count - 1) % 999) + 1
  return `${letter}${String(num).padStart(3, '0')}`
}

export function createOrder(storeId: string, req: CreateOrderRequest): Order | { error: string } {
  const table = tableStore.getById(req.tableId)
  if (!table || table.storeId !== storeId) {
    return { error: 'Table not found' }
  }

  if (!req.items || req.items.length === 0) {
    return { error: 'Order must have at least one item' }
  }

  // Rate limit for pay-later mode: max 10 orders per table per hour
  const storeConfig = storeStore.getById(storeId)
  const isPayLater = (table.paymentMode ?? storeConfig?.paymentMode ?? 'pay-first') === 'pay-later'
  if (isPayLater) {
    const oneHourAgo = new Date(Date.now() - 3600_000).toISOString()
    const recentOrders = orderStore.getByField('storeId', storeId)
      .filter(o => o.tableId === table.id && o.createdAt > oneHourAgo)
    if (recentOrders.length >= 10) {
      return { error: 'Too many orders for this table. Please ask staff for help.' }
    }
  }

  const orderItems = []
  let totalPrice = 0

  for (const item of req.items) {
    const menuItem = getMenuItemById(storeId, item.menuItemId)
    if (!menuItem || !menuItem.available) {
      return { error: `Menu item ${item.menuItemId} not available` }
    }
    if (item.quantity < 1) {
      return { error: 'Quantity must be at least 1' }
    }
    // Calculate price with option adjustments
    const optionsAdjust = (item.selectedOptions ?? []).reduce((sum, o) => sum + o.priceAdjust, 0)
    const unitPrice = menuItem.price + optionsAdjust
    const lineTotal = unitPrice * item.quantity
    totalPrice += lineTotal
    // Enrich selectedOptions with English names from menu item definitions
    const enrichedOptions = (item.selectedOptions ?? []).map(so => {
      const optDef = menuItem.options?.find(o => o.id === so.optionId)
      const choiceDef = optDef?.choices.find(c => c.id === so.choiceId)
      return {
        ...so,
        optionName: so.optionName || optDef?.name || '',
        choiceName: so.choiceName || choiceDef?.name || '',
        optionNameEn: optDef?.nameEn ?? so.optionName,
        choiceNameEn: choiceDef?.nameEn ?? so.choiceName,
      }
    })
    orderItems.push({
      menuItemId: menuItem.id,
      name: menuItem.name,
      nameEn: menuItem.nameEn,
      price: menuItem.price,
      quantity: item.quantity,
      remark: item.remark,
      selectedOptions: enrichedOptions.length > 0 ? enrichedOptions : undefined,
    })
  }

  const initialStatus = storeConfig?.autoAcceptOrders ? 'preparing' : 'pending'

  // Session integration — create or get active session
  let session = getActiveSession(storeId, table.id)
  if (!session) {
    session = createSession(storeId, table.id)
  }

  const now = new Date().toISOString()
  const order: Order = {
    id: uuid(),
    orderNumber: generateOrderNumber(storeId),
    storeId,
    tableId: table.id,
    sessionId: session.id,
    tableName: table.name,
    items: orderItems,
    totalPrice,
    status: initialStatus,
    isPaid: false,
    customerName: req.customerName,
    createdAt: now,
    updatedAt: now,
  }

  orderStore.create(order)
  tableStore.update(table.id, { status: 'occupied', currentSessionId: session.id })
  addOrderToSession(session.id, order.id, totalPrice)

  logger.info(
    { storeId, orderId: order.id, orderNumber: order.orderNumber, sessionId: session.id, itemCount: orderItems.length },
    'order created',
  )

  // Fire-and-forget print (don't block order creation)
  printOrder(order).catch(err => logger.error({ orderId: order.id, err }, 'print failed'))

  return order
}

export function getOrders(storeId: string, status?: OrderStatus, tableId?: string): Order[] {
  let orders = orderStore.getByField('storeId', storeId)
  if (status) {
    orders = orders.filter(o => o.status === status)
  }
  if (tableId) {
    orders = orders.filter(o => o.tableId === tableId)
  }
  return orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export function updateOrderStatus(storeId: string, orderId: string, status: OrderStatus): Order | { error: string } {
  const order = orderStore.getById(orderId)
  if (!order || order.storeId !== storeId) {
    return { error: 'Order not found' }
  }

  const updated = orderStore.update(orderId, {
    status,
    updatedAt: new Date().toISOString(),
  })

  // No auto-idle here; session close handles table release
  return updated!
}

export function transferOrder(storeId: string, orderId: string, targetTableId: string): Order | { error: string } {
  const order = orderStore.getById(orderId)
  if (!order || order.storeId !== storeId) {
    return { error: 'Order not found' }
  }
  if (order.status === 'served') {
    return { error: 'Cannot transfer a served order' }
  }

  const targetTable = tableStore.getById(targetTableId)
  if (!targetTable || targetTable.storeId !== storeId) {
    return { error: 'Target table not found' }
  }

  const sourceTableId = order.tableId

  // Update the order to point to the new table
  const updated = orderStore.update(orderId, {
    tableId: targetTable.id,
    tableName: targetTable.name,
    updatedAt: new Date().toISOString(),
  })!

  // Set target table to occupied
  tableStore.update(targetTableId, { status: 'occupied' })

  // If no other active orders remain on the source table, set it to idle
  const remainingActive = orderStore.getByField('storeId', storeId)
    .filter(o => o.tableId === sourceTableId && o.id !== orderId
      && o.status !== 'served')
  if (remainingActive.length === 0) {
    tableStore.update(sourceTableId, { status: 'idle', currentSessionId: undefined })
  }

  logger.info(
    { storeId, orderId, from: sourceTableId, to: targetTableId },
    'order transferred',
  )

  return updated
}

export function deleteOrder(storeId: string, orderId: string): { success: true } | { error: string } {
  const order = orderStore.getById(orderId)
  if (!order || order.storeId !== storeId) return { error: 'Order not found' }

  // Remove from session and recalculate totals
  if (order.sessionId) {
    const session = sessionStore.getById(order.sessionId)
    if (session) {
      const newOrderIds = session.orderIds.filter(id => id !== orderId)
      const newTotal = newOrderIds
        .map(id => orderStore.getById(id))
        .filter(Boolean)
        .reduce((sum, o) => sum + (o?.totalPrice ?? 0), 0)
      sessionStore.update(session.id, { orderIds: newOrderIds, totalAmount: newTotal })
    }
  }

  // If table has no more active orders, release it
  const remaining = orderStore.getByField('storeId', storeId)
    .filter(o => o.tableId === order.tableId && o.id !== orderId && o.status !== 'closed')
  if (remaining.length === 0) {
    tableStore.update(order.tableId, { status: 'idle', currentSessionId: undefined })
  }

  orderStore.delete(orderId)
  logger.info({ storeId, orderId, orderNumber: order.orderNumber }, 'order deleted')
  return { success: true }
}

export function voidItem(
  storeId: string,
  orderId: string,
  itemIndex: number,
  userId: string,
  reason?: string,
): Order | { error: string } {
  const order = orderStore.getById(orderId)
  if (!order || order.storeId !== storeId) return { error: 'Order not found' }
  if (itemIndex < 0 || itemIndex >= order.items.length) return { error: 'Item index out of range' }
  if (order.items[itemIndex].voided) return { error: 'Item already voided' }

  const items = [...order.items]
  items[itemIndex] = {
    ...items[itemIndex],
    voided: true,
    voidedAt: new Date().toISOString(),
    voidedBy: userId,
    ...(reason ? { voidReason: reason } : {}),
  }

  // Recalculate order total excluding voided items
  const totalPrice = items.reduce((sum, it) => {
    if (it.voided) return sum
    const optAdjust = (it.selectedOptions ?? []).reduce((s, o) => s + o.priceAdjust, 0)
    return sum + (it.price + optAdjust) * it.quantity
  }, 0)

  const updated = orderStore.update(orderId, { items, totalPrice, updatedAt: new Date().toISOString() })!

  if (order.sessionId) {
    recalcSessionTotal(order.sessionId)
  }

  logger.info({ storeId, orderId, itemIndex, userId, reason }, 'item voided')
  return updated
}

export async function updateOrderItems(storeId: string, orderId: string, items: OrderItem[]): Promise<Order | { error: string }> {
  const order = orderStore.getById(orderId)
  if (!order || order.storeId !== storeId) {
    return { error: 'Order not found' }
  }
  if (order.status === 'served') {
    return { error: 'Cannot modify a served order' }
  }
  if (!items || items.length === 0) {
    return { error: 'Order must have at least one item' }
  }

  // Enrich selectedOptions with English names from menu item definitions
  const enrichedItems = items.map(item => {
    const menuItem = getMenuItemById(storeId, item.menuItemId)
    if (menuItem && item.selectedOptions) {
      return {
        ...item,
        selectedOptions: item.selectedOptions.map(so => {
          const optDef = menuItem.options?.find(o => o.id === so.optionId)
          const choiceDef = optDef?.choices.find(c => c.id === so.choiceId)
          return {
            ...so,
            optionName: so.optionName || optDef?.name || '',
            choiceName: so.choiceName || choiceDef?.name || '',
            optionNameEn: optDef?.nameEn ?? so.optionName,
            choiceNameEn: choiceDef?.nameEn ?? so.choiceName,
          }
        }),
      }
    }
    return item
  })

  // Recalculate total
  const totalPrice = enrichedItems.reduce((sum, item) => {
    const optAdjust = (item.selectedOptions ?? []).reduce((s, o) => s + o.priceAdjust, 0)
    return sum + (item.price + optAdjust) * item.quantity
  }, 0)

  const updated = orderStore.update(orderId, {
    items: enrichedItems,
    totalPrice,
    updatedAt: new Date().toISOString(),
  })

  // Recalculate session totals if order belongs to an active session
  if (order.sessionId) {
    recalcSessionTotal(order.sessionId)
  } else {
    // Fallback: find session containing this order
    const sessions = sessionStore.getByField('storeId', storeId)
    const active = sessions.find(s => s.orderIds.includes(orderId) && s.status === 'active')
    if (active) recalcSessionTotal(active.id)
  }

  return updated!
}

import { v4 as uuid } from 'uuid'
import { getMenuItemById } from './menu.service.js'
import { printOrder } from './printer.service.js'
import { createBill, getActiveBill, addOrderToBill } from './bill.service.js'
import type { Order, OrderItem, Table, Store, CreateOrderRequest, OrderStatus } from '@qr-order/shared'
import logger from '../lib/logger.js'
import { orderStore, tableStore, storeStore, billStore } from '../repositories/stores.js'

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
    const menuItem = getMenuItemById(item.menuItemId)
    if (!menuItem || menuItem.storeId !== storeId || !menuItem.available) {
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

  const now = new Date().toISOString()
  const order: Order = {
    id: uuid(),
    orderNumber: generateOrderNumber(storeId),
    storeId,
    tableId: table.id,
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
  tableStore.update(table.id, { status: 'occupied', currentOrderId: order.id })

  // Bill integration — create or append to active bill
  let bill = getActiveBill(storeId, table.id)
  if (!bill) {
    const paymentMode = table.paymentMode ?? storeConfig?.paymentMode ?? 'pay-first'
    const billStatus = paymentMode === 'pay-later' ? 'open' : 'pending-payment'
    bill = createBill(storeId, table.id, billStatus)
    tableStore.update(table.id, { currentBillId: bill.id })
  }
  addOrderToBill(bill.id, order.id, totalPrice)

  logger.info(
    { storeId, orderId: order.id, orderNumber: order.orderNumber, itemCount: orderItems.length },
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

  // Auto-release table if all orders are completed/closed
  if (status === 'served' || status === 'closed') {
    const tableOrders = orderStore.getByField('storeId', storeId)
      .filter(o => o.tableId === order.tableId && o.status !== 'served' && o.status !== 'closed' && o.id !== orderId)
    if (tableOrders.length === 0) {
      tableStore.update(order.tableId, { status: 'idle', currentOrderId: undefined, currentBillId: undefined })
    }
  }

  return updated!
}

export function transferOrder(storeId: string, orderId: string, targetTableId: string): Order | { error: string } {
  const order = orderStore.getById(orderId)
  if (!order || order.storeId !== storeId) {
    return { error: 'Order not found' }
  }
  if (order.status === 'served' || order.status === 'closed') {
    return { error: 'Cannot transfer a completed or closed order' }
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
      && o.status !== 'served' && o.status !== 'closed')
  if (remainingActive.length === 0) {
    tableStore.update(sourceTableId, { status: 'idle', currentOrderId: undefined })
  }

  logger.info(
    { storeId, orderId, from: sourceTableId, to: targetTableId },
    'order transferred',
  )

  return updated
}

export async function updateOrderItems(storeId: string, orderId: string, items: OrderItem[]): Promise<Order | { error: string }> {
  const order = orderStore.getById(orderId)
  if (!order || order.storeId !== storeId) {
    return { error: 'Order not found' }
  }
  if (order.status === 'served' || order.status === 'closed') {
    return { error: 'Cannot modify a completed or closed order' }
  }
  if (!items || items.length === 0) {
    return { error: 'Order must have at least one item' }
  }

  // Enrich selectedOptions with English names from menu item definitions
  const enrichedItems = items.map(item => {
    const menuItem = getMenuItemById(item.menuItemId)
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

  // Recalculate bill subtotal if order belongs to an active bill
  const bills = billStore.getByField('storeId', storeId)
  const activeBill = bills.find(b => b.orderIds.includes(orderId) && b.status !== 'settled')
  if (activeBill) {
    const allOrders = activeBill.orderIds.map(id => orderStore.getById(id)).filter(Boolean)
    const newSubtotal = allOrders.reduce((sum, o) => sum + (o?.totalPrice ?? 0), 0)
    const discountAmount = activeBill.couponDiscountType === 'percentage'
      ? Math.round(newSubtotal * (activeBill.couponDiscountValue ?? 0) / 100)
      : activeBill.couponDiscountType === 'fixed'
      ? Math.min(activeBill.couponDiscountValue ?? 0, newSubtotal)
      : activeBill.discountAmount
    billStore.update(activeBill.id, {
      subtotal: newSubtotal,
      discountAmount,
      totalDue: newSubtotal - discountAmount,
      version: activeBill.version + 1,
    })
  }

  return updated!
}

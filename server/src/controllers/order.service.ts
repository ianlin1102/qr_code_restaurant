import { v4 as uuid } from 'uuid'
import { JsonStore } from '../repositories/json-store.js'
import { getMenuItemById } from './menu.service.js'
import type { Order, OrderItem, Table, CreateOrderRequest, OrderStatus } from '@qr-order/shared'
import logger from '../lib/logger.js'

export const orderStore = new JsonStore<Order>('orders.json')
const tableStore = new JsonStore<Table>('tables.json')

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
    orderItems.push({
      menuItemId: menuItem.id,
      name: menuItem.name,
      price: menuItem.price,
      quantity: item.quantity,
      remark: item.remark,
      selectedOptions: item.selectedOptions,
    })
  }

  const now = new Date().toISOString()
  const order: Order = {
    id: uuid(),
    orderNumber: generateOrderNumber(storeId),
    storeId,
    tableId: table.id,
    tableName: table.name,
    items: orderItems,
    totalPrice,
    status: 'pending',
    isPaid: false,
    customerName: req.customerName,
    createdAt: now,
    updatedAt: now,
  }

  orderStore.create(order)
  tableStore.update(table.id, { status: 'occupied', currentOrderId: order.id })

  logger.info(
    { storeId, orderId: order.id, orderNumber: order.orderNumber, itemCount: orderItems.length },
    'order created',
  )

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

  // 桌台状态由"结算"操作统一管理，单个订单完成不重置桌台

  return updated!
}

export function updateOrderItems(storeId: string, orderId: string, items: OrderItem[]): Order | { error: string } {
  const order = orderStore.getById(orderId)
  if (!order || order.storeId !== storeId) {
    return { error: 'Order not found' }
  }
  if (order.status === 'completed' || order.status === 'closed') {
    return { error: 'Cannot modify a completed or closed order' }
  }
  if (!items || items.length === 0) {
    return { error: 'Order must have at least one item' }
  }

  // Recalculate total
  const totalPrice = items.reduce((sum, item) => {
    const optAdjust = (item.selectedOptions ?? []).reduce((s, o) => s + o.priceAdjust, 0)
    return sum + (item.price + optAdjust) * item.quantity
  }, 0)

  const updated = orderStore.update(orderId, {
    items,
    totalPrice,
    updatedAt: new Date().toISOString(),
  })

  return updated!
}

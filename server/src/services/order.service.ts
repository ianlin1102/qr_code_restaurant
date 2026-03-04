import { v4 as uuid } from 'uuid'
import { JsonStore } from '../storage/json-store.js'
import { getMenuItemById } from './menu.service.js'
import type { Order, Table, CreateOrderRequest, OrderStatus } from '@qr-order/shared'

const orderStore = new JsonStore<Order>('orders.json')
const tableStore = new JsonStore<Table>('tables.json')

let orderCounter = orderStore.getAll().length

function generateOrderNumber(): string {
  orderCounter++
  const letter = String.fromCharCode(65 + Math.floor((orderCounter - 1) / 999) % 26)
  const num = ((orderCounter - 1) % 999) + 1
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
    const lineTotal = menuItem.price * item.quantity
    totalPrice += lineTotal
    orderItems.push({
      menuItemId: menuItem.id,
      name: menuItem.name,
      price: menuItem.price,
      quantity: item.quantity,
      remark: item.remark,
    })
  }

  const now = new Date().toISOString()
  const order: Order = {
    id: uuid(),
    orderNumber: generateOrderNumber(),
    storeId,
    tableId: table.id,
    tableName: table.name,
    items: orderItems,
    totalPrice,
    status: 'pending',
    customerName: req.customerName,
    createdAt: now,
    updatedAt: now,
  }

  orderStore.create(order)
  tableStore.update(table.id, { status: 'occupied', currentOrderId: order.id })

  return order
}

export function getOrders(storeId: string, status?: OrderStatus): Order[] {
  let orders = orderStore.getByField('storeId', storeId)
  if (status) {
    orders = orders.filter(o => o.status === status)
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

  if (status === 'completed') {
    tableStore.update(order.tableId, { status: 'idle', currentOrderId: undefined })
  }

  return updated!
}

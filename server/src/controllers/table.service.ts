import { v4 as uuid } from 'uuid'
import { JsonStore } from '../repositories/json-store.js'
import type { Table, Order } from '@qr-order/shared'

const tableStore = new JsonStore<Table>('tables.json')
const orderStore = new JsonStore<Order>('orders.json')

export function getTables(storeId: string): Table[] {
  return tableStore.getByField('storeId', storeId)
}

export function getTableById(tableId: string): Table | undefined {
  return tableStore.getById(tableId)
}

export function createTable(storeId: string, name: string): Table | { error: string } {
  // Check for duplicate name
  const existing = tableStore.getByField('storeId', storeId)
  if (existing.some(t => t.name === name)) {
    return { error: `桌台"${name}"已存在` }
  }
  const table: Table = { id: uuid(), storeId, name, status: 'idle' }
  return tableStore.create(table)
}

export function updateTable(storeId: string, tableId: string, updates: { name?: string }): Table | { error: string } {
  const table = tableStore.getById(tableId)
  if (!table || table.storeId !== storeId) {
    return { error: 'Table not found' }
  }
  if (updates.name != null) {
    const existing = tableStore.getByField('storeId', storeId)
    if (existing.some(t => t.id !== tableId && t.name === updates.name)) {
      return { error: `桌台"${updates.name}"已存在` }
    }
  }
  return tableStore.update(tableId, updates)!
}

export function deleteTable(storeId: string, tableId: string): boolean | { error: string } {
  const table = tableStore.getById(tableId)
  if (!table || table.storeId !== storeId) {
    return { error: 'Table not found' }
  }
  if (table.status === 'occupied') {
    return { error: '该桌台正在使用中，无法删除' }
  }
  return tableStore.delete(tableId)
}

/** Settle a table: mark all non-completed orders as completed, reset table to idle */
export function settleTable(storeId: string, tableId: string): { settled: number } | { error: string } {
  const table = tableStore.getById(tableId)
  if (!table || table.storeId !== storeId) {
    return { error: 'Table not found' }
  }

  const orders = orderStore.getByField('storeId', storeId)
    .filter(o => o.tableId === tableId && o.status !== 'completed')

  const now = new Date().toISOString()
  for (const order of orders) {
    orderStore.update(order.id, { status: 'completed', updatedAt: now })
  }

  tableStore.update(tableId, { status: 'idle', currentOrderId: undefined })

  return { settled: orders.length }
}

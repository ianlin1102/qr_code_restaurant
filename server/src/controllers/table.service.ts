import { JsonStore } from '../repositories/json-store.js'
import { orderStore } from './order.service.js'
import { getStore } from './store.service.js'
import type { Table } from '@qr-order/shared'

export const tableStore = new JsonStore<Table>('tables.json')

const INITIAL_BATCH = 20

/** One-time migration: assign `number` and `enabled` to existing tables that lack them. */
function migrateExistingTables(storeId: string): void {
  const tables = tableStore.getByField('storeId', storeId)
  let nextNumber = 1
  for (const t of tables) {
    if (t.number && t.number >= nextNumber) nextNumber = t.number + 1
  }
  for (const t of tables) {
    const updates: Partial<Table> = {}
    if (t.number == null) {
      updates.number = nextNumber++
    }
    if (t.enabled == null) {
      updates.enabled = true
    }
    if (Object.keys(updates).length > 0) {
      tableStore.update(t.id, updates)
    }
  }
}

/** Ensure a store has pre-generated table records up to INITIAL_BATCH. */
function fillUpTables(storeId: string): void {
  const existing = tableStore.getByField('storeId', storeId)
  const usedNumbers = new Set(existing.map(t => t.number).filter(Boolean))
  const store = getStore(storeId)
  const max = Math.min(store?.maxTables ?? 100, INITIAL_BATCH)
  for (let i = 1; i <= max; i++) {
    if (usedNumbers.has(i)) continue
    const tableId = `${storeId}-table-${String(i).padStart(3, '0')}`
    if (tableStore.getById(tableId)) continue
    tableStore.create({
      id: tableId,
      storeId,
      name: '',
      number: i,
      enabled: false,
      status: 'idle',
    })
  }
}

export function getTables(storeId: string, includeDisabled = false): Table[] {
  migrateExistingTables(storeId)
  fillUpTables(storeId)
  const all = tableStore.getByField('storeId', storeId)
  if (includeDisabled) return all
  return all.filter(t => t.enabled !== false)
}

export function getTableById(tableId: string): Table | undefined {
  return tableStore.getById(tableId)
}

export function updateTableStatus(storeId: string, tableId: string, status: Table['status']): Table | { error: string } {
  const table = tableStore.getById(tableId)
  if (!table || table.storeId !== storeId) {
    return { error: 'Table not found' }
  }
  return tableStore.update(tableId, { status })!
}

export function enableTable(
  storeId: string,
  tableNumber: number,
  name?: string,
  nameEn?: string
): Table | { error: string } {
  if (tableNumber < 1) {
    return { error: 'Table number must be at least 1' }
  }

  const tableId = `${storeId}-table-${String(tableNumber).padStart(3, '0')}`
  let table = tableStore.getById(tableId)

  if (!table) {
    table = tableStore.create({
      id: tableId,
      storeId,
      name: name?.trim() || `Table ${tableNumber}`,
      ...(nameEn ? { nameEn } : {}),
      number: tableNumber,
      enabled: true,
      status: 'idle',
    })
    return table
  }

  if (table.enabled) {
    return { error: `Table ${tableNumber} is already enabled` }
  }

  return tableStore.update(tableId, {
    enabled: true,
    name: name?.trim() || table.name || `Table ${tableNumber}`,
    ...(nameEn != null ? { nameEn } : {}),
  })!
}

export function disableTable(storeId: string, tableId: string): Table | { error: string } {
  const table = tableStore.getById(tableId)
  if (!table || table.storeId !== storeId) {
    return { error: 'Table not found' }
  }
  if (table.status === 'occupied') {
    return { error: 'Cannot disable an occupied table' }
  }
  if (!table.enabled) {
    return { error: 'Table is already disabled' }
  }
  return tableStore.update(tableId, { enabled: false, status: 'idle' })!
}

export function updateTable(storeId: string, tableId: string, updates: Partial<Omit<Table, 'id' | 'storeId'>>): Table | { error: string } {
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

export function getNextAvailableNumber(storeId: string): { number: number; allFull: boolean } {
  const tables = tableStore.getByField('storeId', storeId)
  const usedNumbers = new Set(tables.filter(t => t.enabled).map(t => t.number))
  // No upper cap — pool auto-expands. Find the first unused number.
  for (let i = 1; ; i++) {
    if (!usedNumbers.has(i)) return { number: i, allFull: false }
  }
}

/** Settle a table: mark all non-completed orders as completed, reset table to idle */
export function settleTable(storeId: string, tableId: string): { settled: number } | { error: string } {
  const table = tableStore.getById(tableId)
  if (!table || table.storeId !== storeId) {
    return { error: 'Table not found' }
  }

  const orders = orderStore.getByField('storeId', storeId)
    .filter(o => o.tableId === tableId && o.status !== 'completed' && o.status !== 'closed')

  const now = new Date().toISOString()
  for (const order of orders) {
    orderStore.update(order.id, { status: 'completed', updatedAt: now })
  }

  tableStore.update(tableId, { status: 'idle', currentOrderId: undefined })

  return { settled: orders.length }
}

/** Close a table: mark pending/preparing orders as 'closed', reset table to idle */
export function closeTable(storeId: string, tableId: string): { closed: number } | { error: string } {
  const table = tableStore.getById(tableId)
  if (!table || table.storeId !== storeId) {
    return { error: 'Table not found' }
  }

  const orders = orderStore.getByField('storeId', storeId)
    .filter(o => o.tableId === tableId && (o.status === 'pending' || o.status === 'preparing'))

  const now = new Date().toISOString()
  for (const order of orders) {
    orderStore.update(order.id, { status: 'closed', updatedAt: now })
  }

  tableStore.update(tableId, { status: 'idle', currentOrderId: undefined })

  return { closed: orders.length }
}

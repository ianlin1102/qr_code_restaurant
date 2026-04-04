import { v4 as uuid } from 'uuid'
import type { Table } from '@qr-order/shared'
import { tableStore, orderStore, storeStore, sessionStore } from '../repositories/stores.js'
import { closeSession, getActiveSession } from './session.service.js'

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
  const store = storeStore.getById(storeId)
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
  const filtered = includeDisabled ? all : all.filter(t => t.enabled !== false)
  // Always sort by number — stable order regardless of ID or creation time
  return filtered.sort((a, b) => (a.number ?? 0) - (b.number ?? 0))
}

export function getTableById(tableId: string): Table | undefined {
  return tableStore.getById(tableId)
}

/** Public table info for customer scan — strips internal/layout fields, resolves paymentMode. */
export function getTablePublic(
  storeId: string,
  tableId: string,
): (Omit<Table, 'currentOrderId' | 'currentBillId' | 'currentSessionId' | 'x' | 'y' | 'width' | 'height' | 'shape'> & { paymentMode: string }) | null {
  const table = tableStore.getById(tableId)
  if (!table || table.storeId !== storeId) return null
  const store = storeStore.getById(storeId)
  const { currentOrderId, currentBillId, currentSessionId, x, y, width, height, shape, ...publicTable } = table
  return { ...publicTable, paymentMode: table.paymentMode ?? store?.paymentMode ?? 'pay-first' }
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
      return { error: `Table "${updates.name}" already exists` }
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

/** Regenerate table ID — creates a new random ID, old QR code stops working. */
export function regenerateTableId(storeId: string, tableId: string): Table | { error: string } {
  const table = tableStore.getById(tableId)
  if (!table || table.storeId !== storeId) return { error: 'Table not found' }
  if (table.status === 'occupied') return { error: 'Cannot regenerate QR for an occupied table' }

  // Create new table record with random ID, copy all data
  const newId = `${storeId}-t-${uuid().slice(0, 8)}`
  const newTable: Table = { ...table, id: newId }
  tableStore.create(newTable)

  // Update all orders referencing the old tableId
  const orders = orderStore.getByField('storeId', storeId)
  for (const order of orders) {
    if (order.tableId === tableId) {
      orderStore.update(order.id, { tableId: newId })
    }
  }

  // Update all sessions referencing the old tableId
  const sessions = sessionStore.getByField('storeId', storeId)
  for (const session of sessions) {
    if (session.tableId === tableId) {
      sessionStore.update(session.id, { tableId: newId })
    }
  }

  // Delete old record
  tableStore.delete(tableId)

  return newTable
}

/** Settle a table: mark all non-served orders as served, close the active session */
export function settleTable(storeId: string, tableId: string): { settled: number } | { error: string } {
  const table = tableStore.getById(tableId)
  if (!table || table.storeId !== storeId) {
    return { error: 'Table not found' }
  }

  const orders = orderStore.getByField('storeId', storeId)
    .filter(o => o.tableId === tableId && o.status !== 'served')

  const now = new Date().toISOString()
  for (const order of orders) {
    orderStore.update(order.id, { status: 'served', updatedAt: now })
  }

  // Close active session (this also resets the table to idle)
  const session = getActiveSession(storeId, tableId)
  if (session) {
    closeSession(storeId, session.id)
  } else {
    tableStore.update(tableId, { status: 'idle', currentSessionId: undefined })
  }

  return { settled: orders.length }
}

/** Close a table: mark pending/preparing orders as 'served', close the active session */
export function closeTable(storeId: string, tableId: string): { closed: number } | { error: string } {
  const table = tableStore.getById(tableId)
  if (!table || table.storeId !== storeId) {
    return { error: 'Table not found' }
  }

  const orders = orderStore.getByField('storeId', storeId)
    .filter(o => o.tableId === tableId && (o.status === 'pending' || o.status === 'preparing'))

  const now = new Date().toISOString()
  for (const order of orders) {
    orderStore.update(order.id, { status: 'served', updatedAt: now })
  }

  // Close active session (this also resets the table to idle)
  const session = getActiveSession(storeId, tableId)
  if (session) {
    closeSession(storeId, session.id)
  } else {
    tableStore.update(tableId, { status: 'idle', currentSessionId: undefined })
  }

  return { closed: orders.length }
}

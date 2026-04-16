import { tableStore } from '../repositories/stores.js'
import { emit } from '../lib/event-bus.js'
import logger from '../lib/logger.js'
import type { Table } from '@qr-order/shared'

type Result<T> = T | { error: string }

const ALLOWED_MANUAL_STATUSES: Table['status'][] = ['idle', 'occupied', 'cleaning', 'bill-requested']

function loadTable(storeId: string, tableId: string): Result<Table> {
  const table = tableStore.getById(tableId)
  if (!table || table.storeId !== storeId) return { error: 'Table not found' }
  if (!table.enabled) return { error: 'Table is disabled' }
  return table
}

/** Customer presses "Call Waiter" — stamps timestamp on table, emits event. */
export function callWaiter(storeId: string, tableId: string): Result<Table> {
  const table = loadTable(storeId, tableId)
  if ('error' in table) return table
  const updated = tableStore.update(tableId, { waiterCalledAt: new Date().toISOString() })!
  logger.info({ storeId, tableId, tableName: table.name }, 'waiter called')
  emit({ type: 'table:waiter-called', storeId, tableId })
  emit({ type: 'store:tables', storeId })
  return updated
}

/** Admin acknowledges waiter call — clears the timestamp. */
export function ackWaiterCall(storeId: string, tableId: string): Result<Table> {
  const table = loadTable(storeId, tableId)
  if ('error' in table) return table
  const updated = tableStore.update(tableId, { waiterCalledAt: undefined })!
  logger.info({ storeId, tableId }, 'waiter call acknowledged')
  emit({ type: 'store:tables', storeId })
  return updated
}

/** Customer presses "Request Bill" — sets status to bill-requested. Only valid from occupied. */
export function requestBill(storeId: string, tableId: string): Result<Table> {
  const table = loadTable(storeId, tableId)
  if ('error' in table) return table
  if (table.status !== 'occupied') {
    return { error: `Cannot request bill from status '${table.status}'` }
  }
  const updated = tableStore.update(tableId, { status: 'bill-requested' })!
  logger.info({ storeId, tableId }, 'bill requested')
  emit({ type: 'store:tables', storeId })
  return updated
}

/** Admin manually sets table status — e.g., mark cleaning / idle after closing. */
export function setTableStatus(storeId: string, tableId: string, status: Table['status']): Result<Table> {
  if (!ALLOWED_MANUAL_STATUSES.includes(status)) {
    return { error: `Invalid status '${status}'` }
  }
  const table = loadTable(storeId, tableId)
  if ('error' in table) return table
  const updated = tableStore.update(tableId, { status })!
  logger.info({ storeId, tableId, from: table.status, to: status }, 'table status changed (manual)')
  emit({ type: 'store:tables', storeId })
  return updated
}

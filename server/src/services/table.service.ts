import { JsonStore } from '../storage/json-store.js'
import type { Table } from '@qr-order/shared'

const tableStore = new JsonStore<Table>('tables.json')

export function getTables(storeId: string): Table[] {
  return tableStore.getByField('storeId', storeId)
}

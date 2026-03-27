import { JsonStore } from './json-store.js'
import type { Order, Table, Store, Bill, Split, RoleDefinition } from '@qr-order/shared'

// All JsonStore singletons in one place — prevents circular dependencies
// and enforces the one-instance-per-file rule.

export const orderStore = new JsonStore<Order>('orders.json')
export const tableStore = new JsonStore<Table>('tables.json')
export const storeStore = new JsonStore<Store>('stores.json')
export const billStore = new JsonStore<Bill>('bills.json')
export const splitStore = new JsonStore<Split>('splits.json')
export const roleStore = new JsonStore<RoleDefinition>('roles.json')

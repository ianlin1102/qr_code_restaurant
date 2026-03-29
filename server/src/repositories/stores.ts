import { JsonStore } from './json-store.js'
import type { Order, Table, Store, Session, Payment, RoleDefinition } from '@qr-order/shared'

// All JsonStore singletons in one place — prevents circular dependencies
// and enforces the one-instance-per-file rule.

export const orderStore = new JsonStore<Order>('orders.json')
export const tableStore = new JsonStore<Table>('tables.json')
export const storeStore = new JsonStore<Store>('stores.json')
export const sessionStore = new JsonStore<Session>('sessions.json')
export const paymentStore = new JsonStore<Payment>('payments.json')
export const roleStore = new JsonStore<RoleDefinition>('roles.json')

// Legacy aliases — will be removed after full migration
export const billStore = sessionStore as unknown as JsonStore<Session>
export const splitStore = paymentStore as unknown as JsonStore<Payment>

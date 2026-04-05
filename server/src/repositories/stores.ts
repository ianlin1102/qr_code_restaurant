import { JsonStore } from './json-store.js'
import type { Order, Table, Store, Session, Payment, RoleDefinition, TimeEntry, SplitBill } from '@qr-order/shared'

// All JsonStore singletons in one place — prevents circular dependencies
// and enforces the one-instance-per-file rule.

export const orderStore = new JsonStore<Order>('orders.json')
export const tableStore = new JsonStore<Table>('tables.json')
export const storeStore = new JsonStore<Store>('stores.json')
export const sessionStore = new JsonStore<Session>('sessions.json')
export const paymentStore = new JsonStore<Payment>('payments.json')
export const roleStore = new JsonStore<RoleDefinition>('roles.json')
export const timeEntryStore = new JsonStore<TimeEntry>('time-entries.json')
export const staffStore = new JsonStore<{ id: string; storeId: string; username: string; password: string; role: string; roleId?: string; clockPin?: string; createdAt: string }>('staff.json')
export const splitBillStore = new JsonStore<SplitBill>('split-bills.json')

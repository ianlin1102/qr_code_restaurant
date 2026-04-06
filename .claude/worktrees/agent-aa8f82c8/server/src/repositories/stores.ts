import { JsonStore } from './json-store.js'
import type { TimeEntry } from '@qr-order/shared'

export const timeEntryStore = new JsonStore<TimeEntry>('time-entries.json')

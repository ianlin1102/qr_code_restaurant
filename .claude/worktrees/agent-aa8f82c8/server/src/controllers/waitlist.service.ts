import { v4 as uuid } from 'uuid'
import { JsonStore } from '../repositories/json-store.js'
import type { WaitlistEntry } from '@qr-order/shared'

const waitlistStore = new JsonStore<WaitlistEntry>('waitlist.json')

const MINUTES_PER_PARTY = 15

export function getWaitlist(storeId: string): WaitlistEntry[] {
  return waitlistStore
    .getByField('storeId', storeId)
    .filter(e => e.status === 'waiting')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export function addEntry(
  storeId: string,
  data: { name: string; partySize: number; phone?: string },
): WaitlistEntry {
  const waitingAhead = getWaitlist(storeId).length
  const estimatedWait = waitingAhead * MINUTES_PER_PARTY

  const entry: WaitlistEntry = {
    id: uuid(),
    storeId,
    name: data.name,
    partySize: data.partySize,
    phone: data.phone,
    estimatedWait,
    status: 'waiting',
    createdAt: new Date().toISOString(),
  }

  return waitlistStore.create(entry)
}

export function updateEntry(
  storeId: string,
  entryId: string,
  updates: Partial<Pick<WaitlistEntry, 'name' | 'partySize' | 'phone' | 'status'>>,
): WaitlistEntry | { error: string } {
  const entry = waitlistStore.getById(entryId)
  if (!entry || entry.storeId !== storeId) {
    return { error: 'Waitlist entry not found' }
  }
  return waitlistStore.update(entryId, updates)!
}

export function removeEntry(
  storeId: string,
  entryId: string,
): boolean | { error: string } {
  const entry = waitlistStore.getById(entryId)
  if (!entry || entry.storeId !== storeId) {
    return { error: 'Waitlist entry not found' }
  }
  return waitlistStore.delete(entryId)
}

export function seatEntry(
  storeId: string,
  entryId: string,
): WaitlistEntry | { error: string } {
  const entry = waitlistStore.getById(entryId)
  if (!entry || entry.storeId !== storeId) {
    return { error: 'Waitlist entry not found' }
  }
  if (entry.status !== 'waiting') {
    return { error: 'Entry is not in waiting status' }
  }
  return waitlistStore.update(entryId, { status: 'seated' })!
}

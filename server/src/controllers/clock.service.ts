import { v4 as uuid } from 'uuid'
import { staffStore, timeEntryStore } from '../repositories/stores.js'
import type { TimeEntry } from '@qr-order/shared'
import logger from '../lib/logger.js'

interface VerifyResult {
  user: { id: string; username: string }
  clockedIn: boolean
  currentEntry?: TimeEntry
}

type ServiceError = { error: string; status: number }

export function verifyPin(storeId: string, pin: string): VerifyResult | ServiceError {
  const staff = staffStore.getByField('storeId', storeId)
  const user = staff.find(u => (u as { clockPin?: string }).clockPin === pin)
  if (!user) return { error: 'Invalid PIN', status: 401 }

  const entries = timeEntryStore.getByField('userId', user.id)
  const openEntry = entries.find(e => !e.clockOut && e.storeId === storeId)

  return {
    user: { id: user.id, username: user.username },
    clockedIn: !!openEntry,
    currentEntry: openEntry,
  }
}

export function clockIn(storeId: string, pin: string): TimeEntry | ServiceError {
  const result = verifyPin(storeId, pin)
  if ('error' in result) return result
  if (result.clockedIn) return { error: 'Already clocked in', status: 400 }

  const entry: TimeEntry = {
    id: uuid(),
    storeId,
    userId: result.user.id,
    clockIn: new Date().toISOString(),
  }
  timeEntryStore.create(entry)
  logger.info({ storeId, userId: result.user.id }, 'clock in')
  return entry
}

export function clockOut(storeId: string, pin: string): TimeEntry | ServiceError {
  const result = verifyPin(storeId, pin)
  if ('error' in result) return result
  if (!result.clockedIn || !result.currentEntry) return { error: 'Not clocked in', status: 400 }

  const now = new Date()
  const clockInTime = new Date(result.currentEntry.clockIn)
  const duration = Math.round((now.getTime() - clockInTime.getTime()) / 60000)

  const updated = timeEntryStore.update(result.currentEntry.id, {
    clockOut: now.toISOString(),
    duration,
  })!

  logger.info({ storeId, userId: result.user.id, duration }, 'clock out')
  return updated
}

export function getEntries(
  storeId: string,
  filters?: { userId?: string; startDate?: string; endDate?: string },
): TimeEntry[] {
  let entries = timeEntryStore.getByField('storeId', storeId)
  if (filters?.userId) entries = entries.filter(e => e.userId === filters.userId)
  if (filters?.startDate) entries = entries.filter(e => e.clockIn >= filters.startDate!)
  if (filters?.endDate) entries = entries.filter(e => e.clockIn <= filters.endDate!)
  return entries.sort((a, b) => b.clockIn.localeCompare(a.clockIn))
}

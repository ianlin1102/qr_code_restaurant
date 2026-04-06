import { v4 as uuid } from 'uuid'
import bcrypt from 'bcryptjs'
import { JsonStore } from '../repositories/json-store.js'
import type { AuthUser } from '@qr-order/shared'
import logger from '../lib/logger.js'

interface StaffRecord {
  id: string
  storeId: string
  username: string
  password: string
  role: string
  clockPin?: string
  createdAt: string
}

export const staffStore = new JsonStore<StaffRecord>('staff.json')

function toAuthUser(u: StaffRecord): AuthUser {
  return { id: u.id, username: u.username, role: u.role, storeId: u.storeId }
}

export function getStaff(storeId: string): AuthUser[] {
  return staffStore.getByField('storeId', storeId).map(toAuthUser)
}

export async function addStaff(
  storeId: string,
  username: string,
  password: string,
  role: string,
  clockPin?: string
): Promise<AuthUser | { error: string; status: number }> {
  const existing = staffStore.getByField('storeId', storeId)
    .find(u => u.username === username)
  if (existing) {
    return { error: 'Username already exists', status: 409 }
  }

  if (clockPin !== undefined) {
    const pinError = validateClockPin(storeId, clockPin)
    if (pinError) return pinError
  }

  const record: StaffRecord = {
    id: uuid(),
    storeId,
    username,
    password: await bcrypt.hash(password, 10),
    role,
    ...(clockPin ? { clockPin } : {}),
    createdAt: new Date().toISOString(),
  }
  staffStore.create(record)
  logger.info({ storeId, username, role }, 'staff created')
  return toAuthUser(record)
}

function validateClockPin(
  storeId: string,
  pin: string,
  excludeUserId?: string
): { error: string; status: number } | null {
  if (!/^\d{4}$/.test(pin)) {
    return { error: 'Clock PIN must be exactly 4 digits', status: 400 }
  }
  const allStaff = staffStore.getByField('storeId', storeId)
  const duplicate = allStaff.find(
    u => u.clockPin === pin && u.id !== excludeUserId
  )
  if (duplicate) {
    return { error: 'Clock PIN already in use by another staff member', status: 409 }
  }
  return null
}

export function updateClockPin(
  storeId: string,
  userId: string,
  clockPin: string
): AuthUser | { error: string; status: number } {
  const target = staffStore.getByField('storeId', storeId)
    .find(u => u.id === userId)
  if (!target) return { error: 'User not found', status: 404 }

  const pinError = validateClockPin(storeId, clockPin, userId)
  if (pinError) return pinError

  const updated = staffStore.update(userId, { clockPin })!
  logger.info({ storeId, userId }, 'clock pin updated')
  return toAuthUser(updated)
}

export function changeRole(
  storeId: string,
  userId: string,
  role: string
): AuthUser | { error: string; status: number } {
  const all = staffStore.getByField('storeId', storeId)
  const target = all.find(u => u.id === userId)
  if (!target) {
    return { error: 'User not found', status: 404 }
  }

  const updated = staffStore.update(userId, { role })!
  logger.info({ storeId, userId, role }, 'staff role updated')
  return toAuthUser(updated)
}

export function removeStaff(
  storeId: string,
  userId: string
): { success: true } | { error: string; status: number } {
  const all = staffStore.getByField('storeId', storeId)
  const target = all.find(u => u.id === userId)
  if (!target) {
    return { error: 'User not found', status: 404 }
  }

  const owners = all.filter(u => u.role === 'owner')
  if (target.role === 'owner' && owners.length <= 1) {
    return { error: 'Cannot delete the last owner', status: 400   }
  }

  staffStore.delete(userId)
  logger.info({ storeId, userId }, 'staff deleted')
  return { success: true }
}

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
  roleId?: string
  clockPin?: string
  createdAt: string
}

export const staffStore = new JsonStore<StaffRecord>('staff.json')

function toAuthUser(u: StaffRecord): AuthUser {
  return {
    id: u.id, username: u.username, role: u.role,
    roleId: u.roleId, storeId: u.storeId,
  }
}

export function getStaff(storeId: string): AuthUser[] {
  return staffStore.getByField('storeId', storeId).map(toAuthUser)
}

export async function addStaff(
  storeId: string,
  username: string,
  password: string,
  role: string,
  clockPin?: string,
): Promise<AuthUser | { error: string; status: number }> {
  const existing = staffStore.getByField('storeId', storeId)
    .find(u => u.username === username)
  if (existing) {
    return { error: 'Username already exists', status: 409 }
  }

  if (clockPin !== undefined) {
    if (!/^\d{4}$/.test(clockPin)) return { error: 'Clock PIN must be exactly 4 digits', status: 400 }
    const dup = staffStore.getByField('storeId', storeId).find(u => u.clockPin === clockPin)
    if (dup) return { error: 'Clock PIN already in use', status: 409 }
  }

  // Auto-resolve roleId from role name
  const { roleStore } = await import('../repositories/stores.js')
  const matchingRole = roleStore.getByField('storeId', storeId)
    .find(r => r.name === role)

  const record: StaffRecord = {
    id: uuid(),
    storeId,
    username,
    password: await bcrypt.hash(password, 10),
    role,
    roleId: matchingRole?.id,
    ...(clockPin ? { clockPin } : {}),
    createdAt: new Date().toISOString(),
  }
  staffStore.create(record)
  logger.info({ storeId, username, role }, 'staff created')
  return toAuthUser(record)
}

export function updateClockPin(
  storeId: string,
  userId: string,
  clockPin: string,
): AuthUser | { error: string; status: number } {
  if (!/^\d{4}$/.test(clockPin)) return { error: 'Clock PIN must be exactly 4 digits', status: 400 }
  const all = staffStore.getByField('storeId', storeId)
  const target = all.find(u => u.id === userId)
  if (!target) return { error: 'User not found', status: 404 }
  const dup = all.find(u => u.clockPin === clockPin && u.id !== userId)
  if (dup) return { error: 'Clock PIN already in use', status: 409 }
  staffStore.update(userId, { clockPin })
  logger.info({ storeId, userId }, 'clock pin updated')
  return toAuthUser(staffStore.getById(userId)!)
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

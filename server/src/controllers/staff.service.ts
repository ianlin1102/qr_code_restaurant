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
  createdAt: string
}

const staffStore = new JsonStore<StaffRecord>('staff.json')

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
  role: string
): Promise<AuthUser | { error: string; status: number }> {
  const existing = staffStore.getByField('storeId', storeId)
    .find(u => u.username === username)
  if (existing) {
    return { error: 'Username already exists', status: 409 }
  }

  const record: StaffRecord = {
    id: uuid(),
    storeId,
    username,
    password: await bcrypt.hash(password, 10),
    role,
    createdAt: new Date().toISOString(),
  }
  staffStore.create(record)
  logger.info({ storeId, username, role }, 'staff created')
  return toAuthUser(record)
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

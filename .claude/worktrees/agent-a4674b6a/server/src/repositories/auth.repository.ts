import prisma from '../lib/prisma.js'
import { staffStore } from '../controllers/staff.service.js'

export async function findUserByUsername(storeId: string, username: string) {
  // Check JSON staff store first (MVP), then fall back to Prisma (future)
  const jsonUser = staffStore.getByField('storeId', storeId).find(u => u.username === username)
  if (jsonUser) return jsonUser

  return prisma.storeUser.findUnique({
    where: { storeId_username: { storeId, username } },
  })
}

export function createUser(
  storeId: string,
  username: string,
  hashedPassword: string,
  role: string
) {
  return prisma.storeUser.create({
    data: { storeId, username, password: hashedPassword, role },
  })
}

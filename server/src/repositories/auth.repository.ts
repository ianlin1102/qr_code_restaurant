import prisma from '../lib/prisma.js'

export function findUserByUsername(storeId: string, username: string) {
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

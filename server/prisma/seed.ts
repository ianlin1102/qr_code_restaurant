import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function upsertUser(
  storeId: string,
  username: string,
  password: string,
  role: 'owner' | 'staff',
) {
  const hashed = await bcrypt.hash(password, 10)
  const user = await prisma.storeUser.upsert({
    where: { storeId_username: { storeId, username } },
    update: { password: hashed },
    create: { storeId, username, password: hashed, role },
  })
  console.log(`  ${user.username} / ${password} (${user.role})`)
  return user
}

async function main() {
  // === Store 1: 示例餐厅 ===
  const store1 = await prisma.store.upsert({
    where: { id: 'store-demo-001' },
    update: {},
    create: {
      id: 'store-demo-001',
      name: '示例餐厅',
      description: '这是一家示例餐厅',
      openingHours: '10:00 - 22:00',
      announcement: '欢迎光临！',
    },
  })
  console.log(`Store: ${store1.id} (${store1.name})`)
  await upsertUser(store1.id, 'admin', 'admin123', 'owner')
  await upsertUser(store1.id, 'staff1', 'staff123', 'staff')
  await upsertUser(store1.id, 'staff2', 'staff123', 'staff')

  // === Store 2: 火锅世界 ===
  const store2 = await prisma.store.upsert({
    where: { id: 'store-demo-002' },
    update: {},
    create: {
      id: 'store-demo-002',
      name: '火锅世界',
      description: '正宗重庆火锅',
      openingHours: '11:00 - 23:00',
      announcement: '新店开业，全场八折！',
    },
  })
  console.log(`Store: ${store2.id} (${store2.name})`)
  await upsertUser(store2.id, 'admin', 'admin123', 'owner')
  await upsertUser(store2.id, 'staff1', 'staff123', 'staff')
  await upsertUser(store2.id, 'staff2', 'staff123', 'staff')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

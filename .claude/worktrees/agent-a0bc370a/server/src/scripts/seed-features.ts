/**
 * Seed script for Floor Plan, Coupons, Waitlist, and Analytics orders.
 * Run with:  npx tsx server/src/scripts/seed-features.ts
 */
import fs from 'fs'
import path from 'path'
import { v4 as uuid } from 'uuid'
import type { Table, Order, OrderItem, OrderStatus, Coupon, WaitlistEntry } from '@qr-order/shared'

const DATA_DIR = path.resolve(__dirname, '../../data')
const STORE_ID = 'store-demo-002'

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf-8')) as T
}
function writeJson(file: string, data: unknown): void {
  fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2) + '\n', 'utf-8')
}
function daysAgo(days: number, extraMin = 0): string {
  const d = new Date(); d.setDate(d.getDate() - days); d.setMinutes(d.getMinutes() - extraMin)
  return d.toISOString()
}
function minutesAgo(m: number): string {
  const d = new Date(); d.setMinutes(d.getMinutes() - m); return d.toISOString()
}
function pickRandom<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }

// --- 1. Tables: add zone/capacity to existing, plus outdoor & bar -----------
function seedTables(): void {
  const tables = readJson<Table[]>('tables.json')
  const zoneMap: Record<string, { zone: string; capacity: number }> = {
    '1号桌': { zone: 'Main', capacity: 4 },
    '2号桌': { zone: 'Main', capacity: 4 },
    '3号桌': { zone: 'Main', capacity: 4 },
    '包间1': { zone: 'Main', capacity: 4 },
  }
  for (const t of tables) {
    if (t.storeId !== STORE_ID) continue
    const m = zoneMap[t.name]
    if (m) { t.zone = m.zone; t.capacity = m.capacity }
  }
  const newTables: Table[] = [
    { id: uuid(), storeId: STORE_ID, name: '露台5', nameEn: 'Outdoor 5', status: 'idle', zone: 'Outdoor', capacity: 6 },
    { id: uuid(), storeId: STORE_ID, name: '露台6', nameEn: 'Outdoor 6', status: 'idle', zone: 'Outdoor', capacity: 6 },
    { id: uuid(), storeId: STORE_ID, name: '吧台1', nameEn: 'Bar 1', status: 'idle', zone: 'Bar', capacity: 2 },
  ]
  tables.push(...newTables)
  writeJson('tables.json', tables)

  const updated = tables.filter((t) => t.storeId === STORE_ID)
  console.log(`[Tables] Updated ${updated.length} tables for ${STORE_ID}:`)
  for (const t of updated) {
    console.log(`  - ${t.name} (${t.nameEn ?? ''}) zone=${t.zone} capacity=${t.capacity}`)
  }
}

// --- 2. Coupons -----------------------------------------------------------
function seedCoupons(): void {
  const now = new Date().toISOString()
  const expires = new Date(Date.now() + 30 * 86_400_000).toISOString()
  const coupons: Coupon[] = [
    { id: uuid(), storeId: STORE_ID, code: 'SAVE10', discountType: 'percentage', discountValue: 10, minOrderAmount: 2000, currentUses: 0, active: true, expiresAt: expires, createdAt: now },
    { id: uuid(), storeId: STORE_ID, code: 'FLAT5', discountType: 'fixed', discountValue: 500, currentUses: 0, active: true, expiresAt: expires, createdAt: now },
    { id: uuid(), storeId: STORE_ID, code: 'BOGOFREE', discountType: 'bogo', discountValue: 0, maxUses: 50, currentUses: 0, active: true, expiresAt: expires, createdAt: now },
  ]
  writeJson('coupons.json', coupons)
  console.log(`\n[Coupons] Created ${coupons.length} coupons:`)
  for (const c of coupons) console.log(`  - ${c.code} (${c.discountType}, value=${c.discountValue})`)
}

// --- 3. Waitlist -----------------------------------------------------------
function seedWaitlist(): void {
  const entries: WaitlistEntry[] = [
    { id: uuid(), storeId: STORE_ID, name: 'Zhang Wei', partySize: 4, phone: '138xxxx1234', estimatedWait: 25, status: 'waiting', createdAt: minutesAgo(20) },
    { id: uuid(), storeId: STORE_ID, name: 'Li Na', partySize: 2, estimatedWait: 15, status: 'waiting', createdAt: minutesAgo(10) },
    { id: uuid(), storeId: STORE_ID, name: 'Wang Jun', partySize: 6, phone: '139xxxx5678', estimatedWait: 10, status: 'waiting', createdAt: minutesAgo(5) },
  ]
  writeJson('waitlist.json', entries)
  console.log(`\n[Waitlist] Created ${entries.length} entries:`)
  for (const e of entries) console.log(`  - ${e.name} (party=${e.partySize}, ${e.status})`)
}

// --- 4. Orders for analytics (spread over 7 days) -------------------------
type ItemRef = Pick<OrderItem, 'menuItemId' | 'name' | 'nameEn' | 'price'>
const ITEMS: ItemRef[] = [
  { menuItemId: 'b065a6df-491f-44a1-bf07-e7ecdba4a377', name: '麻辣锅底', nameEn: 'Spicy Soup Base', price: 2499 },
  { menuItemId: '4ea09106-fa0e-422e-8766-6c8df5140c04', name: '番茄锅底', nameEn: 'Tomato Soup Base', price: 1999 },
  { menuItemId: 'e4428c20-e44b-470a-9d2e-6811fe46adb9', name: '肥牛卷', nameEn: 'Sliced Beef', price: 1699 },
  { menuItemId: 'fe3a2a1f-45cf-4e45-9915-288a94f3b66e', name: '羊肉卷', nameEn: 'Sliced Lamb', price: 1899 },
  { menuItemId: 'a2fa8640-362f-47d8-abdc-f47d4c1d9313', name: '虾滑', nameEn: 'Shrimp Paste', price: 1499 },
  { menuItemId: '8d70368a-478d-44dc-9015-2e72f45c1be5', name: '土豆片', nameEn: 'Potato Slices', price: 399 },
  { menuItemId: '00b597aa-a2ba-41a2-b441-dc424cc3567b', name: '莲藕', nameEn: 'Lotus Root', price: 499 },
  { menuItemId: 'f06f77c5-e1df-4459-8383-0bce8757f030', name: '豆腐', nameEn: 'Tofu', price: 299 },
  { menuItemId: '0b8bbc80-00b9-45c0-b89f-e6c1ccaf9426', name: '酸梅汤', nameEn: 'Plum Juice', price: 599 },
  { menuItemId: 'f2044178-8ffb-4085-88c3-1bd290e02fea', name: '王老吉', nameEn: 'Herbal Tea', price: 399 },
]
const TABLES = [
  { id: 'db7f75ae-64a4-4fca-a547-8556ceb6fc25', name: '1号桌' },
  { id: '4f35d927-6182-4be9-a2ea-4263e3918188', name: '2号桌' },
  { id: 'ae57e572-1ba4-48db-b2fe-f4f949306be6', name: '3号桌' },
  { id: 'd9833253-1c86-4866-9f46-e2921a8372c7', name: '包间1' },
]
const NAMES: (string | undefined)[] = ['赵先生', '钱女士', '孙小姐', '李先生', '周女士', '吴先生', undefined, undefined]

function buildItems(): OrderItem[] {
  const count = 2 + Math.floor(Math.random() * 4)
  const result: OrderItem[] = []
  const used = new Set<string>()
  for (let i = 0; i < count; i++) {
    let ref = pickRandom(ITEMS)
    while (used.has(ref.menuItemId) && used.size < ITEMS.length) ref = pickRandom(ITEMS)
    used.add(ref.menuItemId)
    result.push({ ...ref, quantity: 1 + Math.floor(Math.random() * 2) })
  }
  return result
}

function seedOrders(): void {
  const pool: OrderStatus[] = ['served', 'served', 'served', 'served', 'paid', 'paid', 'preparing', 'closed']
  const orders: Order[] = []

  for (let i = 0; i < 12; i++) {
    const day = Math.floor(Math.random() * 7)
    const createdAt = daysAgo(day, Math.floor(Math.random() * 600))
    const table = pickRandom(TABLES)
    const items = buildItems()
    const totalPrice = items.reduce((s, it) => s + it.price * it.quantity, 0)
    const status = pickRandom(pool)
    const isPaid = ['served', 'paid', 'closed'].includes(status)

    orders.push({
      id: uuid(),
      orderNumber: `H${String(i + 1).padStart(3, '0')}`,
      storeId: STORE_ID,
      tableId: table.id,
      tableName: table.name,
      items,
      totalPrice,
      status,
      isPaid,
      customerName: pickRandom(NAMES),
      createdAt,
      updatedAt: createdAt,
    })
  }

  orders.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  writeJson('orders.json', orders)

  console.log(`\n[Orders] Created ${orders.length} orders for analytics:`)
  for (const o of orders) {
    const d = o.createdAt.slice(0, 10)
    console.log(`  - ${o.orderNumber} | ${d} | ${o.tableName} | ${o.items.length} items | $${(o.totalPrice / 100).toFixed(2)} | ${o.status}${o.isPaid ? ' (paid)' : ''}`)
  }
}

// --- Main ------------------------------------------------------------------
function main(): void {
  console.log('=== Seeding test data for store-demo-002 ===\n')
  seedTables()
  seedCoupons()
  seedWaitlist()
  seedOrders()
  console.log('\n=== Seed complete ===')
}

main()

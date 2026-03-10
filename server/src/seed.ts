import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuid } from 'uuid'

const __filename2 = typeof __filename !== 'undefined' ? __filename : fileURLToPath(import.meta.url)
const __dirname2 = typeof __dirname !== 'undefined' ? __dirname : dirname(__filename2)
const DATA_DIR = join(__dirname2, '../data')
mkdirSync(DATA_DIR, { recursive: true })

// === Store 1: 示例餐厅 ===
const store1Id = 'store-demo-001'

const store1Categories = [
  { id: uuid(), storeId: store1Id, name: '热菜', sortOrder: 1 },
  { id: uuid(), storeId: store1Id, name: '凉菜', sortOrder: 2 },
  { id: uuid(), storeId: store1Id, name: '饮品', sortOrder: 3 },
  { id: uuid(), storeId: store1Id, name: '主食', sortOrder: 4 },
]

const store1MenuItems = [
  { id: uuid(), storeId: store1Id, categoryId: store1Categories[0].id, name: '宫保鸡丁', description: '经典川菜', price: 3800, available: true, sortOrder: 1 },
  { id: uuid(), storeId: store1Id, categoryId: store1Categories[0].id, name: '麻婆豆腐', description: '麻辣鲜香', price: 2800, available: true, sortOrder: 2 },
  { id: uuid(), storeId: store1Id, categoryId: store1Categories[0].id, name: '红烧肉', description: '肥而不腻', price: 4500, available: true, sortOrder: 3 },
  { id: uuid(), storeId: store1Id, categoryId: store1Categories[1].id, name: '拍黄瓜', description: '清爽开胃', price: 1200, available: true, sortOrder: 1 },
  { id: uuid(), storeId: store1Id, categoryId: store1Categories[1].id, name: '凉拌木耳', description: '营养健康', price: 1500, available: true, sortOrder: 2 },
  { id: uuid(), storeId: store1Id, categoryId: store1Categories[2].id, name: '柠檬水', price: 800, available: true, sortOrder: 1 },
  { id: uuid(), storeId: store1Id, categoryId: store1Categories[2].id, name: '可乐', price: 600, available: true, sortOrder: 2 },
  { id: uuid(), storeId: store1Id, categoryId: store1Categories[2].id, name: '酸梅汤', price: 1000, available: true, sortOrder: 3 },
  { id: uuid(), storeId: store1Id, categoryId: store1Categories[3].id, name: '米饭', price: 300, available: true, sortOrder: 1 },
  { id: uuid(), storeId: store1Id, categoryId: store1Categories[3].id, name: '炒面', description: '酱香炒面', price: 1800, available: true, sortOrder: 2 },
]

const store1Tables = [
  { id: uuid(), storeId: store1Id, name: 'A1', status: 'idle' as const },
  { id: uuid(), storeId: store1Id, name: 'A2', status: 'idle' as const },
  { id: uuid(), storeId: store1Id, name: 'A3', status: 'idle' as const },
  { id: uuid(), storeId: store1Id, name: 'B1', status: 'idle' as const },
  { id: uuid(), storeId: store1Id, name: 'B2', status: 'idle' as const },
]

// === Store 2: 火锅世界 ===
const store2Id = 'store-demo-002'

const store2Categories = [
  { id: uuid(), storeId: store2Id, name: '锅底', sortOrder: 1 },
  { id: uuid(), storeId: store2Id, name: '肉类', sortOrder: 2 },
  { id: uuid(), storeId: store2Id, name: '蔬菜', sortOrder: 3 },
  { id: uuid(), storeId: store2Id, name: '饮品', sortOrder: 4 },
]

const store2MenuItems = [
  { id: uuid(), storeId: store2Id, categoryId: store2Categories[0].id, name: '麻辣锅底', description: '正宗重庆麻辣', price: 5800, available: true, sortOrder: 1 },
  { id: uuid(), storeId: store2Id, categoryId: store2Categories[0].id, name: '番茄锅底', description: '酸甜可口', price: 4800, available: true, sortOrder: 2 },
  { id: uuid(), storeId: store2Id, categoryId: store2Categories[0].id, name: '鸳鸯锅底', description: '一锅两味', price: 6800, available: true, sortOrder: 3 },
  { id: uuid(), storeId: store2Id, categoryId: store2Categories[1].id, name: '肥牛卷', description: '新鲜肥牛', price: 4200, available: true, sortOrder: 1 },
  { id: uuid(), storeId: store2Id, categoryId: store2Categories[1].id, name: '羊肉卷', description: '内蒙羊肉', price: 4500, available: true, sortOrder: 2 },
  { id: uuid(), storeId: store2Id, categoryId: store2Categories[1].id, name: '虾滑', description: '手工虾滑', price: 3800, available: true, sortOrder: 3 },
  { id: uuid(), storeId: store2Id, categoryId: store2Categories[2].id, name: '土豆片', price: 800, available: true, sortOrder: 1 },
  { id: uuid(), storeId: store2Id, categoryId: store2Categories[2].id, name: '莲藕', price: 1000, available: true, sortOrder: 2 },
  { id: uuid(), storeId: store2Id, categoryId: store2Categories[2].id, name: '豆腐', price: 600, available: true, sortOrder: 3 },
  { id: uuid(), storeId: store2Id, categoryId: store2Categories[3].id, name: '酸梅汤', price: 1200, available: true, sortOrder: 1 },
  { id: uuid(), storeId: store2Id, categoryId: store2Categories[3].id, name: '王老吉', price: 800, available: true, sortOrder: 2 },
]

const store2Tables = [
  { id: uuid(), storeId: store2Id, name: '1号桌', status: 'idle' as const },
  { id: uuid(), storeId: store2Id, name: '2号桌', status: 'idle' as const },
  { id: uuid(), storeId: store2Id, name: '3号桌', status: 'idle' as const },
  { id: uuid(), storeId: store2Id, name: '包间1', status: 'idle' as const },
]

// === Merge & Write ===
const stores = [
  { id: store1Id, name: '示例餐厅', description: '这是一家示例餐厅', openingHours: '09:00-22:00', createdAt: new Date().toISOString() },
  { id: store2Id, name: '火锅世界', description: '正宗重庆火锅', openingHours: '11:00-23:00', createdAt: new Date().toISOString() },
]

const categories = [...store1Categories, ...store2Categories]
const menuItems = [...store1MenuItems, ...store2MenuItems]
const tables = [...store1Tables, ...store2Tables]

writeFileSync(join(DATA_DIR, 'stores.json'), JSON.stringify(stores, null, 2))
writeFileSync(join(DATA_DIR, 'categories.json'), JSON.stringify(categories, null, 2))
writeFileSync(join(DATA_DIR, 'menu-items.json'), JSON.stringify(menuItems, null, 2))
writeFileSync(join(DATA_DIR, 'tables.json'), JSON.stringify(tables, null, 2))
writeFileSync(join(DATA_DIR, 'orders.json'), JSON.stringify([], null, 2))

console.log('Seed data created successfully!')
console.log(`\nStore 1: ${store1Id} (示例餐厅)`)
console.log(`  Tables: ${store1Tables.map(t => `${t.name} (${t.id})`).join(', ')}`)
console.log(`\nStore 2: ${store2Id} (火锅世界)`)
console.log(`  Tables: ${store2Tables.map(t => `${t.name} (${t.id})`).join(', ')}`)

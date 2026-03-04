import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuid } from 'uuid'

const __filename2 = typeof __filename !== 'undefined' ? __filename : fileURLToPath(import.meta.url)
const __dirname2 = typeof __dirname !== 'undefined' ? __dirname : dirname(__filename2)
const DATA_DIR = join(__dirname2, '../data')
mkdirSync(DATA_DIR, { recursive: true })

const storeId = 'store-demo-001'

const stores = [{
  id: storeId,
  name: 'Demo Restaurant',
  description: 'A demo restaurant for testing',
  openingHours: '09:00-22:00',
  createdAt: new Date().toISOString()
}]

const categories = [
  { id: uuid(), storeId, name: '热菜', sortOrder: 1 },
  { id: uuid(), storeId, name: '凉菜', sortOrder: 2 },
  { id: uuid(), storeId, name: '饮品', sortOrder: 3 },
  { id: uuid(), storeId, name: '主食', sortOrder: 4 },
]

const menuItems = [
  { id: uuid(), storeId, categoryId: categories[0].id, name: '宫保鸡丁', description: '经典川菜', price: 3800, available: true, sortOrder: 1 },
  { id: uuid(), storeId, categoryId: categories[0].id, name: '麻婆豆腐', description: '麻辣鲜香', price: 2800, available: true, sortOrder: 2 },
  { id: uuid(), storeId, categoryId: categories[0].id, name: '红烧肉', description: '肥而不腻', price: 4500, available: true, sortOrder: 3 },
  { id: uuid(), storeId, categoryId: categories[1].id, name: '拍黄瓜', description: '清爽开胃', price: 1200, available: true, sortOrder: 1 },
  { id: uuid(), storeId, categoryId: categories[1].id, name: '凉拌木耳', description: '营养健康', price: 1500, available: true, sortOrder: 2 },
  { id: uuid(), storeId, categoryId: categories[2].id, name: '柠檬水', price: 800, available: true, sortOrder: 1 },
  { id: uuid(), storeId, categoryId: categories[2].id, name: '可乐', price: 600, available: true, sortOrder: 2 },
  { id: uuid(), storeId, categoryId: categories[2].id, name: '酸梅汤', price: 1000, available: true, sortOrder: 3 },
  { id: uuid(), storeId, categoryId: categories[3].id, name: '米饭', price: 300, available: true, sortOrder: 1 },
  { id: uuid(), storeId, categoryId: categories[3].id, name: '炒面', description: '酱香炒面', price: 1800, available: true, sortOrder: 2 },
]

const tables = [
  { id: uuid(), storeId, name: 'A1', status: 'idle' as const },
  { id: uuid(), storeId, name: 'A2', status: 'idle' as const },
  { id: uuid(), storeId, name: 'A3', status: 'idle' as const },
  { id: uuid(), storeId, name: 'B1', status: 'idle' as const },
  { id: uuid(), storeId, name: 'B2', status: 'idle' as const },
]

writeFileSync(join(DATA_DIR, 'stores.json'), JSON.stringify(stores, null, 2))
writeFileSync(join(DATA_DIR, 'categories.json'), JSON.stringify(categories, null, 2))
writeFileSync(join(DATA_DIR, 'menu-items.json'), JSON.stringify(menuItems, null, 2))
writeFileSync(join(DATA_DIR, 'tables.json'), JSON.stringify(tables, null, 2))
writeFileSync(join(DATA_DIR, 'orders.json'), JSON.stringify([], null, 2))

console.log('Seed data created successfully!')
console.log(`Store ID: ${storeId}`)
console.log(`Tables: ${tables.map(t => `${t.name} (${t.id})`).join(', ')}`)

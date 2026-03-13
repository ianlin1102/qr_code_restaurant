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
  { id: uuid(), storeId: store1Id, name: '热菜', nameEn: 'Hot Dishes', sortOrder: 1 },
  { id: uuid(), storeId: store1Id, name: '凉菜', nameEn: 'Cold Dishes', sortOrder: 2 },
  { id: uuid(), storeId: store1Id, name: '饮品', nameEn: 'Beverages', sortOrder: 3 },
  { id: uuid(), storeId: store1Id, name: '主食', nameEn: 'Staples', sortOrder: 4 },
]

const store1MenuItems = [
  {
    id: uuid(), storeId: store1Id, categoryId: store1Categories[0].id,
    name: '宫保鸡丁', nameEn: 'Kung Pao Chicken', description: '经典川菜', descriptionEn: 'Classic Sichuan dish',
    price: 1599, available: true, sortOrder: 1,
    options: [
      {
        id: uuid(), name: '辣度', nameEn: 'Spice Level', required: true,
        choices: [
          { id: uuid(), name: '微辣', nameEn: 'Mild', priceAdjust: 0 },
          { id: uuid(), name: '中辣', nameEn: 'Medium', priceAdjust: 0 },
          { id: uuid(), name: '特辣', nameEn: 'Extra Spicy', priceAdjust: 0 },
        ],
      },
    ],
  },
  {
    id: uuid(), storeId: store1Id, categoryId: store1Categories[0].id,
    name: '麻婆豆腐', nameEn: 'Mapo Tofu', description: '麻辣鲜香', descriptionEn: 'Spicy and numbing',
    price: 1299, available: true, sortOrder: 2,
    options: [
      {
        id: uuid(), name: '份量', nameEn: 'Size', required: true,
        choices: [
          { id: uuid(), name: '小份', nameEn: 'Small', priceAdjust: 0 },
          { id: uuid(), name: '大份', nameEn: 'Large', priceAdjust: 300 },
        ],
      },
    ],
  },
  {
    id: uuid(), storeId: store1Id, categoryId: store1Categories[0].id,
    name: '红烧肉', nameEn: 'Braised Pork Belly', description: '肥而不腻', descriptionEn: 'Rich and tender',
    price: 1899, available: true, sortOrder: 3,
    options: [
      {
        id: uuid(), name: '配菜', nameEn: 'Side', required: false,
        choices: [
          { id: uuid(), name: '加蛋', nameEn: 'Add Egg', priceAdjust: 150 },
          { id: uuid(), name: '加豆腐', nameEn: 'Add Tofu', priceAdjust: 100 },
        ],
      },
    ],
  },
  { id: uuid(), storeId: store1Id, categoryId: store1Categories[1].id, name: '拍黄瓜', nameEn: 'Smashed Cucumber', description: '清爽开胃', descriptionEn: 'Refreshing appetizer', price: 699, available: true, sortOrder: 1 },
  { id: uuid(), storeId: store1Id, categoryId: store1Categories[1].id, name: '凉拌木耳', nameEn: 'Wood Ear Mushroom Salad', description: '营养健康', descriptionEn: 'Healthy and nutritious', price: 799, available: true, sortOrder: 2 },
  {
    id: uuid(), storeId: store1Id, categoryId: store1Categories[2].id,
    name: '柠檬水', nameEn: 'Lemonade', price: 399, available: true, sortOrder: 1,
    options: [
      {
        id: uuid(), name: '甜度', nameEn: 'Sweetness', required: false,
        choices: [
          { id: uuid(), name: '正常', nameEn: 'Normal', priceAdjust: 0 },
          { id: uuid(), name: '少糖', nameEn: 'Less Sugar', priceAdjust: 0 },
          { id: uuid(), name: '无糖', nameEn: 'No Sugar', priceAdjust: 0 },
        ],
      },
      {
        id: uuid(), name: '温度', nameEn: 'Temperature', required: true,
        choices: [
          { id: uuid(), name: '冰', nameEn: 'Iced', priceAdjust: 0 },
          { id: uuid(), name: '常温', nameEn: 'Room Temp', priceAdjust: 0 },
          { id: uuid(), name: '热', nameEn: 'Hot', priceAdjust: 0 },
        ],
      },
    ],
  },
  { id: uuid(), storeId: store1Id, categoryId: store1Categories[2].id, name: '可乐', nameEn: 'Cola', price: 299, available: true, sortOrder: 2 },
  { id: uuid(), storeId: store1Id, categoryId: store1Categories[2].id, name: '酸梅汤', nameEn: 'Plum Juice', price: 499, available: true, sortOrder: 3 },
  {
    id: uuid(), storeId: store1Id, categoryId: store1Categories[3].id,
    name: '米饭', nameEn: 'Rice', price: 199, available: true, sortOrder: 1,
    options: [
      {
        id: uuid(), name: '份量', nameEn: 'Size', required: true,
        choices: [
          { id: uuid(), name: '小碗', nameEn: 'Small', priceAdjust: 0 },
          { id: uuid(), name: '大碗', nameEn: 'Large', priceAdjust: 50 },
        ],
      },
    ],
  },
  { id: uuid(), storeId: store1Id, categoryId: store1Categories[3].id, name: '炒面', nameEn: 'Fried Noodles', description: '酱香炒面', descriptionEn: 'Stir-fried noodles with sauce', price: 999, available: true, sortOrder: 2 },
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
  { id: uuid(), storeId: store2Id, name: '锅底', nameEn: 'Soup Base', sortOrder: 1 },
  { id: uuid(), storeId: store2Id, name: '肉类', nameEn: 'Meats', sortOrder: 2 },
  { id: uuid(), storeId: store2Id, name: '蔬菜', nameEn: 'Vegetables', sortOrder: 3 },
  { id: uuid(), storeId: store2Id, name: '饮品', nameEn: 'Beverages', sortOrder: 4 },
]

const store2MenuItems = [
  {
    id: uuid(), storeId: store2Id, categoryId: store2Categories[0].id,
    name: '麻辣锅底', nameEn: 'Spicy Soup Base', description: '正宗重庆麻辣', descriptionEn: 'Authentic Chongqing spicy',
    price: 2499, available: true, sortOrder: 1,
    options: [
      {
        id: uuid(), name: '辣度', nameEn: 'Spice Level', required: true,
        choices: [
          { id: uuid(), name: '微辣', nameEn: 'Mild', priceAdjust: 0 },
          { id: uuid(), name: '中辣', nameEn: 'Medium', priceAdjust: 0 },
          { id: uuid(), name: '特辣', nameEn: 'Extra Spicy', priceAdjust: 0 },
        ],
      },
    ],
  },
  { id: uuid(), storeId: store2Id, categoryId: store2Categories[0].id, name: '番茄锅底', nameEn: 'Tomato Soup Base', description: '酸甜可口', descriptionEn: 'Sweet and sour', price: 1999, available: true, sortOrder: 2 },
  { id: uuid(), storeId: store2Id, categoryId: store2Categories[0].id, name: '鸳鸯锅底', nameEn: 'Half & Half Soup Base', description: '一锅两味', descriptionEn: 'Two flavors in one pot', price: 2899, available: true, sortOrder: 3 },
  {
    id: uuid(), storeId: store2Id, categoryId: store2Categories[1].id,
    name: '肥牛卷', nameEn: 'Sliced Beef', description: '新鲜肥牛', descriptionEn: 'Fresh beef rolls',
    price: 1699, available: true, sortOrder: 1,
    options: [
      {
        id: uuid(), name: '份量', nameEn: 'Size', required: true,
        choices: [
          { id: uuid(), name: '半份', nameEn: 'Half', priceAdjust: 0 },
          { id: uuid(), name: '整份', nameEn: 'Full', priceAdjust: 800 },
        ],
      },
    ],
  },
  {
    id: uuid(), storeId: store2Id, categoryId: store2Categories[1].id,
    name: '羊肉卷', nameEn: 'Sliced Lamb', description: '内蒙羊肉', descriptionEn: 'Inner Mongolia lamb',
    price: 1899, available: true, sortOrder: 2,
    options: [
      {
        id: uuid(), name: '份量', nameEn: 'Size', required: true,
        choices: [
          { id: uuid(), name: '半份', nameEn: 'Half', priceAdjust: 0 },
          { id: uuid(), name: '整份', nameEn: 'Full', priceAdjust: 900 },
        ],
      },
    ],
  },
  { id: uuid(), storeId: store2Id, categoryId: store2Categories[1].id, name: '虾滑', nameEn: 'Shrimp Paste', description: '手工虾滑', descriptionEn: 'Handmade shrimp paste', price: 1499, available: true, sortOrder: 3 },
  { id: uuid(), storeId: store2Id, categoryId: store2Categories[2].id, name: '土豆片', nameEn: 'Potato Slices', price: 399, available: true, sortOrder: 1 },
  { id: uuid(), storeId: store2Id, categoryId: store2Categories[2].id, name: '莲藕', nameEn: 'Lotus Root', price: 499, available: true, sortOrder: 2 },
  { id: uuid(), storeId: store2Id, categoryId: store2Categories[2].id, name: '豆腐', nameEn: 'Tofu', price: 299, available: true, sortOrder: 3 },
  {
    id: uuid(), storeId: store2Id, categoryId: store2Categories[3].id,
    name: '酸梅汤', nameEn: 'Plum Juice', price: 599, available: true, sortOrder: 1,
    options: [
      {
        id: uuid(), name: '温度', nameEn: 'Temperature', required: true,
        choices: [
          { id: uuid(), name: '冰', nameEn: 'Iced', priceAdjust: 0 },
          { id: uuid(), name: '常温', nameEn: 'Room Temp', priceAdjust: 0 },
        ],
      },
    ],
  },
  { id: uuid(), storeId: store2Id, categoryId: store2Categories[3].id, name: '王老吉', nameEn: 'Herbal Tea', price: 399, available: true, sortOrder: 2 },
]

const store2Tables = [
  { id: uuid(), storeId: store2Id, name: '1号桌', nameEn: 'Table 1', status: 'idle' as const },
  { id: uuid(), storeId: store2Id, name: '2号桌', nameEn: 'Table 2', status: 'idle' as const },
  { id: uuid(), storeId: store2Id, name: '3号桌', nameEn: 'Table 3', status: 'idle' as const },
  { id: uuid(), storeId: store2Id, name: '包间1', nameEn: 'Room 1', status: 'idle' as const },
]

// === Merge & Write ===
const stores = [
  { id: store1Id, name: '示例餐厅', nameEn: 'Demo Restaurant', description: '这是一家示例餐厅', descriptionEn: 'A demo restaurant', openingHours: '09:00-22:00', createdAt: new Date().toISOString() },
  { id: store2Id, name: '火锅世界', nameEn: 'Hotpot World', description: '正宗重庆火锅', descriptionEn: 'Authentic Chongqing hotpot', openingHours: '11:00-23:00', createdAt: new Date().toISOString() },
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

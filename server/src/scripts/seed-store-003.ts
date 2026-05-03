/**
 * Partial seed — updates ONLY store-demo-003 in server/data/*.json without
 * touching stores 001 and 002 (or their orders / sessions / payments).
 *
 * Differs from server/src/seed.ts which writes a fresh full reset of all
 * stores (which clears demo progress on stores 001/002).
 *
 * Usage:
 *   pnpm tsx server/src/scripts/seed-store-003.ts
 *
 * Behavior:
 *   1. Reads existing stores.json, categories.json, menu-items.json, tables.json
 *   2. Filters out every entry with storeId === 'store-demo-003' (and the
 *      store row itself by id)
 *   3. Appends the fresh store-003 data imported from ../seeds/store-003
 *   4. Writes back to disk
 *
 * Safe: orders.json / sessions.json / payments.json are not touched.
 * Caveat: Existing orders that reference old store-003 menu-item ids will
 * become orphaned (those ids are regenerated on each run). For a real
 * "swap menu without breaking orders" flow, switch to PostgreSQL with
 * stable ids — JSON store demo is ephemeral by design.
 */
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import {
  store3Id,
  store3StoreEntry,
  store3Categories,
  store3MenuItems,
  store3Tables,
} from '../seeds/store-003.js'

const __filename2 = typeof __filename !== 'undefined' ? __filename : fileURLToPath(import.meta.url)
const __dirname2 = typeof __dirname !== 'undefined' ? __dirname : dirname(__filename2)
const DATA_DIR = join(__dirname2, '../../data')

function readJsonOr<T>(file: string, fallback: T): T {
  const path = join(DATA_DIR, file)
  if (!existsSync(path)) return fallback
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as T
  } catch (err) {
    console.error(`⚠️  Failed to parse ${file}, using fallback:`, err instanceof Error ? err.message : err)
    return fallback
  }
}

function writeJson(file: string, data: unknown) {
  writeFileSync(join(DATA_DIR, file), JSON.stringify(data, null, 2))
}

interface StoreRow { id: string; [k: string]: unknown }
interface ScopedRow { storeId: string; [k: string]: unknown }

const stores = readJsonOr<StoreRow[]>('stores.json', [])
const categories = readJsonOr<ScopedRow[]>('categories.json', [])
const menuItems = readJsonOr<ScopedRow[]>('menu-items.json', [])
const tables = readJsonOr<ScopedRow[]>('tables.json', [])

const before = {
  stores: stores.length,
  categories: categories.length,
  menuItems: menuItems.length,
  tables: tables.length,
}

// Replace store-003 entries — keep everyone else intact
const newStores = stores.filter(s => s.id !== store3Id).concat([store3StoreEntry as StoreRow])
const newCategories = categories.filter(c => c.storeId !== store3Id).concat(store3Categories as ScopedRow[])
const newMenuItems = menuItems.filter(m => m.storeId !== store3Id).concat(store3MenuItems as ScopedRow[])
const newTables = tables.filter(t => t.storeId !== store3Id).concat(store3Tables as ScopedRow[])

writeJson('stores.json', newStores)
writeJson('categories.json', newCategories)
writeJson('menu-items.json', newMenuItems)
writeJson('tables.json', newTables)

const after = {
  stores: newStores.length,
  categories: newCategories.length,
  menuItems: newMenuItems.length,
  tables: newTables.length,
}

console.log('✅ store-003 partial seed complete\n')
console.log('Counts (before → after):')
console.log(`  stores:     ${before.stores} → ${after.stores}`)
console.log(`  categories: ${before.categories} → ${after.categories}`)
console.log(`  menu-items: ${before.menuItems} → ${after.menuItems}`)
console.log(`  tables:     ${before.tables} → ${after.tables}`)
console.log(`\nstore-003 now has:`)
console.log(`  ${store3Categories.length} categories`)
console.log(`  ${store3MenuItems.length} menu items`)
console.log(`  ${store3Tables.length} tables`)
console.log(`\nTables:`)
console.log(`  ${store3Tables.map(t => `${t.name} (${t.id})`).join(', ')}`)
console.log(`\nNot touched: orders.json, sessions.json, payments.json`)

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

// Resolve data directory the same way json-store does
const __filename2 = typeof __filename !== 'undefined' ? __filename : fileURLToPath(import.meta.url)
const __dirname2 = typeof __dirname !== 'undefined' ? __dirname : dirname(__filename2)
const DATA_DIR = join(__dirname2, '../../data')

const BASE_URL = process.argv[2] || 'http://localhost:5173'

interface TableData {
  id: string
  storeId: string
  name: string
}

// Read tables.json
const tables: TableData[] = JSON.parse(readFileSync(join(DATA_DIR, 'tables.json'), 'utf-8'))

console.log('=== QR Code URLs for Tables ===\n')
console.log(`Base URL: ${BASE_URL}\n`)

for (const table of tables) {
  const url = `${BASE_URL}/scan/${table.storeId}/${table.id}`
  console.log(`Table ${table.name}: ${url}`)
}

console.log('\nUse any QR code generator to create QR codes from these URLs.')
console.log('For example: https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=URL')

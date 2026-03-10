import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename2 = typeof __filename !== 'undefined' ? __filename : fileURLToPath(import.meta.url)
const __dirname2 = typeof __dirname !== 'undefined' ? __dirname : dirname(__filename2)
const DATA_DIR = join(__dirname2, '../../data')

export class JsonStore<T extends { id: string }> {
  private filePath: string
  private data: T[]

  constructor(filename: string) {
    mkdirSync(DATA_DIR, { recursive: true })
    this.filePath = join(DATA_DIR, filename)
    this.data = this.load()
  }

  private load(): T[] {
    if (!existsSync(this.filePath)) return []
    const raw = readFileSync(this.filePath, 'utf-8')
    return JSON.parse(raw)
  }

  private save(): void {
    writeFileSync(this.filePath, JSON.stringify(this.data, null, 2))
  }

  getAll(): T[] {
    return [...this.data]
  }

  getById(id: string): T | undefined {
    return this.data.find(item => item.id === id)
  }

  getByField<K extends keyof T>(field: K, value: T[K]): T[] {
    return this.data.filter(item => item[field] === value)
  }

  create(item: T): T {
    this.data.push(item)
    this.save()
    return item
  }

  update(id: string, updates: Partial<T>): T | undefined {
    const index = this.data.findIndex(item => item.id === id)
    if (index === -1) return undefined
    this.data[index] = { ...this.data[index], ...updates }
    this.save()
    return this.data[index]
  }

  delete(id: string): boolean {
    const before = this.data.length
    this.data = this.data.filter(item => item.id !== id)
    if (this.data.length < before) {
      this.save()
      return true
    }
    return false
  }
}

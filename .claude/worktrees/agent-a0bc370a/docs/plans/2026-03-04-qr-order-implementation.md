# QR Order System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a working QR code restaurant ordering MVP — customer scans QR, browses menu, adds to cart, places order; admin views and updates orders.

**Architecture:** pnpm monorepo with `client/` (Vite + React + shadcn/ui + zustand), `server/` (Express + TypeScript, MVC), and `shared/` (types). JSON file storage for MVP.

**Tech Stack:** pnpm workspaces, Vite, React 19, TypeScript, React Router, shadcn/ui (Tailwind), zustand, Express, uuid, cors

**Design doc:** `docs/plans/2026-03-04-qr-order-design.md`

---

## Task 1: Initialize pnpm Monorepo + Shared Types

**Files:**
- Create: `package.json` (workspace root)
- Create: `pnpm-workspace.yaml`
- Create: `shared/package.json`
- Create: `shared/types.ts`
- Create: `.gitignore`

**Step 1: Initialize workspace root**

```bash
cd /Users/evergreen/Desktop/个人代码/QR_Code
git init
```

Create `pnpm-workspace.yaml`:
```yaml
packages:
  - 'client'
  - 'server'
  - 'shared'
```

Create root `package.json`:
```json
{
  "name": "qr-order",
  "private": true,
  "scripts": {
    "dev": "pnpm --parallel -r run dev",
    "dev:client": "pnpm --filter client dev",
    "dev:server": "pnpm --filter server dev"
  }
}
```

Create `.gitignore`:
```
node_modules/
dist/
server/data/*.json
!server/data/seed.json
.env
```

**Step 2: Create shared types package**

Create `shared/package.json`:
```json
{
  "name": "@qr-order/shared",
  "version": "0.0.1",
  "private": true,
  "main": "types.ts"
}
```

Create `shared/types.ts` with all interfaces from design doc:
```typescript
// ===== Store =====
export interface Store {
  id: string
  name: string
  logo?: string
  description?: string
  openingHours?: string
  createdAt: string
}

// ===== User/Role =====
export type Role = 'owner' | 'staff'

export interface StoreUser {
  id: string
  storeId: string
  username: string
  passwordHash: string
  role: Role
  name: string
  createdAt: string
}

// ===== Menu =====
export interface Category {
  id: string
  storeId: string
  name: string
  sortOrder: number
}

export interface MenuItem {
  id: string
  storeId: string
  categoryId: string
  name: string
  description?: string
  price: number
  image?: string
  available: boolean
  sortOrder: number
}

// ===== Tables =====
export interface Table {
  id: string
  storeId: string
  name: string
  qrCode?: string
  status: 'idle' | 'occupied'
  currentOrderId?: string
}

// ===== Cart (frontend only) =====
export interface CartItem {
  menuItemId: string
  name: string
  price: number
  quantity: number
  remark?: string
}

// ===== Orders =====
export type OrderStatus = 'pending' | 'preparing' | 'completed'

export interface OrderItem {
  menuItemId: string
  name: string
  price: number
  quantity: number
  remark?: string
}

export interface Order {
  id: string
  orderNumber: string
  storeId: string
  tableId: string
  tableName: string
  items: OrderItem[]
  totalPrice: number
  status: OrderStatus
  customerName?: string
  createdAt: string
  updatedAt: string
}

// ===== API Request/Response types =====
export interface CreateOrderRequest {
  tableId: string
  items: { menuItemId: string; quantity: number; remark?: string }[]
  customerName?: string
}

export interface UpdateOrderStatusRequest {
  status: OrderStatus
}

export interface MenuResponse {
  store: Pick<Store, 'id' | 'name' | 'logo' | 'description' | 'openingHours'>
  categories: (Category & { items: MenuItem[] })[]
}
```

**Step 3: Commit**

```bash
git add package.json pnpm-workspace.yaml .gitignore shared/
git commit -m "feat: initialize pnpm monorepo with shared types"
```

---

## Task 2: Setup Express Server with JSON Storage

**Files:**
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/src/app.ts`
- Create: `server/src/storage/json-store.ts`
- Create: `server/data/seed.json`

**Step 1: Initialize server package**

```bash
cd /Users/evergreen/Desktop/个人代码/QR_Code
mkdir -p server/src server/data
```

Create `server/package.json`:
```json
{
  "name": "@qr-order/server",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/app.ts",
    "start": "tsx src/app.ts"
  },
  "dependencies": {
    "@qr-order/shared": "workspace:*",
    "cors": "^2.8.5",
    "express": "^4.21.0",
    "uuid": "^11.0.0"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^5.0.0",
    "@types/uuid": "^10.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0"
  }
}
```

Create `server/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "outDir": "dist",
    "rootDir": "src",
    "resolveJsonModule": true,
    "declaration": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "references": [{ "path": "../shared" }]
}
```

**Step 2: Create JSON storage layer**

Create `server/src/storage/json-store.ts`:
```typescript
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

const DATA_DIR = join(import.meta.dirname, '../../data')

export class JsonStore<T extends { id: string }> {
  private filePath: string
  private data: T[]

  constructor(filename: string) {
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
```

**Step 3: Create seed data**

Create `server/data/seed.json` — this file is a script that will be used to initialize data. Instead, create individual JSON data files:

Create `server/src/seed.ts`:
```typescript
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { v4 as uuid } from 'uuid'

const DATA_DIR = join(import.meta.dirname, '../data')
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
  // 热菜
  { id: uuid(), storeId, categoryId: categories[0].id, name: '宫保鸡丁', description: '经典川菜', price: 3800, available: true, sortOrder: 1 },
  { id: uuid(), storeId, categoryId: categories[0].id, name: '麻婆豆腐', description: '麻辣鲜香', price: 2800, available: true, sortOrder: 2 },
  { id: uuid(), storeId, categoryId: categories[0].id, name: '红烧肉', description: '肥而不腻', price: 4500, available: true, sortOrder: 3 },
  // 凉菜
  { id: uuid(), storeId, categoryId: categories[1].id, name: '拍黄瓜', description: '清爽开胃', price: 1200, available: true, sortOrder: 1 },
  { id: uuid(), storeId, categoryId: categories[1].id, name: '凉拌木耳', description: '营养健康', price: 1500, available: true, sortOrder: 2 },
  // 饮品
  { id: uuid(), storeId, categoryId: categories[2].id, name: '柠檬水', price: 800, available: true, sortOrder: 1 },
  { id: uuid(), storeId, categoryId: categories[2].id, name: '可乐', price: 600, available: true, sortOrder: 2 },
  { id: uuid(), storeId, categoryId: categories[2].id, name: '酸梅汤', price: 1000, available: true, sortOrder: 3 },
  // 主食
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
```

**Step 4: Create Express app entry**

Create `server/src/app.ts`:
```typescript
import express from 'express'
import cors from 'cors'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Routes will be added in subsequent tasks

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
```

**Step 5: Install dependencies and seed**

```bash
cd /Users/evergreen/Desktop/个人代码/QR_Code
pnpm install
pnpm --filter server exec tsx src/seed.ts
```

**Step 6: Test server starts**

```bash
pnpm --filter server dev
# Expected: "Server running on http://localhost:3001"
# In another terminal: curl http://localhost:3001/api/health
# Expected: {"status":"ok","timestamp":"..."}
```

**Step 7: Commit**

```bash
git add server/ shared/
git commit -m "feat: add Express server with JSON storage and seed data"
```

---

## Task 3: Server MVP API — Menu + Orders

**Files:**
- Create: `server/src/routes/menu.routes.ts`
- Create: `server/src/routes/order.routes.ts`
- Create: `server/src/services/menu.service.ts`
- Create: `server/src/services/order.service.ts`
- Modify: `server/src/app.ts` (register routes)

**Step 1: Create menu service**

Create `server/src/services/menu.service.ts`:
```typescript
import { JsonStore } from '../storage/json-store.js'
import type { Store, Category, MenuItem, MenuResponse } from '@qr-order/shared'

const storeStore = new JsonStore<Store>('stores.json')
const categoryStore = new JsonStore<Category>('categories.json')
const menuItemStore = new JsonStore<MenuItem>('menu-items.json')

export function getMenu(storeId: string): MenuResponse | null {
  const store = storeStore.getById(storeId)
  if (!store) return null

  const categories = categoryStore
    .getByField('storeId', storeId)
    .sort((a, b) => a.sortOrder - b.sortOrder)

  const allItems = menuItemStore
    .getByField('storeId', storeId)
    .filter(item => item.available)

  const categoriesWithItems = categories.map(cat => ({
    ...cat,
    items: allItems
      .filter(item => item.categoryId === cat.id)
      .sort((a, b) => a.sortOrder - b.sortOrder)
  }))

  return {
    store: {
      id: store.id,
      name: store.name,
      logo: store.logo,
      description: store.description,
      openingHours: store.openingHours,
    },
    categories: categoriesWithItems
  }
}

export function getMenuItemById(id: string): MenuItem | undefined {
  return menuItemStore.getById(id)
}
```

**Step 2: Create order service**

Create `server/src/services/order.service.ts`:
```typescript
import { v4 as uuid } from 'uuid'
import { JsonStore } from '../storage/json-store.js'
import { getMenuItemById } from './menu.service.js'
import type { Order, Table, CreateOrderRequest, OrderStatus } from '@qr-order/shared'

const orderStore = new JsonStore<Order>('orders.json')
const tableStore = new JsonStore<Table>('tables.json')

let orderCounter = orderStore.getAll().length

function generateOrderNumber(): string {
  orderCounter++
  const letter = String.fromCharCode(65 + Math.floor((orderCounter - 1) / 999) % 26)
  const num = ((orderCounter - 1) % 999) + 1
  return `${letter}${String(num).padStart(3, '0')}`
}

export function createOrder(storeId: string, req: CreateOrderRequest): Order | { error: string } {
  const table = tableStore.getById(req.tableId)
  if (!table || table.storeId !== storeId) {
    return { error: 'Table not found' }
  }

  if (req.items.length === 0) {
    return { error: 'Order must have at least one item' }
  }

  const orderItems = []
  let totalPrice = 0

  for (const item of req.items) {
    const menuItem = getMenuItemById(item.menuItemId)
    if (!menuItem || menuItem.storeId !== storeId || !menuItem.available) {
      return { error: `Menu item ${item.menuItemId} not available` }
    }
    if (item.quantity < 1) {
      return { error: 'Quantity must be at least 1' }
    }
    const lineTotal = menuItem.price * item.quantity
    totalPrice += lineTotal
    orderItems.push({
      menuItemId: menuItem.id,
      name: menuItem.name,
      price: menuItem.price,
      quantity: item.quantity,
      remark: item.remark,
    })
  }

  const now = new Date().toISOString()
  const order: Order = {
    id: uuid(),
    orderNumber: generateOrderNumber(),
    storeId,
    tableId: table.id,
    tableName: table.name,
    items: orderItems,
    totalPrice,
    status: 'pending',
    customerName: req.customerName,
    createdAt: now,
    updatedAt: now,
  }

  orderStore.create(order)
  tableStore.update(table.id, { status: 'occupied', currentOrderId: order.id })

  return order
}

export function getOrders(storeId: string, status?: OrderStatus): Order[] {
  let orders = orderStore.getByField('storeId', storeId)
  if (status) {
    orders = orders.filter(o => o.status === status)
  }
  return orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export function updateOrderStatus(storeId: string, orderId: string, status: OrderStatus): Order | { error: string } {
  const order = orderStore.getById(orderId)
  if (!order || order.storeId !== storeId) {
    return { error: 'Order not found' }
  }

  const updated = orderStore.update(orderId, {
    status,
    updatedAt: new Date().toISOString(),
  })

  if (status === 'completed') {
    tableStore.update(order.tableId, { status: 'idle', currentOrderId: undefined })
  }

  return updated!
}
```

**Step 3: Create route files**

Create `server/src/routes/menu.routes.ts`:
```typescript
import { Router } from 'express'
import { getMenu } from '../services/menu.service.js'

const router = Router({ mergeParams: true })

router.get('/', (req, res) => {
  const menu = getMenu(req.params.storeId)
  if (!menu) {
    res.status(404).json({ error: 'Store not found' })
    return
  }
  res.json(menu)
})

export default router
```

Create `server/src/routes/order.routes.ts`:
```typescript
import { Router } from 'express'
import { createOrder, getOrders, updateOrderStatus } from '../services/order.service.js'
import type { OrderStatus } from '@qr-order/shared'

const router = Router({ mergeParams: true })

router.post('/', (req, res) => {
  const result = createOrder(req.params.storeId, req.body)
  if ('error' in result) {
    res.status(400).json(result)
    return
  }
  res.status(201).json(result)
})

router.get('/', (req, res) => {
  const status = req.query.status as OrderStatus | undefined
  const orders = getOrders(req.params.storeId, status)
  res.json(orders)
})

router.patch('/:orderId/status', (req, res) => {
  const result = updateOrderStatus(req.params.storeId, req.params.orderId, req.body.status)
  if ('error' in result) {
    res.status(404).json(result)
    return
  }
  res.json(result)
})

export default router
```

**Step 4: Register routes in app.ts**

Modify `server/src/app.ts` — add after the health check:
```typescript
import menuRoutes from './routes/menu.routes.js'
import orderRoutes from './routes/order.routes.js'

app.use('/api/stores/:storeId/menu', menuRoutes)
app.use('/api/stores/:storeId/orders', orderRoutes)
```

**Step 5: Test manually with curl**

```bash
# Get menu
curl http://localhost:3001/api/stores/store-demo-001/menu | jq .

# Create order (use actual tableId and menuItemId from seed)
curl -X POST http://localhost:3001/api/stores/store-demo-001/orders \
  -H "Content-Type: application/json" \
  -d '{"tableId":"TABLE_ID","items":[{"menuItemId":"ITEM_ID","quantity":2}]}'

# List orders
curl http://localhost:3001/api/stores/store-demo-001/orders | jq .

# Update status
curl -X PATCH http://localhost:3001/api/stores/store-demo-001/orders/ORDER_ID/status \
  -H "Content-Type: application/json" \
  -d '{"status":"preparing"}'
```

**Step 6: Commit**

```bash
git add server/src/
git commit -m "feat: add MVP API routes — menu and orders"
```

---

## Task 4: Setup Vite + React Client with shadcn/ui

**Files:**
- Create: `client/` (via Vite scaffolding)
- Configure: shadcn/ui, Tailwind, React Router, zustand

**Step 1: Scaffold Vite React project**

```bash
cd /Users/evergreen/Desktop/个人代码/QR_Code
pnpm create vite client --template react-ts
```

**Step 2: Add workspace dependency and install packages**

Add to `client/package.json` dependencies:
```json
{
  "dependencies": {
    "@qr-order/shared": "workspace:*",
    "react-router-dom": "^7.0.0",
    "zustand": "^5.0.0"
  }
}
```

```bash
cd /Users/evergreen/Desktop/个人代码/QR_Code
pnpm install
```

**Step 3: Setup shadcn/ui**

```bash
cd client
pnpm add -D tailwindcss @tailwindcss/vite
pnpm dlx shadcn@latest init
# Choose: New York style, Zinc color, CSS variables: yes
```

Follow shadcn/ui setup prompts. This creates `components.json`, updates `tailwind.config`, adds CSS.

**Step 4: Install shadcn components we'll need**

```bash
cd client
pnpm dlx shadcn@latest add button card badge separator scroll-area input textarea sheet dialog
```

**Step 5: Setup React Router**

Create `client/src/App.tsx`:
```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ScanPage from './views/customer/ScanPage'
import MenuPage from './views/customer/MenuPage'
import CartPage from './views/customer/CartPage'
import OrderConfirmPage from './views/customer/OrderConfirmPage'
import DashboardPage from './views/admin/DashboardPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Customer routes */}
        <Route path="/scan/:storeId/:tableId" element={<ScanPage />} />
        <Route path="/menu/:storeId" element={<MenuPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/order/confirm" element={<OrderConfirmPage />} />

        {/* Admin routes */}
        <Route path="/admin/dashboard" element={<DashboardPage />} />

        {/* Default redirect */}
        <Route path="*" element={<Navigate to="/admin/dashboard" />} />
      </Routes>
    </BrowserRouter>
  )
}
```

**Step 6: Create placeholder pages**

Create stub components for each page (just returning a `<div>Page Name</div>`) so the router compiles:
- `client/src/views/customer/ScanPage.tsx`
- `client/src/views/customer/MenuPage.tsx`
- `client/src/views/customer/CartPage.tsx`
- `client/src/views/customer/OrderConfirmPage.tsx`
- `client/src/views/admin/DashboardPage.tsx`

**Step 7: Configure Vite proxy**

In `client/vite.config.ts`, add proxy to avoid CORS in dev:
```typescript
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
})
```

**Step 8: Verify client starts**

```bash
cd /Users/evergreen/Desktop/个人代码/QR_Code
pnpm dev:client
# Expected: Vite dev server starts, browser shows placeholder page
```

**Step 9: Commit**

```bash
git add client/
git commit -m "feat: scaffold Vite React client with shadcn/ui and routing"
```

---

## Task 5: API Service Layer + Cart Store (Frontend)

**Files:**
- Create: `client/src/services/api.ts`
- Create: `client/src/stores/cart-store.ts`
- Create: `client/src/stores/session-store.ts`
- Create: `client/src/lib/format.ts`

**Step 1: Create API service**

Create `client/src/services/api.ts`:
```typescript
import type { MenuResponse, CreateOrderRequest, Order, OrderStatus } from '@qr-order/shared'

const BASE = '/api'

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Network error' }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

export const api = {
  getMenu: (storeId: string) =>
    fetchJSON<MenuResponse>(`/stores/${storeId}/menu`),

  createOrder: (storeId: string, data: CreateOrderRequest) =>
    fetchJSON<Order>(`/stores/${storeId}/orders`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getOrders: (storeId: string, status?: OrderStatus) =>
    fetchJSON<Order[]>(`/stores/${storeId}/orders${status ? `?status=${status}` : ''}`),

  updateOrderStatus: (storeId: string, orderId: string, status: OrderStatus) =>
    fetchJSON<Order>(`/stores/${storeId}/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
}
```

**Step 2: Create cart store**

Create `client/src/stores/cart-store.ts`:
```typescript
import { create } from 'zustand'
import type { CartItem } from '@qr-order/shared'

interface CartState {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void
  removeItem: (menuItemId: string) => void
  updateQuantity: (menuItemId: string, quantity: number) => void
  updateRemark: (menuItemId: string, remark: string) => void
  clearCart: () => void
  totalPrice: () => number
  totalItems: () => number
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],

  addItem: (item) => set(state => {
    const existing = state.items.find(i => i.menuItemId === item.menuItemId)
    if (existing) {
      return {
        items: state.items.map(i =>
          i.menuItemId === item.menuItemId
            ? { ...i, quantity: i.quantity + (item.quantity ?? 1) }
            : i
        )
      }
    }
    return { items: [...state.items, { ...item, quantity: item.quantity ?? 1 }] }
  }),

  removeItem: (menuItemId) => set(state => ({
    items: state.items.filter(i => i.menuItemId !== menuItemId)
  })),

  updateQuantity: (menuItemId, quantity) => set(state => {
    if (quantity <= 0) {
      return { items: state.items.filter(i => i.menuItemId !== menuItemId) }
    }
    return {
      items: state.items.map(i =>
        i.menuItemId === menuItemId ? { ...i, quantity } : i
      )
    }
  }),

  updateRemark: (menuItemId, remark) => set(state => ({
    items: state.items.map(i =>
      i.menuItemId === menuItemId ? { ...i, remark } : i
    )
  })),

  clearCart: () => set({ items: [] }),

  totalPrice: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),

  totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
}))
```

**Step 3: Create session store**

Create `client/src/stores/session-store.ts`:
```typescript
import { create } from 'zustand'

interface SessionState {
  storeId: string | null
  tableId: string | null
  tableName: string | null
  setSession: (storeId: string, tableId: string, tableName?: string) => void
  clearSession: () => void
}

export const useSessionStore = create<SessionState>((set) => ({
  storeId: null,
  tableId: null,
  tableName: null,
  setSession: (storeId, tableId, tableName) => set({ storeId, tableId, tableName }),
  clearSession: () => set({ storeId: null, tableId: null, tableName: null }),
}))
```

**Step 4: Create format utility**

Create `client/src/lib/format.ts`:
```typescript
/** Convert cents to display price string, e.g. 3800 → "38.00" */
export function formatPrice(cents: number): string {
  return (cents / 100).toFixed(2)
}

/** Convert cents to display with currency, e.g. 3800 → "¥38.00" */
export function formatPriceCNY(cents: number): string {
  return `¥${formatPrice(cents)}`
}
```

**Step 5: Commit**

```bash
git add client/src/services/ client/src/stores/ client/src/lib/
git commit -m "feat: add API service, cart store, session store, and format utils"
```

---

## Task 6: Customer — Scan Page + Menu Page

**Files:**
- Modify: `client/src/views/customer/ScanPage.tsx`
- Modify: `client/src/views/customer/MenuPage.tsx`

**Step 1: Implement ScanPage**

This page is the QR code landing page. It reads storeId/tableId from URL params, saves to session store, and redirects to menu.

`client/src/views/customer/ScanPage.tsx`:
```tsx
import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSessionStore } from '../../stores/session-store'
import { useCartStore } from '../../stores/cart-store'

export default function ScanPage() {
  const { storeId, tableId } = useParams<{ storeId: string; tableId: string }>()
  const setSession = useSessionStore(s => s.setSession)
  const clearCart = useCartStore(s => s.clearCart)
  const navigate = useNavigate()

  useEffect(() => {
    if (storeId && tableId) {
      clearCart()
      setSession(storeId, tableId)
      navigate(`/menu/${storeId}`, { replace: true })
    }
  }, [storeId, tableId, setSession, clearCart, navigate])

  return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-muted-foreground">Loading...</p>
    </div>
  )
}
```

**Step 2: Implement MenuPage**

`client/src/views/customer/MenuPage.tsx` — full implementation with:
- Left sidebar: category list
- Right area: menu items grouped by category
- Bottom bar: cart summary + "Go to Cart" button
- Add to cart functionality with +/- buttons

This is the most complex page. Key elements:
- Fetch menu from API on mount
- Category sidebar with active state tracking on scroll
- MenuItem cards with add-to-cart button
- Floating cart summary bar at bottom

(Full implementation code — approximately 150 lines of TSX using shadcn Card, Button, Badge, ScrollArea components)

**Step 3: Test by visiting**

```
http://localhost:5173/scan/store-demo-001/TABLE_ID
```

Should redirect to menu page showing categories and items.

**Step 4: Commit**

```bash
git add client/src/views/customer/
git commit -m "feat: implement ScanPage and MenuPage for customer ordering"
```

---

## Task 7: Customer — Cart Page + Order Confirmation

**Files:**
- Modify: `client/src/views/customer/CartPage.tsx`
- Modify: `client/src/views/customer/OrderConfirmPage.tsx`

**Step 1: Implement CartPage**

Shows all cart items with quantity controls, remark input, total price, and submit button. Uses zustand cart store.

**Step 2: Implement OrderConfirmPage**

Submits order via API, shows success with order number, provides "Back to Menu" button.

**Step 3: Test full customer flow**

```
Scan → Menu → Add items → Cart → Submit → See order number
```

**Step 4: Commit**

```bash
git add client/src/views/customer/
git commit -m "feat: implement CartPage and OrderConfirmPage"
```

---

## Task 8: Admin — Order Dashboard

**Files:**
- Modify: `client/src/views/admin/DashboardPage.tsx`

**Step 1: Implement DashboardPage**

- Tabs/filter for order status: All / Pending / Preparing / Completed
- Order cards showing: orderNumber, tableName, items, totalPrice, status, createdAt
- Status action buttons: Pending → "Start Preparing", Preparing → "Mark Completed"
- Auto-refresh with polling (every 5 seconds for MVP, replace with WebSocket later)
- Hardcode storeId as `store-demo-001` for MVP

**Step 2: Test admin flow**

1. Customer places order at `http://localhost:5173/scan/store-demo-001/TABLE_ID`
2. Admin opens `http://localhost:5173/admin/dashboard`
3. Sees new order with "pending" status
4. Clicks "Start Preparing" → status changes
5. Clicks "Mark Completed" → order moves to completed tab

**Step 3: Commit**

```bash
git add client/src/views/admin/
git commit -m "feat: implement admin order dashboard with status management"
```

---

## Task 9: Polish + QR Code Generation Helper

**Files:**
- Create: `server/src/routes/table.routes.ts`
- Modify: `server/src/app.ts`
- Create: `scripts/generate-qr.ts`

**Step 1: Add tables list endpoint**

So admin can see which tables exist and generate QR codes.

**Step 2: Create QR code generation script**

A simple Node script that prints the QR code URL for each table:
```bash
pnpm --filter server exec tsx src/scripts/print-table-urls.ts
# Output:
# Table A1: http://localhost:5173/scan/store-demo-001/uuid-xxx
# Table A2: http://localhost:5173/scan/store-demo-001/uuid-yyy
# ...
```

This can be used to generate QR code images with any QR code generator.

**Step 3: Commit**

```bash
git add server/ scripts/
git commit -m "feat: add table listing API and QR URL generation script"
```

---

## Summary of Implementation Order

| Task | Description | Estimated Effort |
|------|-------------|-----------------|
| 1 | Monorepo + shared types | Small |
| 2 | Express server + JSON storage + seed | Medium |
| 3 | MVP API (menu + orders) | Medium |
| 4 | Vite + React + shadcn/ui scaffold | Medium |
| 5 | API service + cart store + session store | Small |
| 6 | Customer: Scan + Menu pages | Large |
| 7 | Customer: Cart + Order confirm | Medium |
| 8 | Admin: Order dashboard | Medium |
| 9 | Polish + QR generation | Small |

**After all 9 tasks:** Full working MVP where customers scan QR, browse menu, order; admin sees and manages orders.

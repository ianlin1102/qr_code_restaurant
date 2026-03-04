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

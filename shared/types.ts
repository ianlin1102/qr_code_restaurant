// ===== Store =====
export interface Store {
  id: string
  name: string
  nameEn?: string
  logo?: string
  description?: string
  descriptionEn?: string
  openingHours?: string
  announcement?: string
  createdAt: string
}

export type UpdateStoreRequest = Pick<Store, 'name'> & Partial<Pick<Store, 'description' | 'openingHours' | 'announcement'>>

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
  nameEn?: string
  sortOrder: number
}

export interface MenuItemOptionChoice {
  id: string
  name: string
  nameEn?: string
  priceAdjust: number // cents, 0 = no extra charge
}

export interface MenuItemOption {
  id: string
  name: string // e.g. "辣度", "口味", "份量"
  nameEn?: string
  required: boolean
  choices: MenuItemOptionChoice[]
}

export interface MenuItem {
  id: string
  storeId: string
  categoryId: string
  name: string
  nameEn?: string
  description?: string
  descriptionEn?: string
  price: number
  image?: string
  available: boolean
  sortOrder: number
  options?: MenuItemOption[]
}

// ===== Tables =====
export interface Table {
  id: string
  storeId: string
  name: string
  nameEn?: string
  qrCode?: string
  status: 'idle' | 'occupied'
  currentOrderId?: string
}

// ===== Cart (frontend only) =====
export interface SelectedOption {
  optionId: string
  optionName: string
  optionNameEn?: string
  choiceId: string
  choiceName: string
  choiceNameEn?: string
  priceAdjust: number
}

export interface CartItem {
  menuItemId: string
  name: string
  price: number // base price
  quantity: number
  remark?: string
  selectedOptions?: SelectedOption[]
}

// ===== Orders =====
export type OrderStatus = 'pending' | 'paid' | 'preparing' | 'completed' | 'closed'

export interface OrderItem {
  menuItemId: string
  name: string
  nameEn?: string
  price: number // base price
  quantity: number
  remark?: string
  selectedOptions?: SelectedOption[]
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
  paymentIntentId?: string
  customerName?: string
  createdAt: string
  updatedAt: string
}

// ===== Auth =====
export interface JwtPayload {
  userId: string
  storeId: string
  role: 'owner' | 'staff'
}

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  token: string
  user: { id: string; username: string; role: string; storeId: string }
}

// ===== API Request/Response types =====
export interface CreateOrderRequest {
  tableId: string
  items: {
    menuItemId: string
    quantity: number
    remark?: string
    selectedOptions?: SelectedOption[]
  }[]
  customerName?: string
}

export interface UpdateOrderStatusRequest {
  status: OrderStatus
}

export interface UpdateOrderItemsRequest {
  items: OrderItem[]
}

export interface MenuResponse {
  store: Pick<Store, 'id' | 'name' | 'logo' | 'description' | 'openingHours' | 'announcement'>
  categories: (Category & { items: MenuItem[] })[]
}

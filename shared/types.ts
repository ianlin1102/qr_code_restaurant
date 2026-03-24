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
  autoAcceptOrders?: boolean
  updatedAt?: string
}

export type UpdateStoreRequest = Pick<Store, 'name'> & Partial<Pick<Store, 'description' | 'openingHours' | 'announcement' | 'autoAcceptOrders'>>

// ===== User/Role =====
export type Role = 'owner' | 'staff'

export interface StoreUser {
  id: string
  storeId: string
  username: string
  password: string
  role: Role
  createdAt: string
}

// ===== Menu =====
export interface Category {
  id: string
  storeId: string
  name: string
  nameEn?: string
  sortOrder: number
  active?: boolean
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
  originalPrice?: number
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
  status: 'idle' | 'occupied' | 'cleaning' | 'bill-requested'
  currentOrderId?: string
  zone?: string
  capacity?: number
  x?: number
  y?: number
  width?: number
  height?: number
  shape?: 'square' | 'round' | 'long'
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
  isPaid: boolean
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

export interface AuthUser {
  id: string
  username: string
  role: string
  storeId: string
}

export interface LoginResponse {
  token: string
  user: AuthUser
}

// ===== Coupon =====
export type DiscountType = 'percentage' | 'fixed' | 'bogo'

export interface Coupon {
  id: string
  storeId: string
  code: string
  discountType: DiscountType
  discountValue: number
  minOrderAmount?: number
  maxUses?: number
  currentUses: number
  active: boolean
  expiresAt?: string
  createdAt: string
}

// ===== Analytics =====
export interface DailyStats {
  date: string
  orderCount: number
  revenue: number
  avgOrderValue: number
}

export interface TopItem {
  menuItemId: string
  name: string
  nameEn?: string
  quantity: number
  revenue: number
}

export interface AnalyticsResponse {
  dailyStats: DailyStats[]
  topItems: TopItem[]
  totalOrders: number
  totalRevenue: number
  avgOrderValue: number
}

// ===== Waitlist =====
export interface WaitlistEntry {
  id: string
  storeId: string
  name: string
  partySize: number
  phone?: string
  estimatedWait?: number
  status: 'waiting' | 'seated' | 'cancelled'
  createdAt: string
}

// ===== Split Bill =====
export interface SplitBillShare {
  personName: string
  items: { menuItemId: string; name: string; quantity: number; amount: number }[]
  amount: number
}

export interface SplitBillRequest {
  orderId: string
  mode: 'equal' | 'by-item'
  numberOfPeople?: number
  shares?: SplitBillShare[]
}

export interface SplitBillSession {
  orderId: string
  shares: (SplitBillShare & { clientSecret?: string; paid: boolean })[]
  totalAmount: number
}

// ===== Printer =====
export interface PrinterConfig {
  id: string
  storeId: string
  name: string
  type: 'usb' | 'network'
  address?: string
  enabled: boolean
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

export interface MenuResponse {
  store: Pick<Store, 'id' | 'name' | 'logo' | 'description' | 'openingHours' | 'announcement'>
  categories: (Category & { items: MenuItem[] })[]
}

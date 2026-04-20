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
  announcementEn?: string
  createdAt: string
  autoAcceptOrders?: boolean
  updatedAt?: string
  maxTables?: number
  paymentMode?: 'pay-first' | 'pay-later'
  taxRate?: number               // e.g. 8.875 means 8.875%
  serviceFeeRate?: number        // e.g. 15 means 15%
  tipBase?: 'pretax' | 'posttax' // tip percentage basis (default: pretax)
}

export type UpdateStoreRequest = Pick<Store, 'name'> & Partial<Pick<Store,
  'description' | 'openingHours' | 'announcement' | 'announcementEn' |
  'autoAcceptOrders' | 'maxTables' | 'paymentMode' | 'taxRate' | 'serviceFeeRate' | 'tipBase'
>>

// ===== User/Role =====
export type Permission =
  // core
  | 'orders:read' | 'orders:write'
  | 'menu:read' | 'menu:write'
  | 'tables:read' | 'tables:write'
  | 'settings:read' | 'settings:write'
  | 'billing:read' | 'billing:write'
  // analytics module
  | 'analytics:read'
  // coupons module
  | 'coupons:read' | 'coupons:write'
  // waitlist module
  | 'waitlist:read' | 'waitlist:write'
  // staff-management module
  | 'staff:manage'
  // printer module
  | 'printer:read' | 'printer:write'

export interface RoleDefinition {
  id: string
  storeId: string
  name: string
  nameEn?: string
  permissions: Permission[]
  isSystem: boolean
  createdAt: string
}

export interface StoreUser {
  id: string
  storeId: string
  username: string
  password: string          // hash
  role: RoleDefinition      // β 决议 5: string → RoleDefinition (denormalized FK; consume via role.name)
  roleId: string            // β 决议 5: required (NOT NULL, 对齐 Task 2 schema staff.role_id)
  clockPin?: string         // 4-digit PIN for clock-in/out
  createdAt: string
}

// ===== Time Tracking =====
export interface TimeEntry {
  id: string
  storeId: string
  userId: string       // → StoreUser.id
  clockIn: string      // ISO timestamp
  clockOut?: string    // ISO timestamp, null = currently clocked in
  duration?: number    // minutes, computed on clock-out
}

// ===== Menu =====
export const DIETARY_TAGS = [
  'vegetarian', 'vegan', 'gluten-free', 'contains-nuts', 'spicy', 'dairy-free',
] as const
export type DietaryTag = typeof DIETARY_TAGS[number]

export interface Category {
  id: string
  storeId: string
  name: string
  nameEn?: string
  sortOrder: number
  active?: boolean
  quickTags?: string[]
  hideQuickTags?: boolean      // when true, detail sheet hides the quick-tags section entirely
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
  staffOnly?: boolean            // visible to admin only, hidden from customer menu
  allowCustomPrice?: boolean     // admin can override price when ordering (ad-hoc item)
  sortOrder: number
  options?: MenuItemOption[]
  dietary?: DietaryTag[]
  isRecommended?: boolean
  quickTags?: string[]
}

// ===== Tables =====
export interface Table {
  id: string
  storeId: string
  name: string
  nameEn?: string
  number: number
  enabled: boolean
  status: 'idle' | 'occupied' | 'cleaning' | 'bill-requested'
  currentOrderId?: string     // DEPRECATED
  currentBillId?: string      // DEPRECATED
  currentSessionId?: string
  paymentMode?: 'pay-first' | 'pay-later' | null
  zone?: string
  capacity?: number
  x?: number
  y?: number
  width?: number
  height?: number
  shape?: 'square' | 'round' | 'long'
  waiterCalledAt?: string    // ISO timestamp; set when customer presses Call Waiter, cleared on admin ack
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
  addedBy?: string      // device display name ("Alice" or "Guest 1")
  addedByDevice?: string // device ID for dedup
}

// ===== Orders =====
// Phase 5 OrderStatus: 5 values (was 6; 'confirmed'/'paid'/'closed' merged or derived).
// Kitchen flow: draft → pending → preparing → served
// Draft: B2 cart (status='draft', not yet submitted).
// Voided: cancelled/refunded (replaces legacy 'closed' order semantics).
// Derived states (not in status):
//   已支付 = order.session.payments.some(p => p.status === 'confirmed' && covers(p, order))
//   已关闭 = order.session.status === 'closed'
//   已接单 = order.status === 'preparing' || order.status === 'served'
// 'confirmed' merged into 'preparing' (kitchen semantics equivalent).
export type OrderStatus = 'draft' | 'pending' | 'preparing' | 'served' | 'voided'

export interface OrderItem {
  menuItemId: string
  name: string
  nameEn?: string
  price: number // base price
  quantity: number
  remark?: string
  selectedOptions?: SelectedOption[]
  voided?: boolean        // true = price treated as 0, excluded from sales
  voidedAt?: string       // ISO timestamp
  voidedBy?: string       // userId of waiter who voided
  voidReason?: string     // optional reason
}

export interface Order {
  id: string
  orderNumber: string
  storeId: string
  tableId: string
  sessionId: string
  tableName: string
  tableNameEn?: string         // D68 snapshot: 下单时冻结英文桌名, 历史订单不受后续改名影响
  items: OrderItem[]
  totalPrice: number
  status: OrderStatus
  isPaid: boolean              // independent of status — true if paid at order time (pay-first)
  customerName?: string
  createdAt: string
  updatedAt: string
}

// ===== Session (dining session = one visit at a table) =====
// status: active (dining in progress) | closed (visit ended, soft close)
// isPaid: derived from totalPaid >= totalAmount
export interface Session {
  id: string
  storeId: string
  tableId: string
  status: 'active' | 'closed'
  orderIds: string[]
  couponId?: string
  couponCode?: string
  couponDiscountType?: DiscountType
  couponDiscountValue?: number
  settlementMode?: 'by-item' | 'by-percent'
  pendingCart?: Record<string, CartItem[]>  // deviceId → items, per-device shared cart
  cartVersion?: number           // incremented only on cart submission, for optimistic lock
  lastCartSubmitAt?: string      // ISO timestamp, set when cart is submitted as order
  createdAt: string
  closedAt?: string
}

// ===== Payment (immutable record, belongs to session) =====
export interface Payment {
  id: string
  sessionId: string
  storeId: string
  amount: number               // cents (food + tax + tip, capped at remaining if overpayment)
  tipAmount?: number           // cents, tip portion (excluded from bill settlement)
  refundAmount?: number        // cents, auto-refunded excess due to concurrent overpayment
  itemKeys?: string[]          // SSOT: which items this payment covers ("orderId:idx:qty" format)
  percent?: number             // SSOT: audit label for by-percent payments (1-100)
  stripePaymentIntentId?: string
  paidBy?: string              // customer name or "waiter" for cash
  method?: 'stripe' | 'cash'
  createdAt: string
}

// ===== Split Bill (admin-created sub-bills for a session) =====
export interface SplitBill {
  id: string
  sessionId: string
  storeId: string
  label: string               // "Bill 1", "Bill 2"
  type: 'by-item' | 'by-percent'
  itemKeys?: string[]         // "orderId:idx:qty" for by-item
  percent?: number            // 1-100, for by-percent
  subtotal: number            // cents
  tax: number                 // cents
  serviceFee: number          // cents
  total: number               // subtotal + tax + serviceFee
  status: 'unpaid' | 'paid' | 'pending-capture'
  paymentId?: string          // → Payment.id
  paymentIntentId?: string    // Stripe PI for manual capture
  paidAt?: string
  method?: 'stripe' | 'cash'
  createdAt: string
}

// ===== Auth =====
export interface JwtPayload {
  userId: string
  storeId: string
  role: RoleDefinition      // β 决议 5: string → RoleDefinition (D73 JWT 不向后兼容, deploy 全员 re-login)
  roleId: string
  permissions?: Permission[]
}

export interface AuthUser {
  id: string
  username: string
  role: RoleDefinition      // β 决议 5: string → RoleDefinition
  roleId: string
  permissions?: Permission[]
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
  store: Pick<Store, 'id' | 'name' | 'logo' | 'description' | 'openingHours' | 'announcement' | 'announcementEn'>
  categories: (Category & { items: MenuItem[] })[]
}

// ========== B2: Draft/Submitted 判别联合 ==========
// 设计原因：Cart 并入 Order 后，draft 状态的 order 不应流入 FIFO / summary / settlement。
// 类型判别让编译器在函数签名层阻止 draft 混入。
// Repository 层的 findSubmitted 默认排除 draft，findDraft 是显式 opt-in。
// 详见 docs/superpowers/specs/2026-04-17-phase5-postgres-migration-design.md §5.2

export type DraftOrder = Order & { status: 'draft' }
export type SubmittedOrder = Order & { status: Exclude<OrderStatus, 'draft'> }

export function isDraft(o: Order): o is DraftOrder {
  return o.status === 'draft'
}

export function isSubmitted(o: Order): o is SubmittedOrder {
  return o.status !== 'draft'
}

/**
 * Active order filter — used in kitchen/KDS views.
 * Excludes both draft (not submitted yet) and voided/closed states.
 */
export function isActiveOrder(o: Order): boolean {
  return o.status === 'pending' || o.status === 'preparing'
}

/**
 * Minimal interface for price calculation.
 * Does NOT replace OrderItem/CartItem/MenuItem — those keep their full
 * descriptions for display. Callers map business objects to PricingItem.
 */
export interface PricingItem {
  price: number                           // Base price (cents)
  quantity: number
  options?: { priceAdjust: number }[]     // Selected option adjustments
}

export interface TaxConfig {
  taxRate: number        // Percentage, e.g. 8.875
  serviceFeeRate: number // Percentage, e.g. 15
}

export interface BillInput {
  totalAmount: number      // Sum of all order item prices (cents, no tax/fee)
  discountAmount: number   // Coupon discount (cents)
  totalPaid: number        // Sum of all payment amounts received (cents)
  taxRate: number          // Percentage
  serviceFeeRate: number   // Percentage
}

export interface BillSummary {
  netDue: number
  tax: number
  serviceFee: number
  totalWithTax: number
  remaining: number
  isPaid: boolean
}

export interface SplitByItemInput {
  items: PricingItem[]
  taxRate: number
  serviceFeeRate: number
}

export interface SplitByItemResult {
  subtotal: number
  tax: number
  serviceFee: number
  total: number
}

export interface SplitByPercentResult {
  splitAmount: number
  leftover: number
}

export interface SplitValidation {
  valid: boolean
  reason?: string
}

export interface DailyItemStat {
  itemId: string
  name: string
  count: number    // Units sold
  revenue: number  // cents, food subtotal only (no tax/fee/tip)
}

export interface DailySalesSnapshot {
  date: string     // "YYYY-MM-DD"
  storeId: string
  totalOrders: number
  totalRevenue: number // cents
  items: DailyItemStat[]
}

// Layer 1: Item pricing
export { unitPrice, lineTotal, subtotal, orderItemsTotal } from './item'

// Layer 2: Tax, fees, tip
export { calcTax, calcServiceFee, calcTip, calcTipAmount, calcTaxAndFees } from './tax'

// Layer 3: Settlement
export {
  calcBillSummary,
  calcSplitByItem,
  calcSplitByPercent,
  validateSplit,
} from './settlement'

// Stats
export { buildDailySnapshot, aggregateSnapshots, topItems } from './stats'

// Types
export type {
  PricingItem,
  TaxConfig,
  BillInput,
  BillSummary,
  SplitByItemInput,
  SplitByItemResult,
  SplitByPercentResult,
  SplitValidation,
  DailyItemStat,
  DailySalesSnapshot,
} from './types'

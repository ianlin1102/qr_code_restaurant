import type {
  BillInput, BillSummary, SplitByItemInput,
  SplitByItemResult, SplitByPercentResult, SplitValidation,
} from './types'
import { subtotal } from './item'
import { calcTax, calcServiceFee } from './tax'

/** Full bill breakdown: netDue, tax, fee, totalWithTax, remaining, isPaid */
export function calcBillSummary(input: BillInput): BillSummary {
  const netDue = input.totalAmount - input.discountAmount
  const tax = calcTax(netDue, input.taxRate)
  const serviceFee = calcServiceFee(netDue, input.serviceFeeRate)
  const totalWithTax = netDue + tax + serviceFee
  const remaining = Math.max(0, totalWithTax - input.totalPaid)
  const isPaid = input.totalPaid >= totalWithTax && totalWithTax > 0
  return { netDue, tax, serviceFee, totalWithTax, remaining, isPaid }
}

/** Split-by-item: subtotal + tax + fee for selected items */
export function calcSplitByItem(input: SplitByItemInput): SplitByItemResult {
  const sub = subtotal(input.items)
  const tax = calcTax(sub, input.taxRate)
  const fee = calcServiceFee(sub, input.serviceFeeRate)
  return { subtotal: sub, tax, serviceFee: fee, total: sub + tax + fee }
}

/** Split-by-percent: divide remaining into split + leftover */
export function calcSplitByPercent(
  remaining: number,
  percent: number,
): SplitByPercentResult {
  const splitAmount = Math.round(remaining * percent / 100)
  return { splitAmount, leftover: remaining - splitAmount }
}

/** Validate that both sides of a split are >= $1.00 (100 cents). 100% is always valid. */
export function validateSplit(
  splitTotal: number,
  remainingAfterSplit: number,
  percent: number,
): SplitValidation {
  if (percent === 100) return { valid: true }
  if (splitTotal < 100) {
    return { valid: false, reason: 'Split amount must be at least $1.00' }
  }
  if (remainingAfterSplit < 100) {
    return { valid: false, reason: 'Remaining balance after split must be at least $1.00' }
  }
  return { valid: true }
}

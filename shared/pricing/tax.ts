import type { TaxConfig } from './types'

/** Tax on subtotal (cents, rounded) */
export function calcTax(subtotal: number, taxRate: number): number {
  return Math.round(subtotal * taxRate / 100)
}

/** Service fee on subtotal (cents, rounded) */
export function calcServiceFee(subtotal: number, serviceFeeRate: number): number {
  return Math.round(subtotal * serviceFeeRate / 100)
}

/** Tip amount (cents). No minimum enforced. */
export function calcTip(
  baseAmount: number,
  tipType: 'percent' | 'fixed',
  tipValue: number,
): number {
  if (tipType === 'fixed') return tipValue
  return Math.round(baseAmount * tipValue / 100)
}

/** Convenience: compute tax + service fee + total in one call */
export function calcTaxAndFees(
  subtotal: number,
  config: TaxConfig,
): { tax: number; serviceFee: number; totalWithTax: number } {
  const tax = calcTax(subtotal, config.taxRate)
  const serviceFee = calcServiceFee(subtotal, config.serviceFeeRate)
  return { tax, serviceFee, totalWithTax: subtotal + tax + serviceFee }
}

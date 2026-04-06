import { describe, it, expect } from 'vitest'
import {
  calcBillSummary,
  calcSplitByItem,
  calcSplitByPercent,
  validateSplit,
} from '../settlement'

// Standard rates used across tests
const RATES = { taxRate: 8.875, serviceFeeRate: 15 }

describe('calcBillSummary', () => {
  it('computes full bill breakdown', () => {
    const result = calcBillSummary({
      totalAmount: 5000, discountAmount: 0, totalPaid: 0, ...RATES,
    })
    expect(result.netDue).toBe(5000)
    expect(result.tax).toBe(444)        // round(5000 * 8.875 / 100)
    expect(result.serviceFee).toBe(750) // round(5000 * 15 / 100)
    expect(result.totalWithTax).toBe(6194)
    expect(result.remaining).toBe(6194)
    expect(result.isPaid).toBe(false)
  })

  it('applies discount', () => {
    const result = calcBillSummary({
      totalAmount: 5000, discountAmount: 1000, totalPaid: 0, ...RATES,
    })
    expect(result.netDue).toBe(4000)
    expect(result.remaining).toBe(4000 + result.tax + result.serviceFee)
  })

  it('returns remaining = 0 and isPaid = true when fully paid', () => {
    const result = calcBillSummary({
      totalAmount: 5000, discountAmount: 0, totalPaid: 6194, ...RATES,
    })
    expect(result.remaining).toBe(0)
    expect(result.isPaid).toBe(true)
  })

  it('clamps remaining to 0 when overpaid', () => {
    const result = calcBillSummary({
      totalAmount: 5000, discountAmount: 0, totalPaid: 9999, ...RATES,
    })
    expect(result.remaining).toBe(0)
    expect(result.isPaid).toBe(true)
  })

  it('isPaid false when totalWithTax is 0', () => {
    const result = calcBillSummary({
      totalAmount: 0, discountAmount: 0, totalPaid: 0, ...RATES,
    })
    expect(result.isPaid).toBe(false)
  })

  it('handles partial payment', () => {
    const result = calcBillSummary({
      totalAmount: 5000, discountAmount: 0, totalPaid: 3000, ...RATES,
    })
    expect(result.remaining).toBe(6194 - 3000)
  })
})

describe('calcSplitByItem', () => {
  it('calculates subtotal + tax + fee for selected items', () => {
    const result = calcSplitByItem({
      items: [
        { price: 1000, quantity: 2 },
        { price: 500, quantity: 1, options: [{ priceAdjust: 100 }] },
      ],
      ...RATES,
    })
    expect(result.subtotal).toBe(2600) // 2000 + 600
    expect(result.tax).toBe(231)       // round(2600 * 8.875 / 100)
    expect(result.serviceFee).toBe(390) // round(2600 * 15 / 100)
    expect(result.total).toBe(3221)     // 2600 + 231 + 390
  })

  it('handles single item', () => {
    const result = calcSplitByItem({
      items: [{ price: 1500, quantity: 1 }],
      ...RATES,
    })
    expect(result.subtotal).toBe(1500)
    expect(result.total).toBe(1500 + result.tax + result.serviceFee)
  })

  it('handles empty items', () => {
    const result = calcSplitByItem({ items: [], ...RATES })
    expect(result.subtotal).toBe(0)
    expect(result.total).toBe(0)
  })
})

describe('calcSplitByPercent', () => {
  it('calculates split amount and leftover', () => {
    const result = calcSplitByPercent(2000, 50)
    expect(result.splitAmount).toBe(1000)
    expect(result.leftover).toBe(1000)
  })

  it('handles 100%', () => {
    const result = calcSplitByPercent(2000, 100)
    expect(result.splitAmount).toBe(2000)
    expect(result.leftover).toBe(0)
  })

  it('rounds split amount', () => {
    // 1001 * 33 / 100 = 330.33 → 330
    const result = calcSplitByPercent(1001, 33)
    expect(result.splitAmount).toBe(330)
    expect(result.leftover).toBe(671) // 1001 - 330
  })

  it('handles 1%', () => {
    const result = calcSplitByPercent(10000, 1)
    expect(result.splitAmount).toBe(100)
    expect(result.leftover).toBe(9900)
  })
})

describe('validateSplit', () => {
  it('valid when both sides >= 100', () => {
    expect(validateSplit(500, 500, 50)).toEqual({ valid: true })
  })

  it('valid when both sides exactly 100', () => {
    expect(validateSplit(100, 100, 50)).toEqual({ valid: true })
  })

  it('invalid when split < 100 cents', () => {
    const result = validateSplit(99, 500, 10)
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('$1.00')
  })

  it('invalid when remaining < 100 cents', () => {
    const result = validateSplit(500, 50, 90)
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('$1.00')
  })

  it('100% always valid even with 0 leftover', () => {
    expect(validateSplit(500, 0, 100)).toEqual({ valid: true })
  })

  it('100% valid even with small split', () => {
    expect(validateSplit(50, 0, 100)).toEqual({ valid: true })
  })

  it('invalid: 1% of $5 = 5 cents', () => {
    const result = validateSplit(5, 495, 1)
    expect(result.valid).toBe(false)
  })

  it('invalid: 99% of $5 leaves 5 cents', () => {
    const result = validateSplit(495, 5, 99)
    expect(result.valid).toBe(false)
  })
})

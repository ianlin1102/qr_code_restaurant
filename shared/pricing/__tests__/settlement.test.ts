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

describe('calcBillSummary — edge cases', () => {
  it('discount exceeding totalAmount results in netDue of negative, tax on negative', () => {
    // Note: this shows current behavior — discount > total is a data issue
    const result = calcBillSummary({
      totalAmount: 1000, discountAmount: 2000, totalPaid: 0,
      taxRate: 8.875, serviceFeeRate: 15,
    })
    expect(result.netDue).toBe(-1000) // negative netDue
    // tax on negative: Math.round(-1000 * 8.875 / 100) = -89
    expect(result.tax).toBe(-89)
  })

  it('large bill with many payments', () => {
    const result = calcBillSummary({
      totalAmount: 1_000_000, discountAmount: 0, totalPaid: 999_999,
      taxRate: 8.875, serviceFeeRate: 15,
    })
    expect(result.remaining).toBeGreaterThan(0)
    expect(result.isPaid).toBe(false)
  })

  it('exact payment equals totalWithTax', () => {
    // Pre-calculate: 5000 + 444 + 750 = 6194
    const result = calcBillSummary({
      totalAmount: 5000, discountAmount: 0, totalPaid: 6194,
      taxRate: 8.875, serviceFeeRate: 15,
    })
    expect(result.remaining).toBe(0)
    expect(result.isPaid).toBe(true)
  })

  it('1 cent short of full payment', () => {
    const result = calcBillSummary({
      totalAmount: 5000, discountAmount: 0, totalPaid: 6193,
      taxRate: 8.875, serviceFeeRate: 15,
    })
    expect(result.remaining).toBe(1)
    expect(result.isPaid).toBe(false)
  })
})

describe('validateSplit — limit tests', () => {
  it('both sides exactly at $1.00 boundary', () => {
    expect(validateSplit(100, 100, 50)).toEqual({ valid: true })
  })
  it('split at 99 cents — just under limit', () => {
    expect(validateSplit(99, 101, 49).valid).toBe(false)
  })
  it('remaining at 99 cents — just under limit', () => {
    expect(validateSplit(101, 99, 51).valid).toBe(false)
  })
  it('both sides at 99 cents — both fail', () => {
    const result = validateSplit(99, 99, 50)
    expect(result.valid).toBe(false)
  })
  it('100% with 1 cent total', () => {
    expect(validateSplit(1, 0, 100)).toEqual({ valid: true })
  })
  it('100% with 0 total', () => {
    expect(validateSplit(0, 0, 100)).toEqual({ valid: true })
  })
})

describe('calcSplitByPercent — limit tests', () => {
  it('50% of odd number rounds correctly', () => {
    const result = calcSplitByPercent(1001, 50)
    expect(result.splitAmount).toBe(501) // 500.5 rounds to 501
    expect(result.leftover).toBe(500)
    expect(result.splitAmount + result.leftover).toBe(1001)
  })
  it('33% + 33% + 34% covers the full amount', () => {
    const total = 10000
    const split1 = calcSplitByPercent(total, 33)
    const split2 = calcSplitByPercent(total, 33)
    const split3 = calcSplitByPercent(total, 34)
    // Due to rounding, 3300 + 3300 + 3400 = 10000
    expect(split1.splitAmount + split2.splitAmount + split3.splitAmount).toBe(10000)
  })
  it('1% of 100 cents = 1 cent', () => {
    const result = calcSplitByPercent(100, 1)
    expect(result.splitAmount).toBe(1)
    expect(result.leftover).toBe(99)
  })
  it('1% of 99 cents = 1 cent (rounds up from 0.99)', () => {
    const result = calcSplitByPercent(99, 1)
    expect(result.splitAmount).toBe(1)
    expect(result.leftover).toBe(98)
  })
})

import { describe, it, expect } from 'vitest'
import { calcTax, calcServiceFee, calcTip, calcTaxAndFees } from '../tax'

describe('calcTax', () => {
  it('calculates tax at standard rate', () => {
    // 2000 cents * 8.875% = 177.5 → rounds to 178
    expect(calcTax(2000, 8.875)).toBe(178)
  })

  it('returns 0 when rate is 0', () => {
    expect(calcTax(5000, 0)).toBe(0)
  })

  it('rounds .5 up (Math.round behavior)', () => {
    // 1000 * 8.75% = 87.5 → rounds to 88
    expect(calcTax(1000, 8.75)).toBe(88)
  })

  it('handles small subtotal', () => {
    // 100 cents * 8.875% = 8.875 → rounds to 9
    expect(calcTax(100, 8.875)).toBe(9)
  })
})

describe('calcServiceFee', () => {
  it('calculates fee at standard rate', () => {
    // 2000 * 15% = 300
    expect(calcServiceFee(2000, 15)).toBe(300)
  })

  it('returns 0 when rate is 0', () => {
    expect(calcServiceFee(5000, 0)).toBe(0)
  })

  it('rounds correctly', () => {
    // 333 * 15% = 49.95 → rounds to 50
    expect(calcServiceFee(333, 15)).toBe(50)
  })
})

describe('calcTip', () => {
  it('calculates percent tip', () => {
    // 2000 * 18% = 360
    expect(calcTip(2000, 'percent', 18)).toBe(360)
  })

  it('returns fixed tip as-is', () => {
    expect(calcTip(2000, 'fixed', 500)).toBe(500)
  })

  it('allows tip of 0', () => {
    expect(calcTip(2000, 'percent', 0)).toBe(0)
    expect(calcTip(2000, 'fixed', 0)).toBe(0)
  })

  it('allows tip of 1 cent (no minimum)', () => {
    expect(calcTip(2000, 'fixed', 1)).toBe(1)
  })

  it('rounds percent tip', () => {
    // 1550 * 15% = 232.5 → 233
    expect(calcTip(1550, 'percent', 15)).toBe(233)
  })
})

describe('calcTaxAndFees', () => {
  it('returns tax, serviceFee, and totalWithTax', () => {
    const result = calcTaxAndFees(2000, { taxRate: 8.875, serviceFeeRate: 15 })
    expect(result.tax).toBe(178)       // 2000 * 8.875%
    expect(result.serviceFee).toBe(300) // 2000 * 15%
    expect(result.totalWithTax).toBe(2478) // 2000 + 178 + 300
  })

  it('handles both rates at 0', () => {
    const result = calcTaxAndFees(2000, { taxRate: 0, serviceFeeRate: 0 })
    expect(result.tax).toBe(0)
    expect(result.serviceFee).toBe(0)
    expect(result.totalWithTax).toBe(2000)
  })
})

describe('calcTax — edge cases', () => {
  it('handles zero subtotal', () => {
    expect(calcTax(0, 8.875)).toBe(0)
  })
  it('handles fractional rate', () => {
    // 1 cent * 8.875% = 0.08875 → rounds to 0
    expect(calcTax(1, 8.875)).toBe(0)
  })
  it('handles 100% rate', () => {
    expect(calcTax(1000, 100)).toBe(1000)
  })
  it('handles very high subtotal', () => {
    // 10M * 8.875% = 887500
    expect(calcTax(10_000_000, 8.875)).toBe(887500)
  })
})

describe('calcServiceFee — edge cases', () => {
  it('handles zero subtotal', () => {
    expect(calcServiceFee(0, 15)).toBe(0)
  })
  it('handles 1 cent subtotal', () => {
    // 1 * 15% = 0.15 → 0
    expect(calcServiceFee(1, 15)).toBe(0)
  })
})

describe('calcTip — edge cases', () => {
  it('handles 0% tip', () => {
    expect(calcTip(5000, 'percent', 0)).toBe(0)
  })
  it('handles 100% tip', () => {
    expect(calcTip(5000, 'percent', 100)).toBe(5000)
  })
  it('handles very large percent (200%)', () => {
    expect(calcTip(1000, 'percent', 200)).toBe(2000)
  })
  it('handles zero base amount', () => {
    expect(calcTip(0, 'percent', 18)).toBe(0)
    expect(calcTip(0, 'fixed', 0)).toBe(0)
  })
})

describe('calcTaxAndFees — edge cases', () => {
  it('handles zero subtotal', () => {
    const result = calcTaxAndFees(0, { taxRate: 8.875, serviceFeeRate: 15 })
    expect(result).toEqual({ tax: 0, serviceFee: 0, totalWithTax: 0 })
  })
  it('rounding: tax and fee rounded independently', () => {
    // 999 * 8.875% = 88.61625 → 89
    // 999 * 15% = 149.85 → 150
    const result = calcTaxAndFees(999, { taxRate: 8.875, serviceFeeRate: 15 })
    expect(result.tax).toBe(89)
    expect(result.serviceFee).toBe(150)
    expect(result.totalWithTax).toBe(999 + 89 + 150) // 1238
  })
})

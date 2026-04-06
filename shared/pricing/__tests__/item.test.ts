import { describe, it, expect } from 'vitest'
import { unitPrice, lineTotal, subtotal } from '../item'

describe('unitPrice', () => {
  it('returns base price when no options', () => {
    expect(unitPrice({ price: 1500, quantity: 1 })).toBe(1500)
  })

  it('adds option priceAdjust to base price', () => {
    expect(unitPrice({
      price: 1000,
      quantity: 1,
      options: [{ priceAdjust: 200 }, { priceAdjust: 150 }],
    })).toBe(1350)
  })

  it('handles option with priceAdjust = 0', () => {
    expect(unitPrice({
      price: 800,
      quantity: 1,
      options: [{ priceAdjust: 0 }, { priceAdjust: 300 }],
    })).toBe(1100)
  })

  it('handles empty options array', () => {
    expect(unitPrice({ price: 500, quantity: 2, options: [] })).toBe(500)
  })

  it('handles undefined options', () => {
    expect(unitPrice({ price: 500, quantity: 2 })).toBe(500)
  })
})

describe('lineTotal', () => {
  it('multiplies unitPrice by quantity', () => {
    expect(lineTotal({ price: 1000, quantity: 3 })).toBe(3000)
  })

  it('includes option adjustments in line total', () => {
    expect(lineTotal({
      price: 1000,
      quantity: 2,
      options: [{ priceAdjust: 200 }],
    })).toBe(2400) // (1000 + 200) * 2
  })

  it('returns 0 when quantity is 0', () => {
    expect(lineTotal({ price: 1000, quantity: 0 })).toBe(0)
  })
})

describe('subtotal', () => {
  it('sums line totals of all items', () => {
    expect(subtotal([
      { price: 1000, quantity: 2 },
      { price: 500, quantity: 1, options: [{ priceAdjust: 100 }] },
    ])).toBe(2600) // 2000 + 600
  })

  it('returns 0 for empty array', () => {
    expect(subtotal([])).toBe(0)
  })

  it('handles single item', () => {
    expect(subtotal([{ price: 1500, quantity: 1 }])).toBe(1500)
  })
})

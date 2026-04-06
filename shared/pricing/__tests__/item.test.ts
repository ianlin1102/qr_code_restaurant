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

describe('unitPrice — edge cases', () => {
  it('handles negative priceAdjust (discount option)', () => {
    expect(unitPrice({ price: 1000, quantity: 1, options: [{ priceAdjust: -200 }] })).toBe(800)
  })
  it('handles all-zero options', () => {
    expect(unitPrice({ price: 1000, quantity: 1, options: [{ priceAdjust: 0 }, { priceAdjust: 0 }] })).toBe(1000)
  })
  it('handles very large price', () => {
    expect(unitPrice({ price: 99999999, quantity: 1 })).toBe(99999999)
  })
})

describe('lineTotal — edge cases', () => {
  it('handles very large quantity', () => {
    expect(lineTotal({ price: 100, quantity: 99999 })).toBe(9999900)
  })
  it('handles price with options and large quantity', () => {
    expect(lineTotal({ price: 1000, quantity: 100, options: [{ priceAdjust: 500 }] })).toBe(150000)
  })
})

describe('subtotal — edge cases', () => {
  it('handles many items', () => {
    const items = Array.from({ length: 100 }, () => ({ price: 100, quantity: 1 }))
    expect(subtotal(items)).toBe(10000)
  })
  it('handles mixed options across items', () => {
    expect(subtotal([
      { price: 1000, quantity: 1, options: [{ priceAdjust: 200 }] },
      { price: 500, quantity: 2 },
      { price: 800, quantity: 1, options: [{ priceAdjust: -100 }] },
    ])).toBe(1200 + 1000 + 700) // 2900
  })
})

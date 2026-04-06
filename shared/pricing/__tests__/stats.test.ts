import { describe, it, expect } from 'vitest'
import { buildDailySnapshot, aggregateSnapshots, topItems } from '../stats'
import type { DailySalesSnapshot, DailyItemStat } from '../types'

// Minimal order shape matching what buildDailySnapshot needs
const makeOrder = (id: string, items: { menuItemId: string; name: string; price: number; quantity: number; selectedOptions?: { priceAdjust: number }[]; voided?: boolean }[], createdAt: string) => ({
  id, items, createdAt,
})

describe('buildDailySnapshot', () => {
  it('aggregates items by menuItemId', () => {
    const orders = [
      makeOrder('o1', [
        { menuItemId: 'a', name: 'Chicken', price: 1500, quantity: 2 },
        { menuItemId: 'b', name: 'Rice', price: 500, quantity: 1 },
      ], '2026-04-05T12:00:00Z'),
      makeOrder('o2', [
        { menuItemId: 'a', name: 'Chicken', price: 1500, quantity: 1 },
      ], '2026-04-05T13:00:00Z'),
    ]
    const snap = buildDailySnapshot('store1', '2026-04-05', orders)
    expect(snap.storeId).toBe('store1')
    expect(snap.date).toBe('2026-04-05')
    expect(snap.totalOrders).toBe(2)
    expect(snap.totalRevenue).toBe(5000) // 3000 + 500 + 1500

    const chicken = snap.items.find(i => i.itemId === 'a')!
    expect(chicken.count).toBe(3)    // 2 + 1
    expect(chicken.revenue).toBe(4500) // 1500*2 + 1500*1

    const rice = snap.items.find(i => i.itemId === 'b')!
    expect(rice.count).toBe(1)
    expect(rice.revenue).toBe(500)
  })

  it('skips voided items', () => {
    const orders = [
      makeOrder('o1', [
        { menuItemId: 'a', name: 'Chicken', price: 1500, quantity: 2 },
        { menuItemId: 'b', name: 'Voided', price: 999, quantity: 1, voided: true },
      ], '2026-04-05T12:00:00Z'),
    ]
    const snap = buildDailySnapshot('store1', '2026-04-05', orders)
    expect(snap.totalRevenue).toBe(3000)
    expect(snap.items).toHaveLength(1)
  })

  it('includes option priceAdjust in revenue', () => {
    const orders = [
      makeOrder('o1', [
        { menuItemId: 'a', name: 'Burger', price: 1000, quantity: 1, selectedOptions: [{ priceAdjust: 200 }] },
      ], '2026-04-05T12:00:00Z'),
    ]
    const snap = buildDailySnapshot('store1', '2026-04-05', orders)
    expect(snap.totalRevenue).toBe(1200)
    expect(snap.items[0].revenue).toBe(1200)
  })

  it('returns zero-value snapshot for empty orders', () => {
    const snap = buildDailySnapshot('store1', '2026-04-05', [])
    expect(snap.totalOrders).toBe(0)
    expect(snap.totalRevenue).toBe(0)
    expect(snap.items).toEqual([])
  })
})

describe('aggregateSnapshots', () => {
  const day1: DailySalesSnapshot = {
    date: '2026-04-01', storeId: 's1', totalOrders: 10, totalRevenue: 5000,
    items: [
      { itemId: 'a', name: 'Chicken', count: 5, revenue: 3000 },
      { itemId: 'b', name: 'Rice', count: 3, revenue: 1500 },
    ],
  }
  const day2: DailySalesSnapshot = {
    date: '2026-04-02', storeId: 's1', totalOrders: 8, totalRevenue: 4000,
    items: [
      { itemId: 'a', name: 'Chicken', count: 4, revenue: 2400 },
      { itemId: 'c', name: 'Soup', count: 2, revenue: 800 },
    ],
  }

  it('sums totalOrders and totalRevenue', () => {
    const result = aggregateSnapshots([day1, day2])
    expect(result.totalOrders).toBe(18)
    expect(result.totalRevenue).toBe(9000)
  })

  it('merges items by itemId', () => {
    const result = aggregateSnapshots([day1, day2])
    const chicken = result.items.find(i => i.itemId === 'a')!
    expect(chicken.count).toBe(9)
    expect(chicken.revenue).toBe(5400)
  })

  it('includes items only in one snapshot', () => {
    const result = aggregateSnapshots([day1, day2])
    expect(result.items.find(i => i.itemId === 'b')!.count).toBe(3)
    expect(result.items.find(i => i.itemId === 'c')!.count).toBe(2)
  })

  it('returns dateRange', () => {
    const result = aggregateSnapshots([day1, day2])
    expect(result.dateRange).toEqual({ from: '2026-04-01', to: '2026-04-02' })
  })

  it('handles empty array', () => {
    const result = aggregateSnapshots([])
    expect(result.totalOrders).toBe(0)
    expect(result.items).toEqual([])
  })
})

describe('topItems', () => {
  const items: DailyItemStat[] = [
    { itemId: 'a', name: 'A', count: 10, revenue: 1000 },
    { itemId: 'b', name: 'B', count: 5, revenue: 3000 },
    { itemId: 'c', name: 'C', count: 20, revenue: 500 },
  ]

  it('sorts by count descending', () => {
    const result = topItems(items, 'count')
    expect(result[0].itemId).toBe('c')
    expect(result[1].itemId).toBe('a')
    expect(result[2].itemId).toBe('b')
  })

  it('sorts by revenue descending', () => {
    const result = topItems(items, 'revenue')
    expect(result[0].itemId).toBe('b')
  })

  it('limits to N items', () => {
    const result = topItems(items, 'count', 2)
    expect(result).toHaveLength(2)
  })

  it('defaults to 10 items', () => {
    const result = topItems(items, 'count')
    expect(result).toHaveLength(3) // only 3 items available, less than 10
  })
})

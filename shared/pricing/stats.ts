import type { DailyItemStat, DailySalesSnapshot } from './types'
import { lineTotal } from './item'

interface SnapshotOrderItem {
  menuItemId: string
  name: string
  price: number
  quantity: number
  selectedOptions?: { priceAdjust: number }[]
  voided?: boolean
}

interface SnapshotOrder {
  id: string
  items: SnapshotOrderItem[]
  createdAt: string
}

/** Build a daily sales snapshot from raw orders */
export function buildDailySnapshot(
  storeId: string,
  date: string,
  orders: SnapshotOrder[],
): DailySalesSnapshot {
  const itemMap = new Map<string, DailyItemStat>()

  for (const order of orders) {
    for (const item of order.items) {
      if (item.voided) continue
      const revenue = lineTotal({
        price: item.price,
        quantity: item.quantity,
        options: item.selectedOptions?.map(o => ({ priceAdjust: o.priceAdjust })),
      })
      const existing = itemMap.get(item.menuItemId)
      if (existing) {
        existing.count += item.quantity
        existing.revenue += revenue
      } else {
        itemMap.set(item.menuItemId, {
          itemId: item.menuItemId,
          name: item.name,
          count: item.quantity,
          revenue,
        })
      }
    }
  }

  const items = Array.from(itemMap.values())
  const totalRevenue = items.reduce((sum, i) => sum + i.revenue, 0)

  return {
    date,
    storeId,
    totalOrders: orders.length,
    totalRevenue,
    items,
  }
}

/** Merge multiple daily snapshots into an aggregate */
export function aggregateSnapshots(snapshots: DailySalesSnapshot[]): {
  totalOrders: number
  totalRevenue: number
  items: DailyItemStat[]
  dateRange: { from: string; to: string }
} {
  if (snapshots.length === 0) {
    return { totalOrders: 0, totalRevenue: 0, items: [], dateRange: { from: '', to: '' } }
  }

  const itemMap = new Map<string, DailyItemStat>()
  let totalOrders = 0
  let totalRevenue = 0

  for (const snap of snapshots) {
    totalOrders += snap.totalOrders
    totalRevenue += snap.totalRevenue
    for (const item of snap.items) {
      const existing = itemMap.get(item.itemId)
      if (existing) {
        existing.count += item.count
        existing.revenue += item.revenue
      } else {
        itemMap.set(item.itemId, { ...item })
      }
    }
  }

  const dates = snapshots.map(s => s.date).sort()
  return {
    totalOrders,
    totalRevenue,
    items: Array.from(itemMap.values()),
    dateRange: { from: dates[0], to: dates[dates.length - 1] },
  }
}

/** Sort items by count or revenue, return top N (default 10) */
export function topItems(
  items: DailyItemStat[],
  by: 'count' | 'revenue',
  limit: number = 10,
): DailyItemStat[] {
  return [...items].sort((a, b) => b[by] - a[by]).slice(0, limit)
}

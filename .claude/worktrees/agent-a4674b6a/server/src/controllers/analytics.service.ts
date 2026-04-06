import { orderStore } from './order.service.js'
import { getStaff } from './staff.service.js'
import type { Order, AnalyticsResponse, DailyStats, TopItem } from '@qr-order/shared'

export interface StaffPerformance {
  userId: string
  username: string
  role: string
  orderCount: number
  revenue: number
  avgOrderValue: number
}

const COUNTABLE_STATUSES = new Set(['paid', 'preparing', 'completed'])

function filterOrders(storeId: string, startDate?: string, endDate?: string): Order[] {
  const orders = orderStore.getByField('storeId', storeId)
  return orders.filter(order => {
    if (!COUNTABLE_STATUSES.has(order.status)) return false
    if (startDate && order.createdAt < startDate) return false
    if (endDate && order.createdAt > endDate + 'T23:59:59.999Z') return false
    return true
  })
}

function buildDailyStats(orders: Order[]): DailyStats[] {
  const map = new Map<string, { count: number; revenue: number }>()

  for (const order of orders) {
    const date = order.createdAt.slice(0, 10) // YYYY-MM-DD
    const entry = map.get(date) ?? { count: 0, revenue: 0 }
    entry.count += 1
    entry.revenue += order.totalPrice
    map.set(date, entry)
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { count, revenue }]) => ({
      date,
      orderCount: count,
      revenue,
      avgOrderValue: count > 0 ? Math.round(revenue / count) : 0,
    }))
}

function buildTopItems(orders: Order[]): TopItem[] {
  const map = new Map<string, TopItem>()

  for (const order of orders) {
    for (const item of order.items) {
      const existing = map.get(item.menuItemId)
      const optAdjust = (item.selectedOptions ?? []).reduce((s, o) => s + o.priceAdjust, 0)
      const lineRevenue = (item.price + optAdjust) * item.quantity
      if (existing) {
        existing.quantity += item.quantity
        existing.revenue += lineRevenue
      } else {
        map.set(item.menuItemId, {
          menuItemId: item.menuItemId,
          name: item.name,
          nameEn: item.nameEn,
          quantity: item.quantity,
          revenue: lineRevenue,
        })
      }
    }
  }

  return Array.from(map.values())
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10)
}

export function getAnalytics(
  storeId: string,
  startDate?: string,
  endDate?: string,
): AnalyticsResponse {
  const orders = filterOrders(storeId, startDate, endDate)
  const totalOrders = orders.length
  const totalRevenue = orders.reduce((sum, o) => sum + o.totalPrice, 0)
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0

  return {
    dailyStats: buildDailyStats(orders),
    topItems: buildTopItems(orders),
    totalOrders,
    totalRevenue,
    avgOrderValue,
  }
}

export async function getStaffPerformance(
  storeId: string,
): Promise<StaffPerformance[]> {
  const staff = getStaff(storeId)
  if (staff.length === 0) return []

  const orders = filterOrders(storeId)
  const result: StaffPerformance[] = staff.map(s => ({
    userId: s.id,
    username: s.username,
    role: s.role,
    orderCount: 0,
    revenue: 0,
    avgOrderValue: 0,
  }))

  // Distribute orders round-robin across staff as simulation
  orders.forEach((order, i) => {
    const idx = i % result.length
    result[idx].orderCount += 1
    result[idx].revenue += order.totalPrice
  })

  for (const entry of result) {
    entry.avgOrderValue =
      entry.orderCount > 0 ? Math.round(entry.revenue / entry.orderCount) : 0
  }

  return result.sort((a, b) => b.revenue - a.revenue)
}

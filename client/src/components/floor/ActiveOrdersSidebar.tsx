import { useState, useEffect, useCallback } from 'react'
import { useT } from '@/i18n/useT'
import type { Order, OrderStatus } from '@qr-order/shared'
import { api } from '@/services/api'
import { formatPriceUSD } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { adminT } from '@/i18n/admin'

type T = (typeof adminT)['en']

interface Props {
  storeId: string
  onOrderClick?: (order: Order) => void
}

const ACTIVE_STATUSES: OrderStatus[] = ['pending', 'confirmed', 'preparing']
const REFRESH_INTERVAL = 15_000
const WARN_MINUTES = 15
const CRITICAL_MINUTES = 30

type ActiveOrderKey = 'new' | 'preparing' | 'confirmed'

interface StatusGroup {
  labelKey: ActiveOrderKey
  status: OrderStatus
  headerClass: string
  badgeClass: string
}

const STATUS_GROUPS: StatusGroup[] = [
  {
    labelKey: 'new',
    status: 'pending',
    headerClass: 'text-blue-700 bg-blue-50',
    badgeClass: 'bg-blue-100 text-blue-800',
  },
  {
    labelKey: 'confirmed',
    status: 'confirmed',
    headerClass: 'text-yellow-700 bg-yellow-50',
    badgeClass: 'bg-yellow-100 text-yellow-800',
  },
  {
    labelKey: 'preparing',
    status: 'preparing',
    headerClass: 'text-orange-700 bg-orange-50',
    badgeClass: 'bg-orange-100 text-orange-800',
  },
]

function minutesSince(isoDate: string): number {
  return Math.floor((Date.now() - new Date(isoDate).getTime()) / 60_000)
}

function formatElapsed(minutes: number, t: T): string {
  if (minutes < 1) return t.activeOrders.justNow
  if (minutes < 60) return t.activeOrders.minutesAgo.replace('{{m}}', String(minutes))
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0
    ? t.activeOrders.hoursMinutesAgo.replace('{{h}}', String(h)).replace('{{m}}', String(m))
    : t.activeOrders.hoursAgo.replace('{{h}}', String(h))
}

function getTimeBorderClass(minutes: number): string {
  if (minutes >= CRITICAL_MINUTES) return 'border-red-500 border-2'
  if (minutes >= WARN_MINUTES) return 'border-orange-400 border-2'
  return 'border'
}

function itemCount(order: Order): number {
  return order.items.reduce((sum, item) => sum + item.quantity, 0)
}

export default function ActiveOrdersSidebar({ storeId, onOrderClick }: Props) {
  const { t } = useT()
  const [orders, setOrders] = useState<Order[]>([])
  const [, setTick] = useState(0)

  const fetchOrders = useCallback(async () => {
    try {
      const all = await api.getOrders(storeId)
      setOrders(all.filter(o => ACTIVE_STATUSES.includes(o.status)))
    } catch {
      // silently retry on next interval
    }
  }, [storeId])

  useEffect(() => {
    fetchOrders()
    const dataInterval = setInterval(fetchOrders, REFRESH_INTERVAL)
    const tickInterval = setInterval(() => setTick(prev => prev + 1), 60_000)
    return () => {
      clearInterval(dataInterval)
      clearInterval(tickInterval)
    }
  }, [fetchOrders])

  const grouped = STATUS_GROUPS.map(group => ({
    ...group,
    orders: orders
      .filter(o => o.status === group.status)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
  })).filter(g => g.orders.length > 0)

  return (
    <aside className="w-80 flex flex-col h-full border-l bg-background">
      <div className="px-4 py-3 border-b">
        <h2 className="font-semibold text-lg">{t.activeOrders.title}</h2>
        <p className="text-xs text-muted-foreground">
          {t.activeOrders.inProgress.replace('{{count}}', String(orders.length))}
        </p>
      </div>

      <ScrollArea className="flex-1">
        {grouped.length === 0 ? (
          <p className="text-sm text-muted-foreground py-12 text-center">
            {t.activeOrders.noActiveOrders}
          </p>
        ) : (
          <div className="p-3 space-y-4">
            {grouped.map(group => (
              <OrderGroup
                key={group.status}
                group={group}
                t={t}
                onOrderClick={onOrderClick}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </aside>
  )
}

interface OrderGroupProps {
  group: StatusGroup & { orders: Order[] }
  t: T
  onOrderClick?: (order: Order) => void
}

function OrderGroup({ group, t, onOrderClick }: OrderGroupProps) {
  return (
    <section>
      <div className={cn('rounded-md px-3 py-1.5 mb-2 text-xs font-semibold', group.headerClass)}>
        {t.activeOrders[group.labelKey]} ({group.orders.length})
      </div>
      <ul className="space-y-2">
        {group.orders.map(order => (
          <OrderCard
            key={order.id}
            order={order}
            badgeClass={group.badgeClass}
            t={t}
            onClick={onOrderClick}
          />
        ))}
      </ul>
    </section>
  )
}

interface OrderCardProps {
  order: Order
  badgeClass: string
  t: T
  onClick?: (order: Order) => void
}

function OrderCard({ order, badgeClass, t, onClick }: OrderCardProps) {
  const minutes = minutesSince(order.createdAt)
  const borderClass = getTimeBorderClass(minutes)
  const count = itemCount(order)

  return (
    <li
      role="button"
      tabIndex={0}
      className={cn(
        'rounded-lg p-3 cursor-pointer bg-card hover:bg-accent/50 transition-colors',
        borderClass,
      )}
      onClick={() => onClick?.(order)}
      onKeyDown={e => { if (e.key === 'Enter') onClick?.(order) }}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-bold text-sm">#{order.orderNumber}</span>
        <Badge className={cn('text-[10px] px-1.5 py-0', badgeClass)}>
          {order.status}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground truncate">{order.tableName}</p>
      <div className="flex items-center justify-between mt-1.5 text-xs">
        <span>
          {t.activeOrders.itemCount.replace('{{count}}', String(count))} &middot; {formatPriceUSD(order.totalPrice)}
        </span>
        <span className={cn(
          'text-muted-foreground',
          minutes >= CRITICAL_MINUTES && 'text-red-600 font-medium',
          minutes >= WARN_MINUTES && minutes < CRITICAL_MINUTES && 'text-orange-600 font-medium',
        )}>
          {formatElapsed(minutes, t)}
        </span>
      </div>
    </li>
  )
}

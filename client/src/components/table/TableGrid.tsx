import { useT } from '@/i18n/useT'
import type { Table, Order } from '@qr-order/shared'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { formatPriceUSD } from '@/lib/format'

interface TableGridProps {
  tables: Table[]
  orders: Order[]
  onTableClick?: (table: Table) => void
}

function formatElapsed(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '<1m'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ${minutes % 60}m`
}

function getActiveOrder(table: Table, orders: Order[]): Order | undefined {
  return orders.find(
    o => o.tableId === table.id && (o.status === 'pending' || o.status === 'preparing'),
  )
}

export default function TableGrid({ tables, orders, onTableClick }: TableGridProps) {
  const { t } = useT()

  if (tables.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {t.floorPlan.noTables}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      {tables.map(table => {
        const activeOrder = getActiveOrder(table, orders)
        const orderTotal = orders
          .filter(o => o.tableId === table.id && o.status !== 'closed' && o.status !== 'served')
          .reduce((sum, o) => sum + o.totalPrice, 0)

        // Status config
        const statusConfig = (() => {
          switch (table.status) {
            case 'occupied': return { label: t.tables.status.occupied, cls: 'border-red-300 bg-red-50', badge: 'bg-red-100 text-red-700', dot: 'bg-red-500' }
            case 'cleaning': return { label: t.tables.status.cleaning, cls: 'border-yellow-300 bg-yellow-50 opacity-60', badge: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' }
            case 'bill-requested': return { label: t.tables.status.billRequested, cls: 'border-red-400 bg-red-50 ring-2 ring-red-200', badge: 'bg-red-100 text-red-700', dot: 'bg-red-500' }
            default: return { label: t.tables.status.idle, cls: 'border-green-300 bg-green-50', badge: 'bg-green-100 text-green-700', dot: 'bg-green-500' }
          }
        })()

        const showOccupied = table.status === 'occupied' || !!activeOrder

        return (
          <Card
            key={table.id}
            className={cn(
              'cursor-pointer transition-all hover:shadow-md min-h-[100px]',
              statusConfig.cls,
              table.status === 'cleaning' && 'animate-pulse',
            )}
            onClick={() => onTableClick?.(table)}
          >
            <CardContent className="p-3 flex flex-col items-center justify-center gap-1.5">
              {/* Compact table label */}
              <span className="text-lg font-bold leading-tight text-center">
                {table.name}
              </span>

              {/* Status pill */}
              <span className={cn('text-[10px] font-semibold uppercase tracking-tight px-2 py-0.5 rounded-full', statusConfig.badge)}>
                {statusConfig.label}
              </span>

              {/* Order total for occupied tables */}
              {showOccupied && orderTotal > 0 && (
                <span className="text-sm font-bold text-primary">
                  {formatPriceUSD(orderTotal)}
                </span>
              )}

              {/* Elapsed time for occupied tables */}
              {showOccupied && activeOrder && (
                <span className="text-xs text-orange-700 flex items-center gap-1">
                  {formatElapsed(activeOrder.createdAt)}
                </span>
              )}

              {/* Ready for seating text for idle */}
              {table.status === 'idle' && !activeOrder && (
                <span className="text-xs text-green-600 italic">{t.floorPlan.readyForSeating}</span>
              )}

              {/* Capacity badge */}
              {table.capacity != null && table.capacity > 0 && (
                <Badge variant="outline" className="text-xs px-1.5 py-0">
                  {table.capacity} {t.floorPlan.seats}
                </Badge>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

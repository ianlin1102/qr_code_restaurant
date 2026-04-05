import { useRef, useCallback } from 'react'
import { formatPriceUSD } from '@/lib/format'
import { useT } from '@/i18n/useT'
import { localized } from '@/lib/i18n-utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import OrderReceipt from '@/components/order/OrderReceipt'
import type { Order, OrderItem, OrderStatus } from '@qr-order/shared'

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'bg-orange-100 text-orange-800 border-orange-200',
  confirmed: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  preparing: 'bg-blue-100 text-blue-800 border-blue-200',
  served: 'bg-green-100 text-green-800 border-green-200',
  paid: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  closed: 'bg-gray-100 text-gray-800 border-gray-200',
}

function itemUnitPrice(item: OrderItem): number {
  return item.price + (item.selectedOptions ?? []).reduce((s, o) => s + o.priceAdjust, 0)
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface Props {
  order: Order | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onStatusUpdate?: (orderId: string, status: OrderStatus) => void
  onEdit?: (order: Order) => void
  updating?: boolean
  storeName?: string
}

export default function OrderDetailDialog({
  order,
  open,
  onOpenChange,
  onStatusUpdate,
  onEdit,
  updating,
  storeName,
}: Props) {
  const { t, lang } = useT()
  const receiptRef = useRef<HTMLDivElement>(null)

  const STATUS_MAP: Record<OrderStatus, { label: string; color: string }> = {
    pending: { label: t.dashboard.status.pending, color: STATUS_COLORS.pending },
    confirmed: { label: t.dashboard.status.confirmed || 'Confirmed', color: STATUS_COLORS.confirmed },
    preparing: { label: t.dashboard.status.preparing, color: STATUS_COLORS.preparing },
    served: { label: t.dashboard.status.served, color: STATUS_COLORS.served },
    paid: { label: 'Paid', color: STATUS_COLORS.paid },
    closed: { label: 'Closed', color: STATUS_COLORS.closed },
  }

  const handlePrint = useCallback(() => {
    if (!receiptRef.current) return
    const printWindow = window.open('', '_blank', 'width=320,height=600')
    if (!printWindow) return
    printWindow.document.write(`
      <html><head><title>${t.orderDetail.receipt}</title>
      <style>
        body { margin: 0; padding: 0; }
        @media print { body { margin: 0; } }
      </style>
      </head><body>
      ${receiptRef.current.outerHTML}
      <script>window.onload=function(){window.print();window.close();}</script>
      </body></html>
    `)
    printWindow.document.close()
  }, [t])

  if (!order) return null

  const config = STATUS_MAP[order.status]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[calc(100vw-2rem)] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="text-xl">#{order.orderNumber}</span>
            <Badge variant="outline" className={config.color}>{config.label}</Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Order meta */}
        <div className="text-sm space-y-1 text-muted-foreground">
          <div className="flex justify-between">
            <span>{t.orderDetail.table}</span>
            <span className="text-foreground font-medium">{order.tableName}</span>
          </div>
          {order.customerName && (
            <div className="flex justify-between">
              <span>{t.orderDetail.customer}</span>
              <span className="text-foreground">{order.customerName}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>{t.orderDetail.orderTime}</span>
            <span className="text-foreground">{formatTime(order.createdAt)}</span>
          </div>
          {order.updatedAt !== order.createdAt && (
            <div className="flex justify-between">
              <span>{t.orderDetail.updateTime}</span>
              <span className="text-foreground">{formatTime(order.updatedAt)}</span>
            </div>
          )}
        </div>

        <Separator />

        {/* Items */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">{t.orderDetail.itemDetail}</h3>
          {order.items.map((item, idx) => (
            <div key={idx} className="flex justify-between text-sm">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="font-medium">{localized(item, lang)}</span>
                  <span className="text-muted-foreground">x{item.quantity}</span>
                </div>
                {item.selectedOptions && item.selectedOptions.length > 0 && (
                  <p className="text-xs text-orange-600">
                    {item.selectedOptions.map(o => `${(o.optionName || o.optionNameEn || "")}: ${(o.choiceName || o.choiceNameEn || "")}`).join(' | ')}
                  </p>
                )}
                {item.remark && (
                  <p className="text-xs text-muted-foreground">{t.orderDetail.remarkPrefix}: {item.remark}</p>
                )}
              </div>
              <span className="shrink-0 ml-2">
                {formatPriceUSD(itemUnitPrice(item) * item.quantity)}
              </span>
            </div>
          ))}
        </div>

        <Separator />

        {/* Total */}
        <div className="flex justify-between items-center">
          <span className="font-semibold">{t.common.total}</span>
          <span className="text-lg font-bold text-primary">
            {formatPriceUSD(order.totalPrice)}
          </span>
        </div>

        {/* Hidden receipt for printing */}
        <div className="hidden">
          <OrderReceipt ref={receiptRef} order={order} storeName={storeName} />
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 justify-end pt-2">
          <Button variant="outline" size="sm" className="min-h-[44px]" onClick={handlePrint}>
            {t.orderDetail.printReceipt}
          </Button>
          {order.status !== 'served' && onEdit && (
            <Button variant="outline" size="sm" className="min-h-[44px]" onClick={() => onEdit(order)}>
              {t.orderDetail.editOrder}
            </Button>
          )}
          {order.status === 'pending' && onStatusUpdate && (
            <Button
              size="sm"
              className="min-h-[44px] bg-yellow-600 hover:bg-yellow-700 text-white"
              disabled={updating}
              onClick={() => onStatusUpdate(order.id, 'confirmed')}
            >
              {updating ? '...' : (t.dashboard?.status?.confirmed || 'Confirm')}
            </Button>
          )}
          {order.status === 'confirmed' && onStatusUpdate && (
            <Button
              size="sm"
              className="min-h-[44px] bg-blue-600 hover:bg-blue-700 text-white"
              disabled={updating}
              onClick={() => onStatusUpdate(order.id, 'preparing')}
            >
              {updating ? '...' : t.orderDetail.startPreparing}
            </Button>
          )}
          {order.status === 'preparing' && onStatusUpdate && (
            <Button
              size="sm"
              className="min-h-[44px] bg-green-600 hover:bg-green-700 text-white"
              disabled={updating}
              onClick={() => onStatusUpdate(order.id, 'served')}
            >
              {updating ? '...' : t.orderDetail.markComplete}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

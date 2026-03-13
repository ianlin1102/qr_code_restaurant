import { useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { formatPriceUSD } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import OrderReceipt from '@/components/OrderReceipt'
import type { Order, OrderItem, OrderStatus } from '@qr-order/shared'

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'bg-orange-100 text-orange-800 border-orange-200',
  paid: 'bg-purple-100 text-purple-800 border-purple-200',
  preparing: 'bg-blue-100 text-blue-800 border-blue-200',
  completed: 'bg-green-100 text-green-800 border-green-200',
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
  const { t } = useTranslation('admin')
  const receiptRef = useRef<HTMLDivElement>(null)

  const STATUS_MAP: Record<OrderStatus, { label: string; color: string }> = {
    pending: { label: t('common:status.pending'), color: STATUS_COLORS.pending },
    paid: { label: t('common:status.paid'), color: STATUS_COLORS.paid },
    preparing: { label: t('common:status.preparing'), color: STATUS_COLORS.preparing },
    completed: { label: t('common:status.completed'), color: STATUS_COLORS.completed },
    closed: { label: t('common:status.closed'), color: STATUS_COLORS.closed },
  }

  const handlePrint = useCallback(() => {
    if (!receiptRef.current) return
    const printWindow = window.open('', '_blank', 'width=320,height=600')
    if (!printWindow) return
    printWindow.document.write(`
      <html><head><title>${t('orderDetail.receipt')}</title>
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
            {order.isPaid && (
              <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200">
                {t('common:status.paid')}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Order meta */}
        <div className="text-sm space-y-1 text-muted-foreground">
          <div className="flex justify-between">
            <span>{t('orderDetail.table')}</span>
            <span className="text-foreground font-medium">{order.tableName}</span>
          </div>
          {order.customerName && (
            <div className="flex justify-between">
              <span>{t('orderDetail.customer')}</span>
              <span className="text-foreground">{order.customerName}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>{t('orderDetail.orderTime')}</span>
            <span className="text-foreground">{formatTime(order.createdAt)}</span>
          </div>
          {order.updatedAt !== order.createdAt && (
            <div className="flex justify-between">
              <span>{t('orderDetail.updateTime')}</span>
              <span className="text-foreground">{formatTime(order.updatedAt)}</span>
            </div>
          )}
        </div>

        <Separator />

        {/* Items */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">{t('orderDetail.itemDetail')}</h3>
          {order.items.map((item, idx) => (
            <div key={idx} className="flex justify-between text-sm">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="font-medium">{item.name}</span>
                  <span className="text-muted-foreground">x{item.quantity}</span>
                </div>
                {item.selectedOptions && item.selectedOptions.length > 0 && (
                  <p className="text-xs text-orange-600">
                    {item.selectedOptions.map(o => `${o.optionName}: ${o.choiceName}`).join(' | ')}
                  </p>
                )}
                {item.remark && (
                  <p className="text-xs text-muted-foreground">{t('orderDetail.remarkPrefix')}: {item.remark}</p>
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
          <span className="font-semibold">{t('common:total')}</span>
          <span className="text-lg font-bold text-primary">
            {formatPriceUSD(order.totalPrice)}
          </span>
        </div>

        {/* Hidden receipt for printing */}
        <div className="hidden">
          <OrderReceipt ref={receiptRef} order={order} storeName={storeName} />
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end pt-2">
          <Button variant="outline" size="sm" className="min-h-[44px]" onClick={handlePrint}>
            {t('orderDetail.printReceipt')}
          </Button>
          {order.status !== 'completed' && order.status !== 'closed' && onEdit && (
            <Button variant="outline" size="sm" className="min-h-[44px]" onClick={() => onEdit(order)}>
              {t('orderDetail.editOrder')}
            </Button>
          )}
          {order.status === 'pending' && onStatusUpdate && (
            <Button
              size="sm"
              className="min-h-[44px] bg-blue-600 hover:bg-blue-700 text-white"
              disabled={updating}
              onClick={() => onStatusUpdate(order.id, 'preparing')}
            >
              {updating ? '...' : t('orderDetail.startPreparing')}
            </Button>
          )}
          {order.status === 'preparing' && onStatusUpdate && (
            <Button
              size="sm"
              className="min-h-[44px] bg-green-600 hover:bg-green-700 text-white"
              disabled={updating}
              onClick={() => onStatusUpdate(order.id, 'completed')}
            >
              {updating ? '...' : t('orderDetail.markComplete')}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

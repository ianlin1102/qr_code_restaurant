import { useRef, useCallback } from 'react'
import { formatPriceCNY } from '@/lib/format'
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

const STATUS_MAP: Record<OrderStatus, { label: string; color: string }> = {
  pending: { label: '待处理', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  preparing: { label: '制作中', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  completed: { label: '已完成', color: 'bg-green-100 text-green-800 border-green-200' },
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
  const receiptRef = useRef<HTMLDivElement>(null)

  const handlePrint = useCallback(() => {
    if (!receiptRef.current) return
    const printWindow = window.open('', '_blank', 'width=320,height=600')
    if (!printWindow) return
    printWindow.document.write(`
      <html><head><title>小票</title>
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
  }, [])

  if (!order) return null

  const config = STATUS_MAP[order.status]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="text-xl">#{order.orderNumber}</span>
            <Badge variant="outline" className={config.color}>{config.label}</Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Order meta */}
        <div className="text-sm space-y-1 text-muted-foreground">
          <div className="flex justify-between">
            <span>桌台</span>
            <span className="text-foreground font-medium">{order.tableName}</span>
          </div>
          {order.customerName && (
            <div className="flex justify-between">
              <span>顾客</span>
              <span className="text-foreground">{order.customerName}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>下单时间</span>
            <span className="text-foreground">{formatTime(order.createdAt)}</span>
          </div>
          {order.updatedAt !== order.createdAt && (
            <div className="flex justify-between">
              <span>更新时间</span>
              <span className="text-foreground">{formatTime(order.updatedAt)}</span>
            </div>
          )}
        </div>

        <Separator />

        {/* Items */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">菜品明细</h3>
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
                  <p className="text-xs text-muted-foreground">备注: {item.remark}</p>
                )}
              </div>
              <span className="shrink-0 ml-2">
                {formatPriceCNY(itemUnitPrice(item) * item.quantity)}
              </span>
            </div>
          ))}
        </div>

        <Separator />

        {/* Total */}
        <div className="flex justify-between items-center">
          <span className="font-semibold">合计</span>
          <span className="text-lg font-bold text-primary">
            {formatPriceCNY(order.totalPrice)}
          </span>
        </div>

        {/* Hidden receipt for printing */}
        <div className="hidden">
          <OrderReceipt ref={receiptRef} order={order} storeName={storeName} />
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end pt-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            打印小票
          </Button>
          {order.status !== 'completed' && onEdit && (
            <Button variant="outline" size="sm" onClick={() => onEdit(order)}>
              修改订单
            </Button>
          )}
          {order.status === 'pending' && onStatusUpdate && (
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={updating}
              onClick={() => onStatusUpdate(order.id, 'preparing')}
            >
              {updating ? '...' : '开始制作'}
            </Button>
          )}
          {order.status === 'preparing' && onStatusUpdate && (
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={updating}
              onClick={() => onStatusUpdate(order.id, 'completed')}
            >
              {updating ? '...' : '完成'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

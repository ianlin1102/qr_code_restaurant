import { useState } from 'react'
import { Printer, Trash2 } from 'lucide-react'
import { useT } from '@/i18n/useT'
import { localized, optionLabel } from '@/lib/i18n-utils'
import { buildKitchenTicketHtml, openPrintWindow } from '@/lib/print-receipt'
import { formatPriceUSD } from '@/lib/format'
import { itemUnitPrice, itemLineTotal } from '@/lib/pricing'
import { minutesSince } from '@/lib/time-format'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import type { Order, OrderStatus } from '@qr-order/shared'

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'bg-orange-100 text-orange-800 border-orange-200',
  confirmed: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  preparing: 'bg-blue-100 text-blue-800 border-blue-200',
  served: 'bg-green-100 text-green-800 border-green-200',
  paid: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  closed: 'bg-gray-100 text-gray-800 border-gray-200',
}


function timeAgo(dateStr: string): string {
  const minutes = minutesSince(dateStr)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ${minutes % 60}m ago`
}

function timeColor(dateStr: string): string {
  const minutes = minutesSince(dateStr)
  if (minutes < 15) return 'text-green-600'
  if (minutes < 30) return 'text-orange-500'
  return 'text-red-600'
}

interface Props {
  order: Order
  storeId: string
  onClick: () => void
  onEdit: () => void
  onDelete?: (orderId: string) => void
  actionButton: React.ReactNode
}

export default function OrderCard({ order, onClick, onEdit, onDelete, actionButton }: Props) {
  const { t, lang } = useT()
  const [reprinting, setReprinting] = useState(false)
  const [reprintFeedback, setReprintFeedback] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const config = {
    label: t.dashboard.status[order.status],
    color: STATUS_COLORS[order.status],
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (deleting || !onDelete) return
    const confirmed = window.confirm(t.dashboard.deleteOrderConfirm)
    if (!confirmed) return
    setDeleting(true)
    try {
      onDelete(order.id)
    } finally {
      setDeleting(false)
    }
  }

  const handleReprint = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (reprinting) return
    setReprinting(true)
    try {
      // Convert OrderItem[] → ReceiptItem[] (filter voided, join options)
      const items = order.items
        .filter(it => !it.voided)
        .map(it => ({
          name: localized(it, lang),
          qty: it.quantity,
          price: itemLineTotal(it), // KitchenTicket doesn't render price, but type requires it
          opts: (it.selectedOptions ?? [])
            .map(op => op.choiceName || op.choiceNameEn || '')
            .filter(Boolean)
            .join(', '),
          remark: it.remark,
        }))

      const html = buildKitchenTicketHtml({
        items,
        table: { name: order.tableName },
        orderNumber: order.orderNumber,
        lang,
        paperWidth: 80,
        variant: 'auto',
      })
      openPrintWindow(html)

      setReprintFeedback(true)
      setTimeout(() => setReprintFeedback(false), 2000)
    } catch (err) {
      console.error('Failed to print kitchen ticket:', err)
    } finally {
      setReprinting(false)
    }
  }

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-lg font-bold">
              #{order.orderNumber}
            </span>
            <Badge variant="outline" className={config.color}>
              {config.label}
            </Badge>
            <span className={`text-sm font-medium ${timeColor(order.createdAt)}`}>
              {timeAgo(order.createdAt)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="min-h-[44px] min-w-[44px] text-muted-foreground hover:text-foreground"
              onClick={handleReprint}
              disabled={reprinting}
              title={t.dashboard.reprint}
            >
              {reprintFeedback
                ? <span className="text-xs text-green-600">{t.dashboard.printed}</span>
                : <Printer className="h-4 w-4" />}
            </Button>
            {order.status !== 'served' && (
              <Button
                variant="ghost"
                size="sm"
                className="min-h-[44px] text-blue-600 hover:text-blue-700"
                onClick={e => { e.stopPropagation(); onEdit() }}
              >
                {t.dashboard.editOrder}
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="min-h-[44px] min-w-[44px] text-red-500 hover:text-red-700 hover:bg-red-50"
                onClick={handleDelete}
                disabled={deleting}
                title={t.dashboard.deleteOrder}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{order.tableName}</span>
          {order.customerName && (
            <>
              <span>·</span>
              <span>{order.customerName}</span>
            </>
          )}
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="p-3 md:p-4 pt-3">
        {/* Item list */}
        <ul className="space-y-1 mb-3">
          {order.items.map((item, idx) => (
            <li key={idx} className="flex justify-between text-sm">
              <div>
                <span>{localized(item, lang)}</span>
                <span className="text-muted-foreground ml-1">
                  x{item.quantity}
                </span>
                {item.selectedOptions && item.selectedOptions.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {item.selectedOptions.map((o, idx) => (
                      <span key={idx} className="text-[10px] bg-orange-50 text-orange-700 rounded px-1.5 py-0.5">
                        {optionLabel(o)}
                      </span>
                    ))}
                  </div>
                )}
                {item.remark && (
                  <span className="text-xs text-orange-600 ml-2">
                    ({item.remark})
                  </span>
                )}
              </div>
              <span className="text-muted-foreground">
                {formatPriceUSD(itemUnitPrice(item) * item.quantity)}
              </span>
            </li>
          ))}
        </ul>

        {/* Total and action */}
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="font-semibold">
            {t.common.total}: {formatPriceUSD(order.totalPrice)}
          </span>
          {actionButton}
        </div>
      </CardContent>
    </Card>
  )
}

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ShoppingBag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useSessionStore } from '@/stores/session-store'
import { formatPriceUSD } from '@/lib/format'
import { itemLineTotal } from '@/lib/pricing'
import { api } from '@/services/api'
import type { Order } from '@qr-order/shared'

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-orange-100 text-orange-700',
  paid: 'bg-purple-100 text-purple-700',
  preparing: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-600',
}

export default function OrderHistoryPage() {
  const { storeId } = useParams<{ storeId: string }>()
  const navigate = useNavigate()
  const { tableId, tableName } = useSessionStore()
  const { t, i18n } = useTranslation('customer')
  const lang = i18n.language
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!storeId || !tableId) return
    api.getTableOrders(storeId, tableId)
      .then(data => setOrders(data.sort((a, b) => b.createdAt.localeCompare(a.createdAt))))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [storeId, tableId])

  return (
    <div className="min-h-screen bg-background pb-safe">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card/90 backdrop-blur-xl px-4 py-3 flex items-center gap-3 shadow-sm">
        <Button variant="ghost" size="icon" onClick={() => navigate(storeId ? `/menu/${storeId}` : '/')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-semibold">
            {lang === 'zh' ? '历史订单' : 'Order History'}
            <span className="text-muted-foreground font-normal text-sm ml-1.5">
              / {lang === 'zh' ? 'Order History' : '历史订单'}
            </span>
          </h1>
        </div>
        {tableName && (
          <span className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-semibold px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            {tableName}
          </span>
        )}
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-3">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">{t('common:loading')}</div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <ShoppingBag className="h-12 w-12 text-muted-foreground/30" />
            <p className="text-muted-foreground">{t('orderHistory.noOrders')}</p>
            <Button onClick={() => navigate(storeId ? `/menu/${storeId}` : '/')}
              className="bg-primary hover:bg-primary/90">
              {t('orderHistory.backToMenu')}
            </Button>
          </div>
        ) : (
          orders.map(order => (
            <div key={order.id} className="bg-card rounded-2xl p-4 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold">#{order.orderNumber}</span>
                <Badge className={`${STATUS_COLORS[order.status] ?? ''} border-0 text-xs`}>
                  {order.status}
                </Badge>
              </div>
              <div className="space-y-1">
                {order.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {item.quantity}x {item.name}
                      {item.selectedOptions && item.selectedOptions.length > 0 && (
                        <span className="text-xs text-orange-600 ml-1">
                          ({item.selectedOptions.map(o => (o.choiceName || o.choiceNameEn || "")).join(', ')})
                        </span>
                      )}
                    </span>
                    <span className="text-muted-foreground">
                      {formatPriceUSD(itemLineTotal(item))}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="text-xs text-muted-foreground">
                  {new Date(order.createdAt).toLocaleString()}
                </span>
                <span className="font-bold text-primary">{formatPriceUSD(order.totalPrice)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

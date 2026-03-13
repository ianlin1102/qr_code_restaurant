import { useLocation, useNavigate } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useSessionStore } from '@/stores/session-store'
import { formatPriceCNY } from '@/lib/format'
import type { Order } from '@qr-order/shared'

export default function OrderConfirmPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { storeId } = useSessionStore()
  const { t } = useTranslation('customer')

  const order = (location.state as { order?: Order } | null)?.order

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h2 className="text-lg font-semibold mb-2">{t('orderConfirm.notFound')}</h2>
        <p className="text-muted-foreground text-center mb-4">
          {t('orderConfirm.notFoundPrompt')}
        </p>
        <Button onClick={() => navigate(storeId ? `/menu/${storeId}` : '/')}>
          {t('cart.backToMenu')}
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center px-4 pt-8 md:pt-12 pb-safe">
      <div className="max-w-lg w-full space-y-6">
        {/* Success */}
        <div className="flex flex-col items-center text-center space-y-3">
          <CheckCircle2 className="h-16 w-16 text-green-500" />
          <h1 className="text-2xl font-bold">{t('orderConfirm.success')}</h1>
          <p className="text-muted-foreground">
            {t('orderConfirm.successPrompt')}
          </p>
        </div>

        {/* Order number */}
        <Card className="p-6 text-center space-y-1">
          <p className="text-sm text-muted-foreground">{t('orderConfirm.orderNumber')}</p>
          <p className="text-3xl font-bold tracking-wider">{order.orderNumber}</p>
          {order.tableName && (
            <p className="text-sm text-muted-foreground">
              {t('orderConfirm.tableLabel')}: {order.tableName}
            </p>
          )}
        </Card>

        {/* Order items */}
        <Card className="p-4 space-y-3">
          <h2 className="font-semibold">{t('orderConfirm.orderDetail')}</h2>
          <Separator />
          <ul className="space-y-2">
            {order.items.map((item, idx) => (
              <li key={`${item.menuItemId}-${idx}`} className="flex items-start justify-between text-sm">
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{item.name}</span>
                  <span className="text-muted-foreground ml-2">x{item.quantity}</span>
                  {item.selectedOptions && item.selectedOptions.length > 0 && (
                    <p className="text-xs text-orange-600">
                      {item.selectedOptions.map(o => o.choiceName).join(' / ')}
                    </p>
                  )}
                  {item.remark && (
                    <p className="text-xs text-muted-foreground truncate">{item.remark}</p>
                  )}
                </div>
                <span className="font-medium whitespace-nowrap ml-2">
                  {formatPriceCNY(
                    (item.price + (item.selectedOptions ?? []).reduce((s, o) => s + o.priceAdjust, 0)) * item.quantity
                  )}
                </span>
              </li>
            ))}
          </ul>
          <Separator />
          <div className="flex items-center justify-between font-semibold">
            <span>{t('common:total')}</span>
            <span className="text-lg">{formatPriceCNY(order.totalPrice)}</span>
          </div>
        </Card>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            className="w-full"
            size="lg"
            onClick={() => navigate(storeId ? `/menu/${storeId}` : '/')}
          >
            {t('orderConfirm.continueOrder')}
          </Button>
          <Button
            variant="outline"
            className="w-full"
            size="lg"
            onClick={() => navigate('/cart')}
          >
            {t('orderConfirm.viewAllOrders')}
          </Button>
        </div>
      </div>
    </div>
  )
}

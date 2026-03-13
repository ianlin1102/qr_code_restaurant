import { useState, useEffect } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2, XCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useSessionStore } from '@/stores/session-store'
import { formatPriceUSD } from '@/lib/format'
import { api } from '@/services/api'
import type { Order } from '@qr-order/shared'

export default function OrderConfirmPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { storeId, tableId } = useSessionStore()
  const { t } = useTranslation('customer')

  // Stripe redirect params
  const redirectStatus = searchParams.get('redirect_status')
  const isStripeRedirect = redirectStatus !== null

  // Order from navigation state (pre-payment flow)
  const stateOrder = (location.state as { order?: Order } | null)?.order

  // For Stripe redirects, fetch latest orders to show confirmation
  const [paidOrder, setPaidOrder] = useState<Order | null>(null)

  useEffect(() => {
    if (isStripeRedirect && redirectStatus === 'succeeded' && storeId && tableId) {
      api.getTableOrders(storeId, tableId).then((orders) => {
        const paid = orders.find((o) => o.status === 'paid')
        if (paid) setPaidOrder(paid)
      }).catch(() => {})
    }
  }, [isStripeRedirect, redirectStatus, storeId, tableId])

  // Stripe redirect: payment failed
  if (isStripeRedirect && redirectStatus !== 'succeeded') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 space-y-4">
        <XCircle className="h-16 w-16 text-destructive" />
        <h2 className="text-lg font-semibold">Payment Failed</h2>
        <p className="text-muted-foreground text-center">
          Your payment was not completed. Please try again.
        </p>
        <Button onClick={() => navigate(storeId ? `/menu/${storeId}` : '/')}>
          {t('cart.backToMenu')}
        </Button>
      </div>
    )
  }

  // Stripe redirect: payment succeeded
  if (isStripeRedirect && redirectStatus === 'succeeded') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center px-4 pt-8 md:pt-12 pb-safe">
        <div className="max-w-lg w-full space-y-6">
          <div className="flex flex-col items-center text-center space-y-3">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
            <h1 className="text-2xl font-bold">Payment Successful</h1>
            <p className="text-muted-foreground">
              Your payment has been received. Your order is being prepared.
            </p>
          </div>

          {paidOrder && (
            <Card className="p-6 text-center space-y-1">
              <p className="text-sm text-muted-foreground">{t('orderConfirm.orderNumber')}</p>
              <p className="text-3xl font-bold tracking-wider">{paidOrder.orderNumber}</p>
              <p className="text-lg font-semibold mt-2">{formatPriceUSD(paidOrder.totalPrice)}</p>
            </Card>
          )}

          <div className="space-y-3">
            <Button className="w-full" size="lg" onClick={() => navigate(storeId ? `/menu/${storeId}` : '/')}>
              {t('orderConfirm.continueOrder')}
            </Button>
            <Button variant="outline" className="w-full" size="lg" onClick={() => navigate('/cart')}>
              {t('orderConfirm.viewAllOrders')}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Normal flow (non-Stripe): order passed via navigation state
  const order = stateOrder
  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h2 className="text-lg font-semibold mb-2">{t('orderConfirm.notFound')}</h2>
        <p className="text-muted-foreground text-center mb-4">{t('orderConfirm.notFoundPrompt')}</p>
        <Button onClick={() => navigate(storeId ? `/menu/${storeId}` : '/')}>
          {t('cart.backToMenu')}
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center px-4 pt-8 md:pt-12 pb-safe">
      <div className="max-w-lg w-full space-y-6">
        <div className="flex flex-col items-center text-center space-y-3">
          <CheckCircle2 className="h-16 w-16 text-green-500" />
          <h1 className="text-2xl font-bold">{t('orderConfirm.success')}</h1>
          <p className="text-muted-foreground">{t('orderConfirm.successPrompt')}</p>
        </div>

        <Card className="p-6 text-center space-y-1">
          <p className="text-sm text-muted-foreground">{t('orderConfirm.orderNumber')}</p>
          <p className="text-3xl font-bold tracking-wider">{order.orderNumber}</p>
          {order.tableName && (
            <p className="text-sm text-muted-foreground">
              {t('orderConfirm.tableLabel')}: {order.tableName}
            </p>
          )}
        </Card>

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
                      {item.selectedOptions.map((o) => o.choiceName).join(' / ')}
                    </p>
                  )}
                  {item.remark && <p className="text-xs text-muted-foreground truncate">{item.remark}</p>}
                </div>
                <span className="font-medium whitespace-nowrap ml-2">
                  {formatPriceUSD(
                    (item.price + (item.selectedOptions ?? []).reduce((s, o) => s + o.priceAdjust, 0)) * item.quantity,
                  )}
                </span>
              </li>
            ))}
          </ul>
          <Separator />
          <div className="flex items-center justify-between font-semibold">
            <span>{t('common:total')}</span>
            <span className="text-lg">{formatPriceUSD(order.totalPrice)}</span>
          </div>
        </Card>

        <div className="space-y-3">
          <Button className="w-full" size="lg" onClick={() => navigate(storeId ? `/menu/${storeId}` : '/')}>
            {t('orderConfirm.continueOrder')}
          </Button>
          <Button variant="outline" className="w-full" size="lg" onClick={() => navigate('/cart')}>
            {t('orderConfirm.viewAllOrders')}
          </Button>
        </div>
      </div>
    </div>
  )
}

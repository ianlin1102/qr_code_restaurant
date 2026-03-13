import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2, XCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useSessionStore } from '@/stores/session-store'
import { useCartStore } from '@/stores/cart-store'
import { formatPriceUSD } from '@/lib/format'
import { api } from '@/services/api'
import type { Order } from '@qr-order/shared'

export default function OrderConfirmPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { storeId, tableId } = useSessionStore()
  const clearCart = useCartStore(s => s.clearCart)
  const { t } = useTranslation('customer')

  const redirectStatus = searchParams.get('redirect_status')
  const paymentSuccess = redirectStatus === 'succeeded'
  const paymentFailed = redirectStatus !== null && !paymentSuccess

  const [paidOrder, setPaidOrder] = useState<Order | null>(null)

  // On successful payment: clear cart and fetch the paid order
  useEffect(() => {
    if (!paymentSuccess || !storeId || !tableId) return
    clearCart()
    api.getTableOrders(storeId, tableId).then((orders) => {
      const paid = orders.find((o) => o.status === 'paid')
      if (paid) setPaidOrder(paid)
    }).catch(() => {})
  }, [paymentSuccess, storeId, tableId, clearCart])

  // Payment failed
  if (paymentFailed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 space-y-4">
        <XCircle className="h-16 w-16 text-destructive" />
        <h2 className="text-lg font-semibold">{t('orderConfirm.paymentFailed')}</h2>
        <p className="text-muted-foreground text-center">
          {t('orderConfirm.paymentFailedPrompt')}
        </p>
        <Button onClick={() => navigate(storeId ? `/menu/${storeId}` : '/')}>
          {t('cart.backToMenu')}
        </Button>
      </div>
    )
  }

  // Payment succeeded
  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center px-4 pt-8 md:pt-12 pb-safe">
        <div className="max-w-lg w-full space-y-6">
          <div className="flex flex-col items-center text-center space-y-3">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
            <h1 className="text-2xl font-bold">{t('orderConfirm.success')}</h1>
            <p className="text-muted-foreground">{t('orderConfirm.successPrompt')}</p>
          </div>

          {paidOrder && (
            <Card className="p-6 text-center space-y-1">
              <p className="text-sm text-muted-foreground">{t('orderConfirm.orderNumber')}</p>
              <p className="text-3xl font-bold tracking-wider">{paidOrder.orderNumber}</p>
              <p className="text-lg font-semibold mt-2">{formatPriceUSD(paidOrder.totalPrice)}</p>
            </Card>
          )}

          <Button className="w-full" size="lg" onClick={() => navigate(storeId ? `/menu/${storeId}` : '/')}>
            {t('orderConfirm.continueOrder')}
          </Button>
        </div>
      </div>
    )
  }

  // No redirect_status — direct navigation (shouldn't happen in normal flow)
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

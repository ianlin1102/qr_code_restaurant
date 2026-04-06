import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { CheckCircle2, Clock, Headset, Loader2, XCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useSessionStore } from '@/stores/session-store'
import { useCartStore } from '@/stores/cart-store'
import { formatPriceUSD } from '@/lib/format'
import { api } from '@/services/api'
import type { Order } from '@qr-order/shared'

export default function OrderConfirmPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { storeId, tableId, tableName } = useSessionStore()
  const clearCart = useCartStore(s => s.clearCart)
  const { t, i18n } = useTranslation('customer')
  const lang = i18n.language

  const location = useLocation()
  const stateOrder = (location.state as { order?: Order })?.order ?? null

  const redirectStatus = searchParams.get('redirect_status')
  const paymentSuccess = redirectStatus === 'succeeded'
  const paymentFailed = redirectStatus !== null && !paymentSuccess
  // Pay-later flow: order passed via location.state (no Stripe redirect)
  const isPayLater = !redirectStatus && !!stateOrder

  const [paidOrder, setPaidOrder] = useState<Order | null>(stateOrder)
  const [orderTimeout, setOrderTimeout] = useState(false)

  // Pay-later: clear cart immediately (local + server)
  useEffect(() => {
    if (!isPayLater) return
    clearCart()
    if (storeId && tableId) {
      api.getActiveSession(storeId, tableId).then(s => {
        if (s) api.updateSessionCart(storeId, s.id, []).catch(() => {})
      }).catch(() => {})
    }
  }, [isPayLater, clearCart, storeId, tableId])

  // On successful payment: clear cart (local + server), poll for the paid order (webhook may be delayed)
  useEffect(() => {
    if (!paymentSuccess || !storeId || !tableId) return
    clearCart()
    // Clear shared cart on server
    api.getActiveSession(storeId, tableId).then(s => {
      if (s) api.updateSessionCart(storeId, s.id, []).catch(() => {})
    }).catch(() => {})
    let attempts = 0
    const maxAttempts = 5
    const poll = () => {
      api.getTableOrders(storeId, tableId).then((orders) => {
        // In the new Session model, orders no longer carry isPaid.
        // After payment, the most recent order is the one just placed.
        const paid = orders
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
        if (paid) {
          setPaidOrder(paid)
        } else if (++attempts < maxAttempts) {
          setTimeout(poll, 2000)
        } else {
          setOrderTimeout(true) // Show fallback after timeout
        }
      }).catch(() => { if (++attempts < maxAttempts) setTimeout(poll, 2000); else setOrderTimeout(true) })
    }
    poll()
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
      <div className="min-h-screen bg-background flex flex-col items-center px-4 pt-8 md:pt-12 pb-safe">
        <div className="max-w-lg w-full space-y-6">
          {tableName && (
            <div className="flex justify-center">
              <span className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-semibold px-3 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                {tableName}
              </span>
            </div>
          )}
          <div className="flex flex-col items-center text-center space-y-3">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
            <h1 className="text-2xl font-bold">
              {lang === 'zh' ? '下单成功！' : 'Order Confirmed!'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {lang === 'zh' ? '订单已确认' : 'Your order is being prepared'}
              <span className="text-muted-foreground/60 ml-1">
                / {lang === 'zh' ? 'Order Confirmed' : '订单已确认'}
              </span>
            </p>
          </div>

          {paidOrder ? (
            <div className="bg-card rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold text-muted-foreground tracking-wider">
                  {lang === 'zh' ? '订单详情' : 'RECEIPT SUMMARY'}
                </p>
                <Badge className="bg-green-100 text-green-700 border-0 text-xs">{t('common.kitchenNotified')}</Badge>
              </div>
              <div className="space-y-2 border-t pt-3">
                {paidOrder.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <div>
                      <span className="font-medium">{item.quantity}x</span>
                      <span className="ml-1.5">{item.name}</span>
                      {item.selectedOptions && item.selectedOptions.length > 0 && (
                        <span className="text-xs text-orange-600 ml-1">
                          ({item.selectedOptions.map(o => (o.choiceName || o.choiceNameEn || "")).join(', ')})
                        </span>
                      )}
                      {item.remark && (
                        <p className="text-xs text-muted-foreground ml-5">{item.remark}</p>
                      )}
                    </div>
                    <span className="text-muted-foreground">{formatPriceUSD(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t pt-3 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {lang === 'zh' ? '总金额' : 'Total Amount'}
                  <span className="text-muted-foreground/60 ml-1">/ {lang === 'zh' ? 'Total' : '总金额'}</span>
                </span>
                <span className="text-xl font-bold text-primary">{formatPriceUSD(paidOrder.totalPrice)}</span>
              </div>
            </div>
          ) : orderTimeout ? (
            <div className="bg-card rounded-2xl p-5 shadow-sm text-center space-y-2">
              <Badge className="bg-green-100 text-green-700 border-0 text-xs">
                {lang === 'zh' ? '支付成功' : 'Payment Successful'}
              </Badge>
              <p className="text-sm text-muted-foreground">
                {lang === 'zh' ? '订单正在处理中，请稍候查看订单状态。' : 'Your order is being processed. Check order status shortly.'}
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">{t('orderConfirm.loadingOrder')}</span>
            </div>
          )}

          {/* Estimated wait time */}
          {paidOrder && (
            <div className="bg-card rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground tracking-wider uppercase">
                  {t('orderConfirm.estimatedTime')}
                </p>
                <p className="text-lg font-bold text-primary">
                  {(() => {
                    const itemCount = paidOrder.items.reduce((s, i) => s + i.quantity, 0)
                    const min = Math.max(10, itemCount * 3)
                    const max = Math.min(30, min + 5)
                    return t('orderConfirm.minutes', { min, max })
                  })()}
                </p>
              </div>
            </div>
          )}

          <Button className="w-full bg-primary hover:bg-primary/90" size="lg" onClick={() => navigate(storeId ? `/menu/${storeId}` : '/')}>
            {lang === 'zh' ? '继续点菜' : 'Continue Ordering'}
            <span className="text-white/70 text-xs ml-1.5">
              / {lang === 'zh' ? 'Continue Ordering' : '继续点菜'}
            </span>
          </Button>

          {/* Help bar */}
          <div className="bg-card rounded-full shadow-sm px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Headset className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{t('orderConfirm.needHelp')}</span>
            </div>
            <Button variant="outline" size="sm" className="rounded-full text-xs h-7 px-3 border-primary text-primary">
              {t('orderConfirm.callStaff')}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Pay-later flow OR direct navigation
  if (isPayLater || paidOrder) {
    // Render the same success UI as paymentSuccess
    return (
      <div className="min-h-screen bg-background flex flex-col items-center px-4 pt-8 md:pt-12 pb-safe">
        <div className="max-w-lg w-full space-y-6">
          {tableName && (
            <div className="flex justify-center">
              <span className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-semibold px-3 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                {tableName}
              </span>
            </div>
          )}
          <div className="flex flex-col items-center text-center space-y-3">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
            <h1 className="text-2xl font-bold">
              {lang === 'zh' ? '下单成功！' : 'Order Placed!'}
            </h1>
          </div>
          {paidOrder && (
            <div className="bg-card rounded-2xl p-5 shadow-sm space-y-3">
              <p className="text-[10px] font-semibold text-muted-foreground tracking-wider">
                {lang === 'zh' ? '订单详情' : 'ORDER DETAILS'} — #{paidOrder.orderNumber}
              </p>
              <div className="space-y-2 border-t pt-3">
                {paidOrder.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span><span className="font-medium">{item.quantity}x</span> {item.name}</span>
                    <span className="text-muted-foreground">{formatPriceUSD(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t pt-3 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{lang === 'zh' ? '总金额' : 'Total'}</span>
                <span className="text-xl font-bold text-primary">{formatPriceUSD(paidOrder.totalPrice)}</span>
              </div>
            </div>
          )}
          <Button className="w-full" size="lg" onClick={() => navigate(storeId ? `/menu/${storeId}` : '/')}>
            {lang === 'zh' ? '继续点菜' : 'Continue Ordering'}
          </Button>
        </div>
      </div>
    )
  }

  // Unknown state
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

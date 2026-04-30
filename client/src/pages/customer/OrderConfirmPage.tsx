import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useSessionStore } from '@/stores/session-store'
import { useCartStore } from '@/stores/cart-store'
import { formatPriceUSD } from '@/lib/format'
import { itemLineTotal } from '@/lib/pricing'
import { getDeviceId } from '@/lib/device-id'
import { api } from '@/services/api'
import { useSessionEvents } from '@/hooks/useSessionEvents'
import { usePaymentStore } from '@/stores/payment-store'
import type { Order } from '@qr-order/shared'

export default function OrderConfirmPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { storeId, tableId, tableName } = useSessionStore()
  const paymentSessionId = usePaymentStore(s => s.sessionId)
  const clearMyItems = useCartStore(s => s.clearMyItems)
  const { t, i18n } = useTranslation('customer')
  const lang = i18n.language

  const location = useLocation()
  const stateOrder = (location.state as { order?: Order })?.order ?? null
  const alreadySubmitted = (location.state as { alreadySubmitted?: boolean })?.alreadySubmitted ?? false

  const redirectStatus = searchParams.get('redirect_status')
  const paymentSuccess = redirectStatus === 'succeeded'
  const paymentFailed = redirectStatus !== null && !paymentSuccess
  const isPayLater = !redirectStatus && !!stateOrder

  const [paidOrder, setPaidOrder] = useState<Order | null>(stateOrder)
  const [orderTimeout, setOrderTimeout] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState<number | null>(null)
  // Track whether this is a settlement (partial) payment vs a new order payment
  const [isSettlement, setIsSettlement] = useState(false)
  // SSE: use sessionId from payment store for real-time updates
  const { subscribe } = useSessionEvents(storeId, paymentSessionId)

  // Pay-later: clear own items
  useEffect(() => {
    if (!isPayLater) return
    const deviceId = getDeviceId()
    clearMyItems()
    if (storeId && tableId) {
      api.getActiveSession(storeId, tableId).then(s => {
        if (s) api.updateSessionCart(storeId, s.id, deviceId, []).catch(() => {})
      }).catch(() => {})
    }
  }, [isPayLater, clearMyItems, storeId, tableId])

  // Check session for payment confirmation (shared by both retry and SSE)
  const checkPaymentConfirmed = useCallback((piId: string | null) => {
    if (!storeId || !tableId) return
    api.getActiveSession(storeId, tableId).then(s => {
      if (!s) return

      const thisPayment = piId
        ? s.payments.find(p => p.stripePaymentIntentId === piId)
        : null
      if (!thisPayment && piId) return // not yet confirmed

      const amount = thisPayment?.amount ?? null
      setPaymentAmount(amount)

      const settlement = !!(s.settlementMode || (s.paidItemIds && s.paidItemIds.length > 0))
      setIsSettlement(settlement)

      if (s.orders.length > 0) {
        if (settlement) {
          setPaidOrder({ ...s.orders[0], items: [], totalPrice: amount ?? 0 })
        } else {
          setPaidOrder({ ...s.orders[0], items: s.orders.flatMap(o => o.items), totalPrice: amount ?? s.totalPaid })
        }
      } else { setOrderTimeout(true) }
    }).catch(() => {})
  }, [storeId, tableId])

  // On successful Stripe payment: retry polling for payment confirmation (fallback)
  useEffect(() => {
    if (!paymentSuccess || !storeId || !tableId) return
    const deviceId = getDeviceId()
    const piId = searchParams.get('payment_intent')
    clearMyItems()
    api.getActiveSession(storeId, tableId).then(s => {
      if (s) api.updateSessionCart(storeId, s.id, deviceId, []).catch(() => {})
    }).catch(() => {})

    let attempts = 0
    const maxAttempts = 7 // ~21s at 3s intervals
    const poll = () => {
      api.getActiveSession(storeId, tableId).then(s => {
        if (!s) { if (++attempts < maxAttempts) setTimeout(poll, 3000); else setOrderTimeout(true); return }

        const thisPayment = piId
          ? s.payments.find(p => p.stripePaymentIntentId === piId)
          : null
        if (!thisPayment && piId && ++attempts < maxAttempts) { setTimeout(poll, 3000); return }

        const amount = thisPayment?.amount ?? null
        setPaymentAmount(amount)

        const settlement = !!(s.settlementMode || (s.paidItemIds && s.paidItemIds.length > 0))
        setIsSettlement(settlement)

        if (s.orders.length > 0) {
          if (settlement) {
            setPaidOrder({ ...s.orders[0], items: [], totalPrice: amount ?? 0 })
          } else {
            setPaidOrder({ ...s.orders[0], items: s.orders.flatMap(o => o.items), totalPrice: amount ?? s.totalPaid })
          }
        } else { setOrderTimeout(true) }
      }).catch(() => { if (++attempts < maxAttempts) setTimeout(poll, 3000); else setOrderTimeout(true) })
    }
    poll()
  }, [paymentSuccess, storeId, tableId, clearMyItems, searchParams])

  // SSE-driven payment confirmation: on session:summary, check if payment appeared
  useEffect(() => {
    if (!paymentSuccess) return
    const piId = searchParams.get('payment_intent')
    return subscribe('session:summary', () => { checkPaymentConfirmed(piId) })
  }, [paymentSuccess, subscribe, searchParams, checkPaymentConfirmed])

  // Payment failed
  if (paymentFailed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 space-y-4">
        <XCircle className="h-16 w-16 text-destructive" />
        <h2 className="text-lg font-semibold">{t('orderConfirm.paymentFailed')}</h2>
        <p className="text-muted-foreground text-center">{t('orderConfirm.paymentFailedPrompt')}</p>
        <Button onClick={() => navigate(storeId ? `/menu/${storeId}` : '/')}>
          {t('cart.backToMenu')}
        </Button>
      </div>
    )
  }

  // Payment succeeded (Stripe redirect)
  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center px-4 pt-8 md:pt-12 pb-safe">
        <div className="max-w-lg w-full space-y-6">
          {tableName && (
            <div className="flex justify-center">
              <span className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-semibold px-3 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-success" />
                {tableName}
              </span>
            </div>
          )}
          <div className="flex flex-col items-center text-center space-y-3">
            <CheckCircle2 className="h-16 w-16 text-success" />
            <h1 className="text-2xl font-bold">
              {lang === 'zh' ? '支付成功！' : 'Payment Successful!'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {lang === 'zh' ? '感谢您的支付' : 'Thank you for your payment'}
            </p>
          </div>

          {paidOrder ? (
            <div className="bg-card rounded-2xl p-5 shadow-sm space-y-3">
              {/* Settlement payment: show amount only, no item list */}
              {isSettlement ? (
                <>
                  <p className="text-[10px] font-semibold text-muted-foreground tracking-wider">
                    {lang === 'zh' ? '支付详情' : 'PAYMENT DETAILS'}
                  </p>
                  <div className="border-t pt-3 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {lang === 'zh' ? '已付金额' : 'Amount Paid'}
                    </span>
                    <span className="text-xl font-bold text-primary">
                      {formatPriceUSD(paymentAmount ?? paidOrder.totalPrice)}
                    </span>
                  </div>
                </>
              ) : (
                /* New order / pay-first payment: show item list */
                <>
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
                        </div>
                        <span className="text-muted-foreground">{formatPriceUSD(itemLineTotal(item))}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t pt-3 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {paymentAmount != null ? (lang === 'zh' ? '已付金额' : 'Amount Paid') : (lang === 'zh' ? '总金额' : 'Total Amount')}
                    </span>
                    <span className="text-xl font-bold text-primary">
                      {formatPriceUSD(paymentAmount ?? paidOrder.totalPrice)}
                    </span>
                  </div>
                </>
              )}
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

          {/* No estimated time for settlement payments */}

          <Button className="w-full bg-primary hover:bg-primary/90" size="lg" onClick={() => navigate(storeId ? `/menu/${storeId}` : '/')}>
            {lang === 'zh' ? '继续点菜' : 'Continue Ordering'}
          </Button>
        </div>
      </div>
    )
  }

  // Pay-later flow OR cart submitted by another device
  if (isPayLater || paidOrder || alreadySubmitted) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center px-4 pt-8 md:pt-12 pb-safe">
        <div className="max-w-lg w-full space-y-6">
          {tableName && (
            <div className="flex justify-center">
              <span className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-semibold px-3 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-success" />
                {tableName}
              </span>
            </div>
          )}
          <div className="flex flex-col items-center text-center space-y-3">
            <CheckCircle2 className="h-16 w-16 text-success" />
            <h1 className="text-2xl font-bold">
              {alreadySubmitted
                ? (lang === 'zh' ? '订单已提交！' : 'Order Already Submitted!')
                : (lang === 'zh' ? '下单成功！' : 'Order Placed!')}
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
                    <span className="text-muted-foreground">{formatPriceUSD(itemLineTotal(item))}</span>
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

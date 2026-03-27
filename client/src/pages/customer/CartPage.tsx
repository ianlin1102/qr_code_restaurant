import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Info, Loader2, Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useCartStore, unitPrice } from '@/stores/cart-store'
import { useSessionStore } from '@/stores/session-store'
import { formatPriceUSD } from '@/lib/format'
import { api } from '@/services/api'

export default function CartPage() {
  const navigate = useNavigate()
  const { storeId, tableId, tableName, customerName } = useSessionStore()
  const { items, updateQuantity, updateRemark, totalPrice, totalItems, clearCart } = useCartStore()
  const { t, i18n } = useTranslation('customer')
  const lang = i18n.language
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentMode, setPaymentMode] = useState<'pay-first' | 'pay-later'>('pay-first')

  useEffect(() => {
    if (!storeId || !tableId) return
    api.getTable(storeId, tableId).then(table => {
      if (table.paymentMode === 'pay-later') setPaymentMode('pay-later')
    }).catch(() => { /* keep default pay-first */ })
  }, [storeId, tableId])

  if (!storeId || !tableId) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <ShoppingCart className="h-16 w-16 text-muted-foreground mb-4" />
      <h2 className="text-lg font-semibold mb-2">{t('cart.noTable')}</h2>
      <p className="text-muted-foreground text-center mb-4">{t('cart.scanPrompt')}</p>
    </div>
  )

  if (items.length === 0) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <ShoppingCart className="h-16 w-16 text-muted-foreground mb-4" />
      <h2 className="text-lg font-semibold mb-2">{t('cart.emptyCart')}</h2>
      <p className="text-muted-foreground text-center mb-4">{t('cart.emptyPrompt')}</p>
      <Button onClick={() => navigate(`/menu/${storeId}`)}>{t('cart.backToMenu')}</Button>
    </div>
  )

  async function handleCheckout() {
    if (!storeId || !tableId) return
    setError(null)
    setSubmitting(true)

    const cartItems = items.map(({ menuItemId, quantity, remark, selectedOptions }) => ({
      menuItemId,
      quantity,
      ...(remark ? { remark } : {}),
      ...(selectedOptions && selectedOptions.length > 0 ? { selectedOptions } : {}),
    }))

    try {
      if (paymentMode === 'pay-later') {
        // Pay-later: create order directly without payment
        const order = await api.createOrder(storeId, { tableId, items: cartItems, customerName })
        clearCart()
        navigate('/order/confirm', { state: { order } })
        return
      }

      // Pay-first: create Stripe PaymentIntent, no order yet
      const { clientSecret, amount } = await api.createCheckout(storeId, {
        tableId, items: cartItems, customerName,
      })
      navigate(`/store/${storeId}/checkout`, { state: {
        clientSecret, amount, tableId, items: cartItems,
      } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start checkout')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card/90 backdrop-blur-xl px-4 py-3 flex items-center gap-3 shadow-sm">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(`/menu/${storeId}`)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-semibold">
            {lang === 'zh' ? '购物车' : 'Shopping Cart'}
            <span className="text-muted-foreground font-normal text-sm ml-1.5">
              / {lang === 'zh' ? 'Shopping Cart' : '购物车'}
            </span>
          </h1>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-semibold px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              {tableName}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4">
        <div className="space-y-3">
          {items.map((item) => {
            const price = unitPrice(item)
            return (
              <div key={item.cartKey} className="bg-card rounded-xl p-3 md:p-4 space-y-3 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="w-10 h-10 rounded-full bg-muted/50 shrink-0 flex items-center justify-center text-lg">
                    {item.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.name}</p>
                    {item.selectedOptions && item.selectedOptions.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.selectedOptions.map(opt => (
                          <Badge key={opt.optionId} variant="outline" className="text-xs rounded-full bg-blue-50 border-blue-200 text-blue-700">
                            {opt.optionName || opt.optionNameEn || ''}: {opt.choiceName || opt.choiceNameEn || ''}
                            {opt.priceAdjust > 0 && ` +${formatPriceUSD(opt.priceAdjust)}`}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground mt-1">
                      {formatPriceUSD(price)} {t('cart.perServing')}
                    </p>
                  </div>
                  <p className="font-semibold whitespace-nowrap">
                    {formatPriceUSD(price * item.quantity)}
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-11 w-11"
                      onClick={() => updateQuantity(item.cartKey, item.quantity - 1)}
                    >
                      {item.quantity === 1 ? (
                        <Trash2 className="h-4 w-4 text-destructive" />
                      ) : (
                        <Minus className="h-4 w-4" />
                      )}
                    </Button>
                    <span className="w-8 text-center font-medium">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-11 w-11"
                      onClick={() => updateQuantity(item.cartKey, item.quantity + 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <Input
                  placeholder={t('cart.remarkPlaceholder')}
                  value={item.remark ?? ''}
                  onChange={(e) => updateRemark(item.cartKey, e.target.value)}
                  className="text-base"
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-card/90 backdrop-blur-xl shadow-lg pb-safe">
        <div className="max-w-lg mx-auto p-4 space-y-3">
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-start gap-2">
            <Info className="size-4 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700">{t('common.allergyNotice')}</p>
          </div>
          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                {t('cart.itemCount', { count: totalItems() })}
              </p>
              <p className="text-2xl font-bold">{formatPriceUSD(totalPrice())}</p>
            </div>
            <Button
              size="lg"
              onClick={handleCheckout}
              disabled={submitting}
              className="min-w-[160px] min-h-[48px] bg-primary hover:bg-primary/90"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  {paymentMode === 'pay-later' ? t('cart.ordering') : t('cart.submitting')}
                </span>
              ) : (
                paymentMode === 'pay-later' ? t('cart.placeOrder') : t('cart.submitOrder')
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

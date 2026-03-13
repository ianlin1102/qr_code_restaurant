import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { useCartStore, unitPrice } from '@/stores/cart-store'
import { useSessionStore } from '@/stores/session-store'
import { formatPriceUSD } from '@/lib/format'
import { api } from '@/services/api'

export default function CartPage() {
  const navigate = useNavigate()
  const { storeId, tableId, tableName } = useSessionStore()
  const { items, updateQuantity, updateRemark, totalPrice, totalItems } = useCartStore()
  const { t } = useTranslation('customer')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // No session
  if (!storeId || !tableId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <ShoppingCart className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold mb-2">{t('cart.noTable')}</h2>
        <p className="text-muted-foreground text-center mb-4">
          {t('cart.scanPrompt')}
        </p>
      </div>
    )
  }

  // Empty cart
  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <ShoppingCart className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold mb-2">{t('cart.emptyCart')}</h2>
        <p className="text-muted-foreground text-center mb-4">
          {t('cart.emptyPrompt')}
        </p>
        <Button onClick={() => navigate(`/menu/${storeId}`)}>
          {t('cart.backToMenu')}
        </Button>
      </div>
    )
  }

  async function handleCheckout() {
    if (!storeId || !tableId) return
    setError(null)
    setSubmitting(true)

    try {
      // Only create Stripe PaymentIntent — no order created yet
      const { clientSecret, amount } = await api.createCheckout(storeId, {
        tableId,
        items: items.map(({ menuItemId, quantity, remark, selectedOptions }) => ({
          menuItemId,
          quantity,
          ...(remark ? { remark } : {}),
          ...(selectedOptions && selectedOptions.length > 0 ? { selectedOptions } : {}),
        })),
      })
      // Navigate to payment page with clientSecret (order created after payment succeeds)
      navigate(`/store/${storeId}/checkout`, { state: { clientSecret, amount } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start checkout')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b px-4 py-3 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(`/menu/${storeId}`)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-semibold">{t('cart.title')}</h1>
          {tableName && (
            <p className="text-xs text-muted-foreground">{t('cart.tableLabel')}: {tableName}</p>
          )}
        </div>
        <span className="text-sm text-muted-foreground">
          {t('cart.itemCount', { count: totalItems() })}
        </span>
      </div>

      <div className="max-w-lg mx-auto p-4">
        <div className="space-y-3">
          {items.map((item) => {
            const price = unitPrice(item)
            return (
              <Card key={item.cartKey} className="p-3 md:p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.name}</p>
                    {item.selectedOptions && item.selectedOptions.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.selectedOptions.map(opt => (
                          <Badge key={opt.optionId} variant="outline" className="text-xs">
                            {opt.optionName}: {opt.choiceName}
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
                      className="h-10 w-10"
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
                      className="h-10 w-10"
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
              </Card>
            )
          })}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg pb-safe">
        <div className="max-w-lg mx-auto p-4 space-y-3">
          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                {t('cart.itemCount', { count: totalItems() })}
              </p>
              <p className="text-xl font-bold">{formatPriceUSD(totalPrice())}</p>
            </div>
            <Button
              size="lg"
              onClick={handleCheckout}
              disabled={submitting}
              className="min-w-[140px]"
            >
              {submitting ? t('cart.submitting') : t('cart.submitOrder')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

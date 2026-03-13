import { useState, useEffect } from 'react'
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
import { formatPriceCNY } from '@/lib/format'
import { api } from '@/services/api'
import type { Order } from '@qr-order/shared'

const STATUS_KEYS: Record<string, { key: string; color: string }> = {
  pending: { key: 'status.pending', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  preparing: { key: 'status.preparing', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  completed: { key: 'status.completed', color: 'bg-green-100 text-green-800 border-green-200' },
}

const POLL_INTERVAL = 10000

export default function CartPage() {
  const navigate = useNavigate()
  const { storeId, tableId, tableName } = useSessionStore()
  const { items, updateQuantity, updateRemark, clearCart, totalPrice, totalItems } = useCartStore()
  const { t } = useTranslation('customer')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Previous orders for this table
  const [previousOrders, setPreviousOrders] = useState<Order[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)

  useEffect(() => {
    if (!storeId || !tableId) return
    setLoadingOrders(true)

    const fetchOrders = () => {
      api.getTableOrders(storeId, tableId)
        .then(orders => setPreviousOrders(orders))
        .catch(err => console.error('Failed to load orders:', err))
        .finally(() => setLoadingOrders(false))
    }

    fetchOrders()
    const interval = setInterval(fetchOrders, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [storeId, tableId])

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

  async function handlePlaceOrder() {
    if (!storeId || !tableId) return
    setError(null)
    setSubmitting(true)

    try {
      const order = await api.createOrder(storeId, {
        tableId,
        items: items.map(({ menuItemId, quantity, remark, selectedOptions }) => ({
          menuItemId,
          quantity,
          ...(remark ? { remark } : {}),
          ...(selectedOptions && selectedOptions.length > 0 ? { selectedOptions } : {}),
        })),
      })
      clearCart()
      navigate('/order/confirm', { state: { order } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to place order')
    } finally {
      setSubmitting(false)
    }
  }

  const prevOrderTotal = previousOrders.reduce((sum, o) => sum + o.totalPrice, 0)
  const hasCart = items.length > 0
  const hasPrevOrders = previousOrders.length > 0

  // Empty state: no cart and no previous orders
  if (!hasCart && !hasPrevOrders && !loadingOrders) {
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
        {hasCart && (
          <span className="text-sm text-muted-foreground">
            {t('cart.itemCount', { count: totalItems() })}
          </span>
        )}
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-6">
        {/* ===== Previous Orders (read-only) ===== */}
        {hasPrevOrders && (
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">
              {t('cart.previousOrders', { count: previousOrders.length })}
            </h2>
            <div className="space-y-3">
              {previousOrders.map(order => (
                <Card key={order.id} className="p-4 opacity-80">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">#{order.orderNumber}</span>
                      <Badge variant="outline" className={`text-xs ${STATUS_KEYS[order.status]?.color ?? ''}`}>
                        {t(`common:${STATUS_KEYS[order.status]?.key}`) ?? order.status}
                      </Badge>
                    </div>
                    <span className="text-sm font-semibold">{formatPriceCNY(order.totalPrice)}</span>
                  </div>
                  <ul className="space-y-1">
                    {order.items.map((item, idx) => (
                      <li key={idx} className="flex justify-between text-sm text-muted-foreground">
                        <div>
                          <span>{item.name}</span>
                          <span className="ml-1">x{item.quantity}</span>
                          {item.selectedOptions && item.selectedOptions.length > 0 && (
                            <span className="text-xs text-orange-600 ml-1">
                              ({item.selectedOptions.map(o => o.choiceName).join(', ')})
                            </span>
                          )}
                        </div>
                        <span>
                          {formatPriceCNY(
                            (item.price + (item.selectedOptions ?? []).reduce((s, o) => s + o.priceAdjust, 0)) * item.quantity
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Card>
              ))}

              {/* Previous orders total */}
              <div className="text-right text-sm text-muted-foreground">
                {t('cart.previousTotal')}: <span className="font-semibold">{formatPriceCNY(prevOrderTotal)}</span>
              </div>
            </div>

            {hasCart && <Separator className="my-4" />}
          </div>
        )}

        {/* ===== Current Cart (editable) ===== */}
        {hasCart && (
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">
              {hasPrevOrders ? t('cart.addMore') : t('cart.currentCart')}
            </h2>
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
                                {opt.priceAdjust > 0 && ` +${formatPriceCNY(opt.priceAdjust)}`}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <p className="text-sm text-muted-foreground mt-1">
                          {formatPriceCNY(price)} {t('cart.perServing')}
                        </p>
                      </div>
                      <p className="font-semibold whitespace-nowrap">
                        {formatPriceCNY(price * item.quantity)}
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
        )}
      </div>

      {/* Bottom bar */}
      {hasCart && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg pb-safe">
          <div className="max-w-lg mx-auto p-4 space-y-3">
            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {hasPrevOrders ? t('cart.addMore') : ''} {t('cart.itemCount', { count: totalItems() })}
                </p>
                <p className="text-xl font-bold">{formatPriceCNY(totalPrice())}</p>
              </div>
              <Button
                size="lg"
                onClick={handlePlaceOrder}
                disabled={submitting}
                className="min-w-[140px]"
              >
                {submitting ? t('cart.submitting') : hasPrevOrders ? t('cart.submitAddMore') : t('cart.submitOrder')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* If only previous orders, no cart — show add more button */}
      {!hasCart && hasPrevOrders && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg pb-safe">
          <div className="max-w-lg mx-auto p-4">
            <Button
              size="lg"
              className="w-full"
              onClick={() => navigate(`/menu/${storeId}`)}
            >
              {t('cart.continueOrder')}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

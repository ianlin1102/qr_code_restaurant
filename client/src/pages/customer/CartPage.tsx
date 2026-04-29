import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Info, Loader2, Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useCartStore, unitPrice, type CartEntry } from '@/stores/cart-store'
import { useSessionStore } from '@/stores/session-store'
import { formatPriceUSD } from '@/lib/format'
import { getDeviceId } from '@/lib/device-id'
import { useCartSync } from '@/hooks/useCartSync'
import { api } from '@/services/api'
import TopAppBar from '@/components/customer/TopAppBar'
import CustomerPageFrame from '@/components/customer/CustomerPageFrame'
import { optionLabel } from '@/lib/i18n-utils'
import type { CartItem } from '@qr-order/shared'

interface CartItemCardProps {
  item: CartEntry
  isOwn: boolean
  updateQuantity: (cartKey: string, quantity: number) => void
  updateRemark: (cartKey: string, remark: string) => void
  t: (key: string, opts?: Record<string, unknown>) => string
}

function CartItemCard({ item, isOwn, updateQuantity, updateRemark, t }: CartItemCardProps) {
  const price = unitPrice(item)
  return (
    <div className="bg-card rounded-xl p-3 md:p-4 space-y-3 shadow-sm">
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
                  {optionLabel(opt)}
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
            disabled={!isOwn}
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
            disabled={!isOwn}
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
        disabled={!isOwn}
      />
    </div>
  )
}

export default function CartPage() {
  const navigate = useNavigate()
  const { storeId, tableId, tableName, customerName } = useSessionStore()
  const { items, updateQuantity, updateRemark, totalPrice, totalItems, clearCart, cartVersion } = useCartStore()
  const { t, i18n } = useTranslation('customer')
  const lang = i18n.language
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentMode, setPaymentMode] = useState<'pay-first' | 'pay-later'>('pay-first')
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)

  // Shared cart sync: push local changes (1s debounce), poll other devices (5s)
  const { markSubmitted } = useCartSync(storeId, activeSessionId)

  const myDeviceId = useMemo(() => getDeviceId(), [])

  // Group items by addedByDevice for per-person display
  const groups = useMemo(() => {
    const map = new Map<string, { name: string; items: CartEntry[] }>()
    for (const item of items) {
      const deviceKey = item.addedByDevice || myDeviceId
      if (!map.has(deviceKey)) {
        const isMe = deviceKey === myDeviceId
        const name = item.addedBy || (isMe ? (customerName || (lang === 'zh' ? '我' : 'You')) : '')
        map.set(deviceKey, { name, items: [] })
      }
      map.get(deviceKey)!.items.push(item)
    }
    // Assign "Guest N" to unnamed non-self devices
    let guestNum = 1
    for (const [key, group] of map) {
      if (!group.name && key !== myDeviceId) {
        group.name = lang === 'zh' ? `客人 ${guestNum}` : `Guest ${guestNum}`
        guestNum++
      }
    }
    // Put own items first
    const entries = Array.from(map.entries())
    entries.sort(([a], [b]) => {
      if (a === myDeviceId) return -1
      if (b === myDeviceId) return 1
      return 0
    })
    return entries
  }, [items, myDeviceId, customerName, lang])

  useEffect(() => {
    if (!storeId || !tableId) return
    api.getTable(storeId, tableId).then(table => {
      if (table.paymentMode === 'pay-later') setPaymentMode('pay-later')
    }).catch(() => { /* keep default pay-first */ })
    // Fetch-or-create active session. Without a session, submit is blocked and
    // the button shows as grey on first cart visit (menu flow doesn't create
    // a session until user reaches bill/payment page).
    api.getActiveSession(storeId, tableId).then(async s => {
      if (s) return setActiveSessionId(s.id)
      await api.createSession(storeId, tableId)
      const fresh = await api.getActiveSession(storeId, tableId)
      if (fresh) setActiveSessionId(fresh.id)
    }).catch(() => {})
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
    if (!storeId || !tableId || !activeSessionId) return
    if (items.length === 0) return
    setError(null)
    setSubmitting(true)

    try {
      // Force push local cart to server before submitting (prevents race where
      // the 1s debounce hasn't fired yet → server's pendingCart is empty → 400)
      const myLocal: CartItem[] = items
        .filter(i => (i.addedByDevice || myDeviceId) === myDeviceId)
        .map(({ menuItemId, name, price, quantity, remark, selectedOptions, addedBy, addedByDevice }) => ({
          menuItemId, name, price, quantity,
          ...(remark ? { remark } : {}),
          ...(selectedOptions?.length ? { selectedOptions } : {}),
          ...(addedBy ? { addedBy } : {}),
          ...(addedByDevice ? { addedByDevice } : {}),
        }))
      await api.updateSessionCart(storeId, activeSessionId, myDeviceId, myLocal)
      const result = await api.submitSessionCart(storeId, activeSessionId, cartVersion, customerName)
      markSubmitted()

      if (result.paymentMode === 'pay-later' && result.order) {
        clearCart()
        navigate('/order/confirm', { state: { order: result.order } })
        return
      }

      if (result.paymentMode === 'pay-first' && result.items && result.tableId) {
        clearCart()
        const checkoutItems = result.items.map(i => ({
          menuItemId: i.menuItemId, quantity: i.quantity,
          ...(i.remark ? { remark: i.remark } : {}),
          ...(i.selectedOptions?.length ? { selectedOptions: i.selectedOptions } : {}),
        }))
        const { clientSecret, amount, subtotal, tax } = await api.createCheckout(storeId, {
          tableId: result.tableId, items: checkoutItems, customerName,
        })
        navigate(`/store/${storeId}/checkout`, { state: {
          clientSecret, amount, subtotal, tax, tableId: result.tableId, items: checkoutItems,
        } })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to submit order'
      if (msg.includes('Cart already submitted')) {
        clearCart()
        navigate('/order/confirm', { state: { alreadySubmitted: true } })
        return
      }
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <CustomerPageFrame>
    <div className="pb-32 pt-14">
      <TopAppBar
        mode="cart"
        storeName=""
        tableName={tableName}
        currentLang={lang === 'en' ? 'en' : 'zh'}
        onBack={() => navigate(`/menu/${storeId}`)}
      />

      <div className="p-4">
        <div className="space-y-1">
          {groups.map(([deviceKey, group]) => (
            <div key={deviceKey}>
              {/* Person divider */}
              <div className="flex items-center gap-2 py-2">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground px-2">
                  {group.name}
                  {deviceKey === myDeviceId && (
                    <span className="ml-1">
                      ({lang === 'zh' ? '我' : 'You'})
                    </span>
                  )}
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>
              {/* Items for this person */}
              <div className="space-y-3">
                {group.items.map((item) => (
                  <CartItemCard
                    key={item.cartKey}
                    item={item}
                    isOwn={deviceKey === myDeviceId}
                    updateQuantity={updateQuantity}
                    updateRemark={updateRemark}
                    t={t}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg bg-card/90 backdrop-blur-xl shadow-lg pb-safe z-40">
        <div className="p-4 space-y-3">
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
              disabled={submitting || items.length === 0 || !activeSessionId}
              className="min-w-[120px] sm:min-w-[160px] min-h-[48px] bg-primary hover:bg-primary/90"
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
    </CustomerPageFrame>
  )
}

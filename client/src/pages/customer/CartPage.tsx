import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Info, ShoppingCart } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { useCartStore, type CartEntry } from '@/stores/cart-store'
import { useSessionStore } from '@/stores/session-store'
import { getDeviceId } from '@/lib/device-id'
import { useCartSync } from '@/hooks/useCartSync'
import { api } from '@/services/api'
import TopAppBar from '@/components/customer/TopAppBar'
import CustomerPageFrame from '@/components/customer/CustomerPageFrame'
import BottomNav from '@/components/customer/BottomNav'
import CheckoutBar from '@/components/customer/CheckoutBar'
import CartItemCard from '@/components/customer/CartItemCard'
import type { CartItem } from '@qr-order/shared'

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
    <div className="pb-40 pt-14">
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

        {/* Allergy notice */}
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 flex items-start gap-2 mt-4">
          <Info className="size-4 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-primary">{t('common.allergyNotice')}</p>
        </div>
      </div>

      <CheckoutBar
        variant="submit-order"
        itemCount={totalItems()}
        totalAmount={totalPrice()}
        currentLang={lang === 'en' ? 'en' : 'zh'}
        loading={submitting}
        disabled={items.length === 0 || !activeSessionId}
        errorMessage={error}
        onAction={handleCheckout}
        actionLabel={paymentMode === 'pay-later' ? t('cart.placeOrder') : t('cart.submitOrder')}
        loadingLabel={paymentMode === 'pay-later' ? t('cart.ordering') : t('cart.submitting')}
      />
    </div>

    <BottomNav
      storeId={storeId}
      cartItemCount={totalItems()}
      currentLang={lang === 'en' ? 'en' : 'zh'}
    />
    </CustomerPageFrame>
  )
}

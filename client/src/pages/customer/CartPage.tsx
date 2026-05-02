import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Info, ShoppingCart } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { useCartStore, type CartEntry } from '@/stores/cart-store'
import { useSessionStore } from '@/stores/session-store'
import { usePaymentStore } from '@/stores/payment-store'
import { getDeviceId } from '@/lib/device-id'
import { useCartSync } from '@/hooks/useCartSync'
import { api } from '@/services/api'
import { formatPriceUSD } from '@/lib/format'
import { itemLineTotal } from '@/lib/pricing'
import { localized } from '@/lib/i18n-utils'
import TopAppBar from '@/components/customer/TopAppBar'
import CustomerPageFrame from '@/components/customer/CustomerPageFrame'
import CheckoutBar from '@/components/customer/CheckoutBar'
import CartItemCard from '@/components/customer/CartItemCard'
import SettlementSheet from '@/components/customer/SettlementSheet'
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
  const [settlementOpen, setSettlementOpen] = useState(false)

  // Payment summary subscription — mirrors MenuPage init/stop lifecycle
  const sessionSummary = usePaymentStore(s => s.summary)
  const initPayment = usePaymentStore(s => s.init)
  const stopPayment = usePaymentStore(s => s.stop)
  useEffect(() => {
    if (!storeId || !tableId) return
    initPayment(storeId, tableId)
    return () => stopPayment()
  }, [storeId, tableId, initPayment, stopPayment])

  const sessionOrders = sessionSummary?.orders?.filter(o => o.status !== 'closed') ?? []
  const sessionRemaining = sessionSummary?.remaining ?? 0
  const hasActiveSession = !!sessionSummary && sessionSummary.status !== 'closed'
  const showCurrentOrder = hasActiveSession && sessionOrders.length > 0

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

  const isEmpty = items.length === 0

  return (
    <CustomerPageFrame>
      <TopAppBar
        mode="cart"
        tableName={tableName}
        currentLang={lang === 'en' ? 'en' : 'zh'}
        onBack={() => navigate(`/menu/${storeId}`)}
      />

      <main className={`pt-14 ${isEmpty ? 'pb-4' : 'pb-24'}`}>
        {/* Current Order — collapsible (default closed) */}
        {showCurrentOrder && (() => {
          const ss = sessionSummary
          const tax = ss?.tax ?? 0
          const svcFee = ss?.serviceFee ?? 0
          const total = ss?.totalWithTax ?? sessionOrders.reduce((s, o) => s + o.totalPrice, 0)
          const paidIds = ss?.paidItemIds ?? []
          const payments = [...(ss?.payments ?? [])].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
          return (
            <details className="group border-b">
              <summary className="px-4 py-3 font-display text-base font-medium text-foreground cursor-pointer hover:bg-muted/50 flex items-center justify-between [&::-webkit-details-marker]:hidden list-none">
                <span className="flex items-center gap-2">
                  <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" />
                  <span>{lang === 'zh' ? '本次已点' : 'Current Order'}</span>
                </span>
                <span className="font-display font-bold text-foreground">{formatPriceUSD(total)}</span>
              </summary>
              <div className="px-4 pb-3 space-y-1">
                {/* Items */}
                {sessionOrders.flatMap((o, oi) => o.items.map((item, ii) => {
                  const itemKey = `${o.id}:${ii}`
                  const isPaid = paidIds.some(k => k === itemKey || k.startsWith(itemKey + ':'))
                  const isVoided = !!(item as { voided?: boolean }).voided
                  const price = isVoided ? 0 : itemLineTotal(item)
                  return (
                    <div key={`${oi}-${ii}`} className={`flex justify-between text-sm gap-2 ${isVoided ? 'text-muted-foreground/40' : 'text-muted-foreground'}`}>
                      <span className="font-display">
                        {item.quantity}x {localized(item, lang) || item.name}
                        {item.selectedOptions && item.selectedOptions.length > 0 && (
                          <span className="text-orange-600 ml-1">
                            ({item.selectedOptions.map(o => (o.choiceName || o.choiceNameEn || '')).join(', ')})
                          </span>
                        )}
                        {isPaid && <span className="ml-1.5 font-label text-label-sm text-green-600">{lang === 'zh' ? '已付' : 'Paid'}</span>}
                        {isVoided && <span className="ml-1.5 font-label text-label-sm text-red-600">{lang === 'zh' ? '已作废' : 'Voided'}</span>}
                      </span>
                      <span className="font-display">{formatPriceUSD(price)}</span>
                    </div>
                  )
                }))}
                {/* Tax + Service Fee + Total */}
                <div className="border-t mt-2 pt-2 space-y-1">
                  {tax > 0 && (
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span className="font-label text-label-sm uppercase">{lang === 'zh' ? '税' : 'Tax'}</span>
                      <span className="font-display">{formatPriceUSD(tax)}</span>
                    </div>
                  )}
                  {svcFee > 0 && (
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span className="font-label text-label-sm uppercase">{lang === 'zh' ? '服务费' : 'Service Fee'}</span>
                      <span className="font-display">{formatPriceUSD(svcFee)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="font-label text-label-sm uppercase">{lang === 'zh' ? '合计' : 'Total'}</span>
                    <span className="font-display font-bold">{formatPriceUSD(total)}</span>
                  </div>
                </div>
                {/* Payment history (sorted by time, tip excluded from displayed amount) */}
                {payments.length > 0 && (
                  <div className="border-t mt-2 pt-2 space-y-1">
                    {payments.map((p, pi) => {
                      const foodAmount = p.amount - (p.tipAmount ?? 0)
                      return (
                        <div key={pi} className="flex justify-between text-sm text-green-600">
                          <span className="font-display">
                            {p.paidBy || (lang === 'zh' ? '顾客' : 'Guest')}
                            {p.method && <span className="font-label text-label-sm text-muted-foreground ml-1">({p.method})</span>}
                          </span>
                          <span className="font-display">−{formatPriceUSD(foodAmount)}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
                {/* Remaining */}
                {sessionRemaining > 0 && payments.length > 0 && (
                  <div className="flex justify-between text-sm pt-2 border-t mt-2">
                    <span className="font-label text-label-sm uppercase">{lang === 'zh' ? '待付' : 'Remaining'}</span>
                    <span className="font-display font-bold text-primary">{formatPriceUSD(sessionRemaining)}</span>
                  </div>
                )}
                {/* C3 α: Settle button (cart-side unpaid entry) */}
                {sessionRemaining > 0 && (
                  <Button
                    onClick={() => setSettlementOpen(true)}
                    className="w-full mt-3 bg-orange-500 hover:bg-orange-600 text-white font-display rounded-xl"
                  >
                    {lang === 'zh' ? '结账' : 'Settle'}
                  </Button>
                )}
              </div>
            </details>
          )
        })()}

        {/* C2 α: chip divider between Current Order and pending cart items */}
        {showCurrentOrder && !isEmpty && (
          <div className="mt-4 mb-3 flex items-center px-4">
            <span className="font-label text-label-sm uppercase tracking-wider text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
              {lang === 'zh' ? '待下单' : 'Pending Items'}
            </span>
          </div>
        )}

        {/* Pending cart items / EmptyCart fallback */}
        {isEmpty && !showCurrentOrder ? (
          <div className="flex flex-col items-center justify-center px-4 min-h-[60vh] gap-4">
            <ShoppingCart className="h-16 w-16 text-muted-foreground" aria-hidden="true" />
            <h2 className="font-display text-lg font-semibold">{t('cart.emptyCart')}</h2>
            <p className="font-display text-base text-muted-foreground text-center">
              {t('cart.emptyPrompt')}
            </p>
            <Button
              onClick={() => navigate(`/menu/${storeId}`)}
              className="font-display rounded-xl"
            >
              {t('cart.backToMenu')}
            </Button>
          </div>
        ) : !isEmpty ? (
          <div className="p-4">
            <div>
              {groups.map(([deviceKey, group]) => {
                const isMine = deviceKey === myDeviceId
                return (
                  <div key={deviceKey} className="mt-6 first:mt-0">
                    {/* Person divider — chip badge */}
                    <div className="mb-3 flex items-center">
                      <span className="font-label text-label-sm uppercase tracking-wider text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
                        {isMine ? (lang === 'zh' ? '我的' : 'Mine') : group.name}
                      </span>
                    </div>
                    {/* Items for this person */}
                    <div className="space-y-3">
                      {group.items.map((item) => (
                        <CartItemCard
                          key={item.cartKey}
                          item={item}
                          isOwn={isMine}
                          updateQuantity={updateQuantity}
                          updateRemark={updateRemark}
                          t={t}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Allergy notice */}
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 flex items-start gap-2 mt-6">
              <Info className="size-4 text-primary shrink-0 mt-0.5" />
              <p className="font-display text-xs text-primary">{t('common.allergyNotice')}</p>
            </div>
          </div>
        ) : null}
      </main>

      {!isEmpty && (
        <CheckoutBar
          variant="submit-order"
          itemCount={totalItems()}
          totalAmount={totalPrice()}
          currentLang={lang === 'en' ? 'en' : 'zh'}
          loading={submitting}
          disabled={!activeSessionId}
          errorMessage={error}
          onAction={handleCheckout}
          actionLabel={paymentMode === 'pay-later' ? t('cart.placeOrder') : t('cart.submitOrder')}
          loadingLabel={paymentMode === 'pay-later' ? t('cart.ordering') : t('cart.submitting')}
        />
      )}

      {/* Settlement Sheet — opened by Current Order Settle button */}
      {sessionSummary && (
        <SettlementSheet
          open={settlementOpen}
          onClose={() => setSettlementOpen(false)}
          storeId={storeId}
          session={sessionSummary}
        />
      )}

    </CustomerPageFrame>
  )
}

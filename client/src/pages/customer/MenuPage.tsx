import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '@/services/api'
import { useCartStore } from '@/stores/cart-store'
import { useSessionStore } from '@/stores/session-store'
import { formatPriceUSD } from '@/lib/format'
import { itemLineTotal } from '@/lib/pricing'
import { localized } from '@/lib/i18n-utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import MenuItemDetailSheet from '@/components/menu/MenuItemDetailSheet'
import SettlementSheet from '@/components/customer/SettlementSheet'
import TopAppBar from '@/components/customer/TopAppBar'
import CustomerPageFrame from '@/components/customer/CustomerPageFrame'
import BottomNav from '@/components/customer/BottomNav'
import CheckoutBar from '@/components/customer/CheckoutBar'
import { usePaymentStore } from '@/stores/payment-store'
import { useSessionEvents } from '@/hooks/useSessionEvents'
import { useCartSync } from '@/hooks/useCartSync'
import { notify } from '@/lib/notify'
import DishCard from '@/components/menu/DishCard'
import type { MenuResponse, MenuItem } from '@qr-order/shared'

/** Strip ALL HTML — render announcement as safe plain text with line breaks */
function plainText(html: string): string {
  const div = document.createElement('div')
  div.innerHTML = html
  return div.textContent || div.innerText || ''
}

/** Simple string hash — works with any Unicode including Chinese */
function simpleHash(s: string): string {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0
  }
  return Math.abs(h).toString(36)
}

export default function MenuPage() {
  const { storeId } = useParams<{ storeId: string }>()
  const navigate = useNavigate()
  const [menu, setMenu] = useState<MenuResponse | null>(null)
  const [activeCategory, setActiveCategory] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const cartItems = useCartStore(s => s.items)
  const removeItem = useCartStore(s => s.removeItem)
  const totalItems = useCartStore(s => s.totalItems)
  const totalPrice = useCartStore(s => s.totalPrice)

  const { tableId, tableName, customerName } = useSessionStore()
  const setCustomerName = useSessionStore(s => s.setCustomerName)

  const { t, i18n } = useTranslation('customer')
  const lang = i18n.language

  const [showAnnouncement, setShowAnnouncement] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [calling, setCalling] = useState(false)
  const [requestingBill, setRequestingBill] = useState(false)
  const [detailSheetOpen, setDetailSheetOpen] = useState(false)
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null)
  const [settlementOpen, setSettlementOpen] = useState(false)
  // Session payment state — centralized Zustand store
  const sessionSummary = usePaymentStore(s => s.summary)
  const activeSessionId = usePaymentStore(s => s.sessionId)
  const initPayment = usePaymentStore(s => s.init)
  const stopPayment = usePaymentStore(s => s.stop)
  const sessionRemaining = sessionSummary?.remaining ?? 0
  const sessionOrders = sessionSummary?.orders?.filter(o => o.status !== 'closed') ?? []
  const [searchExpanded, setSearchExpanded] = useState(false)
  const menuScrollRef = useRef<HTMLDivElement | null>(null)

  // Initialize session payment store (handles polling + session creation)
  useEffect(() => {
    if (!storeId || !tableId) return
    initPayment(storeId, tableId)
    return () => stopPayment()
  }, [storeId, tableId, initPayment, stopPayment])

  useEffect(() => {
    if (!storeId) return
    setLoading(true)
    api.getMenu(storeId)
      .then(data => {
        setMenu(data)
        if (data.categories.length > 0) {
          setActiveCategory(data.categories[0].id)
        }
        // Show announcement popup if content changed since last dismissal
        const ann = lang === 'en' && data.store.announcementEn ? data.store.announcementEn : data.store.announcement
        if (ann) {
          const hash = simpleHash(ann).slice(0, 8)
          const storedHash = localStorage.getItem(`announcement-hash-${data.store.id}`)
          if (storedHash !== hash) {
            setShowAnnouncement(true)
          }
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [storeId])

  // Remove cart items that became unavailable and notify user
  const cleanupUnavailableCartItems = useCallback((data: MenuResponse) => {
    const allItems = data.categories.flatMap(c => c.items)
    const unavailIds = new Set(allItems.filter(i => !i.available).map(i => i.id))
    const stale = cartItems.filter(ci => unavailIds.has(ci.menuItemId))
    if (stale.length === 0) return
    stale.forEach(ci => removeItem(ci.cartKey))
    notify.warning(t('menu.itemsSoldOut', { names: stale.map(ci => ci.name).join(', ') }))
  }, [cartItems, removeItem, t])

  // Poll menu every 30s for real-time sold-out updates
  useEffect(() => {
    if (!storeId) return
    const id = setInterval(() => {
      api.getMenu(storeId).then(data => {
        setMenu(data); cleanupUnavailableCartItems(data)
      }).catch(() => {})
    }, 30_000)
    return () => clearInterval(id)
  }, [storeId, cleanupUnavailableCartItems])

  // Shared cart sync: push local changes (1s debounce), poll other devices (5s)
  useCartSync(storeId, activeSessionId)

  // Session closed dialog — listen for session:summary SSE events
  const [sessionClosedOpen, setSessionClosedOpen] = useState(false)
  const { subscribe: subscribeSession } = useSessionEvents(storeId, activeSessionId)
  useEffect(() => {
    return subscribeSession('session:summary', () => {
      usePaymentStore.getState().handleEvent()
    })
  }, [subscribeSession])
  // React to session status changes — show dialog when closed
  useEffect(() => {
    if (sessionSummary?.status === 'closed') {
      setSessionClosedOpen(true)
    }
  }, [sessionSummary?.status])

  // Stable scroll handler — active category tracking (RAF throttled)
  const rafRef = useRef(0)
  const activeCatRef = useRef('')
  const handleScroll = useCallback(() => {
    const viewport = menuScrollRef.current?.querySelector('[data-slot="scroll-area-viewport"]') as HTMLElement | null
    if (!viewport) return

    // Throttle category tracking to once per frame
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      const viewportTop = viewport.getBoundingClientRect().top + 120
      let closest: { id: string; dist: number } | null = null
      for (const [id, el] of Object.entries(sectionRefs.current)) {
        if (!el) continue
        const dist = Math.abs(el.getBoundingClientRect().top - viewportTop)
        if (!closest || dist < closest.dist) closest = { id, dist }
      }
      // Only update state if category actually changed
      if (closest && closest.id !== activeCatRef.current) {
        activeCatRef.current = closest.id
        setActiveCategory(closest.id)
      }
    })
  }, [])

  // Attach scroll listener once after menu loads (not on every menu change)
  useEffect(() => {
    const viewport = menuScrollRef.current?.querySelector('[data-slot="scroll-area-viewport"]') as HTMLElement | null
    if (!viewport) return
    viewport.addEventListener('scroll', handleScroll, { passive: true })
    return () => viewport.removeEventListener('scroll', handleScroll)
  }, [handleScroll, loading])

  const scrollToCategory = (categoryId: string) => {
    setActiveCategory(categoryId)
    sectionRefs.current[categoryId]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleAdd = (item: MenuItem) => { setSelectedMenuItem(item); setDetailSheetOpen(true) }

  const handleCallWaiter = async () => {
    if (!storeId || !tableId || calling) return
    setCalling(true)
    try {
      await api.callWaiter(storeId, tableId)
      notify.success(t('menu.waiterCalledToast'))
    } catch (err) {
      notify.fromError(err)
    } finally {
      setCalling(false)
    }
  }

  const handleRequestBill = async () => {
    if (!storeId || !tableId || requestingBill) return
    setRequestingBill(true)
    try {
      await api.requestBill(storeId, tableId)
      notify.success(t('menu.billRequestedToast'))
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes("Cannot request bill from status 'bill-requested'")) {
        notify.info(t('menu.alreadyRequested'))
      } else {
        notify.fromError(err)
      }
    } finally {
      setRequestingBill(false)
    }
  }

  const dismissAnnouncement = () => {
    const ann = lang === 'en' && menu?.store.announcementEn ? menu.store.announcementEn : menu?.store.announcement
    if (ann) {
      const hash = simpleHash(ann).slice(0, 8)
      localStorage.setItem(`announcement-hash-${menu!.store.id}`, hash)
    }
    setShowAnnouncement(false)
  }

  const isSearching = searchQuery.trim().length > 0
  const searchLower = searchQuery.trim().toLowerCase()

  // Filtered categories for search mode (bilingual: items + category names)
  const filteredCategories = useMemo(() => {
    if (!menu) return []
    if (!isSearching) return menu.categories
    return menu.categories.map(cat => {
      const catMatch = cat.name.toLowerCase().includes(searchLower) || cat.nameEn?.toLowerCase().includes(searchLower)
      const matchItem = (item: MenuItem) =>
        item.name.toLowerCase().includes(searchLower) || item.nameEn?.toLowerCase().includes(searchLower) ||
        item.description?.toLowerCase().includes(searchLower) || item.descriptionEn?.toLowerCase().includes(searchLower)
      return { ...cat, items: catMatch ? cat.items : cat.items.filter(matchItem) }
    }).filter(cat => cat.items.length > 0)
  }, [menu?.categories, isSearching, searchLower])

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-muted-foreground">{t('common:loading')}</p>
    </div>
  )
  if (error || !menu) return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-destructive">{error || 'Failed to load menu'}</p>
    </div>
  )

  const itemCount = totalItems()
  const priceTotal = totalPrice()

  return (
    <CustomerPageFrame>
    <div className="flex flex-col h-screen pt-16">
      <TopAppBar
        mode="menu"
        storeName={menu.store.name}
        tableName={tableName}
        customerName={customerName}
        searchExpanded={searchExpanded}
        searchValue={searchQuery}
        onSearchToggle={() => setSearchExpanded(v => !v)}
        onSearchChange={setSearchQuery}
        onCallService={handleCallWaiter}
        onRequestBill={handleRequestBill}
        onLanguageToggle={() => {
          const next = lang === 'zh' ? 'en' : 'zh'
          i18n.changeLanguage(next)
          localStorage.setItem('i18n-lang', next)
        }}
        onCustomerNameClick={() => {
          const name = prompt(t('menu.enterName') || 'Your name:', customerName ?? '')
          if (name !== null) setCustomerName(name.trim())
        }}
        currentLang={lang === 'en' ? 'en' : 'zh'}
      />

      {/* Pay Now banner — shows when session has remaining balance */}
      {sessionRemaining > 0 && activeSessionId && (
        <div className="bg-orange-50 border-b border-orange-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-800">
                {lang === 'zh' ? '待付款' : 'Payment Due'}
              </p>
              <p className="text-xs text-orange-600">
                {formatPriceUSD(sessionRemaining)}
              </p>
            </div>
            <Button
              size="sm"
              className="bg-orange-500 hover:bg-orange-600 text-white"
              onClick={() => setSettlementOpen(true)}
            >
              {lang === 'zh' ? '结账' : 'Settle'}
            </Button>
          </div>
        </div>
      )}

      {/* Current session — items + tax + total + payments + remaining */}
      {sessionOrders.length > 0 && (() => {
        const ss = sessionSummary
        const subtotal = ss?.netDue ?? sessionOrders.reduce((s, o) => s + o.totalPrice, 0)
        const tax = ss?.tax ?? 0
        const svcFee = ss?.serviceFee ?? 0
        const total = ss?.totalWithTax ?? subtotal
        const paidIds = ss?.paidItemIds ?? []
        const payments = [...(ss?.payments ?? [])].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        return (
          <details className="border-b">
            <summary className="px-4 py-2 text-sm font-medium text-muted-foreground cursor-pointer hover:bg-muted/50">
              {lang === 'zh' ? '本次已点' : 'Current Order'}
              <span className="ml-2 text-xs">{formatPriceUSD(total)}</span>
            </summary>
            <div className="px-4 pb-3 space-y-0.5 max-h-72 overflow-y-auto">
              {/* Items */}
              {sessionOrders.flatMap((o, oi) => o.items.map((item, ii) => {
                const itemKey = `${o.id}:${ii}`
                const isPaid = paidIds.some(k => k === itemKey || k.startsWith(itemKey + ':'))
                const isVoided = !!(item as { voided?: boolean }).voided
                const price = isVoided ? 0 : itemLineTotal(item)
                return (
                  <div key={`${oi}-${ii}`} className={`flex justify-between text-xs ${isVoided ? 'text-muted-foreground/40' : 'text-muted-foreground'}`}>
                    <span>
                      {item.quantity}x {localized(item, lang) || item.name}
                      {item.selectedOptions && item.selectedOptions.length > 0 && (
                        <span className="text-orange-600 ml-1">
                          ({item.selectedOptions.map(o => (o.choiceName || o.choiceNameEn || '')).join(', ')})
                        </span>
                      )}
                      {isPaid && <span className="ml-1.5 text-[10px] text-green-600 font-medium">{lang === 'zh' ? '已付' : 'Paid'}</span>}
                      {isVoided && <span className="ml-1.5 text-[10px] text-red-600 font-medium">{lang === 'zh' ? '已作废' : 'Voided'}</span>}
                    </span>
                    <span>{formatPriceUSD(price)}</span>
                  </div>
                )
              }))}
              {/* Tax + Service Fee + Total */}
              <div className="border-t mt-1.5 pt-1.5 space-y-0.5">
                {tax > 0 && (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{lang === 'zh' ? '税' : 'Tax'}</span>
                    <span>{formatPriceUSD(tax)}</span>
                  </div>
                )}
                {svcFee > 0 && (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{lang === 'zh' ? '服务费' : 'Service Fee'}</span>
                    <span>{formatPriceUSD(svcFee)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs font-semibold">
                  <span>{lang === 'zh' ? '合计' : 'Total'}</span>
                  <span>{formatPriceUSD(total)}</span>
                </div>
              </div>
              {/* Payment history (sorted by time, tip excluded from displayed amount) */}
              {payments.length > 0 && (
                <div className="border-t mt-1.5 pt-1.5 space-y-0.5">
                  {payments.map((p, pi) => {
                    const foodAmount = p.amount - (p.tipAmount ?? 0)
                    return (
                      <div key={pi} className="flex justify-between text-xs text-green-600">
                        <span>
                          {p.paidBy || (lang === 'zh' ? '顾客' : 'Guest')}
                          {p.method && <span className="text-[10px] text-muted-foreground ml-1">({p.method})</span>}
                        </span>
                        <span>−{formatPriceUSD(foodAmount)}</span>
                      </div>
                    )
                  })}
                </div>
              )}
              {/* Remaining */}
              {(ss?.remaining ?? 0) > 0 && payments.length > 0 && (
                <div className="flex justify-between text-xs font-semibold pt-1 border-t mt-1">
                  <span>{lang === 'zh' ? '待付' : 'Remaining'}</span>
                  <span className="text-primary">{formatPriceUSD(ss!.remaining)}</span>
                </div>
              )}
            </div>
          </details>
        )
      })()}

      {/* Main content: sidebar + items */}
      <div className="flex flex-1 overflow-hidden">
        {/* Category sidebar (hidden during search) */}
        {!isSearching && (
          <ScrollArea className="w-24 shrink-0 bg-muted">
            <div className="py-2">
              {menu.categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => scrollToCategory(cat.id)}
                  className={`w-full px-2 py-3 text-sm text-left transition-colors ${
                    activeCategory === cat.id
                      ? 'bg-background font-semibold text-primary border-r-2 border-primary'
                      : 'text-muted-foreground hover:bg-background/50'
                  }`}
                >
                  {localized(cat, lang)}
                </button>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Menu items */}
        <div ref={menuScrollRef} className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-3 pb-40">
            {(() => {
              // Search mode: pool all matching items globally (no category limit)
              // Non-search: filter to active category only
              const visibleItems = isSearching
                ? filteredCategories.flatMap(c => c.items)
                : (filteredCategories.find(c => c.id === activeCategory)?.items ?? [])
              const recommended = visibleItems.filter(i => i.isRecommended)
              const regular = visibleItems.filter(i => !i.isRecommended)
              const langCode = lang === 'en' ? 'en' : 'zh'
              if (visibleItems.length === 0) {
                return (
                  <p className="text-center text-muted-foreground py-8">
                    {isSearching ? t('menu.noResults') : t('menu.emptyCategory', 'No dishes available')}
                  </p>
                )
              }
              return (
                <>
                  {recommended.length > 0 && (
                    <section className="mb-8">
                      <h2 className="font-display text-headline-md text-foreground mb-4">{t('menu.featured')}</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {recommended.map(item => (
                          <DishCard
                            key={item.id}
                            item={item}
                            onAddClick={() => handleAdd(item)}
                            onCardClick={() => handleAdd(item)}
                            currentLang={langCode}
                          />
                        ))}
                      </div>
                    </section>
                  )}
                  {regular.length > 0 && (
                    <section>
                      <h2 className="font-display text-headline-md text-foreground mb-4">{t('menu.moreDishes')}</h2>
                      <div className="flex flex-col gap-4">
                        {regular.map(item => (
                          <DishCard
                            key={item.id}
                            item={item}
                            onAddClick={() => handleAdd(item)}
                            onCardClick={() => handleAdd(item)}
                            currentLang={langCode}
                          />
                        ))}
                      </div>
                    </section>
                  )}
                </>
              )
            })()}
          </div>
        </ScrollArea>
        </div>
      </div>

      {/* Floating CheckoutBar — only when cart has items */}
      {itemCount > 0 && (
        <CheckoutBar
          variant="goto-cart"
          itemCount={itemCount}
          totalAmount={priceTotal}
          currentLang={lang === 'en' ? 'en' : 'zh'}
          onAction={() => navigate('/cart')}
        />
      )}

      <BottomNav
        storeId={storeId!}
        cartItemCount={itemCount}
        currentLang={lang === 'en' ? 'en' : 'zh'}
      />

      {/* Item Detail Sheet */}
      <MenuItemDetailSheet
        item={selectedMenuItem}
        category={selectedMenuItem ? menu?.categories.find(c => c.id === selectedMenuItem.categoryId) : undefined}
        open={detailSheetOpen}
        onClose={() => { setDetailSheetOpen(false); setSelectedMenuItem(null) }}
      />

      {/* Settlement Sheet */}
      {sessionSummary && (
        <SettlementSheet
          open={settlementOpen}
          onClose={() => setSettlementOpen(false)}
          storeId={storeId!}
          session={sessionSummary}
        />
      )}

      {/* Session Closed Dialog */}
      <Dialog open={sessionClosedOpen} onOpenChange={setSessionClosedOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('session.closedTitle')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t('session.closedMessage')}</p>
          <DialogFooter>
            <Button onClick={() => setSessionClosedOpen(false)}>{t('session.closedOk')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Announcement Popup */}
      {showAnnouncement && (menu.store.announcement || menu.store.announcementEn) && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full max-h-[60vh] overflow-y-auto">
            <h3 className="font-semibold mb-3">{t('menu.announcement')}</h3>
            <p className="text-sm whitespace-pre-wrap">
              {plainText(lang === 'en' && menu.store.announcementEn ? menu.store.announcementEn : menu.store.announcement || '')}
            </p>
            <button
              onClick={dismissAnnouncement}
              className="mt-4 w-full bg-primary text-primary-foreground rounded-md py-2 text-sm font-medium"
            >
              {t('menu.gotIt')}
            </button>
          </div>
        </div>
      )}
    </div>
    </CustomerPageFrame>
  )
}

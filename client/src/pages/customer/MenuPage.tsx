import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '@/services/api'
import { useCartStore } from '@/stores/cart-store'
import { useSessionStore } from '@/stores/session-store'
import { formatPriceUSD } from '@/lib/format'
import { itemLineTotal } from '@/lib/pricing'
import { localized, localizedDesc } from '@/lib/i18n-utils'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import MenuItemDetailSheet from '@/components/menu/MenuItemDetailSheet'
import SettlementSheet from '@/components/customer/SettlementSheet'
import { usePaymentStore } from '@/stores/payment-store'
import { useSessionEvents } from '@/hooks/useSessionEvents'
import { useCartSync } from '@/hooks/useCartSync'
import { notify } from '@/lib/notify'
import { DietaryBadges, RecommendedBadge } from '@/components/menu/MenuItemBadges'
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
  const [waiterCalled, setWaiterCalled] = useState(false)
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
  const [headerCollapsed, setHeaderCollapsed] = useState(false)
  const lastScrollY = useRef(0)
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

  // Stable scroll handler — header collapse + active category tracking (RAF throttled)
  const rafRef = useRef(0)
  const activeCatRef = useRef('')
  const handleScroll = useCallback(() => {
    const viewport = menuScrollRef.current?.querySelector('[data-slot="scroll-area-viewport"]') as HTMLElement | null
    if (!viewport) return

    // Header collapse/expand (cheap, no layout queries)
    const THRESHOLD = 10
    const y = viewport.scrollTop
    if (y - lastScrollY.current > THRESHOLD) setHeaderCollapsed(true)
    else if (lastScrollY.current - y > THRESHOLD) setHeaderCollapsed(false)
    lastScrollY.current = y

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

  const getCartQuantity = (menuItemId: string): number =>
    cartItems.filter(i => i.menuItemId === menuItemId).reduce((sum, i) => sum + i.quantity, 0)

  const handleAdd = (item: MenuItem) => { setSelectedMenuItem(item); setDetailSheetOpen(true) }

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
    <div className="flex flex-col h-screen max-w-lg mx-auto">
      {/* Header — collapsible top + sticky search */}
      <div className="bg-background shadow-sm">
        {/* Collapsible: store name, buttons, description */}
        <div
          className={cn(
            'px-4 overflow-hidden transition-all duration-200 ease-in-out',
            headerCollapsed ? 'max-h-0 pt-0 pb-0 opacity-0' : 'max-h-40 pt-4 pb-1 opacity-100'
          )}
        >
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold font-display">{menu.store.name}</h1>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs font-semibold border-primary text-primary px-3"
                onClick={() => {
                  const next = lang === 'zh' ? 'en' : 'zh'
                  i18n.changeLanguage(next)
                  localStorage.setItem('i18n-lang', next)
                }}
              >
                {t('common:langSwitch')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  'text-xs px-3',
                  waiterCalled ? 'border-green-500 text-green-600' : 'border-orange-400 text-orange-600'
                )}
                onClick={() => {
                  setWaiterCalled(true)
                  setTimeout(() => setWaiterCalled(false), 3000)
                }}
              >
                {waiterCalled ? t('menu.waiterCalled') : t('menu.callWaiter')}
              </Button>
              {tableName && (
                <span className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-semibold px-2 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  {tableName}
                </span>
              )}
              {!customerName ? (
                <button
                  onClick={() => {
                    const name = prompt(t('menu.enterName') || 'Your name (optional):')
                    if (name?.trim()) setCustomerName(name.trim())
                  }}
                  className="text-xs text-muted-foreground underline"
                >
                  {t('menu.setName') || '+ Name'}
                </button>
              ) : (
                <span
                  className="inline-flex items-center gap-1 bg-muted text-xs px-2 py-1 rounded-full cursor-pointer"
                  onClick={() => {
                    const name = prompt(t('menu.enterName') || 'Your name:', customerName)
                    if (name !== null) setCustomerName(name.trim())
                  }}
                >
                  👤 {customerName}
                </span>
              )}
            </div>
          </div>
          {menu.store.description && (
            <p className="text-xs text-muted-foreground mt-1">{menu.store.description}</p>
          )}
        </div>
        {/* Search bar — always visible */}
        <div className="relative px-4 py-2">
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t('menu.searchPlaceholder')}
            className="h-10 text-base"
          />
          {headerCollapsed && (
            <button
              type="button"
              onClick={() => { setHeaderCollapsed(false); lastScrollY.current = 0 }}
              className="absolute right-6 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
              aria-label="Expand header"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </button>
          )}
        </div>
      </div>

      {/* Pay Now banner — shows when session has remaining balance */}
      {sessionRemaining > 0 && activeSessionId && (
        <div className="bg-orange-50 border-b border-orange-200 px-4 py-3">
          <div className="max-w-lg mx-auto flex items-center justify-between">
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
          <div className="p-3 pb-24">
            {isSearching && filteredCategories.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                {t('menu.noResults')}
              </p>
            )}
            {filteredCategories.map((cat, catIndex) => (
              <div
                key={cat.id}
                ref={el => { sectionRefs.current[cat.id] = el }}
              >
                <h2 className={`text-sm font-semibold text-muted-foreground mb-2 ${catIndex === 0 ? 'mt-0' : 'mt-4'}`}>
                  {localized(cat, lang)}
                </h2>
                <div className="space-y-2">
                  {!isSearching && cat.items.length === 0 && (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      {t('menu.emptyCategory', 'No dishes in this category')}
                    </p>
                  )}
                  {cat.items.map(item => {
                    const qty = getCartQuantity(item.id)
                    const hasOptions = item.options && item.options.length > 0
                    return (
                      <div
                        key={item.id}
                        className={`group relative flex items-center gap-3 p-2 rounded-lg border bg-card transition-opacity duration-300 ${
                          !item.available ? 'opacity-50 pointer-events-none' : ''
                        }`}
                      >
                        {item.isRecommended && item.available && <RecommendedBadge />}
                        {!item.available && (
                          <div className="absolute inset-0 z-10 flex items-center justify-center overflow-hidden rounded-lg">
                            <span className="bg-red-600 text-white text-xs font-bold px-8 py-0.5 -rotate-12">{t('common:soldOut').toUpperCase()}</span>
                          </div>
                        )}
                        {/* Item image placeholder */}
                        <div className="w-16 h-16 rounded-md bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={localized(item, lang)}
                              className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-300 ${!item.available ? 'grayscale' : ''}`}
                            />
                          ) : (
                            <span className="text-2xl text-muted-foreground">
                              {localized(cat, lang).charAt(0)}
                            </span>
                          )}
                        </div>
                        {/* Item info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{localized(item, lang)}</p>
                          <DietaryBadges item={item} className="mt-0.5" />
                          {item.description && (
                            <p className="text-xs text-muted-foreground truncate">
                              {localizedDesc(item, lang)}
                            </p>
                          )}
                          {hasOptions && (
                            <p className="text-xs text-orange-600">
                              {item.options!.map(o => localized(o, lang)).join(' / ')}
                            </p>
                          )}
                          <div className="flex items-center gap-1.5 mt-1">
                            {item.originalPrice && item.originalPrice > item.price && (
                              <span className="text-xs text-muted-foreground line-through">
                                {formatPriceUSD(item.originalPrice)}
                              </span>
                            )}
                            <span className="text-sm font-semibold text-primary">
                              {formatPriceUSD(item.price)}
                            </span>
                            {item.originalPrice && item.originalPrice > item.price && (
                              <Badge className="bg-red-100 text-red-600 border-0 text-[10px] px-1 py-0">
                                {Math.round((1 - item.price / item.originalPrice) * 100)}% OFF
                              </Badge>
                            )}
                            {hasOptions && <span className="text-xs font-normal text-muted-foreground">{t('menu.from')}</span>}
                          </div>
                        </div>
                        {/* Add to cart controls */}
                        {item.available && (
                          <div className="shrink-0 w-16 flex flex-col items-center gap-1">
                            {qty > 0 && (
                              <Badge variant="secondary" className="text-xs">{qty}</Badge>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-11 w-11 p-0 rounded-full"
                              onClick={() => handleAdd(item)}
                            >
                              +
                            </Button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        </div>
      </div>

      {/* Floating bottom bar — only when cart has items */}
      {itemCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-3 pb-safe glass shadow-lg">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-primary">
                  {formatPriceUSD(priceTotal)}
                </span>
                <Badge variant="secondary">{itemCount} {t('common:items')}</Badge>
              </div>
            </div>
            <Button onClick={() => navigate('/cart')} className="px-6">
              {t('menu.goOrder')}
            </Button>
          </div>
        </div>
      )}

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
  )
}

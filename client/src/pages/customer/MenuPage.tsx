import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '@/services/api'
import { useCartStore } from '@/stores/cart-store'
import { useSessionStore } from '@/stores/session-store'
import { formatPriceUSD } from '@/lib/format'
import { localized, localizedDesc } from '@/lib/i18n-utils'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import MenuItemDetailSheet from '@/components/menu/MenuItemDetailSheet'
import type { MenuResponse, MenuItem, Order } from '@qr-order/shared'

/** Strip dangerous HTML tags/attributes, keep safe formatting */
function sanitizeHtml(html: string): string {
  const div = document.createElement('div')
  div.innerHTML = html
  // Remove script, iframe, object, embed, form tags
  const dangerous = div.querySelectorAll('script,iframe,object,embed,form,style,link')
  dangerous.forEach(el => el.remove())
  // Remove event handler attributes from all elements
  div.querySelectorAll('*').forEach(el => {
    for (const attr of Array.from(el.attributes)) {
      if (attr.name.startsWith('on') || attr.name === 'srcdoc' ||
          (attr.name === 'href' && attr.value.trim().toLowerCase().startsWith('javascript:'))) {
        el.removeAttribute(attr.name)
      }
    }
  })
  return div.innerHTML
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
  const [unpaidOrders, setUnpaidOrders] = useState<Order[]>([])
  const [sessionOrders, setSessionOrders] = useState<Order[]>([])
  const [sessionRemaining, setSessionRemaining] = useState(0)
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [payingOrders, setPayingOrders] = useState(false)
  const [headerCollapsed, setHeaderCollapsed] = useState(false)
  const lastScrollY = useRef(0)
  const menuScrollRef = useRef<HTMLDivElement | null>(null)

  // Poll unpaid orders for this table
  useEffect(() => {
    if (!storeId || !tableId) return
    const fetchUnpaid = () => {
      api.getTableOrders(storeId, tableId).then(allOrders => {
        const active = allOrders.filter(o => o.status !== 'served' && o.status !== 'closed')
        setUnpaidOrders(active)
        const history = allOrders.filter(o => o.status === 'served')
        setSessionOrders(history)
      }).catch(() => {})
      // Fetch session remaining for "Pay Now" banner
      api.getActiveSession(storeId, tableId).then(s => {
        if (s) { setSessionRemaining(s.remaining); setActiveSessionId(s.id) }
        else { setSessionRemaining(0); setActiveSessionId(null) }
      }).catch(() => {})
    }
    fetchUnpaid()
    const id = setInterval(fetchUnpaid, 15_000)
    return () => clearInterval(id)
  }, [storeId, tableId])

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
        if (data.store.announcement) {
          const hash = simpleHash(data.store.announcement).slice(0, 8)
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
    alert(t('menu.itemsSoldOut', { names: stale.map(ci => ci.name).join(', ') }))
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

  // Stable scroll handler — useCallback avoids re-attaching on every menu poll
  const handleScroll = useCallback(() => {
    const viewport = menuScrollRef.current?.querySelector('[data-slot="scroll-area-viewport"]') as HTMLElement | null
    if (!viewport) return
    const THRESHOLD = 10
    const y = viewport.scrollTop
    if (y - lastScrollY.current > THRESHOLD) setHeaderCollapsed(true)
    else if (lastScrollY.current - y > THRESHOLD) setHeaderCollapsed(false)
    lastScrollY.current = y
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
    if (menu?.store.announcement) {
      const hash = simpleHash(menu.store.announcement).slice(0, 8)
      localStorage.setItem(`announcement-hash-${menu.store.id}`, hash)
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
              disabled={payingOrders}
              className="bg-orange-500 hover:bg-orange-600 text-white"
              onClick={() => {
                if (!storeId || !activeSessionId) return
                setPayingOrders(true)
                api.createCheckoutForSession(storeId, activeSessionId, sessionRemaining)
                  .then(({ clientSecret, amount }) => {
                    navigate(`/store/${storeId}/checkout`, {
                      state: { clientSecret, amount, tableId },
                    })
                  })
                  .catch(err => alert(err instanceof Error ? err.message : 'Failed'))
                  .finally(() => setPayingOrders(false))
              }}
            >
              {payingOrders
                ? (lang === 'zh' ? '处理中...' : 'Loading...')
                : (lang === 'zh' ? '去付款' : 'Pay Now')}
            </Button>
          </div>
        </div>
      )}

      {/* Session order history (collapsible) */}
      {sessionOrders.length > 0 && (
        <details className="border-b">
          <summary className="px-4 py-2 text-sm font-medium text-muted-foreground cursor-pointer hover:bg-muted/50">
            {lang === 'zh' ? '本次已点' : 'Session Orders'} ({sessionOrders.length})
            <span className="ml-2 text-xs">
              {formatPriceUSD(sessionOrders.reduce((s, o) => s + o.totalPrice, 0))}
            </span>
          </summary>
          <div className="px-4 pb-3 space-y-2 max-h-48 overflow-y-auto">
            {sessionOrders.map(order => (
              <div key={order.id} className="text-xs space-y-0.5">
                <div className="flex justify-between font-medium">
                  <span>#{order.orderNumber}</span>
                  <span>{formatPriceUSD(order.totalPrice)}</span>
                </div>
                {order.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-muted-foreground">
                    <span>
                      {item.quantity}x {item.name}
                      {item.selectedOptions && item.selectedOptions.length > 0 && (
                        <span className="text-xs text-orange-600 ml-1">
                          ({item.selectedOptions.map(o => (o.choiceName || o.choiceNameEn || "")).join(', ')})
                        </span>
                      )}
                    </span>
                    <span>{formatPriceUSD(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </details>
      )}

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
        open={detailSheetOpen}
        onClose={() => { setDetailSheetOpen(false); setSelectedMenuItem(null) }}
      />

      {/* Announcement Popup */}
      {showAnnouncement && menu.store.announcement && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full max-h-[60vh] overflow-y-auto">
            <h3 className="font-semibold mb-3">{t('menu.announcement')}</h3>
            <div
              className="prose prose-sm text-sm"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(menu.store.announcement) }}
            />
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

import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '@/services/api'
import { useCartStore } from '@/stores/cart-store'
import { formatPriceUSD } from '@/lib/format'
import { localized, localizedDesc } from '@/lib/i18n-utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import type { MenuResponse, MenuItem, SelectedOption } from '@qr-order/shared'

export default function MenuPage() {
  const { storeId } = useParams<{ storeId: string }>()
  const navigate = useNavigate()
  const [menu, setMenu] = useState<MenuResponse | null>(null)
  const [activeCategory, setActiveCategory] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const cartItems = useCartStore(s => s.items)
  const addItem = useCartStore(s => s.addItem)
  const totalItems = useCartStore(s => s.totalItems)
  const totalPrice = useCartStore(s => s.totalPrice)

  const { t, i18n } = useTranslation('customer')
  const lang = i18n.language

  // Announcement modal
  const [announcementOpen, setAnnouncementOpen] = useState(false)

  // Search state
  const [searchQuery, setSearchQuery] = useState('')

  // Option selection sheet state
  const [optionSheetOpen, setOptionSheetOpen] = useState(false)
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null)
  const [selectedOptions, setSelectedOptions] = useState<Record<string, SelectedOption>>({})

  useEffect(() => {
    if (!storeId) return
    setLoading(true)
    api.getMenu(storeId)
      .then(data => {
        setMenu(data)
        if (data.categories.length > 0) {
          setActiveCategory(data.categories[0].id)
        }
        // Show announcement modal once per store per session
        if (data.store.announcement) {
          const key = `announcement-seen-${storeId}`
          if (!sessionStorage.getItem(key)) {
            setAnnouncementOpen(true)
            sessionStorage.setItem(key, '1')
          }
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [storeId])

  const scrollToCategory = (categoryId: string) => {
    setActiveCategory(categoryId)
    sectionRefs.current[categoryId]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Get total quantity of a menu item across all option combos
  const getCartQuantity = (menuItemId: string): number => {
    return cartItems
      .filter(i => i.menuItemId === menuItemId)
      .reduce((sum, i) => sum + i.quantity, 0)
  }

  const handleAdd = (item: MenuItem) => {
    if (item.options && item.options.length > 0) {
      // Open option selection sheet
      setSelectedMenuItem(item)
      setSelectedOptions({})
      setOptionSheetOpen(true)
    } else {
      // No options — add directly
      addItem({
        menuItemId: item.id,
        name: item.name,
        price: item.price,
      })
    }
  }

  // Option sheet: select a choice for an option
  const handleSelectChoice = (optionId: string, optionName: string, choiceId: string, choiceName: string, priceAdjust: number) => {
    setSelectedOptions(prev => ({
      ...prev,
      [optionId]: { optionId, optionName, choiceId, choiceName, priceAdjust },
    }))
  }

  // Check if all required options are selected
  const allRequiredSelected = (): boolean => {
    if (!selectedMenuItem?.options) return true
    return selectedMenuItem.options
      .filter(o => o.required)
      .every(o => selectedOptions[o.id])
  }

  // Confirm option selection and add to cart
  const handleConfirmOptions = () => {
    if (!selectedMenuItem) return
    const opts = Object.values(selectedOptions)
    addItem({
      menuItemId: selectedMenuItem.id,
      name: selectedMenuItem.name,
      price: selectedMenuItem.price,
      selectedOptions: opts.length > 0 ? opts : undefined,
    })
    setOptionSheetOpen(false)
    setSelectedMenuItem(null)
    setSelectedOptions({})
  }

  // Calculate preview price in option sheet
  const optionSheetPrice = (): number => {
    if (!selectedMenuItem) return 0
    const adjust = Object.values(selectedOptions).reduce((sum, o) => sum + o.priceAdjust, 0)
    return selectedMenuItem.price + adjust
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">{t('common:loading')}</p>
      </div>
    )
  }

  if (error || !menu) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-destructive">{error || 'Failed to load menu'}</p>
      </div>
    )
  }

  const isSearching = searchQuery.trim().length > 0
  const searchLower = searchQuery.trim().toLowerCase()

  // Filtered categories for search mode
  const filteredCategories = isSearching
    ? menu.categories
        .map(cat => ({
          ...cat,
          items: cat.items.filter(
            item =>
              item.name.toLowerCase().includes(searchLower) ||
              (item.nameEn?.toLowerCase().includes(searchLower)) ||
              (item.description?.toLowerCase().includes(searchLower)) ||
              (item.descriptionEn?.toLowerCase().includes(searchLower))
          ),
        }))
        .filter(cat => cat.items.length > 0)
    : menu.categories

  const itemCount = totalItems()
  const priceTotal = totalPrice()

  return (
    <div className="flex flex-col h-screen max-w-lg mx-auto">
      {/* Header */}
      <div className="p-4 border-b bg-background space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">{menu.store.name}</h1>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => {
              const next = lang === 'zh' ? 'en' : 'zh'
              i18n.changeLanguage(next)
              localStorage.setItem('i18n-lang', next)
            }}
          >
            {t('common:langSwitch')}
          </Button>
        </div>
        {menu.store.description && (
          <p className="text-xs text-muted-foreground">{menu.store.description}</p>
        )}
        <Input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder={t('menu.searchPlaceholder')}
          className="h-10 text-base"
        />
      </div>

      {/* Main content: sidebar + items */}
      <div className="flex flex-1 overflow-hidden">
        {/* Category sidebar (hidden during search) */}
        {!isSearching && (
          <ScrollArea className="w-24 shrink-0 border-r bg-muted/30">
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
        <ScrollArea className="flex-1">
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
                  {cat.items.map(item => {
                    const qty = getCartQuantity(item.id)
                    const hasOptions = item.options && item.options.length > 0
                    return (
                      <div
                        key={item.id}
                        className={`flex items-center gap-3 p-2 rounded-lg border bg-card ${
                          !item.available ? 'opacity-50' : ''
                        }`}
                      >
                        {/* Item image placeholder */}
                        <div className="w-16 h-16 rounded-md bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={localized(item, lang)}
                              className="w-full h-full object-cover"
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
                          <p className="text-sm font-semibold text-primary mt-1">
                            {formatPriceUSD(item.price)}
                            {hasOptions && <span className="text-xs font-normal text-muted-foreground"> {t('menu.from')}</span>}
                          </p>
                        </div>
                        {/* Add to cart controls */}
                        <div className="shrink-0">
                          {!item.available ? (
                            <span className="text-xs text-muted-foreground">{t('common:soldOut')}</span>
                          ) : hasOptions ? (
                            // Items with options always show select spec button
                            <div className="flex flex-col items-center gap-1">
                              {qty > 0 && (
                                <Badge variant="secondary" className="text-xs">{qty}</Badge>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                className="min-h-[44px] px-3 text-xs"
                                onClick={() => handleAdd(item)}
                              >
                                {t('menu.selectSpec')}
                              </Button>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-1">
                              {qty > 0 && (
                                <Badge variant="secondary" className="text-xs">{qty}</Badge>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-10 w-10 p-0 rounded-full"
                                onClick={() => handleAdd(item)}
                              >
                                +
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Floating bottom bar — only when cart has items */}
      {itemCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-3 pb-safe bg-background border-t shadow-lg">
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

      {/* Option Selection Sheet */}
      <Sheet open={optionSheetOpen} onOpenChange={setOptionSheetOpen}>
        <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto pb-safe">
          {selectedMenuItem && (
            <div className="space-y-4 px-4 pb-4">
              <SheetHeader>
                <SheetTitle className="text-left">{localized(selectedMenuItem, lang)}</SheetTitle>
                {selectedMenuItem.description && (
                  <p className="text-sm text-muted-foreground text-left">{localizedDesc(selectedMenuItem, lang)}</p>
                )}
              </SheetHeader>

              {/* Option groups */}
              {selectedMenuItem.options?.map(option => (
                <div key={option.id}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-semibold">{localized(option, lang)}</span>
                    {option.required && (
                      <Badge variant="destructive" className="text-xs px-1 py-0">{t('menu.required')}</Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {option.choices.map(choice => {
                      const isSelected = selectedOptions[option.id]?.choiceId === choice.id
                      return (
                        <button
                          key={choice.id}
                          onClick={() => handleSelectChoice(option.id, option.name, choice.id, choice.name, choice.priceAdjust)}
                          className={`px-4 py-3 min-h-[44px] rounded-lg border text-sm transition-colors ${
                            isSelected
                              ? 'border-primary bg-primary/10 text-primary font-medium'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {localized(choice, lang)}
                          {choice.priceAdjust > 0 && (
                            <span className="text-xs text-muted-foreground ml-1">
                              +{formatPriceUSD(choice.priceAdjust)}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                  <Separator className="mt-3" />
                </div>
              ))}

              {/* Confirm button */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-lg font-bold text-primary">
                  {formatPriceUSD(optionSheetPrice())}
                </span>
                <Button
                  onClick={handleConfirmOptions}
                  disabled={!allRequiredSelected()}
                  className="px-8 min-h-[44px]"
                >
                  {t('menu.addToCart')}
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Announcement Modal */}
      <Dialog open={announcementOpen} onOpenChange={setAnnouncementOpen}>
        <DialogContent className="max-w-sm w-[calc(100vw-2rem)]">
          <DialogHeader>
            <DialogTitle>{menu.store.name}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {menu.store.announcement}
          </p>
        </DialogContent>
      </Dialog>
    </div>
  )
}

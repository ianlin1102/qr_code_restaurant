import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '@/services/api'
import { useCartStore } from '@/stores/cart-store'
import { useSessionStore } from '@/stores/session-store'
import { formatPriceCNY } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { MenuResponse, MenuItem } from '@qr-order/shared'

export default function MenuPage() {
  const { storeId } = useParams<{ storeId: string }>()
  const navigate = useNavigate()
  const tableId = useSessionStore(s => s.tableId)
  const [menu, setMenu] = useState<MenuResponse | null>(null)
  const [activeCategory, setActiveCategory] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const cartItems = useCartStore(s => s.items)
  const addItem = useCartStore(s => s.addItem)
  const updateQuantity = useCartStore(s => s.updateQuantity)
  const totalItems = useCartStore(s => s.totalItems)
  const totalPrice = useCartStore(s => s.totalPrice)

  useEffect(() => {
    if (!storeId) return
    setLoading(true)
    api.getMenu(storeId)
      .then(data => {
        setMenu(data)
        if (data.categories.length > 0) {
          setActiveCategory(data.categories[0].id)
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [storeId])

  const scrollToCategory = (categoryId: string) => {
    setActiveCategory(categoryId)
    sectionRefs.current[categoryId]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const getCartQuantity = (menuItemId: string): number => {
    const item = cartItems.find(i => i.menuItemId === menuItemId)
    return item?.quantity ?? 0
  }

  const handleAdd = (item: MenuItem) => {
    addItem({
      menuItemId: item.id,
      name: item.name,
      price: item.price,
    })
  }

  const handleQuantityChange = (menuItemId: string, delta: number) => {
    const current = getCartQuantity(menuItemId)
    updateQuantity(menuItemId, current + delta)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Loading menu...</p>
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

  const itemCount = totalItems()
  const priceTotal = totalPrice()

  return (
    <div className="flex flex-col h-screen max-w-lg mx-auto">
      {/* Header */}
      <div className="p-4 border-b bg-background">
        <h1 className="text-lg font-bold">{menu.store.name}</h1>
        {menu.store.description && (
          <p className="text-xs text-muted-foreground mt-0.5">{menu.store.description}</p>
        )}
        {tableId && (
          <p className="text-sm text-muted-foreground mt-1">Table session active</p>
        )}
      </div>

      {/* Main content: sidebar + items */}
      <div className="flex flex-1 overflow-hidden">
        {/* Category sidebar */}
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
                {cat.name}
              </button>
            ))}
          </div>
        </ScrollArea>

        {/* Menu items */}
        <ScrollArea className="flex-1">
          <div className="p-3 pb-24">
            {menu.categories.map((cat, catIndex) => (
              <div
                key={cat.id}
                ref={el => { sectionRefs.current[cat.id] = el }}
              >
                <h2 className={`text-sm font-semibold text-muted-foreground mb-2 ${catIndex === 0 ? 'mt-0' : 'mt-4'}`}>
                  {cat.name}
                </h2>
                <div className="space-y-2">
                  {cat.items.map(item => {
                    const qty = getCartQuantity(item.id)
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
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-2xl text-muted-foreground">
                              {cat.name.charAt(0)}
                            </span>
                          )}
                        </div>
                        {/* Item info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{item.name}</p>
                          {item.description && (
                            <p className="text-xs text-muted-foreground truncate">
                              {item.description}
                            </p>
                          )}
                          <p className="text-sm font-semibold text-primary mt-1">
                            {formatPriceCNY(item.price)}
                          </p>
                        </div>
                        {/* Add to cart controls */}
                        <div className="shrink-0">
                          {!item.available ? (
                            <span className="text-xs text-muted-foreground">Sold out</span>
                          ) : qty === 0 ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0 rounded-full"
                              onClick={() => handleAdd(item)}
                            >
                              +
                            </Button>
                          ) : (
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 w-7 p-0 rounded-full text-xs"
                                onClick={() => handleQuantityChange(item.id, -1)}
                              >
                                -
                              </Button>
                              <span className="w-6 text-center text-sm font-medium">
                                {qty}
                              </span>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 w-7 p-0 rounded-full text-xs"
                                onClick={() => handleQuantityChange(item.id, 1)}
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

      {/* Floating cart bar */}
      {itemCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-3 bg-background border-t shadow-lg">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-primary">
                  {formatPriceCNY(priceTotal)}
                </span>
                <Badge variant="secondary">{itemCount} items</Badge>
              </div>
            </div>
            <Button onClick={() => navigate('/cart')} className="px-6">
              View Cart
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

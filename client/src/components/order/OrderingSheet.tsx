import { useState, useEffect } from 'react'
import { useT } from '@/i18n/useT'
import { api } from '@/services/api'
import { formatPriceUSD } from '@/lib/format'
import { ArrowLeft, Plus, Minus, Send, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import ItemCustomizeView from '@/components/menu/ItemCustomizeView'
import type { MenuItem, Category, SelectedOption } from '@qr-order/shared'

interface OrderItem {
  menuItemId: string; name: string; price: number
  quantity: number; cartKey: string; selectedOptions?: SelectedOption[]
}

interface Props {
  open: boolean; onClose: () => void; storeId: string
  tableId: string; tableName: string; onOrderCreated: () => void
}

const buildCartKey = (itemId: string, opts: SelectedOption[]) =>
  itemId + ':' + opts.map(o => o.choiceId).sort().join(',')

export default function OrderingSheet({ open, onClose, storeId, tableId, tableName, onOrderCreated }: Props) {
  const { t } = useT()
  const [categories, setCategories] = useState<(Category & { items: MenuItem[] })[]>([])
  const [selectedCat, setSelectedCat] = useState<string | null>(null)
  const [cart, setCart] = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null)

  useEffect(() => {
    if (!open || !storeId) return
    setLoading(true)
    // Admin view: fetch ALL items (including staffOnly) + categories
    Promise.all([api.getMenuItems(storeId), api.getCategories(storeId)]).then(([items, cats]) => {
      const grouped = cats
        .filter(c => c.active !== false)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(cat => ({ ...cat, items: items.filter(i => i.categoryId === cat.id && i.available) }))
      setCategories(grouped)
      setSelectedCat(null); setCart([]); setCustomizingItem(null)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [open, storeId])

  const selectedCategory = categories.find(c => c.id === selectedCat)
  const cartTotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0)

  const handleItemClick = (item: MenuItem) => {
    if (item.options && item.options.length > 0) { setCustomizingItem(item); return }
    const key = buildCartKey(item.id, [])
    setCart(prev => {
      const ex = prev.find(i => i.cartKey === key)
      if (ex) return prev.map(i => i.cartKey === key ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { menuItemId: item.id, name: item.name, price: item.price, quantity: 1, cartKey: key }]
    })
  }

  const addWithOptions = (item: MenuItem, qty: number, opts: SelectedOption[]) => {
    const adjust = opts.reduce((s, o) => s + (o.priceAdjust ?? 0), 0)
    const key = buildCartKey(item.id, opts)
    setCart(prev => {
      const ex = prev.find(i => i.cartKey === key)
      if (ex) return prev.map(i => i.cartKey === key ? { ...i, quantity: i.quantity + qty } : i)
      return [...prev, {
        menuItemId: item.id, name: item.name, price: item.price + adjust,
        quantity: qty, cartKey: key, selectedOptions: opts,
      }]
    })
    setCustomizingItem(null)
  }

  const updateQty = (cartKey: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.cartKey !== cartKey) return i
      return i.quantity + delta <= 0 ? null! : { ...i, quantity: i.quantity + delta }
    }).filter(Boolean))
  }

  const handleSend = async () => {
    if (!cart.length) return
    setSending(true)
    try {
      await api.createOrder(storeId, {
        tableId,
        items: cart.map(i => ({
          menuItemId: i.menuItemId, quantity: i.quantity,
          ...(i.selectedOptions?.length ? { selectedOptions: i.selectedOptions } : {}),
        })),
      })
      setCart([]); onOrderCreated(); onClose()
    } catch (err) { alert(err instanceof Error ? err.message : 'Failed') }
    finally { setSending(false) }
  }

  if (customizingItem) return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose() }}>
      <SheetContent side="right" className="w-full max-w-md p-0 flex flex-col">
        <SheetHeader className="sr-only"><SheetTitle>{customizingItem.name}</SheetTitle></SheetHeader>
        <ItemCustomizeView item={customizingItem} t={t}
          onBack={() => setCustomizingItem(null)} onConfirm={addWithOptions} />
      </SheetContent>
    </Sheet>
  )

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose() }}>
      <SheetContent side="right" className="w-full max-w-md p-0 flex flex-col">
        <SheetHeader className="px-4 pr-12 pt-4 pb-3 border-b">
          <div className="flex items-center gap-2">
            {selectedCat && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedCat(null)}>
                <ArrowLeft className="size-4" />
              </Button>
            )}
            <SheetTitle className="text-base">
              {selectedCat ? selectedCategory?.name : t.tables.addItems}
              <span className="text-muted-foreground font-normal text-sm ml-2">· {tableName}</span>
            </SheetTitle>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : !selectedCat ? (
            <div className="grid grid-cols-2 gap-3">
              {categories.map(cat => (
                <button key={cat.id} onClick={() => setSelectedCat(cat.id)}
                  className="bg-card rounded-2xl p-4 shadow-card text-left hover:shadow-md transition-shadow">
                  <p className="font-semibold text-sm">{cat.name}</p>
                  {cat.nameEn && <p className="text-xs text-muted-foreground">{cat.nameEn}</p>}
                  <Badge variant="secondary" className="mt-2 text-xs">{cat.items.length} {t.menu.itemCount}</Badge>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {selectedCategory?.items.filter(i => i.available).map(item => {
                const inCart = cart.filter(c => c.menuItemId === item.id)
                const totalQty = inCart.reduce((s, c) => s + c.quantity, 0)
                const hasOpts = item.options && item.options.length > 0
                return (
                  <div key={item.id} className="bg-card rounded-xl p-3 shadow-card flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.name}</p>
                      {item.nameEn && <p className="text-xs text-muted-foreground truncate">{item.nameEn}</p>}
                      <p className="text-sm font-semibold text-primary mt-1">{formatPriceUSD(item.price)}</p>
                    </div>
                    {totalQty > 0 && !hasOpts ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <Button variant="outline" size="icon" className="h-8 w-8"
                          onClick={() => updateQty(inCart[0].cartKey, -1)}><Minus className="size-3" /></Button>
                        <span className="w-6 text-center text-sm font-semibold">{totalQty}</span>
                        <Button variant="outline" size="icon" className="h-8 w-8"
                          onClick={() => updateQty(inCart[0].cartKey, 1)}><Plus className="size-3" /></Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 shrink-0">
                        {totalQty > 0 && <Badge variant="secondary" className="text-xs">{totalQty}</Badge>}
                        <Button size="icon" className="h-8 w-8 bg-primary hover:bg-primary/90"
                          onClick={() => handleItemClick(item)}><Plus className="size-4" /></Button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {cartCount > 0 && (
          <div className="border-t p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{cartCount} {t.menu.items}</span>
              <span className="font-bold text-primary">{formatPriceUSD(cartTotal)}</span>
            </div>
            <Button className="w-full bg-primary hover:bg-primary/90" disabled={sending} onClick={handleSend}>
              {sending ? <Loader2 className="size-4 animate-spin mr-2" /> : <Send className="size-4 mr-2" />}
              {sending ? t.common.loading : t.menu.sendToKitchen}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

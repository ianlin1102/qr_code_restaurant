import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useT } from '@/i18n/useT'
import { Plus, Loader2, Minus, ArrowRight, ShoppingBag, ChevronLeft, ChevronRight } from 'lucide-react'
import { api } from '@/services/api'
import { useAuthStore } from '@/stores/auth-store'
import { useCartStore, unitPrice } from '@/stores/cart-store'
import { formatPriceUSD } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import MenuItemForm, { blankItem } from '@/components/MenuItemForm'
import MenuItemTable from '@/components/MenuItemTable'
import type { MenuItem, Category } from '@qr-order/shared'

const CAT_ICONS: Record<string, string> = {
  appetizer: '🥗', starter: '🥗', salad: '🥗', main: '🍽️', entree: '🍽️',
  course: '🍽️', dessert: '🍰', sweet: '🍰', beverage: '🥤', drink: '🥤',
  coffee: '☕', tea: '🍵', special: '⭐', chef: '⭐', soup: '🍜', hotpot: '🍲',
}
function catIcon(name: string): string {
  const l = name.toLowerCase()
  for (const [k, v] of Object.entries(CAT_ICONS)) { if (l.includes(k)) return v }
  return '📋'
}

export default function MenuManagePage() {
  const { t } = useT()
  const storeId = useAuthStore(s => s.user?.storeId) ?? ''
  const [searchParams] = useSearchParams()
  const orderTableId = searchParams.get('tableId')
  const orderTableName = searchParams.get('tableName')
  const [items, setItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCatId, setActiveCatId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Partial<MenuItem> | null>(null)
  const [isNew, setIsNew] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [i, c] = await Promise.all([api.getMenuItems(storeId), api.getCategories(storeId)])
      setItems(i); setCategories(c)
    } catch { /* retry */ } finally { setLoading(false) }
  }, [storeId])

  useEffect(() => { fetchData() }, [fetchData])

  // Filter items by selected category (or show all)
  const filteredItems = activeCatId
    ? items.filter(i => i.categoryId === activeCatId)
    : items
  const activeCat = categories.find(c => c.id === activeCatId)

  const handleAdd = () => { setEditingItem(blankItem(categories[0]?.id ?? '')); setIsNew(true); setFormOpen(true) }
  const handleEdit = (item: MenuItem) => {
    setEditingItem({ ...item, options: item.options ? JSON.parse(JSON.stringify(item.options)) : [] })
    setIsNew(false); setFormOpen(true)
  }
  const addItem = useCartStore(s => s.addItem)
  const handleAddToOrder = orderTableId ? (item: MenuItem) => {
    addItem({ menuItemId: item.id, name: item.name, price: item.price })
  } : undefined
  const handleDelete = async (id: string) => { if (!confirm('Delete?')) return; await api.deleteMenuItem(storeId, id); fetchData() }
  const handleToggle = async (item: MenuItem) => { await api.updateMenuItem(storeId, item.id, { available: !item.available }); fetchData() }
  const handleInline = async (id: string, field: string, value: unknown) => { await api.updateMenuItem(storeId, id, { [field]: value }); fetchData() }
  const closeForm = () => { setFormOpen(false); setEditingItem(null) }
  const onSaved = () => { closeForm(); fetchData() }

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>

  return (
    <div className="flex h-full overflow-hidden bg-background">
      {/* ── Main content (no left sidebar — AdminLayout already provides it) ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Category slider + header */}
        <div className="border-b bg-card">
          <div className="px-6 pt-4 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">{activeCat?.name ?? t.menu.title}</h2>
              <p className="text-sm text-gray-500">
                {activeCatId
                  ? `${filteredItems.length} / ${items.length} ${t.menu.itemCount}`
                  : `${items.length} ${t.menu.itemCount} · ${categories.length} ${t.categories.title}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button className="bg-primary hover:bg-primary/90" onClick={handleAdd}>
                <Plus className="size-4 mr-1" />{t.menu.newItem}
              </Button>
            </div>
          </div>
          {/* Horizontal category slider */}
          <CategorySlider categories={categories} items={items}
            activeCatId={activeCatId} onSelect={setActiveCatId} />
        </div>

        {/* Items grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <MenuItemTable items={filteredItems} categories={categories} viewMode="table"
            onEdit={handleEdit} onDelete={handleDelete}
            onToggleAvailable={handleToggle} onInlineEdit={handleInline}
            onAddToOrder={handleAddToOrder} />

          {/* Insight stats */}
          <div className="grid grid-cols-3 gap-3 mt-6">
            <div className="bg-card rounded-lg border p-3">
              <p className="text-[10px] font-semibold text-muted-foreground tracking-wider">{t.menu.activeDiscounts}</p>
              <p className="text-2xl font-bold mt-1">{items.filter(i => i.originalPrice && i.originalPrice > i.price).length}</p>
            </div>
            <div className="bg-card rounded-lg border p-3">
              <p className="text-[10px] font-semibold text-muted-foreground tracking-wider">{t.menu.outOfStock}</p>
              <p className="text-2xl font-bold mt-1">{items.filter(i => !i.available).length}</p>
            </div>
            <div className="bg-card rounded-lg border p-3">
              <p className="text-[10px] font-semibold text-muted-foreground tracking-wider">{t.menu.topCategory}</p>
              <p className="text-lg font-bold mt-1 truncate">
                {(() => { const counts = categories.map(c => ({ name: c.name, count: items.filter(i => i.categoryId === c.id).length })); return counts.sort((a, b) => b.count - a.count)[0]?.name ?? '-' })()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right: Order sidebar (only in ordering mode) ── */}
      {orderTableId && <OrderSidebar storeId={storeId} tableId={orderTableId} tableName={orderTableName} />}

      {/* Dialogs */}
      <MenuItemForm item={editingItem} categories={categories} storeId={storeId}
        open={formOpen} isNew={isNew} onClose={closeForm} onSaved={onSaved} />
    </div>
  )
}

/* ── Horizontal Category Slider ── */
function CategorySlider({ categories, items, activeCatId, onSelect }: {
  categories: Category[]; items: MenuItem[]; activeCatId: string | null
  onSelect: (id: string | null) => void
}) {
  const { t } = useT()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollL, setCanScrollL] = useState(false)
  const [canScrollR, setCanScrollR] = useState(false)
  const checkScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollL(el.scrollLeft > 0)
    setCanScrollR(el.scrollLeft < el.scrollWidth - el.clientWidth - 1)
  }, [])
  useEffect(() => { checkScroll() }, [categories, checkScroll])
  const scroll = (dir: number) => {
    scrollRef.current?.scrollBy({ left: dir * 200, behavior: 'smooth' })
    setTimeout(checkScroll, 300)
  }
  const countFor = (id: string) => items.filter(i => i.categoryId === id).length
  return (
    <div className="relative px-6 pb-3">
      {canScrollL && (
        <button onClick={() => scroll(-1)}
          className="absolute left-1 top-1/2 -translate-y-1/2 z-10 bg-card/90 shadow rounded-full p-1">
          <ChevronLeft className="size-4" />
        </button>
      )}
      <div ref={scrollRef} onScroll={checkScroll}
        className="flex gap-2 overflow-x-auto scrollbar-hide scroll-smooth">
        <SliderChip active={activeCatId === null} icon="📋" label={t.menu.allItems}
          count={items.length} onClick={() => onSelect(null)} />
        {categories.map(c => (
          <SliderChip key={c.id} active={activeCatId === c.id}
            icon={catIcon(c.name)} label={c.name}
            count={countFor(c.id)} onClick={() => onSelect(c.id)} />
        ))}
      </div>
      {canScrollR && (
        <button onClick={() => scroll(1)}
          className="absolute right-1 top-1/2 -translate-y-1/2 z-10 bg-card/90 shadow rounded-full p-1">
          <ChevronRight className="size-4" />
        </button>
      )}
    </div>
  )
}

function SliderChip({ active, icon, label, count, onClick }: {
  active: boolean; icon: string; label: string; count: number; onClick: () => void
}) {
  return (
    <button onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm whitespace-nowrap shrink-0 border transition-colors',
        active ? 'bg-primary border-transparent text-white font-semibold' : 'border-gray-200 text-gray-600 hover:bg-background'
      )}
>
      <span className="text-base">{icon}</span>
      <span>{label}</span>
      <Badge variant={active ? 'secondary' : 'outline'} className={cn('text-[10px] px-1.5',
        active && 'bg-card/20 text-white border-0')}>
        {count}
      </Badge>
    </button>
  )
}

/* ── Order Sidebar ── */
function OrderSidebar({ storeId, tableId, tableName }: { storeId: string; tableId?: string | null; tableName?: string | null }) {
  const { t } = useT()
  const cartItems = useCartStore(s => s.items)
  const removeItem = useCartStore(s => s.removeItem)
  const updateQuantity = useCartStore(s => s.updateQuantity)
  const clearCart = useCartStore(s => s.clearCart)
  const totalP = useCartStore(s => s.totalPrice)
  const totalI = useCartStore(s => s.totalItems)
  const [sending, setSending] = useState(false)

  const sub = totalP(), tax = Math.round(sub * 0.08), total = sub + tax

  const handleSend = async () => {
    if (!cartItems.length) return
    setSending(true)
    try {
      await api.createOrder(storeId, {
        tableId: tableId || 'admin-counter',
        items: cartItems.map(ci => ({
          menuItemId: ci.menuItemId, quantity: ci.quantity,
          remark: ci.remark, selectedOptions: ci.selectedOptions,
        })),
      })
      clearCart()
    } catch { /* error */ } finally { setSending(false) }
  }

  return (
    <aside className="w-72 shrink-0 border-l bg-card flex-col hidden lg:flex">
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <div>
          <span className="font-semibold text-sm">
            {tableId ? `${t.menu.orderFor}${decodeURIComponent(tableName || tableId)}` : t.menu.counterOrder}
          </span>
        </div>
        <span className="bg-gray-100 text-gray-600 text-xs rounded-full px-2 py-0.5">{totalI()} {t.menu.items}</span>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-2">
        {cartItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-2">
            <ShoppingBag className="size-8 opacity-40" />
            <p className="text-sm">{t.common.noData}</p><p className="text-xs">{t.menu.browseMenu}</p>
          </div>
        ) : cartItems.map(ci => (
          <div key={ci.cartKey} className="py-3 border-b last:border-0 flex items-start gap-3">
            <div className="w-12 h-12 rounded bg-gray-100 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{ci.name}</p>
              <div className="flex items-center gap-1 mt-1">
                <button onClick={() => updateQuantity(ci.cartKey, ci.quantity - 1)}
                  className="w-6 h-6 rounded border border-gray-200 flex items-center justify-center text-xs hover:bg-background">
                  <Minus className="size-3" />
                </button>
                <span className="w-6 text-center text-xs font-medium">{ci.quantity}</span>
                <button onClick={() => updateQuantity(ci.cartKey, ci.quantity + 1)}
                  className="w-6 h-6 rounded border border-gray-200 flex items-center justify-center text-xs hover:bg-background">
                  <Plus className="size-3" />
                </button>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm text-gray-700">{formatPriceUSD(unitPrice(ci) * ci.quantity)}</p>
              <button onClick={() => removeItem(ci.cartKey)}
                className="text-xs text-gray-400 hover:text-red-500 mt-1">✕</button>
            </div>
          </div>
        ))}
      </div>
      <div className="border-t p-4 space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-gray-500">{t.common.subtotal}</span><span>{formatPriceUSD(sub)}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">{t.menu.taxPercent}</span><span>{formatPriceUSD(tax)}</span></div>
        <div className="flex justify-between text-lg font-bold"><span>{t.common.total}</span><span className="text-primary">{formatPriceUSD(total)}</span></div>
        <Button className="w-full py-3 mt-3 bg-primary hover:bg-primary/90"
          disabled={!cartItems.length || sending} onClick={handleSend}>
          {sending ? <Loader2 className="size-4 animate-spin mr-2" /> : <ArrowRight className="size-4 mr-2" />}
          {sending ? t.menu.sending : t.menu.sendToKitchen}
        </Button>
        {cartItems.length > 0 && (
          <button onClick={clearCart} className="w-full text-xs text-gray-400 hover:text-red-500 text-center mt-2">
            {t.menu.clearOrder}
          </button>
        )}
      </div>
    </aside>
  )
}

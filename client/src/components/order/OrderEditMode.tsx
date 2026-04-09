import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { Order, OrderItem, MenuItem } from '@qr-order/shared'
import { api } from '@/services/api'
import { formatPriceUSD } from '@/lib/format'
import { itemUnitPrice } from '@/lib/pricing'
import { optionLabel } from '@/lib/i18n-utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Plus, Minus, Trash2, Search } from 'lucide-react'

const DISCOUNTS = [10, 25, 50, 100] as const

interface Props { order: Order; storeId: string; onSave: () => void; onCancel: () => void }

export default function OrderEditMode({ order, storeId, onSave, onCancel }: Props) {
  const { t } = useTranslation('admin')
  const [items, setItems] = useState<OrderItem[]>(() => order.items.map((it) => ({ ...it })))
  const [discount, setDiscount] = useState(0)
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.getMenu(storeId).then((res) => {
      setMenuItems(res.categories.flatMap((c) => c.items).filter((m) => m.available))
    }).catch(() => {})
  }, [storeId])

  const subtotal = items.reduce((s, it) => s + itemUnitPrice(it) * it.quantity, 0)
  const discountAmt = Math.round(subtotal * discount / 100)

  const updateQty = (idx: number, delta: number) => {
    setItems((prev) => prev.map((it, i) => {
      if (i !== idx) return it
      const q = it.quantity + delta
      return q > 0 ? { ...it, quantity: q } : it
    }))
  }
  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx))
  const updateRemark = (idx: number, remark: string) => {
    setItems((prev) => prev.map((it, i) => i === idx ? { ...it, remark } : it))
  }

  const addMenuItem = (mi: MenuItem) => {
    const idx = items.findIndex((it) => it.menuItemId === mi.id && !it.selectedOptions?.length)
    if (idx >= 0) { updateQty(idx, 1) } else {
      setItems((prev) => [...prev, { menuItemId: mi.id, name: mi.name, nameEn: mi.nameEn, price: mi.price, quantity: 1 }])
    }
    setShowAdd(false); setSearch('')
  }

  const handleSave = async () => {
    if (!items.length) return
    setSaving(true)
    try {
      const finalItems = discount > 0
        ? items.map((it) => ({ ...it, price: Math.round(it.price * (100 - discount) / 100) }))
        : items
      await api.updateOrderItems(storeId, order.id, finalItems)
      onSave()
    } catch { /* let user retry */ } finally { setSaving(false) }
  }

  const filtered = menuItems.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    (m.nameEn ?? '').toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <EditableItemRow key={i} item={item} idx={i}
          onQty={updateQty} onRemove={removeItem} onRemark={updateRemark} />
      ))}
      {!items.length && (
        <p className="text-sm text-muted-foreground text-center py-2">{t('tableDetail.noItems')}</p>
      )}
      <Separator />
      {!showAdd ? (
        <Button variant="outline" size="sm" className="w-full" onClick={() => setShowAdd(true)}>
          <Plus className="size-4 mr-1" />{t('tableDetail.addItem')}
        </Button>
      ) : (
        <AddItemPanel search={search} setSearch={setSearch}
          items={filtered} onAdd={addMenuItem} onClose={() => { setShowAdd(false); setSearch('') }} />
      )}
      <div>
        <p className="text-xs font-medium mb-1">{t('tableDetail.quickDiscount')}</p>
        <div className="flex gap-1">
          {DISCOUNTS.map((d) => (
            <Button key={d} size="xs" variant={discount === d ? 'default' : 'outline'}
              onClick={() => setDiscount(discount === d ? 0 : d)}>
              {d === 100 ? t('tableDetail.free') : `${d}%`}
            </Button>
          ))}
        </div>
      </div>
      <Separator />
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span>{t('tableDetail.subtotal')}</span><span>{formatPriceUSD(subtotal)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-red-500">
            <span>{t('tableDetail.discountLabel', { pct: discount })}</span>
            <span>-{formatPriceUSD(discountAmt)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold">
          <span>{t('tableDetail.total')}</span>
          <span className="text-primary">{formatPriceUSD(subtotal - discountAmt)}</span>
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <Button variant="outline" className="flex-1" onClick={onCancel} disabled={saving}>
          {t('tableDetail.cancel')}
        </Button>
        <Button className="flex-1" onClick={handleSave} disabled={saving || !items.length}>
          {saving ? t('coupons.saving') : t('tableDetail.save')}
        </Button>
      </div>
    </div>
  )
}

function EditableItemRow({ item, idx, onQty, onRemove, onRemark }: {
  item: OrderItem; idx: number
  onQty: (i: number, d: number) => void; onRemove: (i: number) => void; onRemark: (i: number, r: string) => void
}) {
  const opts = item.selectedOptions
  return (
    <div className="text-sm space-y-1">
      <div className="flex items-center justify-between">
        <span className="font-medium truncate flex-1">{item.name}</span>
        <span className="shrink-0 ml-2">{formatPriceUSD(itemUnitPrice(item) * item.quantity)}</span>
      </div>
      {opts && opts.length > 0 && (
        <p className="text-xs text-orange-600">{opts.map((o) => optionLabel(o)).join(' | ')}</p>
      )}
      <div className="flex items-center gap-1">
        <Button size="sm" variant="outline" className="min-h-[44px] min-w-[44px] p-0" onClick={() => onQty(idx, -1)}><Minus className="size-4" /></Button>
        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
        <Button size="sm" variant="outline" className="min-h-[44px] min-w-[44px] p-0" onClick={() => onQty(idx, 1)}><Plus className="size-4" /></Button>
        <Button size="sm" variant="ghost" className="min-h-[44px] min-w-[44px] p-0 text-destructive ml-auto" onClick={() => onRemove(idx)}>
          <Trash2 className="size-4" />
        </Button>
      </div>
      <Input className="h-7 text-xs" placeholder="Note..." value={item.remark ?? ''}
        onChange={(e) => onRemark(idx, e.target.value)} />
    </div>
  )
}

function AddItemPanel({ search, setSearch, items, onAdd, onClose }: {
  search: string; setSearch: (v: string) => void
  items: MenuItem[]; onAdd: (m: MenuItem) => void; onClose: () => void
}) {
  const { t } = useTranslation('admin')
  return (
    <div className="border rounded-md p-2 space-y-2">
      <div className="flex items-center gap-1">
        <Search className="size-4 text-muted-foreground shrink-0" />
        <Input className="h-7 text-xs" placeholder={t('dashboard.addDishPlaceholder')}
          value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
        <Button size="xs" variant="ghost" onClick={onClose}>x</Button>
      </div>
      <div className="max-h-32 overflow-y-auto space-y-0.5">
        {items.slice(0, 20).map((mi) => (
          <button key={mi.id} onClick={() => onAdd(mi)}
            className="w-full flex justify-between items-center px-2 py-1 text-xs rounded hover:bg-accent">
            <span className="truncate">{mi.name}</span>
            <span className="shrink-0 ml-2 text-muted-foreground">{formatPriceUSD(mi.price)}</span>
          </button>
        ))}
        {!items.length && <p className="text-xs text-muted-foreground text-center py-2">{t('tableDetail.noResults')}</p>}
      </div>
    </div>
  )
}
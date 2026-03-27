import { useState, useEffect, useCallback } from 'react'
import { useT } from '@/i18n/useT'
import { api } from '@/services/api'
import { formatPriceUSD } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Order, OrderItem, MenuItem, MenuResponse } from '@qr-order/shared'

function itemUnitPrice(item: OrderItem): number {
  return item.price + (item.selectedOptions ?? []).reduce((s, o) => s + o.priceAdjust, 0)
}

interface Props {
  order: Order | null
  storeId: string
  open: boolean
  onClose: () => void
  onSaved: () => void
  isOwner: boolean
}

export default function OrderEditDialog({
  order,
  storeId,
  open,
  onClose,
  onSaved,
  isOwner,
}: Props) {
  const { t } = useT()

  const [editItems, setEditItems] = useState<OrderItem[]>([])
  const [savingEdit, setSavingEdit] = useState(false)
  const [menuData, setMenuData] = useState<MenuResponse | null>(null)
  const [addItemId, setAddItemId] = useState<string>('')

  const allMenuItems: MenuItem[] = menuData
    ? menuData.categories.flatMap(c => c.items)
    : []

  // Reset state when a new order is opened for editing
  useEffect(() => {
    if (order && open) {
      setEditItems(JSON.parse(JSON.stringify(order.items)))
      setAddItemId('')
    }
  }, [order, open])

  // Load menu data once
  const loadMenu = useCallback(async () => {
    if (menuData) return
    try {
      const menu = await api.getMenu(storeId)
      setMenuData(menu)
    } catch (err) {
      console.error('Failed to load menu:', err)
    }
  }, [storeId, menuData])

  useEffect(() => {
    if (open) loadMenu()
  }, [open, loadMenu])

  const handleQuantity = (idx: number, delta: number) => {
    setEditItems(prev => {
      const items = [...prev]
      const newQty = items[idx].quantity + delta
      if (newQty <= 0) return items.filter((_, i) => i !== idx)
      items[idx] = { ...items[idx], quantity: newQty }
      return items
    })
  }

  const handleRemark = (idx: number, remark: string) => {
    setEditItems(prev => {
      const items = [...prev]
      items[idx] = { ...items[idx], remark: remark || undefined }
      return items
    })
  }

  const handleOption = (idx: number, optionId: string, choiceId: string) => {
    setEditItems(prev => {
      const items = [...prev]
      const item = items[idx]
      const menuItem = allMenuItems.find(m => m.id === item.menuItemId)
      if (!menuItem?.options) return prev
      const option = menuItem.options.find(o => o.id === optionId)
      const choice = option?.choices.find(c => c.id === choiceId)
      if (!option || !choice) return prev

      const currentOptions = [...(item.selectedOptions ?? [])]
      const existingIdx = currentOptions.findIndex(o => o.optionId === optionId)
      const newOpt = {
        optionId: option.id,
        optionName: option.name,
        choiceId: choice.id,
        choiceName: choice.name,
        priceAdjust: choice.priceAdjust,
      }
      if (existingIdx >= 0) {
        currentOptions[existingIdx] = newOpt
      } else {
        currentOptions.push(newOpt)
      }
      items[idx] = { ...items[idx], selectedOptions: currentOptions }
      return items
    })
  }

  const handleRemoveItem = (idx: number) => {
    setEditItems(prev => prev.filter((_, i) => i !== idx))
  }

  const handleAddItem = () => {
    if (!addItemId) return
    const menuItem = allMenuItems.find(m => m.id === addItemId)
    if (!menuItem) return
    setEditItems(prev => [
      ...prev,
      {
        menuItemId: menuItem.id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: 1,
        selectedOptions: undefined,
      },
    ])
    setAddItemId('')
  }

  const handleSave = async () => {
    if (!order || editItems.length === 0) return
    setSavingEdit(true)
    try {
      await api.updateOrderItems(storeId, order.id, editItems)
      onClose()
      onSaved()
    } catch (err) {
      console.error('Failed to save order:', err)
    } finally {
      setSavingEdit(false)
    }
  }

  const editTotal = editItems.reduce((sum, item) => sum + itemUnitPrice(item) * item.quantity, 0)

  const getMissingRequired = (): { idx: number; optionName: string }[] => {
    const missing: { idx: number; optionName: string }[] = []
    editItems.forEach((item, idx) => {
      const menuItem = allMenuItems.find(m => m.id === item.menuItemId)
      if (!menuItem?.options) return
      for (const opt of menuItem.options) {
        if (opt.required) {
          const hasChoice = item.selectedOptions?.some(o => o.optionId === opt.id)
          if (!hasChoice) missing.push({ idx, optionName: opt.name })
        }
      }
    })
    return missing
  }

  const missingRequired = getMissingRequired()
  const canSave = editItems.length > 0 && missingRequired.length === 0

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg w-[calc(100vw-2rem)] md:w-auto max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t.dashboard.editOrderTitle} #{order?.orderNumber}
            <span className="text-sm font-normal text-muted-foreground ml-2">
              {order?.tableName}
            </span>
          </DialogTitle>
        </DialogHeader>

        {order && (
          <div className="space-y-4">
            {/* Edit items */}
            <div className="space-y-3">
              {editItems.map((item, idx) => {
                const menuItem = allMenuItems.find(m => m.id === item.menuItemId)
                return (
                  <EditItemRow
                    key={`${item.menuItemId}-${idx}`}
                    item={item}
                    menuItem={menuItem}
                    idx={idx}
                    isOwner={isOwner}
                    onQuantity={handleQuantity}
                    onRemark={handleRemark}
                    onOption={handleOption}
                    onRemove={handleRemoveItem}
                  />
                )
              })}
            </div>

            {/* Add new item */}
            <div className="flex items-center gap-2 pt-2 border-t">
              <Select value={addItemId} onValueChange={setAddItemId}>
                <SelectTrigger className="flex-1 h-9 text-sm">
                  <SelectValue placeholder={t.dashboard.addDishPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {allMenuItems.map(m => (
                    <SelectItem key={m.id} value={m.id}>
                      {isOwner ? `${m.name} — ${formatPriceUSD(m.price)}` : m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" onClick={handleAddItem} disabled={!addItemId}>
                {t.dashboard.addDish}
              </Button>
            </div>

            <Separator />

            {/* Missing required warning */}
            {missingRequired.length > 0 && (
              <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                {t.dashboard.missingOptions}
                {missingRequired.map((m, i) => (
                  <span key={i} className="font-medium ml-1">
                    {editItems[m.idx]?.name}({m.optionName}){i < missingRequired.length - 1 ? ', ' : ''}
                  </span>
                ))}
              </div>
            )}

            {/* Total + save */}
            <div className="flex items-center justify-between">
              {isOwner && (
                <span className="font-semibold">
                  {t.common.total}: {formatPriceUSD(editTotal)}
                </span>
              )}
              {!isOwner && <span />}
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose}>
                  {t.common.cancel}
                </Button>
                <Button onClick={handleSave} disabled={savingEdit || !canSave}>
                  {savingEdit ? t.common.saving : t.dashboard.saveChanges}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ---- Sub-component for a single editable item row ----

interface EditItemRowProps {
  item: OrderItem
  menuItem: MenuItem | undefined
  idx: number
  isOwner: boolean
  onQuantity: (idx: number, delta: number) => void
  onRemark: (idx: number, remark: string) => void
  onOption: (idx: number, optionId: string, choiceId: string) => void
  onRemove: (idx: number) => void
}

function EditItemRow({
  item,
  menuItem,
  idx,
  isOwner,
  onQuantity,
  onRemark,
  onOption,
  onRemove,
}: EditItemRowProps) {
  const { t } = useT()

  return (
    <div className="border rounded-lg p-3 space-y-2">
      {/* Name + quantity + remove */}
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <span className="font-medium text-sm">{item.name}</span>
          {isOwner && (
            <span className="text-xs text-muted-foreground ml-2">
              {formatPriceUSD(itemUnitPrice(item))}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" className="h-11 w-11 p-0" onClick={() => onQuantity(idx, -1)}>
            -
          </Button>
          <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
          <Button variant="outline" size="sm" className="h-11 w-11 p-0" onClick={() => onQuantity(idx, 1)}>
            +
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="min-h-[44px] px-2 text-red-500 hover:text-red-700"
            onClick={() => onRemove(idx)}
          >
            {t.common.delete}
          </Button>
        </div>
      </div>

      {/* Options editing */}
      {menuItem?.options && menuItem.options.length > 0 && (
        <div className="space-y-1">
          {menuItem.options.map(option => {
            const currentChoice = item.selectedOptions?.find(o => o.optionId === option.id)
            return (
              <div key={option.id} className="flex items-center gap-2">
                <span className={`text-xs w-14 shrink-0 ${
                  option.required && !currentChoice ? 'text-red-600 font-semibold' : 'text-muted-foreground'
                }`}>
                  {option.name}{option.required ? '*' : ''}
                </span>
                <div className="flex flex-wrap gap-1">
                  {option.choices.map(choice => (
                    <button
                      key={choice.id}
                      onClick={() => onOption(idx, option.id, choice.id)}
                      className={`px-3 py-1.5 min-h-[44px] rounded text-xs border transition-colors ${
                        currentChoice?.choiceId === choice.id
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {choice.name}
                      {isOwner && choice.priceAdjust > 0 && (
                        <span className="text-muted-foreground ml-0.5">+{formatPriceUSD(choice.priceAdjust)}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Remark */}
      <Input
        value={item.remark ?? ''}
        onChange={e => onRemark(idx, e.target.value)}
        placeholder={t.dashboard.remark}
        className="text-base h-9"
      />
    </div>
  )
}

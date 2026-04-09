import { useState, useEffect } from 'react'
import { useT } from '@/i18n/useT'
import { localized } from '@/lib/i18n-utils'
import { api } from '@/services/api'
import { formatPriceUSD } from '@/lib/format'
import { itemUnitPrice } from '@/lib/pricing'
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
import type { Order, OrderItem, MenuItem, SelectedOption } from '@qr-order/shared'

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
  const { t, lang } = useT()

  const [editItems, setEditItems] = useState<OrderItem[]>([])
  const [savingEdit, setSavingEdit] = useState(false)
  const [allMenuItems, setAllMenuItems] = useState<MenuItem[]>([])
  const [addItemId, setAddItemId] = useState<string>('')
  const [customPrice, setCustomPrice] = useState<string>('')

  // Reset state when a new order is opened for editing
  useEffect(() => {
    if (order && open) {
      setEditItems(JSON.parse(JSON.stringify(order.items)))
      setAddItemId('')
      setCustomPrice('')
    }
  }, [order, open])

  // Load ALL menu items (admin endpoint — includes staffOnly)
  useEffect(() => {
    if (!open || allMenuItems.length > 0) return
    api.getMenuItems(storeId).then(setAllMenuItems).catch(() => {})
  }, [open, storeId, allMenuItems.length])

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

  const handlePriceChange = (idx: number, newPrice: number) => {
    setEditItems(prev => {
      const items = [...prev]
      items[idx] = { ...items[idx], price: newPrice }
      return items
    })
  }

  const handleAddCustomOption = (idx: number, name: string, priceCents: number) => {
    const newOpt: SelectedOption = {
      optionId: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      optionName: name,
      choiceId: `custom-${Date.now()}`,
      choiceName: name,
      priceAdjust: priceCents,
    }
    setEditItems(prev => {
      const items = [...prev]
      const item = items[idx]
      const currentOptions = [...(item.selectedOptions ?? [])]
      currentOptions.push(newOpt)
      items[idx] = { ...items[idx], selectedOptions: currentOptions }
      return items
    })
  }

  const handleRemoveCustomOption = (idx: number, optionId: string) => {
    setEditItems(prev => {
      const items = [...prev]
      const item = items[idx]
      const currentOptions = (item.selectedOptions ?? []).filter(o => o.optionId !== optionId)
      items[idx] = { ...items[idx], selectedOptions: currentOptions }
      return items
    })
  }

  const selectedAddItem = allMenuItems.find(m => m.id === addItemId)

  const handleAddItem = () => {
    if (!addItemId || !selectedAddItem) return
    const price = selectedAddItem.allowCustomPrice && customPrice
      ? Math.round(parseFloat(customPrice) * 100)
      : selectedAddItem.price
    setEditItems(prev => [
      ...prev,
      {
        menuItemId: selectedAddItem.id,
        name: selectedAddItem.name,
        nameEn: selectedAddItem.nameEn,
        price,
        quantity: 1,
        selectedOptions: undefined,
      },
    ])
    setAddItemId('')
    setCustomPrice('')
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
            {t.dashboard.editOrderTitle.replace('{{number}}', order?.orderNumber ?? '')}
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
                    onPriceChange={handlePriceChange}
                    onAddCustomOption={handleAddCustomOption}
                    onRemoveCustomOption={handleRemoveCustomOption}
                  />
                )
              })}
            </div>

            {/* Add new item */}
            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center gap-2">
                <Select value={addItemId} onValueChange={v => { setAddItemId(v); setCustomPrice('') }}>
                  <SelectTrigger className="flex-1 h-9 text-sm">
                    <SelectValue placeholder={t.dashboard.addDishPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {allMenuItems.map(m => (
                      <SelectItem key={m.id} value={m.id}>
                        <span className="flex items-center gap-1.5">
                          {localized(m, lang)} — {formatPriceUSD(m.price)}
                          {m.staffOnly && <span className="text-[9px] bg-purple-100 text-purple-700 px-1 rounded">Staff</span>}
                          {m.allowCustomPrice && <span className="text-[9px] bg-blue-100 text-blue-700 px-1 rounded">$?</span>}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" onClick={handleAddItem} disabled={!addItemId}>
                  {t.dashboard.addDish}
                </Button>
              </div>
              {/* Custom price input — shows when selected item allows it */}
              {selectedAddItem?.allowCustomPrice && (
                <div className="flex items-center gap-2 pl-1">
                  <span className="text-xs text-muted-foreground">{t.menuManage?.customPrice || 'Custom Price'}:</span>
                  <Input
                    type="number" min={0} step={0.01}
                    value={customPrice}
                    onChange={e => setCustomPrice(e.target.value)}
                    placeholder={`${(selectedAddItem.price / 100).toFixed(2)}`}
                    className="w-24 h-7 text-xs"
                  />
                  <span className="text-[10px] text-muted-foreground">
                    {customPrice ? formatPriceUSD(Math.round(parseFloat(customPrice) * 100)) : formatPriceUSD(selectedAddItem.price)}
                  </span>
                </div>
              )}
            </div>

            <Separator />

            {/* Missing required warning */}
            {missingRequired.length > 0 && (
              <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                {t.dashboard.missingOptions}
                {missingRequired.map((m, i) => (
                  <span key={i} className="font-medium ml-1">
                    {editItems[m.idx] ? localized(editItems[m.idx], lang) : ''}({m.optionName}){i < missingRequired.length - 1 ? ', ' : ''}
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
  onPriceChange: (idx: number, newPrice: number) => void
  onAddCustomOption: (idx: number, name: string, priceCents: number) => void
  onRemoveCustomOption: (idx: number, optionId: string) => void
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
  onPriceChange,
  onAddCustomOption,
  onRemoveCustomOption,
}: EditItemRowProps) {
  const { t, lang } = useT()
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customPriceInput, setCustomPriceInput] = useState('')

  const customOptions = (item.selectedOptions ?? []).filter(o => o.optionId.startsWith('custom-'))

  const handleSubmitCustom = () => {
    const name = customName.trim()
    if (!name) return
    const dollars = parseFloat(customPriceInput) || 0
    const cents = Math.round(dollars * 100)
    onAddCustomOption(idx, name, cents)
    setCustomName('')
    setCustomPriceInput('')
    setShowCustomForm(false)
  }

  return (
    <div className="border rounded-lg p-3 space-y-2">
      {/* Name + quantity + remove */}
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <span className="font-medium text-sm">{localized(item, lang)}</span>
          {isOwner && (
            <button
              type="button"
              className="text-xs text-muted-foreground ml-2 hover:text-primary hover:underline"
              onClick={() => {
                const input = prompt('Price ($):', (item.price / 100).toFixed(2))
                if (input !== null) {
                  const cents = Math.round(parseFloat(input) * 100)
                  if (cents >= 0) onPriceChange(idx, cents)
                }
              }}
            >
              {formatPriceUSD(itemUnitPrice(item))} ✎
            </button>
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
                  {localized(option, lang)}{option.required ? '*' : ''}
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
                      {localized(choice, lang)}
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

      {/* Custom (ad-hoc) options */}
      <div className="space-y-1">
        {customOptions.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {customOptions.map(opt => (
              <span
                key={opt.optionId}
                className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-amber-50 border border-amber-200 text-amber-800"
              >
                <span className="text-[9px] font-semibold">{t.dashboard.customLabel}</span>
                {opt.choiceName}
                {opt.priceAdjust > 0 && (
                  <span className="text-amber-600">+{formatPriceUSD(opt.priceAdjust)}</span>
                )}
                <button
                  type="button"
                  className="ml-0.5 min-h-[44px] min-w-[44px] flex items-center justify-center text-amber-500 hover:text-red-600"
                  onClick={() => onRemoveCustomOption(idx, opt.optionId)}
                  aria-label="Remove"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
        )}

        {showCustomForm ? (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Input
              value={customName}
              onChange={e => setCustomName(e.target.value)}
              placeholder={t.dashboard.customOptionName}
              className="w-28 h-9 text-xs"
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') handleSubmitCustom() }}
            />
            <Input
              type="number"
              min={0}
              step={0.01}
              value={customPriceInput}
              onChange={e => setCustomPriceInput(e.target.value)}
              placeholder={t.dashboard.customOptionPrice}
              className="w-24 h-9 text-xs"
              onKeyDown={e => { if (e.key === 'Enter') handleSubmitCustom() }}
            />
            <Button
              size="sm"
              variant="outline"
              className="min-h-[44px] text-xs"
              onClick={handleSubmitCustom}
              disabled={!customName.trim()}
            >
              {t.dashboard.addDish}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="min-h-[44px] text-xs text-muted-foreground"
              onClick={() => { setShowCustomForm(false); setCustomName(''); setCustomPriceInput('') }}
            >
              {t.common.cancel}
            </Button>
          </div>
        ) : (
          <button
            type="button"
            className="min-h-[44px] px-2 text-xs text-blue-600 hover:text-blue-800 hover:underline"
            onClick={() => setShowCustomForm(true)}
          >
            {t.dashboard.addCustomOption}
          </button>
        )}
      </div>

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

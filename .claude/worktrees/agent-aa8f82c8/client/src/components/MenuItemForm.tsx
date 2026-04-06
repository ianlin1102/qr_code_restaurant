import { useState, useEffect } from 'react'
import { useT } from '@/i18n/useT'
import { api } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
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
import type { MenuItem, Category, MenuItemOption, MenuItemOptionChoice } from '@qr-order/shared'
import { v4 as uuid } from 'uuid'
import ImageUpload from '@/components/ImageUpload'

export function blankItem(categoryId: string): Omit<MenuItem, 'id' | 'storeId'> {
  return {
    categoryId,
    name: '',
    description: '',
    price: 0,
    available: true,
    sortOrder: 0,
    options: [],
  }
}

function blankOption(): MenuItemOption {
  return { id: uuid(), name: '', required: false, choices: [] }
}

function blankChoice(): MenuItemOptionChoice {
  return { id: uuid(), name: '', priceAdjust: 0 }
}

interface MenuItemFormProps {
  item: Partial<MenuItem> | null
  categories: Category[]
  storeId: string
  open: boolean
  isNew: boolean
  onClose: () => void
  onSaved: () => void
}

export default function MenuItemForm({
  item,
  categories,
  storeId,
  open,
  isNew,
  onClose,
  onSaved,
}: MenuItemFormProps) {
  const { t } = useT()
  const [editingItem, setEditingItem] = useState<Partial<MenuItem> | null>(null)
  const [saving, setSaving] = useState(false)

  // Sync prop into local state when the dialog opens
  useEffect(() => {
    if (open && item) {
      setEditingItem({ ...item })
    } else if (!open) {
      setEditingItem(null)
    }
  }, [open, item])

  const updateField = (field: string, value: unknown) => {
    setEditingItem(prev => prev ? { ...prev, [field]: value } : prev)
  }

  const handleSave = async () => {
    if (!editingItem || !editingItem.name || editingItem.price == null) return
    setSaving(true)
    try {
      if (isNew) {
        await api.createMenuItem(storeId, {
          categoryId: editingItem.categoryId!,
          name: editingItem.name,
          nameEn: editingItem.nameEn,
          description: editingItem.description,
          descriptionEn: editingItem.descriptionEn,
          price: editingItem.price,
          image: editingItem.image,
          originalPrice: editingItem.originalPrice,
          available: editingItem.available ?? true,
          sortOrder: editingItem.sortOrder ?? 0,
          options: editingItem.options,
        })
      } else {
        await api.updateMenuItem(storeId, editingItem.id!, editingItem)
      }
      onClose()
      onSaved()
    } catch (err) {
      console.error('Failed to save:', err)
    } finally {
      setSaving(false)
    }
  }

  // ===== Options editing helpers =====

  const addOption = () => {
    setEditingItem(prev => {
      if (!prev) return prev
      return { ...prev, options: [...(prev.options ?? []), blankOption()] }
    })
  }

  const updateOption = (optIdx: number, field: keyof MenuItemOption, value: unknown) => {
    setEditingItem(prev => {
      if (!prev) return prev
      const options = [...(prev.options ?? [])]
      options[optIdx] = { ...options[optIdx], [field]: value }
      return { ...prev, options }
    })
  }

  const removeOption = (optIdx: number) => {
    setEditingItem(prev => {
      if (!prev) return prev
      return { ...prev, options: (prev.options ?? []).filter((_, i) => i !== optIdx) }
    })
  }

  const addChoice = (optIdx: number) => {
    setEditingItem(prev => {
      if (!prev) return prev
      const options = [...(prev.options ?? [])]
      options[optIdx] = {
        ...options[optIdx],
        choices: [...options[optIdx].choices, blankChoice()],
      }
      return { ...prev, options }
    })
  }

  const updateChoice = (optIdx: number, choiceIdx: number, field: keyof MenuItemOptionChoice, value: unknown) => {
    setEditingItem(prev => {
      if (!prev) return prev
      const options = [...(prev.options ?? [])]
      const choices = [...options[optIdx].choices]
      choices[choiceIdx] = { ...choices[choiceIdx], [field]: value }
      options[optIdx] = { ...options[optIdx], choices }
      return { ...prev, options }
    })
  }

  const removeChoice = (optIdx: number, choiceIdx: number) => {
    setEditingItem(prev => {
      if (!prev) return prev
      const options = [...(prev.options ?? [])]
      options[optIdx] = {
        ...options[optIdx],
        choices: options[optIdx].choices.filter((_, i) => i !== choiceIdx),
      }
      return { ...prev, options }
    })
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg w-[calc(100vw-2rem)] md:w-auto max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isNew ? t.menuManage.addItemTitle : t.menuManage.editItemTitle}</DialogTitle>
        </DialogHeader>

        {editingItem && (
          <div className="space-y-4">
            <BasicFields item={editingItem} categories={categories} updateField={updateField} />
            <Separator />
            <OptionsSection
              options={editingItem.options ?? []}
              addOption={addOption}
              updateOption={updateOption}
              removeOption={removeOption}
              addChoice={addChoice}
              updateChoice={updateChoice}
              removeChoice={removeChoice}
            />
            <Separator />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={onClose}>
                {t.common.cancel}
              </Button>
              <Button onClick={handleSave} disabled={saving || !editingItem.name}>
                {saving ? t.common.saving : t.common.save}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

/* ---------- Sub-sections ---------- */

function BasicFields({
  item,
  categories,
  updateField,
}: {
  item: Partial<MenuItem>
  categories: Category[]
  updateField: (field: string, value: unknown) => void
}) {
  const { t } = useT()
  return (
    <div className="space-y-3">
      <div>
        <label className="text-sm font-medium">{t.menuManage.dishName} *</label>
        <Input value={item.name ?? ''} onChange={e => updateField('name', e.target.value)} placeholder={t.menuManage.dishNamePlaceholder} className="text-base" />
      </div>
      <div>
        <label className="text-sm font-medium">{t.menuManage.dishNameEn}</label>
        <Input value={item.nameEn ?? ''} onChange={e => updateField('nameEn', e.target.value)} placeholder={t.menuManage.dishNameEnPlaceholder} className="text-base" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">{t.menuManage.priceYuan} *</label>
          <Input type="number" step="0.01" value={((item.price ?? 0) / 100).toFixed(2)} onChange={e => updateField('price', Math.round(parseFloat(e.target.value || '0') * 100))} placeholder="38.00" className="text-base" />
        </div>
        <div>
          <label className="text-sm font-medium">{t.menuManage.category}</label>
          <Select value={item.categoryId ?? ''} onValueChange={v => updateField('categoryId', v)}>
            <SelectTrigger><SelectValue placeholder={t.menuManage.selectCategory} /></SelectTrigger>
            <SelectContent>
              {categories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      {/* Discount section */}
      <DiscountBar price={item.price ?? 0} originalPrice={item.originalPrice} updateField={updateField} />
      <div>
        <label className="text-sm font-medium">{t.menuManage.description}</label>
        <Textarea value={item.description ?? ''} onChange={e => updateField('description', e.target.value)} placeholder={t.menuManage.descriptionPlaceholder} rows={2} className="text-base" />
      </div>
      <div>
        <label className="text-sm font-medium">{t.menuManage.descriptionEn}</label>
        <Textarea value={item.descriptionEn ?? ''} onChange={e => updateField('descriptionEn', e.target.value)} placeholder={t.menuManage.descriptionEnPlaceholder} rows={2} className="text-base" />
      </div>
      <div>
        <label className="text-sm font-medium">{t.common.image}</label>
        <ImageUpload value={item.image} onChange={url => updateField('image', url)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">{t.menuManage.sortOrder}</label>
          <Input type="number" value={item.sortOrder ?? 0} onChange={e => updateField('sortOrder', parseInt(e.target.value || '0'))} className="text-base" />
        </div>
        <div className="flex items-end gap-2 pb-1">
          <Switch checked={item.available ?? true} onCheckedChange={v => updateField('available', v)} />
          <label className="text-sm">{item.available ? t.menuManage.listed : t.menuManage.delisted}</label>
        </div>
      </div>
    </div>
  )
}

function OptionsSection({
  options,
  addOption,
  updateOption,
  removeOption,
  addChoice,
  updateChoice,
  removeChoice,
}: {
  options: MenuItemOption[]
  addOption: () => void
  updateOption: (i: number, f: keyof MenuItemOption, v: unknown) => void
  removeOption: (i: number) => void
  addChoice: (i: number) => void
  updateChoice: (oi: number, ci: number, f: keyof MenuItemOptionChoice, v: unknown) => void
  removeChoice: (oi: number, ci: number) => void
}) {
  const { t } = useT()
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium">{t.menuManage.options}</label>
        <Button variant="outline" size="sm" onClick={addOption}>{t.menuManage.addOption}</Button>
      </div>
      {options.length === 0 && <p className="text-sm text-muted-foreground">{t.menuManage.noOptions}</p>}
      <div className="space-y-4">
        {options.map((opt, optIdx) => (
          <div key={opt.id} className="border rounded-lg p-3 space-y-2 bg-background">
            <div className="flex items-center gap-2">
              <Input value={opt.name} onChange={e => updateOption(optIdx, 'name', e.target.value)} placeholder={t.menuManage.optionName} className="flex-1 text-base" />
              <Input value={opt.nameEn ?? ''} onChange={e => updateOption(optIdx, 'nameEn', e.target.value)} placeholder={t.menuManage.optionNameEn} className="flex-1 text-base" />
              <div className="flex items-center gap-1">
                <Switch checked={opt.required} onCheckedChange={v => updateOption(optIdx, 'required', v)} />
                <span className="text-xs text-muted-foreground whitespace-nowrap">{t.menuManage.required}</span>
              </div>
              <Button variant="outline" size="sm" className="text-red-600" onClick={() => removeOption(optIdx)}>{t.common.delete}</Button>
            </div>
            <div className="space-y-1 ml-2">
              {opt.choices.map((choice, choiceIdx) => (
                <div key={choice.id} className="flex items-center gap-2">
                  <Input value={choice.name} onChange={e => updateChoice(optIdx, choiceIdx, 'name', e.target.value)} placeholder={t.menuManage.choiceName} className="flex-1 text-base" />
                  <Input value={choice.nameEn ?? ''} onChange={e => updateChoice(optIdx, choiceIdx, 'nameEn', e.target.value)} placeholder={t.menuManage.choiceNameEn} className="flex-1 text-base" />
                  <div className="flex items-center gap-1 w-[100px]">
                    <span className="text-xs text-muted-foreground">+&#xA5;</span>
                    <Input type="number" step="0.01" value={(choice.priceAdjust / 100).toFixed(2)} onChange={e => updateChoice(optIdx, choiceIdx, 'priceAdjust', Math.round(parseFloat(e.target.value || '0') * 100))} className="w-20 text-base" />
                  </div>
                  <Button variant="ghost" size="sm" className="text-red-500 px-2" onClick={() => removeChoice(optIdx, choiceIdx)}>
                    &#xD7;
                  </Button>
                </div>
              ))}
              <Button variant="ghost" size="sm" onClick={() => addChoice(optIdx)} className="text-xs">{t.menuManage.addChoice}</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ---------- Discount bar ---------- */

const DISCOUNTS = [10, 25, 50] as const

function DiscountBar({ price, originalPrice, updateField }: {
  price: number; originalPrice?: number
  updateField: (field: string, value: unknown) => void
}) {
  const { t } = useT()
  const basePrice = originalPrice ?? price
  const isDiscounted = price < basePrice
  const discountPct = isDiscounted ? Math.round((1 - price / basePrice) * 100) : 0

  const applyDiscount = (pct: number) => {
    const newPrice = Math.round(basePrice * (1 - pct / 100))
    updateField('price', newPrice)
    updateField('originalPrice', basePrice)
  }
  const applyFree = () => { updateField('price', 0); updateField('originalPrice', basePrice) }
  const resetPrice = () => { updateField('price', basePrice); updateField('originalPrice', undefined) }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {DISCOUNTS.map(d => (
        <button key={d} onClick={() => applyDiscount(d)} type="button"
          className="border border-gray-300 rounded-lg px-3 py-1 text-xs hover:bg-background transition-colors">
          -{d}%
        </button>
      ))}
      <button onClick={applyFree} type="button"
        className="rounded-lg px-3 py-1 text-xs text-white bg-primary hover:bg-primary/90">
        {t.menuManage.free}
      </button>
      {isDiscounted && (
        <>
          <Badge className="bg-red-100 text-red-700 border-0 text-xs">{discountPct}{t.menuManage.off}</Badge>
          <button onClick={resetPrice} type="button" className="text-xs text-blue-600 hover:underline">{t.menuManage.reset}</button>
        </>
      )}
    </div>
  )
}

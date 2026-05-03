import { useState, useEffect, useRef } from 'react'
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
import type { MenuItem, Category, MenuItemOption, MenuItemOptionChoice, DietaryTag } from '@qr-order/shared'
import { sanitizeDollarInput, dollarStringToCents, centsToDollarString } from '@/lib/money-input'
import { v4 as uuid } from 'uuid'
import ImageUpload from '@/components/shared/ImageUpload'
import { DIETARY_TAGS, DIETARY_META } from '@/lib/dietary'
import { cn } from '@/lib/utils'

export function blankItem(categoryId: string): Omit<MenuItem, 'id' | 'storeId'> {
  return {
    categoryId,
    name: '',
    description: '',
    price: 0,
    available: true,
    staffOnly: false,
    allowCustomPrice: false,
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
          staffOnly: editingItem.staffOnly ?? false,
          allowCustomPrice: editingItem.allowCustomPrice ?? false,
          sortOrder: editingItem.sortOrder ?? 0,
          options: editingItem.options,
          dietary: editingItem.dietary ?? [],
          isRecommended: editingItem.isRecommended ?? false,
          quickTags: editingItem.quickTags ?? [],
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
          <Input inputMode="decimal" value={centsToDollarString(item.price ?? 0)} onChange={e => updateField('price', dollarStringToCents(sanitizeDollarInput(e.target.value)) ?? 0)} placeholder="38.00" className="text-base" />
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
      <DietaryField dietary={item.dietary ?? []} updateField={updateField} />
      <div className="flex items-center gap-2">
        <Switch checked={item.isRecommended ?? false} onCheckedChange={v => updateField('isRecommended', v)} />
        <label className="text-sm font-medium">{t.menu.recommendedLabel}</label>
      </div>
      <QuickTagsField quickTags={item.quickTags ?? []} updateField={updateField} />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">{t.menuManage.sortOrder}</label>
          <Input type="number" value={item.sortOrder ?? 0} onChange={e => updateField('sortOrder', parseInt(e.target.value || '0'))} className="text-base" />
        </div>
        <div className="space-y-2 pb-1">
          <div className="flex items-center gap-2">
            <Switch checked={item.available ?? true} onCheckedChange={v => updateField('available', v)} />
            <label className="text-sm">{item.available ? t.menuManage.listed : t.menuManage.delisted}</label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={item.staffOnly ?? false} onCheckedChange={v => updateField('staffOnly', v)} />
            <label className="text-sm">{item.staffOnly ? (t.menuManage.staffOnly || 'Staff Only') : (t.menuManage.customerVisible || 'Customer Visible')}</label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={item.allowCustomPrice ?? false} onCheckedChange={v => updateField('allowCustomPrice', v)} />
            <label className="text-sm">{t.menuManage.customPrice || 'Allow Custom Price'}</label>
          </div>
        </div>
      </div>
    </div>
  )
}

function DietaryField({
  dietary,
  updateField,
}: {
  dietary: DietaryTag[]
  updateField: (field: string, value: unknown) => void
}) {
  const { t } = useT()
  const toggle = (tag: DietaryTag) => {
    const next = dietary.includes(tag) ? dietary.filter(d => d !== tag) : [...dietary, tag]
    updateField('dietary', next)
  }
  return (
    <div>
      <label className="text-sm font-medium">{t.menu.dietaryLabel}</label>
      <div className="flex flex-wrap gap-1.5 mt-1.5">
        {DIETARY_TAGS.map(tag => {
          const meta = DIETARY_META[tag]
          const Icon = meta.icon
          const selected = dietary.includes(tag)
          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggle(tag)}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs transition-colors',
                selected ? `${meta.bg} ${meta.color}` : 'border-gray-200 text-gray-500 hover:bg-muted',
              )}
            >
              <Icon className="size-3.5" />
              <span>{t.menu.dietary[tag]}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function QuickTagsField({
  quickTags,
  updateField,
}: {
  quickTags: string[]
  updateField: (field: string, value: unknown) => void
}) {
  const { t } = useT()
  const [text, setText] = useState(quickTags.join('\n'))
  const initRef = useRef(false)
  useEffect(() => {
    if (!initRef.current) { initRef.current = true; return }
    // Re-sync only if the upstream array shape no longer matches current text
    const current = text.split('\n').map(s => s.trim()).filter(Boolean)
    const same = current.length === quickTags.length && current.every((v, i) => v === quickTags[i])
    if (!same) setText(quickTags.join('\n'))
  }, [quickTags, text])
  const commit = (raw: string) => {
    setText(raw)
    const lines = raw
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .slice(0, 10)
    updateField('quickTags', lines)
  }
  return (
    <div>
      <label className="text-sm font-medium">{t.menu.quickTagsLabel}</label>
      <p className="text-xs text-muted-foreground mt-0.5 mb-1.5 leading-snug">
        {t.menu.quickTagsHint}
      </p>
      <Textarea
        value={text}
        onChange={e => commit(e.target.value)}
        placeholder={t.menu.quickTagsPlaceholder}
        rows={3}
        className="text-base"
      />
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
                    <Input inputMode="decimal" value={centsToDollarString(choice.priceAdjust)} onChange={e => updateChoice(optIdx, choiceIdx, 'priceAdjust', dollarStringToCents(sanitizeDollarInput(e.target.value)) ?? 0)} className="w-20 text-base" />
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

function DiscountBar({ price, originalPrice, updateField }: {
  price: number; originalPrice?: number
  updateField: (field: string, value: unknown) => void
}) {
  const { t } = useT()
  const [mode, setMode] = useState<'percent' | 'fixed'>('percent')
  const [inputVal, setInputVal] = useState('')
  const basePrice = originalPrice ?? price
  const isDiscounted = price < basePrice
  const discountPct = isDiscounted && basePrice > 0 ? Math.round((1 - price / basePrice) * 100) : 0
  const discountAmt = isDiscounted ? basePrice - price : 0

  const applyDiscount = () => {
    const num = parseFloat(inputVal)
    if (!num || num <= 0) return
    if (mode === 'percent') {
      const clamped = Math.min(num, 100)
      const newPrice = Math.round(basePrice * (1 - clamped / 100))
      updateField('price', Math.max(0, newPrice))
      updateField('originalPrice', basePrice)
    } else {
      // Fixed amount discount (in yuan → convert to cents)
      const cents = Math.round(num * 100)
      const clamped = Math.min(cents, basePrice)
      updateField('price', basePrice - clamped)
      updateField('originalPrice', basePrice)
    }
    setInputVal('')
  }

  const applyFree = () => { updateField('price', 0); updateField('originalPrice', basePrice) }
  const resetPrice = () => { updateField('price', basePrice); updateField('originalPrice', undefined); setInputVal('') }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Mode toggle */}
        <div className="flex rounded-lg border overflow-hidden text-xs">
          <button type="button" onClick={() => setMode('percent')}
            className={`px-2.5 py-1 transition-colors ${mode === 'percent' ? 'bg-primary text-white' : 'hover:bg-muted'}`}>
            %
          </button>
          <button type="button" onClick={() => setMode('fixed')}
            className={`px-2.5 py-1 transition-colors ${mode === 'fixed' ? 'bg-primary text-white' : 'hover:bg-muted'}`}>
            $
          </button>
        </div>
        {/* Input */}
        <input
          type="number" min={0} max={mode === 'percent' ? 100 : basePrice / 100}
          step={mode === 'percent' ? 1 : 0.01}
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); applyDiscount() } }}
          placeholder={mode === 'percent' ? '1-100' : '0.00'}
          className="w-20 h-7 border rounded-lg px-2 text-xs text-center"
        />
        <button type="button" onClick={applyDiscount}
          className="border rounded-lg px-3 py-1 text-xs hover:bg-muted transition-colors">
          {t.common?.confirm || 'Apply'}
        </button>
        <button type="button" onClick={applyFree}
          className="rounded-lg px-3 py-1 text-xs text-white bg-primary hover:bg-primary/90">
          {t.menuManage.free}
        </button>
        {isDiscounted && (
          <button type="button" onClick={resetPrice} className="text-xs text-blue-600 hover:underline">{t.menuManage.reset}</button>
        )}
      </div>
      {isDiscounted && (
        <div className="flex items-center gap-2 text-xs">
          <Badge className="bg-red-100 text-red-700 border-0">{discountPct}% {t.menuManage.off}</Badge>
          <span className="text-muted-foreground line-through">${(basePrice / 100).toFixed(2)}</span>
          <span className="font-medium text-red-600">${(price / 100).toFixed(2)}</span>
          <span className="text-muted-foreground">(-${(discountAmt / 100).toFixed(2)})</span>
        </div>
      )}
    </div>
  )
}

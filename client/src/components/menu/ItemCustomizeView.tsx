import { useState } from 'react'
import { formatPriceUSD } from '@/lib/format'
import { itemUnitPrice } from '@/lib/pricing'
import { ArrowLeft, Plus, Minus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { MenuItem, SelectedOption } from '@qr-order/shared'
import type { T } from '@/i18n/useT'

interface Props {
  item: MenuItem
  t: T
  onBack: () => void
  onConfirm: (item: MenuItem, qty: number, options: SelectedOption[]) => void
}

export default function ItemCustomizeView({ item, t, onBack, onConfirm }: Props) {
  const [selected, setSelected] = useState<Record<string, SelectedOption>>({})
  const [qty, setQty] = useState(1)

  const selectChoice = (opt: NonNullable<MenuItem['options']>[number], choice: typeof opt.choices[number]) => {
    setSelected(prev => ({
      ...prev,
      [opt.id]: {
        optionId: opt.id,
        optionName: opt.name,
        optionNameEn: opt.nameEn,
        choiceId: choice.id,
        choiceName: choice.name,
        choiceNameEn: choice.nameEn,
        priceAdjust: choice.priceAdjust,
      },
    }))
  }

  const allRequiredSelected = (item.options ?? [])
    .filter(o => o.required)
    .every(o => selected[o.id])

  const unitTotal = itemUnitPrice({ price: item.price, quantity: 1, selectedOptions: Object.values(selected) }) * qty

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pr-12 pt-4 pb-3 border-b">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{item.name}</p>
          {item.nameEn && <p className="text-xs text-muted-foreground truncate">{item.nameEn}</p>}
        </div>
        <span className="text-sm font-semibold text-primary shrink-0">{formatPriceUSD(item.price)}</span>
      </div>

      {/* Option groups */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {(item.options ?? []).map(opt => (
          <div key={opt.id}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-semibold">{opt.name}</span>
              {opt.nameEn && <span className="text-xs text-muted-foreground">{opt.nameEn}</span>}
              {opt.required && (
                <Badge variant="destructive" className="text-[10px] px-1 py-0">
                  {t.menuManage.required}
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {opt.choices.map(choice => {
                const isSelected = selected[opt.id]?.choiceId === choice.id
                return (
                  <button
                    key={choice.id}
                    onClick={() => selectChoice(opt, choice)}
                    className={`px-3 py-2 min-h-[36px] rounded-lg border text-sm transition-colors ${
                      isSelected
                        ? 'border-primary bg-primary/10 text-primary font-medium'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {choice.name}
                    {choice.priceAdjust > 0 && (
                      <span className="text-xs text-muted-foreground ml-1">
                        +{formatPriceUSD(choice.priceAdjust)}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer: qty + confirm */}
      <div className="border-t p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={qty <= 1}
            onClick={() => setQty(q => q - 1)}>
            <Minus className="size-3" />
          </Button>
          <span className="w-6 text-center text-sm font-semibold">{qty}</span>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setQty(q => q + 1)}>
            <Plus className="size-3" />
          </Button>
        </div>
        <Button
          disabled={!allRequiredSelected}
          onClick={() => onConfirm(item, qty, Object.values(selected))}
          className="px-5"
        >
          {t.common.add} {formatPriceUSD(unitTotal)}
        </Button>
      </div>
    </div>
  )
}

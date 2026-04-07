import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { formatPriceUSD } from '@/lib/format'
import { cn } from '@/lib/utils'

export type TipSelection =
  | { type: 'percent'; pct: number }
  | { type: 'custom'; amount: number }

const TIP_PRESETS = [15, 18, 20]

export default function TipSelector({ baseAmount, selected, onSelect, loadingTip }: {
  baseAmount: number
  selected: TipSelection | null
  onSelect: (tip: TipSelection | null) => void
  loadingTip: boolean
}) {
  const { t } = useTranslation('customer')
  const [customOpen, setCustomOpen] = useState(false)
  const [customVal, setCustomVal] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  // Stable ref to avoid useEffect re-triggering when onSelect changes
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect

  const isPreset = (pct: number) =>
    selected?.type === 'percent' && selected.pct === pct

  const applyCustom = (val: string) => {
    const dollars = parseFloat(val)
    if (!isNaN(dollars) && dollars > 0) {
      onSelectRef.current({ type: 'custom', amount: Math.round(dollars * 100) })
    } else if (val === '' || val === '0') {
      onSelectRef.current(null)
    }
  }

  // Debounced auto-apply: 1 second after last keystroke
  useEffect(() => {
    if (!customOpen) return
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      applyCustom(customVal)
    }, 1000)
    return () => clearTimeout(debounceRef.current)
  }, [customVal, customOpen])

  return (
    <div className="bg-card rounded-2xl p-4 shadow-sm mb-4 relative">
      <p className="text-sm font-semibold mb-3">{t('checkout.tip')}</p>
      {loadingTip && <Loader2 className="h-4 w-4 animate-spin absolute right-4 top-4" />}
      <div className="grid grid-cols-4 gap-2">
        {TIP_PRESETS.map(pct => (
          <button key={pct} onClick={() => { setCustomOpen(false); setCustomVal(''); onSelect({ type: 'percent', pct }) }}
            className={cn(
              'rounded-xl py-2.5 min-h-[48px] text-center transition-colors',
              isPreset(pct)
                ? 'bg-primary text-white font-medium'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}>
            <span className="text-sm font-semibold">{pct}%</span>
            <span className="block text-[10px] mt-0.5 opacity-70">
              {formatPriceUSD(Math.round(baseAmount * pct / 100))}
            </span>
          </button>
        ))}
        <button onClick={() => setCustomOpen(prev => !prev)}
          className={cn(
            'rounded-xl py-2.5 min-h-[48px] text-center transition-colors text-sm',
            selected?.type === 'custom'
              ? 'bg-primary text-white font-medium'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          )}>
          {selected?.type === 'custom'
            ? formatPriceUSD(selected.amount)
            : t('checkout.tipCustom')}
        </button>
      </div>

      {customOpen && (
        <div className="flex items-center gap-2 mt-3">
          <span className="text-sm font-medium text-muted-foreground">$</span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={customVal}
            onChange={e => setCustomVal(e.target.value)}
            onBlur={() => applyCustom(customVal)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); applyCustom(customVal); (e.target as HTMLInputElement).blur() } }}
            placeholder="0.00"
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            autoFocus
          />
        </div>
      )}
    </div>
  )
}

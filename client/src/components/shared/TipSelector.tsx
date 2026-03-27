import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { formatPriceUSD } from '@/lib/format'
import { cn } from '@/lib/utils'

const TIP_PRESETS = [15, 18, 20]

export default function TipSelector({ baseAmount, tipPct, onSelect, loadingTip }: {
  baseAmount: number
  tipPct: number | null
  onSelect: (pct: number | null) => void
  loadingTip: boolean
}) {
  const { t } = useTranslation('customer')
  return (
    <div className="bg-card rounded-2xl p-4 shadow-sm mb-4 relative">
      <p className="text-sm font-semibold mb-3">{t('checkout.tip')}</p>
      {loadingTip && <Loader2 className="h-4 w-4 animate-spin absolute right-4 top-4" />}
      <div className="grid grid-cols-4 gap-2">
        {TIP_PRESETS.map(pct => (
          <button key={pct} onClick={() => onSelect(pct)}
            className={cn(
              'rounded-xl py-2.5 text-center transition-colors',
              tipPct === pct
                ? 'bg-primary text-white font-medium'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}>
            <span className="text-sm font-semibold">{pct}%</span>
            <span className="block text-[10px] mt-0.5 opacity-70">
              {formatPriceUSD(Math.round(baseAmount * pct / 100))}
            </span>
          </button>
        ))}
        <button onClick={() => onSelect(null)}
          className={cn(
            'rounded-xl py-2.5 text-center transition-colors text-sm',
            tipPct === null
              ? 'bg-primary text-white font-medium'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          )}>
          {t('checkout.tipCustom')}
        </button>
      </div>
    </div>
  )
}

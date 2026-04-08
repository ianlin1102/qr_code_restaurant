import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Delete } from 'lucide-react'
import { formatPriceUSD } from '@/lib/format'

interface Props {
  totalDue: number       // cents
  onConfirm: (receivedAmount: number) => void
  onCancel: () => void
  loading?: boolean
  lang: string
}

export default function CashPaymentPad({ totalDue, onConfirm, onCancel, loading, lang }: Props) {
  const [input, setInput] = useState('')
  const zh = lang === 'zh'

  const parsed = parseFloat(input || '0')
  const receivedCents = Number.isFinite(parsed) ? Math.round(parsed * 100) : 0
  const change = receivedCents - totalDue
  const canConfirm = receivedCents >= totalDue && !loading

  const press = (key: string) => {
    if (key === 'back') return setInput(prev => prev.slice(0, -1))
    if (key === '.' && input.includes('.')) return
    // limit to 2 decimal places
    const dotIdx = input.indexOf('.')
    if (dotIdx >= 0 && input.length - dotIdx > 2 && key !== '.') return
    setInput(prev => prev + key)
  }

  const setExact = (cents: number) => setInput((cents / 100).toFixed(2))

  // Quick amount buttons: exact, round up to next $1, next $5
  const exactDollars = totalDue / 100
  const roundUp1 = Math.ceil(exactDollars)
  const roundUp5 = Math.ceil(exactDollars / 5) * 5
  const quickAmounts = [
    { label: formatPriceUSD(totalDue), cents: totalDue },
    ...(roundUp1 * 100 > totalDue ? [{ label: `$${roundUp1}.00`, cents: roundUp1 * 100 }] : []),
    ...(roundUp5 * 100 > roundUp1 * 100 ? [{ label: `$${roundUp5}.00`, cents: roundUp5 * 100 }] : []),
  ]

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'back']

  return (
    <div className="space-y-3">
      <div className="text-sm text-muted-foreground">
        {zh ? '应收' : 'Due'}: {formatPriceUSD(totalDue)}
      </div>
      <div className="text-3xl font-bold text-center py-3 bg-muted rounded-lg">
        ${input || '0.00'}
      </div>
      <div className="text-center text-sm font-medium">
        {receivedCents >= totalDue
          ? <span className="text-green-600">{zh ? '找零' : 'Change'}: {formatPriceUSD(change)}</span>
          : input ? <span className="text-red-500">{zh ? '金额不足' : 'Insufficient'}</span> : null}
      </div>

      <div className="flex gap-2">
        {quickAmounts.map(q => (
          <Button key={q.cents} variant="secondary" className="flex-1 min-h-[44px] text-sm"
            onClick={() => setExact(q.cents)}>{q.label}</Button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {keys.map(k => (
          <Button key={k} variant="outline" className="min-h-[56px] text-lg font-medium"
            onClick={() => press(k)}>
            {k === 'back' ? <Delete className="size-5" /> : k}
          </Button>
        ))}
      </div>

      <div className="flex gap-2 pt-1">
        <Button variant="ghost" className="flex-1 min-h-[44px]" onClick={onCancel} disabled={loading}>
          {zh ? '返回' : 'Back'}
        </Button>
        <Button className="flex-1 min-h-[44px]" disabled={!canConfirm} onClick={() => onConfirm(receivedCents)}>
          {loading && <Loader2 className="size-4 mr-2 animate-spin" />}
          {zh ? '确认收款' : 'Confirm'}
        </Button>
      </div>
    </div>
  )
}

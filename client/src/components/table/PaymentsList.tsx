import { useState } from 'react'
import { Pencil, Check, X } from 'lucide-react'
import type { Payment } from '@qr-order/shared'
import { api } from '@/services/api'
import { formatPriceUSD } from '@/lib/format'
import { notify } from '@/lib/notify'
import { Button } from '@/components/ui/button'
import { sanitizeDollarInput, dollarStringToCents, centsToDollarString } from '@/lib/money-input'

interface Props {
  storeId: string
  payments: Payment[]
  lang: string
  onUpdated: () => void
}

export default function PaymentsList({ storeId, payments, lang, onUpdated }: Props) {
  const zh = lang === 'zh'
  const [editingId, setEditingId] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [saving, setSaving] = useState(false)

  const startEdit = (p: Payment) => {
    setEditingId(p.id)
    setInputValue(centsToDollarString(p.tipAmount ?? 0))
  }
  const cancelEdit = () => {
    setEditingId(null)
    setInputValue('')
  }
  const saveTip = async (paymentId: string) => {
    const cents = dollarStringToCents(inputValue)
    if (cents === null) {
      notify.error(zh ? '请输入合法金额' : 'Enter a valid amount')
      return
    }
    setSaving(true)
    try {
      await api.adjustPaymentTip(storeId, paymentId, cents)
      notify.success(zh ? '小费已更新' : 'Tip updated')
      cancelEdit()
      onUpdated()
    } catch (err) {
      notify.fromError(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="border-t px-4 py-3 space-y-2">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {zh ? '支付记录' : 'Payments'}
      </div>
      <ul className="space-y-1.5">
        {payments.map(p => {
          const method = p.method === 'cash' ? (zh ? '现金' : 'Cash') : 'Stripe'
          const food = p.amount - (p.tipAmount ?? 0)
          const isEditing = editingId === p.id
          return (
            <li key={p.id} className="flex items-center gap-2 text-xs py-1">
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm bg-muted text-muted-foreground font-medium shrink-0">
                {method}
              </span>
              <span className="shrink-0">{formatPriceUSD(food)}</span>
              <span className="text-muted-foreground">+</span>
              {isEditing ? (
                <>
                  <span className="text-muted-foreground">$</span>
                  <input
                    inputMode="decimal"
                    autoFocus
                    value={inputValue}
                    onChange={e => setInputValue(sanitizeDollarInput(e.target.value))}
                    onKeyDown={e => {
                      if (e.key === 'Enter') saveTip(p.id)
                      if (e.key === 'Escape') cancelEdit()
                    }}
                    className="w-20 rounded border px-2 py-0.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <Button size="icon" variant="ghost" className="h-6 w-6" disabled={saving} onClick={() => saveTip(p.id)} aria-label="Save">
                    <Check className="size-3.5 text-green-600" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-6 w-6" disabled={saving} onClick={cancelEdit} aria-label="Cancel">
                    <X className="size-3.5 text-muted-foreground" />
                  </Button>
                </>
              ) : (
                <>
                  <span className="text-muted-foreground">
                    {zh ? '小费' : 'tip'} {formatPriceUSD(p.tipAmount ?? 0)}
                  </span>
                  {p.method === 'cash' && (
                    <Button size="icon" variant="ghost" className="h-6 w-6 ml-auto" onClick={() => startEdit(p)} aria-label="Edit tip">
                      <Pencil className="size-3 text-muted-foreground" />
                    </Button>
                  )}
                </>
              )}
            </li>
          )
        })}
      </ul>
      <p className="text-[10px] text-muted-foreground italic">
        {zh ? '仅现金小费可编辑；Stripe 支付的小费调整暂未上线。' : 'Only cash payment tips are editable. Stripe tip adjustment coming soon.'}
      </p>
    </div>
  )
}

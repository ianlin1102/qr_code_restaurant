import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Minus, Plus } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { api, type SessionSummary } from '@/services/api'
import { formatPriceUSD } from '@/lib/format'
import { calcSplitByPercent } from '@qr-order/shared/pricing'
import { localized } from '@/lib/i18n-utils'

interface Props {
  open: boolean
  onClose: () => void
  storeId: string
  session: SessionSummary
}

type Tab = 'items' | 'percent'

/** Server key format: "orderId:itemIndex:qtyToPay" — server parses qty */
function buildItemKeys(selectedQty: Record<string, number>): string[] {
  return Object.entries(selectedQty)
    .filter(([, qty]) => qty > 0)
    .map(([key, qty]) => `${key}:${qty}`)
}

export default function SettlementSheet({ open, onClose, storeId, session }: Props) {
  const navigate = useNavigate()
  const { i18n } = useTranslation('customer')
  const lang = i18n.language
  const t = (zh: string, en: string) => lang === 'zh' ? zh : en

  const lockedPercent = session.settlementMode === 'by-percent'
  const [tab, setTab] = useState<Tab>(lockedPercent ? 'percent' : 'items')
  // Map of "orderId:idx" → quantity to pay (0 = not selected)
  const [selectedQty, setSelectedQty] = useState<Record<string, number>>({})
  const [percent, setPercent] = useState(50)
  const [loading, setLoading] = useState(false)

  // Flatten all order items with keys
  const allItems = useMemo(() => {
    const result: { key: string; name: string; unitPrice: number; totalQty: number; paidQty: number; opts: { label: string; adjust: number }[] }[] = []
    for (const order of session.orders) {
      order.items.forEach((item, idx) => {
        const key = `${order.id}:${idx}`
        const optAdjust = (item.selectedOptions ?? []).reduce((s, o) => s + o.priceAdjust, 0)
        // Parse paid quantity from paidItemIds (format: "orderId:idx" or "orderId:idx:qty")
        let paidQty = 0
        for (const pid of session.paidItemIds ?? []) {
          if (pid === key) { paidQty = item.quantity; break }
          if (pid.startsWith(key + ':')) { paidQty += parseInt(pid.split(':')[2], 10) || 0 }
        }
        result.push({
          key,
          name: localized(item, lang),
          unitPrice: item.price + optAdjust,
          totalQty: item.quantity,
          paidQty: Math.min(paidQty, item.quantity),
          opts: (item.selectedOptions ?? []).map(o => ({
            label: `${o.optionName || o.optionNameEn || ''}: ${o.choiceName || o.choiceNameEn || ''}`,
            adjust: o.priceAdjust,
          })).filter(o => o.label.replace(':', '').trim()),
        })
      })
    }
    return result
  }, [session.orders, session.paidItemIds, lang])

  // Fetch server calculation (debounced)
  const [calc, setCalc] = useState({ subtotal: 0, tax: 0, svc: 0, total: 0 })
  const [calcError, setCalcError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => {
    clearTimeout(debounceRef.current)
    const keys = buildItemKeys(selectedQty)
    if (tab === 'items' && keys.length === 0) {
      setCalc({ subtotal: 0, tax: 0, svc: 0, total: 0 })
      setCalcError(null)
      return
    }
    debounceRef.current = setTimeout(() => {
      const req = tab === 'items'
        ? api.payByItems(storeId, session.id, keys)
        : api.payByPercent(storeId, session.id, percent)
      req.then(r => {
        setCalc({ subtotal: r.amount - r.tax - r.serviceFee, tax: r.tax, svc: r.serviceFee, total: r.amount })
        setCalcError(null)
      }).catch((err) => {
        setCalc({ subtotal: 0, tax: 0, svc: 0, total: 0 })
        setCalcError(err instanceof Error ? err.message : t('金额不满足最低要求', 'Amount does not meet minimum requirement'))
      })
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [tab, selectedQty, percent, storeId, session.id])

  const adjustQty = (key: string, delta: number, max: number) => {
    setSelectedQty(prev => {
      const cur = prev[key] ?? 0
      const next = Math.max(0, Math.min(max, cur + delta))
      return { ...prev, [key]: next }
    })
  }

  const handlePay = async () => {
    if (calc.total <= 0) return
    setLoading(true)
    try {
      const settlement = tab === 'items'
        ? { type: 'by-item' as const, itemKeys: buildItemKeys(selectedQty) }
        : { type: 'by-percent' as const, percent }
      const { clientSecret, amount } = await api.createCheckoutForSession(storeId, session.id, calc.total, settlement)
      navigate(`/store/${storeId}/checkout`, {
        state: { clientSecret, amount, tableId: session.tableId, sessionId: session.id, settlement },
      })
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Payment failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose() }}>
      <SheetContent side="bottom" className="max-h-[85vh] flex flex-col">
        <SheetHeader>
          <SheetTitle>{t('结账', 'Settle Bill')}</SheetTitle>
        </SheetHeader>

        {/* Tab bar */}
        <div className="flex gap-2 px-4">
          {(['items', 'percent'] as const).map(id => (
            <button
              key={id}
              disabled={id === 'items' && lockedPercent}
              onClick={() => setTab(id)}
              className={`flex-1 min-h-[44px] rounded-md text-sm font-medium transition-colors ${
                tab === id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              } ${id === 'items' && lockedPercent ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {id === 'items' ? t('按菜品', 'By Items') : t('按比例', 'By Percent')}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 pb-2">
          {tab === 'items' ? (
            <div className="space-y-1">
              {allItems.map(item => {
                const remaining = item.totalQty - item.paidQty
                const selected = selectedQty[item.key] ?? 0
                const allPaid = remaining <= 0
                return (
                  <div key={item.key}
                    className={`flex items-center gap-3 min-h-[48px] px-2 rounded-md ${allPaid ? 'opacity-40' : ''}`}
                  >
                    {/* Qty stepper */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => adjustQty(item.key, -1, remaining)} disabled={allPaid || selected <= 0}
                        className="w-8 h-8 rounded-full border flex items-center justify-center disabled:opacity-30">
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center text-sm font-medium">{selected}</span>
                      <button onClick={() => adjustQty(item.key, 1, remaining)} disabled={allPaid || selected >= remaining}
                        className="w-8 h-8 rounded-full border flex items-center justify-center disabled:opacity-30">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        {item.name} <span className="text-xs text-muted-foreground">x{item.totalQty}</span>
                        {item.paidQty > 0 && <span className="ml-1 text-xs text-green-600">{t('已付', 'Paid')} {item.paidQty}</span>}
                      </p>
                      {item.opts.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {item.opts.map((o, i) => (
                            <span key={i} className="text-xs text-orange-600">
                              {o.label}{o.adjust > 0 ? ` +${formatPriceUSD(o.adjust)}` : ''}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="text-sm font-medium shrink-0">{formatPriceUSD(item.unitPrice)}/{t('份', 'ea')}</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="py-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                {t('选择支付比例', 'Choose payment percentage')}
              </p>
              {/* Quick presets */}
              <div className="grid grid-cols-4 gap-2">
                {[25, 33, 50, 100].map(pct => (
                  <button key={pct} onClick={() => setPercent(pct)}
                    className={`min-h-[44px] rounded-xl text-center transition-colors ${
                      percent === pct
                        ? 'bg-primary text-white font-medium'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}>
                    <span className="text-sm font-semibold">{pct}%</span>
                    <span className="block text-[10px] mt-0.5 opacity-70">
                      {formatPriceUSD(calcSplitByPercent(session.remaining, pct).splitAmount)}
                    </span>
                  </button>
                ))}
              </div>
              {/* Fine-tune slider */}
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={1}
                  max={100}
                  value={percent}
                  onChange={e => setPercent(Number(e.target.value))}
                  className="flex-1 h-2 accent-primary"
                />
                <span className="text-lg font-bold w-16 text-right">{percent}%</span>
              </div>
              <p className="text-center text-sm text-muted-foreground">
                {formatPriceUSD(calcSplitByPercent(session.remaining, percent).splitAmount)} / {formatPriceUSD(session.remaining)}
              </p>
            </div>
          )}
        </div>

        {/* Summary + Pay */}
        <div className="border-t px-4 pt-3 pb-4 space-y-2">
          {calcError ? (
            <p className="text-sm text-destructive text-center py-2">{calcError}</p>
          ) : (
            <>
              {[
                { label: t('小计', 'Subtotal'), val: calc.subtotal, show: true, dim: false },
                { label: t('税', 'Tax'), val: calc.tax, show: calc.tax > 0, dim: true },
                { label: t('服务费', 'Service Fee'), val: calc.svc, show: calc.svc > 0, dim: true },
              ].filter(r => r.show).map(r => (
                <div key={r.label} className={`flex justify-between text-sm ${r.dim ? 'text-muted-foreground' : ''}`}>
                  <span>{r.label}</span><span>{formatPriceUSD(r.val)}</span>
                </div>
              ))}
              <div className="flex justify-between font-semibold text-base pt-1 border-t">
                <span>{t('合计', 'Total')}</span><span>{formatPriceUSD(calc.total)}</span>
              </div>
            </>
          )}
          <Button className="w-full min-h-[44px]" disabled={loading || calc.total <= 0 || !!calcError} onClick={handlePay}>
            {loading ? t('处理中...', 'Processing...') : t('去支付', 'Pay') + ` ${formatPriceUSD(calc.total)}`}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

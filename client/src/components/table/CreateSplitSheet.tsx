import { useState, useMemo, useEffect } from 'react'
import { Minus, Plus } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { api, type SessionSummary } from '@/services/api'
import { formatPriceUSD } from '@/lib/format'
import { itemUnitPrice } from '@/lib/pricing'
import { calcSplitByPercent } from '@qr-order/shared/pricing'
import { localized } from '@/lib/i18n-utils'
import { useT } from '@/i18n/useT'
import type { SplitBill } from '@qr-order/shared'

interface Props {
  open: boolean
  onClose: () => void
  storeId: string
  sessionId: string
  splits: SplitBill[]
  mainBillTotal: number
  onCreated: () => void
}

type Tab = 'items' | 'percent'

export default function CreateSplitSheet({ open, onClose, storeId, sessionId, splits, mainBillTotal, onCreated }: Props) {
  const { t, lang } = useT()
  const ts = t.splitBill
  const [tab, setTab] = useState<Tab>('items')
  const [session, setSession] = useState<SessionSummary | null>(null)
  const [selectedQty, setSelectedQty] = useState<Record<string, number>>({})
  const [percent, setPercent] = useState(50)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      api.getSessionSummary(storeId, sessionId).then(setSession).catch(console.error)
      setSelectedQty({})
      setPercent(50)
    }
  }, [open, storeId, sessionId])

  // Build assigned qty map from existing unpaid by-item splits
  const assignedQtyMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const sb of splits) {
      if (sb.type === 'by-item' && sb.status === 'unpaid' && sb.itemKeys) {
        for (const key of sb.itemKeys) {
          const parts = key.split(':')
          const baseKey = `${parts[0]}:${parts[1]}`
          const qty = parts.length >= 3 ? parseInt(parts[2], 10) : Infinity
          map.set(baseKey, (map.get(baseKey) ?? 0) + qty)
        }
      }
    }
    return map
  }, [splits])

  type FlatItem = { key: string; name: string; unitPrice: number; totalQty: number; unavailableQty: number }
  const allItems = useMemo<FlatItem[]>(() => {
    if (!session) return []
    const paidIds = session.paidItemIds ?? []
    return session.orders.flatMap(order =>
      order.items.map((item, idx) => {
        const key = `${order.id}:${idx}`
        let paidQty = 0
        for (const pid of paidIds) {
          if (pid === key) { paidQty = item.quantity; break }
          if (pid.startsWith(key + ':')) paidQty += parseInt(pid.split(':')[2], 10) || 0
        }
        const assignedQty = assignedQtyMap.get(key) ?? 0
        return { key, name: localized(item, lang), unitPrice: itemUnitPrice(item),
          totalQty: item.quantity, unavailableQty: Math.min(paidQty + assignedQty, item.quantity) }
      }),
    )
  }, [session, lang, assignedQtyMap])

  const localSubtotal = useMemo(() =>
    allItems.reduce((sum, item) => sum + item.unitPrice * (selectedQty[item.key] ?? 0), 0),
  [allItems, selectedQty])

  // Percent splits are based on the main bill total (total minus existing splits), not session.remaining
  const percentBase = mainBillTotal
  const percentAmount = session ? calcSplitByPercent(percentBase, percent).splitAmount : 0

  const adjustQty = (key: string, delta: number, max: number) => {
    setSelectedQty(prev => {
      const cur = prev[key] ?? 0
      const next = Math.max(0, Math.min(max, cur + delta))
      return { ...prev, [key]: next }
    })
  }

  const handleCreate = async () => {
    setLoading(true)
    try {
      if (tab === 'items') {
        const itemKeys = Object.entries(selectedQty)
          .filter(([, qty]) => qty > 0)
          .map(([key, qty]) => `${key}:${qty}`)
        if (itemKeys.length === 0) return
        await api.createSplitBill(storeId, sessionId, { type: 'by-item', itemKeys })
      } else {
        await api.createSplitBill(storeId, sessionId, { type: 'by-percent', percent })
      }
      onCreated()
    } catch (e) {
      console.error(e)
      alert(e instanceof Error ? e.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  const hasSelection = tab === 'items'
    ? Object.values(selectedQty).some(q => q > 0)
    : percent > 0

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose() }}>
      <SheetContent side="bottom" className="max-h-[85vh] flex flex-col">
        <SheetHeader>
          <SheetTitle>{ts.newSplit}</SheetTitle>
        </SheetHeader>

        {/* Tab bar */}
        <div className="flex gap-2 px-4">
          {(['items', 'percent'] as const).map(id => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex-1 min-h-[44px] rounded-md text-sm font-medium transition-colors ${
                tab === id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
              {id === 'items' ? ts.byItems : ts.byPercent}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 pb-2">
          {tab === 'items' ? (
            <div className="space-y-1">
              {allItems.map(item => {
                const available = item.totalQty - item.unavailableQty
                const selected = selectedQty[item.key] ?? 0
                const allTaken = available <= 0
                return (
                  <div key={item.key}
                    className={`flex items-center gap-3 min-h-[48px] px-2 rounded-md ${allTaken ? 'opacity-40' : ''}`}>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => adjustQty(item.key, -1, available)}
                        disabled={allTaken || selected <= 0}
                        className="w-8 h-8 rounded-full border flex items-center justify-center disabled:opacity-30">
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center text-sm font-medium">{selected}</span>
                      <button onClick={() => adjustQty(item.key, 1, available)}
                        disabled={allTaken || selected >= available}
                        className="w-8 h-8 rounded-full border flex items-center justify-center disabled:opacity-30">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">
                        {item.name} <span className="text-xs text-muted-foreground">x{item.totalQty}</span>
                        {item.unavailableQty > 0 && <span className="ml-1 text-xs text-green-600">{ts.paid}/{ts.split} {item.unavailableQty}</span>}
                      </p>
                    </div>
                    <span className="text-sm font-medium shrink-0">{formatPriceUSD(item.unitPrice)}</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="py-4 space-y-4">
              <p className="text-sm text-muted-foreground">{ts.choosePercent}</p>
              <div className="grid grid-cols-4 gap-2">
                {[25, 33, 50, 100].map(pct => (
                  <button key={pct} onClick={() => setPercent(pct)}
                    className={`min-h-[44px] rounded-xl text-center transition-colors ${
                      percent === pct
                        ? 'bg-primary text-white font-medium'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}>
                    <span className="text-sm font-semibold">{pct}%</span>
                    {session && (
                      <span className="block text-[10px] mt-0.5 opacity-70">
                        {formatPriceUSD(calcSplitByPercent(percentBase, pct).splitAmount)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-4">
                <input type="range" min={1} max={100} value={percent}
                  onChange={e => setPercent(Number(e.target.value))}
                  className="flex-1 h-2 accent-primary" />
                <span className="text-lg font-bold w-16 text-right">{percent}%</span>
              </div>
              {session && (
                <p className="text-center text-sm text-muted-foreground">
                  {formatPriceUSD(percentAmount)} / {formatPriceUSD(percentBase)}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-4 pt-3 pb-4 space-y-2">
          <div className="flex justify-between text-sm font-medium">
            <span>{ts.subtotal}</span>
            <span>{formatPriceUSD(tab === 'items' ? localSubtotal : percentAmount)}</span>
          </div>
          <Button className="w-full min-h-[44px]" disabled={loading || !hasSelection} onClick={handleCreate}>
            {loading ? ts.processing : ts.createSplit}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

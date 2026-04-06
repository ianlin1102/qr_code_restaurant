import { useState } from 'react'
import { useT } from '@/i18n/useT'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { formatPriceUSD } from '@/lib/format'
import { api } from '@/services/api'
import type { Order, SplitBillSession, SplitBillShare } from '@qr-order/shared'

interface Props { open: boolean; onClose: () => void; order: Order; storeId: string }
type Mode = 'equal' | 'by-item'

type Translations = typeof import('@/i18n/admin').adminT.zh

function itemLineTotal(item: Order['items'][number]) {
  const optAdj = (item.selectedOptions ?? []).reduce((s, o) => s + o.priceAdjust, 0)
  return (item.price + optAdj) * item.quantity
}

export default function SplitBillDialog({ open, onClose, order, storeId }: Props) {
  const { t } = useT()
  const [mode, setMode] = useState<Mode>('equal')
  const [people, setPeople] = useState(2)
  const [assignments, setAssignments] = useState<Record<number, number>>({})
  const [personCount, setPersonCount] = useState(2)
  const [session, setSession] = useState<SplitBillSession | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleModeChange = (m: Mode) => {
    setMode(m); setSession(null); setError(''); setAssignments({})
  }

  const buildByItemShares = (): SplitBillShare[] => {
    const map = new Map<number, SplitBillShare>()
    for (let i = 0; i < personCount; i++) {
      map.set(i, { personName: `${t.splitBill.person.replace('{{n}}', String(i + 1))}`, items: [], amount: 0 })
    }
    order.items.forEach((item, idx) => {
      const share = map.get(assignments[idx] ?? 0)!
      const lt = itemLineTotal(item)
      share.items.push({ menuItemId: item.menuItemId, name: item.name, quantity: item.quantity, amount: lt })
      share.amount += lt
    })
    return [...map.values()].filter(s => s.items.length > 0)
  }

  const handleGenerate = async () => {
    setLoading(true); setError('')
    try {
      const payload = mode === 'equal'
        ? { orderId: order.id, mode: 'equal' as const, numberOfPeople: people }
        : { orderId: order.id, mode: 'by-item' as const, shares: buildByItemShares() }
      setSession(await api.createSplitBill(storeId, payload))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to split bill')
    } finally { setLoading(false) }
  }

  const allAssigned = mode !== 'by-item' || order.items.every((_, i) => assignments[i] !== undefined)

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-md sm:max-w-lg w-[calc(100vw-2rem)] md:w-auto max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t.splitBill.title}</DialogTitle>
          <DialogDescription>
            {t.splitBill.desc}
          </DialogDescription>
        </DialogHeader>

        {!session && (
          <div className="flex gap-2">
            {(['equal', 'by-item'] as Mode[]).map(m => (
              <Button key={m} size="sm" variant={mode === m ? 'default' : 'outline'}
                onClick={() => handleModeChange(m)}>
                {m === 'equal' ? t.splitBill.equalMode : t.splitBill.byItemMode}
              </Button>
            ))}
          </div>
        )}

        {!session && mode === 'equal' && (
          <EqualMode people={people} setPeople={setPeople} total={order.totalPrice} t={t} />
        )}
        {!session && mode === 'by-item' && (
          <ByItemMode order={order} count={personCount} setCount={setPersonCount}
            assignments={assignments} setAssignments={setAssignments} t={t} />
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        {!session && (
          <Button onClick={handleGenerate} disabled={loading || !allAssigned}>
            {loading ? t.splitBill.generating : t.splitBill.generate}
          </Button>
        )}
        {session && <SessionResult session={session} t={t} />}
      </DialogContent>
    </Dialog>
  )
}

function PeopleInput({ value, onChange, t }: { value: number; onChange: (n: number) => void; t: Translations }) {
  return (
    <div className="flex items-center gap-3">
      <label className="text-sm font-medium">{t.splitBill.numberOfPeople}</label>
      <Input type="number" min={2} max={20} value={value}
        onChange={e => onChange(Math.max(2, Number(e.target.value)))} className="w-20" />
    </div>
  )
}

function EqualMode({ people, setPeople, total, t }: {
  people: number; setPeople: (n: number) => void; total: number; t: Translations
}) {
  return (
    <div className="space-y-3">
      <PeopleInput value={people} onChange={setPeople} t={t} />
      <p className="text-sm text-muted-foreground">
        {t.splitBill.total}: {formatPriceUSD(total)} — ~{formatPriceUSD(Math.floor(total / people))} {t.splitBill.perPerson}
      </p>
    </div>
  )
}

function ByItemMode({ order, count, setCount, assignments, setAssignments, t }: {
  order: Order; count: number; setCount: (n: number) => void
  assignments: Record<number, number>; setAssignments: (a: Record<number, number>) => void; t: Translations
}) {
  const opts = Array.from({ length: count }, (_, i) => i)
  return (
    <div className="space-y-3">
      <PeopleInput value={count} onChange={setCount} t={t} />
      <div className="space-y-2">
        {order.items.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex-1 truncate">
              {item.name} x{item.quantity} ({formatPriceUSD(itemLineTotal(item))})
            </span>
            <select className="border rounded px-2 py-1 text-xs"
              value={assignments[idx] ?? ''} onChange={e => setAssignments({ ...assignments, [idx]: Number(e.target.value) })}>
              <option value="" disabled>{t.splitBill.assign}</option>
              {opts.map(p => <option key={p} value={p}>{t.splitBill.person.replace('{{n}}', String(p + 1))}</option>)}
            </select>
          </div>
        ))}
      </div>
    </div>
  )
}

function SessionResult({ session, t }: { session: SplitBillSession; t: Translations }) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">
        {t.splitBill.total}: {formatPriceUSD(session.totalAmount)}
      </p>
      {session.shares.map((share, i) => (
        <div key={i} className="flex items-center justify-between rounded border p-3">
          <div>
            <p className="font-medium text-sm">{share.personName}</p>
            <p className="text-xs text-muted-foreground">{formatPriceUSD(share.amount)}</p>
          </div>
          <Badge variant={share.paid ? 'default' : 'outline'}>
            {share.paid ? t.splitBill.paid : t.splitBill.unpaid}
          </Badge>
        </div>
      ))}
    </div>
  )
}

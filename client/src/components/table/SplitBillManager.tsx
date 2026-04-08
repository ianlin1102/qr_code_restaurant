import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { formatPriceUSD } from '@/lib/format'
import { api, type SessionSummary, type AllowedActions } from '@/services/api'
import type { SplitBill } from '@qr-order/shared'
import { useT } from '@/i18n/useT'
import CashPaymentPad from './CashPaymentPad'
import CreateSplitSheet from './CreateSplitSheet'
import { TipInput, MainBillCard, SplitCard } from './SplitBillCards'

interface Props {
  open: boolean
  onClose: () => void
  storeId: string
  sessionId: string
}

type PayTarget = { id: string; amount: number; method: 'card' | 'cash' }

function deriveAllowedActions(session: SessionSummary, splits: SplitBill[]): AllowedActions {
  const isClosed = session.status === 'closed'
  const isPaid = session.remaining <= 0
  const hasUnpaidSplits = splits.some(s => s.status === 'unpaid')
  const hasPercentSplits = splits.some(s => s.type === 'by-percent')
  // effectiveMode: percent splits always enforce by-percent; otherwise trust session.settlementMode
  const effectiveMode = hasPercentSplits ? 'by-percent' : session.settlementMode
  return {
    payByItems: !isClosed && !isPaid && effectiveMode !== 'by-percent',
    payByPercent: !isClosed && !isPaid,
    cashPayment: !isClosed && !isPaid,
    createSplitByItem: !isClosed && !isPaid && effectiveMode !== 'by-percent',
    createSplitByPercent: !isClosed && !isPaid,
    paySplit: !isClosed && hasUnpaidSplits,
    deleteSplit: !isClosed && hasUnpaidSplits,
    closeSession: !isClosed && isPaid,
    reopenSession: isClosed,
  }
}

export default function SplitBillManager({ open, onClose, storeId, sessionId }: Props) {
  const { t, lang } = useT()
  const ts = t.splitBill
  const [session, setSession] = useState<SessionSummary | null>(null)
  const [splits, setSplits] = useState<SplitBill[]>([])
  const [mainBill, setMainBill] = useState<{ total: number; itemCount: number } | null>(null)
  const [payTarget, setPayTarget] = useState<PayTarget | null>(null)
  const [tipInput, setTipInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [allowed, setAllowed] = useState<AllowedActions | null>(null)

  const refresh = useCallback(async () => {
    try {
      const [summary, data] = await Promise.all([
        api.getSessionSummary(storeId, sessionId),
        api.getSplitBills(storeId, sessionId),
      ])
      setSession(summary)
      const freshSplits = data.splits ?? []
      setSplits(freshSplits)
      setMainBill(data.mainBill ?? { total: 0, itemCount: 0 })
      setAllowed(deriveAllowedActions(summary, freshSplits))
    } catch (e) { console.error(e) }
  }, [storeId, sessionId])

  // Initial fetch + poll every 5s while open (detects customer payments / external changes)
  useEffect(() => {
    if (!open) return
    refresh()
    const id = setInterval(refresh, 5000)
    return () => clearInterval(id)
  }, [open, refresh])

  const tipCents = Math.round((parseFloat(tipInput) || 0) * 100)
  const resetPay = () => { setPayTarget(null); setTipInput('') }

  const handlePayCard = async (splitId: string) => {
    setLoading(true)
    try {
      if (splitId === 'main') {
        const amount = (session?.remaining ?? 0) + tipCents
        const result = await api.addPayment(storeId, sessionId, amount, 'waiter')
        if (result.allowedActions) setAllowed(result.allowedActions)
      } else {
        const result = await api.paySplitBillCard(storeId, sessionId, splitId, tipCents || undefined)
        if ('allowedActions' in result) setAllowed(result.allowedActions)
      }
      resetPay()
      await refresh()
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const handlePayCash = async (splitId: string, received: number) => {
    setLoading(true)
    try {
      if (splitId === 'main') {
        const amount = (session?.remaining ?? 0) + tipCents
        const result = await api.recordCashPayment(storeId, sessionId, amount, received)
        if (result.allowedActions) setAllowed(result.allowedActions)
      } else {
        const result = await api.paySplitBillCash(storeId, sessionId, splitId, received, tipCents || undefined)
        if (result.allowedActions) setAllowed(result.allowedActions)
      }
      resetPay()
      await refresh()
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const handleMerge = async (splitId: string) => {
    if (!allowed?.deleteSplit) return
    if (!confirm(ts.mergeConfirm)) return
    try {
      const result = await api.deleteSplitBill(storeId, sessionId, splitId)
      if (result.allowedActions) setAllowed(result.allowedActions)
      await refresh()
    } catch (e) { console.error(e) }
  }

  const handleCloseSession = async () => {
    setLoading(true)
    try {
      const result = await api.closeSession(storeId, sessionId)
      if (result.allowedActions) setAllowed(result.allowedActions)
      onClose()
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  if (!session) return null
  const mb = mainBill ?? { total: 0, itemCount: 0 }

  if (payTarget?.method === 'cash') {
    return (
      <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
        <DialogContent className="max-w-md w-[calc(100vw-2rem)] max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{ts.payCash}</DialogTitle></DialogHeader>
          <TipInput value={tipInput} onChange={setTipInput} label={ts.tipOptional} />
          <CashPaymentPad totalDue={payTarget.amount + tipCents} lang={lang}
            loading={loading} onCancel={resetPay}
            onConfirm={received => handlePayCash(payTarget.id, received)} />
        </DialogContent>
      </Dialog>
    )
  }

  if (payTarget?.method === 'card') {
    return (
      <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
        <DialogContent className="max-w-md w-[calc(100vw-2rem)]">
          <DialogHeader><DialogTitle>{ts.payCard}</DialogTitle></DialogHeader>
          <TipInput value={tipInput} onChange={setTipInput} label={ts.tipOptional} />
          <p className="text-center text-lg font-bold">{formatPriceUSD(payTarget.amount + tipCents)}</p>
          <Button className="w-full min-h-[44px]" disabled={loading} onClick={() => handlePayCard(payTarget.id)}>
            {loading && <Loader2 className="size-4 mr-2 animate-spin" />}{ts.confirmCharge}
          </Button>
          <button className="text-sm text-muted-foreground hover:underline text-center" onClick={resetPay}>
            {t.common.cancel}
          </button>
        </DialogContent>
      </Dialog>
    )
  }

  const setPay = (id: string, amount: number, method: 'card' | 'cash') =>
    setPayTarget({ id, amount, method })

  return (
    <>
      <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
        <DialogContent className="max-w-md w-[calc(100vw-2rem)] max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{ts.title}</DialogTitle></DialogHeader>

          <MainBillCard label={ts.mainBill} badge={`${mb.itemCount} ${ts.items}`}
            total={mb.total} ts={ts} allowed={allowed}
            onPayCard={() => setPay('main', mb.total, 'card')}
            onPayCash={() => setPay('main', mb.total, 'cash')}
            onSplit={() => setSheetOpen(true)} />

          {splits.map(s => (
            <SplitCard key={s.id} split={s} ts={ts} allowed={allowed}
              onPayCard={() => setPay(s.id, s.total, 'card')}
              onPayCash={() => setPay(s.id, s.total, 'cash')}
              onMerge={() => handleMerge(s.id)} />
          ))}

          <div className="border-t pt-3 space-y-1 text-sm">
            <div className="flex justify-between"><span>{ts.sessionTotal}</span><span>{formatPriceUSD(session.totalWithTax)}</span></div>
            <div className="flex justify-between text-blue-600"><span>{ts.sessionPaid}</span><span>{formatPriceUSD(session.totalPaid)}</span></div>
            <div className="flex justify-between font-semibold text-orange-600"><span>{ts.sessionRemaining}</span><span>{formatPriceUSD(session.remaining)}</span></div>
          </div>

          {allowed?.closeSession && (
            <Button className="w-full min-h-[44px]" onClick={handleCloseSession} disabled={loading}>
              {loading && <Loader2 className="size-4 mr-2 animate-spin" />}{ts.closeSession}
            </Button>
          )}
        </DialogContent>
      </Dialog>

      <CreateSplitSheet open={sheetOpen} onClose={() => setSheetOpen(false)}
        storeId={storeId} sessionId={sessionId}
        splits={splits} mainBillTotal={mb.total} allowed={allowed}
        onCreated={() => { setSheetOpen(false); refresh() }} />
    </>
  )
}

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { formatPriceUSD } from '@/lib/format'
import { api } from '@/services/api'
import { useT } from '@/i18n/useT'
import { notify } from '@/lib/notify'
import { useSettlementPoll } from '@/hooks/useSettlementPoll'
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

export default function SplitBillManager({ open, onClose, storeId, sessionId }: Props) {
  const { t, lang } = useT()
  const ts = t.splitBill
  const [payTarget, setPayTarget] = useState<PayTarget | null>(null)
  const [tipInput, setTipInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)

  const { session, splits, mainBill, allowed, setAllowed, refresh } = useSettlementPoll({
    storeId, sessionId, active: open, withSplits: true,
  })

  const tipCents = Math.round((parseFloat(tipInput) || 0) * 100)
  const resetPay = () => { setPayTarget(null); setTipInput('') }

  const handlePayCard = async (splitId: string) => {
    setLoading(true)
    try {
      if (splitId === 'main') {
        // Main bill pays payTarget.amount (which is set to the displayed value)
        const result = await api.addPayment(storeId, sessionId, payTarget!.amount + tipCents, 'waiter')
        if (result.allowedActions) setAllowed(result.allowedActions)
      } else {
        const result = await api.paySplitBillCard(storeId, sessionId, splitId, tipCents || undefined)
        if ('allowedActions' in result) setAllowed(result.allowedActions)
      }
      resetPay()
      await refresh()
    } catch (e) { notify.fromError(e) }
    setLoading(false)
  }

  const handlePayCash = async (splitId: string, received: number, changeTip?: number) => {
    const effectiveTip = changeTip ?? tipCents
    setLoading(true)
    try {
      if (splitId === 'main') {
        const result = await api.recordCashPayment(storeId, sessionId, payTarget!.amount, received, effectiveTip || undefined)
        if (result.allowedActions) setAllowed(result.allowedActions)
      } else {
        const result = await api.paySplitBillCash(storeId, sessionId, splitId, received, tipCents || undefined)
        if (result.allowedActions) setAllowed(result.allowedActions)
      }
      resetPay()
      await refresh()
    } catch (e) { notify.fromError(e) }
    setLoading(false)
  }

  const handleMerge = async (splitId: string) => {
    if (!allowed?.deleteSplit) return
    if (!confirm(ts.mergeConfirm)) return
    try {
      const result = await api.deleteSplitBill(storeId, sessionId, splitId)
      if (result.allowedActions) setAllowed(result.allowedActions)
      await refresh()
    } catch (e) { notify.fromError(e) }
  }

  const handleCloseSession = async () => {
    setLoading(true)
    try {
      const result = await api.closeSession(storeId, sessionId)
      if (result.allowedActions) setAllowed(result.allowedActions)
      onClose()
    } catch (e) { notify.fromError(e) }
    setLoading(false)
  }

  if (!session) return null
  const mb = mainBill ?? { total: 0, itemCount: 0 }
  // Main bill payable = session remaining minus all unpaid split totals
  const unpaidSplitTotal = splits.filter(s => s.status === 'unpaid').reduce((sum, s) => sum + s.total, 0)
  const mainBillPayable = Math.max(0, session.remaining - unpaidSplitTotal)

  if (payTarget?.method === 'cash') {
    return (
      <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
        <DialogContent className="max-w-md w-[calc(100vw-2rem)] max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{ts.payCash}</DialogTitle></DialogHeader>
          <TipInput value={tipInput} onChange={setTipInput} label={ts.tipOptional} />
          <CashPaymentPad totalDue={payTarget.amount + tipCents} lang={lang}
            loading={loading} onCancel={resetPay}
            onConfirm={(received, changeTip) => handlePayCash(payTarget.id, received, changeTip)} />
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
            total={mainBillPayable} ts={ts} allowed={allowed}
            onPayCard={() => setPay('main', mainBillPayable, 'card')}
            onPayCash={() => setPay('main', mainBillPayable, 'cash')}
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
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 min-h-[44px]" onClick={onClose} disabled={loading}>
                {lang === 'zh' ? '继续用餐' : 'Continue Dining'}
              </Button>
              <Button variant="destructive" className="flex-1 min-h-[44px]" onClick={handleCloseSession} disabled={loading}>
                {loading && <Loader2 className="size-4 mr-2 animate-spin" />}{ts.closeSession}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <CreateSplitSheet open={sheetOpen} onClose={() => setSheetOpen(false)}
        storeId={storeId} sessionId={sessionId}
        splits={splits} mainBillTotal={mainBillPayable} allowed={allowed}
        onCreated={() => { setSheetOpen(false); refresh() }} />
    </>
  )
}

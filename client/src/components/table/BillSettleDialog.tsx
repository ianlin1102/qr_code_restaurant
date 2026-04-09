import { useState, useEffect } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { api } from '@/services/api'
import type { Coupon } from '@qr-order/shared'
import { notify } from '@/lib/notify'
import { useSettlementPoll } from '@/hooks/useSettlementPoll'
import {
  SessionSummaryView, CouponSection, PaymentList, PaymentMethodSection,
} from './BillSettleComponents'

interface Props {
  open: boolean
  onClose: () => void
  storeId: string
  sessionId: string
  t: Record<string, Record<string, unknown>>
  lang: string
}

export default function BillSettleDialog({ open, onClose, storeId, sessionId, t, lang }: Props) {
  const { session, allowed, setAllowed, refresh: fetchSession } = useSettlementPoll({
    storeId, sessionId, active: open,
  })
  const [couponCode, setCouponCode] = useState('')
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [payMethod, setPayMethod] = useState<'stripe' | 'cash' | null>(null)
  const [paying, setPaying] = useState(false)
  const [loading, setLoading] = useState(false)

  const ts = (t.session ?? t.bill ?? {}) as Record<string, string>
  const tc = (t.common ?? {}) as Record<string, string>

  useEffect(() => {
    if (!open) return
    api.getCoupons(storeId).then(setCoupons).catch(() => {})
  }, [open, storeId])

  if (!session) return null

  const handleApplyCoupon = async () => {
    const coupon = coupons.find(c => c.code === couponCode && c.active)
    if (!coupon) return
    try {
      await api.applySessionCoupon(
        storeId, sessionId, coupon.id, coupon.code, coupon.discountType, coupon.discountValue,
      )
      setCouponCode('')
      fetchSession()
    } catch (e) { notify.fromError(e) }
  }

  const handleRemoveCoupon = async () => {
    try {
      await api.removeSessionCoupon(storeId, sessionId)
      fetchSession()
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

  const handleReopenSession = async () => {
    try {
      const result = await api.reopenSession(storeId, sessionId)
      if (result.allowedActions) setAllowed(result.allowedActions)
      fetchSession()
    } catch (e) { notify.fromError(e) }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-md w-[calc(100vw-2rem)] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{ts.title || 'Session'}</DialogTitle>
        </DialogHeader>

        <SessionSummaryView session={session} ts={ts} tc={tc} lang={lang} />

        <CouponSection
          session={session} couponCode={couponCode} setCouponCode={setCouponCode}
          onApply={handleApplyCoupon} onRemove={handleRemoveCoupon} ts={ts} tc={tc}
        />

        {allowed?.cashPayment && (
          <PaymentMethodSection
            session={session} storeId={storeId} sessionId={sessionId}
            payMethod={payMethod} setPayMethod={setPayMethod}
            paying={paying} setPaying={setPaying}
            fetchSession={fetchSession} setAllowed={setAllowed}
            ts={ts} lang={lang}
          />
        )}

        {session.payments.length > 0 && (
          <PaymentList payments={session.payments} ts={ts} />
        )}

        {allowed?.closeSession && (
          <div className="space-y-2">
            <p className="text-center py-2 text-green-600 font-medium">
              {ts.allPaid || 'Fully Paid!'}
            </p>
            <Button className="w-full" variant="outline" onClick={handleCloseSession} disabled={loading}>
              {loading && <Loader2 className="size-4 mr-2 animate-spin" />}
              {ts.close || 'Close Session'}
            </Button>
          </div>
        )}

        {allowed?.reopenSession && (
          <div className="space-y-2">
            <p className="text-center py-2 text-green-600 font-medium">
              {ts.sessionClosed || 'Session Closed'}
            </p>
            <Button variant="outline" className="w-full" onClick={handleReopenSession}>
              {ts.reopen || 'Reopen Session'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

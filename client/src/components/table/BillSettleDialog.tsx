import { useState, useEffect, useCallback } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'
import { formatPriceUSD } from '@/lib/format'
import { api } from '@/services/api'
import type { Session, Payment, Coupon } from '@qr-order/shared'

interface Props {
  open: boolean
  onClose: () => void
  storeId: string
  sessionId: string
  t: Record<string, Record<string, unknown>>
}

type SessionSummary = Session & { payments: Payment[]; remaining: number; isPaid: boolean; netDue: number }

export default function BillSettleDialog({ open, onClose, storeId, sessionId, t }: Props) {
  const [session, setSession] = useState<SessionSummary | null>(null)
  const [couponCode, setCouponCode] = useState('')
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [payAmount, setPayAmount] = useState('')
  const [paidBy, setPaidBy] = useState('')
  const [loading, setLoading] = useState(false)

  const ts = (t.session ?? t.bill ?? {}) as Record<string, string>
  const tc = (t.common ?? {}) as Record<string, string>

  const fetchSession = useCallback(async () => {
    try {
      const data = await api.getSessionSummary(storeId, sessionId)
      setSession(data)
    } catch (e) { console.error(e) }
  }, [storeId, sessionId])

  useEffect(() => {
    if (open) {
      fetchSession()
      api.getCoupons(storeId).then(setCoupons).catch(() => {})
    }
  }, [open, fetchSession, storeId])

  if (!session) return null

  const handleApplyCoupon = async () => {
    const coupon = coupons.find(c => c.code === couponCode && c.active)
    if (!coupon) return
    try {
      const updated = await api.applySessionCoupon(
        storeId, sessionId, coupon.id, coupon.code, coupon.discountType, coupon.discountValue,
      )
      setSession(prev => prev ? { ...prev, ...updated, payments: prev.payments, remaining: prev.remaining, isPaid: prev.isPaid, netDue: prev.netDue } : null)
      setCouponCode('')
      fetchSession()
    } catch (e) { console.error(e) }
  }

  const handleRemoveCoupon = async () => {
    try {
      const updated = await api.removeSessionCoupon(storeId, sessionId)
      setSession(prev => prev ? { ...prev, ...updated, payments: prev.payments, remaining: prev.remaining, isPaid: prev.isPaid, netDue: prev.netDue } : null)
      fetchSession()
    } catch (e) { console.error(e) }
  }

  const handlePayFull = async () => {
    setLoading(true)
    try {
      await api.addPayment(storeId, sessionId, session.remaining, 'waiter')
      fetchSession()
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const handleAddPayment = async () => {
    const amount = Math.round(parseFloat(payAmount) * 100)
    if (!amount || amount <= 0) return
    try {
      await api.addPayment(storeId, sessionId, amount, paidBy || undefined)
      setPayAmount('')
      setPaidBy('')
      fetchSession()
    } catch (e) { console.error(e) }
  }

  const handleCloseSession = async () => {
    setLoading(true)
    try {
      await api.closeSession(storeId, sessionId)
      onClose()
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const handleReopenSession = async () => {
    try {
      await api.reopenSession(storeId, sessionId)
      fetchSession()
    } catch (e) { console.error(e) }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-md w-[calc(100vw-2rem)] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{ts.title || 'Session'}</DialogTitle>
        </DialogHeader>

        <SessionSummaryView session={session} ts={ts} />

        <CouponSection
          session={session} couponCode={couponCode} setCouponCode={setCouponCode}
          onApply={handleApplyCoupon} onRemove={handleRemoveCoupon} ts={ts} tc={tc}
        />

        {session.status !== 'closed' && session.remaining > 0 && (
          <div className="space-y-3">
            <Button className="w-full" onClick={handlePayFull} disabled={loading}>
              {loading && <Loader2 className="size-4 mr-2 animate-spin" />}
              {ts.payFull || 'Pay in Full'} ({formatPriceUSD(session.remaining)})
            </Button>
            <div className="border-t pt-3">
              <p className="text-sm font-medium mb-2">{ts.addPayment || 'Add Payment'}</p>
              <div className="flex gap-2 mb-2">
                <Input
                  type="number" step="0.01" min="0"
                  value={payAmount}
                  onChange={e => setPayAmount(e.target.value)}
                  placeholder={ts.amount || 'Amount ($)'}
                  className="flex-1 h-10 text-sm"
                />
                <Input
                  value={paidBy}
                  onChange={e => setPaidBy(e.target.value)}
                  placeholder={ts.paidByLabel || 'Paid by (optional)'}
                  className="flex-1 h-10 text-sm"
                />
              </div>
              <Button variant="outline" className="w-full" onClick={handleAddPayment} disabled={!payAmount}>
                {ts.addPayment || 'Add Payment'}
              </Button>
            </div>
          </div>
        )}

        {session.payments.length > 0 && (
          <PaymentList payments={session.payments} ts={ts} />
        )}

        {session.isPaid && session.status !== 'closed' && (
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

        {session.status === 'closed' && (
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

function SessionSummaryView({ session, ts }: { session: SessionSummary; ts: Record<string, string> }) {
  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span>{ts.subtotal || 'Subtotal'}</span>
        <span>{formatPriceUSD(session.totalAmount)}</span>
      </div>
      {session.discountAmount > 0 && (
        <div className="flex justify-between text-green-600">
          <span>{ts.discount || 'Discount'} ({session.couponCode})</span>
          <span>-{formatPriceUSD(session.discountAmount)}</span>
        </div>
      )}
      <div className="flex justify-between font-semibold border-t pt-2">
        <span>{ts.totalDue || 'Total Due'}</span>
        <span>{formatPriceUSD(session.netDue)}</span>
      </div>
      {session.totalPaid > 0 && (
        <div className="flex justify-between text-blue-600">
          <span>{ts.paid || 'Paid'}</span>
          <span>{formatPriceUSD(session.totalPaid)}</span>
        </div>
      )}
      {session.remaining > 0 && (
        <div className="flex justify-between text-orange-600 font-medium">
          <span>{ts.remaining || 'Remaining'}</span>
          <span>{formatPriceUSD(session.remaining)}</span>
        </div>
      )}
    </div>
  )
}

function CouponSection({ session, couponCode, setCouponCode, onApply, onRemove, ts, tc }: {
  session: SessionSummary; couponCode: string; setCouponCode: (v: string) => void
  onApply: () => void; onRemove: () => void
  ts: Record<string, string>; tc: Record<string, string>
}) {
  if (session.status === 'closed') return null

  if (session.couponId) {
    return (
      <div className="flex items-center justify-between text-sm bg-green-50 rounded px-3 py-2">
        <span className="font-medium">{session.couponCode}</span>
        <button onClick={onRemove} className="text-red-500 text-xs hover:underline">
          {ts.removeCoupon || 'Remove'}
        </button>
      </div>
    )
  }

  return (
    <div className="flex gap-2">
      <Input
        value={couponCode}
        onChange={e => setCouponCode(e.target.value)}
        placeholder={ts.applyCoupon || 'Coupon code'}
        className="flex-1 h-8 text-sm"
      />
      <Button size="sm" onClick={onApply} disabled={!couponCode}>
        {tc.confirm || 'Apply'}
      </Button>
    </div>
  )
}

function PaymentList({ payments, ts }: {
  payments: Payment[]; ts: Record<string, string>
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground font-semibold">
        {ts.paymentHistory || 'Payments'} ({payments.length})
      </p>
      {payments.map(payment => (
        <div key={payment.id} className="flex items-center justify-between border rounded px-3 py-3">
          <div>
            <span className="text-sm font-medium">{formatPriceUSD(payment.amount)}</span>
            {payment.paidBy && (
              <span className="text-xs text-muted-foreground ml-2">({payment.paidBy})</span>
            )}
          </div>
          <Badge variant="default">{ts.paid || 'Paid'}</Badge>
        </div>
      ))}
    </div>
  )
}

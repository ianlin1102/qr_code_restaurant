import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'
import { formatPriceUSD } from '@/lib/format'
import { api, type SessionSummary, type AllowedActions } from '@/services/api'
import type { Payment } from '@qr-order/shared'
import { notify } from '@/lib/notify'
import CashPaymentPad from './CashPaymentPad'

export function SessionSummaryView({ session, ts, tc, lang }: {
  session: SessionSummary; ts: Record<string, string>; tc: Record<string, string>; lang: string
}) {
  const zh = lang === 'zh'
  return (
    <div className="space-y-2 text-sm">
      {/* Bill breakdown (dimmed — reference info) */}
      <div className="flex justify-between text-muted-foreground">
        <span>{ts.subtotal || 'Subtotal'}</span>
        <span>{formatPriceUSD(session.totalAmount)}</span>
      </div>
      {session.discountAmount > 0 && (
        <div className="flex justify-between text-green-600">
          <span>{ts.discount || 'Discount'} ({session.couponCode})</span>
          <span>-{formatPriceUSD(session.discountAmount)}</span>
        </div>
      )}
      {session.tax > 0 && (
        <div className="flex justify-between text-muted-foreground">
          <span>{tc.tax || 'Tax'}</span>
          <span>{formatPriceUSD(session.tax)}</span>
        </div>
      )}
      {session.serviceFee > 0 && (
        <div className="flex justify-between text-muted-foreground">
          <span>{zh ? '服务费' : 'Service Fee'}</span>
          <span>{formatPriceUSD(session.serviceFee)}</span>
        </div>
      )}
      <div className="flex justify-between text-muted-foreground border-t pt-2">
        <span>{zh ? '账单总计' : 'Bill Total'}</span>
        <span>{formatPriceUSD(session.totalWithTax)}</span>
      </div>
      {/* Paid amount */}
      {session.totalPaid > 0 && (
        <div className="flex justify-between text-blue-600">
          <span>{ts.paid || 'Paid'}</span>
          <span>-{formatPriceUSD(session.totalPaid)}</span>
        </div>
      )}
      {/* Remaining — the hero number, what actually needs to be collected */}
      <div className="flex justify-between font-bold text-base border-t pt-2">
        <span>{session.remaining > 0 ? (ts.remaining || 'Remaining') : (ts.allPaid || 'Fully Paid')}</span>
        <span className={session.remaining > 0 ? 'text-orange-600' : 'text-green-600'}>
          {formatPriceUSD(session.remaining)}
        </span>
      </div>
    </div>
  )
}

export function CouponSection({ session, couponCode, setCouponCode, onApply, onRemove, ts, tc }: {
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

export function PaymentList({ payments, ts }: {
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

export function PaymentMethodSection({ session, storeId, sessionId, payMethod, setPayMethod, paying, setPaying, fetchSession, setAllowed, ts, lang }: {
  session: SessionSummary; storeId: string; sessionId: string
  payMethod: 'stripe' | 'cash' | null; setPayMethod: (v: 'stripe' | 'cash' | null) => void
  paying: boolean; setPaying: (v: boolean) => void
  fetchSession: () => void; setAllowed: (v: AllowedActions) => void
  ts: Record<string, string>; lang: string
}) {
  const zh = lang === 'zh'

  const handleCardCharge = async () => {
    setPaying(true)
    try {
      const result = await api.addPayment(storeId, sessionId, session.remaining, 'card')
      if (result.allowedActions) setAllowed(result.allowedActions)
      setPayMethod(null)
      fetchSession()
    } catch (e) { notify.fromError(e) }
    setPaying(false)
  }

  const handleCashConfirm = async (receivedAmount: number, tipAmount?: number) => {
    setPaying(true)
    try {
      const result = await api.recordCashPayment(storeId, sessionId, session.remaining, receivedAmount, tipAmount)
      if (result.allowedActions) setAllowed(result.allowedActions)
      setPayMethod(null)
      fetchSession()
    } catch (e) { notify.fromError(e) }
    setPaying(false)
  }

  if (payMethod === 'cash') {
    return (
      <CashPaymentPad
        totalDue={session.remaining} lang={lang}
        loading={paying} onCancel={() => setPayMethod(null)}
        onConfirm={handleCashConfirm}
      />
    )
  }

  if (payMethod === 'stripe') {
    return (
      <div className="space-y-3">
        <Button className="w-full min-h-[44px]" onClick={handleCardCharge} disabled={paying}>
          {paying && <Loader2 className="size-4 mr-2 animate-spin" />}
          {zh ? '刷卡收款' : 'Charge'} {formatPriceUSD(session.remaining)}
        </Button>
        <button className="text-sm text-muted-foreground hover:underline w-full text-center"
          onClick={() => setPayMethod(null)}>
          {zh ? '返回' : 'Back'}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">{ts.addPayment || 'Add Payment'}</p>
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1 min-h-[44px]" onClick={() => setPayMethod('stripe')}>
          {zh ? '刷卡' : 'Card'}
        </Button>
        <Button variant="outline" className="flex-1 min-h-[44px]" onClick={() => setPayMethod('cash')}>
          {zh ? '现金' : 'Cash'}
        </Button>
      </div>
    </div>
  )
}

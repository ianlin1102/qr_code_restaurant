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
import type { Bill, Split, Coupon } from '@qr-order/shared'

interface Props {
  open: boolean
  onClose: () => void
  storeId: string
  billId: string
  t: Record<string, Record<string, unknown>>
}

type BillWithSplits = Bill & { splits: Split[] }

export default function BillSettleDialog({ open, onClose, storeId, billId, t }: Props) {
  const [bill, setBill] = useState<BillWithSplits | null>(null)
  const [couponCode, setCouponCode] = useState('')
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [splitCount, setSplitCount] = useState(2)
  const [mode, setMode] = useState<'overview' | 'split'>('overview')
  const [loading, setLoading] = useState(false)

  const tb = (t.bill ?? {}) as Record<string, string>
  const ts = (t.splitBill ?? {}) as Record<string, string>
  const tc = (t.common ?? {}) as Record<string, string>

  const fetchBill = useCallback(async () => {
    try {
      const data = await api.getBill(storeId, billId)
      setBill(data)
      if (data.splits.length > 0) setMode('split')
    } catch (e) { console.error(e) }
  }, [storeId, billId])

  useEffect(() => {
    if (open) {
      fetchBill()
      api.getCoupons(storeId).then(setCoupons).catch(() => {})
    }
  }, [open, fetchBill, storeId])

  if (!bill) return null

  const handleApplyCoupon = async () => {
    const coupon = coupons.find(c => c.code === couponCode && c.active)
    if (!coupon) return
    try {
      const updated = await api.applyBillCoupon(
        storeId, billId, coupon.id, coupon.code, coupon.discountType, coupon.discountValue,
      )
      setBill(prev => prev ? { ...prev, ...updated, splits: prev.splits } : null)
      setCouponCode('')
    } catch (e) { console.error(e) }
  }

  const handleRemoveCoupon = async () => {
    try {
      const updated = await api.removeBillCoupon(storeId, billId)
      setBill(prev => prev ? { ...prev, ...updated, splits: prev.splits } : null)
    } catch (e) { console.error(e) }
  }

  const handlePayFull = async () => {
    setLoading(true)
    try {
      await api.settleBill(storeId, billId, 'waiter')
      onClose()
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const handleCreateSplits = async () => {
    try {
      const splits = await api.createBillSplits(storeId, billId, 'equal', splitCount)
      setBill(prev => prev ? { ...prev, splits, splitMethod: 'equal' } : null)
      setMode('split')
    } catch (e) { console.error(e) }
  }

  const handleMarkPaid = async (splitId: string) => {
    try {
      const result = await api.markSplitPaid(storeId, billId, splitId)
      if (result.bill.status === 'settled') {
        onClose()
        return
      }
      fetchBill()
    } catch (e) { console.error(e) }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-md w-[calc(100vw-2rem)] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tb.title || 'Bill'}</DialogTitle>
        </DialogHeader>

        <BillSummary bill={bill} tb={tb} />

        <CouponSection
          bill={bill} couponCode={couponCode} setCouponCode={setCouponCode}
          onApply={handleApplyCoupon} onRemove={handleRemoveCoupon} tb={tb} tc={tc}
        />

        {mode === 'overview' && bill.status !== 'settled' && (
          <OverviewActions
            bill={bill} splitCount={splitCount} setSplitCount={setSplitCount}
            loading={loading} onPayFull={handlePayFull} onCreateSplits={handleCreateSplits}
            tb={tb} ts={ts}
          />
        )}

        {mode === 'split' && bill.splits.length > 0 && (
          <SplitList
            splits={bill.splits} onMarkPaid={handleMarkPaid}
            onBack={() => setMode('overview')} tb={tb} ts={ts} tc={tc}
          />
        )}

        {bill.status === 'settled' && (
          <p className="text-center py-4 text-green-600 font-medium">
            {tb.allPaid || 'All Paid!'}
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}

function BillSummary({ bill, tb }: { bill: Bill; tb: Record<string, string> }) {
  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span>{tb.subtotal || 'Subtotal'}</span>
        <span>{formatPriceUSD(bill.subtotal)}</span>
      </div>
      {bill.discountAmount > 0 && (
        <div className="flex justify-between text-green-600">
          <span>{tb.discount || 'Discount'} ({bill.couponCode})</span>
          <span>-{formatPriceUSD(bill.discountAmount)}</span>
        </div>
      )}
      <div className="flex justify-between font-semibold border-t pt-2">
        <span>{tb.totalDue || 'Total Due'}</span>
        <span>{formatPriceUSD(bill.totalDue)}</span>
      </div>
      {bill.paidAmount > 0 && (
        <div className="flex justify-between text-blue-600">
          <span>{tb.paidAmount || 'Paid'}</span>
          <span>{formatPriceUSD(bill.paidAmount)}</span>
        </div>
      )}
    </div>
  )
}

function CouponSection({ bill, couponCode, setCouponCode, onApply, onRemove, tb, tc }: {
  bill: Bill; couponCode: string; setCouponCode: (v: string) => void
  onApply: () => void; onRemove: () => void
  tb: Record<string, string>; tc: Record<string, string>
}) {
  if (bill.status === 'settled') return null

  if (bill.couponId) {
    return (
      <div className="flex items-center justify-between text-sm bg-green-50 rounded px-3 py-2">
        <span className="font-medium">{bill.couponCode}</span>
        <button onClick={onRemove} className="text-red-500 text-xs hover:underline">
          {tb.removeCoupon || 'Remove'}
        </button>
      </div>
    )
  }

  return (
    <div className="flex gap-2">
      <Input
        value={couponCode}
        onChange={e => setCouponCode(e.target.value)}
        placeholder={tb.applyCoupon || 'Coupon code'}
        className="flex-1 h-8 text-sm"
      />
      <Button size="sm" onClick={onApply} disabled={!couponCode}>
        {tc.confirm || 'Apply'}
      </Button>
    </div>
  )
}

function OverviewActions({ bill, splitCount, setSplitCount, loading, onPayFull, onCreateSplits, tb, ts }: {
  bill: Bill; splitCount: number; setSplitCount: (n: number) => void
  loading: boolean; onPayFull: () => void; onCreateSplits: () => void
  tb: Record<string, string>; ts: Record<string, string>
}) {
  return (
    <div className="space-y-3">
      <Button className="w-full" onClick={onPayFull} disabled={loading}>
        {loading && <Loader2 className="size-4 mr-2 animate-spin" />}
        {tb.splitFull || 'Pay in Full'}
      </Button>
      <div className="border-t pt-3">
        <p className="text-sm font-medium mb-2">{ts.equalMode || 'Split Equally'}</p>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm">{ts.numberOfPeople || 'People'}:</span>
          <Input
            type="number" min={2} max={20} value={splitCount}
            onChange={e => setSplitCount(Math.max(2, parseInt(e.target.value) || 2))}
            className="w-20 h-10 text-sm"
          />
          <span className="text-sm text-muted-foreground">
            ({formatPriceUSD(Math.ceil(bill.totalDue / splitCount))} {ts.perPerson || 'each'})
          </span>
        </div>
        <Button variant="outline" className="w-full" onClick={onCreateSplits}>
          {ts.generate || 'Create Splits'}
        </Button>
      </div>
    </div>
  )
}

function SplitList({ splits, onMarkPaid, onBack, tb, ts, tc }: {
  splits: Split[]; onMarkPaid: (id: string) => void; onBack: () => void
  tb: Record<string, string>; ts: Record<string, string>; tc: Record<string, string>
}) {
  const paidCount = splits.filter(s => s.status === 'paid').length
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        {paidCount}/{splits.length} {ts.paid || 'paid'}
      </p>
      {splits.map((split, i) => (
        <div key={split.id} className="flex items-center justify-between border rounded px-3 py-3">
          <div>
            <span className="text-sm font-medium">
              {(ts.person || 'Person {{n}}').replace('{{n}}', String(i + 1))}
            </span>
            <span className="text-sm ml-2">{formatPriceUSD(split.amount)}</span>
          </div>
          {split.status === 'paid' ? (
            <Badge variant="default">{ts.paid || 'Paid'}</Badge>
          ) : (
            <Button size="sm" variant="outline" onClick={() => onMarkPaid(split.id)}>
              {tb.markPaid || 'Mark Paid'}
            </Button>
          )}
        </div>
      ))}
      <Button variant="outline" className="w-full mt-2" onClick={onBack}>
        {tc.cancel || 'Back'}
      </Button>
    </div>
  )
}

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { formatPriceUSD } from '@/lib/format'
import type { SplitBill } from '@qr-order/shared'

type Ts = Record<string, string>

export function TipInput({ value, onChange, label }: {
  value: string; onChange: (v: string) => void; label: string
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      <Input type="number" min="0" step="0.01" value={value}
        onChange={e => onChange(e.target.value)} placeholder="0.00" className="h-10" />
    </div>
  )
}

export function MainBillCard({ label, badge, total, ts, onPayCard, onPayCash, onSplit }: {
  label: string; badge: string; total: number
  ts: Ts; onPayCard: () => void; onPayCash: () => void; onSplit: () => void
}) {
  return (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">{label}</span>
        <Badge variant="secondary" className="text-xs">{badge}</Badge>
      </div>
      <p className="text-lg font-bold">{formatPriceUSD(total)}</p>
      {total > 0 && (
        <div className="flex gap-2">
          <Button size="sm" className="flex-1 min-h-[44px]" onClick={onPayCard}>{ts.payCard}</Button>
          <Button size="sm" variant="outline" className="flex-1 min-h-[44px]" onClick={onPayCash}>{ts.payCash}</Button>
          <Button size="sm" variant="secondary" className="flex-1 min-h-[44px]" onClick={onSplit}>{ts.split}</Button>
        </div>
      )}
    </div>
  )
}

export function SplitCard({ split, ts, onPayCard, onPayCash, onMerge }: {
  split: SplitBill; ts: Ts
  onPayCard: () => void; onPayCash: () => void; onMerge: () => void
}) {
  const typeBadge = split.type === 'by-item' ? ts.byItemMode : ts.byPercentMode
  return (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">{split.label}</span>
        <div className="flex gap-1">
          <Badge variant="outline" className="text-xs">{typeBadge}</Badge>
          {split.status === 'paid' && <Badge className="text-xs">{ts.paid}</Badge>}
          {split.status === 'pending-capture' && (
            <Badge variant="secondary" className="text-xs">{ts.pendingCapture}</Badge>
          )}
        </div>
      </div>
      <p className="text-lg font-bold">{formatPriceUSD(split.total)}</p>
      {split.stale && (
        <p className="text-xs text-destructive font-medium">
          {split.staleReason || 'This split is outdated'}
        </p>
      )}
      {split.status === 'paid' && (
        <p className="text-xs text-muted-foreground">
          {split.method} {split.paidAt ? new Date(split.paidAt).toLocaleTimeString() : ''}
        </p>
      )}
      {split.status === 'unpaid' && !split.stale && (
        <div className="flex gap-2">
          <Button size="sm" className="flex-1 min-h-[44px]" onClick={onPayCard}>{ts.payCard}</Button>
          <Button size="sm" variant="outline" className="flex-1 min-h-[44px]" onClick={onPayCash}>{ts.payCash}</Button>
          <Button size="sm" variant="ghost" className="min-h-[44px]" onClick={onMerge}>{ts.mergeBack}</Button>
        </div>
      )}
      {split.status === 'unpaid' && split.stale && (
        <div className="flex gap-2">
          <Button size="sm" variant="destructive" className="flex-1 min-h-[44px]" onClick={onMerge}>{ts.mergeBack}</Button>
        </div>
      )}
      {split.status === 'pending-capture' && (
        <Button size="sm" variant="secondary" className="w-full min-h-[44px]">{ts.enterTip}</Button>
      )}
    </div>
  )
}

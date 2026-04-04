# Checkout & Settlement System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete pay-later settlement flow — customers split bills (by item or percentage), admin settles via card or cash, with tax calculation.

**Architecture:** Extend the existing Session model with settlement tracking (`settlementMode`, `paidItemIds`). Tax rate is store-level config. Customer-facing settlement is a bottom sheet on MenuPage. Admin settlement extends the existing BillSettleDialog with cash/card options. Items are identified by composite key `orderId:itemIndex`.

**Tech Stack:** React + Zustand (client), Express + JSON store (server), Stripe PaymentIntents, shadcn/ui Sheet/Dialog

---

## File Map

### New Files
| File | Responsibility |
|------|---------------|
| `client/src/components/customer/SettlementSheet.tsx` | Customer settlement UI — item picker, percent slider, tax display, pay button |
| `client/src/components/table/CashPaymentPad.tsx` | Number pad for admin cash collection — amount input, change calc |

### Modified Files
| File | Changes |
|------|---------|
| `shared/types.ts` | Add `taxRate`, `serviceFeeRate` to Store; `settlementMode`, `paidItemIds` to Session; `method` to Payment |
| `server/src/controllers/store.service.ts` | Accept `taxRate`, `serviceFeeRate` in updateStore |
| `server/src/controllers/session.service.ts` | Add `startSettlement`, `payByItems`, `payByPercent`, `recordCashPayment`, tax calc helpers |
| `server/src/routes/session.routes.ts` | Add 4 new endpoints (start-settlement, pay-items, pay-percent, cash-payment) |
| `server/src/controllers/payment.service.ts` | Adjust `createPaymentIntentForSession` to accept item-level or percent-level amounts |
| `client/src/services/api.ts` | Add `startSettlement`, `payByItems`, `payByPercent`, `recordCashPayment`, update `updateStore` |
| `client/src/pages/customer/MenuPage.tsx` | Replace "Pay Now" banner with "结账" button that opens SettlementSheet |
| `client/src/pages/admin/StoreSettingsPage.tsx` | Add tax rate + service fee inputs |
| `client/src/components/table/BillSettleDialog.tsx` | Add cash/card payment method toggle, integrate CashPaymentPad |

---

## Task 1: Data Layer — Types & Store Config

**Files:**
- Modify: `shared/types.ts`
- Modify: `server/src/controllers/store.service.ts`
- Modify: `client/src/pages/admin/StoreSettingsPage.tsx`
- Modify: `client/src/services/api.ts`

### Step 1.1: Add new fields to shared types

- [ ] In `shared/types.ts`, add to `Store` interface (after `paymentMode`):

```typescript
  taxRate?: number               // e.g. 8.875 means 8.875%
  serviceFeeRate?: number        // e.g. 15 means 15%
```

- [ ] Update `UpdateStoreRequest` to include new fields:

```typescript
export type UpdateStoreRequest = Pick<Store, 'name'> & Partial<Pick<Store,
  'description' | 'openingHours' | 'announcement' | 'announcementEn' |
  'autoAcceptOrders' | 'maxTables' | 'paymentMode' | 'taxRate' | 'serviceFeeRate'
>>
```

- [ ] Add to `Session` interface (after `discountAmount`):

```typescript
  settlementMode?: 'by-item' | 'by-percent'  // locks once first percent payment made
  paidItemIds?: string[]                       // "orderId:itemIndex" keys for items already paid
```

- [ ] Add to `Payment` interface (after `paidBy`):

```typescript
  method?: 'stripe' | 'cash'
```

### Step 1.2: Update store.service.ts to accept new fields

- [ ] In `server/src/controllers/store.service.ts`, update the `updateStore` function. Add `taxRate` and `serviceFeeRate` to the update object:

```typescript
export function updateStore(storeId: string, data: UpdateStoreRequest): Store | { error: string } {
  const store = storeStore.getById(storeId)
  if (!store) return { error: 'Store not found' }
  if (!data.name?.trim()) return { error: 'Name is required' }

  return storeStore.update(storeId, {
    name: data.name.trim(),
    description: data.description ?? store.description,
    openingHours: data.openingHours ?? store.openingHours,
    announcement: data.announcement ?? store.announcement,
    announcementEn: data.announcementEn ?? store.announcementEn,
    autoAcceptOrders: data.autoAcceptOrders ?? store.autoAcceptOrders,
    maxTables: data.maxTables ?? store.maxTables,
    paymentMode: data.paymentMode ?? store.paymentMode,
    taxRate: data.taxRate ?? store.taxRate,
    serviceFeeRate: data.serviceFeeRate ?? store.serviceFeeRate,
    updatedAt: new Date().toISOString(),
  })!
}
```

### Step 1.3: Add tax rate UI to StoreSettingsPage

- [ ] In `StoreSettingsPage.tsx`, add state variables (after existing state):

```typescript
const [taxRate, setTaxRate] = useState('')
const [serviceFeeRate, setServiceFeeRate] = useState('')
```

- [ ] In the `useEffect` that populates form from store data, add:

```typescript
setTaxRate(store.taxRate != null ? String(store.taxRate) : '')
setServiceFeeRate(store.serviceFeeRate != null ? String(store.serviceFeeRate) : '')
```

- [ ] In the save handler, add to the `api.updateStore` call:

```typescript
taxRate: taxRate ? Number(taxRate) : undefined,
serviceFeeRate: serviceFeeRate ? Number(serviceFeeRate) : undefined,
```

- [ ] Add two form fields in the settings form (after Payment Mode section). Tax Rate:

```tsx
<div>
  <Label>{t.common.tax} (%)</Label>
  <Input type="number" min={0} max={100} step={0.001}
    value={taxRate} onChange={e => setTaxRate(e.target.value)}
    placeholder="8.875" className="mt-1" />
  <p className="text-xs text-muted-foreground mt-1">
    {lang === 'zh' ? '结账时按此税率计算税费' : 'Applied to subtotal at checkout'}
  </p>
</div>
```

Service Fee Rate (optional):

```tsx
<div>
  <Label>{lang === 'zh' ? '服务费 (%)' : 'Service Fee (%)'}</Label>
  <Input type="number" min={0} max={100} step={0.1}
    value={serviceFeeRate} onChange={e => setServiceFeeRate(e.target.value)}
    placeholder="15" className="mt-1" />
</div>
```

- [ ] Commit: `feat: add taxRate and serviceFeeRate to Store type and settings page`

---

## Task 2: Server — Settlement Service Logic

**Files:**
- Modify: `server/src/controllers/session.service.ts`

### Step 2.1: Add tax calculation helper

- [ ] Add after the `recalcDiscount` function:

```typescript
/** Calculate tax for a subtotal, reading taxRate from store config */
export function calcTax(storeId: string, subtotal: number): number {
  const store = storeStore.getById(storeId)
  const rate = store?.taxRate ?? 0
  return Math.round(subtotal * rate / 100)
}

export function calcServiceFee(storeId: string, subtotal: number): number {
  const store = storeStore.getById(storeId)
  const rate = store?.serviceFeeRate ?? 0
  return Math.round(subtotal * rate / 100)
}
```

### Step 2.2: Add startSettlement

- [ ] Add exported function:

```typescript
export function startSettlement(
  storeId: string, sessionId: string, mode: 'by-item' | 'by-percent',
): Session | { error: string } {
  const session = sessionStore.getById(sessionId)
  if (!session || session.storeId !== storeId) return { error: 'Session not found' }
  if (session.status === 'closed') return { error: 'Session is closed' }

  // If mode is already set to by-percent, can't switch back to by-item
  if (session.settlementMode === 'by-percent' && mode === 'by-item') {
    return { error: 'Settlement mode locked to percentage' }
  }

  return sessionStore.update(sessionId, { settlementMode: mode })!
}
```

### Step 2.3: Add payByItems

- [ ] Add exported function. This marks specific items as paid and returns the amount to charge:

```typescript
export function payByItems(
  storeId: string, sessionId: string, itemKeys: string[],
): { amount: number; tax: number; serviceFee: number } | { error: string } {
  const session = sessionStore.getById(sessionId)
  if (!session || session.storeId !== storeId) return { error: 'Session not found' }
  if (session.status === 'closed') return { error: 'Session is closed' }
  if (session.settlementMode === 'by-percent') return { error: 'Settlement locked to percentage mode' }

  const alreadyPaid = new Set(session.paidItemIds ?? [])
  const orders = session.orderIds.map(id => orderStore.getById(id)).filter(Boolean)

  let subtotal = 0
  for (const key of itemKeys) {
    if (alreadyPaid.has(key)) return { error: `Item ${key} already paid` }
    const [orderId, idxStr] = key.split(':')
    const order = orders.find(o => o!.id === orderId)
    if (!order) return { error: `Order ${orderId} not found` }
    const item = order.items[Number(idxStr)]
    if (!item) return { error: `Item index ${idxStr} not found in order ${orderId}` }
    const optAdj = (item.selectedOptions ?? []).reduce((s, o) => s + o.priceAdjust, 0)
    subtotal += (item.price + optAdj) * item.quantity
  }

  const tax = calcTax(storeId, subtotal)
  const serviceFee = calcServiceFee(storeId, subtotal)

  // Mark items as paid (persisted after payment confirmed)
  sessionStore.update(sessionId, {
    settlementMode: session.settlementMode ?? 'by-item',
    paidItemIds: [...(session.paidItemIds ?? []), ...itemKeys],
  })

  return { amount: subtotal + tax + serviceFee, tax, serviceFee }
}
```

### Step 2.4: Add payByPercent

- [ ] Add exported function:

```typescript
export function payByPercent(
  storeId: string, sessionId: string, percent: number,
): { amount: number; tax: number; serviceFee: number } | { error: string } {
  const session = sessionStore.getById(sessionId)
  if (!session || session.storeId !== storeId) return { error: 'Session not found' }
  if (session.status === 'closed') return { error: 'Session is closed' }
  if (percent < 1 || percent > 100) return { error: 'Percent must be 1-100' }

  const netDue = session.totalAmount - session.discountAmount
  const remaining = netDue - session.totalPaid
  if (remaining <= 0) return { error: 'Nothing to pay' }

  const subtotal = Math.round(remaining * percent / 100)
  const tax = calcTax(storeId, subtotal)
  const serviceFee = calcServiceFee(storeId, subtotal)

  // Lock mode to by-percent
  if (session.settlementMode !== 'by-percent') {
    sessionStore.update(sessionId, { settlementMode: 'by-percent' })
  }

  return { amount: subtotal + tax + serviceFee, tax, serviceFee }
}
```

### Step 2.5: Add recordCashPayment

- [ ] Add exported function for admin cash collection:

```typescript
export function recordCashPayment(
  storeId: string, sessionId: string, amount: number, receivedAmount: number,
): { session: Session; payment: Payment; change: number } | { error: string } {
  if (receivedAmount < amount) return { error: 'Received amount is less than total' }

  const result = addPayment(storeId, sessionId, amount, 'cash')
  if ('error' in result) return result

  // Tag the payment as cash
  paymentStore.update(result.payment.id, { method: 'cash' } as Partial<Payment>)

  return { ...result, change: receivedAmount - amount }
}
```

- [ ] Add `import type { Payment }` if not already imported (it's already imported from shared).

- [ ] Commit: `feat: session settlement service — tax calc, pay-by-items, pay-by-percent, cash payment`

---

## Task 3: Server — Settlement Routes

**Files:**
- Modify: `server/src/routes/session.routes.ts`

### Step 3.1: Add all 4 settlement endpoints

- [ ] Add before the `// PATCH /:sessionId/close` block:

```typescript
// PATCH /sessions/:sessionId/start-settlement — set settlement mode
router.patch('/:sessionId/start-settlement', (req: Request, res: Response) => {
  const { mode } = req.body
  if (!mode || !['by-item', 'by-percent'].includes(mode)) {
    res.status(400).json({ error: 'mode must be by-item or by-percent' }); return
  }
  const result = svc.startSettlement(req.params.storeId, req.params.sessionId, mode)
  if ('error' in result) { res.status(400).json(result); return }
  res.json(result)
})

// POST /sessions/:sessionId/pay-items — calculate amount for selected items
router.post('/:sessionId/pay-items', (req: Request, res: Response) => {
  const { itemKeys } = req.body
  if (!Array.isArray(itemKeys) || itemKeys.length === 0) {
    res.status(400).json({ error: 'itemKeys array required' }); return
  }
  const result = svc.payByItems(req.params.storeId, req.params.sessionId, itemKeys)
  if ('error' in result) { res.status(400).json(result); return }
  res.json(result)
})

// POST /sessions/:sessionId/pay-percent — calculate amount for percentage
router.post('/:sessionId/pay-percent', (req: Request, res: Response) => {
  const { percent } = req.body
  if (typeof percent !== 'number') {
    res.status(400).json({ error: 'percent number required' }); return
  }
  const result = svc.payByPercent(req.params.storeId, req.params.sessionId, percent)
  if ('error' in result) { res.status(400).json(result); return }
  res.json(result)
})

// POST /sessions/:sessionId/cash-payment — admin records cash payment
router.post(
  '/:sessionId/cash-payment',
  requireAuth, requirePermission('tables:write'),
  (req: Request, res: Response) => {
    const { amount, receivedAmount } = req.body
    if (!amount || !receivedAmount) {
      res.status(400).json({ error: 'amount and receivedAmount required' }); return
    }
    const result = svc.recordCashPayment(
      req.params.storeId, req.params.sessionId, amount, receivedAmount,
    )
    if ('error' in result) { res.status(400).json(result); return }
    res.json(result)
  },
)
```

- [ ] Commit: `feat: settlement API routes — start-settlement, pay-items, pay-percent, cash-payment`

---

## Task 4: Client — API Methods

**Files:**
- Modify: `client/src/services/api.ts`

### Step 4.1: Add settlement API methods

- [ ] Add after the `updateSessionCart` method:

```typescript
  // Settlement
  startSettlement: (storeId: string, sessionId: string, mode: 'by-item' | 'by-percent') =>
    fetchJSON<Session>(`/stores/${storeId}/sessions/${sessionId}/start-settlement`, {
      method: 'PATCH', body: JSON.stringify({ mode }),
    }),

  payByItems: (storeId: string, sessionId: string, itemKeys: string[]) =>
    fetchJSON<{ amount: number; tax: number; serviceFee: number }>(
      `/stores/${storeId}/sessions/${sessionId}/pay-items`,
      { method: 'POST', body: JSON.stringify({ itemKeys }) },
    ),

  payByPercent: (storeId: string, sessionId: string, percent: number) =>
    fetchJSON<{ amount: number; tax: number; serviceFee: number }>(
      `/stores/${storeId}/sessions/${sessionId}/pay-percent`,
      { method: 'POST', body: JSON.stringify({ percent }) },
    ),

  recordCashPayment: (storeId: string, sessionId: string, amount: number, receivedAmount: number) =>
    fetchJSON<{ session: Session; payment: Payment; change: number }>(
      `/stores/${storeId}/sessions/${sessionId}/cash-payment`,
      { method: 'POST', body: JSON.stringify({ amount, receivedAmount }) },
    ),
```

- [ ] Commit: `feat: client API methods for settlement`

---

## Task 5: Customer — SettlementSheet Component

**Files:**
- Create: `client/src/components/customer/SettlementSheet.tsx`

### Step 5.1: Build the settlement sheet

- [ ] Create the file. This is a bottom sheet that shows two tabs (By Items / By Percentage), calculates tax, and triggers Stripe checkout:

```tsx
import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Slider } from '@/components/ui/slider'
import { Loader2 } from 'lucide-react'
import { formatPriceUSD } from '@/lib/format'
import { localized } from '@/lib/i18n-utils'
import { api } from '@/services/api'
import type { Order, SessionSummary } from '@qr-order/shared'

interface Props {
  open: boolean
  onClose: () => void
  storeId: string
  session: SessionSummary
  orders: Order[]
  taxRate: number
  serviceFeeRate: number
}

type Mode = 'by-item' | 'by-percent'

export default function SettlementSheet({
  open, onClose, storeId, session, orders, taxRate, serviceFeeRate,
}: Props) {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation('customer')
  const lang = i18n.language

  const locked = session.settlementMode === 'by-percent'
  const [mode, setMode] = useState<Mode>(locked ? 'by-percent' : 'by-item')
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [percent, setPercent] = useState(100)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const paidSet = useMemo(() => new Set(session.paidItemIds ?? []), [session.paidItemIds])

  // Flatten all order items with their composite keys
  const allItems = useMemo(() => {
    const list: { key: string; name: string; price: number; qty: number; paid: boolean; orderId: string }[] = []
    for (const order of orders) {
      order.items.forEach((item, idx) => {
        const key = `${order.id}:${idx}`
        const optAdj = (item.selectedOptions ?? []).reduce((s, o) => s + o.priceAdjust, 0)
        list.push({
          key,
          name: localized(item, lang) || item.name,
          price: (item.price + optAdj) * item.quantity,
          qty: item.quantity,
          paid: paidSet.has(key),
          orderId: order.id,
        })
      })
    }
    return list
  }, [orders, paidSet, lang])

  const netDue = session.totalAmount - session.discountAmount
  const remaining = Math.max(0, netDue - session.totalPaid)

  // Calculate subtotal based on mode
  const subtotal = mode === 'by-item'
    ? allItems.filter(i => selectedItems.has(i.key)).reduce((s, i) => s + i.price, 0)
    : Math.round(remaining * percent / 100)

  const tax = Math.round(subtotal * taxRate / 100)
  const serviceFee = Math.round(subtotal * serviceFeeRate / 100)
  const total = subtotal + tax + serviceFee

  const toggleItem = (key: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  async function handlePay() {
    setLoading(true)
    setError(null)
    try {
      // Calculate amount server-side (validates items/percent)
      if (mode === 'by-item') {
        const calc = await api.payByItems(storeId, session.id, [...selectedItems])
        const { clientSecret, amount } = await api.createCheckoutForSession(storeId, session.id, calc.amount)
        navigate(`/store/${storeId}/checkout`, { state: { clientSecret, amount, tableId: session.tableId } })
      } else {
        const calc = await api.payByPercent(storeId, session.id, percent)
        const { clientSecret, amount } = await api.createCheckoutForSession(storeId, session.id, calc.amount)
        navigate(`/store/${storeId}/checkout`, { state: { clientSecret, amount, tableId: session.tableId } })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>{lang === 'zh' ? '结账' : 'Settlement'}</SheetTitle>
        </SheetHeader>

        {/* Mode tabs (locked if percent mode already used) */}
        <div className="flex gap-1 border-b mt-4">
          <button
            onClick={() => !locked && setMode('by-item')}
            disabled={locked}
            className={`flex-1 py-3 min-h-[44px] text-sm font-medium border-b-2 transition-colors ${
              mode === 'by-item' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
            } ${locked ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            {lang === 'zh' ? '按菜品' : 'By Items'}
          </button>
          <button
            onClick={() => setMode('by-percent')}
            className={`flex-1 py-3 min-h-[44px] text-sm font-medium border-b-2 transition-colors ${
              mode === 'by-percent' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
            }`}
          >
            {lang === 'zh' ? '按百分比' : 'By Percentage'}
          </button>
        </div>

        <div className="py-4 space-y-3">
          {mode === 'by-item' ? (
            /* Item picker */
            <div className="space-y-2 max-h-[40vh] overflow-y-auto">
              {allItems.map(item => (
                <label key={item.key}
                  className={`flex items-center gap-3 p-3 rounded-lg border min-h-[44px] ${
                    item.paid ? 'opacity-40 bg-muted' : 'hover:bg-accent cursor-pointer'
                  }`}
                >
                  <Checkbox
                    checked={item.paid || selectedItems.has(item.key)}
                    disabled={item.paid}
                    onCheckedChange={() => toggleItem(item.key)}
                  />
                  <span className="flex-1 text-sm">{item.name} x{item.qty}</span>
                  <span className="text-sm font-medium">{formatPriceUSD(item.price)}</span>
                </label>
              ))}
            </div>
          ) : (
            /* Percent slider */
            <div className="space-y-4 px-2">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-muted-foreground">
                  {lang === 'zh' ? '剩余待付' : 'Remaining'}
                </span>
                <span className="text-lg font-semibold">{formatPriceUSD(remaining)}</span>
              </div>
              <Slider
                value={[percent]}
                onValueChange={([v]) => setPercent(v)}
                min={1} max={100} step={1}
                className="my-4"
              />
              <div className="text-center text-2xl font-bold">{percent}%</div>
            </div>
          )}

          {/* Bill summary */}
          <div className="border-t pt-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{lang === 'zh' ? '小计' : 'Subtotal'}</span>
              <span>{formatPriceUSD(subtotal)}</span>
            </div>
            {tax > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{lang === 'zh' ? '税费' : 'Tax'} ({taxRate}%)</span>
                <span>{formatPriceUSD(tax)}</span>
              </div>
            )}
            {serviceFee > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{lang === 'zh' ? '服务费' : 'Service Fee'} ({serviceFeeRate}%)</span>
                <span>{formatPriceUSD(serviceFee)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-base border-t pt-2">
              <span>{lang === 'zh' ? '合计' : 'Total'}</span>
              <span>{formatPriceUSD(total)}</span>
            </div>
          </div>

          {error && <p className="text-sm text-destructive text-center">{error}</p>}

          <Button
            className="w-full min-h-[48px] text-base"
            onClick={handlePay}
            disabled={loading || total <= 0}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {loading
              ? (lang === 'zh' ? '处理中...' : 'Processing...')
              : `${lang === 'zh' ? '支付' : 'Pay'} ${formatPriceUSD(total)}`}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] Commit: `feat: customer SettlementSheet — item picker, percent slider, tax breakdown`

---

## Task 6: Customer — MenuPage Integration

**Files:**
- Modify: `client/src/pages/customer/MenuPage.tsx`

### Step 6.1: Replace Pay Now banner with Settlement trigger

- [ ] Add state for settlement sheet and store tax config. Near existing state declarations add:

```typescript
const [settlementOpen, setSettlementOpen] = useState(false)
const [storeTaxRate, setStoreTaxRate] = useState(0)
const [storeServiceFeeRate, setStoreServiceFeeRate] = useState(0)
```

- [ ] In the menu fetch `useEffect` (the one calling `api.getMenu`), after `setMenu(data)`, extract tax rates from the store data. If the menu response includes store info, use it. Otherwise add a separate fetch:

```typescript
api.getStore(storeId).then(s => {
  setStoreTaxRate(s.taxRate ?? 0)
  setStoreServiceFeeRate(s.serviceFeeRate ?? 0)
}).catch(() => {})
```

- [ ] Replace the existing "Pay Now" banner block (`{sessionRemaining > 0 && activeSessionId && (...)}`) with:

```tsx
{sessionRemaining > 0 && activeSessionId && (
  <div className="bg-orange-50 border-b border-orange-200 px-4 py-3">
    <div className="max-w-lg mx-auto flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-orange-800">
          {lang === 'zh' ? '待付款' : 'Payment Due'}
        </p>
        <p className="text-xs text-orange-600">
          {formatPriceUSD(sessionRemaining)}
        </p>
      </div>
      <Button
        size="sm"
        disabled={payingOrders}
        className="bg-orange-500 hover:bg-orange-600 text-white min-h-[44px]"
        onClick={() => setSettlementOpen(true)}
      >
        {lang === 'zh' ? '结账' : 'Settle'}
      </Button>
    </div>
  </div>
)}
```

- [ ] Add the SettlementSheet at the end of the component (before the closing `</>`):

```tsx
{activeSessionId && (
  <SettlementSheet
    open={settlementOpen}
    onClose={() => setSettlementOpen(false)}
    storeId={storeId!}
    session={sessionSummaryRef}
    orders={[...unpaidOrders, ...sessionOrders]}
    taxRate={storeTaxRate}
    serviceFeeRate={storeServiceFeeRate}
  />
)}
```

Note: `sessionSummaryRef` needs to be a full SessionSummary object. The current code stores `sessionRemaining` and `activeSessionId` separately. You'll need to store the full session summary from the poll:

```typescript
const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null)
```

Update the polling to: `setSessionSummary(s)` instead of just extracting `remaining`.

- [ ] Add import at top: `import SettlementSheet from '@/components/customer/SettlementSheet'`

- [ ] Commit: `feat: integrate SettlementSheet into MenuPage — replace Pay Now with Settle button`

---

## Task 7: Admin — CashPaymentPad Component

**Files:**
- Create: `client/src/components/table/CashPaymentPad.tsx`

### Step 7.1: Build the number pad

- [ ] Create the file:

```tsx
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { formatPriceUSD } from '@/lib/format'

interface Props {
  totalDue: number       // cents
  onConfirm: (receivedAmount: number) => void
  onCancel: () => void
  loading?: boolean
  lang: string
}

export default function CashPaymentPad({ totalDue, onConfirm, onCancel, loading, lang }: Props) {
  const [input, setInput] = useState('')

  const receivedCents = Math.round(Number(input) * 100)
  const change = receivedCents - totalDue
  const canConfirm = receivedCents >= totalDue && !loading

  const appendDigit = (d: string) => setInput(prev => {
    if (d === '.' && prev.includes('.')) return prev
    if (prev.includes('.') && prev.split('.')[1].length >= 2) return prev
    return prev + d
  })

  const KEYS = ['1','2','3','4','5','6','7','8','9','.','0','⌫']

  return (
    <div className="space-y-4">
      {/* Amount display */}
      <div className="text-center space-y-1">
        <p className="text-sm text-muted-foreground">
          {lang === 'zh' ? '应收' : 'Total Due'}: {formatPriceUSD(totalDue)}
        </p>
        <div className="text-3xl font-bold font-mono h-12">
          {input ? `$${input}` : '$0.00'}
        </div>
        {change >= 0 && receivedCents > 0 && (
          <p className="text-lg font-semibold text-green-600">
            {lang === 'zh' ? '找零' : 'Change'}: {formatPriceUSD(change)}
          </p>
        )}
        {change < 0 && receivedCents > 0 && (
          <p className="text-sm text-destructive">
            {lang === 'zh' ? '金额不足' : 'Insufficient amount'}
          </p>
        )}
      </div>

      {/* Number pad */}
      <div className="grid grid-cols-3 gap-2">
        {KEYS.map(k => (
          <button
            key={k}
            onClick={() => k === '⌫' ? setInput(p => p.slice(0, -1)) : appendDigit(k)}
            className="min-h-[56px] rounded-lg border text-xl font-medium hover:bg-accent transition-colors active:bg-accent/70"
          >
            {k}
          </button>
        ))}
      </div>

      {/* Quick amount buttons */}
      <div className="flex gap-2">
        {[totalDue, Math.ceil(totalDue / 100) * 100, Math.ceil(totalDue / 500) * 500].map((amt, i) => (
          <Button key={i} variant="outline" className="flex-1 min-h-[44px]"
            onClick={() => setInput((amt / 100).toFixed(2))}>
            {formatPriceUSD(amt)}
          </Button>
        ))}
      </div>

      {/* Confirm / Cancel */}
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1 min-h-[48px]" onClick={onCancel} disabled={loading}>
          {lang === 'zh' ? '取消' : 'Cancel'}
        </Button>
        <Button className="flex-1 min-h-[48px]" onClick={() => onConfirm(receivedCents)} disabled={!canConfirm}>
          {loading
            ? (lang === 'zh' ? '处理中...' : 'Processing...')
            : (lang === 'zh' ? '确认收款' : 'Confirm Payment')}
        </Button>
      </div>
    </div>
  )
}
```

- [ ] Commit: `feat: CashPaymentPad — number pad with change calculation`

---

## Task 8: Admin — Upgrade BillSettleDialog

**Files:**
- Modify: `client/src/components/table/BillSettleDialog.tsx`

### Step 8.1: Add cash/card payment method toggle

- [ ] This task modifies the existing BillSettleDialog. The key change: when admin clicks "Add Payment", show a payment method choice (Card via Stripe or Cash via CashPaymentPad).

Add state for payment method and cash flow:

```typescript
const [payMethod, setPayMethod] = useState<'stripe' | 'cash' | null>(null)
```

- [ ] Import CashPaymentPad:

```typescript
import CashPaymentPad from './CashPaymentPad'
```

- [ ] In the payment section of the dialog, replace the single "Add Payment" button with a two-step flow:

**Step 1:** Show two buttons — "Card" and "Cash":

```tsx
{!payMethod && (
  <div className="flex gap-2">
    <Button variant="outline" className="flex-1 min-h-[44px]"
      onClick={() => setPayMethod('stripe')}>
      💳 {lang === 'zh' ? '刷卡' : 'Card'}
    </Button>
    <Button variant="outline" className="flex-1 min-h-[44px]"
      onClick={() => setPayMethod('cash')}>
      💵 {lang === 'zh' ? '现金' : 'Cash'}
    </Button>
  </div>
)}
```

**Step 2a:** Card selected → existing Stripe flow (create payment intent, show in admin):

```tsx
{payMethod === 'stripe' && (
  <Button className="w-full min-h-[44px]" onClick={handleStripePayment} disabled={paying}>
    {paying ? '...' : `${lang === 'zh' ? '刷卡收款' : 'Charge'} ${formatPriceUSD(remaining)}`}
  </Button>
)}
```

**Step 2b:** Cash selected → show CashPaymentPad:

```tsx
{payMethod === 'cash' && (
  <CashPaymentPad
    totalDue={remaining}
    lang={lang}
    loading={paying}
    onCancel={() => setPayMethod(null)}
    onConfirm={async (receivedAmount) => {
      setPaying(true)
      try {
        await api.recordCashPayment(storeId, sessionId, remaining, receivedAmount)
        setPayMethod(null)
        fetchSession()  // refresh session data
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed')
      } finally { setPaying(false) }
    }}
  />
)}
```

- [ ] Add tax display in the bill summary section. After the subtotal line:

```tsx
{store?.taxRate && (
  <div className="flex justify-between text-sm">
    <span>{t.common.tax} ({store.taxRate}%)</span>
    <span>{formatPriceUSD(Math.round(subtotal * (store.taxRate ?? 0) / 100))}</span>
  </div>
)}
```

- [ ] Commit: `feat: BillSettleDialog — card/cash payment method toggle with CashPaymentPad`

---

## Task 9: Webhook — Tag Payment Method

**Files:**
- Modify: `server/src/controllers/payment.service.ts`

### Step 9.1: Tag Stripe payments with method

- [ ] In `handleWebhookEvent`, after the `addPayment` call for session payments (pay-later flow), tag the payment:

Find the line that calls `addPayment` for session payment and after it add:

```typescript
// Tag as stripe payment
if ('payment' in payResult && payResult.payment) {
  paymentStore.update(payResult.payment.id, { method: 'stripe' } as Partial<Payment>)
}
```

- [ ] Similarly for pay-first webhook flow, after recording payment.

- [ ] Ensure `paymentStore` is imported from `'../repositories/stores.js'`.

- [ ] Commit: `feat: tag stripe webhook payments with method: 'stripe'`

---

## Task 10: Verify & Update getSessionSummary

**Files:**
- Modify: `server/src/controllers/session.service.ts`

### Step 10.1: Include tax and settlement info in session summary

- [ ] Update `getSessionSummary` return value to include tax calculation and settlement status:

```typescript
export function getSessionSummary(storeId: string, sessionId: string) {
  const session = sessionStore.getById(sessionId)
  if (!session || session.storeId !== storeId) return null

  adoptOrphanedOrders(session)

  const freshSession = sessionStore.getById(sessionId)!
  const orders = freshSession.orderIds
    .map(id => orderStore.getById(id)).filter(Boolean)
  const payments = getPayments(sessionId)
  const netDue = freshSession.totalAmount - freshSession.discountAmount
  const tax = calcTax(storeId, netDue)
  const serviceFee = calcServiceFee(storeId, netDue)
  const totalWithTax = netDue + tax + serviceFee
  const remaining = Math.max(0, totalWithTax - freshSession.totalPaid)
  const isPaid = freshSession.totalPaid >= totalWithTax && totalWithTax > 0

  return {
    ...freshSession, orders, payments, remaining, isPaid,
    netDue, tax, serviceFee, totalWithTax,
  }
}
```

**Important:** This changes the `remaining` calculation to include tax. All existing consumers (MenuPage banner, BillSettleDialog) will automatically show tax-inclusive remaining.

- [ ] Commit: `feat: session summary includes tax, serviceFee, totalWithTax`

---

## Execution Order

Tasks 1-4 are backend + types (no UI dependency). Tasks 5-8 are frontend (depend on 1-4). Task 9-10 are integration polish.

Recommended order: **1 → 2 → 3 → 4 → 10 → 5 → 6 → 7 → 8 → 9**

(Task 10 before frontend tasks because it changes the session summary shape that frontend consumes.)

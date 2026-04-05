# RBAC Fix + Split Bill + Void Items — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix RBAC permission gaps, add formal SplitBill entity for admin bill splitting (by-item + by-percent, independent payment per sub-bill, merge back), add void-item capability, and support manual capture for tip-on-receipt card payments.

**Architecture:** SplitBill is a new JSON-stored entity referencing sessionId. The "main bill" is implicit (items not assigned to any SplitBill). Each sub-bill can be paid independently via cash or card. Void marks OrderItem.voided=true and recalculates totals. RBAC gaps are 2-line fixes.

**Tech Stack:** React, TypeScript, Express, Stripe SDK (manual capture), JSON file storage

---

### Task 1: RBAC Permission Gaps Fix

**Files:**
- Modify: `client/src/components/layout/AdminLayout.tsx`
- Modify: `client/src/pages/admin/MorePage.tsx`

- [ ] **Step 1: Add perm to waitlist nav item**

In `client/src/components/layout/AdminLayout.tsx`, change:
```typescript
{ to: '/admin/waitlist', navKey: 'waitlist', icon: '👥' },
```
to:
```typescript
{ to: '/admin/waitlist', navKey: 'waitlist', icon: '👥', perm: 'tables:read' },
```

- [ ] **Step 2: Add perm to settings MorePage item**

In `client/src/pages/admin/MorePage.tsx`, change:
```typescript
{ to: '/admin/settings', navKey: 'settings', icon: '⚙️' },
```
to:
```typescript
{ to: '/admin/settings', navKey: 'settings', icon: '⚙️', perm: 'settings:read' },
```

- [ ] **Step 3: Verify and commit**

```bash
cd client && ./node_modules/.bin/tsc --noEmit
git add client/src/components/layout/AdminLayout.tsx client/src/pages/admin/MorePage.tsx
git commit -m "fix: add RBAC perm to waitlist nav and settings MorePage item"
```

---

### Task 2: Void Items — Data Model + Server

**Files:**
- Modify: `shared/types.ts`
- Modify: `server/src/controllers/order.service.ts`
- Modify: `server/src/routes/order.routes.ts`
- Modify: `server/src/controllers/session.service.ts`
- Modify: `server/src/controllers/analytics.service.ts`

- [ ] **Step 1: Add void fields to OrderItem type**

In `shared/types.ts`, update `OrderItem` interface:
```typescript
export interface OrderItem {
  menuItemId: string
  name: string
  nameEn?: string
  price: number // base price
  quantity: number
  remark?: string
  selectedOptions?: SelectedOption[]
  voided?: boolean        // true = price treated as 0, excluded from sales
  voidedAt?: string       // ISO timestamp
  voidedBy?: string       // userId of waiter who voided
  voidReason?: string     // optional reason
}
```

- [ ] **Step 2: Add voidItem function to order.service.ts**

At the bottom of `server/src/controllers/order.service.ts`, add:
```typescript
export function voidItem(
  storeId: string,
  orderId: string,
  itemIndex: number,
  userId: string,
  reason?: string,
): Order | { error: string } {
  const order = orderStore.getById(orderId)
  if (!order || order.storeId !== storeId) return { error: 'Order not found' }
  if (itemIndex < 0 || itemIndex >= order.items.length) return { error: 'Item index out of range' }
  if (order.items[itemIndex].voided) return { error: 'Item already voided' }

  const items = [...order.items]
  items[itemIndex] = {
    ...items[itemIndex],
    voided: true,
    voidedAt: new Date().toISOString(),
    voidedBy: userId,
    ...(reason ? { voidReason: reason } : {}),
  }

  // Recalculate order total excluding voided items
  const totalPrice = items.reduce((sum, it) => {
    if (it.voided) return sum
    const optAdjust = (it.selectedOptions ?? []).reduce((s, o) => s + o.priceAdjust, 0)
    return sum + (it.price + optAdjust) * it.quantity
  }, 0)

  const updated = orderStore.update(orderId, { items, totalPrice, updatedAt: new Date().toISOString() })!

  // Recalculate session total
  if (order.sessionId) {
    recalcSessionTotal(order.sessionId)
  }

  logger.info({ storeId, orderId, itemIndex, userId, reason }, 'item voided')
  return updated
}
```

- [ ] **Step 3: Add void route**

In `server/src/routes/order.routes.ts`, add after the existing routes (before `export default router`):
```typescript
// PATCH /orders/:orderId/items/:itemIndex/void — void an item (sets price to 0)
router.patch('/:orderId/items/:itemIndex/void', requireAuth, requirePermission('orders:write'), (req, res) => {
  const itemIndex = parseInt(req.params.itemIndex, 10)
  if (isNaN(itemIndex)) { res.status(400).json({ error: 'Invalid item index' }); return }
  const result = voidItem(
    req.params.storeId,
    req.params.orderId,
    itemIndex,
    req.user?.userId ?? 'unknown',
    req.body.reason,
  )
  if ('error' in result) { res.status(400).json(result); return }
  res.json(result)
})
```

Add `voidItem` to the import at the top of the file:
```typescript
import { createOrder, getOrders, updateOrderStatus, updateOrderItems, transferOrder, deleteOrder, voidItem } from '../controllers/order.service.js'
```

- [ ] **Step 4: Update analytics to exclude voided items**

In `server/src/controllers/analytics.service.ts`, update `buildTopItems` function. Change the inner loop (around line 51):
```typescript
for (const item of order.items) {
  if (item.voided) continue  // skip voided items
  const existing = map.get(item.menuItemId)
```

Also update revenue calculation in `filterOrders` return and `getAnalytics`. In `getAnalytics` (around line 82), change:
```typescript
const totalRevenue = orders.reduce((sum, o) => {
  // Exclude voided items from revenue
  return sum + o.items.reduce((s, it) => {
    if (it.voided) return s
    const optAdjust = (it.selectedOptions ?? []).reduce((a, opt) => a + opt.priceAdjust, 0)
    return s + (it.price + optAdjust) * it.quantity
  }, 0)
}, 0)
```

- [ ] **Step 5: Add voidItem to client API**

In `client/src/services/api.ts`, add after the existing order methods:
```typescript
voidItem: (storeId: string, orderId: string, itemIndex: number, reason?: string) =>
  fetchJSON<Order>(`/stores/${storeId}/orders/${orderId}/items/${itemIndex}/void`, {
    method: 'PATCH',
    body: JSON.stringify({ reason }),
  }),
```

- [ ] **Step 6: Verify and commit**

```bash
cd client && ./node_modules/.bin/tsc --noEmit
cd ../server && ./node_modules/.bin/tsc --noEmit  # check for new errors only
git add shared/types.ts server/src/controllers/order.service.ts server/src/routes/order.routes.ts \
  server/src/controllers/analytics.service.ts client/src/services/api.ts
git commit -m "feat: void items — sets price to 0, excludes from revenue"
```

---

### Task 3: SplitBill — Data Model + JSON Store

**Files:**
- Modify: `shared/types.ts`
- Create: `server/data/split-bills.json`
- Modify: `server/src/repositories/stores.ts`

- [ ] **Step 1: Add SplitBill type**

In `shared/types.ts`, after the `Payment` interface, add:
```typescript
// ===== Split Bill (admin-created sub-bills for a session) =====
export interface SplitBill {
  id: string
  sessionId: string
  storeId: string
  label: string               // "Bill 1", "Bill 2"
  type: 'by-item' | 'by-percent'
  itemKeys?: string[]         // "orderId:idx:qty" for by-item
  percent?: number            // 1-100, for by-percent
  subtotal: number            // cents
  tax: number                 // cents
  serviceFee: number          // cents
  total: number               // subtotal + tax + serviceFee
  status: 'unpaid' | 'paid' | 'pending-capture'
  paymentId?: string          // → Payment.id
  paymentIntentId?: string    // Stripe PI for manual capture
  paidAt?: string
  method?: 'stripe' | 'cash'
  createdAt: string
}
```

- [ ] **Step 2: Create JSON file and store singleton**

Create `server/data/split-bills.json`:
```json
[]
```

In `server/src/repositories/stores.ts`, add import and singleton:
```typescript
import type { Order, Table, Store, Session, Payment, RoleDefinition, TimeEntry, SplitBill } from '@qr-order/shared'
```
Add after `staffStore`:
```typescript
export const splitBillStore = new JsonStore<SplitBill>('split-bills.json')
```

Remove the legacy alias that conflicts:
```typescript
// Remove these lines:
export const billStore = sessionStore as unknown as JsonStore<Session>
export const splitStore = paymentStore as unknown as JsonStore<Payment>
```

Check if `billStore` or `splitStore` are imported anywhere:
```bash
grep -r "billStore\|splitStore" server/src/ --include="*.ts" | grep -v stores.ts
```
If nothing references them, safe to remove. If something does, keep them.

- [ ] **Step 3: Verify and commit**

```bash
cd client && ./node_modules/.bin/tsc --noEmit
cd ../server && ./node_modules/.bin/tsc --noEmit
git add shared/types.ts server/data/split-bills.json server/src/repositories/stores.ts
git commit -m "feat: SplitBill type + JSON store"
```

---

### Task 4: SplitBill — Server Service + Routes

**Files:**
- Create: `server/src/controllers/split-bill.service.ts`
- Create: `server/src/routes/split-bill.routes.ts`
- Modify: `server/src/app.ts`

- [ ] **Step 1: Create split-bill.service.ts**

Create `server/src/controllers/split-bill.service.ts`:
```typescript
import { v4 as uuid } from 'uuid'
import { splitBillStore, orderStore, sessionStore } from '../repositories/stores.js'
import { addPayment, calcTax, calcServiceFee } from './session.service.js'
import { getStripe } from '../lib/stripe.js'
import type { SplitBill } from '@qr-order/shared'
import logger from '../lib/logger.js'

type Err = { error: string; status?: number }

function itemUnitPrice(item: { price: number; selectedOptions?: { priceAdjust: number }[] }): number {
  return item.price + (item.selectedOptions ?? []).reduce((s, o) => s + o.priceAdjust, 0)
}

/** Get all split bills for a session */
export function getSplitBills(sessionId: string): SplitBill[] {
  return splitBillStore.getByField('sessionId', sessionId)
}

/** Calculate the main bill (items not assigned to any split bill) */
export function getMainBillSummary(sessionId: string, storeId: string) {
  const session = sessionStore.getById(sessionId)
  if (!session) return { subtotal: 0, tax: 0, serviceFee: 0, total: 0, itemCount: 0 }

  const splits = getSplitBills(sessionId)
  const assignedKeys = new Set<string>()
  for (const sb of splits) {
    if (sb.type === 'by-item' && sb.itemKeys) {
      sb.itemKeys.forEach(k => assignedKeys.add(k))
    }
  }

  const orders = session.orderIds.map(id => orderStore.getById(id)).filter(Boolean)
  let subtotal = 0
  let itemCount = 0
  for (const order of orders) {
    order!.items.forEach((item, idx) => {
      if (item.voided) return
      const key = `${order!.id}:${idx}`
      let assignedQty = 0
      for (const k of assignedKeys) {
        if (k.startsWith(key + ':')) assignedQty += parseInt(k.split(':')[2], 10)
        else if (k === key) assignedQty = item.quantity
      }
      const remaining = item.quantity - assignedQty
      if (remaining > 0) {
        subtotal += itemUnitPrice(item) * remaining
        itemCount += remaining
      }
    })
  }

  const percentSubtracted = splits
    .filter(sb => sb.type === 'by-percent' && sb.status !== 'paid')
    .reduce((sum, sb) => sum + sb.subtotal, 0)

  const mainSub = Math.max(0, subtotal - percentSubtracted)
  const tax = calcTax(storeId, mainSub)
  const fee = calcServiceFee(storeId, mainSub)
  return { subtotal: mainSub, tax, serviceFee: fee, total: mainSub + tax + fee, itemCount }
}

/** Create a split bill (by-item or by-percent) */
export function createSplitBill(
  storeId: string, sessionId: string,
  data: { type: 'by-item' | 'by-percent'; itemKeys?: string[]; percent?: number; label?: string },
): SplitBill | Err {
  const session = sessionStore.getById(sessionId)
  if (!session || session.storeId !== storeId) return { error: 'Session not found', status: 404 }
  if (session.status === 'closed') return { error: 'Session is closed', status: 400 }

  const existing = getSplitBills(sessionId)
  const label = data.label || `Bill ${existing.length + 1}`
  let subtotal = 0

  if (data.type === 'by-item') {
    if (!data.itemKeys || data.itemKeys.length === 0) return { error: 'itemKeys required', status: 400 }
    const allAssigned = new Set<string>()
    for (const sb of existing) {
      if (sb.type === 'by-item' && sb.itemKeys) sb.itemKeys.forEach(k => allAssigned.add(k))
    }
    const orders = session.orderIds.map(id => orderStore.getById(id)).filter(Boolean)
    for (const key of data.itemKeys) {
      if (allAssigned.has(key)) return { error: `Item ${key} already assigned to another bill`, status: 400 }
      const [orderId, idxStr, qtyStr] = key.split(':')
      const order = orders.find(o => o!.id === orderId)
      if (!order) return { error: `Order ${orderId} not found`, status: 400 }
      const idx = parseInt(idxStr, 10)
      const item = order.items[idx]
      if (!item) return { error: `Item index ${idx} not found`, status: 400 }
      if (item.voided) return { error: `Item ${key} is voided`, status: 400 }
      const qty = qtyStr ? parseInt(qtyStr, 10) : item.quantity
      subtotal += itemUnitPrice(item) * qty
    }
  } else if (data.type === 'by-percent') {
    if (!data.percent || data.percent < 1 || data.percent > 100) return { error: 'percent must be 1-100', status: 400 }
    const main = getMainBillSummary(sessionId, storeId)
    subtotal = Math.round(main.subtotal * data.percent / 100)
  } else {
    return { error: 'type must be by-item or by-percent', status: 400 }
  }

  const tax = calcTax(storeId, subtotal)
  const fee = calcServiceFee(storeId, subtotal)

  const sb: SplitBill = {
    id: uuid(), sessionId, storeId, label,
    type: data.type,
    ...(data.type === 'by-item' ? { itemKeys: data.itemKeys } : { percent: data.percent }),
    subtotal, tax, serviceFee: fee, total: subtotal + tax + fee,
    status: 'unpaid',
    createdAt: new Date().toISOString(),
  }
  splitBillStore.create(sb)
  logger.info({ storeId, sessionId, splitBillId: sb.id, type: data.type, total: sb.total }, 'split bill created')
  return sb
}

/** Merge back (delete unpaid split bill) */
export function deleteSplitBill(storeId: string, splitBillId: string): { ok: true } | Err {
  const sb = splitBillStore.getById(splitBillId)
  if (!sb || sb.storeId !== storeId) return { error: 'Split bill not found', status: 404 }
  if (sb.status === 'paid') return { error: 'Cannot merge a paid bill', status: 400 }
  splitBillStore.delete(splitBillId)
  logger.info({ storeId, splitBillId }, 'split bill merged back')
  return { ok: true }
}

/** Pay split bill via card (MVP: record as card, no Stripe terminal) */
export function paySplitBillCard(
  storeId: string, splitBillId: string, tipAmount?: number,
): { splitBill: SplitBill; sessionFullyPaid: boolean } | Err {
  const sb = splitBillStore.getById(splitBillId)
  if (!sb || sb.storeId !== storeId) return { error: 'Split bill not found', status: 404 }
  if (sb.status !== 'unpaid') return { error: 'Bill already paid', status: 400 }

  const tip = tipAmount && tipAmount > 0 ? tipAmount : 0
  const chargeAmount = sb.total + tip

  const result = addPayment(storeId, sb.sessionId, chargeAmount, 'waiter')
  if ('error' in result) return { error: result.error, status: 400 }

  splitBillStore.update(splitBillId, {
    status: 'paid', paymentId: result.payment.id,
    paidAt: new Date().toISOString(), method: 'stripe',
  })

  const session = result.session
  const netDue = session.totalAmount - session.discountAmount
  const tax = calcTax(storeId, netDue)
  const fee = calcServiceFee(storeId, netDue)
  const fullyPaid = session.totalPaid >= netDue + tax + fee

  return { splitBill: splitBillStore.getById(splitBillId)!, sessionFullyPaid: fullyPaid }
}

/** Pay split bill via cash */
export function paySplitBillCash(
  storeId: string, splitBillId: string, receivedAmount: number, tipAmount?: number,
): { splitBill: SplitBill; change: number; sessionFullyPaid: boolean } | Err {
  const sb = splitBillStore.getById(splitBillId)
  if (!sb || sb.storeId !== storeId) return { error: 'Split bill not found', status: 404 }
  if (sb.status !== 'unpaid') return { error: 'Bill already paid', status: 400 }

  const tip = tipAmount && tipAmount > 0 ? tipAmount : 0
  const chargeAmount = sb.total + tip
  if (receivedAmount < chargeAmount) return { error: 'Received amount less than due', status: 400 }

  const result = addPayment(storeId, sb.sessionId, chargeAmount, 'waiter')
  if ('error' in result) return { error: result.error, status: 400 }

  // Tag as cash
  const { paymentStore } = await import('../repositories/stores.js')
  paymentStore.update(result.payment.id, { method: 'cash' as const })

  splitBillStore.update(splitBillId, {
    status: 'paid', paymentId: result.payment.id,
    paidAt: new Date().toISOString(), method: 'cash',
  })

  const session = result.session
  const netDue = session.totalAmount - session.discountAmount
  const tax = calcTax(storeId, netDue)
  const fee = calcServiceFee(storeId, netDue)
  const fullyPaid = session.totalPaid >= netDue + tax + fee

  return { splitBill: splitBillStore.getById(splitBillId)!, change: receivedAmount - chargeAmount, sessionFullyPaid: fullyPaid }
}

/** Create PaymentIntent with manual capture for tip-on-receipt */
export async function createManualCaptureIntent(
  storeId: string, splitBillId: string,
): Promise<{ clientSecret: string; paymentIntentId: string; authorizedAmount: number } | Err> {
  const sb = splitBillStore.getById(splitBillId)
  if (!sb || sb.storeId !== storeId) return { error: 'Split bill not found', status: 404 }
  if (sb.status !== 'unpaid') return { error: 'Bill already paid', status: 400 }

  const authorizedAmount = Math.round(sb.total * 1.25) // 25% buffer for tip
  const pi = await getStripe().paymentIntents.create({
    amount: authorizedAmount,
    currency: 'usd',
    capture_method: 'manual',
    metadata: { storeId, sessionId: sb.sessionId, splitBillId, type: 'split-bill-manual' },
  })

  splitBillStore.update(splitBillId, { status: 'pending-capture', paymentIntentId: pi.id })
  return { clientSecret: pi.client_secret!, paymentIntentId: pi.id, authorizedAmount }
}

/** Capture after tip is entered */
export async function captureSplitBillPayment(
  storeId: string, splitBillId: string, tipAmount: number,
): Promise<{ splitBill: SplitBill; sessionFullyPaid: boolean } | Err> {
  const sb = splitBillStore.getById(splitBillId)
  if (!sb || sb.storeId !== storeId) return { error: 'Split bill not found', status: 404 }
  if (sb.status !== 'pending-capture' || !sb.paymentIntentId) return { error: 'No pending capture', status: 400 }

  const tip = tipAmount > 0 ? tipAmount : 0
  const captureAmount = sb.total + tip

  await getStripe().paymentIntents.capture(sb.paymentIntentId, { amount_to_capture: captureAmount })

  const result = addPayment(storeId, sb.sessionId, captureAmount, 'waiter', sb.paymentIntentId)
  if ('error' in result) return { error: result.error, status: 400 }

  splitBillStore.update(splitBillId, {
    status: 'paid', paymentId: result.payment.id,
    paidAt: new Date().toISOString(), method: 'stripe',
  })

  const session = result.session
  const netDue = session.totalAmount - session.discountAmount
  const tax = calcTax(storeId, netDue)
  const fee = calcServiceFee(storeId, netDue)
  const fullyPaid = session.totalPaid >= netDue + tax + fee

  return { splitBill: splitBillStore.getById(splitBillId)!, sessionFullyPaid: fullyPaid }
}
```

**Note:** The `paySplitBillCash` function uses a dynamic import for `paymentStore` to avoid circular dependency issues. If that causes problems, import it at the top alongside the other stores.

- [ ] **Step 2: Create split-bill.routes.ts**

Create `server/src/routes/split-bill.routes.ts`:
```typescript
import { Router } from 'express'
import { requireAuth } from '../middleware/auth.middleware.js'
import { requirePermission } from '../middleware/permission.middleware.js'
import {
  getSplitBills, getMainBillSummary, createSplitBill, deleteSplitBill,
  paySplitBillCard, paySplitBillCash, createManualCaptureIntent, captureSplitBillPayment,
} from '../controllers/split-bill.service.js'

const router = Router({ mergeParams: true })

// GET /sessions/:sessionId/split-bills
router.get('/', requireAuth, requirePermission('tables:read'), (req, res) => {
  const splits = getSplitBills(req.params.sessionId)
  const main = getMainBillSummary(req.params.sessionId, req.params.storeId)
  res.json({ splits, mainBill: main })
})

// POST /sessions/:sessionId/split-bills
router.post('/', requireAuth, requirePermission('tables:write'), (req, res) => {
  const result = createSplitBill(req.params.storeId, req.params.sessionId, req.body)
  if ('error' in result) { res.status(result.status ?? 400).json({ error: result.error }); return }
  res.status(201).json(result)
})

// DELETE /sessions/:sessionId/split-bills/:splitBillId
router.delete('/:splitBillId', requireAuth, requirePermission('tables:write'), (req, res) => {
  const result = deleteSplitBill(req.params.storeId, req.params.splitBillId)
  if ('error' in result) { res.status(result.status ?? 400).json({ error: result.error }); return }
  res.json(result)
})

// POST /sessions/:sessionId/split-bills/:splitBillId/pay-card
router.post('/:splitBillId/pay-card', requireAuth, requirePermission('tables:write'), async (req, res) => {
  if (req.body.captureMethod === 'manual') {
    const result = await createManualCaptureIntent(req.params.storeId, req.params.splitBillId)
    if ('error' in result) { res.status(result.status ?? 400).json({ error: result.error }); return }
    res.json(result); return
  }
  const result = paySplitBillCard(req.params.storeId, req.params.splitBillId, req.body.tipAmount)
  if ('error' in result) { res.status(result.status ?? 400).json({ error: result.error }); return }
  res.json(result)
})

// POST /sessions/:sessionId/split-bills/:splitBillId/pay-cash
router.post('/:splitBillId/pay-cash', requireAuth, requirePermission('tables:write'), (req, res) => {
  const { receivedAmount, tipAmount } = req.body
  if (!receivedAmount || typeof receivedAmount !== 'number') {
    res.status(400).json({ error: 'receivedAmount required' }); return
  }
  const result = paySplitBillCash(req.params.storeId, req.params.splitBillId, receivedAmount, tipAmount)
  if ('error' in result) { res.status(result.status ?? 400).json({ error: result.error }); return }
  res.json(result)
})

// POST /sessions/:sessionId/split-bills/:splitBillId/capture
router.post('/:splitBillId/capture', requireAuth, requirePermission('tables:write'), async (req, res) => {
  const result = await captureSplitBillPayment(req.params.storeId, req.params.splitBillId, req.body.tipAmount ?? 0)
  if ('error' in result) { res.status(result.status ?? 400).json({ error: result.error }); return }
  res.json(result)
})

export default router
```

- [ ] **Step 3: Register routes in app.ts**

In `server/src/app.ts`, add import:
```typescript
import splitBillRoutes from './routes/split-bill.routes.js'
```

Add route registration after the sessions line:
```typescript
app.use('/api/stores/:storeId/sessions/:sessionId/split-bills', splitBillRoutes)
```

- [ ] **Step 4: Verify and commit**

```bash
cd server && ./node_modules/.bin/tsc --noEmit  # check new errors only
git add server/src/controllers/split-bill.service.ts server/src/routes/split-bill.routes.ts server/src/app.ts
git commit -m "feat: SplitBill server — create, delete, pay-card, pay-cash, manual capture"
```

---

### Task 5: SplitBill — Client API + i18n

**Files:**
- Modify: `client/src/services/api.ts`
- Modify: `client/src/i18n/admin.ts`
- Modify: `client/src/i18n/en/admin.json`
- Modify: `client/src/i18n/zh/admin.json`

- [ ] **Step 1: Add split bill API methods**

In `client/src/services/api.ts`, add after the session settlement methods and before the roles section. Also add `SplitBill` to the type import:

```typescript
import type { ..., SplitBill } from '@qr-order/shared'
```

API methods:
```typescript
// Split Bills
getSplitBills: (storeId: string, sessionId: string) =>
  fetchJSON<{ splits: SplitBill[]; mainBill: { subtotal: number; tax: number; serviceFee: number; total: number; itemCount: number } }>(
    `/stores/${storeId}/sessions/${sessionId}/split-bills`,
  ),

createSplitBill: (storeId: string, sessionId: string, data: { type: 'by-item' | 'by-percent'; itemKeys?: string[]; percent?: number; label?: string }) =>
  fetchJSON<SplitBill>(`/stores/${storeId}/sessions/${sessionId}/split-bills`, {
    method: 'POST', body: JSON.stringify(data),
  }),

deleteSplitBill: (storeId: string, sessionId: string, splitBillId: string) =>
  fetchJSON<{ ok: true }>(`/stores/${storeId}/sessions/${sessionId}/split-bills/${splitBillId}`, {
    method: 'DELETE',
  }),

paySplitBillCard: (storeId: string, sessionId: string, splitBillId: string, tipAmount?: number, captureMethod?: 'manual') =>
  fetchJSON<{ splitBill?: SplitBill; sessionFullyPaid?: boolean; clientSecret?: string; paymentIntentId?: string }>(
    `/stores/${storeId}/sessions/${sessionId}/split-bills/${splitBillId}/pay-card`,
    { method: 'POST', body: JSON.stringify({ tipAmount, captureMethod }) },
  ),

paySplitBillCash: (storeId: string, sessionId: string, splitBillId: string, receivedAmount: number, tipAmount?: number) =>
  fetchJSON<{ splitBill: SplitBill; change: number; sessionFullyPaid: boolean }>(
    `/stores/${storeId}/sessions/${sessionId}/split-bills/${splitBillId}/pay-cash`,
    { method: 'POST', body: JSON.stringify({ receivedAmount, tipAmount }) },
  ),

captureSplitBill: (storeId: string, sessionId: string, splitBillId: string, tipAmount: number) =>
  fetchJSON<{ splitBill: SplitBill; sessionFullyPaid: boolean }>(
    `/stores/${storeId}/sessions/${sessionId}/split-bills/${splitBillId}/capture`,
    { method: 'POST', body: JSON.stringify({ tipAmount }) },
  ),
```

- [ ] **Step 2: Add i18n keys to admin.ts zh section**

In `client/src/i18n/admin.ts`, add a `splitBill` section in the zh block (after the `clock` section):
```typescript
splitBill: {
  title: '账单管理', mainBill: '主账单', remaining: '剩余',
  newSplit: '新建分账', split: '分账...', mergeBack: '合并回主账单',
  payCard: '刷卡', payCash: '现金', paid: '已付', unpaid: '未付',
  byItem: '按菜品', byPercent: '按比例',
  confirmMerge: '确认合并？菜品将返回主账单。', cannotMergePaid: '已付账单无法合并',
  tipOptional: '小费（可选）', change: '找零',
  total: '应付金额', sessionTotal: '总金额', sessionPaid: '已付总额', sessionDue: '待付余额',
  pendingCapture: '等待小费', enterTip: '输入小票上的小费', capture: '确认扣款',
},
voidItem: {
  button: '作废', voided: '已作废', reason: '原因（可选）',
  confirm: '作废此菜品？价格将变为 $0。',
},
```

Add the same in the en block:
```typescript
splitBill: {
  title: 'Bill Management', mainBill: 'Main Bill', remaining: 'remaining',
  newSplit: 'New Split Bill', split: 'Split...', mergeBack: 'Merge Back',
  payCard: 'Pay Card', payCash: 'Pay Cash', paid: 'Paid', unpaid: 'Unpaid',
  byItem: 'By Items', byPercent: 'By Percent',
  confirmMerge: 'Merge this bill back? Items will return to the main bill.', cannotMergePaid: 'Cannot merge a paid bill',
  tipOptional: 'Tip (optional)', change: 'Change',
  total: 'Total Due', sessionTotal: 'Session Total', sessionPaid: 'Total Paid', sessionDue: 'Remaining',
  pendingCapture: 'Pending tip', enterTip: 'Enter tip from receipt', capture: 'Charge',
},
voidItem: {
  button: 'Void', voided: 'VOIDED', reason: 'Reason (optional)',
  confirm: 'Void this item? Price will be set to $0.',
},
```

- [ ] **Step 3: Add i18n keys to JSON files**

In `client/src/i18n/en/admin.json`, add:
```json
"splitBill": {
  "title": "Bill Management",
  "mainBill": "Main Bill",
  "remaining": "remaining",
  "newSplit": "New Split Bill",
  "split": "Split...",
  "mergeBack": "Merge Back",
  "payCard": "Pay Card",
  "payCash": "Pay Cash",
  "paid": "Paid",
  "unpaid": "Unpaid",
  "byItem": "By Items",
  "byPercent": "By Percent",
  "confirmMerge": "Merge this bill back? Items will return to the main bill.",
  "tipOptional": "Tip (optional)",
  "change": "Change",
  "total": "Total Due",
  "sessionTotal": "Session Total",
  "sessionPaid": "Total Paid",
  "sessionDue": "Remaining",
  "pendingCapture": "Pending tip",
  "enterTip": "Enter tip from receipt",
  "capture": "Charge"
},
"voidItem": {
  "button": "Void",
  "voided": "VOIDED",
  "reason": "Reason (optional)",
  "confirm": "Void this item? Price will be set to $0."
}
```

In `client/src/i18n/zh/admin.json`, add equivalent zh keys.

- [ ] **Step 4: Verify and commit**

```bash
cd client && ./node_modules/.bin/tsc --noEmit
git add client/src/services/api.ts client/src/i18n/
git commit -m "feat: SplitBill client API methods + i18n keys"
```

---

### Task 6: SplitBillManager UI

**Files:**
- Create: `client/src/components/table/SplitBillManager.tsx`
- Create: `client/src/components/table/CreateSplitSheet.tsx`

- [ ] **Step 1: Create SplitBillManager.tsx**

This is the main bill management dialog that replaces BillSettleDialog when splitting. It shows:
- Main bill card with Pay/Split buttons
- List of sub-bill cards with Pay/Merge buttons
- Session totals footer

The component receives `storeId`, `sessionId`, `open`, `onClose`, and uses the admin i18n via `useT()`. It fetches split bills via `api.getSplitBills()` and refreshes after each action.

This is a large UI component. The agent implementing this should:
1. Read `client/src/components/table/BillSettleDialog.tsx` for the existing settle dialog pattern (Dialog, payment flow, CashPaymentPad usage)
2. Read `client/src/components/customer/SettlementSheet.tsx` for the item selection UI pattern
3. Build the layout from the spec's ASCII art diagram
4. Each sub-bill card: label, type badge, amount, status, action buttons
5. Main bill card: unassigned amount, item count, Pay Card/Pay Cash/Split buttons
6. Footer: session total / paid / due

Keep under 200 lines — delegate item selection to `CreateSplitSheet`.

- [ ] **Step 2: Create CreateSplitSheet.tsx**

A bottom sheet for selecting items to create a new split bill. Two tabs:
- **By Items**: Same qty stepper UI as `SettlementSheet` (reuse the pattern, not the component)
- **By Percent**: Quick presets (25/33/50/100%) + slider

Props: `open`, `onClose`, `storeId`, `sessionId`, `onCreated`

The sheet calls `api.createSplitBill()` on confirm.

Keep under 200 lines.

- [ ] **Step 3: Verify and commit**

```bash
cd client && ./node_modules/.bin/tsc --noEmit
git add client/src/components/table/SplitBillManager.tsx client/src/components/table/CreateSplitSheet.tsx
git commit -m "feat: SplitBillManager + CreateSplitSheet UI components"
```

---

### Task 7: Integration — TablesPage + Void UI

**Files:**
- Modify: `client/src/pages/admin/TablesPage.tsx`

- [ ] **Step 1: Add void button to order items**

In the order item rendering section of TablesPage, add a void button to each non-voided item. Voided items show with strikethrough + "VOIDED" badge.

For each order item card, add:
```tsx
{!it.voided && (
  <Button size="sm" variant="ghost" className="text-red-500 h-6 px-1"
    onClick={async () => {
      const reason = prompt(t.voidItem.reason)
      if (reason === null) return // cancelled
      await api.voidItem(storeId, o.id, i, reason || undefined)
      refresh()
    }}>
    {t.voidItem.button}
  </Button>
)}
```

For voided items, wrap the price display:
```tsx
{it.voided ? (
  <div className="text-right shrink-0">
    <span className="text-xs bg-red-100 text-red-700 rounded px-1.5 py-0.5">{t.voidItem.voided}</span>
    <p className="text-sm text-muted-foreground line-through">{formatPriceUSD(itemPrice(it))}</p>
  </div>
) : (
  <div className="text-right shrink-0">
    <p className="font-semibold text-primary">{formatPriceUSD(itemPrice(it))}</p>
  </div>
)}
```

- [ ] **Step 2: Replace BillSettleDialog with SplitBillManager**

In TablesPage, replace the `BillSettleDialog` import and usage with `SplitBillManager`:

Change import:
```typescript
import SplitBillManager from '@/components/table/SplitBillManager'
```

Replace the dialog rendering:
```tsx
{sessionDialogOpen && selected?.currentSessionId && storeId && (
  <SplitBillManager
    open={sessionDialogOpen}
    onClose={() => { setSessionDialogOpen(false); fetchData() }}
    storeId={storeId}
    sessionId={selected.currentSessionId}
  />
)}
```

- [ ] **Step 3: Verify and commit**

```bash
cd client && ./node_modules/.bin/tsc --noEmit
git add client/src/pages/admin/TablesPage.tsx
git commit -m "feat: integrate SplitBillManager + void items in TablesPage"
```

---

### Task 8: Final Verification + Push

- [ ] **Step 1: Full TypeScript check**

```bash
cd client && ./node_modules/.bin/tsc --noEmit
cd ../server && ./node_modules/.bin/tsc --noEmit
```

- [ ] **Step 2: Commit and push**

```bash
git add -A
git status
git push origin main
```

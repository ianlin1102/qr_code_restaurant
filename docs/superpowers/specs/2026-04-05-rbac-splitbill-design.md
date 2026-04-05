# Feature Spec: RBAC Gaps Fix + Split Bill Entity Redesign

**Date:** 2026-04-05
**Status:** Draft

---

## Part 1: RBAC Permission Gaps Fix

### Gaps Found

| Feature | Current Nav Perm | Fix |
|---------|-----------------|-----|
| Settings (MorePage) | None | Add `perm: 'settings:read'` |
| Waitlist | None | Add `perm: 'tables:read'` |
| Clock | None | Keep as-is (all staff need clock access, PIN is auth) |

### Changes

**`client/src/components/layout/AdminLayout.tsx`:**
```typescript
{ to: '/admin/waitlist', navKey: 'waitlist', icon: '👥', perm: 'tables:read' },
```

**`client/src/pages/admin/MorePage.tsx`:**
```typescript
{ to: '/admin/settings', navKey: 'settings', icon: '⚙️', perm: 'settings:read' },
```

### Files to Modify

| File | Change |
|------|--------|
| `client/src/components/layout/AdminLayout.tsx` | Add `perm: 'tables:read'` to waitlist nav item |
| `client/src/pages/admin/MorePage.tsx` | Add `perm: 'settings:read'` to settings item |

---

## Part 2: Split Bill Entity + Admin Bill Management

### Overview

Introduce a formal `SplitBill` entity so waiters can:
1. Split a session's items into multiple independent sub-bills
2. Pay each sub-bill separately (cash or card)
3. Merge a sub-bill back to the main bill if split was wrong
4. Use by-percent to split remaining (unassigned) items

### Concepts

- **Main bill**: Items NOT assigned to any SplitBill. Always exists implicitly.
- **Sub-bill**: A `SplitBill` entity containing specific items or a percentage of the remaining.
- **Payment complete**: `session.totalPaid >= netDue + tax + serviceFee` (tip excluded).

### Data Model

#### New Type: `SplitBill` (`shared/types.ts`)

```typescript
interface SplitBill {
  id: string
  sessionId: string
  storeId: string
  label: string               // "Bill 1", "Bill 2", auto-generated
  type: 'by-item' | 'by-percent'
  itemKeys?: string[]         // "orderId:idx:qty" — items assigned to this sub-bill
  percent?: number            // 1-100, applied to remaining unassigned total
  subtotal: number            // cents, calculated from items or percent
  tax: number                 // cents
  serviceFee: number          // cents
  total: number               // subtotal + tax + serviceFee
  status: 'unpaid' | 'paid'
  paymentId?: string          // → Payment.id once paid
  paidAt?: string             // ISO timestamp
  method?: 'stripe' | 'cash'  // payment method used
  createdAt: string
}
```

#### Storage

- New JSON store: `server/data/split-bills.json` → `[]`
- Singleton in `repositories/stores.ts`: `splitBillStore`

#### Session Changes

No changes to Session type. SplitBills reference sessionId. The "main bill" is implicit (items not in any SplitBill's itemKeys).

### Split Bill Lifecycle

```
┌─────────────────────────────────────────────┐
│ Session with orders (all items = main bill)  │
└───────────────────┬─────────────────────────┘
                    │ Waiter clicks "Split Bill"
                    ▼
┌─────────────────────────────────────────────┐
│ Split Mode: select items → Create Sub-Bill   │
│                                              │
│  [Main Bill: remaining items]                │
│  [Sub-Bill 1: selected items] → Pay ($/💳)   │
│  [Sub-Bill 2: by-percent 50%] → Pay ($/💳)   │
│                                              │
│  [Merge Sub-Bill back to Main]               │
└───────────────────┬─────────────────────────┘
                    │ All sub-bills + main paid
                    ▼
┌─────────────────────────────────────────────┐
│ Session fully paid → auto-close              │
└─────────────────────────────────────────────┘
```

### API Endpoints

All under `/api/stores/:storeId/sessions/:sessionId/split-bills`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | JWT (tables:read) | List all split bills for session |
| POST | `/` | JWT (tables:write) | Create split bill (by-item or by-percent) |
| DELETE | `/:splitBillId` | JWT (tables:write) | Merge back to main (delete split bill) |
| POST | `/:splitBillId/pay-card` | JWT (tables:write) | Pay sub-bill via card (creates Payment) |
| POST | `/:splitBillId/pay-cash` | JWT (tables:write) | Pay sub-bill via cash (creates Payment, calculates change) |

#### `POST /split-bills` — Create Split Bill

Request (by-item):
```json
{
  "type": "by-item",
  "itemKeys": ["order1:0:2", "order1:1:1"],
  "label": "Bill 1"
}
```

Request (by-percent):
```json
{
  "type": "by-percent",
  "percent": 50,
  "label": "Bill 2"
}
```

Server logic:
1. Validate session exists and is active
2. For by-item: validate items exist, not already assigned to another SplitBill, quantity available
3. For by-percent: calculate based on remaining unassigned items total
4. Compute subtotal, tax, serviceFee, total
5. Create SplitBill with status 'unpaid'
6. Return the created SplitBill

Response:
```json
{
  "id": "sb-xxx",
  "sessionId": "sess-xxx",
  "label": "Bill 1",
  "type": "by-item",
  "itemKeys": ["order1:0:2", "order1:1:1"],
  "subtotal": 2500,
  "tax": 222,
  "serviceFee": 0,
  "total": 2722,
  "status": "unpaid",
  "createdAt": "..."
}
```

#### `DELETE /split-bills/:splitBillId` — Merge Back to Main

- Only allowed if status is 'unpaid'
- Delete the SplitBill record → items automatically return to main bill (implicit)
- If status is 'paid', return 400 "Cannot merge a paid bill"

#### `POST /split-bills/:splitBillId/pay-card` — Card Payment

Request:
```json
{
  "tipAmount": 500
}
```

Server logic:
1. Validate split bill exists, status is 'unpaid'
2. `chargeAmount = splitBill.total + tipAmount`
3. Record Payment via `addPayment(storeId, sessionId, chargeAmount, 'waiter', null)`
4. Update SplitBill: `status: 'paid', paymentId, paidAt, method: 'stripe'`
5. Check if session is fully paid → auto-close

Response:
```json
{
  "splitBill": { ... updated ... },
  "payment": { ... },
  "sessionFullyPaid": true
}
```

Note: For actual Stripe terminal integration (physical card reader), this would create a PaymentIntent. For MVP, this records the payment as "card" without Stripe — the waiter runs the card on a separate terminal and confirms in the app.

#### `POST /split-bills/:splitBillId/pay-cash` — Cash Payment

Request:
```json
{
  "receivedAmount": 3000,
  "tipAmount": 300
}
```

Server logic:
1. `chargeAmount = splitBill.total + tipAmount`
2. Validate `receivedAmount >= chargeAmount`
3. Record Payment
4. Update SplitBill status
5. Return change: `receivedAmount - chargeAmount`

### "Main Bill" Calculation

The main bill is everything NOT assigned to a SplitBill:

```typescript
function getMainBillSummary(sessionId: string, storeId: string) {
  const session = sessionStore.getById(sessionId)
  const splitBills = splitBillStore.getByField('sessionId', sessionId)
  
  // Collect all item keys assigned to split bills
  const assignedKeys = new Set<string>()
  for (const sb of splitBills) {
    if (sb.type === 'by-item' && sb.itemKeys) {
      sb.itemKeys.forEach(k => assignedKeys.add(k))
    }
  }
  
  // Calculate unassigned items total
  const orders = session.orderIds.map(id => orderStore.getById(id)).filter(Boolean)
  let unassignedSubtotal = 0
  for (const order of orders) {
    order.items.forEach((item, idx) => {
      const key = `${order.id}:${idx}`
      // Check how much qty is assigned
      let assignedQty = 0
      for (const k of assignedKeys) {
        if (k.startsWith(key + ':')) assignedQty += parseInt(k.split(':')[2], 10)
        else if (k === key) assignedQty = item.quantity
      }
      const remainingQty = item.quantity - assignedQty
      if (remainingQty > 0) {
        const unitPrice = item.price + (item.selectedOptions ?? []).reduce((s, o) => s + o.priceAdjust, 0)
        unassignedSubtotal += unitPrice * remainingQty
      }
    })
  }
  
  // Subtract percent-based split bill amounts from unassigned total
  const percentSplitTotal = splitBills
    .filter(sb => sb.type === 'by-percent' && sb.status === 'unpaid')
    .reduce((sum, sb) => sum + sb.subtotal, 0)
  
  const mainSubtotal = Math.max(0, unassignedSubtotal - percentSplitTotal)
  const tax = calcTax(storeId, mainSubtotal)
  const fee = calcServiceFee(storeId, mainSubtotal)
  
  return { subtotal: mainSubtotal, tax, serviceFee: fee, total: mainSubtotal + tax + fee }
}
```

### Admin UI: BillSettleDialog Redesign

Replace the current `BillSettleDialog` with a new split-aware bill management dialog.

#### Layout

```
┌──────────────────────────────────────────────┐
│ Session Bill Management                       │
│ Table: T1 · 3 orders · $125.00 total         │
├──────────────────────────────────────────────┤
│                                              │
│ ┌──────────────────────────────────────────┐ │
│ │ 🟢 Main Bill          $75.00            │ │
│ │    3 items remaining                     │ │
│ │    [Pay Card] [Pay Cash] [Split...]      │ │
│ └──────────────────────────────────────────┘ │
│                                              │
│ ┌──────────────────────────────────────────┐ │
│ │ 🔴 Bill 1 (by items)   $30.00   UNPAID  │ │
│ │    2x Kung Pao Chicken, 1x Rice          │ │
│ │    [Pay Card] [Pay Cash] [← Merge Back]  │ │
│ └──────────────────────────────────────────┘ │
│                                              │
│ ┌──────────────────────────────────────────┐ │
│ │ ✅ Bill 2 (50%)        $20.00   PAID    │ │
│ │    Paid via card at 8:45 PM              │ │
│ └──────────────────────────────────────────┘ │
│                                              │
│ ─────────────────────────────────────────── │
│ Total: $125.00  Paid: $20.00  Due: $105.00  │
│                                              │
│ [+ New Split Bill]                           │
│ [Close Session] (enabled when fully paid)    │
└──────────────────────────────────────────────┘
```

#### "Split..." Button Flow

1. Waiter clicks "Split..." on main bill (or "+ New Split Bill")
2. Opens a sheet/dialog showing all unassigned items with qty steppers (same UI as customer SettlementSheet by-item tab)
3. Waiter selects items → sees subtotal + tax preview
4. Option to switch to "by percent" tab (like customer flow)
5. Confirm → creates SplitBill → returns to bill management view

#### Pay Cash Sub-Flow

1. Waiter clicks "Pay Cash" on a sub-bill
2. Opens CashPaymentPad (existing component)
3. Optional tip input
4. Enter received amount → shows change
5. Confirm → records payment → sub-bill marked as paid

#### Pay Card Sub-Flow (MVP)

1. Waiter clicks "Pay Card" on a sub-bill
2. Optional tip input
3. Confirm → records payment as card (no Stripe terminal for MVP)
4. Sub-bill marked as paid

#### Merge Back

1. Waiter clicks "← Merge Back" on an unpaid sub-bill
2. Confirmation prompt
3. SplitBill deleted → items return to main bill
4. View refreshes

### Integration with Customer-Side Settlement

The customer SettlementSheet continues to work as-is for direct customer payment. When a customer pays via SettlementSheet:
- A Payment record is created on the session
- `paidItemIds` is updated
- This is separate from the SplitBill system (SplitBills are admin-created)

If the admin has created SplitBills AND the customer also pays through SettlementSheet, both payment paths increment `session.totalPaid`. The session auto-closes when fully paid regardless of path.

### Files to Create

| File | Purpose |
|------|---------|
| `server/data/split-bills.json` | Initial empty array |
| `server/src/controllers/split-bill.service.ts` | Business logic: create, delete (merge), pay, getMainBill |
| `server/src/routes/split-bill.routes.ts` | Route handlers for split bill CRUD + pay |
| `client/src/components/table/SplitBillManager.tsx` | New admin UI: bill list + split + pay |
| `client/src/components/table/CreateSplitSheet.tsx` | Item selection sheet for creating a split bill |

### Files to Modify

| File | Change |
|------|--------|
| `shared/types.ts` | Add `SplitBill` type |
| `server/src/repositories/stores.ts` | Add `splitBillStore` singleton |
| `server/src/app.ts` | Register split-bill routes |
| `client/src/services/api.ts` | Add split bill API methods |
| `client/src/pages/admin/TablesPage.tsx` | Replace BillSettleDialog with SplitBillManager |
| `client/src/i18n/admin.ts` | Add split bill translation keys |
| `client/src/i18n/en/admin.json` | Add split bill keys |
| `client/src/i18n/zh/admin.json` | Add split bill keys |
| `client/src/components/layout/AdminLayout.tsx` | Fix waitlist perm |
| `client/src/pages/admin/MorePage.tsx` | Fix settings perm |

### Waiter Card Payment: Manual Capture (Tip-on-Receipt)

Two card payment flows depending on who holds the phone:

**Flow A: Customer pays on phone (existing)**
- Customer selects tip in TipSelector → PaymentIntent created with `amount = subtotal + tip`
- One-step charge, `capture_method: 'automatic'` (default)

**Flow B: Waiter takes card, customer writes tip on receipt**
1. Waiter taps "Pay Card" on a sub-bill
2. App creates PaymentIntent with `capture_method: 'manual'`, `amount = splitBill.total × 1.25` (25% buffer for tip)
3. Customer taps/inserts card → Stripe authorizes (hold, no charge yet)
4. Customer writes tip on receipt
5. Waiter enters tip amount in the app
6. App calls `stripe.paymentIntents.capture(piId, { amount_to_capture: splitBill.total + tipAmount })`
7. Uncaptured portion auto-released to customer

**API:**

`POST /split-bills/:splitBillId/pay-card` request:
```json
{
  "captureMethod": "manual",
  "tipAmount": 0
}
```

Response includes `clientSecret` for Stripe Elements / terminal.

New endpoint for capture after tip:
`POST /split-bills/:splitBillId/capture`
```json
{
  "paymentIntentId": "pi_xxx",
  "tipAmount": 500
}
```

Server calls `stripe.paymentIntents.capture(piId, { amount_to_capture: splitBill.total + tipAmount })`.

**Timeout:** Uncaptured PaymentIntents expire after 7 days (Stripe default). Admin UI should show "Pending capture" status and allow manual capture or void.

**Implementation:** Add `captureMethod` param to `createPaymentIntentForSession`. If `'manual'`, multiply amount by 1.25 for authorization buffer. New `captureSplitBillPayment` service function.

---

### Void Items

Waiters can **void** individual items on an order. Voiding sets the item's effective price to 0 and excludes it from revenue/analytics.

**Data model change — OrderItem:**
```typescript
interface OrderItem {
  // ... existing fields ...
  voided?: boolean        // true = price treated as 0, excluded from sales
  voidedAt?: string       // ISO timestamp
  voidedBy?: string       // userId of waiter who voided
  voidReason?: string     // optional reason
}
```

**Behavior:**
- Voided item stays on the order (visible in history with strikethrough)
- `item.voided === true` → effective price = 0 in all calculations
- Session `totalAmount` recalculated after void
- Split bills containing voided items: recalculate amounts
- Analytics: voided items excluded from revenue, counted separately as "voided"

**API:**

`PATCH /orders/:orderId/items/:itemIndex/void`
```json
{
  "reason": "Customer complaint"
}
```

Auth: `requireAuth` + `orders:write`

Server logic:
1. Set `order.items[itemIndex].voided = true`, `voidedAt`, `voidedBy`
2. Recalculate `order.totalPrice` (exclude voided items)
3. Call `recalcSessionTotal(sessionId)` to update session
4. Recalculate any affected SplitBills

**UI in TablesPage detail panel:**
- Each order item shows a "Void" button (icon: slash/ban)
- Voided items show with strikethrough text, $0.00 price, "VOIDED" badge
- Optional: prompt for void reason

**Analytics impact:**
- `analytics.service.ts` should filter `voided` items from revenue calculations
- Add "Voided Items" section to analytics: count + total value voided

### Files for Void Feature

| File | Change |
|------|--------|
| `shared/types.ts` | Add `voided`, `voidedAt`, `voidedBy`, `voidReason` to `OrderItem` |
| `server/src/controllers/order.service.ts` | Add `voidItem()` function |
| `server/src/routes/order.routes.ts` | Add `PATCH /:orderId/items/:itemIndex/void` |
| `server/src/controllers/session.service.ts` | Update `recalcSessionTotal` to exclude voided items |
| `server/src/controllers/analytics.service.ts` | Exclude voided from revenue |
| `client/src/services/api.ts` | Add `voidItem()` method |
| `client/src/pages/admin/TablesPage.tsx` | Add void button to order items |

---

### i18n Keys

```
splitBill.title: "Bill Management" / "账单管理"
splitBill.mainBill: "Main Bill" / "主账单"
splitBill.remaining: "remaining" / "剩余"
splitBill.newSplit: "New Split Bill" / "新建分账"
splitBill.split: "Split..." / "分账..."
splitBill.mergeBack: "Merge Back" / "合并回主账单"
splitBill.payCard: "Pay Card" / "刷卡"
splitBill.payCash: "Pay Cash" / "现金"
splitBill.paid: "Paid" / "已付"
splitBill.unpaid: "Unpaid" / "未付"
splitBill.byItem: "By Items" / "按菜品"
splitBill.byPercent: "By Percent" / "按比例"
splitBill.confirmMerge: "Merge this bill back? Items will return to the main bill." / "确认合并？菜品将返回主账单。"
splitBill.cannotMergePaid: "Cannot merge a paid bill" / "已付账单无法合并"
splitBill.tipOptional: "Tip (optional)" / "小费（可选）"
splitBill.change: "Change" / "找零"
splitBill.total: "Total Due" / "应付金额"
splitBill.sessionTotal: "Session Total" / "总金额"
splitBill.sessionPaid: "Total Paid" / "已付总额"
splitBill.sessionDue: "Remaining" / "待付余额"
splitBill.pendingCapture: "Pending tip" / "等待小费"
splitBill.enterTip: "Enter tip from receipt" / "输入小票上的小费"
splitBill.capture: "Charge" / "确认扣款"
void.button: "Void" / "作废"
void.voided: "VOIDED" / "已作废"
void.reason: "Reason (optional)" / "原因（可选）"
void.confirm: "Void this item? Price will be set to $0." / "作废此菜品？价格将变为 $0。"
```

---

## Implementation Order

1. **RBAC fixes** — tiny, 2 files
2. **Void items** — data model + API + UI (independent)
3. **SplitBill data model + server** — types, store, service, routes (includes manual capture)
4. **SplitBillManager UI** — admin bill management dialog (includes capture flow for tip-on-receipt)
5. **CreateSplitSheet UI** — item selection for creating splits
6. **Integration + TablesPage** — wire up to existing flow

Items 1-3 are independent and can run in parallel. 4-5 depend on 3. 6 depends on 4-5.

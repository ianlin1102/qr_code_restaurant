# Shared Pricing Calculation Layer — Design Spec

> Date: 2026-04-05
> Status: Approved

## Problem

Payment calculation logic is scattered across multiple files on both server and client. The same price formulas are duplicated in `cart-store.ts`, `session.service.ts`, `split-bill.service.ts`, `CheckoutPage.tsx`, and `SettlementSheet.tsx`. This causes price drift — the same item can show different amounts depending on which code path runs the calculation.

## Goal

Create a **shared pure-function calculation layer** (`shared/pricing/`) that serves as the single source of truth for all price calculations. Both server and client import the same functions. Server remains the final authority for actual charges; client uses the same functions for display previews.

## Architecture: Three-Layer Pure Functions

```
shared/pricing/
├── types.ts          ← Interfaces: PricingItem, TaxConfig, BillInput, DailySalesSnapshot
├── item.ts           ← Layer 1: Menu item pricing
├── tax.ts            ← Layer 2: Tax, service fee, tip
├── settlement.ts     ← Layer 3: Bill summary, split, validation
├── stats.ts          ← Sales statistics aggregation
└── index.ts          ← Unified re-exports
```

Each layer depends only on the layer above it. All functions are pure — explicit inputs, no side effects, no store/DB access.

---

## Layer 1: `item.ts` — Menu Item Pricing

### Interface

```typescript
interface PricingItem {
  price: number                           // Base price (cents)
  quantity: number
  options?: { priceAdjust: number }[]     // Selected option adjustments
}
```

`PricingItem` is a minimal calculation interface. It does NOT replace `MenuItem`, `OrderItem`, or `CartItem` — those retain their full descriptions for display. Callers map their business objects to `PricingItem` before calling.

### Functions

| Function | Signature | Formula |
|----------|-----------|---------|
| `unitPrice` | `(item: PricingItem) => number` | `price + sum(options.priceAdjust)` |
| `lineTotal` | `(item: PricingItem) => number` | `unitPrice(item) * quantity` |
| `subtotal` | `(items: PricingItem[]) => number` | `sum(lineTotal(each))` |

### Rules
- Caller is responsible for filtering voided items before passing in
- All values in cents (integers), no floating point

---

## Layer 2: `tax.ts` — Tax, Service Fee, Tip

### Interface

```typescript
interface TaxConfig {
  taxRate: number        // Percentage, e.g. 8.875
  serviceFeeRate: number // Percentage, e.g. 15
}
```

### Functions

| Function | Signature | Formula |
|----------|-----------|---------|
| `calcTax` | `(subtotal: number, taxRate: number) => number` | `Math.round(subtotal * taxRate / 100)` |
| `calcServiceFee` | `(subtotal: number, serviceFeeRate: number) => number` | `Math.round(subtotal * serviceFeeRate / 100)` |
| `calcTip` | `(baseAmount: number, tipType: 'percent' \| 'fixed', tipValue: number) => number` | percent: `Math.round(baseAmount * tipValue / 100)`, fixed: `tipValue` |
| `calcTaxAndFees` | `(subtotal: number, config: TaxConfig) => { tax, serviceFee, totalWithTax }` | Convenience wrapper |

### Rules
- Tax and service fee are calculated on subtotal only (never on tip)
- Tip has **no minimum** — any amount including 0 or 1 cent is valid
- Rounding: `Math.round` (half-up) applied individually to tax and service fee

---

## Layer 3: `settlement.ts` — Bill Summary, Split, Validation

### Bill Summary

```typescript
interface BillInput {
  totalAmount: number      // Sum of all order item prices (cents)
  discountAmount: number   // Coupon discount
  totalPaid: number        // Sum of all payments received
  taxRate: number
  serviceFeeRate: number
}

calcBillSummary(input: BillInput): {
  netDue: number         // totalAmount - discountAmount
  tax: number
  serviceFee: number
  totalWithTax: number   // netDue + tax + serviceFee
  remaining: number      // max(0, totalWithTax - totalPaid)
  isPaid: boolean        // totalPaid >= totalWithTax && totalWithTax > 0
}
```

### Split By Item

```typescript
interface SplitByItemInput {
  items: PricingItem[]       // Selected items to pay
  taxRate: number
  serviceFeeRate: number
}

calcSplitByItem(input: SplitByItemInput): {
  subtotal: number
  tax: number
  serviceFee: number
  total: number
}
```

### Split By Percent

```typescript
calcSplitByPercent(remaining: number, percent: number): {
  splitAmount: number    // Math.round(remaining * percent / 100)
  leftover: number       // remaining - splitAmount
}
```

### Split Validation

```typescript
validateSplit(
  splitTotal: number,
  remainingAfterSplit: number,
  percent: number
): { valid: true } | { valid: false; reason: string }
```

**Rules:**
- If `percent === 100` → always valid (full payment)
- If `splitTotal < 100` → invalid: split amount must be >= $1.00
- If `remainingAfterSplit < 100` → invalid: remaining must be >= $1.00
- Both sides (split and leftover) include tax + service fee in the threshold check
- These rules apply to BOTH by-item and by-percent splits

---

## Sales Statistics: `stats.ts`

### Data Structure — Daily Snapshot

```typescript
interface DailyItemStat {
  itemId: string
  name: string
  count: number       // Units sold
  revenue: number     // cents, food subtotal (no tax/fee/tip)
}

interface DailySalesSnapshot {
  date: string        // "YYYY-MM-DD"
  storeId: string
  totalOrders: number
  totalRevenue: number
  items: DailyItemStat[]
}
```

### Functions

| Function | Purpose |
|----------|---------|
| `buildDailySnapshot(storeId, date, orders)` | Generate snapshot from raw orders. Uses `item.ts` `lineTotal` for revenue. |
| `aggregateSnapshots(snapshots[])` | Merge multiple daily snapshots. Sum count/revenue by itemId. |
| `topItems(items, by: 'count' \| 'revenue', limit?)` | Sort + top N (default 10). |

### Storage

```
server/data/stats/{storeId}/YYYY-MM-DD.json
```

- ~5-6 KB per day per store (~2 MB/year)
- Cold data: historical days, immutable once written
- Hot data: current day, updated on session close or daily cron
- Query: read N daily files → `aggregateSnapshots()` → return
- PostgreSQL migration: maps directly to `daily_item_sales` table

---

## Stripe Amount Verification Chain

The amount a customer sees on CheckoutPage MUST equal what Stripe charges and what OrderConfirmPage displays.

```
Verification chain:
  server calculates amount
    → createPaymentIntent returns { amount }
    → CheckoutPage displays this exact amount (no client recalculation)
    → Stripe charges PI.amount
    → Webhook confirms pi.amount
    → Payment record stores amount
    → OrderConfirmPage reads payment.amount

Rule: Once createPaymentIntent returns an amount, the client MUST display
that server-returned value. Client shared/pricing is for pre-checkout
previews ONLY. After entering Stripe flow, all displayed amounts come
from server/PI responses.
```

---

## Frontend vs Server Responsibility

| Scenario | Who calculates | Source |
|----------|---------------|--------|
| Cart item price (browsing) | Client | `shared/pricing` `unitPrice` / `lineTotal` |
| Cart subtotal | Client | `shared/pricing` `subtotal` |
| Tip preview | Client | `shared/pricing` `calcTip` |
| Split preview + validation | Client | `shared/pricing` `calcSplitByPercent` + `validateSplit` |
| Session remaining (display) | Server → API | `shared/pricing` `calcBillSummary` (called by server) |
| Actual charge amount | Server | `shared/pricing` (server calls, then creates PI) |
| Checkout page amount | Server response | `createPaymentIntent` returned `amount` |
| Confirm page amount | Server response | `payment.amount` from record |
| Tax / service fee | Server → API | `shared/pricing` `calcTaxAndFees` (called by server) |

**Principle:** Client uses `shared/pricing` for display previews. Server uses the same functions for authoritative amounts. Both run identical code, but server's result is final.

---

## Files Changed

### New Files

| File | Purpose |
|------|---------|
| `shared/pricing/types.ts` | Calculation interfaces |
| `shared/pricing/item.ts` | Item-level pricing |
| `shared/pricing/tax.ts` | Tax, fee, tip |
| `shared/pricing/settlement.ts` | Bill summary, split, validation |
| `shared/pricing/stats.ts` | Sales aggregation |
| `shared/pricing/index.ts` | Re-exports |
| `shared/pricing/__tests__/item.test.ts` | Item calculation tests |
| `shared/pricing/__tests__/tax.test.ts` | Tax/fee/tip tests |
| `shared/pricing/__tests__/settlement.test.ts` | Settlement + split tests |
| `shared/pricing/__tests__/stats.test.ts` | Statistics tests |

### Modified Files (replace inline calculations with shared/pricing imports)

| File | Change | Size |
|------|--------|------|
| `server/src/controllers/session.service.ts` | Remove `calcTax`, `calcServiceFee`; delegate `getSessionSummary`, `payByItems`, `payByPercent` calculations | Large |
| `server/src/controllers/split-bill.service.ts` | `getMainBillSummary`, `createSplitBill` use shared/pricing | Medium |
| `server/src/controllers/split-bill-payment.service.ts` | Amount calculations delegate to shared/pricing | Small |
| `server/src/controllers/payment.service.ts` | `createPaymentIntent*` use shared/pricing for amounts | Medium |
| `client/src/stores/cart-store.ts` | Replace local `unitPrice` with `import { unitPrice } from 'shared/pricing'` | Small |
| `client/src/pages/customer/CheckoutPage.tsx` | Tip calculation uses `calcTip` | Small |
| `client/src/components/customer/SettlementSheet.tsx` | Split preview + validation uses shared/pricing | Small |
| `client/src/components/table/CreateSplitSheet.tsx` | Same as SettlementSheet | Small |

### Untouched
- `shared/types.ts` — business types unchanged
- All route files — parameter parsing only
- All UI rendering logic — data source changes, display unchanged
- `bee/` — not part of build

---

## Test Plan

### Unit Tests (shared/pricing/__tests__/)

**item.test.ts:**
- Base price, no options
- Multiple options with positive priceAdjust
- Option with priceAdjust = 0
- quantity = 1 and quantity > 1
- Empty array → subtotal = 0

**tax.test.ts:**
- Standard rates (8.875% tax, 15% service fee)
- Rate = 0
- Rounding boundary: subtotal * rate produces .5 (Math.round behavior)
- Tip percent at various levels + custom fixed
- Tip = 1 cent → valid (no minimum)
- Tip = 0 → valid

**settlement.test.ts:**

| Category | Test Case |
|----------|-----------|
| Basic remaining | totalWithTax - totalPaid = remaining |
| Fully paid | remaining = 0, isPaid = true |
| Overpaid | totalPaid > totalWithTax → remaining = 0 (no negative) |
| Split $1 limit | splitTotal = 99 cents → invalid |
| Remaining $1 limit | remaining - splitTotal = 50 cents → invalid |
| Both sides exactly $1 | split = 100, leftover = 100 → valid |
| 100% full pay exempt | percent = 100, leftover = 0 → valid |
| 1% tiny split | total $5, 1% = 5 cents → invalid (< $1) |
| 99% split | total $5, 99% → leftover = 5 cents → invalid |
| By-item partial qty | 3 items, pay 2 → correct amount |
| By-item paid overlap | Already-paid items → qty deduction correct |
| Discount + split | Coupon discount applied → remaining correct |

**stats.test.ts:**
- Single day, single item
- Multi-day aggregation: count/revenue accumulate
- topItems sort + limit
- Empty order day → zero-value snapshot (no error)

### Integration Tests (server)

**Full payment flow verification:**
1. Create order with known items + prices
2. `getSessionSummary` → verify netDue / tax / fee / totalWithTax
3. `createPaymentIntentForSession` → verify amount = remaining + tip
4. Simulate webhook → verify totalPaid updated
5. `getSessionSummary` again → verify remaining = 0, isPaid = true

**Split flow verification:**
1. Create order → session summary
2. Split 50% → verify both sides >= $1
3. Pay split → verify session.totalPaid increases by split total
4. Pay main bill → verify remaining = 0, isPaid = true

**Edge cases:**
- Split where one side would be < $1 → rejected
- Multiple sequential splits exhausting the bill
- Split + coupon discount interaction
- Pay-first flow: PI amount matches cart subtotal + tip

---

## PostgreSQL Migration Readiness

- All `shared/pricing/` functions are pure — zero dependency on storage layer
- `buildDailySnapshot` takes `Order[]` — works with JSON or Prisma query results
- Daily snapshot JSON structure maps 1:1 to `daily_item_sales` table:
  ```sql
  CREATE TABLE daily_item_sales (
    store_id TEXT, date DATE, item_id TEXT, item_name TEXT,
    count INT, revenue INT,
    PRIMARY KEY (store_id, date, item_id)
  );
  ```
- Migration path: read JSON snapshots → bulk INSERT → switch to DB queries

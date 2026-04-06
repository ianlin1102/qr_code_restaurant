# Shared Pricing Calculation Layer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create `shared/pricing/` as the single source of truth for all price calculations, replace scattered inline calculations across server and client, add Vitest test suite.

**Architecture:** Pure functions organized in three layers (item → tax → settlement) plus a stats module. All functions take explicit parameters, have no side effects, no DB/store access. Server and client import the same code via `@qr-order/shared` pnpm workspace.

**Tech Stack:** TypeScript, Vitest (new — no test framework exists yet), pnpm workspace

---

## Task 1: Set Up Vitest in shared/

**Files:**
- Create: `shared/pricing/types.ts`
- Create: `shared/vitest.config.ts`
- Modify: `shared/package.json`
- Modify: `package.json` (root — add test script)

- [ ] **Step 1: Install Vitest in shared workspace**

```bash
cd /Users/evergreen/Desktop/个人代码/QR_Code
pnpm --filter @qr-order/shared add -D vitest typescript
```

- [ ] **Step 2: Create `shared/vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['pricing/__tests__/**/*.test.ts'],
  },
})
```

- [ ] **Step 3: Create `shared/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "outDir": "dist"
  },
  "include": ["types.ts", "pricing/**/*"]
}
```

- [ ] **Step 4: Update `shared/package.json`**

```json
{
  "name": "@qr-order/shared",
  "version": "0.0.1",
  "private": true,
  "main": "types.ts",
  "exports": {
    ".": "./types.ts",
    "./pricing": "./pricing/index.ts"
  },
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "vitest": "...",
    "typescript": "..."
  }
}
```

Note: Keep existing `"main": "types.ts"` so current imports of `@qr-order/shared` are unaffected. The new `"./pricing"` export enables `import { unitPrice } from '@qr-order/shared/pricing'`.

- [ ] **Step 5: Add root test script**

In root `package.json`, add to scripts:

```json
"test": "pnpm --filter @qr-order/shared test",
"test:watch": "pnpm --filter @qr-order/shared test:watch"
```

- [ ] **Step 6: Create `shared/pricing/types.ts`** (calculation-only interfaces)

```typescript
/**
 * Minimal interface for price calculation.
 * Does NOT replace OrderItem/CartItem/MenuItem — those keep their full
 * descriptions for display. Callers map business objects to PricingItem.
 */
export interface PricingItem {
  price: number                           // Base price (cents)
  quantity: number
  options?: { priceAdjust: number }[]     // Selected option adjustments
}

export interface TaxConfig {
  taxRate: number        // Percentage, e.g. 8.875
  serviceFeeRate: number // Percentage, e.g. 15
}

export interface BillInput {
  totalAmount: number      // Sum of all order item prices (cents, no tax/fee)
  discountAmount: number   // Coupon discount (cents)
  totalPaid: number        // Sum of all payment amounts received (cents)
  taxRate: number          // Percentage
  serviceFeeRate: number   // Percentage
}

export interface BillSummary {
  netDue: number
  tax: number
  serviceFee: number
  totalWithTax: number
  remaining: number
  isPaid: boolean
}

export interface SplitByItemInput {
  items: PricingItem[]
  taxRate: number
  serviceFeeRate: number
}

export interface SplitByItemResult {
  subtotal: number
  tax: number
  serviceFee: number
  total: number
}

export interface SplitByPercentResult {
  splitAmount: number
  leftover: number
}

export interface SplitValidation {
  valid: boolean
  reason?: string
}

export interface DailyItemStat {
  itemId: string
  name: string
  count: number    // Units sold
  revenue: number  // cents, food subtotal only (no tax/fee/tip)
}

export interface DailySalesSnapshot {
  date: string     // "YYYY-MM-DD"
  storeId: string
  totalOrders: number
  totalRevenue: number // cents
  items: DailyItemStat[]
}
```

- [ ] **Step 7: Verify setup**

```bash
cd /Users/evergreen/Desktop/个人代码/QR_Code
pnpm --filter @qr-order/shared test
```

Expected: "No test files found" (no tests yet, but Vitest runs without errors).

- [ ] **Step 8: Commit**

```bash
git add shared/pricing/types.ts shared/vitest.config.ts shared/tsconfig.json shared/package.json package.json
git commit -m "chore: add Vitest to shared/, create pricing type definitions"
```

---

## Task 2: `shared/pricing/item.ts` — Item-Level Pricing

**Files:**
- Create: `shared/pricing/__tests__/item.test.ts`
- Create: `shared/pricing/item.ts`

- [ ] **Step 1: Write failing tests** — `shared/pricing/__tests__/item.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { unitPrice, lineTotal, subtotal } from '../item'

describe('unitPrice', () => {
  it('returns base price when no options', () => {
    expect(unitPrice({ price: 1500, quantity: 1 })).toBe(1500)
  })

  it('adds option priceAdjust to base price', () => {
    expect(unitPrice({
      price: 1000,
      quantity: 1,
      options: [{ priceAdjust: 200 }, { priceAdjust: 150 }],
    })).toBe(1350)
  })

  it('handles option with priceAdjust = 0', () => {
    expect(unitPrice({
      price: 800,
      quantity: 1,
      options: [{ priceAdjust: 0 }, { priceAdjust: 300 }],
    })).toBe(1100)
  })

  it('handles empty options array', () => {
    expect(unitPrice({ price: 500, quantity: 2, options: [] })).toBe(500)
  })

  it('handles undefined options', () => {
    expect(unitPrice({ price: 500, quantity: 2 })).toBe(500)
  })
})

describe('lineTotal', () => {
  it('multiplies unitPrice by quantity', () => {
    expect(lineTotal({ price: 1000, quantity: 3 })).toBe(3000)
  })

  it('includes option adjustments in line total', () => {
    expect(lineTotal({
      price: 1000,
      quantity: 2,
      options: [{ priceAdjust: 200 }],
    })).toBe(2400) // (1000 + 200) * 2
  })

  it('returns 0 when quantity is 0', () => {
    expect(lineTotal({ price: 1000, quantity: 0 })).toBe(0)
  })
})

describe('subtotal', () => {
  it('sums line totals of all items', () => {
    expect(subtotal([
      { price: 1000, quantity: 2 },
      { price: 500, quantity: 1, options: [{ priceAdjust: 100 }] },
    ])).toBe(2600) // 2000 + 600
  })

  it('returns 0 for empty array', () => {
    expect(subtotal([])).toBe(0)
  })

  it('handles single item', () => {
    expect(subtotal([{ price: 1500, quantity: 1 }])).toBe(1500)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/evergreen/Desktop/个人代码/QR_Code && pnpm --filter @qr-order/shared test
```

Expected: FAIL — `unitPrice`, `lineTotal`, `subtotal` not found.

- [ ] **Step 3: Implement** — `shared/pricing/item.ts`

```typescript
import type { PricingItem } from './types'

/** Base price + all option adjustments (cents) */
export function unitPrice(item: PricingItem): number {
  const adjust = (item.options ?? []).reduce((sum, o) => sum + o.priceAdjust, 0)
  return item.price + adjust
}

/** Unit price * quantity (cents) */
export function lineTotal(item: PricingItem): number {
  return unitPrice(item) * item.quantity
}

/** Sum of all line totals (cents) */
export function subtotal(items: PricingItem[]): number {
  return items.reduce((sum, item) => sum + lineTotal(item), 0)
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/evergreen/Desktop/个人代码/QR_Code && pnpm --filter @qr-order/shared test
```

Expected: All 9 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add shared/pricing/item.ts shared/pricing/__tests__/item.test.ts
git commit -m "feat: add shared/pricing/item.ts — unitPrice, lineTotal, subtotal"
```

---

## Task 3: `shared/pricing/tax.ts` — Tax, Service Fee, Tip

**Files:**
- Create: `shared/pricing/__tests__/tax.test.ts`
- Create: `shared/pricing/tax.ts`

- [ ] **Step 1: Write failing tests** — `shared/pricing/__tests__/tax.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { calcTax, calcServiceFee, calcTip, calcTaxAndFees } from '../tax'

describe('calcTax', () => {
  it('calculates tax at standard rate', () => {
    // 2000 cents * 8.875% = 177.5 → rounds to 178
    expect(calcTax(2000, 8.875)).toBe(178)
  })

  it('returns 0 when rate is 0', () => {
    expect(calcTax(5000, 0)).toBe(0)
  })

  it('rounds .5 up (Math.round behavior)', () => {
    // 1000 * 8.75% = 87.5 → rounds to 88
    expect(calcTax(1000, 8.75)).toBe(88)
  })

  it('handles small subtotal', () => {
    // 100 cents * 8.875% = 8.875 → rounds to 9
    expect(calcTax(100, 8.875)).toBe(9)
  })
})

describe('calcServiceFee', () => {
  it('calculates fee at standard rate', () => {
    // 2000 * 15% = 300
    expect(calcServiceFee(2000, 15)).toBe(300)
  })

  it('returns 0 when rate is 0', () => {
    expect(calcServiceFee(5000, 0)).toBe(0)
  })

  it('rounds correctly', () => {
    // 333 * 15% = 49.95 → rounds to 50
    expect(calcServiceFee(333, 15)).toBe(50)
  })
})

describe('calcTip', () => {
  it('calculates percent tip', () => {
    // 2000 * 18% = 360
    expect(calcTip(2000, 'percent', 18)).toBe(360)
  })

  it('returns fixed tip as-is', () => {
    expect(calcTip(2000, 'fixed', 500)).toBe(500)
  })

  it('allows tip of 0', () => {
    expect(calcTip(2000, 'percent', 0)).toBe(0)
    expect(calcTip(2000, 'fixed', 0)).toBe(0)
  })

  it('allows tip of 1 cent (no minimum)', () => {
    expect(calcTip(2000, 'fixed', 1)).toBe(1)
  })

  it('rounds percent tip', () => {
    // 1550 * 15% = 232.5 → 233
    expect(calcTip(1550, 'percent', 15)).toBe(233)
  })
})

describe('calcTaxAndFees', () => {
  it('returns tax, serviceFee, and totalWithTax', () => {
    const result = calcTaxAndFees(2000, { taxRate: 8.875, serviceFeeRate: 15 })
    expect(result.tax).toBe(178)       // 2000 * 8.875%
    expect(result.serviceFee).toBe(300) // 2000 * 15%
    expect(result.totalWithTax).toBe(2478) // 2000 + 178 + 300
  })

  it('handles both rates at 0', () => {
    const result = calcTaxAndFees(2000, { taxRate: 0, serviceFeeRate: 0 })
    expect(result.tax).toBe(0)
    expect(result.serviceFee).toBe(0)
    expect(result.totalWithTax).toBe(2000)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/evergreen/Desktop/个人代码/QR_Code && pnpm --filter @qr-order/shared test
```

Expected: tax tests FAIL, item tests still PASS.

- [ ] **Step 3: Implement** — `shared/pricing/tax.ts`

```typescript
import type { TaxConfig } from './types'

/** Tax on subtotal (cents, rounded) */
export function calcTax(subtotal: number, taxRate: number): number {
  return Math.round(subtotal * taxRate / 100)
}

/** Service fee on subtotal (cents, rounded) */
export function calcServiceFee(subtotal: number, serviceFeeRate: number): number {
  return Math.round(subtotal * serviceFeeRate / 100)
}

/** Tip amount (cents). No minimum enforced. */
export function calcTip(
  baseAmount: number,
  tipType: 'percent' | 'fixed',
  tipValue: number,
): number {
  if (tipType === 'fixed') return tipValue
  return Math.round(baseAmount * tipValue / 100)
}

/** Convenience: compute tax + service fee + total in one call */
export function calcTaxAndFees(
  subtotal: number,
  config: TaxConfig,
): { tax: number; serviceFee: number; totalWithTax: number } {
  const tax = calcTax(subtotal, config.taxRate)
  const serviceFee = calcServiceFee(subtotal, config.serviceFeeRate)
  return { tax, serviceFee, totalWithTax: subtotal + tax + serviceFee }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/evergreen/Desktop/个人代码/QR_Code && pnpm --filter @qr-order/shared test
```

Expected: All item + tax tests PASS.

- [ ] **Step 5: Commit**

```bash
git add shared/pricing/tax.ts shared/pricing/__tests__/tax.test.ts
git commit -m "feat: add shared/pricing/tax.ts — calcTax, calcServiceFee, calcTip, calcTaxAndFees"
```

---

## Task 4: `shared/pricing/settlement.ts` — Bill Summary, Split, Validation

**Files:**
- Create: `shared/pricing/__tests__/settlement.test.ts`
- Create: `shared/pricing/settlement.ts`

- [ ] **Step 1: Write failing tests** — `shared/pricing/__tests__/settlement.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import {
  calcBillSummary,
  calcSplitByItem,
  calcSplitByPercent,
  validateSplit,
} from '../settlement'

// Standard rates used across tests
const RATES = { taxRate: 8.875, serviceFeeRate: 15 }

describe('calcBillSummary', () => {
  it('computes full bill breakdown', () => {
    const result = calcBillSummary({
      totalAmount: 5000, discountAmount: 0, totalPaid: 0, ...RATES,
    })
    expect(result.netDue).toBe(5000)
    expect(result.tax).toBe(444)        // round(5000 * 8.875 / 100)
    expect(result.serviceFee).toBe(750) // round(5000 * 15 / 100)
    expect(result.totalWithTax).toBe(6194)
    expect(result.remaining).toBe(6194)
    expect(result.isPaid).toBe(false)
  })

  it('applies discount', () => {
    const result = calcBillSummary({
      totalAmount: 5000, discountAmount: 1000, totalPaid: 0, ...RATES,
    })
    expect(result.netDue).toBe(4000)
    expect(result.remaining).toBe(4000 + result.tax + result.serviceFee)
  })

  it('returns remaining = 0 and isPaid = true when fully paid', () => {
    const result = calcBillSummary({
      totalAmount: 5000, discountAmount: 0, totalPaid: 6194, ...RATES,
    })
    expect(result.remaining).toBe(0)
    expect(result.isPaid).toBe(true)
  })

  it('clamps remaining to 0 when overpaid', () => {
    const result = calcBillSummary({
      totalAmount: 5000, discountAmount: 0, totalPaid: 9999, ...RATES,
    })
    expect(result.remaining).toBe(0)
    expect(result.isPaid).toBe(true)
  })

  it('isPaid false when totalWithTax is 0', () => {
    const result = calcBillSummary({
      totalAmount: 0, discountAmount: 0, totalPaid: 0, ...RATES,
    })
    expect(result.isPaid).toBe(false)
  })

  it('handles partial payment', () => {
    const result = calcBillSummary({
      totalAmount: 5000, discountAmount: 0, totalPaid: 3000, ...RATES,
    })
    expect(result.remaining).toBe(6194 - 3000)
  })
})

describe('calcSplitByItem', () => {
  it('calculates subtotal + tax + fee for selected items', () => {
    const result = calcSplitByItem({
      items: [
        { price: 1000, quantity: 2 },
        { price: 500, quantity: 1, options: [{ priceAdjust: 100 }] },
      ],
      ...RATES,
    })
    expect(result.subtotal).toBe(2600) // 2000 + 600
    expect(result.tax).toBe(231)       // round(2600 * 8.875 / 100)
    expect(result.serviceFee).toBe(390) // round(2600 * 15 / 100)
    expect(result.total).toBe(3221)     // 2600 + 231 + 390
  })

  it('handles single item', () => {
    const result = calcSplitByItem({
      items: [{ price: 1500, quantity: 1 }],
      ...RATES,
    })
    expect(result.subtotal).toBe(1500)
    expect(result.total).toBe(1500 + result.tax + result.serviceFee)
  })

  it('handles empty items', () => {
    const result = calcSplitByItem({ items: [], ...RATES })
    expect(result.subtotal).toBe(0)
    expect(result.total).toBe(0)
  })
})

describe('calcSplitByPercent', () => {
  it('calculates split amount and leftover', () => {
    const result = calcSplitByPercent(2000, 50)
    expect(result.splitAmount).toBe(1000)
    expect(result.leftover).toBe(1000)
  })

  it('handles 100%', () => {
    const result = calcSplitByPercent(2000, 100)
    expect(result.splitAmount).toBe(2000)
    expect(result.leftover).toBe(0)
  })

  it('rounds split amount', () => {
    // 1001 * 33 / 100 = 330.33 → 330
    const result = calcSplitByPercent(1001, 33)
    expect(result.splitAmount).toBe(330)
    expect(result.leftover).toBe(671) // 1001 - 330
  })

  it('handles 1%', () => {
    const result = calcSplitByPercent(10000, 1)
    expect(result.splitAmount).toBe(100)
    expect(result.leftover).toBe(9900)
  })
})

describe('validateSplit', () => {
  it('valid when both sides >= 100', () => {
    expect(validateSplit(500, 500, 50)).toEqual({ valid: true })
  })

  it('valid when both sides exactly 100', () => {
    expect(validateSplit(100, 100, 50)).toEqual({ valid: true })
  })

  it('invalid when split < 100 cents', () => {
    const result = validateSplit(99, 500, 10)
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('$1.00')
  })

  it('invalid when remaining < 100 cents', () => {
    const result = validateSplit(500, 50, 90)
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('$1.00')
  })

  it('100% always valid even with 0 leftover', () => {
    expect(validateSplit(500, 0, 100)).toEqual({ valid: true })
  })

  it('100% valid even with small split', () => {
    expect(validateSplit(50, 0, 100)).toEqual({ valid: true })
  })

  it('invalid: 1% of $5 = 5 cents', () => {
    const result = validateSplit(5, 495, 1)
    expect(result.valid).toBe(false)
  })

  it('invalid: 99% of $5 leaves 5 cents', () => {
    const result = validateSplit(495, 5, 99)
    expect(result.valid).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/evergreen/Desktop/个人代码/QR_Code && pnpm --filter @qr-order/shared test
```

Expected: settlement tests FAIL; item + tax tests PASS.

- [ ] **Step 3: Implement** — `shared/pricing/settlement.ts`

```typescript
import type {
  BillInput, BillSummary, SplitByItemInput,
  SplitByItemResult, SplitByPercentResult, SplitValidation,
} from './types'
import { subtotal } from './item'
import { calcTax, calcServiceFee } from './tax'

/** Full bill breakdown: netDue, tax, fee, totalWithTax, remaining, isPaid */
export function calcBillSummary(input: BillInput): BillSummary {
  const netDue = input.totalAmount - input.discountAmount
  const tax = calcTax(netDue, input.taxRate)
  const serviceFee = calcServiceFee(netDue, input.serviceFeeRate)
  const totalWithTax = netDue + tax + serviceFee
  const remaining = Math.max(0, totalWithTax - input.totalPaid)
  const isPaid = input.totalPaid >= totalWithTax && totalWithTax > 0
  return { netDue, tax, serviceFee, totalWithTax, remaining, isPaid }
}

/** Split-by-item: subtotal + tax + fee for selected items */
export function calcSplitByItem(input: SplitByItemInput): SplitByItemResult {
  const sub = subtotal(input.items)
  const tax = calcTax(sub, input.taxRate)
  const fee = calcServiceFee(sub, input.serviceFeeRate)
  return { subtotal: sub, tax, serviceFee: fee, total: sub + tax + fee }
}

/** Split-by-percent: divide remaining into split + leftover */
export function calcSplitByPercent(
  remaining: number,
  percent: number,
): SplitByPercentResult {
  const splitAmount = Math.round(remaining * percent / 100)
  return { splitAmount, leftover: remaining - splitAmount }
}

/** Validate that both sides of a split are >= $1.00 (100 cents). 100% is always valid. */
export function validateSplit(
  splitTotal: number,
  remainingAfterSplit: number,
  percent: number,
): SplitValidation {
  if (percent === 100) return { valid: true }
  if (splitTotal < 100) {
    return { valid: false, reason: 'Split amount must be at least $1.00' }
  }
  if (remainingAfterSplit < 100) {
    return { valid: false, reason: 'Remaining balance after split must be at least $1.00' }
  }
  return { valid: true }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/evergreen/Desktop/个人代码/QR_Code && pnpm --filter @qr-order/shared test
```

Expected: All item + tax + settlement tests PASS.

- [ ] **Step 5: Commit**

```bash
git add shared/pricing/settlement.ts shared/pricing/__tests__/settlement.test.ts
git commit -m "feat: add shared/pricing/settlement.ts — calcBillSummary, split, validateSplit"
```

---

## Task 5: `shared/pricing/stats.ts` — Sales Statistics

**Files:**
- Create: `shared/pricing/__tests__/stats.test.ts`
- Create: `shared/pricing/stats.ts`

- [ ] **Step 1: Write failing tests** — `shared/pricing/__tests__/stats.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { buildDailySnapshot, aggregateSnapshots, topItems } from '../stats'
import type { DailySalesSnapshot, DailyItemStat } from '../types'

// Minimal order shape matching what buildDailySnapshot needs
const makeOrder = (id: string, items: { menuItemId: string; name: string; price: number; quantity: number; selectedOptions?: { priceAdjust: number }[]; voided?: boolean }[], createdAt: string) => ({
  id, items, createdAt,
})

describe('buildDailySnapshot', () => {
  it('aggregates items by menuItemId', () => {
    const orders = [
      makeOrder('o1', [
        { menuItemId: 'a', name: 'Chicken', price: 1500, quantity: 2, },
        { menuItemId: 'b', name: 'Rice', price: 500, quantity: 1 },
      ], '2026-04-05T12:00:00Z'),
      makeOrder('o2', [
        { menuItemId: 'a', name: 'Chicken', price: 1500, quantity: 1 },
      ], '2026-04-05T13:00:00Z'),
    ]
    const snap = buildDailySnapshot('store1', '2026-04-05', orders)
    expect(snap.storeId).toBe('store1')
    expect(snap.date).toBe('2026-04-05')
    expect(snap.totalOrders).toBe(2)
    expect(snap.totalRevenue).toBe(5000) // 3000 + 500 + 1500

    const chicken = snap.items.find(i => i.itemId === 'a')!
    expect(chicken.count).toBe(3)    // 2 + 1
    expect(chicken.revenue).toBe(4500) // 1500*2 + 1500*1

    const rice = snap.items.find(i => i.itemId === 'b')!
    expect(rice.count).toBe(1)
    expect(rice.revenue).toBe(500)
  })

  it('skips voided items', () => {
    const orders = [
      makeOrder('o1', [
        { menuItemId: 'a', name: 'Chicken', price: 1500, quantity: 2 },
        { menuItemId: 'b', name: 'Voided', price: 999, quantity: 1, voided: true },
      ], '2026-04-05T12:00:00Z'),
    ]
    const snap = buildDailySnapshot('store1', '2026-04-05', orders)
    expect(snap.totalRevenue).toBe(3000)
    expect(snap.items).toHaveLength(1)
  })

  it('includes option priceAdjust in revenue', () => {
    const orders = [
      makeOrder('o1', [
        { menuItemId: 'a', name: 'Burger', price: 1000, quantity: 1, selectedOptions: [{ priceAdjust: 200 }] },
      ], '2026-04-05T12:00:00Z'),
    ]
    const snap = buildDailySnapshot('store1', '2026-04-05', orders)
    expect(snap.totalRevenue).toBe(1200)
    expect(snap.items[0].revenue).toBe(1200)
  })

  it('returns zero-value snapshot for empty orders', () => {
    const snap = buildDailySnapshot('store1', '2026-04-05', [])
    expect(snap.totalOrders).toBe(0)
    expect(snap.totalRevenue).toBe(0)
    expect(snap.items).toEqual([])
  })
})

describe('aggregateSnapshots', () => {
  const day1: DailySalesSnapshot = {
    date: '2026-04-01', storeId: 's1', totalOrders: 10, totalRevenue: 5000,
    items: [
      { itemId: 'a', name: 'Chicken', count: 5, revenue: 3000 },
      { itemId: 'b', name: 'Rice', count: 3, revenue: 1500 },
    ],
  }
  const day2: DailySalesSnapshot = {
    date: '2026-04-02', storeId: 's1', totalOrders: 8, totalRevenue: 4000,
    items: [
      { itemId: 'a', name: 'Chicken', count: 4, revenue: 2400 },
      { itemId: 'c', name: 'Soup', count: 2, revenue: 800 },
    ],
  }

  it('sums totalOrders and totalRevenue', () => {
    const result = aggregateSnapshots([day1, day2])
    expect(result.totalOrders).toBe(18)
    expect(result.totalRevenue).toBe(9000)
  })

  it('merges items by itemId', () => {
    const result = aggregateSnapshots([day1, day2])
    const chicken = result.items.find(i => i.itemId === 'a')!
    expect(chicken.count).toBe(9)
    expect(chicken.revenue).toBe(5400)
  })

  it('includes items only in one snapshot', () => {
    const result = aggregateSnapshots([day1, day2])
    expect(result.items.find(i => i.itemId === 'b')!.count).toBe(3)
    expect(result.items.find(i => i.itemId === 'c')!.count).toBe(2)
  })

  it('returns dateRange', () => {
    const result = aggregateSnapshots([day1, day2])
    expect(result.dateRange).toEqual({ from: '2026-04-01', to: '2026-04-02' })
  })

  it('handles empty array', () => {
    const result = aggregateSnapshots([])
    expect(result.totalOrders).toBe(0)
    expect(result.items).toEqual([])
  })
})

describe('topItems', () => {
  const items: DailyItemStat[] = [
    { itemId: 'a', name: 'A', count: 10, revenue: 1000 },
    { itemId: 'b', name: 'B', count: 5, revenue: 3000 },
    { itemId: 'c', name: 'C', count: 20, revenue: 500 },
  ]

  it('sorts by count descending', () => {
    const result = topItems(items, 'count')
    expect(result[0].itemId).toBe('c')
    expect(result[1].itemId).toBe('a')
    expect(result[2].itemId).toBe('b')
  })

  it('sorts by revenue descending', () => {
    const result = topItems(items, 'revenue')
    expect(result[0].itemId).toBe('b')
  })

  it('limits to N items', () => {
    const result = topItems(items, 'count', 2)
    expect(result).toHaveLength(2)
  })

  it('defaults to 10 items', () => {
    const result = topItems(items, 'count')
    expect(result).toHaveLength(3) // only 3 items available, less than 10
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/evergreen/Desktop/个人代码/QR_Code && pnpm --filter @qr-order/shared test
```

Expected: stats tests FAIL; other tests PASS.

- [ ] **Step 3: Implement** — `shared/pricing/stats.ts`

```typescript
import type { DailyItemStat, DailySalesSnapshot } from './types'
import { lineTotal } from './item'

interface SnapshotOrderItem {
  menuItemId: string
  name: string
  price: number
  quantity: number
  selectedOptions?: { priceAdjust: number }[]
  voided?: boolean
}

interface SnapshotOrder {
  id: string
  items: SnapshotOrderItem[]
  createdAt: string
}

/** Build a daily sales snapshot from raw orders */
export function buildDailySnapshot(
  storeId: string,
  date: string,
  orders: SnapshotOrder[],
): DailySalesSnapshot {
  const itemMap = new Map<string, DailyItemStat>()

  for (const order of orders) {
    for (const item of order.items) {
      if (item.voided) continue
      const revenue = lineTotal({
        price: item.price,
        quantity: item.quantity,
        options: item.selectedOptions?.map(o => ({ priceAdjust: o.priceAdjust })),
      })
      const existing = itemMap.get(item.menuItemId)
      if (existing) {
        existing.count += item.quantity
        existing.revenue += revenue
      } else {
        itemMap.set(item.menuItemId, {
          itemId: item.menuItemId,
          name: item.name,
          count: item.quantity,
          revenue,
        })
      }
    }
  }

  const items = Array.from(itemMap.values())
  const totalRevenue = items.reduce((sum, i) => sum + i.revenue, 0)

  return {
    date,
    storeId,
    totalOrders: orders.length,
    totalRevenue,
    items,
  }
}

/** Merge multiple daily snapshots into an aggregate */
export function aggregateSnapshots(snapshots: DailySalesSnapshot[]): {
  totalOrders: number
  totalRevenue: number
  items: DailyItemStat[]
  dateRange: { from: string; to: string }
} {
  if (snapshots.length === 0) {
    return { totalOrders: 0, totalRevenue: 0, items: [], dateRange: { from: '', to: '' } }
  }

  const itemMap = new Map<string, DailyItemStat>()
  let totalOrders = 0
  let totalRevenue = 0

  for (const snap of snapshots) {
    totalOrders += snap.totalOrders
    totalRevenue += snap.totalRevenue
    for (const item of snap.items) {
      const existing = itemMap.get(item.itemId)
      if (existing) {
        existing.count += item.count
        existing.revenue += item.revenue
      } else {
        itemMap.set(item.itemId, { ...item })
      }
    }
  }

  const dates = snapshots.map(s => s.date).sort()
  return {
    totalOrders,
    totalRevenue,
    items: Array.from(itemMap.values()),
    dateRange: { from: dates[0], to: dates[dates.length - 1] },
  }
}

/** Sort items by count or revenue, return top N (default 10) */
export function topItems(
  items: DailyItemStat[],
  by: 'count' | 'revenue',
  limit: number = 10,
): DailyItemStat[] {
  return [...items].sort((a, b) => b[by] - a[by]).slice(0, limit)
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/evergreen/Desktop/个人代码/QR_Code && pnpm --filter @qr-order/shared test
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add shared/pricing/stats.ts shared/pricing/__tests__/stats.test.ts
git commit -m "feat: add shared/pricing/stats.ts — buildDailySnapshot, aggregateSnapshots, topItems"
```

---

## Task 6: `shared/pricing/index.ts` — Unified Exports + TypeCheck

**Files:**
- Create: `shared/pricing/index.ts`

- [ ] **Step 1: Create barrel export** — `shared/pricing/index.ts`

```typescript
// Layer 1: Item pricing
export { unitPrice, lineTotal, subtotal } from './item'

// Layer 2: Tax, fees, tip
export { calcTax, calcServiceFee, calcTip, calcTaxAndFees } from './tax'

// Layer 3: Settlement
export {
  calcBillSummary,
  calcSplitByItem,
  calcSplitByPercent,
  validateSplit,
} from './settlement'

// Stats
export { buildDailySnapshot, aggregateSnapshots, topItems } from './stats'

// Types
export type {
  PricingItem,
  TaxConfig,
  BillInput,
  BillSummary,
  SplitByItemInput,
  SplitByItemResult,
  SplitByPercentResult,
  SplitValidation,
  DailyItemStat,
  DailySalesSnapshot,
} from './types'
```

- [ ] **Step 2: Run all tests + type check**

```bash
cd /Users/evergreen/Desktop/个人代码/QR_Code && pnpm --filter @qr-order/shared test
cd /Users/evergreen/Desktop/个人代码/QR_Code/shared && npx tsc --noEmit
```

Expected: All tests PASS, no type errors.

- [ ] **Step 3: Commit**

```bash
git add shared/pricing/index.ts
git commit -m "feat: add shared/pricing/index.ts barrel export"
```

---

## Task 7: Migrate Server `session.service.ts`

This is the largest change. Replace inline `calcTax`, `calcServiceFee` and the calculation portions of `getSessionSummary`, `payByItems`, `payByPercent`.

**Files:**
- Modify: `server/src/controllers/session.service.ts`

- [ ] **Step 1: Add import at top of `session.service.ts`**

Add this import near the top of the file (after existing imports):

```typescript
import { unitPrice as calcUnitPrice, calcTax as sharedCalcTax, calcServiceFee as sharedCalcServiceFee, calcBillSummary, calcTaxAndFees } from '@qr-order/shared/pricing'
```

- [ ] **Step 2: Replace `calcTax` and `calcServiceFee` functions (lines 303-313)**

Replace the two functions:

```typescript
// OLD (lines 303-313):
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

With thin wrappers that read the store then delegate:

```typescript
export function calcTax(storeId: string, subtotal: number): number {
  const store = storeStore.getById(storeId)
  return sharedCalcTax(subtotal, store?.taxRate ?? 0)
}

export function calcServiceFee(storeId: string, subtotal: number): number {
  const store = storeStore.getById(storeId)
  return sharedCalcServiceFee(subtotal, store?.serviceFeeRate ?? 0)
}
```

Note: Keep the same export signatures so callers in `split-bill.service.ts` and `payment.service.ts` don't break. They will be migrated in subsequent tasks.

- [ ] **Step 3: Replace calculation in `getSessionSummary` (lines 127-148)**

Replace the inline math (lines 137-143) with `calcBillSummary`:

```typescript
export function getSessionSummary(storeId: string, sessionId: string) {
  const session = sessionStore.getById(sessionId)
  if (!session || session.storeId !== storeId) return null

  adoptOrphanedOrders(session)

  const freshSession = sessionStore.getById(sessionId)!
  const orders = freshSession.orderIds
    .map(id => orderStore.getById(id)).filter(Boolean)
  const payments = getPayments(sessionId)

  const store = storeStore.getById(storeId)
  const bill = calcBillSummary({
    totalAmount: freshSession.totalAmount,
    discountAmount: freshSession.discountAmount,
    totalPaid: freshSession.totalPaid,
    taxRate: store?.taxRate ?? 0,
    serviceFeeRate: store?.serviceFeeRate ?? 0,
  })

  return {
    ...freshSession, orders, payments, ...bill,
  }
}
```

- [ ] **Step 4: Replace unitPrice calculation in `payByItems` (lines 330-379)**

Replace the inline `unitPrice` calculation (line 370) with the shared function:

Find this line inside the for-loop:
```typescript
    const unitPrice = item.price + (item.selectedOptions ?? []).reduce((s, o) => s + o.priceAdjust, 0)
```

Replace with:
```typescript
    const up = calcUnitPrice({ price: item.price, quantity: 1, options: item.selectedOptions?.map(o => ({ priceAdjust: o.priceAdjust })) })
```

And update the subtotal line from `subtotal += unitPrice * qty` to `subtotal += up * qty`.

- [ ] **Step 5: Replace tax/fee calculation in `payByPercent` (lines 382-409)**

Replace lines 393-400 (the inline netDue/tax/fee/remaining calculation):

```typescript
  const store = storeStore.getById(storeId)
  const rates = { taxRate: store?.taxRate ?? 0, serviceFeeRate: store?.serviceFeeRate ?? 0 }

  adoptOrphanedOrders(session)
  const fresh = sessionStore.getById(sessionId)!

  const bill = calcBillSummary({
    totalAmount: fresh.totalAmount,
    discountAmount: fresh.discountAmount,
    totalPaid: fresh.totalPaid,
    ...rates,
  })
  const remaining = bill.remaining
  const subtotal = Math.round(remaining * percent / 100)
```

And replace the minimum check return values (keep the same logic, use `sharedCalcTax`/`sharedCalcServiceFee`):

```typescript
  if (percent < 100) {
    const leftover = remaining - subtotal
    if (subtotal < 100) return { error: 'Split amount must be at least $1.00' }
    if (leftover < 100) return { error: 'Remaining balance after split must be at least $1.00' }
  }

  const tax = sharedCalcTax(subtotal, rates.taxRate)
  const serviceFee = sharedCalcServiceFee(subtotal, rates.serviceFeeRate)
  return { amount: subtotal, tax, serviceFee }
```

- [ ] **Step 6: Type-check server**

```bash
cd /Users/evergreen/Desktop/个人代码/QR_Code/server && npx tsc --noEmit
```

Expected: 0 new errors. (Existing Express-related type issues are expected per CLAUDE.md.)

- [ ] **Step 7: Commit**

```bash
git add server/src/controllers/session.service.ts
git commit -m "refactor: session.service.ts delegates calculations to shared/pricing"
```

---

## Task 8: Migrate Server `split-bill.service.ts`

**Files:**
- Modify: `server/src/controllers/split-bill.service.ts`

- [ ] **Step 1: Add import**

```typescript
import { unitPrice as calcUnitPrice, calcTaxAndFees } from '@qr-order/shared/pricing'
```

- [ ] **Step 2: Replace unitPrice in `getMainBillSummary` (lines 30-33)**

Replace:
```typescript
      const unitPrice = item.price +
        (item.selectedOptions ?? []).reduce((s, o) => s + o.priceAdjust, 0)
      subtotal += unitPrice * remaining
```

With:
```typescript
      const up = calcUnitPrice({ price: item.price, quantity: 1, options: item.selectedOptions?.map(o => ({ priceAdjust: o.priceAdjust })) })
      subtotal += up * remaining
```

- [ ] **Step 3: Replace tax/fee in `getMainBillSummary` (lines 44-46)**

Replace:
```typescript
  const tax = calcTax(storeId, subtotal)
  const serviceFee = calcServiceFee(storeId, subtotal)
  return { subtotal, tax, serviceFee, total: subtotal + tax + serviceFee, itemCount }
```

With:
```typescript
  const store = storeStore.getById(storeId)
  const { tax, serviceFee, totalWithTax } = calcTaxAndFees(subtotal, {
    taxRate: store?.taxRate ?? 0,
    serviceFeeRate: store?.serviceFeeRate ?? 0,
  })
  return { subtotal, tax, serviceFee, total: totalWithTax, itemCount }
```

And remove the import of `calcTax`/`calcServiceFee` from `session.service.ts` (if no longer needed after this change).

- [ ] **Step 4: Replace tax/fee in `createSplitBill` (lines 76-78)**

Replace:
```typescript
  const tax = calcTax(storeId, subtotal)
  const serviceFee = calcServiceFee(storeId, subtotal)
```

With:
```typescript
  const store = storeStore.getById(storeId)
  const { tax, serviceFee } = calcTaxAndFees(subtotal, {
    taxRate: store?.taxRate ?? 0,
    serviceFeeRate: store?.serviceFeeRate ?? 0,
  })
```

- [ ] **Step 5: Replace unitPrice in `calcByItemSubtotal` (lines 142-143)**

Replace:
```typescript
    const unitPrice = item.price + (item.selectedOptions ?? []).reduce((s, o) => s + o.priceAdjust, 0)
    subtotal += unitPrice * assignQty
```

With:
```typescript
    const up = calcUnitPrice({ price: item.price, quantity: 1, options: item.selectedOptions?.map(o => ({ priceAdjust: o.priceAdjust })) })
    subtotal += up * assignQty
```

- [ ] **Step 6: Type-check server**

```bash
cd /Users/evergreen/Desktop/个人代码/QR_Code/server && npx tsc --noEmit
```

Expected: 0 new errors.

- [ ] **Step 7: Commit**

```bash
git add server/src/controllers/split-bill.service.ts
git commit -m "refactor: split-bill.service.ts delegates calculations to shared/pricing"
```

---

## Task 9: Migrate Client `cart-store.ts`

**Files:**
- Modify: `client/src/stores/cart-store.ts`

- [ ] **Step 1: Replace `unitPrice` function (lines 8-12)**

Replace the entire function:

```typescript
// OLD:
export function unitPrice(item: CartItem): number {
  const adjust = (item.selectedOptions ?? []).reduce((sum, o) => sum + o.priceAdjust, 0)
  return item.price + adjust
}
```

With:

```typescript
import { unitPrice as calcUnitPrice } from '@qr-order/shared/pricing'

export function unitPrice(item: CartItem): number {
  return calcUnitPrice({
    price: item.price,
    quantity: item.quantity,
    options: item.selectedOptions?.map(o => ({ priceAdjust: o.priceAdjust })),
  })
}
```

Note: Keep the `unitPrice` export with `CartItem` signature for backward compatibility — it maps `CartItem` to `PricingItem` internally. The `totalPrice` calculation on line 102 uses this function, so it inherits the fix automatically.

- [ ] **Step 2: Type-check client**

```bash
cd /Users/evergreen/Desktop/个人代码/QR_Code/client && npx tsc -b
```

Expected: 0 new errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/stores/cart-store.ts
git commit -m "refactor: cart-store.ts unitPrice delegates to shared/pricing"
```

---

## Task 10: Migrate Client `CheckoutPage.tsx` Tip Calculation

**Files:**
- Modify: `client/src/pages/customer/CheckoutPage.tsx`

- [ ] **Step 1: Add import and replace inline tip calc (lines 131-156)**

Add import:
```typescript
import { calcTip } from '@qr-order/shared/pricing'
```

In the `applyTip` function, replace the inline tip calculation (lines 135-139):

```typescript
// OLD:
  let tip = 0
  if (sel?.type === 'percent') {
    tip = Math.round(amount * sel.pct / 100)
  } else if (sel?.type === 'custom') {
    tip = sel.amount
  }
```

With:

```typescript
  let tip = 0
  if (sel?.type === 'percent') {
    tip = calcTip(amount, 'percent', sel.pct)
  } else if (sel?.type === 'custom') {
    tip = calcTip(amount, 'fixed', sel.amount)
  }
```

- [ ] **Step 2: Type-check client**

```bash
cd /Users/evergreen/Desktop/个人代码/QR_Code/client && npx tsc -b
```

Expected: 0 new errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/customer/CheckoutPage.tsx
git commit -m "refactor: CheckoutPage tip calculation delegates to shared/pricing"
```

---

## Task 11: Migrate Client `SettlementSheet.tsx` + `CreateSplitSheet.tsx`

**Files:**
- Modify: `client/src/components/customer/SettlementSheet.tsx`
- Modify: `client/src/components/table/CreateSplitSheet.tsx`

- [ ] **Step 1: Migrate `SettlementSheet.tsx` percent previews**

Add import:
```typescript
import { calcSplitByPercent } from '@qr-order/shared/pricing'
```

Replace inline calculation on line 195 (preset button display):
```typescript
// OLD:
{formatPriceUSD(Math.round(session.remaining * pct / 100))}
```
With:
```typescript
{formatPriceUSD(calcSplitByPercent(session.remaining, pct).splitAmount)}
```

Replace inline calculation on line 213 (slider display):
```typescript
// OLD:
{formatPriceUSD(Math.round(session.remaining * percent / 100))} / {formatPriceUSD(session.remaining)}
```
With:
```typescript
{formatPriceUSD(calcSplitByPercent(session.remaining, percent).splitAmount)} / {formatPriceUSD(session.remaining)}
```

- [ ] **Step 2: Migrate `CreateSplitSheet.tsx` percent calculation**

Add import:
```typescript
import { calcSplitByPercent, unitPrice as calcUnitPrice } from '@qr-order/shared/pricing'
```

Replace `percentAmount` on line 60:
```typescript
// OLD:
const percentAmount = session ? Math.round(session.remaining * percent / 100) : 0
```
With:
```typescript
const percentAmount = session ? calcSplitByPercent(session.remaining, percent).splitAmount : 0
```

Replace `localSubtotal` on lines 56-58 — keep the existing logic but use shared unitPrice:
```typescript
// OLD:
const localSubtotal = useMemo(() =>
  allItems.reduce((sum, item) => sum + item.unitPrice * (selectedQty[item.key] ?? 0), 0),
[allItems, selectedQty])
```
Note: `item.unitPrice` is pre-computed in `allItems`. If it's already set using the cart-store's `unitPrice` (which now delegates to shared), no change needed here. Verify that `allItems` computes `unitPrice` using the migrated cart-store function or shared/pricing directly.

- [ ] **Step 3: Type-check client**

```bash
cd /Users/evergreen/Desktop/个人代码/QR_Code/client && npx tsc -b
```

Expected: 0 new errors.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/customer/SettlementSheet.tsx client/src/components/table/CreateSplitSheet.tsx
git commit -m "refactor: SettlementSheet + CreateSplitSheet delegate to shared/pricing"
```

---

## Task 12: Final Type-Check + Full Test Run

**Files:** None (verification only)

- [ ] **Step 1: Run full shared test suite**

```bash
cd /Users/evergreen/Desktop/个人代码/QR_Code && pnpm --filter @qr-order/shared test
```

Expected: All tests PASS (item + tax + settlement + stats).

- [ ] **Step 2: Type-check client**

```bash
cd /Users/evergreen/Desktop/个人代码/QR_Code/client && npx tsc -b
```

Expected: 0 new errors.

- [ ] **Step 3: Type-check server**

```bash
cd /Users/evergreen/Desktop/个人代码/QR_Code/server && npx tsc --noEmit
```

Expected: 0 new errors (pre-existing Express type issues are expected per CLAUDE.md).

- [ ] **Step 4: Verify shared/pricing exports are accessible from both sides**

```bash
cd /Users/evergreen/Desktop/个人代码/QR_Code/server && node -e "import('@qr-order/shared/pricing').then(m => console.log(Object.keys(m)))"
cd /Users/evergreen/Desktop/个人代码/QR_Code/client && node -e "import('@qr-order/shared/pricing').then(m => console.log(Object.keys(m)))"
```

Expected: Both print the list of exported functions.

- [ ] **Step 5: Commit if any cleanup was needed**

```bash
git add -A && git status
# Only commit if there are changes
git commit -m "chore: final cleanup after shared/pricing migration"
```

---

## Task Dependency Graph

```
Task 1 (Vitest setup + types)
  ├── Task 2 (item.ts)         ── can run in parallel ──┐
  │     └── Task 3 (tax.ts)    ── can run in parallel ──┤
  │           └── Task 4 (settlement.ts)                 │
  ├── Task 5 (stats.ts) ── depends on Task 2 only ──────┘
  └── Task 6 (index.ts) ── depends on Tasks 2-5
        ├── Task 7 (server session.service)    ── parallel ──┐
        ├── Task 8 (server split-bill.service) ── parallel ──┤
        ├── Task 9 (client cart-store)         ── parallel ──┤
        ├── Task 10 (client CheckoutPage)      ── parallel ──┤
        └── Task 11 (client Settlement+Split)  ── parallel ──┘
              └── Task 12 (final verification)
```

**Parallelizable groups:**
- After Task 1: Tasks 2 + 5 can run in parallel (item.ts and stats.ts are independent, though stats imports from item)
- After Task 6: Tasks 7, 8, 9, 10, 11 can ALL run in parallel (they modify different files)

# Input Validation & Graceful Fallback — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add comprehensive input validation with graceful fallback to all server endpoints, fix multi-tenant isolation gaps, and harden Express configuration — organized by P0/P1/P2 priority.

**Architecture:** Create a `server/src/lib/sanitize.ts` utility with pure sanitizer functions that clamp/truncate/strip invalid input to safe values (graceful fallback) rather than rejecting outright. Routes call sanitizers before passing data to services. Hard rejects only for values that cannot be safely defaulted (e.g., NaN amount, cross-tenant access).

**Tech Stack:** TypeScript, Express, Vitest (test sanitizers in shared/)

**Graceful Fallback Philosophy:**
- **Clamp** numeric values to valid range (negative tip → 0, percent 150 → 100)
- **Truncate** strings to max length (keep first N chars)
- **Strip** HTML/script tags from text fields
- **Reject** only when no safe default exists (NaN amount, missing required ID, cross-tenant)
- Every rejection returns a clear, actionable error message

---

## File Structure

```
server/src/lib/
└── sanitize.ts              ← NEW: Pure sanitizer/validator functions

server/src/middleware/
└── auth.middleware.ts        ← MODIFY: Fix optionalAuth storeId gap

server/src/
├── app.ts                   ← MODIFY: express.json limit, CORS fix
├── controllers/
│   └── menu.service.ts      ← MODIFY: Add storeId to getMenuItemById
├── routes/
│   ├── session.routes.ts    ← MODIFY: Add sanitization to all handlers
│   ├── payment.routes.ts    ← MODIFY: Add sanitization
│   ├── split-bill.routes.ts ← MODIFY: Add sanitization
│   ├── order.routes.ts      ← MODIFY: Add sanitization
│   ├── menu.routes.ts       ← MODIFY: Add sanitization
│   ├── staff.routes.ts      ← MODIFY: Add sanitization
│   ├── waitlist.routes.ts   ← MODIFY: Add sanitization
│   ├── coupon.routes.ts     ← MODIFY: Add sanitization
│   └── table.routes.ts      ← MODIFY: Add sanitization
```

---

## Task 1 (P0): Create `sanitize.ts` — Core Validation Utilities

**Files:**
- Create: `server/src/lib/sanitize.ts`
- Create: `server/src/lib/__tests__/sanitize.test.ts`

- [ ] **Step 1: Write failing tests** — `server/src/lib/__tests__/sanitize.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import {
  sanitizeAmount,
  sanitizePercent,
  sanitizeQuantity,
  sanitizeTip,
  sanitizeString,
  sanitizeText,
  requireFiniteNumber,
} from '../sanitize'

describe('sanitizeAmount', () => {
  it('passes valid amount through', () => {
    expect(sanitizeAmount(1500)).toEqual({ value: 1500 })
  })
  it('rejects NaN', () => {
    expect(sanitizeAmount(NaN)).toEqual({ error: 'Amount must be a valid number' })
  })
  it('rejects Infinity', () => {
    expect(sanitizeAmount(Infinity)).toEqual({ error: 'Amount must be a valid number' })
  })
  it('rejects negative', () => {
    expect(sanitizeAmount(-100)).toEqual({ error: 'Amount must be greater than 0' })
  })
  it('rejects zero', () => {
    expect(sanitizeAmount(0)).toEqual({ error: 'Amount must be greater than 0' })
  })
  it('rejects non-number type', () => {
    expect(sanitizeAmount('100' as any)).toEqual({ error: 'Amount must be a valid number' })
  })
  it('rounds float to integer', () => {
    expect(sanitizeAmount(15.7)).toEqual({ value: 16 })
  })
  it('caps at max (10M cents = $100K)', () => {
    expect(sanitizeAmount(999999999)).toEqual({ error: 'Amount exceeds maximum allowed' })
  })
})

describe('sanitizeTip', () => {
  it('passes valid tip through', () => {
    expect(sanitizeTip(500)).toEqual({ value: 500 })
  })
  it('clamps negative tip to 0 (graceful)', () => {
    expect(sanitizeTip(-100)).toEqual({ value: 0 })
  })
  it('allows 0 tip', () => {
    expect(sanitizeTip(0)).toEqual({ value: 0 })
  })
  it('clamps undefined to 0', () => {
    expect(sanitizeTip(undefined)).toEqual({ value: 0 })
  })
  it('rejects NaN', () => {
    expect(sanitizeTip(NaN)).toEqual({ error: 'Tip must be a valid number' })
  })
  it('rejects Infinity', () => {
    expect(sanitizeTip(Infinity)).toEqual({ error: 'Tip must be a valid number' })
  })
  it('caps at max', () => {
    expect(sanitizeTip(10000001)).toEqual({ value: 10000000 })
  })
  it('rounds float', () => {
    expect(sanitizeTip(3.5)).toEqual({ value: 4 })
  })
})

describe('sanitizePercent', () => {
  it('passes valid percent', () => {
    expect(sanitizePercent(50)).toEqual({ value: 50 })
  })
  it('clamps below 1 to 1', () => {
    expect(sanitizePercent(0)).toEqual({ value: 1 })
    expect(sanitizePercent(-5)).toEqual({ value: 1 })
  })
  it('clamps above 100 to 100', () => {
    expect(sanitizePercent(150)).toEqual({ value: 100 })
  })
  it('rejects NaN', () => {
    expect(sanitizePercent(NaN)).toEqual({ error: 'Percent must be a valid number' })
  })
  it('rejects non-number', () => {
    expect(sanitizePercent('50' as any)).toEqual({ error: 'Percent must be a valid number' })
  })
  it('rounds float', () => {
    expect(sanitizePercent(33.7)).toEqual({ value: 34 })
  })
})

describe('sanitizeQuantity', () => {
  it('passes valid quantity', () => {
    expect(sanitizeQuantity(3)).toEqual({ value: 3 })
  })
  it('rejects 0', () => {
    expect(sanitizeQuantity(0)).toEqual({ error: 'Quantity must be at least 1' })
  })
  it('rejects negative', () => {
    expect(sanitizeQuantity(-1)).toEqual({ error: 'Quantity must be at least 1' })
  })
  it('caps at max 9999', () => {
    expect(sanitizeQuantity(99999)).toEqual({ value: 9999 })
  })
  it('rounds float to integer', () => {
    expect(sanitizeQuantity(2.7)).toEqual({ value: 3 })
  })
  it('rejects NaN', () => {
    expect(sanitizeQuantity(NaN)).toEqual({ error: 'Quantity must be a valid number' })
  })
})

describe('requireFiniteNumber', () => {
  it('passes valid number', () => {
    expect(requireFiniteNumber(42, 'price')).toEqual({ value: 42 })
  })
  it('rejects NaN with field name', () => {
    expect(requireFiniteNumber(NaN, 'price')).toEqual({ error: 'price must be a valid number' })
  })
  it('rejects Infinity', () => {
    expect(requireFiniteNumber(Infinity, 'price')).toEqual({ error: 'price must be a valid number' })
  })
  it('rejects non-number', () => {
    expect(requireFiniteNumber('42' as any, 'price')).toEqual({ error: 'price must be a valid number' })
  })
  it('passes 0', () => {
    expect(requireFiniteNumber(0, 'price')).toEqual({ value: 0 })
  })
})

describe('sanitizeString', () => {
  it('passes normal string', () => {
    expect(sanitizeString('hello', 100)).toBe('hello')
  })
  it('truncates to maxLength', () => {
    expect(sanitizeString('abcdef', 3)).toBe('abc')
  })
  it('strips HTML tags', () => {
    expect(sanitizeString('<script>alert(1)</script>hello', 100)).toBe('hello')
  })
  it('strips nested tags', () => {
    expect(sanitizeString('<b><i>bold</i></b>', 100)).toBe('bold')
  })
  it('trims whitespace', () => {
    expect(sanitizeString('  hello  ', 100)).toBe('hello')
  })
  it('returns empty for non-string', () => {
    expect(sanitizeString(123 as any, 100)).toBe('')
  })
  it('returns empty for null/undefined', () => {
    expect(sanitizeString(null as any, 100)).toBe('')
    expect(sanitizeString(undefined as any, 100)).toBe('')
  })
})

describe('sanitizeText', () => {
  it('preserves newlines but strips tags', () => {
    expect(sanitizeText('<b>line1</b>\nline2', 200)).toBe('line1\nline2')
  })
  it('truncates long text', () => {
    expect(sanitizeText('a'.repeat(300), 200)).toBe('a'.repeat(200))
  })
})
```

- [ ] **Step 2: Add vitest to server**

```bash
cd /Users/evergreen/Desktop/个人代码/QR_Code
pnpm --filter @qr-order/server add -D vitest
```

Create `server/vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/lib/__tests__/**/*.test.ts'],
  },
})
```

Add to `server/package.json` scripts:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd /Users/evergreen/Desktop/个人代码/QR_Code && pnpm --filter @qr-order/server test
```

Expected: FAIL — module not found.

- [ ] **Step 4: Implement** — `server/src/lib/sanitize.ts`

```typescript
type SanitizeResult<T> = { value: T } | { error: string }

const MAX_AMOUNT = 10_000_000  // $100K in cents
const MAX_TIP = 10_000_000
const MAX_QUANTITY = 9999

/** Validate amount (cents). Must be positive finite integer. Hard reject on invalid. */
export function sanitizeAmount(val: unknown): SanitizeResult<number> {
  if (typeof val !== 'number' || !Number.isFinite(val)) {
    return { error: 'Amount must be a valid number' }
  }
  if (val <= 0) return { error: 'Amount must be greater than 0' }
  if (val > MAX_AMOUNT) return { error: 'Amount exceeds maximum allowed' }
  return { value: Math.round(val) }
}

/** Validate tip (cents). Graceful: negative → 0, undefined → 0. Cap at max. */
export function sanitizeTip(val: unknown): SanitizeResult<number> {
  if (val == null) return { value: 0 }
  if (typeof val !== 'number' || !Number.isFinite(val)) {
    return { error: 'Tip must be a valid number' }
  }
  if (val < 0) return { value: 0 }
  return { value: Math.round(Math.min(val, MAX_TIP)) }
}

/** Validate percent (1-100). Graceful: clamp to range. Hard reject NaN. */
export function sanitizePercent(val: unknown): SanitizeResult<number> {
  if (typeof val !== 'number' || !Number.isFinite(val)) {
    return { error: 'Percent must be a valid number' }
  }
  const clamped = Math.round(Math.max(1, Math.min(100, val)))
  return { value: clamped }
}

/** Validate quantity. Must be positive integer. Graceful: round floats, cap max. */
export function sanitizeQuantity(val: unknown): SanitizeResult<number> {
  if (typeof val !== 'number' || !Number.isFinite(val)) {
    return { error: 'Quantity must be a valid number' }
  }
  const rounded = Math.round(val)
  if (rounded < 1) return { error: 'Quantity must be at least 1' }
  return { value: Math.min(rounded, MAX_QUANTITY) }
}

/** Generic finite-number check with field name in error. Passes 0. */
export function requireFiniteNumber(val: unknown, field: string): SanitizeResult<number> {
  if (typeof val !== 'number' || !Number.isFinite(val)) {
    return { error: `${field} must be a valid number` }
  }
  return { value: val }
}

const TAG_RE = /<[^>]*>/g

/** Sanitize short string: strip HTML, trim, truncate. Returns '' for non-string. */
export function sanitizeString(val: unknown, maxLength: number): string {
  if (typeof val !== 'string') return ''
  return val.replace(TAG_RE, '').trim().slice(0, maxLength)
}

/** Sanitize multiline text: strip HTML, preserve newlines, truncate. */
export function sanitizeText(val: unknown, maxLength: number): string {
  if (typeof val !== 'string') return ''
  return val.replace(TAG_RE, '').slice(0, maxLength)
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd /Users/evergreen/Desktop/个人代码/QR_Code && pnpm --filter @qr-order/server test
```

Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add server/src/lib/sanitize.ts server/src/lib/__tests__/sanitize.test.ts server/vitest.config.ts server/package.json
git commit -m "feat: add sanitize.ts — graceful input validation with clamp/truncate/strip"
```

---

## Task 2 (P0): Fix Express Config — Body Limit + CORS

**Files:**
- Modify: `server/src/app.ts`

- [ ] **Step 1: Add body limit to `express.json()`** (line 34)

Replace:
```typescript
app.use(express.json())
```
With:
```typescript
app.use(express.json({ limit: '1mb' }))
```

- [ ] **Step 2: Fix CORS default** (lines 26-28)

Replace:
```typescript
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
}))
```
With:
```typescript
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
}))
```

- [ ] **Step 3: Type-check**

```bash
cd /Users/evergreen/Desktop/个人代码/QR_Code/server && npx tsc --noEmit 2>&1 | grep app.ts
```

Expected: No errors in app.ts.

- [ ] **Step 4: Commit**

```bash
git add server/src/app.ts
git commit -m "fix(P0): set express.json body limit 1mb, restrict CORS default origin"
```

---

## Task 3 (P0): Fix Multi-Tenant Isolation — `getMenuItemById` + Session Cart

**Files:**
- Modify: `server/src/controllers/menu.service.ts:53-55`
- Modify: `server/src/routes/session.routes.ts:42-57` (cart endpoints)
- Modify: all callers of `getMenuItemById`

- [ ] **Step 1: Add storeId parameter to `getMenuItemById`**

In `server/src/controllers/menu.service.ts`, replace lines 53-55:
```typescript
export function getMenuItemById(id: string): MenuItem | undefined {
  return menuItemStore.getById(id)
}
```
With:
```typescript
export function getMenuItemById(storeId: string, id: string): MenuItem | undefined {
  const item = menuItemStore.getById(id)
  if (!item || item.storeId !== storeId) return undefined
  return item
}
```

- [ ] **Step 2: Update all callers of `getMenuItemById`**

Search for all usages:
```bash
cd /Users/evergreen/Desktop/个人代码/QR_Code && grep -rn "getMenuItemById" server/src/
```

Update each call to pass `storeId`. Common callsites:
- `order.service.ts`: `getMenuItemById(item.menuItemId)` → `getMenuItemById(storeId, item.menuItemId)`
- `payment.service.ts`: same pattern
- Any other callsite found by grep

- [ ] **Step 3: Add storeId validation to session cart routes**

In `server/src/routes/session.routes.ts`, find the GET cart handler (around line 42):
```typescript
router.get('/:sessionId/cart', (req: Request, res: Response) => {
  const session = svc.getSessionById(req.params.sessionId)
```

Add storeId check after fetching session:
```typescript
router.get('/:sessionId/cart', (req: Request, res: Response) => {
  const session = svc.getSessionById(req.params.sessionId)
  if (!session || session.storeId !== req.params.storeId) {
    res.status(404).json({ error: 'Session not found' })
    return
  }
```

Do the same for the PUT cart handler (around line 53):
```typescript
router.put('/:sessionId/cart', (req: Request, res: Response) => {
```
Add after destructuring:
```typescript
  const session = svc.getSessionById(req.params.sessionId)
  if (!session || session.storeId !== req.params.storeId) {
    res.status(404).json({ error: 'Session not found' })
    return
  }
```

- [ ] **Step 4: Type-check**

```bash
cd /Users/evergreen/Desktop/个人代码/QR_Code/server && npx tsc --noEmit 2>&1 | grep -E "menu.service|order.service|payment.service|session.routes"
```

Expected: 0 errors in these files.

- [ ] **Step 5: Commit**

```bash
git add server/src/controllers/menu.service.ts server/src/routes/session.routes.ts server/src/controllers/order.service.ts server/src/controllers/payment.service.ts
git commit -m "fix(P0): add storeId filter to getMenuItemById, validate session cart storeId"
```

---

## Task 4 (P0): Sanitize Financial Endpoints — Session Routes

**Files:**
- Modify: `server/src/routes/session.routes.ts`

- [ ] **Step 1: Add import**

At top of file, add:
```typescript
import { sanitizeAmount, sanitizeTip, sanitizePercent, sanitizeString } from '../lib/sanitize.js'
```

- [ ] **Step 2: Fix `POST /:sessionId/pay-percent`** (lines 109-115)

Replace:
```typescript
  const { percent } = req.body
  if (typeof percent !== 'number' || percent < 1 || percent > 100) {
    res.status(400).json({ error: 'percent must be 1-100' })
    return
  }
  const result = svc.payByPercent(req.params.storeId, req.params.sessionId, percent)
```
With:
```typescript
  const pctResult = sanitizePercent(req.body.percent)
  if ('error' in pctResult) { res.status(400).json({ error: pctResult.error }); return }
  const result = svc.payByPercent(req.params.storeId, req.params.sessionId, pctResult.value)
```

- [ ] **Step 3: Fix `POST /:sessionId/cash-payment`** (lines 123-134)

Replace:
```typescript
  const { amount, receivedAmount } = req.body
  if (!amount || amount <= 0) {
    res.status(400).json({ error: 'amount required' })
    return
  }
  if (!receivedAmount || receivedAmount < amount) {
    res.status(400).json({ error: 'receivedAmount must be >= amount' })
    return
  }
  const result = svc.recordCashPayment(req.params.storeId, req.params.sessionId, amount, receivedAmount)
```
With:
```typescript
  const amtResult = sanitizeAmount(req.body.amount)
  if ('error' in amtResult) { res.status(400).json({ error: amtResult.error }); return }
  const rcvResult = sanitizeAmount(req.body.receivedAmount)
  if ('error' in rcvResult) { res.status(400).json({ error: rcvResult.error }); return }
  if (rcvResult.value < amtResult.value) {
    res.status(400).json({ error: 'receivedAmount must be >= amount' })
    return
  }
  const result = svc.recordCashPayment(req.params.storeId, req.params.sessionId, amtResult.value, rcvResult.value)
```

- [ ] **Step 4: Fix `POST /:sessionId/payments`** (lines 165-174)

Replace:
```typescript
  const { amount, paidBy, stripePaymentIntentId } = req.body
  if (!amount || amount <= 0) {
    res.status(400).json({ error: 'amount required' })
    return
  }
  const result = svc.addPayment(req.params.storeId, req.params.sessionId, amount, paidBy, stripePaymentIntentId)
```
With:
```typescript
  const { paidBy, stripePaymentIntentId } = req.body
  const amtResult = sanitizeAmount(req.body.amount)
  if ('error' in amtResult) { res.status(400).json({ error: amtResult.error }); return }
  const safePaidBy = paidBy ? sanitizeString(paidBy, 100) : undefined
  const result = svc.addPayment(req.params.storeId, req.params.sessionId, amtResult.value, safePaidBy, stripePaymentIntentId)
```

- [ ] **Step 5: Sanitize cart deviceId** (line 54-56)

Replace:
```typescript
  const { deviceId, items } = req.body
  if (!deviceId || typeof deviceId !== 'string') {
    res.status(400).json({ error: 'deviceId required' })
    return
  }
```
With:
```typescript
  const { items } = req.body
  const deviceId = sanitizeString(req.body.deviceId, 64)
  if (!deviceId) {
    res.status(400).json({ error: 'deviceId required' })
    return
  }
```

- [ ] **Step 6: Type-check**

```bash
cd /Users/evergreen/Desktop/个人代码/QR_Code/server && npx tsc --noEmit 2>&1 | grep session.routes
```

Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add server/src/routes/session.routes.ts
git commit -m "fix(P0): sanitize financial inputs in session routes — amount, percent, tip, deviceId"
```

---

## Task 5 (P0): Sanitize Financial Endpoints — Payment + Split-Bill Routes

**Files:**
- Modify: `server/src/routes/payment.routes.ts`
- Modify: `server/src/routes/split-bill.routes.ts`

- [ ] **Step 1: Fix `payment.routes.ts`** — Add sanitization to checkout

Add import:
```typescript
import { sanitizeAmount, sanitizeTip } from '../lib/sanitize.js'
```

After the destructuring on line 10, add tip sanitization before passing to service:
```typescript
  const tipResult = sanitizeTip(tipAmount)
  if ('error' in tipResult) { res.status(400).json({ error: tipResult.error }); return }
```

And for the session checkout path, sanitize amount:
```typescript
  if (sessionId) {
    const amtResult = amount != null ? sanitizeAmount(amount) : { value: undefined }
    if ('error' in amtResult) { res.status(400).json({ error: amtResult.error }); return }
    const result = await createPaymentIntentForSession({ storeId, sessionId, amount: amtResult.value, paidBy, tipAmount: tipResult.value, settlementType, itemKeys, percent })
```

- [ ] **Step 2: Fix `split-bill.routes.ts`** — Sanitize receivedAmount, tipAmount

Add import:
```typescript
import { sanitizeAmount, sanitizeTip, sanitizePercent } from '../lib/sanitize.js'
```

Replace pay-cash validation (lines 72-79):
```typescript
  const rcvResult = sanitizeAmount(req.body.receivedAmount)
  if ('error' in rcvResult) { res.status(400).json({ error: rcvResult.error }); return }
  const tipResult = sanitizeTip(req.body.tipAmount)
  if ('error' in tipResult) { res.status(400).json({ error: tipResult.error }); return }
  const result = pay.paySplitBillCash(req.params.storeId, req.params.splitBillId, rcvResult.value, tipResult.value)
```

Replace capture validation (lines 88-95):
```typescript
  const tipResult = sanitizeTip(req.body.tipAmount)
  if ('error' in tipResult) { res.status(400).json({ error: tipResult.error }); return }
  const result = await pay.captureSplitBillPayment(req.params.storeId, req.params.splitBillId, tipResult.value)
```

Replace pay-card tipAmount handling (around line 54):
```typescript
  const tipResult = sanitizeTip(tipAmount)
  if ('error' in tipResult) { res.status(400).json({ error: tipResult.error }); return }
```

Replace create split-bill percent validation (around line 29):
```typescript
  if (method === 'by-percent') {
    const pctResult = sanitizePercent(percent)
    if ('error' in pctResult) { res.status(400).json({ error: pctResult.error }); return }
    percent = pctResult.value
  }
```

- [ ] **Step 3: Type-check**

```bash
cd /Users/evergreen/Desktop/个人代码/QR_Code/server && npx tsc --noEmit 2>&1 | grep -E "payment.routes|split-bill.routes"
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add server/src/routes/payment.routes.ts server/src/routes/split-bill.routes.ts
git commit -m "fix(P0): sanitize tip/amount/percent in payment and split-bill routes"
```

---

## Task 6 (P0): Fix `menu.service.ts` — isFinite + price validation

**Files:**
- Modify: `server/src/controllers/menu.service.ts:57-68`

- [ ] **Step 1: Strengthen `validateMenuItem`**

Replace:
```typescript
function validateMenuItem(data: Partial<MenuItem>): string | null {
  if (data.price != null && (typeof data.price !== 'number' || data.price < 0)) return 'Price must be >= 0'
  if (data.options) {
    for (const opt of data.options) {
      for (const choice of opt.choices) {
        if (typeof choice.priceAdjust !== 'number' || choice.priceAdjust < 0) {
          return `Option choice "${choice.name}" priceAdjust must be >= 0`
        }
      }
    }
  }
  return null
}
```
With:
```typescript
function validateMenuItem(data: Partial<MenuItem>): string | null {
  if (data.price != null) {
    if (typeof data.price !== 'number' || !Number.isFinite(data.price) || data.price < 0) {
      return 'Price must be a finite number >= 0'
    }
  }
  if (data.options) {
    for (const opt of data.options) {
      for (const choice of opt.choices) {
        if (typeof choice.priceAdjust !== 'number' || !Number.isFinite(choice.priceAdjust) || choice.priceAdjust < 0) {
          return `Option choice "${choice.name}" priceAdjust must be a finite number >= 0`
        }
      }
    }
  }
  return null
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/evergreen/Desktop/个人代码/QR_Code/server && npx tsc --noEmit 2>&1 | grep menu.service
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add server/src/controllers/menu.service.ts
git commit -m "fix(P0): add isFinite check to menu item price and option priceAdjust validation"
```

---

## Task 7 (P1): Sanitize String Inputs — Menu, Order, Staff, Waitlist Routes

**Files:**
- Modify: `server/src/routes/menu.routes.ts`
- Modify: `server/src/routes/order.routes.ts`
- Modify: `server/src/routes/staff.routes.ts`
- Modify: `server/src/routes/waitlist.routes.ts`

- [ ] **Step 1: Fix `menu.routes.ts`** — Sanitize item creation strings

Add import:
```typescript
import { sanitizeString, sanitizeText, requireFiniteNumber } from '../lib/sanitize.js'
```

After destructuring on line 55, before the existence check, sanitize strings:
```typescript
  const safeName = sanitizeString(name, 100)
  const safeNameEn = nameEn ? sanitizeString(nameEn, 100) : undefined
  const safeDesc = description ? sanitizeText(description, 500) : undefined
  const safeDescEn = descriptionEn ? sanitizeText(descriptionEn, 500) : undefined
```

Replace the existence check:
```typescript
  if (!categoryId || !safeName || price == null) {
```

And pass sanitized values to `createMenuItem`:
```typescript
  const item = createMenuItem(req.params.storeId, {
    categoryId, name: safeName, nameEn: safeNameEn,
    description: safeDesc, descriptionEn: safeDescEn,
    price, image, available, sortOrder, options,
  })
```

Also sanitize category name (around line 106):
```typescript
  const safeName = sanitizeString(name, 100)
  if (!safeName) { res.status(400).json({ error: 'name is required' }); return }
```

- [ ] **Step 2: Fix `order.routes.ts`** — Sanitize remark, customerName

Add import:
```typescript
import { sanitizeString } from '../lib/sanitize.js'
```

In POST / handler (around line 10), add remark sanitization before calling createOrder:
```typescript
  // Sanitize item remarks and customerName
  if (req.body.items && Array.isArray(req.body.items)) {
    for (const item of req.body.items) {
      if (item.remark) item.remark = sanitizeString(item.remark, 200)
    }
  }
  if (req.body.customerName) {
    req.body.customerName = sanitizeString(req.body.customerName, 50)
  }
```

- [ ] **Step 3: Fix `staff.routes.ts`** — Validate username/password length

Add import:
```typescript
import { sanitizeString } from '../lib/sanitize.js'
```

After the existence check (line 20), add:
```typescript
  const safeUsername = sanitizeString(username, 50)
  if (!safeUsername) { res.status(400).json({ error: 'Username is required' }); return }
  if (typeof password !== 'string' || password.length < 4) {
    res.status(400).json({ error: 'Password must be at least 4 characters' })
    return
  }
  if (password.length > 100) {
    res.status(400).json({ error: 'Password too long' })
    return
  }
```

- [ ] **Step 4: Fix `waitlist.routes.ts`** — Sanitize name, validate partySize

Add import:
```typescript
import { sanitizeString, sanitizeQuantity } from '../lib/sanitize.js'
```

Replace validation (line 20-24):
```typescript
  const safeName = sanitizeString(req.body.name, 50)
  const sizeResult = sanitizeQuantity(req.body.partySize)
  if (!safeName) { res.status(400).json({ error: 'name is required' }); return }
  if ('error' in sizeResult) { res.status(400).json({ error: sizeResult.error }); return }
  const phone = req.body.phone ? sanitizeString(req.body.phone, 20) : undefined
  const result = addEntry(req.params.storeId, { name: safeName, partySize: sizeResult.value, phone })
```

- [ ] **Step 5: Type-check**

```bash
cd /Users/evergreen/Desktop/个人代码/QR_Code/server && npx tsc --noEmit 2>&1 | grep -E "menu.routes|order.routes|staff.routes|waitlist.routes"
```

Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add server/src/routes/menu.routes.ts server/src/routes/order.routes.ts server/src/routes/staff.routes.ts server/src/routes/waitlist.routes.ts
git commit -m "fix(P1): sanitize string inputs — name, remark, description, username with maxLength + HTML strip"
```

---

## Task 8 (P1): Fix `optionalAuth` storeId Gap

**Files:**
- Modify: `server/src/middleware/auth.middleware.ts:34-44`

- [ ] **Step 1: Fix optionalAuth**

Replace:
```typescript
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (header?.startsWith('Bearer ')) {
    const token = header.slice(7)
    const payload = verifyToken(token)
    if (payload && (!req.params.storeId || payload.storeId === req.params.storeId)) {
      req.user = payload
    }
  }
  next()
}
```
With:
```typescript
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (header?.startsWith('Bearer ')) {
    const token = header.slice(7)
    const payload = verifyToken(token)
    if (payload && req.params.storeId && payload.storeId === req.params.storeId) {
      req.user = payload
    }
  }
  next()
}
```

Change: Remove `!req.params.storeId ||` — now optionalAuth only sets `req.user` when storeId is present AND matches. If no storeId in route, token is silently ignored (safe default).

- [ ] **Step 2: Type-check**

```bash
cd /Users/evergreen/Desktop/个人代码/QR_Code/server && npx tsc --noEmit 2>&1 | grep auth.middleware
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add server/src/middleware/auth.middleware.ts
git commit -m "fix(P1): optionalAuth requires storeId match — no longer accepts missing storeId"
```

---

## Task 9 (P1): Sanitize Coupon + Table Routes

**Files:**
- Modify: `server/src/routes/coupon.routes.ts`
- Modify: `server/src/routes/table.routes.ts`

- [ ] **Step 1: Fix `coupon.routes.ts`** — Validate coupon fields

Add import:
```typescript
import { sanitizeString, requireFiniteNumber } from '../lib/sanitize.js'
```

Before `createCoupon` call (around line 19), sanitize:
```typescript
  const data = req.body
  if (data.code) data.code = sanitizeString(data.code, 30)
  if (data.discountValue != null) {
    const dvResult = requireFiniteNumber(data.discountValue, 'discountValue')
    if ('error' in dvResult) { res.status(400).json({ error: dvResult.error }); return }
    if (dvResult.value < 0) { res.status(400).json({ error: 'discountValue must be >= 0' }); return }
    data.discountValue = dvResult.value
  }
  if (data.minOrderAmount != null) {
    const moResult = requireFiniteNumber(data.minOrderAmount, 'minOrderAmount')
    if ('error' in moResult) { res.status(400).json({ error: moResult.error }); return }
    if (moResult.value < 0) data.minOrderAmount = 0  // graceful clamp
  }
  if (data.maxUses != null) {
    const muResult = requireFiniteNumber(data.maxUses, 'maxUses')
    if ('error' in muResult) { res.status(400).json({ error: muResult.error }); return }
    if (muResult.value < 0) data.maxUses = 0  // graceful clamp
  }
  const coupon = createCoupon(req.params.storeId, data)
```

Apply same validation before `updateCoupon` call (around line 24).

- [ ] **Step 2: Fix `table.routes.ts`** — Validate table number and fields

Add import:
```typescript
import { sanitizeString, requireFiniteNumber } from '../lib/sanitize.js'
```

In POST /enable (around line 33), after destructuring:
```typescript
  const numResult = requireFiniteNumber(number, 'number')
  if ('error' in numResult || numResult.value < 1) {
    res.status(400).json({ error: 'Table number must be a positive integer' })
    return
  }
  const safeName = name ? sanitizeString(name, 50) : undefined
  const safeNameEn = nameEn ? sanitizeString(nameEn, 50) : undefined
  const result = enableTable(req.params.storeId, numResult.value, safeName, safeNameEn)
```

- [ ] **Step 3: Type-check**

```bash
cd /Users/evergreen/Desktop/个人代码/QR_Code/server && npx tsc --noEmit 2>&1 | grep -E "coupon.routes|table.routes"
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add server/src/routes/coupon.routes.ts server/src/routes/table.routes.ts
git commit -m "fix(P1): sanitize coupon discountValue/maxUses, table number/name inputs"
```

---

## Task 10 (P2): Strengthen order.service.ts — Quantity + Price Server Validation

**Files:**
- Modify: `server/src/controllers/order.service.ts`

- [ ] **Step 1: Add isFinite checks in `createOrder`**

Find the quantity validation (around line 58):
```typescript
    if (item.quantity < 1) return { error: 'Quantity must be at least 1' }
```

Replace with:
```typescript
    if (typeof item.quantity !== 'number' || !Number.isFinite(item.quantity) || !Number.isInteger(item.quantity)) {
      return { error: `Item quantity must be a valid integer` }
    }
    if (item.quantity < 1) return { error: 'Quantity must be at least 1' }
    if (item.quantity > 9999) return { error: 'Quantity exceeds maximum' }
```

After the menuItem lookup (around line 54), add price validation — server uses DB price, not client price:
```typescript
    // Use server-side price (from DB), never trust client-provided price
    if (!Number.isFinite(menuItem.price)) {
      return { error: `Menu item ${item.menuItemId} has invalid price` }
    }
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/evergreen/Desktop/个人代码/QR_Code/server && npx tsc --noEmit 2>&1 | grep order.service
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add server/src/controllers/order.service.ts
git commit -m "fix(P2): add isFinite/isInteger/max checks to order item quantity and price"
```

---

## Task 11 (P2): Run Full Test Suite + Type-Check

**Files:** None (verification only)

- [ ] **Step 1: Run sanitize tests**

```bash
cd /Users/evergreen/Desktop/个人代码/QR_Code && pnpm --filter @qr-order/server test
```

Expected: All tests PASS.

- [ ] **Step 2: Run shared pricing tests**

```bash
cd /Users/evergreen/Desktop/个人代码/QR_Code && pnpm --filter @qr-order/shared test
```

Expected: All 59 tests PASS.

- [ ] **Step 3: Type-check client**

```bash
cd /Users/evergreen/Desktop/个人代码/QR_Code/client && npx tsc -b
```

Expected: 0 errors.

- [ ] **Step 4: Type-check server**

```bash
cd /Users/evergreen/Desktop/个人代码/QR_Code/server && npx tsc --noEmit 2>&1 | grep -c "error TS"
```

Expected: Same count as before (pre-existing Express type issues only, 0 new).

- [ ] **Step 5: Verify no regressions with grep**

```bash
cd /Users/evergreen/Desktop/个人代码/QR_Code && grep -rn "isFinite\|sanitize" server/src/routes/ | wc -l
```

Expected: Significant number of sanitization calls across all route files.

- [ ] **Step 6: Commit if any cleanup needed**

```bash
git status && git diff --stat
```

---

## Task Dependency Graph

```
Task 1 (sanitize.ts) ← foundation
  ├── Task 2 (app.ts config)           ── independent
  ├── Task 3 (multi-tenant isolation)   ── independent
  ├── Task 4 (session routes)           ── depends on Task 1
  ├── Task 5 (payment + split routes)   ── depends on Task 1
  └── Task 6 (menu.service isFinite)    ── independent
        ├── Task 7 (string sanitization) ── depends on Task 1
        ├── Task 8 (optionalAuth fix)    ── independent
        └── Task 9 (coupon + table)      ── depends on Task 1
              └── Task 10 (order.service)  ── independent
                    └── Task 11 (final verification)
```

**Parallelizable groups after Task 1:**
- Tasks 2, 3, 6, 8 can ALL run in parallel (no shared file dependencies)
- Tasks 4, 5 can run in parallel (different route files)
- Tasks 7, 9 can run in parallel (different route files)
- Task 10 independent
- Task 11 must be last

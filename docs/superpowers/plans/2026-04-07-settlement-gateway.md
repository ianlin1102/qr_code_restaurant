# Settlement Gateway Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace scattered settlement validation with a centralized gateway that validates, executes, logs, and returns `allowedActions` for every settlement operation.

**Architecture:** `settlement/gateway.ts` is the single entry point. It loads session context once, validates via shared rules, dispatches to action handlers (which call existing service functions), computes `allowedActions`, logs with `[SETTLEMENT]` prefix, and returns a unified response. Services become trusted internal executors with validation stripped.

**Tech Stack:** TypeScript, Express, JsonStore (existing), Vitest

**Spec:** `docs/superpowers/specs/2026-04-07-settlement-gateway-design.md`

---

## Parallelization Map

```
Phase 1: Task 1 → Task 2 (sequential foundation)
              ↓
          Task 3A ║ Task 3B ║ Task 3C (3 parallel agents — action handlers)
              ↓
          Task 4 (gateway entry — depends on all Phase 1)
              ↓
          Task 5 (unit tests for gateway)
              ↓
Phase 2: Task 6A ║ Task 6B (2 parallel agents — route switchover)
              ↓
Phase 3: Task 7A ║ Task 7B ║ Task 7C (3 parallel agents — strip service validation)
              ↓
Phase 4: Task 8 (frontend adaptation)
              ↓
Phase 5: Task 9 (integration tests) → Task 10 (cleanup + Docker rebuild)
```

**Agent team coordination notes:**
- Task 3A/3B/3C: each agent creates different action files, NO shared state. They all import from `types.ts` and `rules.ts` (created in Task 1-2). Agents must use EXACT type names from Task 1.
- Task 6A/6B: one does session.routes, one does split-bill.routes. Both import `executeSettlement` from gateway.ts. No file overlap.
- Task 7A/7B/7C: one per service file. Each strips validation from their file only. No cross-file edits.

---

## Phase 1: Foundation + Action Handlers

### Task 1: Types and Error definitions

**Files:**
- Create: `server/src/settlement/types.ts`
- Create: `server/src/settlement/errors.ts`

- [ ] **Step 1: Create types.ts**

```typescript
// server/src/settlement/types.ts
import type { Session, Payment, SplitBill, Order, Store } from '@qr-order/shared'

// ===== Actions (what the caller wants to do) =====

export type SettlementAction =
  | { type: 'pay-items'; itemKeys: string[] }
  | { type: 'pay-percent'; percent: number }
  | { type: 'cash-payment'; amount: number; receivedAmount: number }
  | { type: 'add-payment'; amount: number; paidBy: string; tipAmount?: number; stripePaymentIntentId?: string }
  | { type: 'create-split'; splitType: 'by-item' | 'by-percent'; itemKeys?: string[]; percent?: number; label?: string }
  | { type: 'delete-split'; splitBillId: string }
  | { type: 'pay-split-card'; splitBillId: string; tipAmount?: number }
  | { type: 'pay-split-cash'; splitBillId: string; receivedAmount: number; tipAmount?: number }
  | { type: 'close-session' }
  | { type: 'reopen-session' }

// ===== Context (loaded once per call) =====

export interface SettlementContext {
  store: Store
  session: Session
  orders: Order[]
  payments: Payment[]
  splits: SplitBill[]
  paidQtyMap: Map<string, number>
  assignedQtyMap: Map<string, number>
  remaining: number
  mainBillTotal: number
}

// ===== AllowedActions =====

export interface AllowedActions {
  payByItems: boolean
  payByPercent: boolean
  cashPayment: boolean
  createSplitByItem: boolean
  createSplitByPercent: boolean
  paySplit: boolean
  deleteSplit: boolean
  closeSession: boolean
  reopenSession: boolean
}

// ===== Results =====

export interface SettlementSuccess {
  ok: true
  data: Record<string, unknown>
  sessionStatus: 'active' | 'paid' | 'closed'
  remaining: number
  allowedActions: AllowedActions
}

export interface SettlementFailure {
  ok: false
  code: string
  message: string
  details?: Record<string, unknown>
  allowedActions: AllowedActions
}

export type SettlementResult = SettlementSuccess | SettlementFailure
```

- [ ] **Step 2: Create errors.ts**

```typescript
// server/src/settlement/errors.ts
import type { AllowedActions, SettlementFailure } from './types'

export const ErrorCodes = {
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  SESSION_CLOSED: 'SESSION_CLOSED',
  SESSION_NOT_CLOSED: 'SESSION_NOT_CLOSED',
  SESSION_FULLY_PAID: 'SESSION_FULLY_PAID',
  SESSION_NOT_FULLY_PAID: 'SESSION_NOT_FULLY_PAID',
  SETTLEMENT_MODE_CONFLICT: 'SETTLEMENT_MODE_CONFLICT',
  ITEM_ALREADY_PAID: 'ITEM_ALREADY_PAID',
  ITEM_ALREADY_ASSIGNED: 'ITEM_ALREADY_ASSIGNED',
  AMOUNT_BELOW_MINIMUM: 'AMOUNT_BELOW_MINIMUM',
  REMAINING_BELOW_MINIMUM: 'REMAINING_BELOW_MINIMUM',
  INSUFFICIENT_RECEIVED: 'INSUFFICIENT_RECEIVED',
  SPLIT_NOT_FOUND: 'SPLIT_NOT_FOUND',
  SPLIT_ALREADY_PAID: 'SPLIT_ALREADY_PAID',
  INVALID_PERCENT: 'INVALID_PERCENT',
  INVALID_ITEM_KEY: 'INVALID_ITEM_KEY',
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  MODULE_NOT_LICENSED: 'MODULE_NOT_LICENSED',
} as const

export type ErrorCode = keyof typeof ErrorCodes

export function createError(
  code: ErrorCode,
  message: string,
  allowedActions: AllowedActions,
  details?: Record<string, unknown>,
): SettlementFailure {
  return { ok: false, code, message, allowedActions, ...(details ? { details } : {}) }
}

/** Map error code to HTTP status */
export function httpStatus(code: ErrorCode): number {
  switch (code) {
    case 'SESSION_NOT_FOUND':
    case 'SPLIT_NOT_FOUND':
      return 404
    case 'MODULE_NOT_LICENSED':
      return 403
    default:
      return 400
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add server/src/settlement/types.ts server/src/settlement/errors.ts
git commit -m "feat(settlement): add types and error code definitions"
```

---

### Task 2: Rules, AllowedActions, Logger

**Files:**
- Create: `server/src/settlement/rules.ts`
- Create: `server/src/settlement/allowed-actions.ts`
- Create: `server/src/settlement/logger.ts`

**Depends on:** Task 1

- [ ] **Step 1: Create rules.ts**

```typescript
// server/src/settlement/rules.ts
import type { SettlementContext } from './types'
import type { ErrorCode } from './errors'
import { orderStore } from '../repositories/stores'

export function checkSessionExists(ctx: SettlementContext | null): ErrorCode | null {
  if (!ctx) return 'SESSION_NOT_FOUND'
  return null
}

export function checkNotClosed(ctx: SettlementContext): ErrorCode | null {
  if (ctx.session.status === 'closed') return 'SESSION_CLOSED'
  return null
}

export function checkIsClosed(ctx: SettlementContext): ErrorCode | null {
  if (ctx.session.status !== 'closed') return 'SESSION_NOT_CLOSED'
  return null
}

export function checkHasRemaining(ctx: SettlementContext): ErrorCode | null {
  if (ctx.remaining <= 0) return 'SESSION_FULLY_PAID'
  return null
}

export function checkIsPaid(ctx: SettlementContext): ErrorCode | null {
  if (ctx.remaining > 0) return 'SESSION_NOT_FULLY_PAID'
  return null
}

export function checkModeCompatible(ctx: SettlementContext, requiredMode: 'by-item' | 'by-percent'): ErrorCode | null {
  const current = ctx.session.settlementMode
  if (!current) return null
  if (current !== requiredMode) return 'SETTLEMENT_MODE_CONFLICT'
  return null
}

export function checkItemKeys(
  ctx: SettlementContext,
  itemKeys: string[],
  checkPaid: boolean,
  checkAssigned: boolean,
): ErrorCode | null {
  for (const key of itemKeys) {
    const parts = key.split(':')
    if (parts.length < 2) return 'INVALID_ITEM_KEY'
    const orderId = parts[0]
    const idx = parseInt(parts[1], 10)
    if (isNaN(idx)) return 'INVALID_ITEM_KEY'

    const order = orderStore.getById(orderId)
    if (!order || !ctx.session.orderIds.includes(orderId)) return 'INVALID_ITEM_KEY'
    const item = order.items[idx]
    if (!item || item.voided) return 'INVALID_ITEM_KEY'

    const baseKey = `${orderId}:${idx}`
    const reqQty = parts.length >= 3 ? parseInt(parts[2], 10) : item.quantity

    if (checkPaid) {
      const paidQty = ctx.paidQtyMap.get(baseKey) ?? 0
      const available = item.quantity - paidQty
      if (reqQty > available) return 'ITEM_ALREADY_PAID'
    }

    if (checkAssigned) {
      const paidQty = ctx.paidQtyMap.get(baseKey) ?? 0
      const assignedQty = ctx.assignedQtyMap.get(baseKey) ?? 0
      const available = item.quantity - paidQty - assignedQty
      if (reqQty > available) return 'ITEM_ALREADY_ASSIGNED'
    }
  }
  return null
}

export function checkPercent(percent: unknown): ErrorCode | null {
  if (typeof percent !== 'number' || !Number.isFinite(percent)) return 'INVALID_PERCENT'
  if (percent < 1 || percent > 100) return 'INVALID_PERCENT'
  return null
}

export function checkAmount(val: unknown): ErrorCode | null {
  if (typeof val !== 'number' || !Number.isFinite(val) || val <= 0) return 'INVALID_AMOUNT'
  return null
}

export function checkMinimum(splitAmount: number, remainingAfterSplit: number, isFullPayment: boolean): ErrorCode | null {
  if (isFullPayment) return null
  if (splitAmount < 100) return 'AMOUNT_BELOW_MINIMUM'
  if (remainingAfterSplit > 0 && remainingAfterSplit < 100) return 'REMAINING_BELOW_MINIMUM'
  return null
}

export function checkSplitExists(ctx: SettlementContext, splitBillId: string): ErrorCode | null {
  const sb = ctx.splits.find(s => s.id === splitBillId)
  if (!sb) return 'SPLIT_NOT_FOUND'
  return null
}

export function checkSplitUnpaid(ctx: SettlementContext, splitBillId: string): ErrorCode | null {
  const sb = ctx.splits.find(s => s.id === splitBillId)
  if (sb && sb.status !== 'unpaid') return 'SPLIT_ALREADY_PAID'
  return null
}

export function checkReceived(received: number, due: number): ErrorCode | null {
  if (received < due) return 'INSUFFICIENT_RECEIVED'
  return null
}
```

- [ ] **Step 2: Create allowed-actions.ts**

```typescript
// server/src/settlement/allowed-actions.ts
import type { SettlementContext, AllowedActions } from './types'

export function computeAllowedActions(ctx: SettlementContext): AllowedActions {
  const { remaining, session, splits } = ctx
  const mode = session.settlementMode
  const isPaid = remaining <= 0
  const hasUnpaidSplits = splits.some(s => s.status === 'unpaid')
  const isClosed = session.status === 'closed'

  return {
    payByItems:          !isClosed && !isPaid && mode !== 'by-percent',
    payByPercent:        !isClosed && !isPaid && mode !== 'by-item',
    cashPayment:         !isClosed && !isPaid,
    createSplitByItem:   !isClosed && !isPaid && mode !== 'by-percent',
    createSplitByPercent:!isClosed && !isPaid && mode !== 'by-item',
    paySplit:            !isClosed && hasUnpaidSplits,
    deleteSplit:         !isClosed && hasUnpaidSplits,
    closeSession:        !isClosed && isPaid,
    reopenSession:       isClosed,
  }
}

export const EMPTY_ACTIONS: AllowedActions = {
  payByItems: false, payByPercent: false, cashPayment: false,
  createSplitByItem: false, createSplitByPercent: false,
  paySplit: false, deleteSplit: false, closeSession: false, reopenSession: false,
}
```

- [ ] **Step 3: Create logger.ts**

```typescript
// server/src/settlement/logger.ts
import logger from '../lib/logger'
import type { SettlementAction, SettlementResult, SettlementContext } from './types'

export function logSettlement(
  ctx: SettlementContext,
  action: SettlementAction,
  result: SettlementResult,
) {
  const base = {
    store: ctx.session.storeId,
    session: ctx.session.id,
    table: ctx.session.tableId,
    action: action.type,
  }

  if (result.ok) {
    logger.info({
      ...base,
      status: 'OK',
      remaining: result.remaining,
      sessionStatus: result.sessionStatus,
    }, `[SETTLEMENT] ${action.type} succeeded`)
  } else {
    logger.warn({
      ...base,
      status: 'REJECTED',
      code: result.code,
      message: result.message,
    }, `[SETTLEMENT] ${action.type} rejected: ${result.code}`)
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add server/src/settlement/rules.ts server/src/settlement/allowed-actions.ts server/src/settlement/logger.ts
git commit -m "feat(settlement): add rules, allowedActions, and logger"
```

---

### Task 3A: Action handlers — payment operations (PARALLEL)

**Files:**
- Create: `server/src/settlement/actions/pay-items.ts`
- Create: `server/src/settlement/actions/pay-percent.ts`
- Create: `server/src/settlement/actions/cash-payment.ts`
- Create: `server/src/settlement/actions/add-payment.ts`

**Depends on:** Task 1, Task 2
**Parallel with:** Task 3B, Task 3C

**Agent instructions:** You are creating 4 action handler files. Each exports a single function `execute(ctx, action)` that:
1. Sanitizes input from the action
2. Runs action-specific rules (import from `../rules`)
3. Calls existing service function (import from `../../controllers/...`)
4. Returns `{ data }` on success or `{ error: ErrorCode, message }` on failure

Each action handler must follow this pattern:
```typescript
import type { SettlementContext } from '../types'
import { checkXxx } from '../rules'

export function execute(ctx: SettlementContext, action: { type: 'xxx'; ... }):
  { data: Record<string, unknown> } | { error: string; message: string; details?: Record<string, unknown> } {
  // 1. Sanitize inputs
  // 2. Check rules
  // 3. Call service
  // 4. Return data
}
```

- [ ] **Step 1: Create pay-items.ts**

```typescript
// server/src/settlement/actions/pay-items.ts
import type { SettlementContext } from '../types'
import { checkNotClosed, checkHasRemaining, checkModeCompatible, checkItemKeys, checkMinimum } from '../rules'
import { payByItems } from '../../controllers/session.service'

export function execute(ctx: SettlementContext, action: { type: 'pay-items'; itemKeys: string[] }) {
  // Validate
  const checks = [
    checkNotClosed(ctx),
    checkHasRemaining(ctx),
    checkModeCompatible(ctx, 'by-item'),
  ]
  for (const code of checks) {
    if (code) return { error: code, message: errorMessage(code, ctx) }
  }

  if (!Array.isArray(action.itemKeys) || action.itemKeys.length === 0) {
    return { error: 'INVALID_ITEM_KEY', message: 'itemKeys array required' }
  }

  const itemCheck = checkItemKeys(ctx, action.itemKeys, true, false)
  if (itemCheck) return { error: itemCheck, message: errorMessage(itemCheck, ctx) }

  // Execute (service does the calculation)
  const result = payByItems(ctx.store.id, ctx.session.id, action.itemKeys)
  if ('error' in result) return { error: 'INVALID_ITEM_KEY', message: result.error }

  // Check minimum
  const minCheck = checkMinimum(result.amount, ctx.remaining - result.amount, false)
  if (minCheck) return { error: minCheck, message: errorMessage(minCheck, ctx) }

  return { data: result }
}

function errorMessage(code: string, ctx: SettlementContext): string {
  switch (code) {
    case 'SESSION_CLOSED': return 'Session is closed'
    case 'SESSION_FULLY_PAID': return 'Session is fully paid'
    case 'SETTLEMENT_MODE_CONFLICT': return `Cannot pay by items: session is in ${ctx.session.settlementMode} mode`
    case 'ITEM_ALREADY_PAID': return 'Some items have already been paid'
    case 'INVALID_ITEM_KEY': return 'Invalid item reference'
    case 'AMOUNT_BELOW_MINIMUM': return 'Split amount must be at least $1.00'
    case 'REMAINING_BELOW_MINIMUM': return 'Remaining balance after split must be at least $1.00'
    default: return code
  }
}
```

- [ ] **Step 2: Create pay-percent.ts**

```typescript
// server/src/settlement/actions/pay-percent.ts
import type { SettlementContext } from '../types'
import { checkNotClosed, checkHasRemaining, checkModeCompatible, checkPercent, checkMinimum } from '../rules'
import { payByPercent } from '../../controllers/session.service'

export function execute(ctx: SettlementContext, action: { type: 'pay-percent'; percent: number }) {
  const checks = [
    checkNotClosed(ctx),
    checkHasRemaining(ctx),
    checkModeCompatible(ctx, 'by-percent'),
    checkPercent(action.percent),
  ]
  for (const code of checks) {
    if (code) return { error: code, message: errorMessage(code, ctx, action.percent) }
  }

  const percent = Math.round(Math.max(1, Math.min(100, action.percent)))
  const result = payByPercent(ctx.store.id, ctx.session.id, percent)
  if ('error' in result) return { error: 'INVALID_PERCENT', message: result.error }

  return { data: result }
}

function errorMessage(code: string, ctx: SettlementContext, percent?: number): string {
  switch (code) {
    case 'SESSION_CLOSED': return 'Session is closed'
    case 'SESSION_FULLY_PAID': return 'Session is fully paid'
    case 'SETTLEMENT_MODE_CONFLICT': return `Cannot pay by percent: session is in ${ctx.session.settlementMode} mode`
    case 'INVALID_PERCENT': return 'Percent must be between 1 and 100'
    case 'AMOUNT_BELOW_MINIMUM': return 'Split amount must be at least $1.00'
    case 'REMAINING_BELOW_MINIMUM': return 'Remaining balance after split must be at least $1.00'
    default: return code
  }
}
```

- [ ] **Step 3: Create cash-payment.ts**

```typescript
// server/src/settlement/actions/cash-payment.ts
import type { SettlementContext } from '../types'
import { checkNotClosed, checkHasRemaining, checkAmount, checkReceived } from '../rules'
import { recordCashPayment } from '../../controllers/session.service'

export function execute(ctx: SettlementContext, action: { type: 'cash-payment'; amount: number; receivedAmount: number }) {
  const checks = [
    checkNotClosed(ctx),
    checkHasRemaining(ctx),
    checkAmount(action.amount),
    checkAmount(action.receivedAmount),
  ]
  for (const code of checks) {
    if (code) return { error: code, message: errorMessage(code) }
  }

  const amount = Math.round(action.amount)
  const received = Math.round(action.receivedAmount)

  const rcvCheck = checkReceived(received, amount)
  if (rcvCheck) return { error: rcvCheck, message: 'Received amount must be >= amount due' }

  const result = recordCashPayment(ctx.store.id, ctx.session.id, amount, received)
  if ('error' in result) return { error: 'INVALID_AMOUNT', message: result.error }

  return { data: { payment: result.payment, change: result.change } }
}

function errorMessage(code: string): string {
  switch (code) {
    case 'SESSION_CLOSED': return 'Session is closed'
    case 'SESSION_FULLY_PAID': return 'Session is fully paid'
    case 'INVALID_AMOUNT': return 'Amount must be a positive number'
    case 'INSUFFICIENT_RECEIVED': return 'Received amount must be >= amount due'
    default: return code
  }
}
```

- [ ] **Step 4: Create add-payment.ts**

```typescript
// server/src/settlement/actions/add-payment.ts
import type { SettlementContext } from '../types'
import { checkNotClosed, checkAmount } from '../rules'
import { addPayment } from '../../controllers/session.service'

export function execute(ctx: SettlementContext, action: {
  type: 'add-payment'; amount: number; paidBy: string; tipAmount?: number; stripePaymentIntentId?: string
}) {
  const checks = [
    checkNotClosed(ctx),
    checkAmount(action.amount),
  ]
  for (const code of checks) {
    if (code) return { error: code, message: errorMessage(code) }
  }

  const amount = Math.round(action.amount)
  const tip = Math.max(0, Math.round(action.tipAmount ?? 0))
  const result = addPayment(
    ctx.store.id, ctx.session.id, amount,
    action.paidBy || 'customer', action.stripePaymentIntentId, tip,
  )
  if ('error' in result) return { error: 'INVALID_AMOUNT', message: result.error }

  return { data: { payment: result.payment } }
}

function errorMessage(code: string): string {
  switch (code) {
    case 'SESSION_CLOSED': return 'Session is closed'
    case 'INVALID_AMOUNT': return 'Amount must be a positive number'
    default: return code
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add server/src/settlement/actions/pay-items.ts server/src/settlement/actions/pay-percent.ts server/src/settlement/actions/cash-payment.ts server/src/settlement/actions/add-payment.ts
git commit -m "feat(settlement): add payment action handlers"
```

---

### Task 3B: Action handlers — split operations (PARALLEL)

**Files:**
- Create: `server/src/settlement/actions/create-split.ts`
- Create: `server/src/settlement/actions/pay-split.ts`
- Create: `server/src/settlement/actions/delete-split.ts`

**Depends on:** Task 1, Task 2
**Parallel with:** Task 3A, Task 3C

- [ ] **Step 1: Create create-split.ts**

```typescript
// server/src/settlement/actions/create-split.ts
import type { SettlementContext } from '../types'
import { checkNotClosed, checkHasRemaining, checkModeCompatible, checkItemKeys, checkPercent, checkMinimum } from '../rules'
import { createSplitBill } from '../../controllers/split-bill.service'

export function execute(ctx: SettlementContext, action: {
  type: 'create-split'; splitType: 'by-item' | 'by-percent'; itemKeys?: string[]; percent?: number; label?: string
}) {
  const checks = [
    checkNotClosed(ctx),
    checkHasRemaining(ctx),
  ]
  for (const code of checks) {
    if (code) return { error: code, message: errorMessage(code, ctx) }
  }

  if (action.splitType === 'by-item') {
    const modeCheck = checkModeCompatible(ctx, 'by-item')
    if (modeCheck) return { error: modeCheck, message: `Cannot create by-item split: session is in ${ctx.session.settlementMode} mode` }

    if (!Array.isArray(action.itemKeys) || action.itemKeys.length === 0) {
      return { error: 'INVALID_ITEM_KEY', message: 'itemKeys required for by-item split' }
    }
    const itemCheck = checkItemKeys(ctx, action.itemKeys, true, true)
    if (itemCheck) return { error: itemCheck, message: errorMessage(itemCheck, ctx) }
  } else {
    const modeCheck = checkModeCompatible(ctx, 'by-percent')
    if (modeCheck) return { error: modeCheck, message: `Cannot create by-percent split: session is in ${ctx.session.settlementMode} mode` }

    const pctCheck = checkPercent(action.percent)
    if (pctCheck) return { error: pctCheck, message: 'Percent must be between 1 and 100' }
  }

  const result = createSplitBill(ctx.store.id, ctx.session.id, {
    type: action.splitType,
    itemKeys: action.itemKeys,
    percent: action.percent ? Math.round(action.percent) : undefined,
    label: action.label,
  })
  if ('error' in result) return { error: 'INVALID_AMOUNT', message: result.error }

  return { data: { splitBill: result } }
}

function errorMessage(code: string, ctx: SettlementContext): string {
  switch (code) {
    case 'SESSION_CLOSED': return 'Session is closed'
    case 'SESSION_FULLY_PAID': return 'Session is fully paid'
    case 'SETTLEMENT_MODE_CONFLICT': return `Mode conflict: session is in ${ctx.session.settlementMode} mode`
    case 'ITEM_ALREADY_PAID': return 'Some items have already been paid'
    case 'ITEM_ALREADY_ASSIGNED': return 'Some items are already assigned to another split'
    case 'AMOUNT_BELOW_MINIMUM': return 'Split amount must be at least $1.00'
    case 'REMAINING_BELOW_MINIMUM': return 'Remaining after split must be at least $1.00'
    default: return code
  }
}
```

- [ ] **Step 2: Create pay-split.ts** (handles both card and cash)

```typescript
// server/src/settlement/actions/pay-split.ts
import type { SettlementContext } from '../types'
import { checkNotClosed, checkSplitExists, checkSplitUnpaid, checkAmount, checkReceived } from '../rules'
import { paySplitBillCard, paySplitBillCash } from '../../controllers/split-bill-payment.service'

export function executeCard(ctx: SettlementContext, action: { type: 'pay-split-card'; splitBillId: string; tipAmount?: number }) {
  const checks = [
    checkNotClosed(ctx),
    checkSplitExists(ctx, action.splitBillId),
    checkSplitUnpaid(ctx, action.splitBillId),
  ]
  for (const code of checks) {
    if (code) return { error: code, message: errorMessage(code) }
  }

  const tip = Math.max(0, Math.round(action.tipAmount ?? 0))
  const result = paySplitBillCard(ctx.store.id, action.splitBillId, tip)
  if ('error' in result) return { error: 'SPLIT_NOT_FOUND', message: result.error }

  return { data: { splitBill: result.splitBill } }
}

export function executeCash(ctx: SettlementContext, action: {
  type: 'pay-split-cash'; splitBillId: string; receivedAmount: number; tipAmount?: number
}) {
  const checks = [
    checkNotClosed(ctx),
    checkSplitExists(ctx, action.splitBillId),
    checkSplitUnpaid(ctx, action.splitBillId),
    checkAmount(action.receivedAmount),
  ]
  for (const code of checks) {
    if (code) return { error: code, message: errorMessage(code) }
  }

  const tip = Math.max(0, Math.round(action.tipAmount ?? 0))
  const sb = ctx.splits.find(s => s.id === action.splitBillId)!
  const due = sb.total + tip
  const received = Math.round(action.receivedAmount)

  const rcvCheck = checkReceived(received, due)
  if (rcvCheck) return { error: rcvCheck, message: 'Received amount less than due' }

  const result = paySplitBillCash(ctx.store.id, action.splitBillId, received, tip)
  if ('error' in result) return { error: 'SPLIT_NOT_FOUND', message: result.error }

  return { data: { splitBill: result.splitBill, change: result.change } }
}

function errorMessage(code: string): string {
  switch (code) {
    case 'SESSION_CLOSED': return 'Session is closed'
    case 'SPLIT_NOT_FOUND': return 'Split bill not found'
    case 'SPLIT_ALREADY_PAID': return 'Split bill already paid'
    case 'INVALID_AMOUNT': return 'Amount must be a positive number'
    case 'INSUFFICIENT_RECEIVED': return 'Received amount less than due'
    default: return code
  }
}
```

- [ ] **Step 3: Create delete-split.ts**

```typescript
// server/src/settlement/actions/delete-split.ts
import type { SettlementContext } from '../types'
import { checkNotClosed, checkSplitExists, checkSplitUnpaid } from '../rules'
import { deleteSplitBill } from '../../controllers/split-bill.service'

export function execute(ctx: SettlementContext, action: { type: 'delete-split'; splitBillId: string }) {
  const checks = [
    checkNotClosed(ctx),
    checkSplitExists(ctx, action.splitBillId),
    checkSplitUnpaid(ctx, action.splitBillId),
  ]
  for (const code of checks) {
    if (code) return { error: code, message: errorMessage(code) }
  }

  const result = deleteSplitBill(ctx.store.id, action.splitBillId)
  if ('error' in result) return { error: 'SPLIT_NOT_FOUND', message: result.error }

  return { data: {} }
}

function errorMessage(code: string): string {
  switch (code) {
    case 'SESSION_CLOSED': return 'Session is closed'
    case 'SPLIT_NOT_FOUND': return 'Split bill not found'
    case 'SPLIT_ALREADY_PAID': return 'Cannot delete a paid split bill'
    default: return code
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add server/src/settlement/actions/create-split.ts server/src/settlement/actions/pay-split.ts server/src/settlement/actions/delete-split.ts
git commit -m "feat(settlement): add split action handlers"
```

---

### Task 3C: Action handlers — session lifecycle (PARALLEL)

**Files:**
- Create: `server/src/settlement/actions/close-session.ts`
- Create: `server/src/settlement/actions/reopen-session.ts`

**Depends on:** Task 1, Task 2
**Parallel with:** Task 3A, Task 3B

- [ ] **Step 1: Create close-session.ts**

```typescript
// server/src/settlement/actions/close-session.ts
import type { SettlementContext } from '../types'
import { checkNotClosed, checkIsPaid } from '../rules'
import { closeSession } from '../../controllers/session.service'

export function execute(ctx: SettlementContext) {
  const checks = [checkNotClosed(ctx), checkIsPaid(ctx)]
  for (const code of checks) {
    if (code) return { error: code, message: code === 'SESSION_CLOSED' ? 'Session already closed' : 'Session not fully paid' }
  }

  const result = closeSession(ctx.store.id, ctx.session.id)
  if ('error' in result) return { error: 'SESSION_NOT_FULLY_PAID', message: result.error }

  return { data: {} }
}
```

- [ ] **Step 2: Create reopen-session.ts**

```typescript
// server/src/settlement/actions/reopen-session.ts
import type { SettlementContext } from '../types'
import { checkIsClosed } from '../rules'
import { reopenSession } from '../../controllers/session.service'

export function execute(ctx: SettlementContext) {
  const code = checkIsClosed(ctx)
  if (code) return { error: code, message: 'Session is not closed' }

  const result = reopenSession(ctx.store.id, ctx.session.id)
  if ('error' in result) return { error: 'SESSION_NOT_CLOSED', message: result.error }

  return { data: {} }
}
```

- [ ] **Step 3: Commit**

```bash
git add server/src/settlement/actions/close-session.ts server/src/settlement/actions/reopen-session.ts
git commit -m "feat(settlement): add session lifecycle action handlers"
```

---

### Task 4: Gateway entry point

**Files:**
- Create: `server/src/settlement/gateway.ts`

**Depends on:** Task 1, 2, 3A, 3B, 3C

- [ ] **Step 1: Create gateway.ts**

```typescript
// server/src/settlement/gateway.ts
import type { SettlementAction, SettlementContext, SettlementResult } from './types'
import { createError, httpStatus } from './errors'
import type { ErrorCode } from './errors'
import { computeAllowedActions, EMPTY_ACTIONS } from './allowed-actions'
import { logSettlement } from './logger'
import {
  sessionStore, orderStore, paymentStore, storeStore, splitBillStore,
} from '../repositories/stores'
import { getSplitBills, buildAssignedQtyMap, getMainBillSummary } from '../controllers/split-bill.service'
import { getSessionSummary, calcTax, calcServiceFee } from '../controllers/session.service'

import { execute as payItems } from './actions/pay-items'
import { execute as payPercent } from './actions/pay-percent'
import { execute as cashPayment } from './actions/cash-payment'
import { execute as addPaymentAction } from './actions/add-payment'
import { execute as createSplit } from './actions/create-split'
import { executeCard as paySplitCard, executeCash as paySplitCash } from './actions/pay-split'
import { execute as deleteSplit } from './actions/delete-split'
import { execute as closeSessionAction } from './actions/close-session'
import { execute as reopenSessionAction } from './actions/reopen-session'

function loadContext(storeId: string, sessionId: string): SettlementContext | null {
  const store = storeStore.getById(storeId)
  const session = sessionStore.getById(sessionId)
  if (!store || !session || session.storeId !== storeId) return null

  const orders = session.orderIds
    .map(id => orderStore.getById(id)).filter(Boolean) as any[]
  const payments = paymentStore.getByField('sessionId', sessionId)
  const splits = getSplitBills(sessionId)

  // Build paid qty map
  const paidQtyMap = new Map<string, number>()
  for (const pid of session.paidItemIds ?? []) {
    const parts = pid.split(':')
    const baseKey = `${parts[0]}:${parts[1]}`
    const qty = parts.length >= 3 ? parseInt(parts[2], 10) : Infinity
    paidQtyMap.set(baseKey, (paidQtyMap.get(baseKey) ?? 0) + qty)
  }

  const assignedQtyMap = buildAssignedQtyMap(splits)

  // Calculate remaining
  const summary = getSessionSummary(storeId, sessionId)
  const remaining = summary?.remaining ?? 0
  const mainBill = getMainBillSummary(sessionId, storeId)
  const mainBillTotal = mainBill?.total ?? 0

  return {
    store, session, orders, payments, splits,
    paidQtyMap, assignedQtyMap, remaining, mainBillTotal,
  }
}

export function executeSettlement(
  storeId: string,
  sessionId: string,
  action: SettlementAction,
): SettlementResult {
  const ctx = loadContext(storeId, sessionId)
  if (!ctx) {
    const err = createError('SESSION_NOT_FOUND', 'Session not found', EMPTY_ACTIONS)
    return err
  }

  const allowed = computeAllowedActions(ctx)

  let actionResult: { data: Record<string, unknown> } | { error: string; message: string; details?: Record<string, unknown> }

  switch (action.type) {
    case 'pay-items':       actionResult = payItems(ctx, action); break
    case 'pay-percent':     actionResult = payPercent(ctx, action); break
    case 'cash-payment':    actionResult = cashPayment(ctx, action); break
    case 'add-payment':     actionResult = addPaymentAction(ctx, action); break
    case 'create-split':    actionResult = createSplit(ctx, action); break
    case 'pay-split-card':  actionResult = paySplitCard(ctx, action); break
    case 'pay-split-cash':  actionResult = paySplitCash(ctx, action); break
    case 'delete-split':    actionResult = deleteSplit(ctx, action); break
    case 'close-session':   actionResult = closeSessionAction(ctx); break
    case 'reopen-session':  actionResult = reopenSessionAction(ctx); break
    default:
      actionResult = { error: 'INVALID_AMOUNT', message: 'Unknown action type' }
  }

  // Reload context for fresh allowedActions after mutation
  const freshCtx = loadContext(storeId, sessionId)
  const freshAllowed = freshCtx ? computeAllowedActions(freshCtx) : allowed
  const freshRemaining = freshCtx?.remaining ?? ctx.remaining
  const sessionStatus = freshCtx?.session.status === 'closed' ? 'closed' as const
    : freshRemaining <= 0 ? 'paid' as const : 'active' as const

  let result: SettlementResult

  if ('error' in actionResult) {
    result = createError(
      actionResult.error as ErrorCode,
      actionResult.message,
      freshAllowed,
      actionResult.details,
    )
  } else {
    result = {
      ok: true,
      data: actionResult.data,
      sessionStatus,
      remaining: freshRemaining,
      allowedActions: freshAllowed,
    }
  }

  logSettlement(ctx, action, result)
  return result
}

export { httpStatus } from './errors'
```

- [ ] **Step 2: Commit**

```bash
git add server/src/settlement/gateway.ts
git commit -m "feat(settlement): add gateway entry point with dispatch and context loading"
```

---

### Task 5: Gateway unit tests

**Files:**
- Create: `server/src/__tests__/settlement-gateway.test.ts`

**Depends on:** Task 4

- [ ] **Step 1: Create test file**

```typescript
// server/src/__tests__/settlement-gateway.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { executeSettlement } from '../settlement/gateway'
import { sessionStore, orderStore, paymentStore, storeStore, splitBillStore } from '../repositories/stores'
import { v4 as uuid } from 'uuid'

const STORE_ID = 'test-gw-store'

let sessionId: string
let orderId: string

function setup() {
  // Clean
  for (const s of sessionStore.getByField('storeId', STORE_ID)) sessionStore.delete(s.id)
  for (const o of orderStore.getByField('storeId', STORE_ID)) orderStore.delete(o.id)
  for (const p of paymentStore.getByField('storeId', STORE_ID)) paymentStore.delete(p.id)
  for (const sb of splitBillStore.getByField('storeId', STORE_ID)) splitBillStore.delete(sb.id)

  // Store
  if (!storeStore.getById(STORE_ID)) {
    storeStore.create({ id: STORE_ID, name: 'Test', taxRate: 8.25, serviceFeeRate: 0, paymentMode: 'pay-later', createdAt: new Date().toISOString() } as any)
  }

  // Session + order: Cola x4 (299), Kung Pao x1 (1599), Mapo Tofu x1 (1299)
  sessionId = uuid()
  orderId = uuid()
  const tableId = `table-${uuid().slice(0, 8)}`
  sessionStore.create({ id: sessionId, storeId: STORE_ID, tableId, status: 'active', orderIds: [orderId], totalAmount: 4094, totalPaid: 0, discountAmount: 0, createdAt: new Date().toISOString() } as any)
  orderStore.create({
    id: orderId, storeId: STORE_ID, tableId, sessionId, orderNumber: 1, status: 'served', isPaid: false,
    totalPrice: 4094, createdAt: new Date().toISOString(),
    items: [
      { menuItemId: 'cola', name: 'Cola', price: 299, quantity: 4, selectedOptions: [] },
      { menuItemId: 'kp', name: 'Kung Pao', price: 1599, quantity: 1, selectedOptions: [] },
      { menuItemId: 'mt', name: 'Mapo Tofu', price: 1299, quantity: 1, selectedOptions: [] },
    ],
  } as any)
}

beforeEach(setup)

describe('Gateway: response structure', () => {
  it('success has ok, data, allowedActions, remaining, sessionStatus', () => {
    const r = executeSettlement(STORE_ID, sessionId, { type: 'pay-percent', percent: 50 })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.allowedActions).toBeDefined()
      expect(r.remaining).toBeTypeOf('number')
      expect(r.sessionStatus).toBe('active')
      expect(r.data).toBeDefined()
    }
  })

  it('error has ok=false, code, message, allowedActions', () => {
    const r = executeSettlement(STORE_ID, sessionId, { type: 'pay-percent', percent: 0 })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.code).toBe('INVALID_PERCENT')
      expect(r.message).toBeTruthy()
      expect(r.allowedActions).toBeDefined()
    }
  })

  it('SESSION_NOT_FOUND for bad sessionId', () => {
    const r = executeSettlement(STORE_ID, 'nonexistent', { type: 'pay-percent', percent: 50 })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.code).toBe('SESSION_NOT_FOUND')
  })
})

describe('Gateway: allowedActions', () => {
  it('fresh session allows all payment types', () => {
    const r = executeSettlement(STORE_ID, sessionId, { type: 'pay-percent', percent: 50 })
    if (r.ok) {
      expect(r.allowedActions.payByItems).toBe(true)
      expect(r.allowedActions.payByPercent).toBe(true)
      expect(r.allowedActions.cashPayment).toBe(true)
      expect(r.allowedActions.closeSession).toBe(false) // not paid yet
    }
  })

  it('after full payment, only closeSession allowed', () => {
    executeSettlement(STORE_ID, sessionId, { type: 'cash-payment', amount: 4432, receivedAmount: 5000 })
    const r = executeSettlement(STORE_ID, sessionId, { type: 'close-session' })
    if (r.ok) {
      expect(r.allowedActions.payByItems).toBe(false)
      expect(r.allowedActions.cashPayment).toBe(false)
      expect(r.allowedActions.reopenSession).toBe(true)
    }
  })
})

describe('Gateway: mode locking', () => {
  it('pay-items locks mode, blocks pay-percent', () => {
    // Set mode to by-item
    sessionStore.update(sessionId, { settlementMode: 'by-item' })
    const r = executeSettlement(STORE_ID, sessionId, { type: 'pay-percent', percent: 50 })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.code).toBe('SETTLEMENT_MODE_CONFLICT')
  })

  it('create-split by-item blocked in by-percent session', () => {
    sessionStore.update(sessionId, { settlementMode: 'by-percent' })
    const r = executeSettlement(STORE_ID, sessionId, {
      type: 'create-split', splitType: 'by-item', itemKeys: [`${orderId}:0:2`],
    })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.code).toBe('SETTLEMENT_MODE_CONFLICT')
  })
})

describe('Gateway: error codes', () => {
  it('SESSION_FULLY_PAID when remaining=0', () => {
    executeSettlement(STORE_ID, sessionId, { type: 'cash-payment', amount: 4432, receivedAmount: 4432 })
    const r = executeSettlement(STORE_ID, sessionId, { type: 'cash-payment', amount: 100, receivedAmount: 100 })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.code).toBe('SESSION_FULLY_PAID')
  })

  it('INVALID_PERCENT for percent=0', () => {
    const r = executeSettlement(STORE_ID, sessionId, { type: 'pay-percent', percent: 0 })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.code).toBe('INVALID_PERCENT')
  })

  it('INSUFFICIENT_RECEIVED for cash', () => {
    const r = executeSettlement(STORE_ID, sessionId, { type: 'cash-payment', amount: 1000, receivedAmount: 500 })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.code).toBe('INSUFFICIENT_RECEIVED')
  })

  it('SPLIT_NOT_FOUND for bad splitBillId', () => {
    const r = executeSettlement(STORE_ID, sessionId, { type: 'pay-split-card', splitBillId: 'nonexistent' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.code).toBe('SPLIT_NOT_FOUND')
  })

  it('SESSION_NOT_FULLY_PAID when trying to close unpaid', () => {
    const r = executeSettlement(STORE_ID, sessionId, { type: 'close-session' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.code).toBe('SESSION_NOT_FULLY_PAID')
  })
})

describe('Gateway: split operations', () => {
  it('create split returns splitBill in data', () => {
    const r = executeSettlement(STORE_ID, sessionId, {
      type: 'create-split', splitType: 'by-item', itemKeys: [`${orderId}:0:2`],
    })
    expect(r.ok).toBe(true)
    if (r.ok) {
      const sb = r.data.splitBill as any
      expect(sb.subtotal).toBe(598)
      expect(sb.total).toBe(647) // 598 + 49 tax
    }
  })

  it('delete split works', () => {
    const cr = executeSettlement(STORE_ID, sessionId, {
      type: 'create-split', splitType: 'by-item', itemKeys: [`${orderId}:0:2`],
    })
    if (!cr.ok) return
    const splitId = (cr.data.splitBill as any).id
    const dr = executeSettlement(STORE_ID, sessionId, { type: 'delete-split', splitBillId: splitId })
    expect(dr.ok).toBe(true)
  })

  it('pay split cash with tip', () => {
    const cr = executeSettlement(STORE_ID, sessionId, {
      type: 'create-split', splitType: 'by-item', itemKeys: [`${orderId}:1:1`],
    })
    if (!cr.ok) return
    const splitId = (cr.data.splitBill as any).id
    // Kung Pao: 1599+132=1731, +300 tip = 2031
    const pr = executeSettlement(STORE_ID, sessionId, {
      type: 'pay-split-cash', splitBillId: splitId, receivedAmount: 2100, tipAmount: 300,
    })
    expect(pr.ok).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests**

Run: `cd server && npx vitest run src/__tests__/settlement-gateway.test.ts`
Expected: All pass

- [ ] **Step 3: Fix any failures, then commit**

```bash
git add server/src/__tests__/settlement-gateway.test.ts
git commit -m "test(settlement): gateway unit tests — structure, allowedActions, errors, splits"
```

---

## Phase 2: Route Switchover

### Task 6A: Session routes switchover (PARALLEL)

**Files:**
- Modify: `server/src/routes/session.routes.ts`

**Depends on:** Task 4
**Parallel with:** Task 6B

Switch these routes to use `executeSettlement`: pay-items, pay-percent, cash-payment, payments, close, reopen. Keep non-settlement routes (create session, get summary, cart ops, coupon ops) unchanged.

- [ ] **Step 1: Add gateway import and replace settlement routes**

At top of file, add:
```typescript
import { executeSettlement, httpStatus } from '../settlement/gateway'
```

Replace each settlement route handler body with:
```typescript
// Pattern for each route:
const result = executeSettlement(req.params.storeId, req.params.sessionId, {
  type: 'action-type',
  ...req.body fields,
})
res.status(result.ok ? 200 : httpStatus((result as any).code)).json(result)
```

Apply this pattern to: pay-items, pay-percent, cash-payment, payments (add-payment), close, reopen. Start-settlement can remain as-is (it just sets a field).

- [ ] **Step 2: Verify existing tests still pass**

Run: `cd server && npx vitest run`
Expected: All pass (existing split-billing tests + new gateway tests)

- [ ] **Step 3: Commit**

```bash
git add server/src/routes/session.routes.ts
git commit -m "refactor(settlement): session routes use gateway"
```

---

### Task 6B: Split-bill routes switchover (PARALLEL)

**Files:**
- Modify: `server/src/routes/split-bill.routes.ts`

**Depends on:** Task 4
**Parallel with:** Task 6A

- [ ] **Step 1: Replace all route handlers with gateway calls**

Replace the create, delete, pay-card, pay-cash routes. Keep the GET (list) route as-is (it's a query, not a settlement action). For GET, add `allowedActions` to the response:

```typescript
router.get('/', requirePermission('tables:read'), (req, res) => {
  const { storeId, sessionId } = req.params
  const splits = svc.getSplitBills(sessionId)
  const mainBill = svc.getMainBillSummary(sessionId, storeId)
  // Add allowedActions
  const { computeAllowedActions } = require('../settlement/allowed-actions')
  const { loadContextForQuery } = require('../settlement/gateway')
  // ... or compute inline
  res.json({ splits, mainBill })
})
```

For mutation routes, use the gateway pattern.

- [ ] **Step 2: Verify tests pass**

Run: `cd server && npx vitest run`

- [ ] **Step 3: Commit**

```bash
git add server/src/routes/split-bill.routes.ts
git commit -m "refactor(settlement): split-bill routes use gateway"
```

---

## Phase 3: Strip Service Validation

### Task 7A: Strip session.service.ts validation (PARALLEL)

**Depends on:** Task 6A, 6B
**Parallel with:** Task 7B, 7C

Remove validation logic from: `payByItems`, `payByPercent`, `recordCashPayment`, `addPayment`, `closeSession`, `reopenSession`. Keep the calculation and data mutation logic. Add `@internal` JSDoc comment.

- [ ] **Step 1: Strip validation, keep execution**
- [ ] **Step 2: Verify tests pass**
- [ ] **Step 3: Commit**

```bash
git commit -m "refactor(settlement): strip validation from session.service (trusted internal)"
```

---

### Task 7B: Strip split-bill.service.ts validation (PARALLEL)

Remove mode checks, paidItemIds checks from `createSplitBill`. Keep `calcByItemSubtotal`, `getMainBillSummary`, `buildAssignedQtyMap`, `invalidateConflictingSplits`.

- [ ] **Step 1-3: Same pattern as 7A**

```bash
git commit -m "refactor(settlement): strip validation from split-bill.service (trusted internal)"
```

---

### Task 7C: Strip split-bill-payment.service.ts validation (PARALLEL)

Remove status checks from `paySplitBillCard`, `paySplitBillCash`. Keep payment recording and split status updates.

- [ ] **Step 1-3: Same pattern as 7A**

```bash
git commit -m "refactor(settlement): strip validation from split-bill-payment.service (trusted internal)"
```

---

## Phase 4: Frontend Adaptation

### Task 8: Frontend — api.ts + components read allowedActions

**Files:**
- Modify: `client/src/services/api.ts`
- Modify: `client/src/components/table/SplitBillManager.tsx`
- Modify: `client/src/components/customer/SettlementSheet.tsx`
- Modify: `client/src/components/table/SplitBillCards.tsx`

**Depends on:** Task 6A, 6B

- [ ] **Step 1: Add SettlementResult type to api.ts**

```typescript
export interface AllowedActions {
  payByItems: boolean
  payByPercent: boolean
  cashPayment: boolean
  createSplitByItem: boolean
  createSplitByPercent: boolean
  paySplit: boolean
  deleteSplit: boolean
  closeSession: boolean
  reopenSession: boolean
}

export type SettlementResult = {
  ok: true
  data: Record<string, any>
  sessionStatus: string
  remaining: number
  allowedActions: AllowedActions
} | {
  ok: false
  code: string
  message: string
  allowedActions: AllowedActions
}
```

- [ ] **Step 2: Update SplitBillManager to use allowedActions**

Read `allowedActions` from API responses. Use it to show/hide buttons:
- `createSplitByItem` / `createSplitByPercent` → show/hide split button
- `paySplit` → show/hide pay buttons on split cards
- `cashPayment` → show/hide main bill pay buttons
- `closeSession` → show/hide close button

- [ ] **Step 3: Update SettlementSheet to use allowedActions**

Read `allowedActions` from `payByItems` / `payByPercent` responses. Disable tabs based on `payByItems` / `payByPercent` booleans.

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(settlement): frontend reads allowedActions from gateway responses"
```

---

## Phase 5: Cleanup + Testing

### Task 9: Integration test suite for gateway

**Files:**
- Modify: `server/src/__tests__/split-billing-integration.test.ts`

**Depends on:** All previous tasks

- [ ] **Step 1: Convert existing 35 tests to use executeSettlement**
- [ ] **Step 2: Add error-focused tests (one per ErrorCode)**
- [ ] **Step 3: Add allowedActions state transition tests**
- [ ] **Step 4: Run all tests**

```bash
cd shared && npx vitest run && cd ../server && npx vitest run
```

- [ ] **Step 5: Commit**

```bash
git commit -m "test(settlement): comprehensive gateway integration tests"
```

---

### Task 10: Cleanup + Docker rebuild

**Depends on:** Task 9

- [ ] **Step 1: Clear test session data**

```bash
cd server && npx tsx src/scripts/cleanup-test-sessions.ts
```

- [ ] **Step 2: TypeScript compilation check**

```bash
cd client && npx tsc -b && cd ../server && npx tsc --noEmit
```

- [ ] **Step 3: Docker rebuild + health check**

```bash
docker compose down && docker compose up -d --build
curl -s http://localhost:3001/api/health
```

- [ ] **Step 4: Final commit**

```bash
git commit -m "chore(settlement): cleanup test data, verify build"
```

---

## Quick Reference: Parallelization

| Phase | Tasks | Parallel? | Agents |
|-------|-------|-----------|--------|
| 1 | Task 1 → Task 2 | Sequential | 1 |
| 1 | Task 3A, 3B, 3C | **3 parallel** | 3 |
| 1 | Task 4 | Sequential (depends on all above) | 1 |
| 1 | Task 5 | Sequential | 1 |
| 2 | Task 6A, 6B | **2 parallel** | 2 |
| 3 | Task 7A, 7B, 7C | **3 parallel** | 3 |
| 4 | Task 8 | Sequential | 1 |
| 5 | Task 9 → Task 10 | Sequential | 1 |

**Total parallelizable slots: 3+2+3 = 8 agent dispatches saved**

## Agent Communication Protocol

- **Task 3A/3B/3C agents** must import types from `../types` and rules from `../rules` using the EXACT names defined in Task 1-2. No agent creates its own type variants.
- **Task 6A/6B agents** both import `executeSettlement` from `../settlement/gateway`. They edit different route files — no overlap.
- **Task 7A/7B/7C agents** each edit ONE service file. They must NOT edit each other's files. Each agent greps for direct route imports of their service to ensure no bypass exists after stripping.

# Settlement Gateway — Design Spec

> Date: 2026-04-07
> Status: Approved
> Author: SaaS platform admin + Claude Code

## Problem

Settlement logic is scattered across 3 service files with duplicated/missing validation:
- `session.service.ts` (payByItems, payByPercent, recordCashPayment, addPayment)
- `split-bill.service.ts` (createSplitBill, deleteSplitBill)
- `split-bill-payment.service.ts` (paySplitBillCard, paySplitBillCash)

This caused 5 bugs (B1-B5): tip counting in totalPaid, already-paid items splittable, mode conflicts undetected, double taxation, split payments not tracked in paidItemIds.

## Solution: Stateless Settlement Gateway

A single entry point module (`settlement/gateway.ts`) that all settlement operations flow through. Each request:
1. Reads current session state (one-time `loadContext`)
2. Validates via shared rules
3. Dispatches to action handler (calls existing service as trusted internal)
4. Computes `allowedActions` for frontend
5. Logs with `[SETTLEMENT]` prefix
6. Returns unified response (success or error, always with `allowedActions`)

### Architecture

```
Route → executeSettlement(storeId, sessionId, action)
  → loadContext()        // read session, orders, payments, splits once
  → rules.check()       // centralized validation
  → actions/xxx.ts      // sanitize input + call service (no validation in service)
  → computeAllowedActions()
  → logSettlement()
  → return { ok, data/error, allowedActions }
```

### Key Properties
- **Stateless**: no in-memory session state, reads from store every call
- **Multi-tenant safe**: storeId isolation, zero extra memory per session
- **Multi-table safe**: each call independent, no cross-table state
- **Single-process safe**: synchronous JsonStore operations within one event loop tick

## Module Structure

```
server/src/settlement/
  types.ts              ← SettlementAction, SettlementResult, Context, AllowedActions
  errors.ts             ← ErrorCode enum, createError helper
  rules.ts              ← shared validation (mode, items, minimum, etc.)
  allowed-actions.ts    ← computeAllowedActions()
  logger.ts             ← [SETTLEMENT] unified logging
  gateway.ts            ← executeSettlement() entry + loadContext + dispatch
  actions/
    pay-items.ts        ← customer pay by items calculator
    pay-percent.ts      ← customer pay by percent calculator
    create-split.ts     ← waiter create split bill
    pay-split.ts        ← waiter pay split (card + cash)
    delete-split.ts     ← waiter delete split
    cash-payment.ts     ← waiter cash payment (main bill)
    add-payment.ts      ← record payment (webhook)
    close-session.ts    ← close session
    reopen-session.ts   ← reopen session
```

## Types

### SettlementAction

```typescript
type SettlementAction =
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
```

### SettlementResult

```typescript
// Success
interface SettlementSuccess {
  ok: true
  data: ActionData
  sessionStatus: 'active' | 'paid' | 'closed'
  remaining: number
  allowedActions: AllowedActions
}

// Error
interface SettlementError {
  ok: false
  code: ErrorCode
  message: string
  details?: Record<string, unknown>  // only for authenticated requests
  allowedActions: AllowedActions
}

type SettlementResult = SettlementSuccess | SettlementError
```

### AllowedActions

```typescript
interface AllowedActions {
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
```

### SettlementContext

```typescript
interface SettlementContext {
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
```

## Error Codes

| Code | Trigger | HTTP |
|------|---------|------|
| `SESSION_NOT_FOUND` | sessionId invalid or storeId mismatch | 404 |
| `SESSION_CLOSED` | operate on closed session (except reopen) | 400 |
| `SESSION_NOT_CLOSED` | reopen on non-closed session | 400 |
| `SESSION_FULLY_PAID` | payment when remaining = 0 | 400 |
| `SESSION_NOT_FULLY_PAID` | close when remaining > 0 | 400 |
| `SETTLEMENT_MODE_CONFLICT` | by-item in by-percent session or vice versa | 400 |
| `ITEM_ALREADY_PAID` | item in paidItemIds | 400 |
| `ITEM_ALREADY_ASSIGNED` | item assigned to another split | 400 |
| `AMOUNT_BELOW_MINIMUM` | split amount < $1.00 | 400 |
| `REMAINING_BELOW_MINIMUM` | remaining after split < $1.00 (100% exempt) | 400 |
| `INSUFFICIENT_RECEIVED` | cash received < amount due | 400 |
| `SPLIT_NOT_FOUND` | splitBillId invalid | 404 |
| `SPLIT_ALREADY_PAID` | pay/delete on paid split | 400 |
| `INVALID_PERCENT` | percent not 1-100 | 400 |
| `INVALID_ITEM_KEY` | bad format or references nonexistent item | 400 |
| `INVALID_AMOUNT` | NaN, negative, zero, non-finite | 400 |
| `MODULE_NOT_LICENSED` | store lacks required module | 403 |

## Validation Rules

Each action checks rules in order. First failure returns error.

| Rule | Actions | ErrorCode |
|------|---------|-----------|
| session exists + storeId match | ALL | SESSION_NOT_FOUND |
| session not closed | ALL except reopen | SESSION_CLOSED |
| session is closed | reopen only | SESSION_NOT_CLOSED |
| remaining > 0 | all payment ops | SESSION_FULLY_PAID |
| mode compatible | pay-items, create-split(by-item) | SETTLEMENT_MODE_CONFLICT |
| mode compatible | pay-percent, create-split(by-percent) | SETTLEMENT_MODE_CONFLICT |
| itemKeys valid format + exist | pay-items, create-split(by-item) | INVALID_ITEM_KEY |
| items not paid | pay-items, create-split(by-item) | ITEM_ALREADY_PAID |
| items not assigned | create-split(by-item) | ITEM_ALREADY_ASSIGNED |
| percent 1-100 | pay-percent, create-split(by-percent) | INVALID_PERCENT |
| amount valid (finite, positive) | cash-payment, add-payment | INVALID_AMOUNT |
| split >= $1.00 | pay-items, pay-percent, create-split | AMOUNT_BELOW_MINIMUM |
| remaining >= $1.00 (100% exempt) | pay-items, pay-percent, create-split | REMAINING_BELOW_MINIMUM |
| received >= due | cash-payment, pay-split-cash | INSUFFICIENT_RECEIVED |
| split exists | pay-split-*, delete-split | SPLIT_NOT_FOUND |
| split unpaid | pay-split-*, delete-split | SPLIT_ALREADY_PAID |
| isPaid = true | close-session | SESSION_NOT_FULLY_PAID |

## AllowedActions Computation

```typescript
function computeAllowedActions(ctx: SettlementContext): AllowedActions {
  const { remaining, session } = ctx
  const mode = session.settlementMode
  const isPaid = remaining <= 0
  const hasUnpaidSplits = ctx.splits.some(s => s.status === 'unpaid')
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
```

## Logging

Format: `[SETTLEMENT] {action} {status}` with structured fields.

```
[SETTLEMENT] cash-payment succeeded    store=s1 session=abc table=t5 remaining=2216
[SETTLEMENT] create-split rejected     store=s1 session=abc code=SETTLEMENT_MODE_CONFLICT currentMode=by-percent
[SETTLEMENT] pay-split-cash succeeded  store=s1 session=abc remaining=0 sessionStatus=paid
```

All operations logged (success + rejection). Filterable by `[SETTLEMENT]` prefix.

## Route Integration

API paths unchanged. Routes become thin wrappers:

```typescript
router.post('/:sessionId/pay-percent', (req, res) => {
  const result = executeSettlement(req.params.storeId, req.params.sessionId, {
    type: 'pay-percent',
    percent: req.body.percent,
  })
  res.status(result.ok ? 200 : 400).json(result)
})
```

Input sanitization moves into action handlers (each action sanitizes its own inputs).

## Frontend Adaptation

- `api.ts`: unified `SettlementResult` return type for all settlement calls
- Components read `allowedActions` to show/hide buttons
- Error responses also carry `allowedActions` — UI updates immediately on rejection
- No frontend-side settlement logic — `allowedActions` is the single source of truth

## Migration Strategy (Phased)

### Phase 1: Create settlement module (no existing code changes)
- Create all files in `settlement/`
- types, errors, rules, allowed-actions, logger, gateway
- Action handlers call existing service functions internally
- **Test**: unit tests for rules, allowedActions, error codes

### Phase 2: Route switchover
- One route at a time, switch to `executeSettlement()`
- Run existing 35 integration tests after each switch
- **Test**: verify response structure has `ok` + `allowedActions`

### Phase 3: Remove service validation
- Strip validation from session.service, split-bill.service, split-bill-payment.service
- Services become trusted internal executors
- **Test**: re-run all tests, verify no regression

### Phase 4: Frontend adaptation
- api.ts type changes
- SplitBillManager reads allowedActions
- SettlementSheet reads allowedActions
- **Test**: manual UI testing on all payment flows

### Phase 5: Cleanup + comprehensive testing
- Clear test session data
- Error-focused test suite (Spec B)
- Input sanitization verification
- 4XX response coverage

## Execution Order & Parallelization

```
Phase 1: ─┬─ Task 1: types.ts + errors.ts (foundation)
           │
           ├─ Task 2: rules.ts + allowed-actions.ts (depends on types)
           │
           └─ Task 3: logger.ts (independent)
              ↓
           Task 4: gateway.ts + loadContext (depends on 1,2,3)
              ↓
           Task 5A ║ Task 5B ║ Task 5C (parallel action handlers)
             pay-items    create-split    cash-payment
             pay-percent  pay-split       add-payment
                          delete-split    close/reopen
              ↓
Phase 2: Task 6: session.routes switchover (sequential, one route at a time)
              ↓
         Task 7: split-bill.routes switchover
              ↓
Phase 3: Task 8A ║ Task 8B ║ Task 8C (parallel service cleanup)
           session.service  split-bill.service  split-bill-payment.service
              ↓
Phase 4: Task 9: Frontend api.ts + components
              ↓
Phase 5: Task 10: Cleanup + test suite
```

**Parallelizable tasks:**
- Phase 1: Tasks 1, 2, 3 are partially parallel (2 depends on 1, 3 is independent)
- Phase 1: Tasks 5A/5B/5C fully parallel (3 agents, each handles 3-4 action files)
- Phase 3: Tasks 8A/8B/8C fully parallel (3 agents, each strips one service file)

## Security & Robustness Checks

### Per-Phase Security Review

**Phase 1 (settlement module):**
- [ ] All ErrorCode paths tested — no uncaught exception leaks internal state
- [ ] `details` field only populated when `req.user` exists (authenticated)
- [ ] `loadContext` validates storeId on every entity (session, orders, splits)
- [ ] No user input reaches service layer without sanitization

**Phase 2 (route switchover):**
- [ ] Every route still checks `requireAuth` / `requirePermission` before calling gateway
- [ ] Gateway does NOT bypass permission middleware — it's called after auth
- [ ] HTTP status codes correct: 400 for validation, 404 for not-found, 403 for module
- [ ] Response structure consistent across all routes (same `ok`/`code`/`allowedActions` shape)

**Phase 3 (service cleanup):**
- [ ] No service function is callable from routes without going through gateway
- [ ] Grep: no route directly imports from `controllers/session.service` for settlement ops
- [ ] Service functions marked with `@internal` JSDoc comment

**Phase 4 (frontend):**
- [ ] Frontend never computes settlement logic — only reads `allowedActions`
- [ ] Error codes mapped to user-visible messages (not raw English)
- [ ] No `console.error` swallowing errors silently — show to user

**Phase 5 (testing):**
- [ ] Every ErrorCode has at least one test triggering it
- [ ] allowedActions correct after every state transition
- [ ] Concurrent payment simulation (two payments in sequence, verify no double-count)

### Input Sanitization (moved into action handlers)

| Action | Input | Sanitization |
|--------|-------|-------------|
| pay-items | itemKeys | array check, string format "id:idx:qty", finite integers |
| pay-percent | percent | finite number, clamp 1-100, integer |
| cash-payment | amount, receivedAmount | finite, positive, round to integer, cap 10M |
| add-payment | amount, tipAmount | finite, positive/zero, round |
| create-split | splitType, itemKeys, percent | enum check, same as pay-items/pay-percent |
| pay-split-card | tipAmount | finite, non-negative, round, default 0 |
| pay-split-cash | receivedAmount, tipAmount | finite, positive, round |
| close/reopen | (none) | no input to sanitize |

### Robustness Guarantees

| Scenario | Behavior |
|----------|----------|
| Session deleted mid-operation | `SESSION_NOT_FOUND` error |
| Order deleted mid-operation | `INVALID_ITEM_KEY` error |
| Split deleted mid-operation | `SPLIT_NOT_FOUND` error |
| Two customers pay same items | First succeeds, second gets `ITEM_ALREADY_PAID` |
| Payment exceeds remaining | Allowed (overpayment OK, change returned for cash) |
| NaN/Infinity in amount | `INVALID_AMOUNT` error |
| HTML injection in label | Stripped by sanitizeString before storage |
| Negative tip | Clamped to 0 |

## Testing Strategy

### Unit Tests (Phase 1)

```
settlement/__tests__/
  rules.test.ts           ← each rule function with edge cases
  allowed-actions.test.ts ← state transitions
  errors.test.ts          ← error construction
```

### Integration Tests (Phase 2-3)

Existing 35 tests adapted to call `executeSettlement()` directly, plus:

**Error-focused tests (40+ new):**
- Every ErrorCode triggered at least once
- Correct code returned for each scenario
- allowedActions accurate after each error
- details present for auth, absent for public

**Sequence tests:**
- Customer pay 50% → waiter split by-item → REJECTED (mode conflict)
- Customer pay items → waiter split same items → REJECTED (already paid)
- Waiter split → customer pay split items → split auto-deleted → waiter sees updated splits
- Full flow: order → split → pay → close → verify all states

**Edge case tests:**
- $1.00 boundary (99 cents fails, 100 cents passes)
- 100% exemption from minimum
- Zero remaining after payment
- Rounding: split tax sums vs total tax (1 cent tolerance)

### 4XX Response Tests (Phase 5)

Every route returns correct HTTP status:
- 400 for validation errors
- 404 for not-found (session, split)
- 403 for module not licensed
- Never 500 for expected errors

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| Stateless gateway over session-scoped controller | Multi-tenant + multi-table, zero memory overhead |
| Gateway wraps service, doesn't replace | Gradual migration, preserve tested calculation logic |
| allowedActions in every response | Frontend single source of truth, no duplicate logic |
| Error response includes allowedActions | UI updates immediately on rejection |
| details only for authenticated | Security — don't leak internal state to customers |
| No optimistic locking | Single-process Node.js, synchronous JsonStore |
| Phased migration | Each phase independently testable, rollback possible |
| Input sanitization in action handlers | Each action knows its own input shape |
| [SETTLEMENT] log prefix | Filterable, covers success + rejection |

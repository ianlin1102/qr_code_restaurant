# Settlement Architecture Cleanup Plan

> Date: 2026-04-08
> Context: 27 commits / 39 files / +876 -297 lines in one session. Needs consolidation.

## Problem

Today's settlement work was reactive (fix bugs → discover more → fix more). The result works but has:
- Duplicated `deriveAllowedActions` logic in 3 places (SplitBillManager, BillSettleDialog, SettlementSheet)
- Polling logic scattered across components (3s, 5s, 10s intervals, each with own fingerprint)
- `split-bill.service.ts` grew to 300+ lines with mode recalculation duplicated in deleteSplitBill and invalidateConflictingSplits
- Settlement mode management spread across 5 files (rules.ts, allowed-actions.ts, session.service.ts, split-bill.service.ts, gateway.ts)

## Refactor Tasks

### Task 1: Extract `deriveAllowedActions` to shared module

**Current**: 3 copies — SplitBillManager.tsx, BillSettleDialog.tsx, SettlementSheet.tsx
**Target**: One `client/src/lib/settlement.ts` with `deriveAllowedActions(session, splits?)` 
**Why**: Single source of truth for client-side permission derivation

### Task 2: Extract polling into `useSettlementPoll` hook

**Current**: Each component has its own useEffect + setInterval + fingerprint
**Target**: `client/src/hooks/useSettlementPoll.ts` — shared hook with:
  - Configurable interval (3s for admin, 5s for customer)
  - Built-in fingerprint comparison
  - Returns `{ session, splits, mainBill, allowed, refresh }`
  - Used by SplitBillManager, BillSettleDialog

### Task 3: Extract mode recalculation to server helper

**Current**: Mode recalculation logic duplicated in `deleteSplitBill` and `invalidateConflictingSplits`
**Target**: `server/src/settlement/mode.ts` with `recalculateMode(sessionId)` 
**Why**: One function handles all mode transitions

### Task 4: Split `split-bill.service.ts`

**Current**: 300+ lines — queries, creation, deletion, invalidation, mode management
**Target**:
  - `split-bill.service.ts` — CRUD (create, delete, get, buildAssignedQtyMap)
  - `split-bill-invalidation.ts` — invalidateConflictingSplits + mode recalc
  - `split-bill-summary.ts` — getMainBillSummary, calcByItemSubtotal

### Task 5: Consolidate session auto-close logic

**Current**: Auto-close in addPayment + safety net timer in session.service.ts
**Target**: Extract to `server/src/settlement/auto-close.ts` — clear separation of:
  - Immediate close (on payment)
  - Safety net close (timer)
  - Manual close (admin button)

### Task 6: Client component cleanup

- SplitBillManager: ~200 lines → extract payment handlers to `useSplitPayment` hook
- BillSettleDialog: ~340 lines → extract PaymentMethodSection to separate file (already partially done)
- TablesPage: ~500 lines → extract table detail panel to `TableDetailPanel` (already exists but underused)

## Execution Order

```
Task 1 + Task 2 (parallel, client-side) → Task 3 + Task 4 (parallel, server-side) → Task 5 → Task 6
```

Estimated: 2-3 hours with subagents.

## Non-goals

- No API changes — all refactoring is internal
- No behavior changes — purely structural
- No new features — this is tech debt cleanup

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

### Task 7: Mobile-friendly order actions on TablesPage

**Current problems** (from UX audit Loop 6):
- "编辑订单" link is `text-xs` — too small for touch (< 44px)
- "Void" button is `text-[10px]` — nearly impossible to tap on mobile
- No swipe/tap gesture on item cards — only tiny text links
- `prompt()` used for void reason — browser native, not mobile-friendly

**Target**:
- Item card: tap entire card → open OrderEditDialog for that order
- Void: swipe-left on item card reveals void button (44px min), or long-press
- "编辑订单" header: increase to `min-h-[44px]` button with icon
- Replace `prompt()` for void reason with a Dialog + Input
- All interactive elements ≥ 44px touch target

### Task 8: Ad-hoc item options (临时加选项)

**Current**: Waiter can only use pre-defined menu options or override total price.
**Target**: OrderEditDialog gains an "Add custom option" button:
  - Input: option name (e.g., "加辣酱") + price adjust (e.g., +$1.00)
  - Creates a SelectedOption with `optionId: 'custom-{uuid}'`
  - Stored in OrderItem.selectedOptions like normal options
  - Shows on receipt/bill as a line item
  - Accounts correctly in `itemUnitPrice()` / `itemLineTotal()`

### Task 9: Customer-side "waiter processing" indicator

**Current**: No indication when waiter is handling splits/payments on admin side.
**Target**: When session has unpaid splits (waiter created them), customer SettlementSheet shows:
  - Banner: "服务生正在处理您的账单 / Waiter is processing your bill"
  - Pay buttons still functional (customer can override — splits auto-invalidate)
  - Detection: check if `getSplitBills()` returns any unpaid splits in the session
  - Implementation: SettlementSheet polls session summary which already includes split count info, or add a `hasPendingSplits` field to session summary response

### Task 10: Notion test checklist update

After all tasks complete, update the Notion test page (33c6226e19418137844dcefb16ef7664) with:
- New test items for Tasks 7-9
- Mark any existing items that were affected by architecture changes
- Verify all 84+ existing checkboxes still reflect correct behavior

## Execution Order

```
Phase 1: Task 1 + Task 2 (parallel, client-side hooks)
Phase 2: Task 3 + Task 4 (parallel, server-side split)
Phase 3: Task 5 (auto-close consolidation)
Phase 4: Task 6 + Task 7 (parallel, UI cleanup + mobile UX)
Phase 5: Task 8 + Task 9 (parallel, new features)
Phase 6: Task 10 (test checklist update)
```

Estimated: 3-4 hours with subagents.

## Non-goals

- No API contract changes — all refactoring is internal
- No behavior changes in Phase 1-3 — purely structural
- Tasks 7-9 are feature additions, built on the cleaned-up architecture

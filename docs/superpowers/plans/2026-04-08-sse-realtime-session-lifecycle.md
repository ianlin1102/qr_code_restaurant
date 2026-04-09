# SSE Real-Time Events + Session Lifecycle Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace 11 polling mechanisms with Server-Sent Events (SSE) for instant updates, and clarify session lifecycle UX so both admin and customer understand session state at a glance.

**Architecture:** Two SSE channels — session-scoped (customer + admin watching one session) and store-scoped (admin watching all tables/orders). Server emits events after every state mutation. Client EventSource hooks replace setInterval polling. Session lifecycle gets visual states and explicit customer notifications.

**Tech Stack:** Express SSE (native `res.write` + `text/event-stream`), EventSource API (browser-native), Node EventEmitter for internal pub/sub.

---

## Current State: 11 Polling Mechanisms

| # | Component | Endpoint | Interval | Side | Replace? |
|---|-----------|----------|----------|------|----------|
| 1 | `useCartSync` | `getSessionCart` | 5s | Customer | Yes → session SSE |
| 2 | `useSettlementPoll` | `getSessionSummary` + `getSplitBills` | 3s | Both | Yes → session SSE |
| 3 | `payment-store` | `getActiveSession` | 5s | Customer | Yes → session SSE |
| 4 | `DashboardPage` | `getOrders` | 5s | Admin | Yes → store SSE |
| 5 | `TablesPage` | `getTables` + `getOrders` | 10s | Admin | Yes → store SSE |
| 6 | `FloorPlanPage` | `getTables` + `getOrders` | 10s | Admin | Yes → store SSE |
| 7 | `ActiveOrdersSidebar` | `getOrders` (active) | 15s | Admin | Yes → store SSE |
| 8 | `WaitlistPanel` | `getWaitlist` | 30s | Admin | Keep polling (low frequency, separate domain) |
| 9 | `MenuPage` | `getMenu` | 30s | Customer | Keep polling (menu is large, changes are rare) |
| 10 | `TableDetailPanel` | (local tick) | 60s | Admin | Keep (display-only timer) |
| 11 | `OrderConfirmPage` | `getActiveSession` (retry) | 1.5s×8 | Customer | Yes → session SSE |

**Result:** 8 polling mechanisms replaced by 2 SSE channels. 3 kept as-is (waitlist, menu, time ticker).

---

## SSE Event Types

### Session-scoped events (`/api/stores/:storeId/sessions/:sessionId/events`)

| Event | Payload | Triggered By | Consumers |
|-------|---------|-------------|-----------|
| `session:summary` | Full `SessionSummary` | Payment, coupon, mode lock, reopen, close | payment-store, useSettlementPoll, OrderConfirmPage |
| `order:created` | `{ order: Order }` | New order placed | Both (customer sees order, admin sees in KDS) |
| `order:updated` | `{ order: Order }` | Status change, item edit, void | Both |
| `cart:updated` | `{ items: CartItem[], cartVersion, lastCartSubmitAt }` | Another device updated cart | useCartSync |
| `cart:submitted` | `{ cartVersion }` | Cart submitted (any device) | useCartSync |
| `split:changed` | `{ splits: SplitBill[], mainBill }` | Create/delete/pay split | useSettlementPoll, SettlementSheet |

### Store-scoped events (`/api/stores/:storeId/events`)

| Event | Payload | Triggered By | Consumers |
|-------|---------|-------------|-----------|
| `store:tables` | `{ tables: Table[] }` | Table status change, session open/close | TablesPage, FloorPlanPage |
| `store:orders` | `{ orders: Order[] }` | Any order mutation | DashboardPage, ActiveOrdersSidebar, TablesPage |

**Design notes:**
- Session events send full objects (not deltas) — client replaces state, no merge logic.
- Store events also send full arrays — keeps client logic simple, total payload is < 50KB for typical stores.
- `session:summary` is the most common event; includes `allowedActions` so client UI updates instantly.

---

## File Structure

### Server-side new files
| File | Responsibility |
|------|----------------|
| `server/src/lib/sse.ts` | SSE connection manager: track connections by storeId+sessionId, broadcast helper, heartbeat |
| `server/src/lib/event-bus.ts` | Node EventEmitter singleton: typed events, `emit()` + `on()` + `off()` |
| `server/src/routes/sse.routes.ts` | Two SSE endpoints: session-scoped and store-scoped |

### Server-side modified files
| File | Change |
|------|--------|
| `server/src/app.ts` | Mount SSE routes |
| `server/src/controllers/session.service.ts` | Emit events after mutations (addPayment, close, reopen, cart, coupon) |
| `server/src/controllers/order.service.ts` | Emit events after order create/update/void/delete |
| `server/src/controllers/split-bill.service.ts` | Emit events after split create/delete |
| `server/src/controllers/split-bill-payment.service.ts` | Emit events after split payment |
| `server/src/settlement/gateway.ts` | Emit `session:summary` after every settlement action |

### Client-side new files
| File | Responsibility |
|------|----------------|
| `client/src/hooks/useSessionEvents.ts` | EventSource hook for session-scoped SSE, auto-reconnect, event dispatch |
| `client/src/hooks/useStoreEvents.ts` | EventSource hook for store-scoped SSE, auto-reconnect, event dispatch |

### Client-side modified files
| File | Change |
|------|--------|
| `client/src/hooks/useCartSync.ts` | Listen to `cart:updated` + `cart:submitted` instead of polling |
| `client/src/hooks/useSettlementPoll.ts` | Listen to `session:summary` + `split:changed` instead of polling |
| `client/src/stores/payment-store.ts` | Listen to `session:summary` instead of polling |
| `client/src/pages/admin/DashboardPage.tsx` | Listen to `store:orders` instead of polling |
| `client/src/pages/admin/TablesPage.tsx` | Listen to `store:tables` + `store:orders` instead of polling |
| `client/src/pages/admin/FloorPlanPage.tsx` | Listen to `store:tables` instead of polling |
| `client/src/components/floor/ActiveOrdersSidebar.tsx` | Listen to `store:orders` instead of polling |
| `client/src/pages/customer/OrderConfirmPage.tsx` | Listen to `session:summary` instead of retry polling |

### Session lifecycle UX files
| File | Change |
|------|--------|
| `client/src/pages/admin/TablesPage.tsx` | Add visual session states (settling, paid), reopen button on table cards |
| `client/src/components/customer/SettlementSheet.tsx` | Show "session closed" banner when closed by admin |
| `client/src/pages/customer/MenuPage.tsx` | Show "session closed" modal when session ends while browsing |
| `client/src/i18n/admin.ts` | New i18n keys for session states |
| `client/public/locales/en/customer.json` + `zh/customer.json` | New i18n keys for customer notifications |

---

## Phase 1: Server-Side Event Infrastructure

### Task 1: Event Bus (internal pub/sub)

**Files:**
- Create: `server/src/lib/event-bus.ts`

- [ ] **Step 1: Create typed event bus**

```typescript
// server/src/lib/event-bus.ts
import { EventEmitter } from 'events'

export type AppEvent =
  | { type: 'session:summary'; storeId: string; sessionId: string }
  | { type: 'order:created'; storeId: string; sessionId: string; order: any }
  | { type: 'order:updated'; storeId: string; sessionId: string; order: any }
  | { type: 'cart:updated'; storeId: string; sessionId: string }
  | { type: 'cart:submitted'; storeId: string; sessionId: string }
  | { type: 'split:changed'; storeId: string; sessionId: string }
  | { type: 'store:tables'; storeId: string }
  | { type: 'store:orders'; storeId: string }

const bus = new EventEmitter()
bus.setMaxListeners(200)  // many concurrent SSE connections

export function emit(event: AppEvent): void {
  bus.emit('app-event', event)
}

export function onEvent(handler: (event: AppEvent) => void): () => void {
  bus.on('app-event', handler)
  return () => bus.off('app-event', handler)
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/lib/event-bus.ts
git commit -m "feat: add typed event bus for SSE"
```

---

### Task 2: SSE Connection Manager

**Files:**
- Create: `server/src/lib/sse.ts`

- [ ] **Step 1: Create SSE helpers**

```typescript
// server/src/lib/sse.ts
import type { Response } from 'express'
import type { AppEvent } from './event-bus'
import { onEvent } from './event-bus'
import logger from './logger'

interface SSEClient {
  res: Response
  storeId: string
  sessionId?: string  // undefined = store-scoped
}

const clients: SSEClient[] = []

export function addClient(res: Response, storeId: string, sessionId?: string): () => void {
  // SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',  // nginx
  })
  res.write(':ok\n\n')  // initial comment to flush

  const client: SSEClient = { res, storeId, sessionId }
  clients.push(client)
  logger.info({ storeId, sessionId, total: clients.length }, 'SSE client connected')

  // Heartbeat every 30s to keep connection alive
  const heartbeat = setInterval(() => {
    try { res.write(':heartbeat\n\n') } catch { cleanup() }
  }, 30_000)

  const cleanup = () => {
    clearInterval(heartbeat)
    const idx = clients.indexOf(client)
    if (idx >= 0) clients.splice(idx, 1)
    logger.info({ storeId, sessionId, total: clients.length }, 'SSE client disconnected')
  }

  res.on('close', cleanup)
  return cleanup
}

function sendEvent(client: SSEClient, eventType: string, data: unknown): void {
  try {
    client.res.write(`event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`)
  } catch { /* client disconnected, cleanup will handle */ }
}

/** Route events to the right SSE clients. */
export function startEventRouter(): void {
  onEvent((event) => {
    for (const client of clients) {
      if (client.storeId !== event.storeId) continue

      if (client.sessionId) {
        // Session-scoped client: only gets events for their session
        if ('sessionId' in event && event.sessionId === client.sessionId) {
          sendEvent(client, event.type, event)
        }
      } else {
        // Store-scoped client: gets store-level events
        if (event.type === 'store:tables' || event.type === 'store:orders') {
          sendEvent(client, event.type, event)
        }
      }
    }
  })
}

export function getClientCount(): number { return clients.length }
```

- [ ] **Step 2: Commit**

```bash
git add server/src/lib/sse.ts
git commit -m "feat: add SSE connection manager with heartbeat and routing"
```

---

### Task 3: SSE Routes

**Files:**
- Create: `server/src/routes/sse.routes.ts`
- Modify: `server/src/app.ts`
- Modify: `server/src/server.ts`

- [ ] **Step 1: Create SSE route file**

```typescript
// server/src/routes/sse.routes.ts
import { Router } from 'express'
import type { Request, Response } from 'express'
import { addClient } from '../lib/sse'

const router = Router({ mergeParams: true })

// Session-scoped SSE: customer + admin watching one session
// GET /api/stores/:storeId/sessions/:sessionId/events
router.get('/sessions/:sessionId/events', (req: Request, res: Response) => {
  const { storeId, sessionId } = req.params
  addClient(res, storeId as string, sessionId as string)
})

// Store-scoped SSE: admin watching all tables/orders
// GET /api/stores/:storeId/events
router.get('/events', (req: Request, res: Response) => {
  const { storeId } = req.params
  addClient(res, storeId as string)
})

export default router
```

- [ ] **Step 2: Mount in app.ts**

Add after existing routes:
```typescript
import sseRoutes from './routes/sse.routes.js'
// ...
app.use('/api/stores/:storeId', sseRoutes)
```

- [ ] **Step 3: Start event router in server.ts**

Add after app.listen:
```typescript
import { startEventRouter } from './lib/sse.js'
// inside listen callback:
startEventRouter()
```

- [ ] **Step 4: Commit**

```bash
git add server/src/routes/sse.routes.ts server/src/app.ts server/src/server.ts
git commit -m "feat: add SSE endpoints for session and store events"
```

---

## Phase 2: Emit Events from Server Mutations

### Task 4: Emit from Settlement Gateway (covers most mutations)

**Files:**
- Modify: `server/src/settlement/gateway.ts`

The gateway handles: pay-items, pay-percent, cash-payment, add-payment, create-split, delete-split, pay-split-card, pay-split-cash, close-session, reopen-session.

- [ ] **Step 1: Add event emission after every successful action**

After the `if ('error' in actionResult)` / `else` block, before returning result, add:

```typescript
import { emit } from '../lib/event-bus'
// ...
// After building result (success or failure), emit events:
if (result.ok) {
  emit({ type: 'session:summary', storeId, sessionId })
  // Split-related actions also emit split:changed
  if (['create-split', 'delete-split', 'pay-split-card', 'pay-split-cash'].includes(action.type)) {
    emit({ type: 'split:changed', storeId, sessionId })
  }
  // Close/reopen affect table status
  if (action.type === 'close-session' || action.type === 'reopen-session') {
    emit({ type: 'store:tables', storeId })
  }
  // All settlement actions may affect store-level order/table views
  emit({ type: 'store:orders', storeId })
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/settlement/gateway.ts
git commit -m "feat: emit SSE events from settlement gateway"
```

---

### Task 5: Emit from Order and Cart mutations

**Files:**
- Modify: `server/src/controllers/order.service.ts`
- Modify: `server/src/controllers/session.service.ts`

- [ ] **Step 1: Order mutations**

In `order.service.ts`, add `import { emit } from '../lib/event-bus.js'` and emit after:
- `createOrder()`: `emit({ type: 'order:created', storeId, sessionId: order.sessionId, order })` + `emit({ type: 'store:orders', storeId })` + `emit({ type: 'session:summary', storeId, sessionId })`
- `updateOrderStatus()`: `emit({ type: 'order:updated', storeId, sessionId: order.sessionId, order })` + `emit({ type: 'store:orders', storeId })`
- `updateOrderItems()`: same as updateOrderStatus + `emit({ type: 'session:summary', storeId, sessionId })`
- `voidItem()`: same as updateOrderItems
- `deleteOrder()`: `emit({ type: 'store:orders', storeId })`

- [ ] **Step 2: Cart mutations**

In `session.service.ts`, add `import { emit } from '../lib/event-bus.js'` and emit after:
- `updateDeviceCart()`: `emit({ type: 'cart:updated', storeId: session.storeId, sessionId })`
- `submitSessionCart()` (success path): `emit({ type: 'cart:submitted', storeId, sessionId })`

- [ ] **Step 3: Coupon mutations**

In `session.service.ts`:
- `applyCoupon()`: `emit({ type: 'session:summary', storeId, sessionId })`
- `removeCoupon()`: `emit({ type: 'session:summary', storeId, sessionId })`

- [ ] **Step 4: Commit**

```bash
git add server/src/controllers/order.service.ts server/src/controllers/session.service.ts
git commit -m "feat: emit SSE events from order, cart, and coupon mutations"
```

---

### Task 6: Emit from Webhook (payment confirmation)

**Files:**
- Modify: `server/src/controllers/payment.service.ts`

- [ ] **Step 1: Emit after webhook confirms payment**

In `handleWebhookEvent()`, after each successful payment processing path, add:
```typescript
emit({ type: 'session:summary', storeId, sessionId })
emit({ type: 'store:orders', storeId })
emit({ type: 'store:tables', storeId })
```

This covers: pay-first order creation, session payment confirmation, item payment confirmation, percent payment confirmation.

- [ ] **Step 2: Commit**

```bash
git add server/src/controllers/payment.service.ts
git commit -m "feat: emit SSE events from Stripe webhook"
```

---

## Phase 3: Client-Side SSE Hooks

### Task 7: Session EventSource Hook

**Files:**
- Create: `client/src/hooks/useSessionEvents.ts`

- [ ] **Step 1: Create the hook**

```typescript
// client/src/hooks/useSessionEvents.ts
import { useEffect, useRef, useCallback } from 'react'

type SessionEventType = 'session:summary' | 'order:created' | 'order:updated'
  | 'cart:updated' | 'cart:submitted' | 'split:changed'

type Handler = (data: any) => void

/**
 * Subscribe to session-scoped SSE events.
 * Auto-reconnects on disconnect. Returns subscribe function.
 */
export function useSessionEvents(
  storeId: string | null | undefined,
  sessionId: string | null | undefined,
) {
  const handlersRef = useRef<Map<SessionEventType, Set<Handler>>>(new Map())
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!storeId || !sessionId) return

    const baseUrl = import.meta.env.VITE_API_URL || ''
    const url = `${baseUrl}/api/stores/${storeId}/sessions/${sessionId}/events`
    const es = new EventSource(url)
    esRef.current = es

    const eventTypes: SessionEventType[] = [
      'session:summary', 'order:created', 'order:updated',
      'cart:updated', 'cart:submitted', 'split:changed',
    ]

    for (const type of eventTypes) {
      es.addEventListener(type, (e) => {
        try {
          const data = JSON.parse(e.data)
          const handlers = handlersRef.current.get(type)
          handlers?.forEach(h => h(data))
        } catch { /* ignore parse errors */ }
      })
    }

    es.onerror = () => {
      // EventSource auto-reconnects; no manual retry needed
    }

    return () => { es.close(); esRef.current = null }
  }, [storeId, sessionId])

  const subscribe = useCallback((type: SessionEventType, handler: Handler) => {
    if (!handlersRef.current.has(type)) {
      handlersRef.current.set(type, new Set())
    }
    handlersRef.current.get(type)!.add(handler)
    return () => { handlersRef.current.get(type)?.delete(handler) }
  }, [])

  return { subscribe }
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/hooks/useSessionEvents.ts
git commit -m "feat: add useSessionEvents SSE hook"
```

---

### Task 8: Store EventSource Hook

**Files:**
- Create: `client/src/hooks/useStoreEvents.ts`

- [ ] **Step 1: Create the hook**

Same pattern as Task 7, but for store-scoped events:
- URL: `/api/stores/${storeId}/events`
- Event types: `store:tables`, `store:orders`
- No sessionId needed

- [ ] **Step 2: Commit**

```bash
git add client/src/hooks/useStoreEvents.ts
git commit -m "feat: add useStoreEvents SSE hook"
```

---

## Phase 4: Replace Client Polling with SSE

### Task 9: Replace payment-store polling

**Files:**
- Modify: `client/src/stores/payment-store.ts`

- [ ] **Step 1: Replace setInterval with SSE subscription**

Instead of polling `getActiveSession` every 5s, the store exposes a `handleSummaryEvent(data)` method. The component that owns the SSE connection (e.g., a layout component or MenuPage) calls this when `session:summary` events arrive.

Keep the `start()`/`stop()` API but replace the interval with a one-time initial fetch. Updates come via `handleSummaryEvent()`.

- [ ] **Step 2: Commit**

---

### Task 10: Replace useSettlementPoll with SSE

**Files:**
- Modify: `client/src/hooks/useSettlementPoll.ts`

- [ ] **Step 1: Convert to SSE-driven updates**

Instead of setInterval, accept a `subscribe` function from `useSessionEvents`. Subscribe to `session:summary` and `split:changed`. On each event, fetch fresh data (one API call instead of repeated polling). Keep `refresh()` as a manual trigger.

Fallback: if SSE is not available (no sessionId yet), keep the old polling as fallback.

- [ ] **Step 2: Commit**

---

### Task 11: Replace useCartSync polling with SSE

**Files:**
- Modify: `client/src/hooks/useCartSync.ts`

- [ ] **Step 1: Replace poll interval with SSE events**

Subscribe to `cart:updated` and `cart:submitted`. On `cart:updated` from another device, fetch latest cart from server. On `cart:submitted`, check if it's remote (same `markSubmitted` logic) and clear if so.

Keep the 1s debounced push (local→server) unchanged — that's not polling, it's a write path.

- [ ] **Step 2: Commit**

---

### Task 12: Replace admin page polling with SSE

**Files:**
- Modify: `client/src/pages/admin/DashboardPage.tsx`
- Modify: `client/src/pages/admin/TablesPage.tsx`
- Modify: `client/src/pages/admin/FloorPlanPage.tsx`
- Modify: `client/src/components/floor/ActiveOrdersSidebar.tsx`

- [ ] **Step 1: DashboardPage — subscribe to `store:orders`**

On event, re-fetch orders (one call). Remove setInterval.

- [ ] **Step 2: TablesPage — subscribe to `store:tables` + `store:orders`**

On either event, re-fetch. Remove setInterval.

- [ ] **Step 3: FloorPlanPage — subscribe to `store:tables`**

On event, re-fetch. Remove setInterval.

- [ ] **Step 4: ActiveOrdersSidebar — subscribe to `store:orders`**

On event, re-fetch active orders. Remove 15s setInterval. Keep 60s tick timer (display-only).

- [ ] **Step 5: Commit**

---

### Task 13: Replace OrderConfirmPage retry polling

**Files:**
- Modify: `client/src/pages/customer/OrderConfirmPage.tsx`

- [ ] **Step 1: Subscribe to `session:summary` SSE**

Instead of 1.5s retry loop × 8, subscribe to SSE. When `session:summary` arrives, check if the payment is confirmed. Keep a 15s timeout fallback for cases where SSE doesn't connect fast enough.

- [ ] **Step 2: Commit**

---

## Phase 5: Session Lifecycle UX

### Task 14: Visual session states on TablesPage

**Files:**
- Modify: `client/src/pages/admin/TablesPage.tsx`
- Modify: `client/src/i18n/admin.ts`

- [ ] **Step 1: Add session state indicators on table cards**

Currently table cards show "occupied"/"idle". Add sub-states based on session data:
- **Ordering** (active, no payments): default occupied state
- **Settling** (active, totalPaid > 0 but remaining > 0): show amber badge "结账中 / Settling"
- **Paid** (active, remaining ≤ 0, not yet closed): show green badge "已付清 / Paid"
- **Closed**: table shows as idle (current behavior)

- [ ] **Step 2: Add reopen button to table detail panel**

Currently reopen only exists in BillSettleDialog. Add to the table detail panel header area for closed sessions that are still visible in history.

- [ ] **Step 3: Add i18n keys**

```typescript
settling: '结账中' / 'Settling',
fullyPaid: '已付清' / 'Fully Paid',
reopenSession: '重开桌台' / 'Reopen',
```

- [ ] **Step 4: Commit**

---

### Task 15: Customer-side session closed notification

**Files:**
- Modify: `client/src/pages/customer/MenuPage.tsx`
- Modify: `client/src/components/customer/SettlementSheet.tsx`
- Modify: `client/public/locales/en/customer.json`
- Modify: `client/public/locales/zh/customer.json`

- [ ] **Step 1: MenuPage — show dialog when session closes**

Subscribe to `session:summary` SSE. When session status changes to `closed`, show a dialog:
- Title: "桌台已结账 / Table Session Ended"
- Message: "您的账单已处理完成 / Your bill has been processed"
- Button: "好的 / OK" → navigate to store landing page

- [ ] **Step 2: SettlementSheet — show closed banner**

If session.status becomes `closed` while the sheet is open, show a banner replacing the pay button:
- "账单已关闭 / Bill Closed"
- Hide all payment buttons

- [ ] **Step 3: Add i18n keys**

```json
{
  "session": {
    "closedTitle": "桌台已结账",
    "closedMessage": "您的账单已处理完成",
    "closedOk": "好的"
  }
}
```

- [ ] **Step 4: Commit**

---

### Task 16: Disable auto-close on full payment

**Files:**
- Modify: `server/src/controllers/session.service.ts`

**Rationale:** Currently `addPayment()` auto-closes the session when `newTotalPaid >= totalWithTax`. This is confusing because:
- Customers still on the menu page get their session yanked
- Admin may want to add more items after payment
- There's no "settling" buffer period

- [ ] **Step 1: Remove auto-close from addPayment**

Remove lines 140-143 from `session.service.ts`:
```typescript
// REMOVE:
// if (newTotalPaid >= totalWithTax) {
//   closeSession(storeId, sessionId)
// }
```

Keep the safety net timer (auto-close.ts) as the fallback for truly abandoned sessions.

- [ ] **Step 2: Make the "翻桌 / Close Table" button prominent**

In TablesPage.tsx, when session is fully paid, show a prominent green "翻桌" button at the top of the table detail panel instead of hidden at the bottom.

- [ ] **Step 3: Commit**

---

## Phase 6: Verification

### Task 17: Full type-check and integration test

- [ ] **Step 1: Client type-check**

```bash
cd client && ./node_modules/.bin/tsc -b --noEmit
```
Expected: 0 errors

- [ ] **Step 2: Server type-check**

```bash
cd server && ./node_modules/.bin/tsc --noEmit
```
Expected: Only pre-existing Express route errors

- [ ] **Step 3: Manual test checklist**

1. Open admin TablesPage — verify SSE connects (check Network tab for EventSource)
2. Place order from customer device — admin sees update instantly (no 10s delay)
3. Make payment — both customer and admin see update instantly
4. Close session from admin — customer sees "session ended" dialog
5. Open cart, add items, submit, immediately add more items — cart NOT cleared
6. Reopen closed session — table goes back to "occupied"

- [ ] **Step 4: Commit all remaining changes**

---

## Execution Order

```
Phase 1: Tasks 1-3 (server infrastructure, can be parallel)
Phase 2: Tasks 4-6 (emit events, sequential — each touches different files)
Phase 3: Tasks 7-8 (client hooks, parallel)
Phase 4: Tasks 9-13 (replace polling, mostly parallel per file)
Phase 5: Tasks 14-16 (session lifecycle UX, sequential)
Phase 6: Task 17 (verification)
```

## Non-goals

- WebSocket (SSE is simpler and sufficient for server→client push)
- Authentication on SSE endpoints (session/store IDs are UUIDs, low risk for MVP)
- Redis pub/sub (single-process server, EventEmitter is sufficient)
- Replacing waitlist/menu polling (low frequency, not worth the complexity)

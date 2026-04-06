# Feature Spec: Tip Fix + Atomic Cart Submit + Employee Clock-In/Out

**Date:** 2026-04-04
**Status:** Draft

---

## Feature 1: Fix Tip Calculation in Checkout Flow

### Problem

CheckoutPage `applyTip` (line 134) calculates tip as `Math.round(amount * pct / 100)` where `amount` is the raw amount passed via route state. Two bugs:

1. **Percentage tip uses pre-tax base**: `amount` from settlement already includes tax, but the `baseAmount` passed to TipSelector is the same `amount`. The tip preview labels in TipSelector show `formatPriceUSD(Math.round(baseAmount * pct / 100))` which is correct if `baseAmount` = after-tax total, but the actual `applyTip` call also uses `amount` — so the calculation is correct on paper but `amount` may not always be the after-tax total depending on flow.
2. **Custom tip converts dollars to percentage then back**: TipSelector converts custom dollar input to percentage (`pct = dollars * 100 / baseAmount`), then `applyTip` converts it back (`tip = amount * pct / 100`). This round-trip loses precision and conflates custom-dollar with percentage tips.
3. **`applyTip` recreates PaymentIntent on every tip change**: For pay-later flow, it calls `createCheckoutForSession(storeId, sessionId, amount + tip, settlement)`. The `amount` here is the *original* settlement amount (no tip), and `tip` is calculated from `amount`. This is correct but fragile — if `amount` already included a previous tip (from re-render), it would double-count.

### Correct Formula

```
subtotal       = settlement amount (items cost or percent share, from server)
tax            = subtotal * store.taxRate / 100
serviceFee     = subtotal * store.serviceFeeRate / 100
afterTaxTotal  = subtotal + tax + serviceFee

# Percentage tip:
tip = Math.round(afterTaxTotal * tipPct / 100)

# Custom tip:
tip = customAmountInCents   (user enters dollars, convert to cents)

chargeAmount = afterTaxTotal + tip
```

### Design

#### TipSelector Changes

- Add new prop: `mode: 'percent' | 'custom'` tracked internally (replaces `customOpen` boolean)
- When in custom mode, `onSelect` receives a **negative sentinel** or a separate callback to distinguish custom dollar amount from percentage
- **Simpler approach**: Change `onSelect` signature to `onSelect(tip: { type: 'percent'; pct: number } | { type: 'custom'; amount: number } | null)`
- TipSelector preview labels: `formatPriceUSD(Math.round(baseAmount * pct / 100))` — `baseAmount` should be afterTaxTotal

#### CheckoutPage Changes

- Route state already carries `amount` (from settlement or cart). This is the **afterTaxTotal** (settlement endpoints already return amount including tax+fee).
- `applyTip` receives the typed tip object:
  - `{ type: 'percent', pct }` → `tip = Math.round(amount * pct / 100)`
  - `{ type: 'custom', amount: cents }` → `tip = cents`
  - `null` → `tip = 0`
- Recreate PaymentIntent with `tipAmount: tip` (server adds tip on top of the payment amount)
- Display breakdown on checkout page: subtotal line, tax line, tip line, total line

#### Server Changes

None required. `createPaymentIntentForSession` already accepts `tipAmount` and adds it on top: `chargeAmount = Math.min(req.amount, remaining) + tip`. The `req.amount` is the afterTaxTotal from settlement, and `tip` is additive.

### Files to Modify

| File | Change |
|------|--------|
| `client/src/components/shared/TipSelector.tsx` | Change `onSelect` to typed tip object; stop converting custom dollars to pct |
| `client/src/pages/customer/CheckoutPage.tsx` | Update `applyTip` to handle typed tip; show price breakdown |
| `client/src/pages/customer/CheckoutPage.tsx` | Ensure `amount` (route state) is always afterTaxTotal |

---

## Feature 2: Atomic Shared Cart Submit (Server-Side Merge)

### Problem

Currently each device submits only its own items (`CartPage.tsx:170` filters by `addedByDevice === myDeviceId`). The user wants:
1. When anyone clicks submit, ALL devices' pending cart items are merged into one order
2. This must be atomic — if two people click submit simultaneously, only one order is created
3. After submission, all devices' carts are cleared
4. Other devices see a "order submitted" notification on next poll

### Design: `cartVersion` Optimistic Lock

#### Data Model Changes (`shared/types.ts`)

```typescript
// Session — add fields:
interface Session {
  // ... existing fields ...
  cartVersion: number           // incremented on every pendingCart change
  lastCartSubmitAt?: string     // set when cart is submitted as order
}
```

#### New Server Endpoint

**`POST /api/stores/:storeId/sessions/:sessionId/submit-cart`**

Request:
```json
{
  "cartVersion": 42,
  "customerName": "Alice"
}
```

Response (success):
```json
{
  "order": { "id": "...", "orderNumber": "A003", ... }
}
```

Response (conflict — already submitted):
```json
// 409 Conflict
{
  "error": "Cart already submitted",
  "order": { "id": "...", "orderNumber": "A003" }
}
```

#### Server Logic (`session.service.ts`)

```
function submitSessionCart(storeId, sessionId, expectedVersion, customerName):
  1. session = getById(sessionId)
  2. if session.cartVersion !== expectedVersion → return 409 + latest order
  3. allItems = Object.values(session.pendingCart).flat()
  4. if allItems.length === 0 → return 400 "Cart is empty"
  5. IF pay-later mode:
       Create order with allItems (via createOrder)
     IF pay-first mode:
       Do NOT create order (Stripe webhook will create it)
  6. Clear pendingCart → {}
  7. Set lastCartSubmitAt = now()
  8. Increment cartVersion
  9. Return { order } (pay-later) or { items: allItems } (pay-first)
```

Steps 2-8 execute synchronously (single-threaded Node.js, no await between check and write), making it naturally atomic against concurrent requests.

**Important**: `cartVersion` is ONLY incremented by `submitSessionCart`, NOT by `updateDeviceCart`. The version exists solely to prevent duplicate order creation. If `updateDeviceCart` also incremented it, adding items between cart load and submit would cause spurious 409 conflicts.

#### Client Changes

**CartPage.tsx** — Submit all items:
- Remove the `myItems` filter — submit calls the new endpoint instead
- `handleCheckout()`:
  - For pay-later: `POST /sessions/:id/submit-cart` with `{ cartVersion, customerName }` → receives order → navigate to confirm
  - For pay-first: same endpoint → receives `{ items }` → create PaymentIntent with those items → navigate to CheckoutPage
  - On 409: show toast "Order already submitted by another device", navigate to confirm page
  - On success: `clearCart()` (clear ALL items, not just mine), navigate to confirm/checkout

**MenuPage.tsx** — Poll detects submission:
- Cart poll already fetches session cart every 5s
- Add check: if `session.lastCartSubmitAt` changed since last poll AND `pendingCart` is empty → show toast "Order submitted!" and `clearCart()`
- Alternative simpler approach: poll returns `cartVersion` + `pendingCart`. If cart was non-empty locally but server returns empty cart + higher version → infer submission happened → clear local cart + show notification

**GET /sessions/:sessionId/cart** response change:
```json
{
  "items": [...],
  "cartVersion": 42,
  "lastCartSubmitAt": "2026-04-04T10:30:00Z"   // null if never submitted
}
```

#### Edge Cases

| Scenario | Behavior |
|----------|----------|
| A submits while B is adding items | `updateDeviceCart` does NOT increment `cartVersion`, so A's submit succeeds. B's items that were already pushed to server are included in the merged order. If B pushes new items *after* submit clears the cart, those items land in a fresh `pendingCart` for the next round. |
| A and B click submit within ms | First request succeeds (version matches), second gets 409 with the created order. Both end up on confirm page. |
| Cart is empty when someone submits | Return 400 "Cart is empty" |
| Device C adds items after submission | Normal flow — new items go into fresh `pendingCart`, `cartVersion` keeps incrementing. Next submit creates a new order. |

### Files to Modify

| File | Change |
|------|--------|
| `shared/types.ts` | Add `cartVersion`, `lastCartSubmitAt` to `Session` |
| `server/src/controllers/session.service.ts` | Add `submitSessionCart()`, modify `updateDeviceCart` to increment `cartVersion` |
| `server/src/routes/session.routes.ts` | Add `POST /:sessionId/submit-cart` endpoint |
| `client/src/services/api.ts` | Add `submitSessionCart()` method |
| `client/src/pages/customer/CartPage.tsx` | Replace per-device submit with `submitSessionCart` call |
| `client/src/pages/customer/MenuPage.tsx` | Poll detects cart cleared → show notification + clear local cart |

---

## Feature 3: Employee Clock-In/Out

### Overview

Employees enter a 4-digit PIN on the admin "More" page to clock in/out. The admin device serves as a shared kiosk at the front desk.

### Data Model

#### `StoreUser` — Add PIN field (`shared/types.ts`)

```typescript
interface StoreUser {
  // ... existing fields ...
  clockPin?: string    // 4-digit PIN for clock-in/out, required on creation going forward
}
```

#### New Type: `TimeEntry` (`shared/types.ts`)

```typescript
interface TimeEntry {
  id: string
  storeId: string
  userId: string       // → StoreUser.id
  clockIn: string      // ISO timestamp
  clockOut?: string    // ISO timestamp, null = currently clocked in
  duration?: number    // minutes, computed on clock-out
}
```

### Storage

- New JSON store: `server/data/time-entries.json`
- Singleton in `repositories/stores.ts`: `timeEntryStore`

### API Endpoints

All under `/api/stores/:storeId/clock`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/pin` | - | Verify PIN, return user info + clock status. No JWT required (PIN is the auth). |
| POST | `/in` | - | Clock in (create TimeEntry) |
| POST | `/out` | - | Clock out (close open TimeEntry) |
| GET | `/entries` | JWT (staff:manage) | List time entries (query: ?userId=&startDate=&endDate=) |

#### `POST /pin` — Verify PIN

Request: `{ "pin": "1234" }`

Response:
```json
{
  "user": { "id": "...", "username": "Alice" },
  "clockedIn": true,
  "currentEntry": { "id": "...", "clockIn": "2026-04-04T08:00:00Z" }
}
```

- Looks up StoreUser by `storeId + clockPin`
- If no match → 404 "Invalid PIN"
- If match → check if there's an open TimeEntry (no `clockOut`) for this user
- Returns user info + current clock status

#### `POST /in` — Clock In

Request: `{ "pin": "1234" }`

Response:
```json
{
  "entry": { "id": "...", "clockIn": "2026-04-04T08:00:00Z" }
}
```

- Verify PIN (same as above)
- If already clocked in → 400 "Already clocked in"
- Create TimeEntry with `clockIn = now()`

#### `POST /out` — Clock Out

Request: `{ "pin": "1234" }`

Response:
```json
{
  "entry": { "id": "...", "clockIn": "...", "clockOut": "...", "duration": 480 }
}
```

- Verify PIN
- Find open TimeEntry for this user
- If not clocked in → 400 "Not clocked in"
- Set `clockOut = now()`, compute `duration = (clockOut - clockIn) / 60000` (minutes)

### Frontend

#### New Page: `ClockInPage.tsx` (or a tab/section in MorePage)

Add a "Clock In/Out" card to MorePage's grid (no permission check — all logged-in staff can see it). Clicking it navigates to `/admin/clock`. The clock page itself lives inside the admin layout (requires admin login to access the page), but the clock API endpoints (`/pin`, `/in`, `/out`) use PIN auth instead of JWT — this is fine because the page is only reachable after admin login.

#### `/admin/clock` — Clock-In/Out Page

**State machine:**

```
[PIN Entry] → POST /pin → [Modal: Welcome / Hello]
                              ↓ Clock In     ↓ Clock Out
                           POST /in       POST /out
                              ↓               ↓
                         [Success toast]  [Success toast + duration]
                              ↓               ↓
                         [Back to PIN entry]
```

**PIN Entry screen:**
- Large 4-digit input (like a keypad/passcode screen)
- Numeric keypad (0-9) + backspace + confirm
- No admin login required to access this screen

**Modal (after PIN verified):**
- If NOT clocked in:
  - "Welcome back, {username}!"
  - [Clock In] button
- If ALREADY clocked in:
  - "Hello, {username}"
  - "Clocked in at {time}" (show duration so far)
  - [Clock Out] button
- After action: success toast, modal closes, PIN input resets

#### Admin Staff View — Show Time Entries

In StaffManagePage, add a column or expandable section showing:
- Current clock status (clocked in / out)
- Today's total hours
- Link to detailed time entry history (future enhancement)

### Files to Create

| File | Purpose |
|------|---------|
| `server/data/time-entries.json` | Initial empty array `[]` |
| `server/src/controllers/clock.service.ts` | Business logic: verifyPin, clockIn, clockOut, getEntries |
| `server/src/routes/clock.routes.ts` | Route handlers |
| `client/src/pages/admin/ClockPage.tsx` | PIN entry + clock-in/out UI |

### Files to Modify

| File | Change |
|------|--------|
| `shared/types.ts` | Add `clockPin` to `StoreUser`, add `TimeEntry` type |
| `server/src/repositories/stores.ts` | Add `timeEntryStore` singleton |
| `server/src/app.ts` | Register clock routes |
| `client/src/pages/admin/MorePage.tsx` | Add "Clock In/Out" card |
| `client/src/App.tsx` | Add `/admin/clock` route |
| `client/src/services/api.ts` | Add clock API methods |
| `client/src/pages/admin/StaffManagePage.tsx` | Show clock status/hours per staff member |
| `server/src/controllers/staff.service.ts` | Accept `clockPin` on staff creation |
| `server/src/routes/staff.routes.ts` | Pass `clockPin` through |
| `client/src/i18n/en/admin.json` + `zh/admin.json` | Add clock-related i18n keys |
| `client/src/i18n/admin.ts` | Add clock-related translation keys |

### Security Considerations

- PIN is NOT a password — it's a 4-digit convenience code for a shared kiosk. Store as plaintext (not hashed), since:
  - Only 10,000 combinations — hashing doesn't add meaningful security
  - Admin needs to see/reset PINs
  - The kiosk is physically at the restaurant front desk
- PIN uniqueness enforced per store (two employees in the same store can't share a PIN)
- Clock endpoints are scoped to storeId in URL — no cross-store access
- `GET /entries` requires JWT with `staff:manage` permission

---

## Implementation Order

1. **Feature 1 (Tip fix)** — Smallest scope, pure bug fix, no new data models
2. **Feature 2 (Atomic cart)** — Medium scope, changes submission flow
3. **Feature 3 (Clock-in/out)** — Largest scope, new data model + UI + routes

Features 1 and 2 are independent of each other and can be parallelized. Feature 3 is fully independent of both.

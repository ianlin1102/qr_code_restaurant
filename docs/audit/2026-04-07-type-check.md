# API Response Type Consistency Audit

**Date**: 2026-04-07
**Scope**: Backend `server/src/routes/` + `server/src/controllers/` vs Frontend `client/src/services/api.ts` + `client/src/`

---

## Mismatch Found

### 1. `paySplitBillCard` (manual capture) -- missing `authorizedAmount`

| Side | Field | Status |
|------|-------|--------|
| Frontend `api.ts:459` | `{ clientSecret: string; paymentIntentId: string; authorizedAmount: number }` | expects `authorizedAmount` |
| Backend `split-bill-payment.service.ts:90` | `{ clientSecret: pi.client_secret!, paymentIntentId: pi.id }` | **does NOT return `authorizedAmount`** |

**Impact**: Frontend type declares `authorizedAmount` but the backend never sends it. Any frontend code accessing `.authorizedAmount` will get `undefined`. Currently `captureSplitBill` (manual capture flow) is not called anywhere in the frontend components, so this is latent.

**Fix**: Backend should return `authorizedAmount: holdAmount` (the 125% hold amount) in `createManualCaptureIntent`.

---

### 2. `captureSplitBill` -- missing `sessionFullyPaid`

| Side | Field | Status |
|------|-------|--------|
| Frontend `api.ts:477` | `{ splitBill: SplitBill; sessionFullyPaid: boolean }` | expects `sessionFullyPaid` |
| Backend `split-bill-payment.service.ts:116` | `{ splitBill: splitBillStore.getById(splitBillId)! }` | **does NOT return `sessionFullyPaid`** |

**Impact**: Frontend type expects `sessionFullyPaid` but backend only returns `{ splitBill }`. Any code checking `.sessionFullyPaid` will get `undefined`. Currently not called in any component, so this is latent.

**Fix**: Backend `captureSplitBillPayment` should calculate and include `sessionFullyPaid: boolean`.

---

### 3. `deleteRole` -- response type mismatch (minor)

| Side | Field | Status |
|------|-------|--------|
| Frontend `api.ts:499` | `fetchJSON<void>` | expects no body |
| Backend `role.routes.ts:38` | `res.json(result)` where `result = { success: true }` | returns `{ success: true }` |

**Impact**: None -- frontend types it as `void` and ignores the response. The actual HTTP response has a body the frontend discards. Not harmful, but the type annotation is inaccurate.

---

## Consistent Routes

### Auth
- `POST /auth/login` -- Backend returns `LoginResponse` (`{ token, user }`), frontend expects `LoginResponse`. **Consistent.**
- `GET /auth/me` -- Backend returns `{ user: req.user }`, frontend does not call this endpoint from `api.ts`. **N/A.**

### Store
- `GET /stores/:storeId` -- Backend returns `Store` (full for admin, stripped for public). Frontend expects `Store`. **Consistent** (stripped fields are optional on the type).
- `PUT /stores/:storeId` -- Backend returns `Store`. Frontend expects `Store`. **Consistent.**

### Menu
- `GET /menu` -- Backend returns `MenuResponse`. Frontend expects `MenuResponse`. **Consistent.**
- `GET /menu/items` -- Backend returns `MenuItem[]`. Frontend expects `MenuItem[]`. **Consistent.**
- `POST /menu/items` -- Backend returns `MenuItem`. Frontend expects `MenuItem`. **Consistent.**
- `PUT /menu/items/:itemId` -- Backend returns `MenuItem`. Frontend expects `MenuItem`. **Consistent.**
- `DELETE /menu/items/:itemId` -- Backend returns 204 no content. Frontend expects `void`. **Consistent.**
- `POST /menu/items/batch` -- Backend returns `{ created: MenuItem[]; skipped: { row, reason }[] }`. Frontend expects same. **Consistent.**

### Categories
- `GET /menu/categories` -- Backend returns `Category[]`. Frontend expects `Category[]`. **Consistent.**
- `POST /menu/categories` -- Backend returns `Category`. Frontend expects `Category`. **Consistent.**
- `PUT /menu/categories/:catId` -- Backend returns `Category`. Frontend expects `Category`. **Consistent.**
- `DELETE /menu/categories/:catId` -- Backend returns 204. Frontend expects `void`. **Consistent.**

### Orders
- `POST /orders` -- Backend returns `Order`. Frontend expects `Order`. **Consistent.**
- `GET /orders` -- Backend returns `Order[]`. Frontend expects `Order[]`. **Consistent.**
- `PATCH /orders/:orderId/status` -- Backend returns `Order`. Frontend expects `Order`. **Consistent.**
- `POST /orders/:orderId/transfer` -- Backend returns `Order`. Frontend expects `Order`. **Consistent.**
- `PUT /orders/:orderId/items` -- Backend returns `Order`. Frontend expects `Order`. **Consistent.**
- `DELETE /orders/:orderId` -- Backend returns `{ success: true }`. Frontend expects `{ success: boolean }`. **Consistent** (`true` satisfies `boolean`).
- `PATCH /orders/:orderId/items/:itemIndex/void` -- Backend returns `Order`. Frontend expects `Order`. **Consistent.**

### Tables
- `GET /tables` -- Backend returns `Table[]`. Frontend expects `Table[]`. **Consistent.**
- `GET /tables/:tableId` -- Backend returns public table (stripped `Table` with `paymentMode`). Frontend expects `Table`. **Consistent** (extra field `paymentMode` is safe, stripped fields are optional).
- `POST /tables/enable` -- Backend returns `Table`. Frontend expects `Table`. **Consistent.**
- `PUT /tables/:tableId` -- Backend returns `Table`. Frontend expects `Table`. **Consistent.**
- `POST /tables/:tableId/disable` -- Backend returns `Table`. Frontend expects `Table`. **Consistent.**
- `POST /tables/:tableId/regenerate-qr` -- Backend returns `Table`. Frontend expects `Table`. **Consistent.**
- `POST /tables/:tableId/close` -- Backend returns `{ closed: number }`. Frontend expects `{ closed: number }`. **Consistent.**
- `GET /tables/next-number` -- Backend returns `{ number, allFull }`. Frontend expects `{ number: number; allFull: boolean }`. **Consistent.**

### Payment / Checkout
- `POST /checkout` (pay-first) -- Backend returns `{ clientSecret, amount }`. Frontend expects `{ clientSecret: string; amount: number }`. **Consistent.**
- `POST /checkout` (pay-later session) -- Backend returns `{ clientSecret, amount }`. Frontend expects `{ clientSecret: string; amount: number }`. **Consistent.**

### Sessions
- `POST /sessions` -- Backend returns `Session`. Frontend expects `Session`. **Consistent.**
- `GET /sessions?tableId=` -- Backend returns `SessionSummary | null`. Frontend expects `SessionSummary | null`. **Consistent.**
- `GET /sessions/:sessionId/summary` -- Backend returns `SessionSummary`. Frontend expects `SessionSummary`. **Consistent.**
- `GET /sessions/:sessionId/cart` -- Backend returns `{ items, cartVersion, lastCartSubmitAt }`. Frontend expects same. **Consistent.**
- `PUT /sessions/:sessionId/cart` -- Backend returns `{ ok: true }`. Frontend expects `{ ok: boolean }`. **Consistent.**
- `POST /sessions/:sessionId/submit-cart` -- Backend returns `{ order?, items?, paymentMode, tableId? }`. Frontend expects same shape. **Consistent.**
- `PATCH /sessions/:sessionId/start-settlement` -- Backend returns `Session`. Frontend expects `Session`. **Consistent.**
- `POST /sessions/:sessionId/apply-coupon` -- Backend returns `Session`. Frontend expects `Session`. **Consistent.**
- `DELETE /sessions/:sessionId/coupon` -- Backend returns `Session`. Frontend expects `Session`. **Consistent.**

### Settlement Gateway Endpoints (wrapped by `settlementFetch`)
- `POST /sessions/:sessionId/pay-items` -- Gateway returns `{ ok, data: { amount, tax, serviceFee }, sessionStatus, remaining, allowedActions }`. Frontend unwraps to `{ amount, tax, serviceFee, allowedActions, remaining, sessionStatus }`. **Consistent.**
- `POST /sessions/:sessionId/pay-percent` -- Same gateway pattern. **Consistent.**
- `POST /sessions/:sessionId/cash-payment` -- Gateway data: `{ payment, change }`. Frontend expects `{ payment: Payment; change: number }`. **Consistent.**
- `POST /sessions/:sessionId/payments` -- Gateway data: `{ payment }`. Frontend expects `{ payment: Payment }`. **Consistent.**
- `PATCH /sessions/:sessionId/close` -- Gateway data: `{}`. Frontend expects `{}`. **Consistent.**
- `PATCH /sessions/:sessionId/reopen` -- Gateway data: `{}`. Frontend expects `{}`. **Consistent.**

### Split Bills
- `GET /sessions/:sessionId/split-bills` -- Backend returns `{ splits: SplitBill[], mainBill: { subtotal, tax, serviceFee, total, itemCount } }`. Frontend expects same. **Consistent.**
- `POST /sessions/:sessionId/split-bills` -- Gateway data: `{ splitBill: SplitBill }`. Frontend expects `{ splitBill: SplitBill }`. **Consistent.**
- `DELETE /sessions/:sessionId/split-bills/:splitBillId` -- Gateway data: `{}`. Frontend expects `{}`. **Consistent.**
- `POST /:splitBillId/pay-card` (non-manual) -- Gateway data: `{ splitBill: SplitBill }`. Frontend expects `{ splitBill: SplitBill }`. **Consistent.**
- `POST /:splitBillId/pay-cash` -- Gateway data: `{ splitBill, change }`. Frontend expects `{ splitBill: SplitBill; change: number }`. **Consistent.**

### Analytics
- `GET /analytics` -- Backend returns `AnalyticsResponse`. Frontend expects `AnalyticsResponse`. **Consistent.**

### Coupons
- `GET /coupons` -- Backend returns `Coupon[]`. Frontend expects `Coupon[]`. **Consistent.**
- `POST /coupons` -- Backend returns `Coupon`. Frontend expects `Coupon`. **Consistent.**
- `PUT /coupons/:couponId` -- Backend returns `Coupon`. Frontend expects `Coupon`. **Consistent.**
- `DELETE /coupons/:couponId` -- Backend returns 204. Frontend expects `void`. **Consistent.**

### Waitlist
- `GET /waitlist` -- Backend returns `WaitlistEntry[]`. Frontend expects `WaitlistEntry[]`. **Consistent.**
- `POST /waitlist` -- Backend returns `WaitlistEntry`. Frontend expects `WaitlistEntry`. **Consistent.**
- `POST /waitlist/:entryId/seat` -- Backend returns `WaitlistEntry`. Frontend expects `WaitlistEntry`. **Consistent.**
- `DELETE /waitlist/:entryId` -- Backend returns 204. Frontend expects `void`. **Consistent.**

### Staff
- `GET /staff` -- Backend returns `AuthUser[]`. Frontend expects `AuthUser[]`. **Consistent.**
- `POST /staff` -- Backend returns `AuthUser`. Frontend expects `AuthUser`. **Consistent.**
- `PATCH /staff/:userId` -- Backend returns `AuthUser`. Frontend expects `AuthUser`. **Consistent.**
- `DELETE /staff/:userId` -- Backend returns 204. Frontend expects `void`. **Consistent.**

### Clock
- `POST /clock/pin` -- Backend returns `{ user: { id, username }, clockedIn, currentEntry? }`. Frontend expects same. **Consistent.**
- `POST /clock/in` -- Backend returns `TimeEntry`. Frontend expects `TimeEntry`. **Consistent.**
- `POST /clock/out` -- Backend returns `TimeEntry`. Frontend expects `TimeEntry`. **Consistent.**
- `GET /clock/entries` -- Backend returns `TimeEntry[]`. Frontend expects `TimeEntry[]`. **Consistent.**

### Roles
- `GET /roles` -- Backend returns `RoleDefinition[]`. Frontend expects `RoleDefinition[]`. **Consistent.**
- `POST /roles` -- Backend returns `RoleDefinition`. Frontend expects `RoleDefinition`. **Consistent.**
- `PUT /roles/:roleId` -- Backend returns `RoleDefinition`. Frontend expects `RoleDefinition`. **Consistent.**
- `DELETE /roles/:roleId` -- See mismatch #3 above.

### Printer
- `POST /printer/print/:orderId` -- Backend returns `{ success: boolean }`. Frontend expects `{ success: boolean }`. **Consistent.**

### Upload
- `POST /upload` -- Backend returns `{ url: string }`. Frontend extracts `data.url`. **Consistent.**

### Webhook
- `POST /webhook/stripe` -- Not called from frontend. **N/A.**

---

## Backend Endpoints Not Used by Frontend

| Endpoint | Backend Route | Notes |
|----------|---------------|-------|
| `POST /tables/:tableId/settle` | `table.routes.ts` | No `api.settleTable` in frontend |
| `PATCH /waitlist/:entryId` | `waitlist.routes.ts` | No `api.updateWaitlistEntry` in frontend |
| `GET /printer/config` | `printer.routes.ts` | No `api.getPrinterConfig` in frontend |
| `PUT /printer/config` | `printer.routes.ts` | No `api.updatePrinterConfig` in frontend |
| `GET /auth/me` | `auth.routes.ts` | Not called from `api.ts` |
| `POST /:splitBillId/capture` | `split-bill.routes.ts` | Defined in `api.ts` as `captureSplitBill` but never called from components |

---

## Naming Convention Check

All field names across both backend and frontend use **camelCase** consistently. No snake_case / camelCase mismatches found. This is because both sides share types from `shared/types.ts`.

---

## Summary

| Category | Count |
|----------|-------|
| Total API endpoints audited | 52 |
| Consistent | 49 |
| Mismatch (missing field) | 2 (both latent, unused code paths) |
| Minor type annotation inconsistency | 1 (`deleteRole` void vs `{ success }`) |
| camelCase/snake_case issues | 0 |
| Backend-only (no frontend caller) | 6 |

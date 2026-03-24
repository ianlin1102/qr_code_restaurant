# Type Chain Audit — 2026-03-24

Source of truth: `shared/types.ts`

Layers checked: **Types** (shared/types.ts) -> **API** (server controllers + routes) -> **Frontend** (api.ts + pages + components)

---

## 1. Sensitive Field Leaks

### 1.1 CRITICAL: `GET /stores/:storeId` returns full Store object (public endpoint)

- **Route**: `store.routes.ts` line 9 — `res.json(store)` with no field stripping
- **Service**: `store.service.ts` returns the raw `Store` from JSON store
- **Leak**: `createdAt`, `updatedAt`, `autoAcceptOrders` are returned to unauthenticated customers
  - `autoAcceptOrders` is an internal business config; exposing it tells customers whether orders auto-accept
  - Contrast with the menu endpoint (`getMenu`) which explicitly uses `Pick<Store, ...>` to limit fields

### 1.2 CRITICAL: `GET /stores/:storeId/tables/:tableId` returns full Table object (public endpoint)

- **Route**: `table.routes.ts` line 14 — `res.json(table)` with no field stripping
- **Leak**: Internal fields exposed to unauthenticated customers:
  - `currentOrderId` — leaks active order ID
  - `x`, `y`, `width`, `height`, `shape` — internal floor plan layout data
  - `zone`, `capacity` — minor, but unnecessary for customer scan flow
- Customer scan only needs `id`, `storeId`, `name`, `nameEn`, `status`

### 1.3 OK: Order `paymentIntentId` correctly stripped

- `order.routes.ts` line 8 — `stripSensitive()` removes `paymentIntentId` from all order responses
- Applied to: POST (create), GET (list), PATCH (status), POST (transfer), PUT (items)

### 1.4 OK: `StoreUser.passwordHash` / staff `password` never exposed

- `auth.controller.ts` returns only `{ id, username, role, storeId }` via `LoginResponse`
- `staff.service.ts` uses `toAuthUser()` to strip password before returning
- `auth.repository.ts` uses Prisma which returns the full record, but `auth.controller.ts` only accesses `.password` for comparison, never forwards it

---

## 2. Type Mismatches & Missing Fields

### 2.1 HIGH: `StoreUser` type vs Prisma schema field name mismatch

- **shared/types.ts** defines `StoreUser.passwordHash: string`
- **Prisma schema** defines the field as `password: string`
- **auth.controller.ts** accesses `user.password` (Prisma model field name)
- **Impact**: The `StoreUser` type in `shared/types.ts` is not actually used anywhere in the codebase; `auth.controller.ts` imports `JwtPayload` and `LoginResponse` instead. The `StoreUser` interface is effectively dead code, but its `passwordHash` field name is inconsistent with the actual data model field `password`.

### 2.2 HIGH: `StoreUser` type has `name: string` — Prisma model does not

- **shared/types.ts** line 27: `StoreUser` includes `name: string` (required)
- **Prisma model**: `StoreUser` has no `name` field
- **staff.service.ts** `StaffRecord` also has no `name` field
- This means the shared type is out of sync with both the Prisma schema and the JSON store record

### 2.3 HIGH: `Store` type has `nameEn`/`descriptionEn` — not handled in update path

- **shared/types.ts**: `Store` includes `nameEn?: string` and `descriptionEn?: string`
- **Prisma schema**: `Store` model has neither `nameEn` nor `descriptionEn`
- **`UpdateStoreRequest`** type does not include `nameEn` or `descriptionEn`
- **`store.service.ts`** `updateStore()` does not write `nameEn` or `descriptionEn`
- **`StoreSettingsPage.tsx`** has no UI for editing `nameEn` or `descriptionEn`
- **`MenuResponse.store`** Pick does not include `nameEn` or `descriptionEn`
- **Impact**: Even if a store has `nameEn`/`descriptionEn` in the JSON file, there is no way to set or update them, and they are not exposed to customers via the menu endpoint

### 2.4 MEDIUM: `MenuResponse.store` missing `nameEn`/`descriptionEn`

- **shared/types.ts** line 267: `MenuResponse.store` uses `Pick<Store, 'id' | 'name' | 'logo' | 'description' | 'openingHours' | 'announcement'>`
- **Missing from Pick**: `nameEn`, `descriptionEn`
- **Impact**: Customer-facing menu endpoint cannot display English store name/description even if the data exists. The `localized()` helper used on the frontend will never see these fields for the store object.

### 2.5 MEDIUM: `CheckoutForm` uses `choiceNameEn` but the inline type does not declare it

- **CheckoutPage.tsx** line 26: `CheckoutForm` props type declares `items` with `selectedOptions?: { choiceName: string }[]`
- **Line 71**: Template accesses `o.choiceNameEn` — this field is not in the inline type
- **Runtime**: Works because `cartItems` comes from Zustand which stores `SelectedOption` objects containing `choiceNameEn`, but TypeScript would flag this if strict checking were enabled on the inline type
- **Same pattern** throughout: MenuPage (line 293), OrderConfirmPage (line 109), CartPage (line 114) all access `choiceNameEn`/`optionNameEn` on `SelectedOption` which does have these fields in `shared/types.ts`, so those usages are correct

### 2.6 MEDIUM: `MenuItemDetailSheet` does not populate `optionNameEn`/`choiceNameEn` when adding to cart

- **MenuItemDetailSheet.tsx** line 62-64: `handleSelectChoice` creates `SelectedOption` with only `{ optionId, optionName, choiceId, choiceName, priceAdjust }` — omits `optionNameEn` and `choiceNameEn`
- **Impact**: Cart items added via this sheet will have `undefined` for English names. The server-side `order.service.ts` enriches these from menu item definitions (lines 57-67), so stored orders are fine. But the frontend **cart display** (before order creation) falls back to empty strings for English names.
- **Contrast**: `ItemCustomizeView.tsx` (line 22-32) correctly populates both `optionNameEn` and `choiceNameEn` from `opt.nameEn` / `choice.nameEn`

### 2.7 MEDIUM: `OrderEditDialog` does not populate `optionNameEn`/`choiceNameEn` when changing options

- **OrderEditDialog.tsx** line 108-114: `handleOption` creates `SelectedOption` with only `{ optionId, optionName, choiceId, choiceName, priceAdjust }` — omits English name fields
- **Impact**: When admin edits an order and changes option selections, the updated `OrderItem.selectedOptions` will lose `optionNameEn`/`choiceNameEn`. The server `updateOrderItems` does not re-enrich these from menu definitions (unlike `createOrder`), so the English names will be permanently lost for that order.

### 2.8 LOW: `StaffPerformance` type defined in `analytics.service.ts` — not in `shared/types.ts`

- **analytics.service.ts** line 5: `StaffPerformance` interface defined locally
- **API endpoint**: `getStaffPerformance()` is defined but **never exposed via any route** — `analytics.routes.ts` only calls `getAnalytics()`, not `getStaffPerformance()`
- **Frontend**: `AnalyticsPage.tsx` `StaffPerformanceSection` fetches staff via `api.getStaff()` (returns `AuthUser[]`), not via a staff performance endpoint
- **Impact**: Dead code. The `StaffPerformance` type and `getStaffPerformance()` function are unused.

### 2.9 LOW: `CheckoutRequest` / `CheckoutOrdersRequest` defined locally in `payment.service.ts`

- **payment.service.ts** lines 6-18: Two request interfaces defined locally, not in `shared/types.ts`
- **Impact**: Frontend `api.ts` line 166 uses an inline type for `createCheckout` that roughly mirrors `CheckoutRequest` but with `selectedOptions?: unknown[]` instead of the proper `SelectedOption[]` type. This loses type safety for option validation.

### 2.10 LOW: `Category.active` field gap

- **shared/types.ts**: `Category.active?: boolean`
- **menu.service.ts**: `getMenu()` filters `.filter(c => c.active !== false)` — inactive categories hidden from customers
- **menu.service.ts**: `getCategories()` (admin) returns all categories including inactive ones — correct
- **menu.service.ts**: `createCategory()` does not set `active` field — defaults to `undefined`, which `!== false` so treated as active — this is a correct implicit default but fragile

---

## 3. API Response vs Type Contract

### 3.1 `GET /orders` strips `paymentIntentId` but frontend type expects full `Order`

- **order.routes.ts**: `stripSensitive()` removes `paymentIntentId`
- **api.ts**: `getOrders` returns `Order[]` which includes `paymentIntentId?: string`
- **Impact**: Frontend code that accesses `order.paymentIntentId` will get `undefined` (which is the optional type), so no runtime error. But it's semantically misleading — the field will **always** be undefined in API responses, not just sometimes.

### 3.2 `GET /auth/me` returns `{ user: JwtPayload }` — not `AuthUser`

- **auth.routes.ts** line 23: `res.json({ user: req.user })` where `req.user` is `JwtPayload`
- **JwtPayload**: `{ userId, storeId, role }` — note field is `userId` not `id`
- **AuthUser**: `{ id, username, role, storeId }`
- **Impact**: If frontend ever calls `/auth/me`, it would receive `userId` instead of `id`, and no `username` field. Currently `/auth/me` is not called by the frontend (confirmed as a known issue), so no runtime impact.

### 3.3 Printer config fallback response doesn't match `PrinterConfig` type

- **printer.routes.ts** line 12: When no config exists, returns `{ enabled: false }` — not a `PrinterConfig` object
- **shared/types.ts**: `PrinterConfig` has required fields `id`, `storeId`, `name`, `type`, `enabled`
- **Frontend**: `api.ts` does not have a `getPrinterConfig` function; only `reprintOrder` is exposed
- **Impact**: If a frontend printer config page is added later, the fallback response will not match the expected type

---

## 4. Prisma Schema vs shared/types.ts Drift

| Entity | shared/types.ts | Prisma Schema | Gap |
|--------|----------------|---------------|-----|
| Store.nameEn | present (optional) | absent | Prisma schema missing |
| Store.descriptionEn | present (optional) | absent | Prisma schema missing |
| Store.autoAcceptOrders | present (optional) | absent | Prisma schema missing |
| StoreUser.passwordHash | `passwordHash` | `password` | Name mismatch |
| StoreUser.name | present (required) | absent | Prisma schema missing |
| Category | full definition | not in Prisma | Entire model missing |
| MenuItem | full definition | not in Prisma | Entire model missing |
| Table | full definition | not in Prisma | Entire model missing |
| Order | full definition | not in Prisma | Entire model missing |
| Coupon | full definition | not in Prisma | Entire model missing |
| WaitlistEntry | full definition | not in Prisma | Entire model missing |
| PrinterConfig | full definition | not in Prisma | Entire model missing |

**Note**: Menu/Category/Table/Order etc. being absent from Prisma is a known deferred item (MVP uses JSON files). The Store-related gaps are the actionable items.

---

## 5. Frontend Type Import Audit

All frontend files correctly import from `@qr-order/shared`:

| File | Imports Used | Correct |
|------|-------------|---------|
| api.ts | MenuResponse, CreateOrderRequest, Order, OrderStatus, OrderItem, MenuItem, Category, Table, Store, UpdateStoreRequest, LoginResponse, AnalyticsResponse, Coupon, WaitlistEntry, SplitBillRequest, SplitBillSession, AuthUser | Yes |
| auth-store.ts | AuthUser | Yes |
| cart-store.ts | CartItem | Yes |
| MenuPage.tsx | MenuResponse, MenuItem, Order | Yes |
| CheckoutPage.tsx | (none — uses inline types) | See 2.5 |
| OrderConfirmPage.tsx | Order | Yes |
| DashboardPage.tsx | Order, OrderStatus | Yes |
| OrderCard.tsx | Order, OrderItem, OrderStatus | Yes |
| OrderEditDialog.tsx | Order, OrderItem, MenuItem, MenuResponse | Yes |
| TableDetailPanel.tsx | Table, Order, OrderItem, OrderStatus | Yes |
| SplitBillDialog.tsx | Order, SplitBillSession, SplitBillShare | Yes |
| AnalyticsPage.tsx | AnalyticsResponse, AuthUser | Yes |
| StoreSettingsPage.tsx | Store | Yes |
| TablesPage.tsx | Table, Order, OrderItem | Yes |
| MenuItemDetailSheet.tsx | MenuItem, SelectedOption | Yes |
| ItemCustomizeView.tsx | MenuItem, SelectedOption | Yes |
| CartPage.tsx | (none — uses cart-store types) | OK |

No duplicate type definitions found in frontend code.

---

## 6. Summary: Priority Actions

### Must Fix (data integrity / security)

1. **Strip fields on `GET /stores/:storeId` public endpoint** — remove `createdAt`, `updatedAt`, `autoAcceptOrders` from unauthenticated response
2. **Strip fields on `GET /tables/:tableId` public endpoint** — remove `currentOrderId`, `x`, `y`, `width`, `height`, `shape` from customer-facing response
3. **Fix `OrderEditDialog` option update** — populate `optionNameEn`/`choiceNameEn` when admin changes options, OR make `updateOrderItems` server-side re-enrich English names from menu definitions (like `createOrder` does)

### Should Fix (type accuracy)

4. **Sync `StoreUser` type with Prisma model** — rename `passwordHash` -> `password`, remove `name` field (or add it to Prisma)
5. **Add `nameEn`/`descriptionEn` to `MenuResponse.store` Pick** — enables bilingual store name on customer menu
6. **Add `nameEn`/`descriptionEn` to `UpdateStoreRequest`** — enables admin to set English store name/description
7. **Fix `CheckoutPage` `CheckoutForm` inline type** — use `SelectedOption` from shared types instead of partial inline type
8. **Fix `MenuItemDetailSheet`** — populate `optionNameEn`/`choiceNameEn` when creating `SelectedOption` for cart
9. **Move `CheckoutRequest`/`CheckoutOrdersRequest` to `shared/types.ts`** — unify frontend/backend type contracts

### Cleanup (dead code / drift)

10. **Remove `StaffPerformance` type and `getStaffPerformance()` function** from `analytics.service.ts` (unused)
11. **Fix `/auth/me` response shape** — return `AuthUser` instead of `JwtPayload`, or mark endpoint as deprecated
12. **Fix printer config fallback** — return a proper `PrinterConfig` shape or define a `PrinterConfigResponse` union type
13. **Add `autoAcceptOrders`, `nameEn`, `descriptionEn` to Prisma `Store` model** — reduce schema drift before migration

---

> Audited by: Type Chain Check (automated)
> Date: 2026-03-24
> Files scanned: 45+ across shared/, server/src/, client/src/

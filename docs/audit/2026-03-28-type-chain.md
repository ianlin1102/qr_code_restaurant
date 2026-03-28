# Type Chain Audit -- 2026-03-28

Source of truth: `shared/types.ts`

Layers checked: **Types** (shared/types.ts) -> **Data** (server/data/*.json) -> **API** (server controllers + routes) -> **Frontend** (api.ts + pages + components)

---

## 1. Store

### Type Definition (shared/types.ts)

```
Store: id, name, nameEn?, logo?, description?, descriptionEn?, openingHours?, announcement?, announcementEn?, createdAt, autoAcceptOrders?, updatedAt?, maxTables?, paymentMode?
```

### Data Layer (stores.json)

Actual fields stored: `id, name, nameEn, description, descriptionEn, openingHours, createdAt, announcement, autoAcceptOrders, paymentMode`

- Missing from data (optional, OK): `logo`, `updatedAt`, `maxTables`, `announcementEn`
- Status: ALIGNED

### API Layer

| Endpoint | Fields Returned | Notes |
|----------|----------------|-------|
| `GET /stores/:storeId` (public) | All Store fields MINUS `autoAcceptOrders`, `createdAt`, `updatedAt` | Strips 3 fields via destructuring |
| `PUT /stores/:storeId` (admin) | Full Store object | Returns complete updated Store |
| `GET /menu` (public, MenuResponse.store) | `id, name, logo, description, openingHours, announcement, announcementEn` | Explicit Pick<> subset |

### Frontend Usage

| Page | Fields Used | Source |
|------|------------|--------|
| `StoreSettingsPage` | `name, description, openingHours, announcement, autoAcceptOrders, paymentMode, announcementEn` | `api.getStore()` |
| `MenuPage` | `store.id, store.name, store.description, store.announcement` | `api.getMenu()` -> MenuResponse.store |

### Issues Found

1. **BUG: `GET /stores/:storeId` strips `autoAcceptOrders` but admin settings page reads it**
   - `store.routes.ts` line 13: `const { autoAcceptOrders, createdAt, updatedAt, ...publicStore } = store`
   - `StoreSettingsPage.tsx` line 42: `setAutoAccept(data.autoAcceptOrders ?? false)` -- always receives `undefined`, defaults to `false`
   - Impact: Every time StoreSettingsPage loads fresh, `autoAcceptOrders` appears as OFF regardless of stored value. Only after saving does the PUT response return the correct value.
   - Fix: Either provide a separate admin-only GET endpoint, or only strip fields for unauthenticated requests.

2. **`GET /stores/:storeId` also strips `paymentMode` and `maxTables`? -- NO, these are NOT stripped**
   - The destructuring only strips `autoAcceptOrders`, `createdAt`, `updatedAt`. The rest pass through.
   - `paymentMode` IS returned in the public endpoint -- this is an info leak but low severity (customers could infer it anyway).

3. **`UpdateStoreRequest` missing `nameEn` and `descriptionEn`**
   - `shared/types.ts` line 19: `UpdateStoreRequest` does not include `nameEn` or `descriptionEn`
   - `store.service.ts` `updateStore()` does not write `nameEn` or `descriptionEn`
   - Frontend has no UI for editing English store name/description
   - Impact: Cannot update English store name through the API even though Store type supports it

4. **`MenuResponse.store` missing `nameEn` and `descriptionEn`**
   - The Pick<> in types.ts excludes `nameEn`/`descriptionEn`
   - Customer-facing menu page cannot display English store name even if data exists
   - The actual server code in `menu.service.ts` also doesn't include these fields in the response

5. **`api.getStore()` types return as `Store` but receives a subset**
   - `api.ts` line 41: `fetchJSON<Store>(...)` but the response is missing `autoAcceptOrders`, `createdAt`, `updatedAt`
   - TypeScript won't catch accesses to the missing fields since they're optional

---

## 2. StoreUser / Auth

### Type Definition

```
StoreUser: id, storeId, username, password, role, roleId?, createdAt
AuthUser: id, username, role, roleId?, permissions?, storeId
JwtPayload: userId, storeId, role, roleId?, permissions?
LoginResponse: token, user (AuthUser)
```

### Data Layer (staff.json)

Actual fields: `id, storeId, username, password, role, createdAt`

- Missing from data: `roleId` (optional, OK -- no staff has been assigned a roleId yet)
- Status: ALIGNED

### API Layer

| Endpoint | Fields Returned | Notes |
|----------|----------------|-------|
| `POST /auth/login` | `{ token, user: { id, username, role, roleId?, permissions, storeId } }` | Full LoginResponse/AuthUser |
| `GET /auth/me` | `{ user: JwtPayload }` where JwtPayload has `userId` not `id` | Field name mismatch vs AuthUser |
| `GET /staff` | `AuthUser[]` (id, username, role, roleId?, storeId) | `toAuthUser()` strips password, omits `permissions` |
| `POST /staff` | `AuthUser` | Same shape |
| `PATCH /staff/:userId` | `AuthUser` | Same shape |

### Frontend Usage

| Component | Fields Used | Source |
|-----------|------------|--------|
| `auth-store.ts` | `token, user.id, user.username, user.role, user.storeId, user.permissions` | `api.login()` |
| `usePermission.ts` | `user.permissions, user.role` | auth-store |
| `AdminLayout.tsx` | `user.permissions, user.storeId` | auth-store |
| `StaffManagePage.tsx` | `s.id, s.username, s.role` | `api.getStaff()` |

### Issues Found

1. **`StoreUser` type is dead code** -- never imported anywhere in the codebase. Has `password` field which would be a security concern if it were used in API responses, but it isn't.

2. **`GET /auth/me` returns `JwtPayload` shape (`userId`) vs `AuthUser` shape (`id`)** -- if frontend ever calls this endpoint, the field name mismatch would cause bugs. Currently dead endpoint (frontend never calls it).

3. **`GET /staff` response omits `permissions` field** -- `toAuthUser()` in staff.service.ts doesn't populate `permissions`. The `AuthUser` type declares `permissions?: Permission[]` but it's always `undefined` in staff list responses. Frontend doesn't rely on this (reads from roles list instead), so no runtime impact.

4. **`password` field correctly stripped** -- `toAuthUser()` in staff.service.ts and `login()` in auth.service.ts both ensure `password` is never exposed. SECURE.

---

## 3. Category

### Type Definition

```
Category: id, storeId, name, nameEn?, sortOrder, active?
```

### Data Layer (categories.json)

Actual fields: `id, storeId, name, nameEn, sortOrder`

- Missing from data: `active` (optional, defaults to treating `undefined` as active)
- Status: ALIGNED

### API Layer

| Endpoint | Fields Returned |
|----------|----------------|
| `GET /menu` (public) | Categories filtered by `active !== false`, full Category + items |
| `GET /menu/categories` (admin) | Full Category[] |
| `POST /menu/categories` (admin) | Full Category |
| `PUT /menu/categories/:catId` (admin) | Full Category |

### Frontend Usage

| Component | Fields Used |
|-----------|------------|
| `CategoryManagePage` | `id, name, nameEn, sortOrder, active` |
| `MenuPage` | `id, name, nameEn, items` (via MenuResponse) |
| `CsvImportDialog` | `id, name, nameEn` |
| `MenuItemTable` | `id, name, categoryId` (categorizes items) |

### Issues Found

1. **`createCategory()` does not set `active` field** -- new categories are created without `active`, which defaults to `undefined`. Since `active !== false` is used for filtering, this is functionally correct but fragile. An explicit `active: true` default would be safer.

---

## 4. MenuItem

### Type Definition

```
MenuItem: id, storeId, categoryId, name, nameEn?, description?, descriptionEn?, price, originalPrice?, image?, available, sortOrder, options? (MenuItemOption[])
MenuItemOption: id, name, nameEn?, required, choices (MenuItemOptionChoice[])
MenuItemOptionChoice: id, name, nameEn?, priceAdjust
```

### Data Layer (menu-items.json)

Actual fields: `id, storeId, categoryId, name, nameEn, description, descriptionEn, price, available, sortOrder, options, image`

- Missing from data: `originalPrice` (optional, OK)
- Status: ALIGNED

### API Layer

| Endpoint | Fields Returned |
|----------|----------------|
| `GET /menu` (public) | Available items with full fields (via MenuResponse) |
| `GET /menu/items` (admin) | Full MenuItem[] including unavailable |
| `POST /menu/items` (admin) | Full MenuItem |
| `PUT /menu/items/:itemId` (admin) | Full MenuItem |

### Frontend Usage

| Component | Fields Used |
|-----------|------------|
| `MenuPage` | `id, name, nameEn, description, descriptionEn, price, originalPrice, image, options` |
| `MenuItemForm` | All fields (create/edit form) |
| `MenuItemTable` | `id, name, nameEn, price, categoryId, available, sortOrder, image, originalPrice` |
| `ItemCustomizeView` | `id, name, nameEn, description, price, image, options` (incl. option.nameEn, choice.nameEn) |
| `MenuItemDetailSheet` | `id, name, price, image, description, options` |
| `OrderEditMode` | `id, name, nameEn, price` |
| `CsvImportDialog` | `name, nameEn, price, categoryId, description, descriptionEn` |

### Issues Found

None. MenuItem type chain is well-aligned across all three layers.

---

## 5. Table

### Type Definition

```
Table: id, storeId, name, nameEn?, number, enabled, status, currentOrderId?, currentBillId?, paymentMode?, zone?, capacity?, x?, y?, width?, height?, shape?
```

### Data Layer (tables.json)

Actual fields: `id, storeId, name, nameEn, number, enabled, status, currentBillId, currentOrderId, x, y, width, height`

- Missing from data: `zone, capacity, shape, paymentMode` (all optional, OK)
- Status: ALIGNED

### API Layer

| Endpoint | Fields Returned | Notes |
|----------|----------------|-------|
| `GET /tables` (admin) | Full Table[] (all fields) | Includes layout fields |
| `GET /tables/:tableId` (public) | Table MINUS `currentOrderId, currentBillId, x, y, width, height, shape` + resolved `paymentMode` | `getTablePublic()` strips internal fields |
| `POST /tables/enable` | Full Table | |
| `PUT /tables/:tableId` | Full Table | |
| `POST /tables/:tableId/disable` | Full Table | |
| `POST /tables/:tableId/regenerate-qr` | Full Table | |

### Frontend Usage

| Component | Fields Used | Source |
|-----------|------------|--------|
| `ScanPage` | `enabled, name` | `api.getTable()` (public) |
| `CartPage` | `paymentMode` | `api.getTable()` (public) |
| `TablesPage` | `id, name, nameEn, number, enabled, status, currentBillId, capacity` | `api.getTables()` (admin) |
| `FloorPlanEditorPage` | `id, name, nameEn, zone, shape, capacity, x, y, width, height` | `api.getTables()` (admin) |
| `FloorPlanPage` | `id, name, status, zone, capacity` | `api.getTables()` (admin) |
| `FloorTableShape` | `x, y, width, height, shape, name, status` | Admin context |
| `TableGrid` | `id, name, status, capacity` | Admin context |
| `TableDetailPanel` | `id, name, status, capacity, zone` | Admin context |
| `TransferTableDialog` | `id, name, status, zone` | Admin context |
| `qr-pdf.ts` | `id, name, storeId` | Admin context |

### Issues Found

1. **`api.getTable()` typed as `Table` but returns a different shape**
   - `api.ts` line 138: `fetchJSON<Table>(...)` for the public endpoint
   - The public endpoint (`getTablePublic`) returns a subset of Table (no `currentOrderId`, `currentBillId`, `x`, `y`, `width`, `height`, `shape`) plus an always-defined `paymentMode: string`
   - TypeScript won't catch this since the stripped fields are all optional
   - Ideally there should be a `TablePublic` type for the public endpoint response

2. **`storeId` exposed in public table response** -- `getTablePublic` doesn't strip `storeId`. Low severity since the URL already contains `storeId`, but unnecessary.

---

## 6. Order / OrderItem / SelectedOption

### Type Definition

```
Order: id, orderNumber, storeId, tableId, tableName, items (OrderItem[]), totalPrice, status, isPaid, paymentIntentId?, customerName?, createdAt, updatedAt
OrderItem: menuItemId, name, nameEn?, price, quantity, remark?, selectedOptions? (SelectedOption[])
SelectedOption: optionId, optionName, optionNameEn?, choiceId, choiceName, choiceNameEn?, priceAdjust
```

### Data Layer (orders.json)

Order actual fields: `id, orderNumber, storeId, tableId, tableName, items, totalPrice, status, isPaid, paymentIntentId, createdAt, updatedAt`

- Missing from data: `customerName` (optional, OK -- no orders have it yet)
- Status: ALIGNED

OrderItem actual fields: `menuItemId, name, nameEn, price, quantity, remark, selectedOptions`

SelectedOption actual fields: `optionId, optionName, optionNameEn, choiceId, choiceName, choiceNameEn, priceAdjust`

- Note: some orders have empty string `""` for `optionName` and `choiceName` (from compact Stripe metadata decoding) but the server enriches them from menu item definitions during `createOrder`.
- Status: ALIGNED (with caveat about empty strings)

### API Layer

| Endpoint | Fields Returned | Notes |
|----------|----------------|-------|
| `POST /orders` | Order minus `paymentIntentId` | `stripSensitive()` applied |
| `GET /orders` | Order[] minus `paymentIntentId` | `stripSensitive()` applied |
| `PATCH /orders/:orderId/status` | Order minus `paymentIntentId` | `stripSensitive()` applied |
| `POST /orders/:orderId/transfer` | Order minus `paymentIntentId` | `stripSensitive()` applied |
| `PUT /orders/:orderId/items` | Order minus `paymentIntentId` | `stripSensitive()` applied |

### Frontend Usage

| Component | Fields Used |
|-----------|------------|
| `DashboardPage` | `id, orderNumber, status, tableName, items, totalPrice, isPaid, createdAt, customerName` |
| `OrderCard` | `id, orderNumber, status, tableName, items, totalPrice, isPaid, createdAt, customerName` |
| `OrderDetailDialog` | `id, orderNumber, status, tableName, totalPrice, isPaid, createdAt, customerName, items[*]` |
| `OrderReceipt` | `orderNumber, tableName, customerName, items[*], totalPrice, createdAt` |
| `OrderHistoryPage` | `id, orderNumber, status, items, totalPrice, createdAt` |
| `OrderConfirmPage` | `id, orderNumber, status, isPaid, items, totalPrice, createdAt` |
| `MenuPage` (active orders) | `id, orderNumber, status, items` |
| `ActiveOrdersSidebar` | `id, orderNumber, status, tableName, items, totalPrice, createdAt` |
| `TableDetailPanel` | `id, orderNumber, status, items, totalPrice, customerName, createdAt` |
| `CloseTableDialog` | `id, orderNumber, status, items, totalPrice` |
| `OrderEditDialog` | `id, items, status` (plus menuItem lookup) |
| `OrderEditMode` | `items (menuItemId, name, nameEn, price, quantity, selectedOptions)` |

SelectedOption fields used on frontend:
- `optionName, optionNameEn, choiceName, choiceNameEn, priceAdjust` -- used for display
- `optionId, choiceId` -- used for editing

### Issues Found

1. **SECURE: `paymentIntentId` correctly stripped from ALL order responses** via `stripSensitive()`.

2. **`api.ts` types orders as `Order` but response is missing `paymentIntentId`**
   - `api.ts` line 54, 64: `fetchJSON<Order>(...)`, `fetchJSON<Order[]>(...)`
   - `paymentIntentId` is optional so TypeScript won't flag access, but the field is **always** undefined in responses
   - Cosmetic type inaccuracy, no runtime impact

3. **`MenuItemDetailSheet` omits `optionNameEn`/`choiceNameEn` in cart**
   - Line 63: creates `SelectedOption` with only `{ optionId, optionName, choiceId, choiceName, priceAdjust }`
   - Cart preview won't show English option names. Server enriches on order creation, so stored orders are fine.
   - Status: STILL UNFIXED from 2026-03-24 audit

4. **`OrderEditDialog` omits `optionNameEn`/`choiceNameEn` on edit**
   - Line 108-114: creates `SelectedOption` without English name fields
   - Server `updateOrderItems` re-enriches these (line 218-238 of order.service.ts), so stored data IS correct
   - But the **client-side preview** during editing is missing English names
   - Status: Partially mitigated (server re-enriches), cosmetic issue on client

5. **`createCheckout` in api.ts uses `unknown[]` for `selectedOptions`**
   - Line 179: `selectedOptions?: unknown[]` instead of `SelectedOption[]`
   - Loses type safety for option validation at the API boundary

---

## 7. Bill / Split

### Type Definition

```
Bill: id, storeId, tableId, version, status, splitMethod?, orderIds, subtotal, couponId?, couponCode?, couponDiscountType?, couponDiscountValue?, discountAmount, totalDue, paidAmount, createdAt, settledAt?
Split: id, billId, storeId, amount, percentage?, status, paidBy?, paymentIntentId?, itemIds?, customerName?, createdAt
```

### Data Layer (bills.json)

Actual fields: `id, storeId, tableId, version, status, orderIds, subtotal, discountAmount, totalDue, paidAmount, createdAt`

- Missing from data: `splitMethod, couponId, couponCode, couponDiscountType, couponDiscountValue, settledAt` (all optional, OK)
- Status: ALIGNED

splits.json: empty array (no splits created yet)

### API Layer

| Endpoint | Fields Returned | Notes |
|----------|----------------|-------|
| `GET /bills?tableId=` | `Bill & { splits: Split[] }` or `null` | Adds `splits` array not in Bill type |
| `GET /bills/:billId` | `Bill & { splits: Split[] }` | Same augmented shape |
| `POST /bills/:billId/splits` | `Split[]` | |
| `PATCH /bills/:billId/splits/:splitId` | `{ bill: Bill, split: Split }` | |
| `POST /bills/:billId/apply-coupon` | `Bill` | |
| `DELETE /bills/:billId/coupon` | `Bill` | |
| `POST /bills/:billId/settle` | `Bill` | |

### Frontend Usage

| Component | Fields Used |
|-----------|------------|
| `api.ts` | Correctly types as `Bill & { splits: Split[] }` for GET endpoints |
| `BillSettleDialog` | `bill.id, bill.status, bill.subtotal, bill.discountAmount, bill.totalDue, bill.paidAmount, bill.couponId, bill.couponCode, bill.splits` |
| `TablesPage` | `table.currentBillId` to open BillSettleDialog |

### Issues Found

1. **Bill GET responses augmented with `splits` field** -- not part of the `Bill` type in shared/types.ts. Frontend correctly handles this by typing as `Bill & { splits: Split[] }`, so no mismatch.

2. **`Split.paymentIntentId` potentially exposed** -- the `markSplitPaid` response includes the full Split with `paymentIntentId`. Unlike Order which strips this via `stripSensitive()`, Split responses don't strip it. Currently only accessible by authenticated admins, so LOW severity.

---

## 8. Coupon

### Type Definition

```
Coupon: id, storeId, code, discountType, discountValue, minOrderAmount?, maxUses?, currentUses, active, expiresAt?, createdAt
```

### Data Layer (coupons.json)

Actual fields: `id, storeId, code, discountType, discountValue, minOrderAmount, currentUses, active, expiresAt, createdAt`

- Missing from data: `maxUses` (optional, OK)
- Status: ALIGNED

### API Layer

All endpoints return full `Coupon` objects. Admin-only access (requireAuth + requirePermission).

### Frontend Usage

| Component | Fields Used |
|-----------|------------|
| `CouponManagePage` | All Coupon fields |
| `BillSettleDialog` | `code, active, discountType, discountValue` (for coupon lookup) |

### Issues Found

None. Coupon type chain is well-aligned.

---

## 9. AnalyticsResponse

### Type Definition

```
AnalyticsResponse: dailyStats (DailyStats[]), topItems (TopItem[]), totalOrders, totalRevenue, avgOrderValue
DailyStats: date, orderCount, revenue, avgOrderValue
TopItem: menuItemId, name, nameEn?, quantity, revenue
```

### API Layer

`getAnalytics()` in analytics.service.ts returns exactly `AnalyticsResponse` shape. Route returns it directly. ALIGNED.

### Frontend Usage

`AnalyticsPage` uses all fields from `AnalyticsResponse`.

### Issues Found

1. **`StaffPerformance` type and `getStaffPerformance()` function exist in analytics.service.ts but are never exposed via any route** -- dead code. The frontend fetches staff list via `api.getStaff()` instead. Status: STILL UNFIXED from 2026-03-24 audit.

---

## 10. WaitlistEntry

### Type Definition

```
WaitlistEntry: id, storeId, name, partySize, phone?, estimatedWait?, status, createdAt
```

### Data Layer (waitlist.json)

Empty array. Type fields would match based on `waitlist.service.ts` construction.

### API Layer

All endpoints return full `WaitlistEntry`. Note: `getWaitlist()` filters to `status === 'waiting'` only.

### Frontend Usage

`WaitlistPanel` uses: `id, name, partySize, phone, estimatedWait, status, createdAt`

### Issues Found

None. WaitlistEntry type chain is well-aligned.

---

## 11. RoleDefinition

### Type Definition

```
RoleDefinition: id, storeId, name, nameEn?, permissions (Permission[]), isSystem, createdAt
Permission: 'orders:read' | 'orders:write' | 'menu:read' | 'menu:write' | 'tables:read' | 'tables:write' | 'billing:read' | 'billing:write' | 'analytics:read' | 'staff:manage' | 'settings:read' | 'settings:write'
```

### Data Layer (roles.json)

Actual permissions stored: includes `coupons:read`, `coupons:write`, `floor-plan:write`, `bill:write`

**MISMATCH**: These 4 permission values are NOT in the `Permission` union type:
- `coupons:read` -- not a valid Permission
- `coupons:write` -- not a valid Permission
- `floor-plan:write` -- not a valid Permission
- `bill:write` -- not a valid Permission

The `Permission` type only has `billing:read | billing:write` (not `coupons:*` or `bill:*`), and `tables:write` (not `floor-plan:write`).

### API Layer

`role.service.ts` `ensureSystemRoles()` auto-migrates owner/manager/waiter roles to use `ALL_PERMISSIONS` (which is the 12 Permission values from the type). So on next startup, the stale permissions in roles.json would be overwritten.

However, the `requirePermission` middleware checks:
- `billing:read` for coupon GET
- `billing:write` for coupon POST/PUT/DELETE

### Frontend Usage

`StaffManagePage` displays and edits permissions from `RoleDefinition.permissions`. Uses the `Permission` type from shared/types.ts.

### Issues Found

1. **DATA DRIFT: roles.json contains invalid permission strings** -- `coupons:read`, `coupons:write`, `floor-plan:write`, `bill:write` are stored in data but not part of the `Permission` type. The `ensureSystemRoles()` function would overwrite system roles on next startup, but any custom roles with these values would persist as invalid.

2. **`requirePermission` middleware uses valid `Permission` values** -- the route files use `billing:read`/`billing:write` for coupon endpoints and `tables:write` for floor plan, which ARE valid Permission values. The data drift is in stored roles, not in the middleware enforcement.

---

## 12. PrinterConfig

### Type Definition

```
PrinterConfig: id, storeId, name, type ('usb' | 'network'), address?, enabled
```

### API Layer

| Endpoint | Fields Returned | Notes |
|----------|----------------|-------|
| `GET /printer/config` | PrinterConfig or `{ enabled: false }` | Fallback doesn't match type |
| `PUT /printer/config` | Full PrinterConfig | |
| `POST /printer/print/:orderId` | `{ success: boolean }` | |

### Frontend Usage

Only `api.reprintOrder()` is exposed in api.ts. No `getPrinterConfig` or `updatePrinterConfig` frontend methods.

### Issues Found

1. **Fallback response `{ enabled: false }` doesn't match `PrinterConfig` type** -- missing `id, storeId, name, type` required fields. Since frontend doesn't call this endpoint, no runtime impact. But if a printer settings UI is ever added, this would cause type errors.

---

## 13. Sensitive Field Analysis

### Confirmed SECURE (properly stripped/hidden)

| Entity | Sensitive Field | Protection |
|--------|----------------|------------|
| Order | `paymentIntentId` | Stripped by `stripSensitive()` in all route handlers |
| StoreUser/Staff | `password` | `toAuthUser()` strips it; `login()` only returns AuthUser shape |
| Store (public) | `autoAcceptOrders` | Stripped in GET handler (but causes admin bug -- see Store section) |
| Store (public) | `createdAt, updatedAt` | Stripped in GET handler |
| Table (public) | `currentOrderId, currentBillId, x, y, width, height, shape` | Stripped by `getTablePublic()` |

### Potential Concerns (LOW severity)

| Entity | Field | Exposure |
|--------|-------|----------|
| Table (public) | `storeId` | Returned in public endpoint; redundant since URL has storeId |
| Table (public) | `number, zone, capacity` | Returned in public endpoint; minor info leak of operational data |
| Store (public) | `paymentMode, maxTables` | NOT stripped; reveals business config to customers |
| Split | `paymentIntentId` | Returned in admin endpoints; admin-only access so acceptable |

---

## 14. Frontend Fields Used But Not Returned By API

No critical instances found. All frontend field accesses map to fields that are either:
- Returned by the API endpoint being called, OR
- Optional fields that gracefully handle `undefined` (with `??` or `?.`)

The one exception is `autoAcceptOrders` in `StoreSettingsPage` which is stripped by the public GET endpoint (documented in Store section above).

---

## 15. Summary: Priority Actions

### Critical (data integrity / functional bugs)

1. **Fix `GET /stores/:storeId` for admin use** -- `autoAcceptOrders` is stripped from public response but admin settings page needs it. Either:
   - Check auth and return full Store for authenticated requests, stripped for public
   - Create a separate admin GET endpoint
   - Only strip for unauthenticated callers

### High (type accuracy)

2. **Add `nameEn`/`descriptionEn` to `UpdateStoreRequest`** -- cannot update English store name/description
3. **Add `nameEn`/`descriptionEn` to `MenuResponse.store` Pick** -- customer menu can't show bilingual store name
4. **Fix `MenuItemDetailSheet` to include `optionNameEn`/`choiceNameEn`** -- cart preview missing English option names
5. **Clean up roles.json invalid permission values** -- data contains `coupons:read`, `coupons:write`, `floor-plan:write`, `bill:write` which aren't valid Permission strings

### Medium (type hygiene)

6. **Create `TablePublic` type** for the public table endpoint response shape
7. **Fix `api.ts` `createCheckout` to use `SelectedOption[]`** instead of `unknown[]`
8. **Remove `StoreUser` type** from shared/types.ts (dead code, never imported)
9. **Remove `StaffPerformance` and `getStaffPerformance()`** from analytics.service.ts (dead code)

### Low (defensive improvements)

10. **Fix `GET /auth/me` response** to return `AuthUser` shape (field `id` not `userId`), or deprecate endpoint
11. **Fix printer config fallback** to return proper `PrinterConfig` shape
12. **Strip `paymentMode`, `maxTables` from public Store response** -- unnecessary business config exposure
13. **Set explicit `active: true` default** in `createCategory()`

---

### Changes Since Last Audit (2026-03-24)

| Item | Status |
|------|--------|
| `GET /stores/:storeId` returns full Store (was CRITICAL) | PARTIALLY FIXED: now strips `autoAcceptOrders`, `createdAt`, `updatedAt` -- but causes admin settings bug |
| `GET /tables/:tableId` returns full Table (was CRITICAL) | FIXED: `getTablePublic()` now strips internal/layout fields |
| `StoreUser.passwordHash` field name mismatch | FIXED: type now uses `password` matching actual data |
| `StoreUser.name` extra field | FIXED: removed from type |
| `UpdateStoreRequest` missing `nameEn`/`descriptionEn` | STILL UNFIXED |
| `MenuResponse.store` missing `nameEn`/`descriptionEn` | STILL UNFIXED |
| `MenuItemDetailSheet` missing `optionNameEn`/`choiceNameEn` | STILL UNFIXED |
| `OrderEditDialog` missing `optionNameEn`/`choiceNameEn` | MITIGATED: server now re-enriches on updateOrderItems |
| `StaffPerformance` dead code | STILL UNFIXED |
| `/auth/me` response shape mismatch | STILL UNFIXED (endpoint still unused) |
| Printer config fallback | STILL UNFIXED |
| New: roles.json data drift | NEW FINDING |
| New: Store GET strips autoAcceptOrders causing admin bug | NEW FINDING (regression from fix) |
| New: Bill/Split type chain | NEW (first audit of Bill/Split entities) |
| New: RoleDefinition/Permission type chain | NEW (first audit of Role entities) |

---

> Audited by: Type Chain Check (automated)
> Date: 2026-03-28
> Files scanned: 55+ across shared/, server/src/, server/data/, client/src/

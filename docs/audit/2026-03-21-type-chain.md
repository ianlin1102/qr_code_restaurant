# Type Chain Audit Report — 2026-03-21

Auditor: Automated type-chain checker
Scope: `shared/types.ts` (source of truth) -> Server controllers/routes (API layer) -> Client pages/components (frontend)

---

## 1. Store

### types.ts definition
```
Store {
  id, name, nameEn?, logo?, description?, descriptionEn?,
  openingHours?, announcement?, createdAt, autoAcceptOrders?, updatedAt?
}
```

### JSON data (stores.json)
| Field | Present | Notes |
|-------|---------|-------|
| id | YES | |
| name | YES | |
| nameEn | YES | |
| description | YES | |
| descriptionEn | YES | |
| openingHours | YES | |
| announcement | NO | not in seed data |
| createdAt | YES | |
| autoAcceptOrders | NO | not in seed data |
| logo | NO | not in seed data |
| updatedAt | NO | not in seed data |

### API layer
| Endpoint | Fields returned | Issues |
|----------|----------------|--------|
| `GET /stores/:storeId` (store.routes) | Full Store object via `getStore()` | NONE - returns full entity from JSON |
| `PUT /stores/:storeId` (store.routes) | Updated Store | **ISSUE S-1**: `updateStore()` ignores `nameEn`, `descriptionEn`, `logo`, `autoAcceptOrders` fields -- only updates `name`, `description`, `openingHours`, `announcement` |
| `GET /menu` (menu.routes) | `MenuResponse.store` = `Pick<Store, 'id' | 'name' | 'logo' | 'description' | 'openingHours' | 'announcement'>` | **ISSUE S-2**: `nameEn` and `descriptionEn` stripped from `MenuResponse.store`, customer frontend cannot display bilingual store info |

### Frontend usage
| File | Fields used | Notes |
|------|------------|-------|
| MenuPage.tsx | `store.name`, `store.description`, `store.announcement` | Uses `menu.store` (MenuResponse) -- never reads `nameEn` or `descriptionEn`. No i18n fallback for store name/description. |
| StoreSettingsPage.tsx | `autoAcceptOrders`, `name`, `description`, `openingHours`, `announcement` | Reads `autoAcceptOrders` correctly |
| CheckoutPage.tsx | (none directly, uses `sessionStore.tableName`) | |

### Issues
- **S-1 (Medium)**: `store.service.ts:updateStore()` only applies `name`, `description`, `openingHours`, `announcement`. The `autoAcceptOrders` field is included in the `UpdateStoreRequest` type but NOT applied in the update logic. The `StoreSettingsPage` sends it, but the server silently drops it.
- **S-2 (Low)**: `MenuResponse.store` Pick type omits `nameEn` and `descriptionEn`. The customer MenuPage has no way to display bilingual store name/description.

---

## 2. StoreUser

### types.ts definition
```
StoreUser {
  id, storeId, username, passwordHash, role (Role), name, createdAt
}
```

### JSON data (staff.json)
| Field | Present | Notes |
|-------|---------|-------|
| id | YES | |
| storeId | YES | |
| username | YES | |
| password | YES | **ISSUE U-1**: Field is `password` in JSON, type says `passwordHash` |
| role | YES | |
| name | NO | **ISSUE U-2**: types.ts declares `name: string` (required) but JSON has no `name` field |
| createdAt | YES | |

### API layer
- `StoreUser` is NOT directly returned from any API endpoint. Authentication uses `auth.repository.ts` which queries via Prisma (not JSON store).
- Staff management uses a local `StaffRecord` interface in `staff.service.ts` with field `password: string` (matching the JSON), **not** `passwordHash`.
- The `toAuthUser()` function correctly strips the password before returning `AuthUser`.

### Issues
- **U-1 (High - Data/Type Mismatch)**: `StoreUser.passwordHash` in `shared/types.ts` does NOT match the actual JSON field name `password`. The `staff.service.ts` defines its own `StaffRecord` with `password: string` to work around this. The `auth.repository.ts` queries Prisma which also uses `password`. The `shared/types.ts` `StoreUser` is effectively unused and out of sync.
- **U-2 (Medium - Missing Field)**: `StoreUser.name` is required in `shared/types.ts` but no JSON record has a `name` field, and no code populates it. The field appears to be dead.
- **U-3 (Info)**: `StoreUser` from `shared/types.ts` is never imported anywhere -- neither server nor client references this interface. Only `AuthUser` and `JwtPayload` are used. `StoreUser` is orphaned.

---

## 3. Category

### types.ts definition
```
Category {
  id, storeId, name, nameEn?, sortOrder, active?
}
```

### JSON data (categories.json)
- All fields align. Some records have `active: true`, most omit it (treated as `undefined` / truthy via `c.active !== false` filter).

### API layer
| Endpoint | Returned | Issues |
|----------|----------|--------|
| `GET /menu` (customer) | Categories with `active !== false` filter | OK |
| `GET /menu/categories` (admin) | All categories (no active filter) | OK |
| `POST/PUT/DELETE` | Full Category object | OK |

### Frontend usage
- `MenuPage.tsx`: uses `cat.id`, `cat.name`, `cat.nameEn` via `localized()`. OK.
- `CategoryManagePage.tsx`: uses `nameEn`. OK.
- `MenuManagePage.tsx`: uses `c.name`, `c.id`. OK.

### Issues
- NONE. Category type chain is clean.

---

## 4. MenuItem

### types.ts definition
```
MenuItem {
  id, storeId, categoryId, name, nameEn?, description?, descriptionEn?,
  price, originalPrice?, image?, available, sortOrder, options?: MenuItemOption[]
}
```

### JSON data (menu-items.json)
| Field | Present | Notes |
|-------|---------|-------|
| All standard fields | YES | Align with types.ts |
| `_visible` | YES (1 record) | **ISSUE M-1**: Undeclared field `_visible: true` on item `e4428c20...` (Sliced Beef). Not in types.ts. |

### API layer
- `getMenu()`: returns only `available` items. `_visible` passes through silently (spread operator).
- `getAllMenuItems()`: returns all items including `_visible` field via pass-through.
- `createMenuItem()`: accepts full `Omit<MenuItem, 'id' | 'storeId'>`. OK.

### Frontend usage
- `MenuPage.tsx`: uses `id`, `name`, `nameEn`, `description`, `descriptionEn`, `price`, `originalPrice`, `image`, `available`, `options`. OK.
- `MenuItemDetailSheet.tsx`: uses `id`, `name`, `price`, `originalPrice`, `image`, `options`, `description`/`descriptionEn` via localized. OK.
- `MenuItemTable.tsx`: uses `nameEn`. OK.
- `MenuItemForm.tsx`: uses all MenuItem fields + `option.nameEn`, `choice.nameEn`. OK.

### Issues
- **M-1 (Low - Stale Data)**: One menu-item record has undeclared `_visible: true` field. This is not in `MenuItem` type and appears to be debug/legacy residue. It gets silently passed through in API responses.

---

## 5. Table

### types.ts definition
```
Table {
  id, storeId, name, nameEn?, qrCode?, status, currentOrderId?,
  zone?, capacity?, x?, y?, width?, height?, shape?
}
```

### JSON data (tables.json)
- All present fields align. Many optional fields (`zone`, `capacity`, `nameEn`) are present only on store-demo-002 tables.
- `qrCode`, `x`, `y`, `width`, `height`, `shape` not present in any JSON record (all optional, OK).
- `currentOrderId` not present in JSON (all idle, OK).

### API layer
| Endpoint | Returned | Issues |
|----------|----------|--------|
| `GET /tables` (admin) | Full Table[] | OK |
| `GET /tables/:tableId` (public) | Full Table including `storeId` validation | OK |
| `POST /tables` | New Table | OK |
| `PUT /tables/:tableId` | Updated Table | OK |

### Frontend usage
- `TablesPage.tsx`: uses `id`, `name`, `status`, `capacity`. OK.
- `FloorPlanPage.tsx`, `FloorPlanEditorPage.tsx`: uses `x`, `y`, `width`, `height`, `shape`, `zone`, `capacity`, `nameEn`. OK.
- `TableGrid.tsx`: uses `status`, `name`. OK.

### Issues
- NONE. Table type chain is clean.

---

## 6. Order / OrderItem

### types.ts definition
```
Order {
  id, orderNumber, storeId, tableId, tableName, items: OrderItem[],
  totalPrice, status (OrderStatus), isPaid, paymentIntentId?,
  customerName?, createdAt, updatedAt
}
OrderItem {
  menuItemId, name, nameEn?, price, quantity, remark?, selectedOptions?: SelectedOption[]
}
```

### JSON data (orders.json)
- All fields align. `nameEn` is present on all order items. `isPaid` is present.
- `paymentIntentId` is absent from seed data (correct -- seed orders simulate pre-Stripe).
- Some orders lack `customerName` (correct -- optional field).

### API layer
| Endpoint | Returned | Issues |
|----------|----------|--------|
| `POST /orders` (create) | Full Order | **ISSUE O-1**: Returns full Order including `paymentIntentId` to public endpoint |
| `GET /orders` | Order[] with `paymentIntentId` stripped via `stripSensitive()` | OK |
| `PATCH /orders/:orderId/status` | Order with `paymentIntentId` stripped | OK |
| `POST /orders/:orderId/transfer` | Order with `paymentIntentId` stripped | OK |
| `PUT /orders/:orderId/items` | Order with `paymentIntentId` stripped | OK |

### Frontend usage
- `DashboardPage.tsx`: uses `id`, `orderNumber`, `status`, `isPaid`, `items`, `totalPrice`, `tableName`, `customerName`, `createdAt`. OK.
- `OrderCard.tsx`: uses `orderNumber`, `status`, `isPaid`, `tableName`, `customerName`, `createdAt`, `items[].name`, `items[].quantity`, `items[].selectedOptions`, `items[].remark`, `items[].price`, `totalPrice`. OK.
- `OrderConfirmPage.tsx`: uses `items[].name`, `items[].quantity`, `items[].price`, `items[].remark`, `totalPrice`. OK. Does NOT use `nameEn` for item display in order confirm.
- `OrderDetailDialog.tsx`: uses `updatedAt`, `createdAt`. OK.
- `OrderEditDialog.tsx`: uses `items`, `orderNumber`, `tableName`, `id`. OK.

### Issues
- **O-1 (Medium - Info Leak)**: `POST /orders` (public customer endpoint) returns the full Order object including `paymentIntentId`. The `stripSensitive()` function is applied to GET/PATCH/PUT responses but NOT to the POST create response. In practice, the direct POST path is rarely used (webhook creates paid orders), but this is inconsistent.

---

## 7. SelectedOption

### types.ts definition
```
SelectedOption {
  optionId, optionName, optionNameEn?, choiceId, choiceName, choiceNameEn?, priceAdjust
}
```

### Frontend population (MenuItemDetailSheet.tsx)
```ts
handleSelectChoice(option.id, option.name, choice.id, choice.name, choice.priceAdjust)
// Sets: { optionId, optionName, choiceId, choiceName, priceAdjust }
```

### Issues
- **SO-1 (Medium - Missing En Fields)**: `optionNameEn` and `choiceNameEn` are defined in `SelectedOption` but NEVER populated anywhere. `MenuItemDetailSheet.tsx` only passes `option.name` and `choice.name` (Chinese). The `OrderEditDialog.tsx` similarly only sets `optionName: option.name` and `choiceName: choice.name` without En counterparts. This means:
  - Order records permanently store only Chinese option/choice names
  - When viewing orders in English, option names display in Chinese
  - The `optionNameEn` and `choiceNameEn` fields in `shared/types.ts` are dead code

---

## 8. CartItem

### types.ts definition
```
CartItem {
  menuItemId, name, price, quantity, remark?, selectedOptions?: SelectedOption[]
}
```

### Frontend usage (cart-store.ts)
- Extends with `cartKey` (frontend-only, not sent to server). OK.
- `addItem()` in `MenuItemDetailSheet`: populates `menuItemId`, `name`, `price`, `quantity`, `remark`, `selectedOptions`. OK.
- Sent to server via `createOrder` / `createCheckout`: only sends `menuItemId`, `quantity`, `remark`, `selectedOptions`. OK.

### Issues
- NONE. CartItem chain is clean.

---

## 9. Coupon

### types.ts definition
```
Coupon {
  id, storeId, code, discountType (DiscountType), discountValue,
  minOrderAmount?, maxUses?, currentUses, active, expiresAt?, createdAt
}
```

### JSON data (coupons.json)
- All fields align perfectly.

### API layer
- CRUD endpoints return full `Coupon` objects. `createCoupon()` auto-sets `currentUses: 0` and `createdAt`. OK.

### Frontend usage (CouponManagePage.tsx)
- Uses `id`, `code`, `discountType`, `discountValue`, `minOrderAmount`, `maxUses`, `currentUses`, `active`, `expiresAt`. OK.

### Issues
- NONE. Coupon type chain is clean.

---

## 10. WaitlistEntry

### types.ts definition
```
WaitlistEntry {
  id, storeId, name, partySize, phone?, estimatedWait?, status, createdAt
}
```

### JSON data (waitlist.json)
- All fields align.

### API layer
- `getWaitlist()` filters to `status === 'waiting'` only. Returns full WaitlistEntry[]. OK.
- Other endpoints return full WaitlistEntry or boolean. OK.

### Frontend usage (WaitlistPanel.tsx)
- Not read in detail for this audit but types imported correctly.

### Issues
- NONE. WaitlistEntry chain is clean.

---

## 11. AnalyticsResponse / DailyStats / TopItem

### types.ts definition
```
AnalyticsResponse { dailyStats, topItems, totalOrders, totalRevenue, avgOrderValue }
DailyStats { date, orderCount, revenue, avgOrderValue }
TopItem { menuItemId, name, nameEn?, quantity, revenue }
```

### API layer
- `getAnalytics()` builds exactly the `AnalyticsResponse` shape. OK.
- `buildTopItems()` includes `nameEn` from order items. OK.

### Frontend usage (AnalyticsPage.tsx)
- `DailyStats`: uses `date`, `orderCount`, `revenue`, `avgOrderValue`. OK.
- `TopItem`: uses `menuItemId`, `name`, `quantity`, `revenue`. Does NOT use `nameEn`.
- Summary: uses `totalOrders`, `totalRevenue`, `avgOrderValue`. OK.

### Issues
- **A-1 (Low)**: `TopItem.nameEn` is returned by the API but not displayed by `AnalyticsPage.tsx`. Analytics always shows Chinese names regardless of language setting. Not a data integrity issue but a UX gap.

---

## 12. SplitBill types

### types.ts definition
```
SplitBillShare { personName, items: [...], amount }
SplitBillRequest { orderId, mode, numberOfPeople?, shares? }
SplitBillSession { orderId, shares: (SplitBillShare & { clientSecret?, paid })[], totalAmount }
```

### API layer
- `createSplitBill()` returns `SplitBillSession` shape. OK.
- Stripe `clientSecret` is included per share. OK.

### Frontend usage (SplitBillDialog.tsx)
- Not read in detail for this audit but types imported correctly from `@qr-order/shared`.

### Issues
- NONE. SplitBill chain is clean.

---

## 13. PrinterConfig

### types.ts definition
```
PrinterConfig { id, storeId, name, type, address?, enabled }
```

### API layer
- `getPrinterConfig()` returns first match or `undefined`. Route returns `{ enabled: false }` if no config exists.
- **ISSUE P-1**: When no printer config exists, route returns `{ enabled: false }` which does NOT match the `PrinterConfig` type (missing `id`, `storeId`, `name`, `type`).

### Frontend usage
- Only `api.reprintOrder()` is used from the frontend. The printer config endpoints are not used by any frontend page currently.

### Issues
- **P-1 (Low)**: Fallback response `{ enabled: false }` does not conform to `PrinterConfig` type. Frontend doesn't consume this endpoint currently, so no runtime impact.

---

## 14. AuthUser / LoginResponse / JwtPayload

### types.ts definition
```
AuthUser { id, username, role, storeId }
LoginResponse { token, user: AuthUser }
JwtPayload { userId, storeId, role }
```

### API layer
- `login()` returns `LoginResponse` with `AuthUser` (no password). OK.
- `GET /auth/me` returns `{ user: req.user }` where `req.user` is `JwtPayload`. **ISSUE AU-1**: The shape returned is `{ user: JwtPayload }` not `{ user: AuthUser }`. `JwtPayload` has `userId` while `AuthUser` has `id`. Different field names for the same concept.
- Staff endpoints return `AuthUser` via `toAuthUser()`. Password is stripped. OK.

### Frontend usage
- `auth-store.ts`: stores `AuthUser`. OK.
- `LoginPage.tsx`: receives `LoginResponse`, calls `setAuth(data.token, data.user)`. OK.
- `StaffManagePage.tsx`: uses `AuthUser.id`, `AuthUser.username`, `AuthUser.role`. OK.
- `AnalyticsPage.tsx`: uses `AuthUser` for staff list display. OK.

### Issues
- **AU-1 (Medium - Unused Endpoint)**: `GET /auth/me` returns `JwtPayload` shape (field `userId`) but frontend expects `AuthUser` (field `id`). This endpoint is documented as "unused" in CLAUDE.md, but if ever consumed, the field name mismatch would cause bugs.

---

## 15. Sensitive Field Exposure Check

| Entity | Sensitive Field | Exposed? | Location |
|--------|----------------|----------|----------|
| StoreUser (Prisma) | `password` | NO | `auth.controller.ts` only reads it for bcrypt compare, returns `AuthUser` |
| StaffRecord (JSON) | `password` (bcrypt hash) | NO | `staff.service.ts:toAuthUser()` strips password before returning |
| Order | `paymentIntentId` | PARTIAL | Stripped from GET/PATCH/PUT responses via `stripSensitive()`. **NOT stripped from POST /orders response** (Issue O-1) |
| Store | (none sensitive) | N/A | |

---

## 16. Data Inconsistencies Between JSON and Types

| File | Issue | Severity |
|------|-------|----------|
| `staff.json` | Field `password` instead of `passwordHash` (types.ts `StoreUser`) | HIGH |
| `staff.json` | Missing required `name` field declared in `StoreUser` | MEDIUM |
| `menu-items.json` | Undeclared `_visible: true` on one record | LOW |
| `stores.json` | Missing `updatedAt` (required in update flow but not seed data) | LOW |

---

## Summary of Issues

### HIGH Severity
| ID | Description | Location |
|----|-------------|----------|
| U-1 | `StoreUser.passwordHash` in types.ts doesn't match actual field `password` in staff.json and all server code | `shared/types.ts` line 25, `staff.json`, `staff.service.ts` |

### MEDIUM Severity
| ID | Description | Location |
|----|-------------|----------|
| S-1 | `updateStore()` silently drops `autoAcceptOrders` field even though `UpdateStoreRequest` includes it and frontend sends it | `server/src/controllers/store.service.ts:17-24` |
| U-2 | `StoreUser.name` is required in types but never stored/used anywhere | `shared/types.ts` line 27 |
| U-3 | `StoreUser` interface is completely orphaned -- never imported by any file | `shared/types.ts` lines 21-29 |
| O-1 | `POST /orders` returns `paymentIntentId` to public endpoint (inconsistent with GET/PATCH/PUT which strip it) | `server/src/routes/order.routes.ts:17` |
| SO-1 | `SelectedOption.optionNameEn` and `choiceNameEn` are defined but never populated -- order items permanently store only Chinese option names | `shared/types.ts` lines 93-98, `client/src/components/MenuItemDetailSheet.tsx:63` |
| AU-1 | `GET /auth/me` returns `JwtPayload` (has `userId`) but frontend would expect `AuthUser` (has `id`) -- field name mismatch | `server/src/routes/auth.routes.ts:23` |

### LOW Severity
| ID | Description | Location |
|----|-------------|----------|
| S-2 | `MenuResponse.store` Pick type omits `nameEn`/`descriptionEn` -- no bilingual store name on customer menu | `shared/types.ts` line 267, `menu.service.ts:31-41` |
| M-1 | One menu item has undeclared `_visible` field (debug residue) | `server/data/menu-items.json` line 374 |
| A-1 | `TopItem.nameEn` returned by API but never displayed in AnalyticsPage (always shows Chinese) | `client/src/pages/admin/AnalyticsPage.tsx:153` |
| P-1 | Printer config fallback `{ enabled: false }` doesn't conform to `PrinterConfig` type | `server/src/routes/printer.routes.ts:12` |

---

## Recommended Fix Priority

### Immediate (data integrity / correctness)
1. **U-1**: Either rename `StoreUser.passwordHash` to `password` in types.ts, or rename all JSON/code references. Since `StoreUser` is orphaned (U-3), the simplest fix is to either delete it or align it with reality.
2. **S-1**: Add `autoAcceptOrders` to the update logic in `store.service.ts`. Currently the `StoreSettingsPage` appears to save this value but the server discards it.
3. **SO-1**: Populate `optionNameEn` and `choiceNameEn` in `MenuItemDetailSheet.tsx` and `OrderEditDialog.tsx` when creating SelectedOption objects.

### Next sprint
4. **O-1**: Apply `stripSensitive()` to `POST /orders` response, or better, ensure the public POST path (non-webhook) never exposes `paymentIntentId`.
5. **S-2**: Add `nameEn` and `descriptionEn` to `MenuResponse.store` Pick type.
6. **AU-1**: Fix `/auth/me` to return `AuthUser` shape instead of raw `JwtPayload`.
7. **M-1**: Remove `_visible` from the menu-items.json record.

### Cleanup (non-urgent)
8. **U-2/U-3**: Clean up the orphaned `StoreUser` interface -- either delete it or align it for future Prisma migration use.
9. **A-1**: Use `nameEn` in analytics page when language is English.
10. **P-1**: Return proper empty `PrinterConfig` or `null` instead of partial object.

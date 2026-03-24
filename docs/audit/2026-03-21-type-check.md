# Type Consistency Audit: Backend API Response vs Frontend Consumption

**Date**: 2026-03-21
**Scope**: All `res.json()` responses in `server/src/routes/` + `server/src/controllers/` vs all API calls and field access in `client/src/`

---

## Executive Summary

Overall, the project maintains **strong type consistency** between backend and frontend thanks to the shared type definitions in `shared/types.ts`. Both sides import the same interfaces (`Order`, `MenuItem`, `Category`, `Table`, `Store`, etc.) and the `api.ts` client is well-typed with generic `fetchJSON<T>()`.

However, several issues were found:

| Severity | Count | Description |
|----------|-------|-------------|
| **Critical** | 1 | Backend returns `{ user: JwtPayload }` at `/auth/me` but frontend expects `AuthUser` fields |
| **High** | 2 | Type mismatch between route-level `stripSensitive` and frontend type; `autoAcceptOrders` omitted in `updateStore` response |
| **Medium** | 4 | Unused backend fields; frontend accessing fields without server guarantee |
| **Low** | 5 | Minor inconsistencies in naming, unused endpoints, redundant strips |

---

## 1. Critical Issues

### 1.1 `/auth/me` returns `JwtPayload` but frontend expects `AuthUser`

**Backend** (`auth.routes.ts:23`):
```ts
res.json({ user: req.user })  // req.user is JwtPayload = { userId, storeId, role }
```

**Frontend** (`auth-store.ts`): Stores `AuthUser = { id, username, role, storeId }`.

**Problem**: `JwtPayload` has `userId` (not `id`) and lacks `username`. If the frontend ever calls `/auth/me` (currently unused), the response fields would not match the `AuthUser` shape. The `id` vs `userId` naming difference is a latent bug.

**Risk**: Currently low because `/auth/me` is never called from the frontend (noted in CLAUDE.md as known issue). But any future use will break.

**Recommendation**: Either align `JwtPayload` field names with `AuthUser`, or have the `/me` endpoint reconstruct a proper `AuthUser` object from the database.

---

## 2. High Severity Issues

### 2.1 `stripSensitive` removes `paymentIntentId` but frontend type still includes it

**Backend** (`order.routes.ts:8`):
```ts
function stripSensitive({ paymentIntentId, ...rest }: Order) { return rest }
```
This strips `paymentIntentId` from GET/PATCH/PUT responses for orders.

**Frontend** (`api.ts`): The return type is declared as `Order` (which includes `paymentIntentId?: string`).

**Problem**: The frontend type promises `paymentIntentId` exists on the response, but the backend actively strips it. The frontend never accesses `paymentIntentId` directly, so this causes no runtime error, but it is a type lie. Any future code that tries to access `order.paymentIntentId` would get `undefined` despite the type saying it could be a `string`.

**Recommendation**: Create a `PublicOrder = Omit<Order, 'paymentIntentId'>` type in `shared/types.ts` and use it as the return type in `api.ts` for order endpoints.

### 2.2 `updateStore` does not pass through `autoAcceptOrders`

**Backend** (`store.service.ts:17-23`):
```ts
const updated = storeStore.update(storeId, {
  name,
  description: data.description ?? store.description,
  openingHours: data.openingHours ?? store.openingHours,
  announcement: data.announcement ?? store.announcement,
})
```

**Frontend** (`StoreSettingsPage.tsx:57-62`):
```ts
const updated = await api.updateStore(STORE_ID, {
  name: name.trim(),
  ...
  autoAcceptOrders: autoAccept,
})
```

**Problem**: The frontend sends `autoAcceptOrders` in the request body, but the backend `updateStore()` function does not include `autoAcceptOrders` in the fields it passes to `storeStore.update()`. The field is silently dropped. The `UpdateStoreRequest` type in `shared/types.ts` does include `autoAcceptOrders` as optional, so TypeScript does not catch this.

**Impact**: The "auto accept orders" toggle in Store Settings page appears to save but does not actually persist.

---

## 3. Medium Severity Issues

### 3.1 `GET /auth/me` response shape differs from `POST /login` response shape

**Login** returns: `{ token, user: { id, username, role, storeId } }` (flat `LoginResponse`)
**`/me`** returns: `{ user: { userId, storeId, role } }` (wrapped `JwtPayload`, no `token`)

The frontend uses `data.token` and `data.user` from login. If it ever calls `/me` expecting the same shape, it will fail. The inconsistent wrapping (`/me` wraps in `{ user }` while login returns `LoginResponse` which also has `{ token, user }`) could confuse developers.

### 3.2 `createOrder` response includes `paymentIntentId` field but POST route does not strip it

**Backend** (`order.routes.ts:17`):
```ts
res.status(201).json(result)  // No stripSensitive here!
```

But GET, PATCH, and PUT routes all use `stripSensitive()`. This is inconsistent -- the POST route for order creation leaks `paymentIntentId` (though it is typically `undefined` at creation time since it is set later by the webhook).

### 3.3 Frontend accesses `order.status === 'paid'` but `createOrder` never sets this status

**Backend** (`order.service.ts:79`): Initial status is either `'pending'` or `'preparing'`. The `'paid'` status is set separately through `updateOrderStatus`. However, the webhook sets `isPaid: true` but keeps `status: 'pending'`.

**Frontend**: Multiple components check `order.status === 'paid'` (`OrderConfirmPage.tsx:32`, `ActiveOrdersSidebar.tsx:15`, etc.) but this status is never actually set by `createOrder` or the webhook flow. The `'paid'` value in `OrderStatus` type exists but the current flow never transitions to it through the documented paths.

**Impact**: The "paid" status group in `ActiveOrdersSidebar` will never show any orders in the current payment flow.

### 3.4 `MenuResponse.store` subset vs full `Store` type

**Backend** (`menu.service.ts:32-41`):
```ts
return {
  store: { id, name, logo, description, openingHours, announcement },
  categories: categoriesWithItems,
}
```

**Frontend** (`MenuPage.tsx:126`): Accesses `menu.store.name`, `menu.store.description`, `menu.store.announcement` -- all present.

**Status**: Correctly typed! `MenuResponse.store` is `Pick<Store, 'id' | 'name' | 'logo' | 'description' | 'openingHours' | 'announcement'>`. This is well-aligned. No issue here -- included for completeness since the subset typing is done correctly.

---

## 4. Low Severity Issues

### 4.1 Unused backend response fields (returned but never consumed by frontend)

| Endpoint | Field | Backend Returns | Frontend Uses |
|----------|-------|----------------|---------------|
| `POST /tables/:tableId/settle` | `settled` | `{ settled: number }` | `result.settled` not displayed (only used as acknowledgment) -- actually used in `api.ts` type `{ settled: number }`, OK |
| `POST /printer/print/:orderId` | `success` | `{ success: boolean }` | Used in `api.ts` type `{ success: boolean }` but `OrderCard.tsx` ignores the value, only catches errors |
| `GET /auth/me` | entire endpoint | `{ user: JwtPayload }` | **Never called** from frontend at all |
| `GET /analytics` | `topItems[].nameEn` | Returned by backend | Frontend `AnalyticsPage.tsx:153` only uses `item.name`, never `item.nameEn` |
| `GET /orders` | `order.tableName` | Always present | Used correctly in `OrderCard.tsx:122` |

### 4.2 `SplitBillSession.shares[].clientSecret` exposure

**Backend** (`split-bill.service.ts:76-79`): Each share includes `clientSecret` from Stripe.

**Frontend** (`SplitBillDialog.tsx:161-168`): The `SessionResult` component displays `share.personName`, `share.amount`, and `share.paid`, but **never uses `share.clientSecret`**. The client secret is returned but not utilized for actual payment in the current UI.

**Risk**: Exposing Stripe `clientSecret` values without using them is unnecessary. Either the frontend should render payment forms for each share, or the backend should not return `clientSecret` to the admin panel.

### 4.3 `closeTable` response field naming is consistent

**Backend**: Returns `{ closed: number }`.
**Frontend** (`CloseTableDialog.tsx:48`): `result.closed` -- correctly aligned.
**Frontend** (`api.ts:157`): `fetchJSON<{ closed: number }>` -- correctly typed.

### 4.4 Category `active` field used bidirectionally but not in `createCategory`

**Backend** (`menu.service.ts:88`): `createCategory` builds `{ id, storeId, name, nameEn, sortOrder }` -- no `active` field.
**Shared type** (`types.ts:38`): `Category.active?: boolean`.
**Frontend** (`CategoryManagePage.tsx:334-337`): Toggles `active` via `updateCategory`. Uses `cat.active !== false` for display.

**Impact**: Newly created categories have no `active` field (implicitly `undefined`), which is treated as truthy by `cat.active !== false`. This works correctly by convention but is implicit.

### 4.5 `createCheckout` response: `client_secret` (Stripe) vs `clientSecret` (camelCase)

**Backend** (`payment.service.ts:58`):
```ts
return { clientSecret: paymentIntent.client_secret, amount: totalPrice }
```

**Frontend** (`api.ts:167`): `fetchJSON<{ clientSecret: string; amount: number }>`.
**Frontend** (`CartPage.tsx:46`): `const { clientSecret, amount } = await api.createCheckout(...)`.

**Status**: Correctly converted! The backend correctly maps Stripe's `client_secret` (snake_case) to `clientSecret` (camelCase) before returning to the frontend. No mismatch.

---

## 5. camelCase vs snake_case Audit

All API responses use **camelCase consistently**. No snake_case fields were found in any `res.json()` calls. The Stripe SDK's `client_secret` is correctly converted to `clientSecret` at the service layer.

| Pattern | Status |
|---------|--------|
| Object keys in `res.json()` | All camelCase |
| Shared types in `types.ts` | All camelCase |
| Frontend field access | All camelCase |

---

## 6. Endpoint-by-Endpoint Summary

| Endpoint | Backend Response Shape | Frontend Expected Type | Match? |
|----------|----------------------|----------------------|--------|
| `POST /auth/login` | `LoginResponse { token, user }` | `LoginResponse` | YES |
| `GET /auth/me` | `{ user: JwtPayload }` | **Not called** | N/A (latent mismatch) |
| `GET /stores/:id` | `Store` | `Store` | YES |
| `PUT /stores/:id` | `Store` (missing `autoAcceptOrders`) | `Store` | **PARTIAL** |
| `GET /menu` | `MenuResponse` | `MenuResponse` | YES |
| `GET /menu/items` | `MenuItem[]` | `MenuItem[]` | YES |
| `POST /menu/items` | `MenuItem` | `MenuItem` | YES |
| `PUT /menu/items/:id` | `MenuItem` | `MenuItem` | YES |
| `DELETE /menu/items/:id` | `204 No Content` | `void` | YES |
| `GET /menu/categories` | `Category[]` | `Category[]` | YES |
| `POST /menu/categories` | `Category` | `Category` | YES |
| `PUT /menu/categories/:id` | `Category` | `Category` | YES |
| `DELETE /menu/categories/:id` | `204 No Content` | `void` | YES |
| `GET /tables` | `Table[]` | `Table[]` | YES |
| `GET /tables/:id` | `Table` | `Table` | YES |
| `POST /tables` | `Table` | `Table` | YES |
| `PUT /tables/:id` | `Table` | `Table` | YES |
| `DELETE /tables/:id` | `204 No Content` | `void` | YES |
| `POST /tables/:id/settle` | `{ settled: number }` | `{ settled: number }` | YES |
| `POST /tables/:id/close` | `{ closed: number }` | `{ closed: number }` | YES |
| `POST /orders` | `Order` (with `paymentIntentId`) | `Order` | YES (minor: no strip) |
| `GET /orders` | `Order[]` (stripped) | `Order[]` | **PARTIAL** (type lies about `paymentIntentId`) |
| `PATCH /orders/:id/status` | `Order` (stripped) | `Order` | **PARTIAL** |
| `POST /orders/:id/transfer` | `Order` (stripped) | `Order` | **PARTIAL** |
| `PUT /orders/:id/items` | `Order` (stripped) | `Order` | **PARTIAL** |
| `POST /checkout` | `{ clientSecret, amount }` | `{ clientSecret: string; amount: number }` | YES |
| `POST /webhook/stripe` | `{ received: true }` | **Not called from frontend** | N/A |
| `GET /analytics` | `AnalyticsResponse` | `AnalyticsResponse` | YES |
| `GET /coupons` | `Coupon[]` | `Coupon[]` | YES |
| `POST /coupons` | `Coupon` | `Coupon` | YES |
| `PUT /coupons/:id` | `Coupon` | `Coupon` | YES |
| `DELETE /coupons/:id` | `204 No Content` | `void` | YES |
| `GET /waitlist` | `WaitlistEntry[]` | `WaitlistEntry[]` | YES |
| `POST /waitlist` | `WaitlistEntry` | `WaitlistEntry` | YES |
| `PATCH /waitlist/:id` | `WaitlistEntry` | `WaitlistEntry` | YES |
| `DELETE /waitlist/:id` | `204 No Content` | `void` | YES |
| `POST /waitlist/:id/seat` | `WaitlistEntry` | `WaitlistEntry` | YES |
| `POST /split-bill` | `SplitBillSession` | `SplitBillSession` | YES |
| `GET /staff` | `AuthUser[]` | `AuthUser[]` | YES |
| `POST /staff` | `AuthUser` | `AuthUser` | YES |
| `PATCH /staff/:id` | `AuthUser` | `AuthUser` | YES |
| `DELETE /staff/:id` | `204 No Content` | `void` | YES |
| `GET /printer/config` | `PrinterConfig` or `{ enabled: false }` | **Not called** | N/A |
| `PUT /printer/config` | `PrinterConfig` | **Not called** | N/A |
| `POST /printer/print/:id` | `{ success: boolean }` | `{ success: boolean }` | YES |
| `POST /upload` | `{ url: string }` | `data.url` (raw fetch) | YES |

---

## 7. Actionable Recommendations (Priority Order)

### Must Fix (Before next release)

1. **`store.service.ts` -- add `autoAcceptOrders` to `updateStore`**: The field is silently dropped. Add it to the update call.

2. **Create `PublicOrder` type**: `Omit<Order, 'paymentIntentId'>` in `shared/types.ts`. Use this as the return type for order endpoints in `api.ts` to reflect the actual stripped response.

### Should Fix (Next sprint)

3. **Fix `/auth/me` response**: Return `AuthUser` shape (with `id` not `userId`, include `username`) or mark the endpoint as deprecated.

4. **Consistent `stripSensitive` on `POST /orders`**: Apply `stripSensitive` to the create order route for consistency, or document why it is skipped.

5. **Clarify `'paid'` status lifecycle**: Either implement the `pending -> paid -> preparing -> completed` flow, or remove `'paid'` from `OrderStatus` and use only `isPaid: boolean`.

### Nice to Have

6. **Remove unused `clientSecret` from split bill admin response**: The admin panel does not use it for payment.

7. **Add `active` field explicitly to `createCategory`**: Default to `true` rather than relying on `undefined` being truthy.

---

> Generated by type consistency audit, 2026-03-21

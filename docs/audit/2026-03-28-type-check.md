# API Type Consistency Audit — 2026-03-28

Scope: Compare every backend `res.json()` response shape against the corresponding
`fetchJSON<T>()` type declaration in `client/src/services/api.ts` and actual field
access in frontend components.

---

## Consistent Routes

The following routes have matching response shapes between backend and frontend.

| Route | Method | Backend returns | Frontend type | Status |
|-------|--------|----------------|---------------|--------|
| `/stores/:storeId/auth/login` | POST | `LoginResponse` (`{ token, user }`) | `LoginResponse` | OK |
| `/stores/:storeId/auth/me` | GET | `{ user: AuthUser }` | (not called) | OK (dead endpoint) |
| `/stores/:storeId/menu` | GET | `MenuResponse` | `MenuResponse` | OK |
| `/stores/:storeId/menu/items` | GET | `MenuItem[]` | `MenuItem[]` | OK |
| `/stores/:storeId/menu/items` | POST | `MenuItem` | `MenuItem` | OK |
| `/stores/:storeId/menu/items/:id` | PUT | `MenuItem` | `MenuItem` | OK |
| `/stores/:storeId/menu/items/:id` | DELETE | 204 (no body) | `void` | OK |
| `/stores/:storeId/menu/items/batch` | POST | `{ created, skipped }` | `{ created: MenuItem[]; skipped: {row,reason}[] }` | OK |
| `/stores/:storeId/menu/categories` | GET | `Category[]` | `Category[]` | OK |
| `/stores/:storeId/menu/categories` | POST | `Category` | `Category` | OK |
| `/stores/:storeId/menu/categories/:id` | PUT | `Category` | `Category` | OK |
| `/stores/:storeId/menu/categories/:id` | DELETE | 204 | `void` | OK |
| `/stores/:storeId/tables` | GET | `Table[]` | `Table[]` | OK |
| `/stores/:storeId/tables/next-number` | GET | `{ number, allFull }` | `{ number: number; allFull: boolean }` | OK |
| `/stores/:storeId/tables/enable` | POST | `Table` | `Table` | OK |
| `/stores/:storeId/tables/:id` | PUT | `Table` | `Table` | OK |
| `/stores/:storeId/tables/:id/disable` | POST | `Table` | `Table` | OK |
| `/stores/:storeId/tables/:id/regenerate-qr` | POST | `Table` | `Table` | OK |
| `/stores/:storeId/tables/:id/close` | POST | `{ closed: number }` | `{ closed: number }` | OK |
| `/stores/:storeId/tables/:id/settle` | POST | `{ settled: number }` | (not called from FE) | OK (unused) |
| `/stores/:storeId/orders` | POST | `Order` (stripped `paymentIntentId`) | `Order` | OK |
| `/stores/:storeId/orders` | GET | `Order[]` (stripped) | `Order[]` | OK |
| `/stores/:storeId/orders/:id/status` | PATCH | `Order` (stripped) | `Order` | OK |
| `/stores/:storeId/orders/:id/transfer` | POST | `Order` (stripped) | `Order` | OK |
| `/stores/:storeId/orders/:id/items` | PUT | `Order` (stripped) | `Order` | OK |
| `/stores/:storeId/checkout` | POST | `{ clientSecret, amount }` | `{ clientSecret: string; amount: number }` | OK |
| `/stores/:storeId/analytics` | GET | `AnalyticsResponse` | `AnalyticsResponse` | OK |
| `/stores/:storeId/coupons` | GET | `Coupon[]` | `Coupon[]` | OK |
| `/stores/:storeId/coupons` | POST | `Coupon` | `Coupon` | OK |
| `/stores/:storeId/coupons/:id` | PUT | `Coupon` | `Coupon` | OK |
| `/stores/:storeId/coupons/:id` | DELETE | 204 | `void` | OK |
| `/stores/:storeId/waitlist` | GET | `WaitlistEntry[]` | `WaitlistEntry[]` | OK |
| `/stores/:storeId/waitlist` | POST | `WaitlistEntry` | `WaitlistEntry` | OK |
| `/stores/:storeId/waitlist/:id` | DELETE | 204 | `void` | OK |
| `/stores/:storeId/waitlist/:id/seat` | POST | `WaitlistEntry` | `WaitlistEntry` | OK |
| `/stores/:storeId/staff` | GET | `AuthUser[]` | `AuthUser[]` | OK |
| `/stores/:storeId/staff` | POST | `AuthUser` | `AuthUser` | OK |
| `/stores/:storeId/staff/:id` | PATCH | `AuthUser` | `AuthUser` | OK |
| `/stores/:storeId/staff/:id` | DELETE | 204 | `void` | OK |
| `/stores/:storeId/printer/print/:orderId` | POST | `{ success: boolean }` | `{ success: boolean }` | OK |
| `/stores/:storeId/bills?tableId=` | GET | `Bill & { splits: Split[] }` or `null` | `(Bill & { splits: Split[] }) \| null` | OK |
| `/stores/:storeId/bills/:id` | GET | `Bill & { splits: Split[] }` | `Bill & { splits: Split[] }` | OK |
| `/stores/:storeId/bills/:id/splits` | POST | `Split[]` | `Split[]` | OK |
| `/stores/:storeId/bills/:id/splits/:splitId` | PATCH | `{ bill: Bill; split: Split }` | `{ bill: Bill; split: Split }` | OK |
| `/stores/:storeId/bills/:id/apply-coupon` | POST | `Bill` | `Bill` | OK |
| `/stores/:storeId/bills/:id/coupon` | DELETE | `Bill` | `Bill` | OK |
| `/stores/:storeId/bills/:id/settle` | POST | `Bill` | `Bill` | OK |
| `/stores/:storeId/roles` | GET | `RoleDefinition[]` | `RoleDefinition[]` | OK |
| `/stores/:storeId/roles` | POST | `RoleDefinition` | `RoleDefinition` | OK |
| `/stores/:storeId/roles/:id` | PUT | `RoleDefinition` | `RoleDefinition` | OK |
| `/api/upload` | POST | `{ url }` | `data.url` (extracted inline) | OK |
| `/api/webhook/stripe` | POST | `{ received: true }` | (not called from FE) | OK |

---

## Mismatched Routes

### 1. GET `/stores/:storeId` -- autoAcceptOrders stripped from public response

**Severity: BUG (data loss on admin page load)**

Backend (`store.routes.ts:13`):
```ts
const { autoAcceptOrders, createdAt, updatedAt, ...publicStore } = store
res.json(publicStore)
```

Frontend (`StoreSettingsPage.tsx:42`):
```ts
setAutoAccept(data.autoAcceptOrders ?? false)
```

The public `GET /` route destructures out `autoAcceptOrders`, `createdAt`, and `updatedAt` before
sending the response. The admin `StoreSettingsPage` calls this same endpoint and reads
`data.autoAcceptOrders`, which is always `undefined`. This means:

- The auto-accept toggle always shows **OFF** on page load, even when the stored value is `true`
- If admin saves without noticing, `autoAcceptOrders` is overwritten to `false`

The api.ts return type `Store` is also incorrect for this endpoint because `Store` includes
`autoAcceptOrders`, `createdAt`, and `updatedAt` which are stripped.

Similarly, `data.paymentMode` is NOT stripped (it's preserved in the spread), so that field works correctly.

**Fix**: Either (a) add a separate authenticated admin endpoint (`GET /stores/:storeId/admin`)
that returns the full store, or (b) stop stripping `autoAcceptOrders` from the public response
(it's not sensitive data).

---

### 2. `api.updateTable` type is too narrow

**Severity: Type safety bypass (forced cast)**

`api.ts` line 163:
```ts
updateTable: (storeId: string, tableId: string, data: { name?: string; nameEn?: string })
```

Backend `table.service.ts:132`:
```ts
updateTable(storeId, tableId, updates: Partial<Omit<Table, 'id' | 'storeId'>>)
```

The backend accepts all table fields except `id` and `storeId`, but the frontend type only declares
`name` and `nameEn`. The `FloorPlanEditorPage` works around this with a type cast:

```ts
const fn = api.updateTable as UpdateTableFn  // Partial<Table>
await fn(storeId, tb.id, { name, nameEn, zone, shape, capacity, x, y, width, height })
```

**Fix**: Update `api.ts` to accept `Partial<Omit<Table, 'id' | 'storeId'>>` for `updateTable`.

---

### 3. `api.createSplitBill` does not exist

**Severity: RUNTIME ERROR (in deprecated code path)**

`SplitBillDialog.tsx:63`:
```ts
setSession(await api.createSplitBill(storeId, payload))
```

`api.createSplitBill` is not defined anywhere in `api.ts`. There is no corresponding backend route
either (the old `/split-bill` endpoint was replaced by the bill/splits system). `SplitBillDialog`
is marked `// DEPRECATED` but is still imported in `TableDetailPanel.tsx` and `TablesPage.tsx`.

This would throw `TypeError: api.createSplitBill is not a function` at runtime if a user
triggers the deprecated split bill flow.

**Fix**: Either remove `SplitBillDialog` entirely (since `BillSettleDialog` replaces it) or
restore the API method.

---

### 4. DELETE `/stores/:storeId/roles/:roleId` returns 200 `{ success: true }`, not 204

**Severity: Minor inconsistency**

Backend (`role.routes.ts:37`):
```ts
res.json(result)  // result is { success: true }
```

Frontend (`api.ts:321`):
```ts
deleteRole: ... fetchJSON<void>(...)
```

All other delete endpoints return 204 with no body. `deleteRole` uniquely returns 200 with
`{ success: true }`. The frontend types this as `void` and never reads the result, so there's
no runtime error, but it's inconsistent with the rest of the API.

**Fix**: Change `role.routes.ts` to use `res.status(204).end()` like other delete routes.

---

### 5. GET `/stores/:storeId/tables/:tableId` (public) returns a modified `Table`

**Severity: Minor type imprecision**

Backend (`table.service.ts:63-70`):
```ts
getTablePublic(storeId, tableId):
  Omit<Table, 'currentOrderId' | 'currentBillId' | 'x' | 'y' | 'width' | 'height' | 'shape'>
  & { paymentMode: string }
```

Frontend (`api.ts:138`):
```ts
getTable: ... fetchJSON<Table>(...)
```

The public table endpoint strips `currentOrderId`, `currentBillId`, `x`, `y`, `width`, `height`,
`shape` and adds a resolved `paymentMode` (always a string, never `null`/`undefined`). The
frontend types it as full `Table`. The fields the frontend actually accesses (`enabled`, `name`,
`paymentMode`) are all present, so this doesn't cause bugs, but the TypeScript type is wider than
the actual response.

**Fix**: Define a `PublicTable` type in shared/types.ts and use it in `api.ts`.

---

## Backend returns but frontend never uses

These fields are sent by the backend but no frontend component reads them.

| Route | Field(s) | Notes |
|-------|----------|-------|
| `GET /menu` (MenuResponse) | `store.announcementEn` | Returned by backend, admin settings page writes it, but customer `MenuPage` only uses `store.announcement` -- English announcement is never displayed to customers |
| `GET /menu` (MenuResponse) | `store.logo`, `store.openingHours` | Returned in the response but `MenuPage` doesn't render these fields anywhere in the current UI |
| `GET /tables/:id` (public) | `number`, `storeId`, `status`, `nameEn`, `zone`, `capacity` | Public table response includes these but customer pages only use `enabled`, `name`, `paymentMode` |
| `GET /printer/config` | all fields | No frontend code calls this endpoint; api.ts has no method for it |
| `PUT /printer/config` | all fields | No frontend code calls this endpoint; api.ts has no method for it |
| `PATCH /waitlist/:entryId` | return value | No frontend code calls this endpoint (PATCH for partial update); only `seat` and `remove` are used |
| `GET /orders` | `order.tableName` | Present in every order response, but most frontend code uses table lookup instead of `tableName`; only `OrderReceipt` and `OrderDetailDialog` use it |

---

## Version field not sent in bill operations (optimistic concurrency gap)

The backend bill operations accept an optional `version` field for optimistic concurrency
protection (prevents stale updates when multiple admins edit concurrently). The frontend never
sends it:

| Frontend method | Backend parameter | Frontend sends `version`? |
|----------------|------------------|--------------------------|
| `createBillSplits` | `version` (optional) | No |
| `applyBillCoupon` | `version` (optional) | No |
| `removeBillCoupon` | `version` (optional) | No |
| `settleBill` | `version` (optional) | No |

This means concurrent bill modifications by multiple admin users could overwrite each other
silently. Not a type mismatch per se, but a gap in the API contract utilization.

---

## camelCase / snake_case consistency

No camelCase vs snake_case mismatches found. All shared types in `shared/types.ts` use camelCase
consistently. The only snake_case source is Stripe's `client_secret`, which is correctly converted
to `clientSecret` before being returned to the frontend (`payment.service.ts:93,142,169`).

---

## Summary

| Category | Count |
|----------|-------|
| Fully consistent routes | 48 |
| Bug (data loss) | 1 -- `autoAcceptOrders` stripped from GET store |
| Runtime error (deprecated code) | 1 -- `api.createSplitBill` undefined |
| Type too narrow (forced cast) | 1 -- `api.updateTable` |
| Type imprecision (wider than actual) | 2 -- `getTable` public, `deleteRole` |
| Unused backend fields | 7 groups |
| Concurrency gap | 4 bill operations missing `version` |
| camelCase/snake_case issues | 0 |

### Priority

1. **Fix now**: `autoAcceptOrders` bug in `GET /stores/:storeId` -- admin page silently resets the setting
2. **Fix now**: Remove or rewire `SplitBillDialog` -- runtime error if triggered
3. **Quick win**: Widen `api.updateTable` type to match backend -- removes unsafe cast
4. **Cleanup**: Align `deleteRole` route to return 204 like all other deletes
5. **Cleanup**: Define `PublicTable` type for customer-facing table endpoint
6. **Enhancement**: Pass `version` in bill operations for optimistic concurrency

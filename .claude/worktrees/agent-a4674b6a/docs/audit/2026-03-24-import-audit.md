# Import Path Audit — 2026-03-24

## Summary

| Metric | Count |
|--------|-------|
| Files scanned | 106 |
| Total import statements | 617 |
| Relative imports (`./`, `../`) | 108 |
| Alias imports (`@/`) | 282 |
| Monorepo imports (`@qr-order/shared`) | 51 |
| npm package imports | 165 |
| Node built-in imports | 11 |
| **Broken imports** | **0** |
| Missing npm packages | 0 |
| Dynamic imports | 3 |
| Circular dependencies | 1 |

**Result: All 441 relative, alias, and monorepo imports resolve to existing files. No broken imports found.**

---

## Methodology

- Scanned all `.ts` and `.tsx` files under `client/src/` (66 files) and `server/src/` (40 files).
- Extracted static imports (`import ... from`, `export ... from`), side-effect imports (`import 'path'`), and dynamic imports (`import('path')`), including multi-line import statements.
- Alias resolution: `@/` maps to `client/src/` (configured in `tsconfig.json` + `vite.config.ts`).
- Server `.js` extension convention: server files import with `.js` suffix (ESM convention); audit strips `.js` and resolves to `.ts` source files.
- Monorepo resolution: `@qr-order/shared` resolves to `shared/types.ts`.
- For each local import, checked existence with extensions `.ts`, `.tsx`, `.js`, `.jsx`, `.json`, `.css` and directory `index.*` fallback.
- Verified all 27 npm packages are installed in `node_modules/` (root or workspace).
- Ran DFS-based circular dependency detection on the resolved dependency graph.

---

## Circular Dependencies

### `order.service.ts` <-> `table.service.ts`

```
server/src/controllers/order.service.ts
  └─ imports tableStore from ./table.service.js
server/src/controllers/table.service.ts
  └─ imports orderStore from ./order.service.js
```

Both files export `JsonStore` instances that the other consumes. This works at runtime because Node.js handles circular ESM imports via live bindings, and the stores are evaluated at module scope before any functions execute. However, this is fragile and would break if either module referenced the other's export at the top level during initialization.

**Recommendation**: Extract `orderStore` and `tableStore` into a shared `stores.ts` module, or introduce a `repositories/` layer that both services import from.

---

## Dynamic Imports

| File | Line | Import Path | Resolves |
|------|------|-------------|----------|
| `client/src/components/SplitBillDialog.tsx` | 16 | `@/i18n/admin` | Yes |
| `client/src/components/TableDetailPanel.tsx` | 111 | `@/i18n/admin` | Yes |
| `server/src/controllers/payment.service.ts` | 22 | `./menu.service.js` | Yes |

Notes:
- The two client-side `import()` calls are `typeof import(...)` type-only references, not runtime dynamic imports. They resolve correctly.
- The server-side dynamic import in `payment.service.ts` is a runtime `await import()` to lazily load `menu.service.js`. This resolves correctly to `menu.service.ts`.

---

## npm Packages (27)

All installed and resolvable:

| Package | Used In |
|---------|---------|
| `@aws-sdk/client-s3` | server |
| `@prisma/client` | server |
| `@stripe/react-stripe-js` | client |
| `@stripe/stripe-js` | client |
| `bcryptjs` | server |
| `class-variance-authority` | client (ui) |
| `clsx` | client (ui) |
| `cors` | server |
| `dotenv` | server |
| `express` | server |
| `i18next` | client |
| `i18next-browser-languagedetector` | client |
| `jsonwebtoken` | server |
| `lucide-react` | client |
| `morgan` | server |
| `multer` | server |
| `pino` | server |
| `qrcode.react` | client |
| `radix-ui` | client (ui) |
| `react` | client |
| `react-dom` | client |
| `react-i18next` | client |
| `react-router-dom` | client |
| `stripe` | server |
| `tailwind-merge` | client |
| `uuid` | server |
| `zustand` | client |

Node built-ins used: `fs`, `path`, `url` (server only).

---

## Per-File Import Counts

### Client — Pages (14 files)

| File | Total | Local | npm |
|------|-------|-------|-----|
| `pages/admin/TablesPage.tsx` | 16 | 14 | 2 |
| `pages/customer/MenuPage.tsx` | 16 | 13 | 3 |
| `pages/admin/CouponManagePage.tsx` | 14 | 13 | 1 |
| `pages/admin/FloorPlanPage.tsx` | 14 | 12 | 2 |
| `pages/admin/MenuManagePage.tsx` | 14 | 11 | 3 |
| `pages/customer/CheckoutPage.tsx` | 12 | 6 | 6 |
| `pages/admin/CategoryManagePage.tsx` | 12 | 10 | 2 |
| `pages/admin/StaffManagePage.tsx` | 12 | 11 | 1 |
| `pages/customer/CartPage.tsx` | 11 | 7 | 4 |
| `pages/customer/OrderConfirmPage.tsx` | 11 | 7 | 4 |
| `pages/admin/StoreSettingsPage.tsx` | 11 | 9 | 2 |
| `pages/admin/FloorPlanEditorPage.tsx` | 10 | 8 | 2 |
| `pages/customer/OrderHistoryPage.tsx` | 10 | 6 | 4 |
| `pages/admin/AnalyticsPage.tsx` | 9 | 8 | 1 |
| `pages/admin/DashboardPage.tsx` | 9 | 8 | 1 |
| `pages/customer/ScanPage.tsx` | 8 | 4 | 4 |
| `pages/admin/LoginPage.tsx` | 8 | 5 | 3 |
| `pages/customer/LangSelectPage.tsx` | 3 | 0 | 3 |

### Client — Components (23 files)

| File | Total | Local | npm |
|------|-------|-------|-----|
| `components/TableDetailPanel.tsx` | 15 | 13 | 2 |
| `components/MenuItemForm.tsx` | 14 | 12 | 2 |
| `components/MenuItemDetailSheet.tsx` | 11 | 9 | 2 |
| `components/OrderCard.tsx` | 10 | 8 | 2 |
| `components/OrderEditDialog.tsx` | 10 | 9 | 1 |
| `components/OrderingSheet.tsx` | 10 | 8 | 2 |
| `components/SplitBillDialog.tsx` | 10 | 9 | 1 |
| `components/ActiveOrdersSidebar.tsx` | 9 | 8 | 1 |
| `components/MenuItemTable.tsx` | 9 | 8 | 1 |
| `components/OrderDetailDialog.tsx` | 9 | 8 | 1 |
| `components/OrderEditMode.tsx` | 9 | 6 | 3 |
| `components/CloseTableDialog.tsx` | 8 | 7 | 1 |
| `components/TableCrudDialog.tsx` | 8 | 6 | 2 |
| `components/AdminLayout.tsx` | 7 | 4 | 3 |
| `components/ItemCustomizeView.tsx` | 7 | 5 | 2 |
| `components/TransferTableDialog.tsx` | 7 | 6 | 1 |
| `components/WaitlistPanel.tsx` | 7 | 6 | 1 |
| `components/TableGrid.tsx` | 6 | 6 | 0 |
| `components/ImageUpload.tsx` | 4 | 2 | 2 |
| `components/OrderReceipt.tsx` | 4 | 2 | 2 |
| `components/TipSelector.tsx` | 4 | 2 | 2 |
| `components/ProtectedRoute.tsx` | 2 | 1 | 1 |

### Client — Other (17 files)

| File | Total | Local | npm |
|------|-------|-------|-----|
| `App.tsx` | 21 | 20 | 1 |
| `i18n/index.ts` | 9 | 6 | 3 |
| `main.tsx` | 5 | 3 | 2 |
| `lib/qr-pdf.ts` | 4 | 1 | 3 |
| `stores/admin-lang-store.ts` | 3 | 1 | 2 |
| `stores/auth-store.ts` | 3 | 1 | 2 |
| `stores/cart-store.ts` | 3 | 1 | 2 |
| `services/api.ts` | 2 | 2 | 0 |
| `stores/session-store.ts` | 2 | 0 | 2 |
| `i18n/useT.ts` | 2 | 2 | 0 |
| `lib/utils.ts` | 2 | 0 | 2 |
| `components/ui/*` (12 files) | 2-5 each | 1 each | 1-3 each |
| `lib/format.ts` | 0 | 0 | 0 |
| `lib/i18n-utils.ts` | 0 | 0 | 0 |
| `i18n/admin.ts` | 0 | 0 | 0 |

### Server (40 files)

| File | Total | Local | npm | Built-in |
|------|-------|-------|-----|----------|
| `app.ts` | 19 | 16 | 3 | 0 |
| `controllers/order.service.ts` | 8 | 7 | 1 | 0 |
| `controllers/auth.controller.ts` | 5 | 3 | 2 | 0 |
| `controllers/payment.service.ts` | 5 | 5 | 0 | 0 |
| `controllers/printer.service.ts` | 5 | 4 | 1 | 0 |
| `controllers/staff.service.ts` | 5 | 3 | 2 | 0 |
| `controllers/menu.service.ts` | 4 | 3 | 1 | 0 |
| `controllers/split-bill.service.ts` | 4 | 4 | 0 | 0 |
| `controllers/table.service.ts` | 4 | 3 | 1 | 0 |
| `routes/order.routes.ts` | 4 | 3 | 1 | 0 |
| `routes/printer.routes.ts` | 4 | 3 | 1 | 0 |
| `routes/upload.routes.ts` | 4 | 2 | 2 | 0 |
| `scripts/seed-features.ts` | 4 | 1 | 1 | 2 |
| `seed.ts` | 4 | 0 | 1 | 3 |
| `controllers/analytics.service.ts` | 3 | 3 | 0 | 0 |
| `controllers/coupon.service.ts` | 3 | 2 | 1 | 0 |
| `controllers/waitlist.service.ts` | 3 | 2 | 1 | 0 |
| `middleware/auth.middleware.ts` | 3 | 2 | 1 | 0 |
| `middleware/error.middleware.ts` | 3 | 1 | 2 | 0 |
| `repositories/json-store.ts` | 3 | 0 | 0 | 3 |
| `routes/*.routes.ts` (10 files) | 3 each | 2 each | 1 each | 0 |
| `scripts/print-table-urls.ts` | 3 | 0 | 0 | 3 |
| `controllers/store.service.ts` | 2 | 2 | 0 | 0 |
| `lib/prisma.ts` | 2 | 1 | 1 | 0 |
| `server.ts` | 2 | 1 | 1 | 0 |
| `lib/logger.ts` | 1 | 0 | 1 | 0 |
| `lib/printer.ts` | 1 | 1 | 0 | 0 |
| `lib/s3.ts` | 1 | 0 | 1 | 0 |
| `lib/stripe.ts` | 1 | 0 | 1 | 0 |
| `repositories/auth.repository.ts` | 1 | 1 | 0 | 0 |

---

## Observations

1. **No broken imports.** All 441 local imports (relative + alias + monorepo) resolve to existing files.

2. **Alias usage is consistent.** Client files use `@/` for cross-directory imports (282 occurrences). No file mixes `@/` with relative paths to the same target.

3. **Server uses `.js` extensions in imports.** All server relative imports use the `.js` suffix convention (e.g., `'./menu.service.js'`), which is correct for TypeScript ESM (`"module": "ESNext"` in tsconfig).

4. **One circular dependency** between `order.service.ts` and `table.service.ts` (see details above). Works at runtime but is architecturally fragile.

5. **`App.tsx` has the most local imports (20).** It imports all 14 page components plus 6 infrastructure modules. This is expected for the router entry point but could be reduced with lazy loading (`React.lazy`).

6. **`app.ts` (server) has 16 local imports.** It registers 14 route modules plus middleware and error handler. This is standard for Express app configuration.

7. **`shared/types.ts` has no imports** — it is a pure type definition file, which is correct.

8. **No `require()` calls found.** All imports use ESM `import` syntax.

# Session Handoff Report — 2026-03-24

> Read this after /compact to restore full context.

---

## Project State

QR 扫码点餐 SaaS，pnpm monorepo: `client/` (React+Vite+Tailwind v4+shadcn) + `server/` (Express+JSON file storage) + `shared/` (types.ts).

**GitHub**: `https://github.com/ianlin1102/qr_code_restaurant.git` branch `main`
**Latest commit**: `686771d` — "fix: JSX fragment wrap for mobile cards + login keeps form on failure"

---

## What Was Done This Session

### Major Features Implemented
1. **Design System "Digital Maître D'"** — Plus Jakarta Sans + Inter fonts, navy #1a3c8f primary, tonal surface layering (#faf8ff/#f4f3fb/#fff), de-bordered shadcn components, glass utility, ambient/card shadows. Bulk-replaced 120+ hardcoded colors to semantic tokens.
2. **Admin i18n (Chinese/English)** — `i18n/admin.ts` (200+ keys) + `useT()` hook + `admin-lang-store`. All 10 admin pages + 14 shared components migrated. Language toggle in AdminLayout sidebar.
3. **OrderingSheet** — Inline table ordering (category grid → item list → option selection → send to kitchen) without navigating away from TablesPage.
4. **Customer unpaid order payment** — Orange banner on MenuPage + Stripe PaymentIntent for existing orders via `orderIds`.
5. **Tip selection** on CheckoutPage (15%/18%/20%/Custom).
6. **Revenue bar chart** (pure CSS, Day/Week toggle) on AnalyticsPage.
7. **Customer order history page** + session orders on MenuPage (collapsible `<details>`).
8. **Drag-and-drop category reorder** (HTML5 native).
9. **Category active/inactive toggle** (hidden from customer menu).
10. **Table CRUD dialog** + QR code printing with configurable base URL.
11. **Urgent notifications panel** on FloorPlan (long pending orders, bill-requested).
12. **Auto-accept orders toggle** in store settings.
13. **Estimated wait time** on order confirmation.
14. **Call Waiter button** on customer MenuPage (local feedback only, no WebSocket).
15. **Collapsible MenuPage header** on scroll.
16. **Table shape selector** in FloorPlan editor (square/round/long).
17. **New table statuses**: cleaning, bill-requested.

### Critical Bugs Fixed
1. **JsonStore multiple instances** — `tables.json` had 2 independent `new JsonStore()` calls in order.service.ts and table.service.ts. Order creation updated one copy to `occupied` but API reads from the other (still `idle`). **Fix**: export single instance, import in other modules. Same fix for `stores.json` (3 instances → 1) and `orders.json` (2 → 1).
2. **OrderConfirmPage infinite loading** — `o.status === 'paid'` never matches (webhook sets `isPaid: true` but keeps status `pending`). **Fix**: use `o.isPaid` + polling 5 times + timeout fallback.
3. **Stripe metadata 500-char limit** — Cart data exceeded limit. **Fix**: compact format (single-letter keys) + auto-chunking across multiple metadata keys.
4. **selectedOptions Chinese names empty** — Stripe compact metadata sets `optionName/choiceName` to `''`. **Fix**: `order.service.ts` enrichedOptions now fills from menuItem definitions. Frontend fallback: `o.choiceName || o.choiceNameEn || ''`.
5. **Category Switch not working** — `draggable` on TableRow intercepted click. **Fix**: `stopPropagation` on Switch cell.
6. **Public API over-exposure** — `GET /stores/:storeId` leaked `autoAcceptOrders`, `GET /tables/:tableId` leaked layout fields. **Fix**: strip internal fields for unauthenticated requests.

### Infrastructure
- **Stripe CLI installed** at `/usr/local/bin/stripe` for webhook forwarding.
- **Docker Compose** working: postgres + adminer + server + nginx. `.env` must use `docker compose up -d` (not `restart`) to reload.
- **Audit reports** at `docs/audit/2026-03-24-*.md` (import, type-chain, dead-code).
- **CLAUDE.md** fully updated with all known issues, conventions, and file structure.

---

## Key Architecture Decisions

- **JsonStore singleton pattern**: Each JSON file has ONE `JsonStore` instance, exported from its owning service, imported by others. This prevents the memory desync bug.
- **Admin i18n dual system**: Customer pages use `react-i18next` (JSON files). Admin pages use `useT()` hook + `admin-lang-store` (inline `admin.ts`). Don't mix them.
- **Order item snapshot**: Orders store full names/prices at creation time. `enrichedOptions` fills `optionName`/`choiceName` (zh) and `optionNameEn`/`choiceNameEn` (en) from menuItem definitions.
- **Stripe payment flow**: CartPage creates PaymentIntent → CheckoutPage shows Stripe form → webhook creates order with `isPaid: true`. For admin-created orders: OrderingSheet calls `createOrder` directly (no Stripe).

---

## Known Issues (Not Yet Fixed)

1. **Call Waiter has no real notification** — needs WebSocket
2. **Stripe webhook requires CLI** — `stripe listen --forward-to localhost:3001/api/webhook/stripe`
3. **Docker `.env` trap** — `docker compose restart` doesn't reload env vars
4. **Tax/Service rates inconsistent** — TablesPage 10%+5%, MenuManagePage 8%
5. **Cart localStorage residual** — old cart data may cause wrong orders
6. **FloorPlan/Tables 10s polling delay**
7. **`/auth/me` endpoint unused**
8. **Circular dependency** — order.service ↔ table.service (works at runtime, architecturally fragile)
9. **7 files severely over 300-line limit** — MenuPage(500), CategoryManagePage(423), MenuItemForm(375), OrderEditDialog(372), TablesPage(352), AnalyticsPage(317), MenuItemTable(317)

---

## Pending Feature Requests

1. **FloorPlan interactive map** — Render tables by x/y coordinates (like editor) instead of card grid
2. **Checkout session optimization** — Store cart server-side, metadata only stores session ID
3. **Mobile bottom nav for admin** — Currently no bottom tab bar on mobile

---

## Server Deployment Commands

```bash
git pull origin main
docker compose up -d --build
docker compose exec server pnpm --filter @qr-order/server exec prisma migrate deploy
# Optional: docker compose exec server pnpm --filter @qr-order/server seed
stripe listen --forward-to localhost:3001/api/webhook/stripe
# Put whsec_... into .env, then: docker compose up -d server
```

---

## File Quick Reference

| Purpose | Path |
|---------|------|
| Shared types | `shared/types.ts` |
| API client | `client/src/services/api.ts` |
| Admin i18n | `client/src/i18n/admin.ts` + `useT.ts` |
| CSS variables | `client/src/index.css` |
| Design system spec | `docs/superpowers/specs/2026-03-21-design-system-overhaul.md` |
| Audit reports | `docs/audit/2026-03-24-*.md` |
| Known issues | `CLAUDE.md` → "Known Issues / Deferred Work" section |

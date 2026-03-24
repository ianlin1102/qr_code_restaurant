# Project Structure Snapshot

**Generated**: 2026-03-21 08:00 CST
**Branch**: main
**Commit**: 1949944 (style: make language switch buttons more prominent)

## Project Status

QR Code scan-to-order SaaS system. MVP stage with JSON file storage.

- **48 API routes** across 14 route files (auth, store, menu, orders, tables, checkout, webhook, analytics, coupons, waitlist, split-bill, printer, staff, upload)
- **33 entity types** defined in `shared/types.ts`
- **53 React component files** (20 shared components, 7 customer pages, 11 admin pages, 15 shadcn UI primitives)
- **44 frontend API calls** in `services/api.ts`

## Files in this snapshot

| File | Description |
|------|-------------|
| `data-flow.json` | All API routes with method, path, auth level, request body, and response shape |
| `entity-schema.json` | All types from `shared/types.ts` with field names, types, and optional flags |
| `component-tree.json` | All React component files with their props and child component references |
| `api-contracts.json` | Frontend `api.ts` call inventory with URL, parameters, request/response shapes |

## Key Observations

- Data storage: JSON files in `server/data/` (Prisma schema defined but migration not yet executed)
- All prices stored in cents (integer), displayed as USD on frontend
- Multi-tenant: all API paths prefixed with `/api/stores/:storeId/`
- Payment: two-phase Stripe flow (PaymentIntent first, order created on webhook confirmation)
- i18n: Chinese + English, using i18next with namespace separation (admin/customer/common)

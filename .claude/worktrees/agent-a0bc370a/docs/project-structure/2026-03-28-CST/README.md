# Project Structure Snapshot — 2026-03-28 CST

## Snapshot Time

2026-03-28, China Standard Time (CST, UTC+8)

## Project State

- **Branch**: `main`
- **Last Commit**: `cbf6f57` — feat: add all Phase 2-7 types (Bill, Split, RoleDefinition, Permission, paymentMode, announcementEn)
- **Uncommitted Changes**: `CLAUDE.md` (modified), `App.tsx` (modified), `tables.json` (modified), 2 untracked doc files

## Summary

QR Code scan-to-order SaaS system (MVP stage). Multi-tenant architecture with JSON file storage (Prisma migration pending). React + Vite + TypeScript frontend, Express + TypeScript backend, pnpm monorepo.

## Contents

| File | Description |
|------|-------------|
| `data-flow.json` | 57 API routes with HTTP method, path, auth level, request body shape, and response shape |
| `entity-schema.json` | 25 type definitions from `shared/types.ts` with all fields, types, and optionality |
| `component-tree.json` | 42 React components from `client/src/` with props interfaces and child component usage |
| `api-contracts.json` | 52 frontend API calls from `client/src/services/api.ts` with URL, request shape, and response shape |

## Key Metrics at Snapshot Time

- **Server routes**: 15 route files in `server/src/routes/`
- **React components**: 42 non-UI component files in `client/src/`
- **Shared types**: 25 interfaces/type aliases in `shared/types.ts` (299 lines)
- **API client methods**: 52 methods in `client/src/services/api.ts` (343 lines)
- **Modules**: auth, store, menu, orders, tables, bills, checkout/payment, analytics, coupons, waitlist, staff, roles, printer, upload

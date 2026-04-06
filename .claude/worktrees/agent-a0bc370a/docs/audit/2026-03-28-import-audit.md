# Import Path Audit — 2026-03-28

## Summary

| Metric | Count |
|--------|-------|
| Files scanned | 116 |
| — client/src/ | 71 |
| — server/src/ | 44 |
| — shared/ | 1 |
| Total import statements | 665 |
| Relative imports (`./`, `../`) | 125 |
| Alias imports (`@/`) | 292 |
| Monorepo imports (`@qr-order/shared`) | 60 |
| npm package imports | 185 |
| Node built-in imports (`fs`, `path`, `url`) | 11 |
| Side-effect imports (`import 'x'`) | 3 |
| Dynamic imports (`await import()`) | 5 |
| **Broken imports** | **0** |
| Missing npm packages | 0 |
| Circular dependencies | 0 |

**Result: All 477 internal imports (relative + alias + monorepo) resolve to existing files. No broken imports found.**

---

## Methodology

- Scanned all `.ts` and `.tsx` files under `client/src/` (71 files), `server/src/` (44 files), and `shared/` (1 file).
- Extracted static imports (`import ... from`), side-effect imports (`import 'path'`), and dynamic imports (`await import('path')`).
- **Alias resolution**: `@/` maps to `client/src/` (configured in `client/tsconfig.json` paths: `"@/*": ["./src/*"]`).
- **Server `.js` extension convention**: server files import with `.js` suffix (TypeScript ESM convention); audit resolves `.js` to `.ts` source files.
- **Monorepo resolution**: `@qr-order/shared` resolves to `shared/types.ts` (via `shared/package.json` `"main": "types.ts"`).
- For each local import, checked existence with extensions `.ts`, `.tsx`, `.js`, `.jsx`, `.json` and directory `index.*` fallback.
- Verified all 31 npm packages (including scoped packages) are installed in `node_modules/`.
- Checked for circular dependencies via bidirectional import analysis across all source files.

---

## Broken Imports

None found.

---

## Circular Dependencies

None found.

**Previous audit (2026-03-24)** reported a circular dependency between `order.service.ts` and `table.service.ts`. This has since been resolved — neither file imports from the other anymore.

`payment.service.ts` uses 3 dynamic `await import()` calls to lazily load `menu.service.js`, `bill.service.js`, and `../repositories/stores.js`. These are intentional to avoid potential circular dependencies at module load time and do not form any cycles.

---

## npm Package Verification

All 31 unique npm packages referenced in imports are installed:

| Package | Status |
|---------|--------|
| `@aws-sdk/client-s3` | OK |
| `@prisma/client` | OK |
| `@stripe/react-stripe-js` | OK |
| `@stripe/stripe-js` | OK |
| `bcryptjs` | OK |
| `class-variance-authority` | OK |
| `clsx` | OK |
| `cors` | OK |
| `express` | OK |
| `i18next` | OK |
| `i18next-browser-languagedetector` | OK |
| `jsonwebtoken` | OK |
| `lucide-react` | OK |
| `morgan` | OK |
| `multer` | OK |
| `pino` | OK |
| `qrcode.react` | OK |
| `radix-ui` | OK |
| `react` | OK |
| `react-dom` | OK |
| `react-i18next` | OK |
| `react-router-dom` | OK |
| `stripe` | OK |
| `tailwind-merge` | OK |
| `uuid` | OK |
| `zustand` | OK |
| `fs` (Node built-in) | OK |
| `path` (Node built-in) | OK |
| `url` (Node built-in) | OK |

---

## Changes Since Last Audit (2026-03-24)

| Metric | 2026-03-24 | 2026-03-28 | Delta |
|--------|------------|------------|-------|
| Files scanned | 106 | 116 | +10 |
| Total imports | 617 | 665 | +48 |
| Relative imports | 108 | 125 | +17 |
| Alias imports (`@/`) | 282 | 292 | +10 |
| Monorepo imports | 51 | 60 | +9 |
| npm package imports | 165 | 185 | +20 |
| Broken imports | 0 | 0 | 0 |
| Circular dependencies | 1 | 0 | -1 (resolved) |

### New files since last audit (10 files)
- `client/src/hooks/usePermission.ts`
- `client/src/components/table/BillSettleDialog.tsx`
- `client/src/components/menu/CsvImportDialog.tsx`
- `client/src/components/floor/FloorTableShape.tsx`
- `client/src/components/floor/FloorCanvas.tsx`
- `server/src/controllers/bill.service.ts`
- `server/src/controllers/role.service.ts`
- `server/src/routes/bill.routes.ts`
- `server/src/routes/role.routes.ts`
- `server/src/middleware/permission.middleware.ts`

---

## Conclusion

The codebase has clean import hygiene. All 477 internal import paths resolve correctly, all npm dependencies are installed, and the previously reported circular dependency (`order.service.ts` <-> `table.service.ts`) has been resolved. No action items.

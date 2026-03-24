# Hardcode Audit — 2026-03-21

Scan scope: `client/src/**/*.{ts,tsx}` + `server/src/**/*.{ts,tsx}`
Excludes: `node_modules`, `*.d.ts`, `prisma/seed.ts`, `scripts/seed-features.ts` (seed data is intentionally hardcoded)

---

## 1. Server Port

| File | Line | Hardcoded Value | Suggested Env Variable |
|------|------|----------------|----------------------|
| `server/src/server.ts` | 4 | `const PORT = 3001` | `PORT` (already conventional; change to `process.env.PORT \|\| 3001`) |

---

## 2. CORS Origin Unrestricted

| File | Line | Hardcoded Value | Suggested Env Variable |
|------|------|----------------|----------------------|
| `server/src/app.ts` | 23 | `app.use(cors())` — no origin restriction | `CORS_ORIGIN` (e.g. `cors({ origin: process.env.CORS_ORIGIN })`) |

---

## 3. Currency Hardcoded as `'usd'`

| File | Line | Hardcoded Value | Suggested Env Variable |
|------|------|----------------|----------------------|
| `server/src/controllers/payment.service.ts` | 45 | `currency: 'usd'` | `DEFAULT_CURRENCY` |
| `server/src/controllers/payment.service.ts` | 71 | `currency: 'usd'` | `DEFAULT_CURRENCY` |

---

## 4. Currency Symbol Hardcoded as `$`

| File | Line | Hardcoded Value | Suggested Env Variable |
|------|------|----------------|----------------------|
| `client/src/lib/format.ts` | 8 | `` return `$${formatPrice(cents)}` `` | `VITE_CURRENCY_SYMBOL` (or derive from locale/currency config) |

---

## 5. JWT Token Expiry

| File | Line | Hardcoded Value | Suggested Env Variable |
|------|------|----------------|----------------------|
| `server/src/controllers/auth.controller.ts` | 11 | `const TOKEN_EXPIRY = '7d'` | `JWT_EXPIRY` |

---

## 6. S3 Bucket Fallback

| File | Line | Hardcoded Value | Suggested Env Variable |
|------|------|----------------|----------------------|
| `server/src/lib/s3.ts` | 4 | `process.env.AWS_S3_BUCKET \|\| 'qr-restaurant-images'` — should throw if missing, not fallback | `AWS_S3_BUCKET` (make required, no fallback) |

---

## 7. S3 Region Fallback

| File | Line | Hardcoded Value | Suggested Env Variable |
|------|------|----------------|----------------------|
| `server/src/lib/s3.ts` | 3 | `process.env.AWS_REGION \|\| 'us-east-1'` — should throw if missing, not fallback | `AWS_REGION` (make required, no fallback) |

---

## 8. S3 URL Pattern Hardcoded (No CDN Support)

| File | Line | Hardcoded Value | Suggested Env Variable |
|------|------|----------------|----------------------|
| `server/src/lib/s3.ts` | 30 | `` `https://${bucket}.s3.${region}.amazonaws.com/${key}` `` | `CDN_BASE_URL` (to support CloudFront or other CDN in front of S3) |

---

## 9. S3 Upload Path Prefix

| File | Line | Hardcoded Value | Suggested Env Variable |
|------|------|----------------|----------------------|
| `server/src/lib/s3.ts` | 19 | `const key = \`menu-images/${Date.now()}-${filename}\`` | `S3_KEY_PREFIX` (optional, low priority) |

---

## 10. Vite Dev Proxy Target

| File | Line | Hardcoded Value | Suggested Env Variable |
|------|------|----------------|----------------------|
| `client/vite.config.ts` | 17 | `'/api': 'http://localhost:3001'` | `VITE_API_URL` (or keep as dev-only default, acceptable for dev config) |

---

## 11. Bcrypt Salt Rounds

| File | Line | Hardcoded Value | Suggested Env Variable |
|------|------|----------------|----------------------|
| `server/src/controllers/staff.service.ts` | 42 | `bcrypt.hash(password, 10)` | `BCRYPT_SALT_ROUNDS` (low priority; 10 is standard default) |

---

## 12. Tax & Service Charge Rates (Business Logic Hardcoded)

| File | Line | Hardcoded Value | Suggested Config |
|------|------|----------------|-----------------|
| `client/src/pages/admin/TablesPage.tsx` | 229 | `Service (10%)` + `Math.round(subtotal * 0.1)` | Store-level config: `serviceChargeRate` |
| `client/src/pages/admin/TablesPage.tsx` | 230 | `Tax (5%)` + `Math.round(subtotal * 0.05)` | Store-level config: `taxRate` |
| `client/src/pages/admin/TablesPage.tsx` | 232 | `Math.round(subtotal * 1.15)` (10% + 5% combined) | Derived from `serviceChargeRate + taxRate` |
| `client/src/pages/admin/MenuManagePage.tsx` | 210 | `Math.round(sub * 0.08)` (8% tax) | Store-level config: `taxRate` |
| `client/src/pages/admin/MenuManagePage.tsx` | 270 | `Tax (8%)` display string | Store-level config: `taxRate` |

Note: TablesPage uses 10% service + 5% tax, while MenuManagePage uses 8% tax only. These are inconsistent and should come from a centralized store config.

---

## 13. Script Fallback URL

| File | Line | Hardcoded Value | Suggested Env Variable |
|------|------|----------------|----------------------|
| `server/src/scripts/print-table-urls.ts` | 10 | `'http://localhost:5173'` (fallback BASE_URL) | Acceptable for CLI script (takes argv); no change needed |

---

## 14. Stripe API Version

| File | Line | Hardcoded Value | Suggested Env Variable |
|------|------|----------------|----------------------|
| `server/src/lib/stripe.ts` | 9 | `apiVersion: '2026-02-25.clover'` | Not recommended to env-ify; API version should be pinned in code. No action needed. |

---

## 15. Upload File Size Limit

| File | Line | Hardcoded Value | Suggested Env Variable |
|------|------|----------------|----------------------|
| `server/src/routes/upload.routes.ts` | 9 | `const MAX_SIZE = 5 * 1024 * 1024` (5MB) | `UPLOAD_MAX_SIZE_MB` (low priority) |

---

## 16. LoginPage Placeholder StoreId

| File | Line | Hardcoded Value | Suggested Config |
|------|------|----------------|-----------------|
| `client/src/pages/admin/LoginPage.tsx` | 73 | `placeholder="e.g. store-demo-002"` | UI placeholder only; acceptable for demo. No env needed. |

---

## Summary by Priority

### Must Fix (Security / Production Blocker)

| # | Issue | File(s) |
|---|-------|---------|
| 2 | CORS origin unrestricted | `server/src/app.ts:23` |
| 6 | S3 bucket uses fallback instead of throwing | `server/src/lib/s3.ts:4` |
| 7 | S3 region uses fallback instead of throwing | `server/src/lib/s3.ts:3` |

### Should Fix (Configuration Flexibility)

| # | Issue | File(s) |
|---|-------|---------|
| 1 | Server port hardcoded | `server/src/server.ts:4` |
| 3 | Currency hardcoded as `'usd'` | `server/src/controllers/payment.service.ts:45,71` |
| 4 | Currency symbol hardcoded as `$` | `client/src/lib/format.ts:8` |
| 5 | JWT expiry hardcoded as `'7d'` | `server/src/controllers/auth.controller.ts:11` |
| 8 | S3 URL pattern doesn't support CDN | `server/src/lib/s3.ts:30` |
| 12 | Tax/service rates hardcoded with inconsistent values | `client/src/pages/admin/TablesPage.tsx:229-232`, `client/src/pages/admin/MenuManagePage.tsx:210,270` |

### Low Priority (Nice to Have)

| # | Issue | File(s) |
|---|-------|---------|
| 9 | S3 upload path prefix | `server/src/lib/s3.ts:19` |
| 10 | Vite dev proxy target | `client/vite.config.ts:17` |
| 11 | Bcrypt salt rounds | `server/src/controllers/staff.service.ts:42` |
| 15 | Upload file size limit | `server/src/routes/upload.routes.ts:9` |

### No Action Needed

| # | Issue | Reason |
|---|-------|--------|
| 13 | Script fallback URL | CLI tool, accepts argv override |
| 14 | Stripe API version | Should be pinned in code, not configurable |
| 16 | LoginPage placeholder | UI hint text, not a config value |

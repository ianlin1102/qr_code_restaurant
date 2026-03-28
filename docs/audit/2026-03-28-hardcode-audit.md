# Hardcode Audit — 2026-03-28

Scan scope: `client/src/**/*.{ts,tsx}` and `server/src/**/*.{ts,tsx}` (excluding `node_modules`, `seed.ts`, `seed-features.ts` seed scripts).

---

## CRITICAL: Leaked Secrets in Root `.env`

The root `.env` file contains **real AWS credentials, Stripe secret key, and webhook secret** in plaintext. While `.env` is in `.gitignore` and not tracked by git, these secrets should be rotated if they were ever committed or shared.

| File | Line | Value | Action |
|------|------|-------|--------|
| `.env` | 1 | `AWS_ACCESS_KEY_ID=AKIA...` (real key) | Rotate immediately if ever exposed |
| `.env` | 2 | `AWS_SECRET_ACCESS_KEY=/t4Hb...` (real key) | Rotate immediately if ever exposed |
| `.env` | 3 | `STRIPE_SECRET_KEY=sk_test_51T...` (real test key) | Ensure this is test mode only |
| `.env` | 4 | `STRIPE_WEBHOOK_SECRET=whsec_b678...` (real secret) | Rotate if ever exposed |

---

## 1. Hardcoded Currency

| File | Line | Content | Suggested Env Variable |
|------|------|---------|----------------------|
| `server/src/controllers/payment.service.ts` | 84 | `currency: 'usd'` | `DEFAULT_CURRENCY` |
| `server/src/controllers/payment.service.ts` | 129 | `currency: 'usd'` | `DEFAULT_CURRENCY` |
| `server/src/controllers/payment.service.ts` | 155 | `currency: 'usd'` | `DEFAULT_CURRENCY` |
| `client/src/lib/format.ts` | 8 | `` `$${formatPrice(cents)}` `` (hardcoded `$` symbol) | `VITE_CURRENCY_SYMBOL` or derive from locale |

**Impact**: Cannot support non-USD stores without code changes. All three Stripe `paymentIntents.create` calls and the frontend formatter are locked to USD.

---

## 2. Hardcoded Tax / Service Fee Rates

| File | Line | Content | Suggested Env Variable |
|------|------|---------|----------------------|
| `client/src/pages/admin/TablesPage.tsx` | 366 | `subtotal * 0.1` (10% service fee) | `VITE_SERVICE_FEE_RATE` |
| `client/src/pages/admin/TablesPage.tsx` | 367 | `subtotal * 0.05` (5% tax) | `VITE_TAX_RATE` |
| `client/src/pages/admin/TablesPage.tsx` | 284, 369 | `subtotal * 1.15` (10% + 5% combined) | Derive from above two |
| `client/src/pages/admin/MenuManagePage.tsx` | 244 | `sub * 0.08` (8% tax) | `VITE_TAX_RATE` |
| `client/src/i18n/admin.ts` | 55 | `taxPercent: '税 (8%)'` | Should display actual rate |
| `client/src/i18n/admin.ts` | 315 | `taxPercent: 'Tax (8%)'` | Should display actual rate |
| `client/src/i18n/admin.ts` | 79 | `serviceFee: '服务费 (10%)', taxFee: '税费 (5%)'` | Should display actual rates |
| `client/src/i18n/admin.ts` | 339 | `serviceFee: 'Service (10%)', taxFee: 'Tax (5%)'` | Should display actual rates |

**Impact**: Tax/service rates are inconsistent across pages (TablesPage uses 10%+5%, MenuManagePage uses 8%), and changing rates requires editing multiple files. These should be store-level configuration.

---

## 3. Hardcoded Port Numbers

| File | Line | Content | Suggested Env Variable |
|------|------|---------|----------------------|
| `server/src/server.ts` | 4 | `const PORT = 3001` | `PORT` (already standard) |
| `client/vite.config.ts` | 17 | `'/api': 'http://localhost:3001'` | `VITE_API_URL` or read from env |
| `server/src/scripts/print-table-urls.ts` | 10 | `'http://localhost:5173'` (fallback) | `BASE_URL` env var (already accepts argv) |

**Impact**: Changing the server port requires editing both `server.ts` and `vite.config.ts`. The server should read `PORT` from env (standard practice).

---

## 4. Hardcoded Tip Presets

| File | Line | Content | Suggested Config |
|------|------|---------|-----------------|
| `client/src/components/shared/TipSelector.tsx` | 6 | `const TIP_PRESETS = [15, 18, 20]` | Store-level config or `VITE_TIP_PRESETS` |

**Impact**: Different restaurants may want different tip options (e.g., 10/15/20 vs 15/18/20/25). Should be configurable per store.

---

## 5. S3 Configuration Fallbacks

| File | Line | Content | Suggested Fix |
|------|------|---------|--------------|
| `server/src/lib/s3.ts` | 3 | `process.env.AWS_REGION \|\| 'us-east-1'` | Remove fallback, require `AWS_REGION` |
| `server/src/lib/s3.ts` | 4 | `process.env.AWS_S3_BUCKET \|\| 'qr-restaurant-images'` | Remove fallback, require `AWS_S3_BUCKET` |
| `server/src/lib/s3.ts` | 30 | `` `https://${bucket}.s3.${region}.amazonaws.com/${key}` `` | `CDN_BASE_URL` env var (supports CloudFront) |
| `server/src/lib/s3.ts` | 19 | `menu-images/` (S3 key prefix) | `S3_KEY_PREFIX` env var |

**Impact**: S3 fallback values mask missing env vars in production. The URL format doesn't support CDN/CloudFront.

---

## 6. JWT Token Expiry

| File | Line | Content | Suggested Env Variable |
|------|------|---------|----------------------|
| `server/src/controllers/auth.service.ts` | 12 | `const TOKEN_EXPIRY = '24h'` | `JWT_EXPIRY` |

**Impact**: Cannot adjust session duration without code change. Different deployment environments may need different expiry durations.

---

## 7. Bcrypt Salt Rounds

| File | Line | Content | Suggested Env Variable |
|------|------|---------|----------------------|
| `server/src/controllers/staff.service.ts` | 46 | `bcrypt.hash(password, 10)` | `BCRYPT_ROUNDS` |

**Impact**: Minor. Salt rounds of 10 is standard, but should be configurable for security tuning.

---

## 8. CORS Not Restricted

| File | Line | Content | Suggested Env Variable |
|------|------|---------|----------------------|
| `server/src/app.ts` | 24 | `app.use(cors())` (no origin restriction) | `CORS_ORIGIN` |

**Impact**: Any domain can make API requests. Production must restrict to the actual frontend domain.

---

## 9. File Upload Limits

| File | Line | Content | Suggested Env Variable |
|------|------|---------|----------------------|
| `server/src/routes/upload.routes.ts` | 9 | `const MAX_SIZE = 5 * 1024 * 1024` (5MB) | `MAX_UPLOAD_SIZE_MB` |
| `server/src/routes/upload.routes.ts` | 8 | `['image/jpeg', 'image/png']` | `ALLOWED_UPLOAD_TYPES` |
| `server/src/routes/menu.routes.ts` | 39 | `'Maximum 500 items per import'` (batch limit) | `MAX_BATCH_IMPORT` |

**Impact**: Low. These are reasonable defaults but should be configurable.

---

## 10. Hardcoded Bind Address

| File | Line | Content | Suggested Env Variable |
|------|------|---------|----------------------|
| `server/src/server.ts` | 6 | `app.listen(PORT, '0.0.0.0', ...)` | `HOST` or `BIND_ADDRESS` |

**Impact**: Low. `0.0.0.0` is fine for Docker but some deployments prefer `127.0.0.1`.

---

## 11. Login Placeholder with Hardcoded storeId Format

| File | Line | Content | Suggested Fix |
|------|------|---------|--------------|
| `client/src/pages/admin/LoginPage.tsx` | 67 | `placeholder="e.g. store-demo-002"` | i18n key `t.login.storeIdPlaceholder` |
| `client/src/pages/admin/LoginPage.tsx` | 77 | `placeholder="admin"` | i18n key `t.login.usernamePlaceholder` |

**Impact**: Hardcoded English placeholders in a bilingual app. The `store-demo-002` example leaks internal naming conventions.

---

## 12. Hardcoded Fallback tableId

| File | Line | Content | Suggested Fix |
|------|------|---------|--------------|
| `client/src/pages/admin/MenuManagePage.tsx` | 251 | `tableId: tableId \|\| 'admin-counter'` | Extract to constant or store config |

**Impact**: Magic string `'admin-counter'` used as fallback when admin creates orders without a table context.

---

## 13. Hardcoded Polling Intervals

| File | Line | Content | Suggested Config |
|------|------|---------|-----------------|
| `client/src/pages/admin/DashboardPage.tsx` | 11 | `const POLL_INTERVAL = 5000` | Store-level config |
| `client/src/pages/admin/FloorPlanPage.tsx` | 20 | `const POLL_INTERVAL = 10_000` | Store-level config |
| `client/src/pages/admin/TablesPage.tsx` | 22 | `const POLL = 10_000` | Store-level config |
| `client/src/components/floor/ActiveOrdersSidebar.tsx` | 19 | `const REFRESH_INTERVAL = 15_000` | Store-level config |
| `client/src/components/floor/WaitlistPanel.tsx` | 37 | `30_000` | Store-level config |
| `client/src/pages/customer/MenuPage.tsx` | 79 | `15_000` | Store-level config |

**Impact**: Low priority. Polling intervals are reasonable but inconsistent (5s/10s/15s/30s). Could be unified as a single config.

---

## 14. Hardcoded Chinese Error Messages (server)

| File | Line | Content | Suggested Fix |
|------|------|---------|--------------|
| `server/src/controllers/table.service.ts` | 140 | `` `桌台"${updates.name}"已存在` `` | Return error code, let frontend i18n handle display |

**Impact**: Server returns Chinese error messages that won't make sense to English-speaking users. Server should return error codes, not user-facing strings.

---

## 15. Hardcoded English Strings in Customer-facing Frontend

| File | Line | Content | Suggested Fix |
|------|------|---------|--------------|
| `client/src/pages/customer/MenuPage.tsx` | 295 | `lang === 'zh' ? '处理中...' : 'Loading...'` | Use `t('menu.loading')` |
| `client/src/pages/customer/MenuPage.tsx` | 296 | `lang === 'zh' ? '去付款' : 'Pay Now'` | Use `t('menu.payNow')` |

**Impact**: Manual language branching instead of using the i18n system. Fragile and inconsistent.

---

## Summary by Priority

### Immediate (security/correctness)
1. **CORS unrestricted** -- any origin can call API
2. **S3 fallback values** -- mask missing env in production
3. **Currency hardcoded to USD** -- cannot support other currencies

### High (consistency/maintainability)
4. **Tax/service rates inconsistent** -- 8% vs 10%+5% across pages, should be store-level config
5. **Port hardcoded** -- server should read `PORT` from env
6. **JWT expiry hardcoded** -- should be env-configurable
7. **S3 URL format hardcoded** -- no CDN support

### Medium (i18n/UX)
8. **Tip presets hardcoded** -- should be per-store config
9. **Login placeholders hardcoded** -- should use i18n
10. **Chinese error on server** -- should use error codes
11. **Manual language branching in MenuPage** -- should use i18n system

### Low (nice to have)
12. **Bcrypt rounds** -- standard value, rarely changed
13. **Upload limits** -- reasonable defaults
14. **Polling intervals** -- inconsistent but functional
15. **Bind address** -- `0.0.0.0` is fine for most cases
16. **`admin-counter` magic string** -- should be a named constant

---

> Generated: 2026-03-28 | Auditor: Claude hardcode-audit

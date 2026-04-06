# Module Authorization System — Design Spec

> Date: 2026-04-06
> Status: Approved
> Author: SaaS platform admin + Claude Code

## Problem

The QR Code ordering system has 8 feature domains but no mechanism for:
1. **SaaS-level licensing** — platform admin cannot control which features a store has access to
2. **Module-scoped permissions** — all stores get all 11 permissions regardless of their plan
3. **Feature isolation** — some modules (waitlist, printer) share permissions with unrelated domains (`tables:write`, `settings:read`)

## Solution: Permission Pool Intersection

Modules define **groups of permissions**. A store's licensed modules determine its **available permission pool**. The existing `requirePermission()` middleware enforces both staff permissions and module licensing with zero route changes.

### Permission Hierarchy

```
SaaS Admin → grants modules to Store (via module-licenses.json)
  → Store Owner → has all permissions within granted modules
    → Manager → subset of owner permissions
      → Waiter/Staff → further subset
```

### Architecture

```
┌─────────────────────────────────────────────────────┐
│                   SaaS Admin                         │
│         manage-modules.ts CLI                        │
│              ↓ edits                                 │
│     module-licenses.json                             │
└──────────────────────┬──────────────────────────────┘
                       │ getStoreModulePermissions()
                       ▼
┌─────────────────────────────────────────────────────┐
│                  Server Runtime                      │
│                                                      │
│  Login:  resolvePermissions()                        │
│          rolePerms ∩ modulePerms → JWT               │
│                                                      │
│  Request: requirePermission()                        │
│           ① modulePerms includes requested perms?    │
│           ② userPerms includes requested perms?      │
│           Both pass → next()                         │
└──────────────────────┬──────────────────────────────┘
                       │ JWT { permissions: [...] }
                       ▼
┌─────────────────────────────────────────────────────┐
│                  Client (Admin)                      │
│                                                      │
│  usePermission('waitlist:read')                      │
│    → JWT lacks perm → false → UI hidden              │
│                                                      │
│  StaffManagePage: permission checkboxes              │
│    → filtered by store.modules                       │
└─────────────────────────────────────────────────────┘
```

## Module Registry

Single source of truth: `shared/modules.ts`

| Module | Type | Permissions |
|--------|------|-------------|
| `core` | **Required** | `orders:read`, `orders:write`, `tables:read`, `tables:write`, `menu:read`, `menu:write`, `settings:read`, `settings:write`, `billing:read`, `billing:write` |
| `analytics` | Optional | `analytics:read` |
| `coupons` | Optional | `coupons:read`, `coupons:write` |
| `waitlist` | Optional | `waitlist:read`, `waitlist:write` |
| `staff-management` | Optional | `staff:manage` |
| `printer` | Optional | `printer:read`, `printer:write` |

**Design decisions:**
- **Split-billing is core** — fundamental payment capability, not a premium feature. "Not using" ≠ "needs to be disabled."
- **`billing:read/write` stays in core** for split-bill operations. These permissions are used by `split-bill.routes.ts` (all 6 endpoints use `tables:read/write`, not `billing:*` — `billing:read/write` is reserved for future direct billing features within core). Coupon functionality gets dedicated `coupons:read/write` (renamed from old `billing:read/write` on coupon routes).
- **Each module has dedicated permissions** — no sharing across modules. Enables clean module revocation without side effects.
- **`billing:read/write` currently unused by routes** — split-bill routes use `tables:read/write`. The `billing:*` permissions are included in core as reserved namespace for future billing features (invoicing, receipts). If not needed, they can be removed from core in a later iteration without breaking anything.

### Permission Type (16 total, up from 11)

```typescript
export type Permission =
  // core (10)
  | 'orders:read' | 'orders:write'
  | 'menu:read' | 'menu:write'
  | 'tables:read' | 'tables:write'
  | 'settings:read' | 'settings:write'
  | 'billing:read' | 'billing:write'
  // optional modules (6)
  | 'analytics:read'
  | 'coupons:read' | 'coupons:write'
  | 'waitlist:read' | 'waitlist:write'
  | 'staff:manage'
  | 'printer:read' | 'printer:write'
```

## Backend Execution Chain

### Layer 1: Login-time filtering

`resolvePermissions()` returns `rolePerms ∩ modulePerms`:

```typescript
export function resolvePermissions(storeId, roleId?, legacyRole?): Permission[] {
  const rolePerms = /* existing logic */
  const modulePerms = getStoreModulePermissions(storeId)
  return rolePerms.filter(p => modulePerms.includes(p))
}
```

### Layer 2: Request-time verification

`requirePermission()` adds 3 lines to check module permissions at request time (prevents stale JWT bypass):

```typescript
const modulePerms = getStoreModulePermissions(req.user.storeId)
if (!perms.every(p => modulePerms.includes(p))) {
  return res.status(403).json({ error: 'Feature not available for this store' })
}
```

**Error distinction:**
- `Feature not available for this store` — module not licensed (contact SaaS admin)
- `Insufficient permissions` — staff lacks permission (contact store owner)

### Module permission resolver

New file `server/src/lib/module-permissions.ts`:

```typescript
export function getStoreModulePermissions(storeId: string): Permission[] {
  const license = moduleLicenseStore.getById(storeId)

  if (!license) {
    // Backward compat: stores without a record get all modules
    return ALL_MODULE_PERMISSIONS
  }

  const moduleIds = license.modules
  if (!moduleIds.includes('core')) moduleIds.push('core')
  return moduleIds.flatMap(id => MODULE_REGISTRY[id]?.permissions ?? [])
}
```

### Route permission renames (14 total)

**waitlist.routes.ts** (5 changes):
- GET `/` : `tables:write` → `waitlist:read`
- POST `/` : `tables:write` → `waitlist:write`
- PATCH `/:entryId` : `tables:write` → `waitlist:write`
- DELETE `/:entryId` : `tables:write` → `waitlist:write`
- POST `/:entryId/seat` : `tables:write` → `waitlist:write`

**printer.routes.ts** (3 changes):
- GET `/config` : `settings:read` → `printer:read`
- PUT `/config` : `settings:write` → `printer:write`
- POST `/print/:orderId` : `orders:write` → `printer:write`

**coupon.routes.ts** (4 changes):
- GET `/` : `billing:read` → `coupons:read`
- POST `/` : `billing:write` → `coupons:write`
- PUT `/:couponId` : `billing:write` → `coupons:write`
- DELETE `/:couponId` : `billing:write` → `coupons:write`

**session.routes.ts** (2 changes):
- POST `/:sessionId/apply-coupon` : `billing:write` → `coupons:write`
- DELETE `/:sessionId/coupon` : `billing:write` → `coupons:write`

### System role defaults

```typescript
const ALL_PERMISSIONS: Permission[] = [
  'orders:read', 'orders:write', 'tables:read', 'tables:write',
  'menu:read', 'menu:write', 'settings:read', 'settings:write',
  'billing:read', 'billing:write',
  'analytics:read',
  'coupons:read', 'coupons:write',
  'waitlist:read', 'waitlist:write',
  'staff:manage',
  'printer:read', 'printer:write',
]

const WAITER_PERMISSIONS = [
  'orders:read', 'orders:write', 'menu:read',
  'tables:read', 'tables:write',
  'waitlist:read', 'printer:write',
]

const MANAGER_PERMISSIONS = ALL_PERMISSIONS.filter(p => p !== 'staff:manage')
```

## Frontend

### Zero-change mechanism

JWT is already filtered at login time. Existing `usePermission()` hook returns false for unlicensed module permissions. UI elements hide automatically.

### Files that need changes

| File | Change | Type |
|------|--------|------|
| `AdminLayout.tsx` | Nav item `perm` field renames (waitlist, coupons) | String replace |
| `MorePage.tsx` | Menu item `perm` field renames | String replace |
| `StaffManagePage.tsx` | Expand permission checkbox list + filter by store modules | Small logic |
| `usePermission.ts` | Update `WAITER_PERMISSIONS` fallback | String replace |

### Customer-facing pages: no changes

All customer features (ordering, cart, checkout, split-billing) are core. No module checks needed on customer side.

## SaaS Admin Management (MVP)

### Storage

`server/data/module-licenses.json`:
```json
{
  "store-001": {
    "modules": ["core", "analytics", "staff-management", "printer"],
    "grantedAt": "2026-04-05T00:00:00Z",
    "note": "Pro plan"
  }
}
```

### CLI script

`server/src/scripts/manage-modules.ts`:
```bash
npx tsx scripts/manage-modules.ts list <storeId>
npx tsx scripts/manage-modules.ts grant <storeId> <module1> [module2...]
npx tsx scripts/manage-modules.ts revoke <storeId> <module1> [module2...]
npx tsx scripts/manage-modules.ts list-all
```

### New store default

Stores without a record in `module-licenses.json`:
- **Existing stores:** All modules (backward compatibility)
- **New stores:** Should be granted modules explicitly via CLI

## Data Migration

### Permission rename: `billing:read/write` → `coupons:read/write`

One-time migration script `server/src/scripts/migrate-permissions.ts`:
1. Scan all `RoleDefinition` records in staff.json
2. Replace `billing:read` → `coupons:read`, `billing:write` → `coupons:write`
3. System roles auto-update via `ensureSystemRoles()` on restart

### Existing store backfill

Run CLI to generate module-licenses.json entries for all existing stores with full module access.

### Legacy JWT handling

`resolvePermissions()` fallback already handles old tokens. During 24h transition window (JWT expiry), request-time module check provides safety net.

## File Inventory

### New files (5)

| File | Purpose |
|------|---------|
| `shared/modules.ts` | MODULE_REGISTRY definition |
| `server/data/module-licenses.json` | Module license data |
| `server/src/lib/module-permissions.ts` | `getStoreModulePermissions()` |
| `server/src/scripts/manage-modules.ts` | CLI management script |
| `server/src/scripts/migrate-permissions.ts` | One-time migration |

### Modified files (12)

| File | Change |
|------|--------|
| `shared/types.ts` | Permission type 11→16 |
| `server/src/repositories/stores.ts` | Add moduleLicenseStore instance |
| `server/src/controllers/role.service.ts` | resolvePermissions() intersection + role defaults |
| `server/src/middleware/permission.middleware.ts` | +3 lines request-time module check |
| `server/src/routes/waitlist.routes.ts` | 5x permission name replace |
| `server/src/routes/printer.routes.ts` | 3x permission name replace |
| `server/src/routes/coupon.routes.ts` | 4x permission name replace |
| `server/src/routes/session.routes.ts` | 2x permission name replace |
| `client/src/hooks/usePermission.ts` | WAITER_PERMISSIONS update |
| `client/src/components/layout/AdminLayout.tsx` | Nav perm field renames |
| `client/src/pages/admin/MorePage.tsx` | Perm field renames |
| `client/src/pages/admin/StaffManagePage.tsx` | Permission checkboxes + module filter |

## Test Coverage

| Test | Scope |
|------|-------|
| MODULE_REGISTRY integrity | Every permission belongs to exactly one module, no gaps, no duplicates |
| `getStoreModulePermissions()` | core-only store, all-modules store, no-record store (backward compat) |
| `resolvePermissions()` intersection | owner + limited modules = only module permissions returned |
| `requirePermission()` dual-layer | stale JWT + revoked module = 403 "Feature not available" |
| Route permission renames | waitlist/printer/coupon endpoints use new permission names |
| Migration script | `billing:read` → `coupons:read` replacement correctness |

## Design Decisions Log

| Decision | Rationale |
|----------|-----------|
| Permission pool intersection over explicit `requireModule()` middleware | Zero route changes (70+ endpoints untouched); same security guarantees |
| Dedicated permissions per module (no sharing) | Clean module revocation; self-documenting permission names |
| Split-billing in core | Fundamental payment capability; "not using" ≠ "needs to be disabled" |
| `billing:read/write` (core) + `coupons:read/write` (optional) | Split-billing uses billing perms; coupon functionality is independent |
| JSON file for module licenses (MVP) | Consistent with existing JsonStore pattern; low-frequency writes; migrate to PostgreSQL later |
| Backward compat: no record = all modules | Existing stores keep working without migration; explicit records added incrementally |
| Request-time module check in requirePermission | Prevents stale JWT from accessing revoked modules; immediate revocation effect |
| Customer-facing pages: no module checks | All customer features are core; no optional module UI exists on customer side |

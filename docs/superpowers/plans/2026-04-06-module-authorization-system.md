# Module Authorization System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement SaaS-level module licensing that constrains store permissions via a permission pool intersection pattern.

**Architecture:** Modules define permission groups. A store's licensed modules determine its available permission pool. `resolvePermissions()` intersects role permissions with module permissions at login time. `requirePermission()` adds a request-time module check as defense-in-depth. Frontend `usePermission()` works unchanged.

**Tech Stack:** TypeScript, Express middleware, JsonStore, Zustand (existing), Vitest

**Spec:** `docs/superpowers/specs/2026-04-06-module-authorization-system-design.md`

---

## Parallelization Map

```
Phase 1: Task 1 → Task 2 (sequential, foundation)
Phase 2: Task 3A ║ Task 3B ║ Task 3C (parallel, independent tracks)
Phase 3: Task 4 → Task 5 → Task 6 (sequential, depends on Phase 2)
Phase 4: Task 7 ║ Task 8 (parallel, scripts)
Phase 5: Task 9 (tests)
Phase 6: Task 10 (migration + final verification)
```

---

## Phase 1: Foundation (sequential)

### Task 1: Update Permission type

**Files:**
- Modify: `shared/types.ts:27-34`

- [ ] **Step 1: Update Permission union type from 11 to 16 permissions**

```typescript
// shared/types.ts — replace lines 27-34
export type Permission =
  // core
  | 'orders:read' | 'orders:write'
  | 'menu:read' | 'menu:write'
  | 'tables:read' | 'tables:write'
  | 'settings:read' | 'settings:write'
  | 'billing:read' | 'billing:write'
  // analytics module
  | 'analytics:read'
  // coupons module
  | 'coupons:read' | 'coupons:write'
  // waitlist module
  | 'waitlist:read' | 'waitlist:write'
  // staff-management module
  | 'staff:manage'
  // printer module
  | 'printer:read' | 'printer:write'
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd shared && npx tsc --noEmit`
Expected: 0 errors (new permissions are additive, no consumers break)

- [ ] **Step 3: Commit**

```bash
git add shared/types.ts
git commit -m "feat: expand Permission type to 16 permissions (waitlist, printer, coupons)"
```

---

### Task 2: Create MODULE_REGISTRY

**Files:**
- Create: `shared/modules.ts`
- Modify: `shared/package.json:6-9` (add export)

- [ ] **Step 1: Create shared/modules.ts**

```typescript
// shared/modules.ts
import type { Permission } from './types'

export const MODULE_REGISTRY = {
  core: {
    name: 'Core',
    required: true,
    permissions: [
      'orders:read', 'orders:write',
      'tables:read', 'tables:write',
      'menu:read', 'menu:write',
      'settings:read', 'settings:write',
      'billing:read', 'billing:write',
    ] as Permission[],
  },
  analytics: {
    name: 'Analytics',
    required: false,
    permissions: ['analytics:read'] as Permission[],
  },
  coupons: {
    name: 'Coupons',
    required: false,
    permissions: ['coupons:read', 'coupons:write'] as Permission[],
  },
  waitlist: {
    name: 'Waitlist',
    required: false,
    permissions: ['waitlist:read', 'waitlist:write'] as Permission[],
  },
  'staff-management': {
    name: 'Staff Management',
    required: false,
    permissions: ['staff:manage'] as Permission[],
  },
  printer: {
    name: 'Printer',
    required: false,
    permissions: ['printer:read', 'printer:write'] as Permission[],
  },
} as const

export type ModuleId = keyof typeof MODULE_REGISTRY

/** All permissions across all modules */
export const ALL_MODULE_PERMISSIONS: Permission[] = Object.values(MODULE_REGISTRY)
  .flatMap(m => [...m.permissions])

/** Get permissions unlocked by a set of modules */
export function getModulePermissions(moduleIds: ModuleId[]): Permission[] {
  const ids = moduleIds.includes('core') ? moduleIds : ['core' as ModuleId, ...moduleIds]
  return ids.flatMap(id => [...(MODULE_REGISTRY[id]?.permissions ?? [])])
}
```

- [ ] **Step 2: Add subpath export to shared/package.json**

Add `"./modules": "./modules.ts"` to exports map:

```json
"exports": {
  ".": "./types.ts",
  "./pricing": "./pricing/index.ts",
  "./modules": "./modules.ts"
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd shared && npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
git add shared/modules.ts shared/package.json
git commit -m "feat: add MODULE_REGISTRY with 6 modules and permission mapping"
```

---

## Phase 2: Parallel Tracks (3 independent tracks)

### Task 3A: Server infrastructure — module license store & resolver

**Files:**
- Create: `server/data/module-licenses.json`
- Modify: `server/src/repositories/stores.ts:15` (add store instance)
- Create: `server/src/lib/module-permissions.ts`

**Depends on:** Task 1, Task 2
**Parallel with:** Task 3B, Task 3C

- [ ] **Step 1: Create module-licenses.json with empty object**

```json
{}
```

- [ ] **Step 2: Add moduleLicenseStore to repositories/stores.ts**

After the last JsonStore instantiation (line 15), add:

```typescript
export const moduleLicenseStore = new JsonStore<{
  modules: string[]
  grantedAt: string
  note?: string
}>('module-licenses.json')
```

- [ ] **Step 3: Create server/src/lib/module-permissions.ts**

```typescript
import type { Permission } from '@qr-order/shared'
import { MODULE_REGISTRY, ALL_MODULE_PERMISSIONS, getModulePermissions } from '@qr-order/shared/modules'
import type { ModuleId } from '@qr-order/shared/modules'
import { moduleLicenseStore } from '../repositories/stores'

/**
 * Get the permission pool for a store based on its licensed modules.
 * Stores without a license record get all permissions (backward compat).
 */
export function getStoreModulePermissions(storeId: string): Permission[] {
  const license = moduleLicenseStore.getById(storeId)

  if (!license) {
    // Backward compat: existing stores without record get all modules
    return [...ALL_MODULE_PERMISSIONS]
  }

  const moduleIds = license.modules as ModuleId[]
  return getModulePermissions(moduleIds)
}

/**
 * Get the list of licensed module IDs for a store.
 */
export function getStoreModules(storeId: string): ModuleId[] {
  const license = moduleLicenseStore.getById(storeId)
  if (!license) {
    return Object.keys(MODULE_REGISTRY) as ModuleId[]
  }
  const ids = license.modules as ModuleId[]
  return ids.includes('core') ? ids : ['core', ...ids]
}
```

- [ ] **Step 4: Verify server compiles**

Run: `cd server && npx tsc --noEmit`
Expected: 0 new errors (pre-existing Express type errors are expected)

- [ ] **Step 5: Commit**

```bash
git add server/data/module-licenses.json server/src/repositories/stores.ts server/src/lib/module-permissions.ts
git commit -m "feat: add module license store and permission resolver"
```

---

### Task 3B: Route permission renames (server)

**Files:**
- Modify: `server/src/routes/waitlist.routes.ts:15,20,30,39,48`
- Modify: `server/src/routes/printer.routes.ts:10,20,26`
- Modify: `server/src/routes/coupon.routes.ts:14,19,42,69`
- Modify: `server/src/routes/session.routes.ts:185-197,200-208`

**Depends on:** Task 1
**Parallel with:** Task 3A, Task 3C

- [ ] **Step 1: Rename waitlist permissions (5 replacements)**

In `server/src/routes/waitlist.routes.ts`:
- Line 15: `requirePermission('tables:write')` → `requirePermission('waitlist:read')`
- Lines 20, 30, 39, 48: `requirePermission('tables:write')` → `requirePermission('waitlist:write')`

- [ ] **Step 2: Rename printer permissions (3 replacements)**

In `server/src/routes/printer.routes.ts`:
- Line 10: `requirePermission('settings:read')` → `requirePermission('printer:read')`
- Line 20: `requirePermission('settings:write')` → `requirePermission('printer:write')`
- Line 26: `requirePermission('orders:write')` → `requirePermission('printer:write')`

- [ ] **Step 3: Rename coupon permissions (4 replacements)**

In `server/src/routes/coupon.routes.ts`:
- Line 14: `requirePermission('billing:read')` → `requirePermission('coupons:read')`
- Lines 19, 42, 69: `requirePermission('billing:write')` → `requirePermission('coupons:write')`

- [ ] **Step 4: Rename session coupon permissions (2 replacements)**

In `server/src/routes/session.routes.ts`:
- ~Line 187: `requirePermission('billing:write')` → `requirePermission('coupons:write')` (apply-coupon)
- ~Line 202: `requirePermission('billing:write')` → `requirePermission('coupons:write')` (remove-coupon)

- [ ] **Step 5: Verify server compiles**

Run: `cd server && npx tsc --noEmit`
Expected: 0 new errors

- [ ] **Step 6: Commit**

```bash
git add server/src/routes/waitlist.routes.ts server/src/routes/printer.routes.ts server/src/routes/coupon.routes.ts server/src/routes/session.routes.ts
git commit -m "feat: rename route permissions for waitlist, printer, coupons modules"
```

---

### Task 3C: Client permission renames

**Files:**
- Modify: `client/src/hooks/usePermission.ts`
- Modify: `client/src/components/layout/AdminLayout.tsx:12-18`
- Modify: `client/src/pages/admin/MorePage.tsx:8-16`

**Depends on:** Task 1
**Parallel with:** Task 3A, Task 3B

- [ ] **Step 1: Update WAITER_PERMISSIONS fallback in usePermission.ts**

Find the hardcoded waiter permissions fallback array and update to:

```typescript
const WAITER_FALLBACK: Permission[] = [
  'orders:read', 'orders:write', 'menu:read',
  'tables:read', 'tables:write',
  'waitlist:read', 'printer:write',
]
```

- [ ] **Step 2: Update MorePage perm fields**

In `client/src/pages/admin/MorePage.tsx` ITEMS array:
- Coupons entry: `perm: 'billing:read'` → `perm: 'coupons:read'`
- Waitlist entry: `perm: 'tables:read'` → `perm: 'waitlist:read'`

- [ ] **Step 3: Verify client compiles**

Run: `cd client && npx tsc -b`
Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
git add client/src/hooks/usePermission.ts client/src/components/layout/AdminLayout.tsx client/src/pages/admin/MorePage.tsx
git commit -m "feat: update client permission names for module system"
```

---

## Phase 3: Core Logic (sequential, depends on Phase 2)

### Task 4: Update role.service.ts — permission constants & resolvePermissions

**Files:**
- Modify: `server/src/controllers/role.service.ts:6-23,122-135`

**Depends on:** Task 3A (module-permissions.ts)

- [ ] **Step 1: Update ALL_PERMISSIONS constant (lines 6-14)**

```typescript
const ALL_PERMISSIONS: Permission[] = [
  // core
  'orders:read', 'orders:write',
  'tables:read', 'tables:write',
  'menu:read', 'menu:write',
  'settings:read', 'settings:write',
  'billing:read', 'billing:write',
  // optional modules
  'analytics:read',
  'coupons:read', 'coupons:write',
  'waitlist:read', 'waitlist:write',
  'staff:manage',
  'printer:read', 'printer:write',
]
```

- [ ] **Step 2: Update WAITER_PERMISSIONS constant (lines 16-20)**

```typescript
const WAITER_PERMISSIONS: Permission[] = [
  'orders:read', 'orders:write',
  'menu:read',
  'tables:read', 'tables:write',
  'waitlist:read',
  'printer:write',
]
```

- [ ] **Step 3: Update resolvePermissions to intersect with module permissions (lines 122-135)**

```typescript
import { getStoreModulePermissions } from '../lib/module-permissions'

export function resolvePermissions(
  storeId: string,
  roleId?: string,
  legacyRole?: string
): Permission[] {
  let rolePerms: Permission[]

  if (roleId) {
    const role = roleStore.getById(roleId)
    if (role) {
      rolePerms = role.permissions
    } else {
      rolePerms = []
    }
  } else if (legacyRole === 'owner') {
    rolePerms = ALL_PERMISSIONS
  } else if (legacyRole === 'staff') {
    rolePerms = WAITER_PERMISSIONS
  } else {
    rolePerms = []
  }

  // Intersect with store's licensed module permissions
  const modulePerms = getStoreModulePermissions(storeId)
  return rolePerms.filter(p => modulePerms.includes(p))
}
```

- [ ] **Step 4: Verify server compiles**

Run: `cd server && npx tsc --noEmit`
Expected: 0 new errors

- [ ] **Step 5: Commit**

```bash
git add server/src/controllers/role.service.ts
git commit -m "feat: resolvePermissions intersects with store module permissions"
```

---

### Task 5: Update requirePermission middleware — request-time module check

**Files:**
- Modify: `server/src/middleware/permission.middleware.ts:5-30`

**Depends on:** Task 3A (module-permissions.ts)

- [ ] **Step 1: Add module check to requirePermission**

Add import at top of file:
```typescript
import { getStoreModulePermissions } from '../lib/module-permissions'
```

Inside the middleware function, after the `if (!req.user)` check and before the `const hasAll` line, add:

```typescript
    // Module-level check: is this feature available for this store?
    const modulePerms = getStoreModulePermissions(req.user.storeId)
    if (!perms.every(p => modulePerms.includes(p))) {
      return res.status(403).json({ error: 'Feature not available for this store' })
    }
```

- [ ] **Step 2: Verify server compiles**

Run: `cd server && npx tsc --noEmit`
Expected: 0 new errors

- [ ] **Step 3: Commit**

```bash
git add server/src/middleware/permission.middleware.ts
git commit -m "feat: add request-time module permission check in requirePermission"
```

---

### Task 6: Update StaffManagePage — module-filtered permission checkboxes

**Files:**
- Modify: `client/src/pages/admin/StaffManagePage.tsx:13-21,362-374`

**Depends on:** Task 1, Task 2

- [ ] **Step 1: Update ALL_PERMISSIONS constant (lines 13-21)**

```typescript
const ALL_PERMISSIONS: Permission[] = [
  'orders:read', 'orders:write',
  'menu:read', 'menu:write',
  'tables:read', 'tables:write',
  'settings:read', 'settings:write',
  'billing:read', 'billing:write',
  'analytics:read',
  'coupons:read', 'coupons:write',
  'waitlist:read', 'waitlist:write',
  'staff:manage',
  'printer:read', 'printer:write',
]
```

- [ ] **Step 2: Add permLabel entries for new permissions**

Find the `permLabel` function and add labels for the new permissions:

```typescript
case 'coupons:read': return t('viewCoupons', 'View Coupons')
case 'coupons:write': return t('manageCoupons', 'Manage Coupons')
case 'waitlist:read': return t('viewWaitlist', 'View Waitlist')
case 'waitlist:write': return t('manageWaitlist', 'Manage Waitlist')
case 'printer:read': return t('viewPrinter', 'View Printer Config')
case 'printer:write': return t('managePrinter', 'Print & Manage Printer')
case 'billing:read': return t('viewBilling', 'View Billing')
case 'billing:write': return t('manageBilling', 'Manage Billing')
```

Update any existing `billing:read`/`billing:write` labels to clarify they refer to billing (split-bill) not coupons.

- [ ] **Step 3: Verify client compiles**

Run: `cd client && npx tsc -b`
Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/admin/StaffManagePage.tsx
git commit -m "feat: expand permission checkboxes for module system"
```

---

## Phase 4: Scripts (parallel)

### Task 7: Create manage-modules CLI script

**Files:**
- Create: `server/src/scripts/manage-modules.ts`

**Depends on:** Task 3A

- [ ] **Step 1: Create the CLI script**

```typescript
// server/src/scripts/manage-modules.ts
import { moduleLicenseStore } from '../repositories/stores'
import { MODULE_REGISTRY } from '@qr-order/shared/modules'
import type { ModuleId } from '@qr-order/shared/modules'

const VALID_MODULES = Object.keys(MODULE_REGISTRY) as ModuleId[]

function usage() {
  console.log(`Usage:
  npx tsx src/scripts/manage-modules.ts list <storeId>
  npx tsx src/scripts/manage-modules.ts list-all
  npx tsx src/scripts/manage-modules.ts grant <storeId> <module1> [module2...]
  npx tsx src/scripts/manage-modules.ts revoke <storeId> <module1> [module2...]

Available modules: ${VALID_MODULES.join(', ')}`)
  process.exit(1)
}

const [,, command, storeId, ...moduleArgs] = process.argv

if (!command) usage()

function validateModules(ids: string[]): ModuleId[] {
  for (const id of ids) {
    if (!VALID_MODULES.includes(id as ModuleId)) {
      console.error(`Unknown module: "${id}". Valid modules: ${VALID_MODULES.join(', ')}`)
      process.exit(1)
    }
    if (id === 'core') {
      console.error('Cannot grant/revoke "core" — it is always included.')
      process.exit(1)
    }
  }
  return ids as ModuleId[]
}

switch (command) {
  case 'list': {
    if (!storeId) usage()
    const license = moduleLicenseStore.getById(storeId)
    if (!license) {
      console.log(`Store ${storeId}: no record (all modules by default)`)
    } else {
      console.log(`Store ${storeId}:`)
      console.log(`  Modules: ${license.modules.join(', ')}`)
      console.log(`  Granted: ${license.grantedAt}`)
      if (license.note) console.log(`  Note: ${license.note}`)
    }
    break
  }

  case 'list-all': {
    const all = moduleLicenseStore.getAll()
    if (all.length === 0) {
      console.log('No module licenses configured. All stores have full access (backward compat).')
    } else {
      for (const [id, license] of Object.entries(
        Object.fromEntries(all.map(l => [l.id, l]))
      )) {
        console.log(`${id}: ${(license as any).modules.join(', ')}`)
      }
    }
    break
  }

  case 'grant': {
    if (!storeId || moduleArgs.length === 0) usage()
    const modules = validateModules(moduleArgs)
    const existing = moduleLicenseStore.getById(storeId)
    const currentModules = existing?.modules ?? ['core']
    const newModules = [...new Set([...currentModules, ...modules])]
    if (!newModules.includes('core')) newModules.unshift('core')

    moduleLicenseStore.upsert(storeId, {
      modules: newModules,
      grantedAt: new Date().toISOString(),
      note: existing?.note,
    })
    console.log(`Granted [${modules.join(', ')}] to store ${storeId}`)
    console.log(`Current modules: ${newModules.join(', ')}`)
    break
  }

  case 'revoke': {
    if (!storeId || moduleArgs.length === 0) usage()
    const modules = validateModules(moduleArgs)
    const existing = moduleLicenseStore.getById(storeId)
    if (!existing) {
      console.error(`Store ${storeId} has no license record. Create one first with 'grant'.`)
      process.exit(1)
    }
    const newModules = existing.modules.filter(m => !modules.includes(m))
    if (!newModules.includes('core')) newModules.unshift('core')

    moduleLicenseStore.upsert(storeId, {
      modules: newModules,
      grantedAt: new Date().toISOString(),
      note: existing.note,
    })
    console.log(`Revoked [${modules.join(', ')}] from store ${storeId}`)
    console.log(`Remaining modules: ${newModules.join(', ')}`)
    break
  }

  default:
    console.error(`Unknown command: ${command}`)
    usage()
}
```

- [ ] **Step 2: Verify script compiles**

Run: `cd server && npx tsc --noEmit`
Expected: 0 new errors

- [ ] **Step 3: Commit**

```bash
git add server/src/scripts/manage-modules.ts
git commit -m "feat: add manage-modules CLI script for SaaS admin"
```

---

### Task 8: Create migrate-permissions script

**Files:**
- Create: `server/src/scripts/migrate-permissions.ts`

**Depends on:** Task 3A
**Parallel with:** Task 7

- [ ] **Step 1: Create the migration script**

```typescript
// server/src/scripts/migrate-permissions.ts
/**
 * One-time migration: rename billing:read/write → coupons:read/write
 * in all custom RoleDefinition records.
 * System roles are auto-updated by ensureSystemRoles() on restart.
 */
import { roleStore } from '../repositories/stores'

const RENAMES: Record<string, string> = {
  'billing:read': 'coupons:read',
  'billing:write': 'coupons:write',
}

console.log('Migrating permission names in role definitions...')

const roles = roleStore.getAll()
let updated = 0

for (const role of roles) {
  const newPerms = role.permissions.map(p => RENAMES[p] ?? p)
  const changed = role.permissions.some((p, i) => p !== newPerms[i])

  if (changed) {
    roleStore.upsert(role.id, { ...role, permissions: newPerms as any })
    console.log(`  Updated role "${role.name}" (${role.id}): ${role.permissions.join(',')} → ${newPerms.join(',')}`)
    updated++
  }
}

console.log(`Done. ${updated} role(s) updated, ${roles.length - updated} unchanged.`)
```

- [ ] **Step 2: Commit**

```bash
git add server/src/scripts/migrate-permissions.ts
git commit -m "feat: add one-time permission rename migration script"
```

---

## Phase 5: Tests

### Task 9: Write tests for module system

**Files:**
- Create: `shared/pricing/__tests__/modules.test.ts` (or `shared/__tests__/modules.test.ts`)
- Create: `server/src/__tests__/module-permissions.test.ts`

**Depends on:** All previous tasks

- [ ] **Step 1: Write MODULE_REGISTRY integrity tests**

Create `shared/__tests__/modules.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { MODULE_REGISTRY, ALL_MODULE_PERMISSIONS, getModulePermissions } from '../modules'
import type { ModuleId } from '../modules'

describe('MODULE_REGISTRY', () => {
  it('has core as required', () => {
    expect(MODULE_REGISTRY.core.required).toBe(true)
  })

  it('all optional modules are not required', () => {
    const optional = Object.entries(MODULE_REGISTRY)
      .filter(([id]) => id !== 'core')
    for (const [id, mod] of optional) {
      expect(mod.required, `${id} should not be required`).toBe(false)
    }
  })

  it('every permission belongs to exactly one module', () => {
    const seen = new Map<string, string>()
    for (const [modId, mod] of Object.entries(MODULE_REGISTRY)) {
      for (const perm of mod.permissions) {
        expect(seen.has(perm), `"${perm}" in both "${seen.get(perm)}" and "${modId}"`).toBe(false)
        seen.set(perm, modId)
      }
    }
  })

  it('ALL_MODULE_PERMISSIONS contains all permissions from all modules', () => {
    const expected = Object.values(MODULE_REGISTRY).flatMap(m => [...m.permissions])
    expect(ALL_MODULE_PERMISSIONS).toHaveLength(expected.length)
    for (const p of expected) {
      expect(ALL_MODULE_PERMISSIONS).toContain(p)
    }
  })

  it('ALL_MODULE_PERMISSIONS has 16 permissions', () => {
    expect(ALL_MODULE_PERMISSIONS).toHaveLength(16)
  })
})

describe('getModulePermissions', () => {
  it('core-only returns 10 permissions', () => {
    const perms = getModulePermissions(['core'])
    expect(perms).toHaveLength(10)
    expect(perms).toContain('orders:read')
    expect(perms).toContain('billing:write')
    expect(perms).not.toContain('analytics:read')
  })

  it('auto-includes core even if not specified', () => {
    const perms = getModulePermissions(['analytics' as ModuleId])
    expect(perms).toContain('orders:read') // from core
    expect(perms).toContain('analytics:read')
  })

  it('all modules returns 16 permissions', () => {
    const allIds = Object.keys(MODULE_REGISTRY) as ModuleId[]
    const perms = getModulePermissions(allIds)
    expect(perms).toHaveLength(16)
  })

  it('core + waitlist returns 12 permissions', () => {
    const perms = getModulePermissions(['core', 'waitlist'])
    expect(perms).toHaveLength(12)
    expect(perms).toContain('waitlist:read')
    expect(perms).toContain('waitlist:write')
    expect(perms).not.toContain('analytics:read')
  })

  it('handles unknown module gracefully', () => {
    const perms = getModulePermissions(['core', 'nonexistent' as ModuleId])
    expect(perms).toHaveLength(10) // only core
  })
})
```

- [ ] **Step 2: Run shared tests**

Run: `cd shared && npx vitest run`
Expected: All tests pass

- [ ] **Step 3: Write server module-permissions tests**

Create `server/src/__tests__/module-permissions.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { getStoreModulePermissions, getStoreModules } from '../lib/module-permissions'
import { moduleLicenseStore } from '../repositories/stores'

describe('getStoreModulePermissions', () => {
  beforeEach(() => {
    // Clear any test data — use internal method or set up fresh
  })

  it('returns all permissions for store with no license record (backward compat)', () => {
    const perms = getStoreModulePermissions('nonexistent-store')
    expect(perms).toHaveLength(16)
    expect(perms).toContain('analytics:read')
    expect(perms).toContain('waitlist:write')
  })

  it('returns only core permissions for core-only store', () => {
    moduleLicenseStore.upsert('test-core-only', {
      modules: ['core'],
      grantedAt: new Date().toISOString(),
    })
    const perms = getStoreModulePermissions('test-core-only')
    expect(perms).toHaveLength(10)
    expect(perms).toContain('orders:read')
    expect(perms).not.toContain('analytics:read')
    expect(perms).not.toContain('waitlist:read')
    // cleanup
    moduleLicenseStore.delete('test-core-only')
  })

  it('returns core + module permissions for licensed store', () => {
    moduleLicenseStore.upsert('test-partial', {
      modules: ['core', 'analytics', 'waitlist'],
      grantedAt: new Date().toISOString(),
    })
    const perms = getStoreModulePermissions('test-partial')
    expect(perms).toHaveLength(13) // 10 core + 1 analytics + 2 waitlist
    expect(perms).toContain('analytics:read')
    expect(perms).toContain('waitlist:read')
    expect(perms).not.toContain('coupons:read')
    expect(perms).not.toContain('printer:write')
    // cleanup
    moduleLicenseStore.delete('test-partial')
  })

  it('force-includes core even if license omits it', () => {
    moduleLicenseStore.upsert('test-no-core', {
      modules: ['analytics'],
      grantedAt: new Date().toISOString(),
    })
    const perms = getStoreModulePermissions('test-no-core')
    expect(perms).toContain('orders:read') // core auto-included
    expect(perms).toContain('analytics:read')
    // cleanup
    moduleLicenseStore.delete('test-no-core')
  })
})

describe('getStoreModules', () => {
  it('returns all modules for store with no record', () => {
    const modules = getStoreModules('nonexistent')
    expect(modules).toHaveLength(6)
    expect(modules).toContain('core')
    expect(modules).toContain('analytics')
  })

  it('returns licensed modules for configured store', () => {
    moduleLicenseStore.upsert('test-modules', {
      modules: ['core', 'printer'],
      grantedAt: new Date().toISOString(),
    })
    const modules = getStoreModules('test-modules')
    expect(modules).toContain('core')
    expect(modules).toContain('printer')
    expect(modules).not.toContain('analytics')
    // cleanup
    moduleLicenseStore.delete('test-modules')
  })
})
```

- [ ] **Step 4: Run server tests**

Run: `cd server && npx vitest run`
Expected: All tests pass

- [ ] **Step 5: Write resolvePermissions intersection test**

Add to `server/src/__tests__/module-permissions.test.ts`:

```typescript
import { resolvePermissions } from '../controllers/role.service'
import { roleStore } from '../repositories/stores'

describe('resolvePermissions with module intersection', () => {
  it('owner of core-only store gets only core permissions', () => {
    moduleLicenseStore.upsert('test-owner-core', {
      modules: ['core'],
      grantedAt: new Date().toISOString(),
    })
    const perms = resolvePermissions('test-owner-core', undefined, 'owner')
    expect(perms).toHaveLength(10)
    expect(perms).toContain('orders:read')
    expect(perms).not.toContain('analytics:read')
    expect(perms).not.toContain('waitlist:read')
    moduleLicenseStore.delete('test-owner-core')
  })

  it('owner of full-module store gets all 16 permissions', () => {
    // No record = all modules (backward compat)
    const perms = resolvePermissions('nonexistent-store', undefined, 'owner')
    expect(perms).toHaveLength(16)
  })

  it('waiter of core+waitlist store gets waitlist:read but not analytics', () => {
    moduleLicenseStore.upsert('test-waiter-store', {
      modules: ['core', 'waitlist'],
      grantedAt: new Date().toISOString(),
    })
    const perms = resolvePermissions('test-waiter-store', undefined, 'staff')
    expect(perms).toContain('orders:read')
    expect(perms).toContain('waitlist:read')
    expect(perms).not.toContain('analytics:read')
    moduleLicenseStore.delete('test-waiter-store')
  })
})
```

- [ ] **Step 6: Run all tests**

Run: `cd shared && npx vitest run && cd ../server && npx vitest run`
Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add shared/__tests__/modules.test.ts server/src/__tests__/module-permissions.test.ts
git commit -m "test: add module registry, permission resolver, and intersection tests"
```

---

## Phase 6: Migration & Final Verification

### Task 10: Run migration, Docker rebuild, end-to-end verification

**Depends on:** All previous tasks

- [ ] **Step 1: Run permission rename migration**

```bash
cd server && npx tsx src/scripts/migrate-permissions.ts
```

Expected: Reports number of roles updated.

- [ ] **Step 2: Run all tests**

```bash
cd shared && npx vitest run && cd ../server && npx vitest run
```

Expected: All tests pass.

- [ ] **Step 3: TypeScript compilation check (both projects)**

```bash
cd client && npx tsc -b && cd ../server && npx tsc --noEmit
```

Expected: 0 new errors.

- [ ] **Step 4: Docker rebuild and verify**

```bash
docker compose down && docker compose up -d --build
```

Wait for containers, then:
```bash
curl -s http://localhost:3001/api/health
```

Expected: `{"status":"ok",...}`

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete module authorization system implementation"
```

---

## Quick Reference: What Can Run in Parallel

| Phase | Tasks | Parallel? |
|-------|-------|-----------|
| 1 | Task 1 → Task 2 | Sequential |
| 2 | Task 3A, 3B, 3C | **Yes — 3 agents** |
| 3 | Task 4 → Task 5 → Task 6 | Sequential |
| 4 | Task 7, Task 8 | **Yes — 2 agents** |
| 5 | Task 9 | Single |
| 6 | Task 10 | Single |

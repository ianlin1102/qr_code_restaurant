# Phase 5 Plan — Phase D 段 2c：辅助 Repository 层（Task 23-26）

> **如何使用本文件**
>
> - 全局规则见 [`00-index.md`](./00-index.md#全局规则所有-task-遵守)
> - 本文件承接 [`phase-d-repositories.md`](./phase-d-repositories.md)（Task 16-22 在那个文件）
> - Phase D 的完整 Task 列表（16-26）跨两个文件；本文件只含段 2c 的 4 个 task
> - 本 phase 输出：4 个语义化 repository 文件（roles / coupons / waitlist / platform-admin）
> - 规则 3 严格适用：写操作 `db` 参数必填，读操作默认 `prisma`
> - 下一个 phase：Phase E（待批 2 写出）

## 为什么拆分文件（规则 8 合规记录）

`phase-d-repositories.md` 段 2b 完成时已达 **1523 行**（超 1200 软上限 323 行，文件内已声明例外）。段 2c 若继续追加 4 个 task 估算再加 ~750-850 行，合计 ~2300 行，会触发规则 8 的破防条件——"文件太长 agent 找不到自己任务 / review 疲劳"。

用户 **2026-04-17 决定拆分**（对话中选择"开一个新文件"）。本文件与 `phase-d-repositories.md` 一起构成完整 Phase D 的 11 个 repo，语义分组：

- `phase-d-repositories.md` — 段 2a（Task 16-17：store + orders 核心）+ 段 2b（Task 18-22：sessions/payments/split-bills/menu/staff）
- `phase-d-repositories-part2.md`（本文件）— 段 2c（Task 23-26：roles/coupons/waitlist/platform-admin）

**破防则回滚条件**：若本文件也超 1200 行，视为拆分不够精细，回滚为每 task 一个文件。

---

## 已完成前置

- **Phase C** 全部完成（测试 DB 就绪）
- **段 2a**：Task 16 `store.ts` / Task 17 `orders.ts`
- **段 2b**：Task 18 `sessions.ts` / Task 19 `payments.ts` / Task 20 `split-bills.ts` / Task 21 `menu.ts` / Task 22 `staff.ts`

---

## 设计前提（D53/D54/D55/D56/D57）

和 `phase-d-repositories.md` 同——不重复。关键点：

- 不动 `stores.ts` / `json-store.ts` / 任何 `routes/` / `controllers/`
- 应用照常 JsonStore 启动
- 本文件的 4 个 repo 写完后，无 controller 导入，runtime 用不到——类型/编译保证即可

---

## Task 列表

| Task | 新文件 | 核心方法 |
|---|---|---|
| 23 | `server/src/repositories/roles.ts` | `findByStoreId` / `findById` / `create` / `update` / `delete` / `ensureSystemRoles`（多步）/ **`resolveLicensedPermissions` helper**（L1 细 verify） |
| 24 | `server/src/repositories/coupons.ts` | `findActiveByCode` / `findByStoreId` / `create` / `update` / `delete` / `incrementUses` |
| 25 | `server/src/repositories/waitlist.ts` | `listWaiting` / `add` / `updateEntry` / `remove` / `markSeated`（含 estimatedWait 计算语义迁移） |
| 26 | `server/src/repositories/platform-admin.ts` | `findAdminByEmail` / `createAdmin` / `listAllStores` / `grantModules` / `revokeModules` / `updateModules`（全部走 `withPlatformContext` / BYPASSRLS） |

### 并行性

4 个 task 互不依赖，可并行或串行。推荐串行（降低 worktree 合并风险）。**Task 23 必须先做**——`resolveLicensedPermissions` helper 是 Phase E/F 多处 controller 将要调用的核心（登录流、RBAC 校验、菜单可用性），虽然 Phase D 不 wire up，但写错后续连锁。

### Review 分级（RESUME.md 已约定）

- **L1 细 verify（贴代码）**：Task 23 `resolveLicensedPermissions` helper
- **L2 spot check（贴关键片段）**：Task 23 其余部分 / Task 26 platform-admin（BYPASSRLS 语义独特）
- **汇报摘要即可**：Task 24 coupons / Task 25 waitlist（CRUD 主力）

---

## Task 23：写 `server/src/repositories/roles.ts`（含 `resolveLicensedPermissions` helper，L1 细 verify）

**Files:**
- Create: `server/src/repositories/roles.ts`

**前置**：Task 22 完成。

**设计职责**：Role entity 的语义 repo + 权限解析 helper。

**方法清单**：

- `findByStoreId(storeId, db?)`：列 Store 的所有 roles，`orderBy createdAt asc`
- `findById(id, db?)`：单行读
- `create(data, db)`：写自定义角色（`isSystem: false`）；系统角色走 `ensureSystemRoles`
- `update(id, patch, db)`：更新 name / nameEn / permissions
  - **调用方**负责 isSystem + owner 禁改校验（`role.service.ts:108`）；repo 不管
- `delete(id, db)`：物理删除
  - **调用方**负责 isSystem 禁删校验（`role.service.ts:122`）
- `ensureSystemRoles(storeId, tx)`：**多步写**——确保 owner / manager / waiter 三个系统角色存在 + owner 同步 ALL_PERMISSIONS
  - 对照 legacy `role.service.ts:33-75`
  - `TransactionClient` 必填（D55），多步且需要前后一致
- `findByName(storeId, name, db?)`：**(Phase E 段 3b 回填)** 按 name 在 store scope 内查角色——Agent B `staff.changeRole` 依赖（决策点 E：role name string → roleId 解析）
- `resolveLicensedPermissions(input, db?)`：**L1 核心 helper**
  - 签名：`(input: { storeId, roleId?, legacyRole? }, db?) => Promise<Permission[]>`
  - 语义对照 legacy `role.service.ts:130-159`：
    1. 按 roleId / legacyRole 解析出"角色权限集合" `rolePerms`
    2. 按 storeId 读 ModuleLicense → 计算"模块许可权限集合" `modulePerms`
    3. 返回 `rolePerms ∩ modulePerms`
  - 用 Prisma `include` 一次 round-trip（读 Staff → 读 Role + ModuleLicense 用 include）——Phase E/F controller 会从 Staff 开始查

**关键实现要点**：

- **SYSTEM_ROLE_PERMISSIONS 常量迁移**：`role.service.ts:7-31` 的 `ALL_PERMISSIONS` / `MANAGER_PERMISSIONS` / `WAITER_PERMISSIONS` 三个常量迁到 `server/src/repositories/roles.ts` 顶部（或抽到 `shared/role-defaults.ts`——本 task 选前者，简单直接；若 Phase E/F 发现 client 也需要再抽）
- **owner 同步语义**：legacy `role.service.ts:72-74` 在每次 `ensureSystemRoles` 调用时若 owner.permissions.length 与 ALL_PERMISSIONS 不一致则同步。迁移到 `ensureSystemRoles` repo 方法内，保留同一行为（Phase 4 新增模块时 owner 自动拿到新权限）
- **Permission 交集**：`rolePerms.filter(p => modulePerms.includes(p))` 保持 legacy 语义（`role.service.ts:158`）
- **Prisma.JsonValue 类型处理**：Role.permissions 在 Prisma schema 里是 `String[]`（或 JSONB）——Phase B Task 2 写 schema 时确认；这里 cast 成 `Permission[]`
- **规则 2**：repo 不 emit，helper 也不 emit（它是读操作）

- [ ] **Step 1：写 `server/src/repositories/roles.ts`**

```bash
cat > server/src/repositories/roles.ts <<'EOF'
/**
 * Role entity repository + licensed permission resolution helper.
 *
 * Scope:
 *   - CRUD on Role rows
 *   - System role guarantee (ensureSystemRoles) — owner/manager/waiter
 *   - Permission resolution: role perms ∩ store's licensed module perms
 *
 * NOT in scope:
 *   - isSystem guards on update/delete — caller responsibility (matches legacy
 *     role.service.ts lines 108, 122). Repo just applies the mutation.
 *   - SSE emit — repo layer never emits (rule 2)
 *
 * System role migration:
 *   ensureSystemRoles creates owner/manager/waiter if missing AND syncs owner
 *   to full ALL_PERMISSIONS on each call. Mirrors legacy role.service.ts:72-74:
 *   "Only migrate owner role — manager/waiter user-editable, don't overwrite."
 */

import { Prisma } from '@prisma/client'
import type { Role, ModuleLicense, Staff } from '@prisma/client'
import type { Permission } from '@qr-order/shared'
import { MODULE_REGISTRY, getModulePermissions } from '@qr-order/shared/modules'
import type { ModuleId } from '@qr-order/shared/modules'
import { prisma, type Db } from './prisma-client.js'

// ========== System role permission presets ==========
// Mirrored from server/src/controllers/role.service.ts:7-31 at Phase D write time.
// Owner = all permissions. Manager = all except staff:manage. Waiter = curated subset.

const ALL_PERMISSIONS: Permission[] = [
  'orders:read', 'orders:write',
  'tables:read', 'tables:write',
  'menu:read', 'menu:write',
  'settings:read', 'settings:write',
  'billing:read', 'billing:write',
  'analytics:read',
  'coupons:read', 'coupons:write',
  'waitlist:read', 'waitlist:write',
  'staff:manage',
  'printer:read', 'printer:write',
]

const MANAGER_PERMISSIONS: Permission[] =
  ALL_PERMISSIONS.filter(p => p !== 'staff:manage')

const WAITER_PERMISSIONS: Permission[] = [
  'orders:read', 'orders:write',
  'menu:read',
  'tables:read', 'tables:write',
  'waitlist:read',
  'printer:write',
]

// ========== Repo ==========

export const roleRepo = {
  findByStoreId: (storeId: string, db: Db = prisma): Promise<Role[]> =>
    db.role.findMany({
      where: { storeId },
      orderBy: { createdAt: 'asc' },
    }),

  findById: (id: string, db: Db = prisma): Promise<Role | null> =>
    db.role.findUnique({ where: { id } }),

  /**
   * Phase E 段 3b 回填: name-based lookup within a store scope.
   * Used by staff.changeRole (Agent B decision point E) to resolve legacy
   * role name strings ('owner' / 'manager' / 'waiter' / custom name) to roleId.
   */
  findByName: (
    storeId: string,
    name: string,
    db: Db = prisma
  ): Promise<Role | null> =>
    db.role.findFirst({ where: { storeId, name } }),

  /**
   * Create a custom role. isSystem=false by default (custom roles only).
   * System roles should flow through ensureSystemRoles, not this.
   *
   * Rule 3: write operation — db mandatory.
   */
  create: (
    data: {
      storeId: string
      name: string
      nameEn?: string
      permissions: Permission[]
    },
    db: Db
  ): Promise<Role> =>
    db.role.create({
      data: {
        storeId: data.storeId,
        name: data.name,
        nameEn: data.nameEn ?? null,
        permissions: data.permissions,
        isSystem: false,
      },
    }),

  /**
   * Update mutable fields. Caller enforces isSystem + owner-protection guards
   * (see role.service.ts:107-110 for legacy semantics).
   */
  update: (
    id: string,
    patch: {
      name?: string
      nameEn?: string | null
      permissions?: Permission[]
    },
    db: Db
  ): Promise<Role> =>
    db.role.update({
      where: { id },
      data: {
        ...(patch.name !== undefined && { name: patch.name }),
        ...(patch.nameEn !== undefined && { nameEn: patch.nameEn }),
        ...(patch.permissions !== undefined && {
          permissions: patch.permissions,
        }),
      },
    }),

  /**
   * Hard delete. Caller enforces isSystem guard (role.service.ts:122).
   */
  delete: (id: string, db: Db): Promise<Role> =>
    db.role.delete({ where: { id } }),

  /**
   * Idempotent: ensure owner/manager/waiter exist; sync owner to ALL_PERMISSIONS.
   *
   * Multi-step (up to 4 round-trips: read existing + up to 3 creates + owner
   * sync update) — TransactionClient required (D55).
   *
   * Legacy behavior preserved (role.service.ts:33-75):
   *   - Manager/waiter permissions NOT overwritten if they exist (user-editable)
   *   - Owner permissions ALWAYS overwritten with ALL_PERMISSIONS (Phase 4 new
   *     modules auto-grant to owner)
   */
  ensureSystemRoles: async (
    storeId: string,
    tx: Prisma.TransactionClient
  ): Promise<void> => {
    const existing = await tx.role.findMany({ where: { storeId } })
    const byName = new Map(existing.map(r => [r.name, r]))

    if (!byName.has('owner')) {
      await tx.role.create({
        data: {
          storeId,
          name: 'owner',
          nameEn: 'Owner',
          permissions: ALL_PERMISSIONS,
          isSystem: true,
        },
      })
    }
    if (!byName.has('manager')) {
      await tx.role.create({
        data: {
          storeId,
          name: 'manager',
          nameEn: 'Manager',
          permissions: MANAGER_PERMISSIONS,
          isSystem: true,
        },
      })
    }
    if (!byName.has('waiter')) {
      await tx.role.create({
        data: {
          storeId,
          name: 'waiter',
          nameEn: 'Waiter',
          permissions: WAITER_PERMISSIONS,
          isSystem: true,
        },
      })
    }

    // Owner sync (system role only — if somehow turned custom we skip defensively).
    const owner = byName.get('owner')
    if (owner && owner.isSystem) {
      const currentPerms = owner.permissions as unknown as Permission[]
      if (currentPerms.length !== ALL_PERMISSIONS.length) {
        await tx.role.update({
          where: { id: owner.id },
          data: {
            permissions: ALL_PERMISSIONS,
          },
        })
      }
    }
  },

  /**
   * L1 CORE: resolve a user's effective permissions.
   *
   * Mirrors legacy role.service.ts:130-159 (resolvePermissions):
   *   1. Determine "role permissions" from roleId OR legacyRole string
   *   2. Intersect with store's licensed module permissions
   *
   * Returns permissions the user may ACTUALLY invoke in this store (tenant's
   * license × role grant). Empty array means "no permissions resolved" — caller
   * decides whether that's a deny or an error (usually deny).
   *
   * Read operation — db defaults to prisma. Reads under tenant context thanks to RLS.
   *
   * Design note: this helper lives in roles.ts (not module-permissions.ts) because
   * the core query joins Role + ModuleLicense in a single round-trip via Prisma
   * include. Splitting across repos would force two sequential queries.
   */
  resolveLicensedPermissions: async (
    input: {
      storeId: string
      roleId?: string | null
      legacyRole?: string | null
    },
    db: Db = prisma
  ): Promise<Permission[]> => {
    // Phase 1: role permissions
    let rolePerms: Permission[] = []

    if (input.roleId) {
      const role = await db.role.findUnique({ where: { id: input.roleId } })
      if (role) {
        rolePerms = role.permissions as unknown as Permission[]
      }
    } else if (input.legacyRole === 'owner') {
      rolePerms = ALL_PERMISSIONS
    } else if (input.legacyRole === 'manager') {
      rolePerms = MANAGER_PERMISSIONS
    } else if (input.legacyRole === 'staff' || input.legacyRole === 'waiter') {
      rolePerms = WAITER_PERMISSIONS
    } else if (input.legacyRole) {
      // Unknown legacy role string — try match by name on this store's roles.
      const named = await db.role.findFirst({
        where: { storeId: input.storeId, name: input.legacyRole },
      })
      rolePerms = (named?.permissions as unknown as Permission[]) ?? []
    }

    // Early return equivalent to legacy role.service.ts:130-159: in legacy,
    // rolePerms=[] would proceed to read ModuleLicense then filter the empty
    // array → []. Result identical; we skip the extra DB round-trip.
    if (rolePerms.length === 0) return []

    // Phase 2: module license → permission pool
    const license = await db.moduleLicense.findUnique({
      where: { storeId: input.storeId },
    })

    // Backward-compat mirror of module-permissions.ts:13-15:
    // no license record → grant all module permissions.
    // Phase 5 prisma/seed.ts should create a default license for every Store,
    // so this branch is the fallback for legacy/edge data only.
    let modulePerms: Permission[]
    if (!license) {
      modulePerms = Object.values(MODULE_REGISTRY).flatMap(m => [...m.permissions])
    } else {
      const moduleIds = license.modules as ModuleId[]
      modulePerms = getModulePermissions(moduleIds)
    }

    // Phase 3: intersect
    return rolePerms.filter(p => modulePerms.includes(p))
  },
}
EOF
```

- [ ] **Step 2：验证 roles.ts 单独 tsc 过**

```bash
cd server
./node_modules/.bin/tsc --noEmit src/repositories/roles.ts 2>&1 | head
```

预期：**0 error**。

**若挂**，常见原因：
- Prisma schema 的 `Role.permissions` 字段名/类型不对（需确认 Phase B Task 2 schema 里 Role 含 `permissions` JSONB 或 `String[]`，且 isSystem/name/nameEn 齐全）
- `ModuleLicense` 在 schema 里未定义或字段名不对（`modules` 应是 `String[]`，`storeId` 上有 unique 约束让 `findUnique where: { storeId }` 可用）
- `@qr-order/shared/modules` import 路径在 server tsconfig 里未解析——需确认 path alias 配好

- [ ] **Step 3：验证整个 server tsc 依然干净**

```bash
cd server
./node_modules/.bin/tsc --noEmit 2>&1 | grep -cE "error TS"
```

预期：和 Task 22 完成时一致（新增 = 0）。

- [ ] **Step 4：commit**

```bash
cd "$(git rev-parse --show-toplevel)"
git add server/src/repositories/roles.ts
git commit -m "feat(phase-5): add roles repository + licensed-permissions helper

Phase D Task 23 — core RBAC building block (L1 focus per RESUME.md).
- CRUD (findByStoreId / findById / create / update / delete)
- ensureSystemRoles: idempotent owner/manager/waiter guarantee
  (multi-step → TransactionClient per D55)
  Owner perms always resync to ALL_PERMISSIONS (mirror role.service.ts:72-74)
- resolveLicensedPermissions helper: role perms ∩ licensed module perms
  (mirror role.service.ts:130-159 resolvePermissions)

System role permission constants (ALL/MANAGER/WAITER_PERMISSIONS) mirrored
from role.service.ts:7-31; Phase F will delete the legacy constants when
role.service.ts migrates.

roleRepo not yet imported by any controller; runtime still uses roleStore
(JsonStore). Migration happens in Phase F (staff/auth flow).

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 24：写 `server/src/repositories/coupons.ts`

**Files:**
- Create: `server/src/repositories/coupons.ts`

**前置**：Task 23 完成。

**设计职责**：Coupon entity 的 CRUD repo。纯单步写，无多步事务需求。

**方法清单**（对照 `coupon.service.ts`）：

- `findByStoreId(storeId, db?)`：列 Store 的所有 coupons
- `findById(id, db?)`：单行
- `findActiveByCode(storeId, code, db?)`：按 code 查且 `active=true` 且未过期——checkout 应用优惠券用
- `create(data, db)`：单步
- `update(id, patch, db)`：单步
- `delete(id, db)`：单步
- `incrementUses(id, db)`：单步（`currentUses += 1`）

**关键实现要点**：

- 无多步写 → 所有写方法用 `Db` 签名即可，`TransactionClient` 只在调用方处于 tx 上下文时通过
- `findActiveByCode` 的过期判断：`expiresAt IS NULL OR expiresAt > now()`——在 Prisma 用 `OR` 条件
- `incrementUses` 用 `{ increment: 1 }` 原子自增，避免 read-modify-write

- [ ] **Step 1：写 `server/src/repositories/coupons.ts`**

```bash
cat > server/src/repositories/coupons.ts <<'EOF'
/**
 * Coupon entity repository.
 *
 * Single-step CRUD — no multi-step tx required. All mutation methods use
 * atomic Prisma operations (update with increment for counter bumps).
 *
 * Scope:
 *   - Store-scoped coupons (no global/platform coupons)
 *   - findActiveByCode is the checkout-time lookup (active + non-expired)
 *   - incrementUses is atomic ({ increment: 1 })
 *
 * NOT in scope:
 *   - Discount calculation / validation (min order, max uses) — service layer
 *   - Apply-to-session flow — sessions.ts applyCouponSnapshot
 */

import type { Coupon } from '@prisma/client'
import { prisma, type Db } from './prisma-client.js'

export const couponRepo = {
  findByStoreId: (storeId: string, db: Db = prisma): Promise<Coupon[]> =>
    db.coupon.findMany({
      where: { storeId },
      orderBy: { createdAt: 'desc' },
    }),

  findById: (id: string, db: Db = prisma): Promise<Coupon | null> =>
    db.coupon.findUnique({ where: { id } }),

  /**
   * Checkout-time lookup: active coupon matching code, not past expiry.
   * Returns null if no match (unknown code, inactive, or expired).
   */
  findActiveByCode: (
    storeId: string,
    code: string,
    db: Db = prisma
  ): Promise<Coupon | null> =>
    db.coupon.findFirst({
      where: {
        storeId,
        code,
        active: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    }),

  create: (
    data: {
      storeId: string
      code: string
      discountType: string
      discountValue: number
      minOrderAmount?: number | null
      maxUses?: number | null
      active?: boolean
      expiresAt?: Date | null
    },
    db: Db
  ): Promise<Coupon> =>
    db.coupon.create({
      data: {
        storeId: data.storeId,
        code: data.code,
        discountType: data.discountType,
        discountValue: data.discountValue,
        minOrderAmount: data.minOrderAmount ?? null,
        maxUses: data.maxUses ?? null,
        currentUses: 0,
        active: data.active ?? true,
        expiresAt: data.expiresAt ?? null,
      },
    }),

  update: (
    id: string,
    patch: {
      code?: string
      discountType?: string
      discountValue?: number
      minOrderAmount?: number | null
      maxUses?: number | null
      active?: boolean
      expiresAt?: Date | null
    },
    db: Db
  ): Promise<Coupon> =>
    db.coupon.update({ where: { id }, data: patch }),

  delete: (id: string, db: Db): Promise<Coupon> =>
    db.coupon.delete({ where: { id } }),

  /**
   * Atomic bump. Used by session.applyCoupon flow after server-side validation
   * (max uses check, etc.) — repo itself doesn't enforce limits.
   */
  incrementUses: (id: string, db: Db): Promise<Coupon> =>
    db.coupon.update({
      where: { id },
      data: { currentUses: { increment: 1 } },
    }),
}
EOF
```

- [ ] **Step 2：tsc + commit**

```bash
cd server && ./node_modules/.bin/tsc --noEmit src/repositories/coupons.ts 2>&1 | head
cd "$(git rev-parse --show-toplevel)"
git add server/src/repositories/coupons.ts
git commit -m "feat(phase-5): add coupons repository

Phase D Task 24: Coupon CRUD + findActiveByCode (checkout lookup) +
atomic incrementUses. No multi-step writes — Db signatures throughout.

couponRepo not yet imported; runtime still uses JsonStore<Coupon> in
coupon.service.ts. Migration in Phase E or F.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 25：写 `server/src/repositories/waitlist.ts`

**Files:**
- Create: `server/src/repositories/waitlist.ts`

**前置**：Task 24 完成。

**设计职责**：WaitlistEntry CRUD + 等待队列查询。

**方法清单**（对照 `waitlist.service.ts`）：

- `listWaiting(storeId, db?)`：列本店 `status='waiting'`，按 createdAt asc（FIFO）
- `listAll(storeId, db?)`：列全状态（admin 历史查看）
- `findById(id, db?)`：单行
- `add(data, db)`：单步创建
  - **设计决策**：`estimatedWait` 计算（现行 `waitlist.service.ts:21-22` 用 `listWaiting.length × 15min`）迁到 service 层。repo 只接 `estimatedWait` 数字，不自己算——避免 repo 做查询的副作用计算
- `updateEntry(id, patch, db)`：更新 name / partySize / phone / status（字段开放给调用方）
- `remove(id, db)`：物理删
- `markSeated(id, db)`：状态变 `'seated'`
  - **调用方**负责状态机校验（`waitlist.service.ts:75`：仅 `waiting` → `seated` 合法）；repo 不管

**关键实现要点**：

- **规则 2**：legacy `waitlist.service.ts:36,50,63,79` 每个写操作都 `emit({ type: 'store:waitlist', storeId })`。迁移时 emit 移到调用方（service / controller），**repo 不 emit**
- 单步写全部——无 `TransactionClient` 需求
- `estimatedWait` 在 Phase 5 schema 建议仍为 `Int?`（分钟）

- [ ] **Step 1：写 `server/src/repositories/waitlist.ts`**

```bash
cat > server/src/repositories/waitlist.ts <<'EOF'
/**
 * WaitlistEntry repository.
 *
 * Scope:
 *   - CRUD + FIFO lookup of waiting entries
 *   - Status transitions (via updateEntry or markSeated)
 *
 * NOT in scope:
 *   - estimatedWait calculation (service layer — queue length × per-party minutes)
 *   - SSE emit — repo never emits (rule 2). Legacy waitlist.service.ts
 *     emitted on every mutation; Phase F caller moves emit to service layer
 *     AFTER tx commit.
 *   - Status machine validation (e.g. "only waiting → seated allowed") —
 *     caller enforces (mirror waitlist.service.ts:75).
 */

import type { WaitlistEntry } from '@prisma/client'
import { prisma, type Db } from './prisma-client.js'

export const waitlistRepo = {
  /**
   * FIFO list of entries currently waiting. This is the "active queue".
   */
  listWaiting: (storeId: string, db: Db = prisma): Promise<WaitlistEntry[]> =>
    db.waitlistEntry.findMany({
      where: { storeId, status: 'waiting' },
      orderBy: { createdAt: 'asc' },
    }),

  /**
   * Full history including seated + cancelled entries.
   */
  listAll: (storeId: string, db: Db = prisma): Promise<WaitlistEntry[]> =>
    db.waitlistEntry.findMany({
      where: { storeId },
      orderBy: { createdAt: 'desc' },
    }),

  findById: (id: string, db: Db = prisma): Promise<WaitlistEntry | null> =>
    db.waitlistEntry.findUnique({ where: { id } }),

  /**
   * Create. Caller pre-computes estimatedWait (queue length × MINUTES_PER_PARTY)
   * — repo takes it as-is. Keeps repo purely data-access, no side-effect reads.
   */
  add: (
    data: {
      storeId: string
      name: string
      partySize: number
      phone?: string | null
      estimatedWait?: number | null
    },
    db: Db
  ): Promise<WaitlistEntry> =>
    db.waitlistEntry.create({
      data: {
        storeId: data.storeId,
        name: data.name,
        partySize: data.partySize,
        phone: data.phone ?? null,
        estimatedWait: data.estimatedWait ?? null,
        status: 'waiting',
      },
    }),

  updateEntry: (
    id: string,
    patch: {
      name?: string
      partySize?: number
      phone?: string | null
      status?: 'waiting' | 'seated' | 'cancelled'
    },
    db: Db
  ): Promise<WaitlistEntry> =>
    db.waitlistEntry.update({ where: { id }, data: patch }),

  remove: (id: string, db: Db): Promise<WaitlistEntry> =>
    db.waitlistEntry.delete({ where: { id } }),

  /**
   * Shortcut for the seat action. Caller checks current status is 'waiting'
   * (see waitlist.service.ts:75 for legacy semantics).
   */
  markSeated: (id: string, db: Db): Promise<WaitlistEntry> =>
    db.waitlistEntry.update({
      where: { id },
      data: { status: 'seated' },
    }),
}
EOF
```

- [ ] **Step 2：tsc + commit**

```bash
cd server && ./node_modules/.bin/tsc --noEmit src/repositories/waitlist.ts 2>&1 | head
cd "$(git rev-parse --show-toplevel)"
git add server/src/repositories/waitlist.ts
git commit -m "feat(phase-5): add waitlist repository

Phase D Task 25: WaitlistEntry CRUD + listWaiting (FIFO active queue).
estimatedWait calculation pushed to service layer (keeps repo side-effect-free).
SSE emit also moved out per rule 2 — callers emit AFTER tx commit.

waitlistRepo not yet imported; runtime still uses JsonStore<WaitlistEntry>
in waitlist.service.ts. Migration in Phase F.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 26：写 `server/src/repositories/platform-admin.ts`（L2 spot check）

**Files:**
- Create: `server/src/repositories/platform-admin.ts`

**前置**：Task 25 完成。

**设计职责**：PlatformAdmin 身份 + ModuleLicense 授权——**两者都 bypass RLS**，走 `withPlatformContext`。

**方法清单**：

- `findAdminByEmail(email, tx)`：平台管理员登录查询
- `findAdminById(id, tx)`：session 解码后验证
- `createAdmin(data, tx)`：初始化平台管理员（seed 用）
- `updateLastLoginAt(id, at, tx)`：**(Phase F 回填 F-1)** login 成功时副作用写——`PlatformAdmin.lastLoginAt` 字段更新（Task 30 `loginPlatformAdmin` 需要）
- `listAllStores(tx)`：**BYPASSRLS**——列所有租户的 Store（平台运维仪表盘用）
  - 与 `store.ts` 的 `listAll` 冗余但语义明确：`listAllStores` 在 platform 上下文；`storeRepo.listAll` 在 tenant 上下文下只返回本租户 1 行
- `grantModules(storeId, modules, grantedBy, tx)`：全量覆盖 Store 的 ModuleLicense.modules（upsert）
- `revokeModules(storeId, removeList, tx)`：从现有 modules 里移除指定 ids——**多步读改写**
- `updateModules(storeId, modules, tx)`：等价于 `grantModules`（别名）

**关键实现要点**：

- **全部方法第二参数 `tx: Prisma.TransactionClient` 必填**——编译期强制调用方在 `withPlatformContext` 内使用
  - 例外：可能把 `findAdminByEmail` / `findAdminById` 的签名放宽——但实际调用方 JWT 验证流一定在 platform tx 中，所以保持必填更安全
- `listAllStores` 在 app_user RLS 下会只返回当前租户（非空 set_config）；只有 platform_admin (BYPASSRLS) 才真正看到全部。语义由 caller 的 withPlatformContext 保证，repo 本身不检查
- `revokeModules` 实现：读当前 license → 过滤掉 removeList → 写回。多步但放在同一 tx 即可原子
- **core 模块保护**：`revokeModules` 时即使 caller 传了 `['core']` 也静默忽略——core 是 required（`shared/modules.ts:6`）。规则：business invariant 由 repo 守住
- **授权审计**：`ModuleLicense.grantedBy` 记录做这次授权的 PlatformAdmin.id。`grantModules` / `updateModules` / `revokeModules` 都更新 `grantedAt=now()` + `grantedBy=adminId`（需要从 caller 传入 adminId）

- [ ] **Step 1：写 `server/src/repositories/platform-admin.ts`**

```bash
cat > server/src/repositories/platform-admin.ts <<'EOF'
/**
 * PlatformAdmin + ModuleLicense repository — BYPASSRLS operations.
 *
 * ALL methods in this file require a tx from withPlatformContext. The Postgres
 * role platform_admin has BYPASSRLS, letting these methods see and mutate rows
 * across all tenants. TypeScript enforces caller discipline by requiring
 * TransactionClient (D55) on every method.
 *
 * Scope:
 *   - PlatformAdmin identity (login lookup, creation for seed)
 *   - ModuleLicense grant / revoke / update
 *   - Cross-tenant Store listing (operations dashboard)
 *
 * NOT in scope:
 *   - Per-tenant Store reads — use storeRepo under tenant context
 *   - Permission checks — service layer (is this admin authorized to grant?)
 *   - JWT issuance — auth.service
 *
 * Core module protection:
 *   revokeModules silently ignores 'core' in removeList — core is required
 *   (shared/modules.ts: required: true). Revoking it would break every store.
 */

import { Prisma } from '@prisma/client'
import type { PlatformAdmin, ModuleLicense, Store } from '@prisma/client'
import type { ModuleId } from '@qr-order/shared/modules'
import { prisma, type Db } from './prisma-client.js'

// ========== PlatformAdmin ==========

export const platformAdminRepo = {
  /**
   * Login lookup. Caller must be in withPlatformContext (BYPASSRLS) —
   * platform_admins table has its own RLS policy restricting to platform role.
   */
  findAdminByEmail: (
    email: string,
    tx: Prisma.TransactionClient
  ): Promise<PlatformAdmin | null> =>
    tx.platformAdmin.findUnique({ where: { email } }),

  findAdminById: (
    id: string,
    tx: Prisma.TransactionClient
  ): Promise<PlatformAdmin | null> =>
    tx.platformAdmin.findUnique({ where: { id } }),

  /**
   * Creation: seed script + (future) platform admin onboarding UI.
   */
  createAdmin: (
    data: {
      email: string
      passwordHash: string
      displayName?: string | null
    },
    tx: Prisma.TransactionClient
  ): Promise<PlatformAdmin> =>
    tx.platformAdmin.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        displayName: data.displayName ?? null,
      },
    }),

  /**
   * Phase F 回填 F-1: login 成功副作用，更新 lastLoginAt。
   * 单步写——tx 从 platformAwareRoute 进来。
   * 失败非关键（审计由 PlatformAuditLog 独立记录）——但语义保证 login 事务一致性.
   */
  updateLastLoginAt: (
    id: string,
    at: Date,
    tx: Prisma.TransactionClient
  ): Promise<PlatformAdmin> =>
    tx.platformAdmin.update({
      where: { id },
      data: { lastLoginAt: at },
    }),

  /**
   * BYPASSRLS cross-tenant Store list. Under tenant (app_user) context, this
   * returns only the current tenant's Store row — caller must ensure platform
   * context for real multi-tenant visibility.
   */
  listAllStores: (tx: Prisma.TransactionClient): Promise<Store[]> =>
    tx.store.findMany({ orderBy: { createdAt: 'asc' } }),

  // ========== ModuleLicense ==========

  /**
   * Full-replace the Store's licensed modules. Upsert semantics: creates
   * ModuleLicense if missing (store that predates module system), else replaces
   * modules[] + bumps grantedAt/grantedBy.
   *
   * core is auto-prepended if caller omitted it (business invariant).
   */
  grantModules: async (
    storeId: string,
    modules: ModuleId[],
    grantedBy: string, // PlatformAdmin.id
    tx: Prisma.TransactionClient
  ): Promise<ModuleLicense> => {
    const normalized = modules.includes('core') ? modules : ['core', ...modules]
    return tx.moduleLicense.upsert({
      where: { storeId },
      create: {
        storeId,
        modules: normalized,
        grantedAt: new Date(),
        grantedBy,
      },
      update: {
        modules: normalized,
        grantedAt: new Date(),
        grantedBy,
      },
    })
  },

  /**
   * Alias for grantModules — semantic clarity when caller intends to "update
   * the module set" rather than "grant new access".
   */
  updateModules: async (
    storeId: string,
    modules: ModuleId[],
    grantedBy: string,
    tx: Prisma.TransactionClient
  ): Promise<ModuleLicense> =>
    platformAdminRepo.grantModules(storeId, modules, grantedBy, tx),

  /**
   * Remove specific module ids from the Store's license.
   * Multi-step: read current → compute diff → write. Atomic under the tx.
   *
   * 'core' is silently preserved — ignored if present in removeList.
   * Returns the updated license (or throws if no license row exists).
   */
  revokeModules: async (
    storeId: string,
    removeList: ModuleId[],
    grantedBy: string,
    tx: Prisma.TransactionClient
  ): Promise<ModuleLicense> => {
    const current = await tx.moduleLicense.findUnique({ where: { storeId } })
    if (!current) {
      throw new Error(
        `Cannot revokeModules: no ModuleLicense for storeId=${storeId}`
      )
    }

    const currentIds = current.modules as ModuleId[]
    const toRemove = new Set(removeList.filter(m => m !== 'core'))
    const remaining = currentIds.filter(id => !toRemove.has(id))

    // Ensure core persists even if it wasn't originally listed (defensive).
    const normalized = remaining.includes('core' as ModuleId)
      ? remaining
      : ['core' as ModuleId, ...remaining]

    return tx.moduleLicense.update({
      where: { storeId },
      data: {
        modules: normalized,
        grantedAt: new Date(),
        grantedBy,
      },
    })
  },
}
EOF
```

- [ ] **Step 2：验证 platform-admin.ts 单独 tsc 过**

```bash
cd server
./node_modules/.bin/tsc --noEmit src/repositories/platform-admin.ts 2>&1 | head
```

预期：**0 error**。

**若挂**，常见原因：
- `ModuleLicense.modules` Prisma 字段类型必须是 `String[]`（Postgres text[]），不能是 JSON——Phase B Task 2 schema 要确认
- `PlatformAdmin` 和 `ModuleLicense` 实体在 schema 中未定义
- `storeId` 上没有 unique 约束，`findUnique where: { storeId }` 会挂

- [ ] **Step 3：验证整个 server tsc 依然干净**

```bash
cd server
./node_modules/.bin/tsc --noEmit 2>&1 | grep -cE "error TS"
```

预期：和 Task 25 完成时一致。

- [ ] **Step 4：commit**

```bash
cd "$(git rev-parse --show-toplevel)"
git add server/src/repositories/platform-admin.ts
git commit -m "feat(phase-5): add platform-admin repository (BYPASSRLS)

Phase D Task 26: PlatformAdmin identity + ModuleLicense grant/revoke.
All methods require TransactionClient (D55) — caller must wrap in
withPlatformContext so Postgres role platform_admin (BYPASSRLS) is active.

- findAdminByEmail/findAdminById/createAdmin — platform identity
- listAllStores — cross-tenant Store list (meaningful only under BYPASSRLS)
- grantModules/updateModules — upsert ModuleLicense, auto-prepend 'core'
- revokeModules — multi-step read+write, 'core' protected (required module
  per shared/modules.ts)

platformAdminRepo + storeRepo.listAll together let Phase I platform routes
(Task 46/47) drive the operations dashboard.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## 段 2c 完成

Task 23-26 全部写完（roles / coupons / waitlist / platform-admin）。

**Phase D 至此 11 个 repo 全部计划就绪**：
- 段 2a（Task 16-17）：store / orders
- 段 2b（Task 18-22）：sessions / payments / split-bills / menu / staff
- 段 2c（Task 23-26）：roles / coupons / waitlist / platform-admin

**Review 建议**：
- Task 23 `resolveLicensedPermissions` helper——L1 细 verify（贴代码），L2 spot check Task 23 其余
- Task 26 platform-admin——L2 spot check（BYPASSRLS + core 保护语义）
- Task 24/25——汇报摘要即可

---

## Phase D 最终验收（D54.3 一次冒烟）

**仍然位于** [`phase-d-repositories.md`](./phase-d-repositories.md#phase-d-最终验收d543-一次冒烟)，验收命令照用。本文件 4 个 task 的输出会自动纳入那个 for 循环（11 个 repo 文件名已列举）。

验收完成后还有一个遗留项：**回填 Phase C `tenant-isolation.test.ts` Case 2**（选 A 或 B，见 `phase-d-repositories.md` 开头的"来自 Phase C 的已知回填项"小节）。Phase D 收尾前必做。

---

## 下一步

Phase D 结束，进入 **Phase E（Stage 3a）**——待批 2 展开。Phase E 开始涉及 controller 层迁移，每个 controller 从 `stores.ts.XXXStore` 换到 `repositories/XXX.ts.XXXRepo`。迁移路径在 spec §9.5 Stage 3a。

---

## Phase F 回填附录（2026-04-17 事后补丁）

Phase F plan 写作期 DP-PF-4 决议 A（持久化审计日志）触发 Phase D 新增
repo 文件。和 Phase E 回填附录的 printerRepo 同模式——作为独立新文件
归入 Phase D 产出清单（不占 Task 编号，00-index.md 的 Phase D 任务数
不改）。

### Phase F 回填项 F-3：`platformAuditLogRepo` 新文件

**Files:**
- Create: `server/src/repositories/platform-audit-log.ts`

**设计职责**：PlatformAuditLog entity 的最小 repo。和 `platformAdminRepo` 一样走 **`withPlatformContext`（BYPASSRLS）**——审计本身跨租户。

**方法清单**：
- `record(action, adminId, targetStoreId?, payload, metadata?, tx)`：写一条审计记录（**核心方法**，每个敏感 platform 操作都调）
- `findByAdmin(adminId, filter?, tx)`：按 adminId 查（"某 admin 全部操作"）
- `findByStore(targetStoreId, filter?, tx)`：按 targetStoreId 查（"某 store 被 platform 操作过的历史"）
- `list(filter, tx)`：通用查询（DP-PF-2 `platform:audit:read` 权限后的 cross-tenant 查询）

**Prisma schema 依赖**：Phase B Task 2 回填的 `PlatformAuditLog` 模型（commit `4813750d`——Phase F 收尾第 1 个 commit）。

**实施模板**：

```bash
cat > server/src/repositories/platform-audit-log.ts <<'EOF'
/**
 * PlatformAuditLog entity repository — BYPASSRLS operations.
 *
 * Every method requires a tx from withPlatformContext. platform_audit_log
 * table has NO RLS policy (by design, see phase-b Task 4 note) — platform
 * admins need cross-tenant visibility for audit review.
 *
 * Write path: record() called from Task 31 platform-store.service.ts for
 * each sensitive action (login / modules:grant / modules:revoke /
 * impersonate / admins:manage).
 *
 * Read path: list() / findBy* called from GET /api/platform/audit, gated
 * by platform:audit:read permission (DP-PF-2).
 */

import { Prisma } from '@prisma/client'
import type { PlatformAuditLog } from '@prisma/client'

export const platformAuditLogRepo = {
  /**
   * Record a platform audit event. payload is action-specific JSON.
   * Rule 3: write op — tx mandatory.
   */
  record: (
    data: {
      action: string
      adminId: string
      targetStoreId?: string | null
      payload: Prisma.InputJsonValue
      ipAddress?: string | null
      userAgent?: string | null
    },
    tx: Prisma.TransactionClient
  ): Promise<PlatformAuditLog> =>
    tx.platformAuditLog.create({
      data: {
        action: data.action,
        adminId: data.adminId,
        targetStoreId: data.targetStoreId ?? null,
        payload: data.payload,
        ipAddress: data.ipAddress ?? null,
        userAgent: data.userAgent ?? null,
      },
    }),

  findByAdmin: (
    adminId: string,
    filter: { from?: Date; to?: Date; action?: string } = {},
    tx: Prisma.TransactionClient
  ): Promise<PlatformAuditLog[]> =>
    tx.platformAuditLog.findMany({
      where: {
        adminId,
        ...(filter.from && { createdAt: { gte: filter.from } }),
        ...(filter.to && { createdAt: { lte: filter.to } }),
        ...(filter.action && { action: filter.action }),
      },
      orderBy: { createdAt: 'desc' },
    }),

  findByStore: (
    targetStoreId: string,
    filter: { from?: Date; to?: Date; action?: string } = {},
    tx: Prisma.TransactionClient
  ): Promise<PlatformAuditLog[]> =>
    tx.platformAuditLog.findMany({
      where: {
        targetStoreId,
        ...(filter.from && { createdAt: { gte: filter.from } }),
        ...(filter.to && { createdAt: { lte: filter.to } }),
        ...(filter.action && { action: filter.action }),
      },
      orderBy: { createdAt: 'desc' },
    }),

  /**
   * General list with combined filters. Used by the audit UI.
   */
  list: (
    filter: {
      adminId?: string
      targetStoreId?: string
      action?: string
      from?: Date
      to?: Date
      limit?: number
    },
    tx: Prisma.TransactionClient
  ): Promise<PlatformAuditLog[]> =>
    tx.platformAuditLog.findMany({
      where: {
        ...(filter.adminId && { adminId: filter.adminId }),
        ...(filter.targetStoreId && { targetStoreId: filter.targetStoreId }),
        ...(filter.action && { action: filter.action }),
        ...(filter.from && { createdAt: { gte: filter.from } }),
        ...(filter.to && { createdAt: { lte: filter.to } }),
      },
      orderBy: { createdAt: 'desc' },
      take: filter.limit ?? 100,
    }),
}
EOF
```

**Phase D 验收命令更新**（现在 13 repo，12 → 13）：

```bash
for f in server/src/repositories/{store,orders,sessions,payments,split-bills,menu,staff,roles,coupons,waitlist,platform-admin,printer,platform-audit-log}.ts; do
  cd server && ./node_modules/.bin/tsc --noEmit $f 2>&1 | grep -E "error TS" && echo "FAIL: $f" || echo "OK: $f"
  cd ..
done
```

**不归入 platformAdminRepo 的理由**：platformAdminRepo 是身份 CRUD（identity），platformAuditLogRepo 是事件流（append-only log）——语义分离清楚。append-only 语义让 log repo 无 `update` / `delete` 方法是有意的（对应 DP-PF-4 合规要求：审计不可改）。

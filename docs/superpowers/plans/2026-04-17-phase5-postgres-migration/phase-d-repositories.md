# Phase 5 Plan — Phase D：Stage 2 Repository 层

> **如何使用本文件**
>
> - 全局规则见 [`00-index.md`](./00-index.md#全局规则所有-task-遵守)
> - 本 phase 前置：[`phase-c-test-db.md`](./phase-c-test-db.md) 全部完成
> - 本 phase 输出：11 个语义化 repository 文件（每 entity 一个），`stores.ts` 和 `json-store.ts` **不动**
> - 规则 3 严格适用：所有写操作 repo 方法的 `db` 参数必填，读操作默认 `prisma`
> - 下一个 phase：Phase E（待批 2 写出）

## 设计前提（D53/D54 落地）— 必读

Spec §9.5 原本写的 "tsc -b 通过 + 基本登录功能跑通" 是**空想**，混淆了两层不同的切换：

- **Storage 层**（JSON 文件 → Postgres）：一次性切换
- **业务层**（controllers / services / routes 迁到 Prisma）：渐进逐域迁移

生产代码 grep 证据显示 JsonStore 深度嵌入业务代码（同步 `.map/.find` 链、非空断言、`session.orderIds` 专属字段），"生成通用适配器 + 加 await" 跑不起来。

已回填 spec 的两条决策（commit `a9d18efc`）：

- **D53 Repository 层形态**：11 个语义化 repo 文件（一 entity 一文件），含该 entity 的业务方法。**不做通用 CRUD 适配器**
- **D54 Phase D 切换层面**：一次性切换是 storage 层，业务层是渐进迁移。Phase D 不动业务代码，应用照常启动

**Phase D 实际做什么**：

- 新增 11 个 `server/src/repositories/*.ts` 文件
- 每个文件是该 entity 的语义 repo（`findBySessionId` / `submitDraft` / `resolveLicensedPermissions` 等业务方法）
- `stores.ts` / `json-store.ts` / 所有 `routes/` / 所有 `controllers/` **原封不动**
- 应用照常用 JsonStore 启动 + 登录

**Phase D 不做什么**：

- ❌ 不重写 `stores.ts`
- ❌ 不改任何 controller / route
- ❌ 不做通用 CRUD 适配器
- ❌ 不删除 JsonStore

逐域迁移（controller 从 `import { orderStore } from 'repositories/stores'` 换到 `import { orderRepo } from 'repositories/orders'`）是 **Phase E/F/G** 的事。

---

## 来自 Phase C 的已知回填项

Phase C `tenant-isolation.test.ts` Case 2（"INSERT without tenant context throws"）存在**语义漂移**——`tableId` 用的是不存在的假 UUID，外键先挡，RLS/WITH CHECK 可能根本没触发。Phase D 末尾（Task 26 完成后）回来改：

**选项 A**：给 Case 2 做真实 setup——platform context 建 table，再 tenant context 外尝试 insert 用这个真实 tableId 的 order，让 RLS/WITH CHECK 真正成为失败路径
**选项 B**：直接删 Case 2——Case 1（裸 SELECT 抛错）和 Case 4（WITH CHECK 拒 mismatched storeId）已覆盖核心防御

Phase D 结束前选一个落地。记在本 phase 的 verify 清单里。

---

## Task 列表

按 entity 一一对应 11 个语义 repo 文件。每个 task 一个文件，单独 commit。

| Task | 新文件 | 核心方法 |
|---|---|---|
| 16 | `server/src/repositories/store.ts` | `findById` / `create` / `updateSettings` / `listAll` / `withinLicense` |
| 17 | `server/src/repositories/orders.ts` | **B2 核心**：`findSubmitted`（默认排除 draft）/ `findDraft` / `upsertDraft` / `submitDraft`（乐观锁）/ `createDraftOrder`（嵌套 create）/ `findBySessionId` / `findActive` |
| 18 | `server/src/repositories/sessions.ts` | `findById` / `findBySessionForTable` / `createForTable` / `closeSession` / `reopenSession` / `applyCoupon` |
| 19 | `server/src/repositories/payments.ts` | `create`（含 PaymentItem 嵌套）/ `findBySessionId` / `confirmStripe` / `sumConfirmed` |
| 20 | `server/src/repositories/split-bills.ts` | `create`（含 items）/ `findActive` / `markPaid` / `invalidate` |
| 21 | `server/src/repositories/menu.ts` | categories + menuItems + menuItemOptions，`listMenu`（含关联）/ `upsertItem` / `upsertOptions` |
| 22 | `server/src/repositories/staff.ts` | `findById` / `findByUsername` / `listAll` / `createStaff` / `updateRole` / `setClockPin` |
| 23 | `server/src/repositories/roles.ts` | `findByStoreId` / `upsertRole` + **`resolveLicensedPermissions` helper** |
| 24 | `server/src/repositories/coupons.ts` | `findActiveByCode` / `create` / `incrementUses` |
| 25 | `server/src/repositories/waitlist.ts` | `listByStatus` / `add` / `notify` / `markSeated` |
| 26 | `server/src/repositories/platform-admin.ts` | PlatformAdmin + ModuleLicense（**这个走 withPlatformContext，bypass RLS**） |

### 并行性

Phase D 的 11 个 task **可串可并**：每个文件独立，不跨引用。推荐串行（减少 worktree 合并风险）。如果并行需要：Task 16-26 互相不冲突，可全部并行；但 Task 16 的 `store.ts` 是个"参考实现"——先做完让其他 task 的 agent 照葫芦画瓢。

---

## Phase D 最终验收（D54.3 一次冒烟）

**每个 Task（16-26）独立 verify**：
- 本 task 新写的 repo 文件 `tsc --noEmit <file>` 过
- 不跑应用启动冒烟（太贵 × 11）

**Task 26 完成后做一次完整 Phase D 验收**：

```bash
# 1. server 整体 tsc 依然干净（stores.ts 未动，无新错误）
cd server && ./node_modules/.bin/tsc --noEmit 2>&1 | tee /tmp/phase-d-final-tsc.log | tail
# 预期：和 Phase C 末尾的 tsc 状态一致，新增错误数 = 0

# 2. 所有 11 个新 repo 文件单独编译过
for f in server/src/repositories/{store,orders,sessions,payments,split-bills,menu,staff,roles,coupons,waitlist,platform-admin}.ts; do
  cd server && ./node_modules/.bin/tsc --noEmit $f 2>&1 | grep -E "error TS" && echo "FAIL: $f" || echo "OK: $f"
  cd ..
done

# 3. 启动应用 + 演示账号登录冒烟
cd server && pnpm dev &
PID=$!
sleep 3
# 手动在浏览器测试 owner@demo.local 登录（或 curl /api/auth/login）
# 预期：应用正常启动，登录 200（JsonStore 仍然在服务）
curl -s http://localhost:3001/api/stores/demo-store-uuid/menu 2>&1 | head
kill $PID

# 4. 回填 Phase C 已知项（选 A 或 B）
# 见本文件"来自 Phase C 的已知回填项"小节

# 5. Phase D 完成，可进 Phase E
```

**验收失败的含义**：
- 第 1 项失败 → 某个 Task 不小心 import 了 repo 到 controller，破坏了"业务代码原封不动"铁律。回滚到问题 task，重做
- 第 2 项失败 → 某个 repo 类型/导入有问题。单独修
- 第 3 项失败 → 有东西被意外改动（`stores.ts` 被动了、`package.json` 依赖冲突等）。git diff 查根因

---

## Task 16：写 `server/src/repositories/store.ts`（参考实现）

**Files:**
- Create: `server/src/repositories/store.ts`

**前置**：Phase C 全部完成。

**设计职责**：Store entity 的语义 repo。这是 Phase D 的第一个 repo——写得清楚、典型，后续 10 个 repo 照同样模式。

**方法清单**：
- `findById(id, db?)`：读 Store 单行
- `listAll(db?)`：读所有 Store（平台管理员用，走 `withPlatformContext`）
- `create(data, db)`：创建 Store（规则 3 写必填 db）+ **同步创建默认 ModuleLicense**（新店默认只授 `core` 模块，D19）
- `updateSettings(id, patch, db)`：更新 Store 配置字段（name / description / openingHours / announcement / tipBase / logo）
- `withinLicense(id, db?)`：读 Store + ModuleLicense 一起返回（调用方拿到 `{store, license}`，不用第二次查询）

**不做**的方法（归属不对）：
- ❌ 授予/回收 modules（属 PlatformAdmin 操作，放 `platform-admin.ts` Task 26）
- ❌ 列出 Store 的 Staff / Orders / Sessions（归 staff.ts / orders.ts / sessions.ts）

- [ ] **Step 1：写 `server/src/repositories/store.ts`**

```bash
cat > server/src/repositories/store.ts <<'EOF'
/**
 * Store entity repository.
 *
 * Scope: operations on a single Store row, plus its 1:1 ModuleLicense.
 *
 * NOT in scope (other repos own these):
 *   - Staff / orders / sessions management → respective repos
 *   - Module grant/revoke → platform-admin.ts
 *   - Coupons, menu, tables → respective repos
 *
 * Most reads are self-tenant (operator reading their own store). Use the
 * tx from withTenantContext — RLS will ensure only the current tenant's
 * row is accessible.
 *
 * For platform admin flows (listAll across all tenants, create new store),
 * callers wrap in withPlatformContext (BYPASSRLS) and pass that tx.
 */

import type { Prisma, Store, ModuleLicense } from '@prisma/client'
import { prisma, type Db } from './prisma-client.js'

export const storeRepo = {
  /**
   * Read a single Store by id.
   * Under RLS (app_user), only returns the row if storeId matches current tenant.
   * Under platform_admin (BYPASSRLS), returns any store.
   */
  findById: (id: string, db: Db = prisma): Promise<Store | null> =>
    db.store.findUnique({ where: { id } }),

  /**
   * List all stores. Only meaningful under platform_admin context.
   * Called from platform API routes (/api/platform/stores).
   * Under app_user RLS, this returns only the current tenant's single row.
   */
  listAll: (db: Db = prisma): Promise<Store[]> =>
    db.store.findMany({ orderBy: { createdAt: 'asc' } }),

  /**
   * Create a new Store + default ModuleLicense in one transaction.
   * Called from platform admin flows (createStore / onboarding).
   * Caller wraps in withPlatformContext to bypass RLS for the insert.
   *
   * D19: new stores default to ['core'] only in production. Dev seeder
   * overrides with full module list (see prisma/seed.ts).
   *
   * Rule 3: write operation — db is mandatory.
   */
  create: async (
    data: {
      name: string
      description?: string | null
      tipBase?: 'pretax' | 'posttax'
      grantedBy: string // PlatformAdmin.id performing the creation (audit)
      modules?: string[] // defaults to ['core']
    },
    db: Db
  ): Promise<Store> => {
    return db.store.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        tipBase: data.tipBase ?? 'pretax',
        moduleLicense: {
          create: {
            modules: data.modules ?? ['core'],
            grantedAt: new Date(),
            grantedBy: data.grantedBy,
          },
        },
      },
    })
  },

  /**
   * Update mutable settings on a Store. Does NOT allow modifying id,
   * createdAt, or relations — those are managed elsewhere.
   *
   * Rule 3: write operation — db is mandatory.
   */
  updateSettings: (
    id: string,
    patch: {
      name?: string
      description?: string | null
      openingHours?: string | null
      announcement?: string | null
      logo?: string | null
      tipBase?: 'pretax' | 'posttax'
    },
    db: Db
  ): Promise<Store> => db.store.update({ where: { id }, data: patch }),

  /**
   * Read Store + its ModuleLicense in a single round-trip.
   * Common pattern: permission checks need both "who is this store" and
   * "what modules are licensed" — avoid two sequential queries.
   */
  withinLicense: (
    id: string,
    db: Db = prisma
  ): Promise<(Store & { moduleLicense: ModuleLicense | null }) | null> =>
    db.store.findUnique({
      where: { id },
      include: { moduleLicense: true },
    }),
}
EOF
```

- [ ] **Step 2：验证 store.ts 单独 tsc 过**

```bash
cd server
./node_modules/.bin/tsc --noEmit src/repositories/store.ts 2>&1 | head
```

预期：**0 error**。

- [ ] **Step 3：验证整个 server tsc 依然干净**

```bash
cd server
./node_modules/.bin/tsc --noEmit 2>&1 | grep -cE "error TS"
```

预期：和 Phase C 末尾数一致（新增 = 0）。`store.ts` 没被任何 controller import，所以不影响现有错误计数。

- [ ] **Step 4：commit**

```bash
cd "$(git rev-parse --show-toplevel)"
git add server/src/repositories/store.ts
git commit -m "feat(phase-5): add Store entity semantic repository

First of 11 Phase D repo files (Task 16/26).
- findById / listAll — reads under caller's tenant or platform context
- create — with nested ModuleLicense init (default ['core'] per D19)
- updateSettings — Store mutable fields only
- withinLicense — Store + ModuleLicense in one round-trip

storeRepo is not imported by any controller yet; old stores.ts.storeStore
(JsonStore singleton) still serves runtime. Phase E/F will migrate.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 17：写 `server/src/repositories/orders.ts`（B2 核心）

**段 2 段 2a 的第二个 task，完成后停下 verify。**

Task 17 是 Phase D 最关键的一个——B2 设计的所有乐观锁、判别联合、`findSubmitted` 默认排除 draft 全部在这里。如果写错，Phase G Task 34（session-cart B2 重写）会建在沙子上。

**Files:**
- Create: `server/src/repositories/orders.ts`

**前置**：Task 16 完成。

**方法清单**（展开版本）：

- `findById(id, db?)`：基础读
- `findBySessionId(sessionId, db?)`：查一个 session 的所有 orders（不含 draft）
- `findSubmitted(where, db?)`：**默认排除 draft**（D24 核心）。where 允许额外过滤
- `findDraft(sessionId, deviceId, db?)`：**显式查 draft**（cart 场景专用）。返回 `DraftOrder | null`
- `findActive(storeId, db?)`：kitchen/KDS 用（只要 `pending` / `preparing`，用 `isActiveOrder` helper 语义对齐）
- `createDraftOrder(input, db)`：**嵌套 create**——Order + OrderItem[] + OrderItemOption[] 一个 tx 原子
- `upsertDraftItem(orderId, item, expectedVersion, db)`：乐观锁——加一道菜进 draft，version+1。冲突抛 409
- `removeDraftItem(orderId, itemKey, expectedVersion, db)`：删 draft 里的菜，version+1
- `submitDraft(orderId, expectedVersion, db)`：**乐观锁 draft→pending**（D30 核心）。`WHERE status='draft' AND version=?`，affected=0 抛 409
- `updateStatus(id, status, db)`：推进 pending→preparing→served
- `voidOrder(id, db)`：管理端软失效

**关键实现要点**：
- **类型签名区分** `DraftOrder` vs `SubmittedOrder`（D23）——返回类型显式
- 所有读的 `include` 默认带 `items.include.options`（避免 N+1）
- `findSubmitted` 默认用 `status: { not: 'draft' }`，调用方不需要记

- [ ] **Step 1：写 `server/src/repositories/orders.ts`**

```bash
cat > server/src/repositories/orders.ts <<'EOF'
/**
 * Order entity repository — B2 core.
 *
 * B2 design (cart = orders WHERE status='draft'):
 *   - findSubmitted (default-exclude-draft) is the 95% use case for
 *     kitchen/settlement/summary/analytics
 *   - findDraft (explicit) is the 5% use case — only cart endpoints
 *   - Type discriminants at function boundaries reject draft at compile time:
 *     function calcXxx(orders: SubmittedOrder[]) — compile-time rejects draft[]
 *
 * Optimistic locking (D30):
 *   - version column bumped on every draft mutation
 *   - submitDraft, upsertDraftItem, removeDraftItem all take expectedVersion
 *   - WHERE version=? AND status='draft' — affected_rows=0 → throw 409
 *
 * Partial unique constraint (schema-level):
 *   UNIQUE (session_id, device_id) WHERE status='draft'
 *   — enforces "one draft per device per session"
 */

import type { Prisma, Order, OrderItem, OrderItemOption } from '@prisma/client'
import { prisma, type Db } from './prisma-client.js'
import type { DraftOrder, SubmittedOrder } from '@qr-order/shared'

type OrderWithItems = Order & {
  items: (OrderItem & { options: OrderItemOption[] })[]
}

// Narrow OrderWithItems to draft/submitted based on status at the type level.
type DraftOrderWithItems = OrderWithItems & { status: 'draft' }
type SubmittedOrderWithItems = OrderWithItems & {
  status: Exclude<Order['status'], 'draft'>
}

const includeItemsAndOptions = {
  items: { include: { options: true } },
} as const satisfies Prisma.OrderInclude

// ========== Reads ==========

export const orderRepo = {
  /**
   * Read a single order by id — no status filter, includes items + options.
   * Caller must narrow if they need type safety on status.
   */
  findById: (id: string, db: Db = prisma): Promise<OrderWithItems | null> =>
    db.order.findUnique({
      where: { id },
      include: includeItemsAndOptions,
    }) as Promise<OrderWithItems | null>,

  /**
   * All orders attached to a session — EXCLUDES draft (use findDraft for cart).
   * Primary API for settlement / summary / kitchen lists.
   */
  findBySessionId: (
    sessionId: string,
    db: Db = prisma
  ): Promise<SubmittedOrderWithItems[]> =>
    db.order.findMany({
      where: { sessionId, status: { not: 'draft' } },
      include: includeItemsAndOptions,
      orderBy: { createdAt: 'asc' },
    }) as Promise<SubmittedOrderWithItems[]>,

  /**
   * Generic submitted-only find with caller-supplied where clause.
   * DEFAULT-EXCLUDES draft — caller cannot accidentally include drafts.
   *
   * If caller needs drafts, they must use findDraft (explicit intent).
   */
  findSubmitted: (
    where: Prisma.OrderWhereInput = {},
    db: Db = prisma
  ): Promise<SubmittedOrderWithItems[]> =>
    db.order.findMany({
      where: { ...where, status: { not: 'draft' } },
      include: includeItemsAndOptions,
      orderBy: { createdAt: 'desc' },
    }) as Promise<SubmittedOrderWithItems[]>,

  /**
   * Active orders for kitchen/KDS — status in ('pending', 'preparing').
   * Excludes draft (not submitted), served (done), voided.
   */
  findActive: (
    storeId: string,
    db: Db = prisma
  ): Promise<SubmittedOrderWithItems[]> =>
    db.order.findMany({
      where: {
        storeId,
        status: { in: ['pending', 'preparing'] },
      },
      include: includeItemsAndOptions,
      orderBy: { createdAt: 'asc' },
    }) as Promise<SubmittedOrderWithItems[]>,

  /**
   * Explicit draft lookup — cart endpoints only.
   * Returns null if no draft exists for this (session, device) pair.
   *
   * Partial unique index ensures at most one draft per (sessionId, deviceId).
   */
  findDraft: (
    sessionId: string,
    deviceId: string,
    db: Db = prisma
  ): Promise<DraftOrderWithItems | null> =>
    db.order.findFirst({
      where: { sessionId, deviceId, status: 'draft' },
      include: includeItemsAndOptions,
    }) as Promise<DraftOrderWithItems | null>,

  // ========== Writes (rule 3: db mandatory) ==========

  /**
   * Create a new draft order with items atomically.
   * Used by cart-add when no draft exists yet for this (sessionId, deviceId).
   *
   * Items created nested (single SQL transaction).
   * itemKey is caller-generated (crypto.randomUUID()) and stays stable across
   * subsequent option mutations — used by PaymentItem / SplitBillItem to tag
   * which items were paid/split.
   */
  createDraftOrder: async (
    input: {
      storeId: string
      sessionId: string
      tableId: string
      deviceId: string
      items: {
        menuItemId: string
        itemKey: string
        name: string
        unitPrice: number
        quantity: number
        note?: string
        options: {
          groupName: string
          name: string
          priceAdjust: number
        }[]
      }[]
    },
    db: Db
  ): Promise<DraftOrderWithItems> => {
    const result = await db.order.create({
      data: {
        storeId: input.storeId,
        sessionId: input.sessionId,
        tableId: input.tableId,
        deviceId: input.deviceId,
        status: 'draft',
        version: 0,
        lastCartActivityAt: new Date(),
        items: {
          create: input.items.map(i => ({
            storeId: input.storeId,
            menuItemId: i.menuItemId,
            itemKey: i.itemKey,
            name: i.name,
            unitPrice: i.unitPrice,
            quantity: i.quantity,
            note: i.note ?? null,
            options: {
              create: i.options.map(o => ({
                storeId: input.storeId,
                groupName: o.groupName,
                name: o.name,
                priceAdjust: o.priceAdjust,
              })),
            },
          })),
        },
      },
      include: includeItemsAndOptions,
    })
    return result as DraftOrderWithItems
  },

  /**
   * Add (or replace quantity) for an item inside an existing draft.
   * Bumps version — caller passes expectedVersion, mismatch throws 409 semantically
   * (we throw Error with `.code='OPTIMISTIC_LOCK_CONFLICT'` for routes to map).
   *
   * If itemKey already exists in the draft, quantity is incremented; otherwise
   * a new OrderItem row is added.
   */
  upsertDraftItem: async (
    orderId: string,
    item: {
      menuItemId: string
      itemKey: string // stable key; if exists, quantity += new quantity
      name: string
      unitPrice: number
      quantity: number
      note?: string
      options: {
        groupName: string
        name: string
        priceAdjust: number
      }[]
    },
    expectedVersion: number,
    db: Db
  ): Promise<DraftOrderWithItems> => {
    // First, bump version with optimistic lock check.
    const bumped = await db.order.updateMany({
      where: { id: orderId, version: expectedVersion, status: 'draft' },
      data: { version: { increment: 1 }, lastCartActivityAt: new Date() },
    })
    if (bumped.count === 0) {
      const err = new Error('Draft order version mismatch or order not in draft status')
      ;(err as any).code = 'OPTIMISTIC_LOCK_CONFLICT'
      throw err
    }

    // Check if itemKey exists — if yes, increment quantity; else insert.
    const existing = await db.orderItem.findFirst({
      where: { orderId, itemKey: item.itemKey },
    })
    if (existing) {
      await db.orderItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + item.quantity },
      })
    } else {
      const order = await db.order.findUnique({ where: { id: orderId }, select: { storeId: true } })
      if (!order) throw new Error('Order vanished mid-upsert')
      await db.orderItem.create({
        data: {
          storeId: order.storeId,
          orderId,
          menuItemId: item.menuItemId,
          itemKey: item.itemKey,
          name: item.name,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          note: item.note ?? null,
          options: {
            create: item.options.map(o => ({
              storeId: order.storeId,
              groupName: o.groupName,
              name: o.name,
              priceAdjust: o.priceAdjust,
            })),
          },
        },
      })
    }

    const updated = await db.order.findUnique({
      where: { id: orderId },
      include: includeItemsAndOptions,
    })
    return updated as DraftOrderWithItems
  },

  /**
   * Remove an item from a draft (by itemKey).
   * Bumps version (optimistic lock).
   */
  removeDraftItem: async (
    orderId: string,
    itemKey: string,
    expectedVersion: number,
    db: Db
  ): Promise<DraftOrderWithItems> => {
    const bumped = await db.order.updateMany({
      where: { id: orderId, version: expectedVersion, status: 'draft' },
      data: { version: { increment: 1 }, lastCartActivityAt: new Date() },
    })
    if (bumped.count === 0) {
      const err = new Error('Draft order version mismatch or order not in draft status')
      ;(err as any).code = 'OPTIMISTIC_LOCK_CONFLICT'
      throw err
    }

    await db.orderItem.deleteMany({ where: { orderId, itemKey } })

    const updated = await db.order.findUnique({
      where: { id: orderId },
      include: includeItemsAndOptions,
    })
    return updated as DraftOrderWithItems
  },

  /**
   * Promote draft → pending (order submit).
   * Optimistic lock: WHERE version=? AND status='draft'.
   *
   * This is THE B2 transition point. After this:
   *   - partial unique (session, device, status='draft') releases, allowing
   *     a new draft for subsequent cart-add
   *   - kitchen/KDS queries (findActive) start seeing this order
   *   - settlement queries (findSubmitted) include this order
   *   - SSE 'order:created' should fire from the controller AFTER tx commit
   */
  submitDraft: async (
    orderId: string,
    expectedVersion: number,
    db: Db
  ): Promise<SubmittedOrderWithItems> => {
    const bumped = await db.order.updateMany({
      where: { id: orderId, version: expectedVersion, status: 'draft' },
      data: { version: { increment: 1 }, status: 'pending' },
    })
    if (bumped.count === 0) {
      const err = new Error('Draft order version mismatch or already submitted')
      ;(err as any).code = 'OPTIMISTIC_LOCK_CONFLICT'
      throw err
    }
    const submitted = await db.order.findUnique({
      where: { id: orderId },
      include: includeItemsAndOptions,
    })
    return submitted as SubmittedOrderWithItems
  },

  /**
   * Advance a submitted order's status (pending → preparing → served).
   * Does NOT touch version (version is draft-only lock).
   * Status 'draft' is rejected — drafts transition via submitDraft only.
   */
  updateStatus: (
    id: string,
    status: Exclude<Order['status'], 'draft'>,
    db: Db
  ): Promise<Order> =>
    db.order.update({ where: { id }, data: { status } }),

  /**
   * Void a submitted order (admin action).
   * Status stays in 'voided' forever — audit trail preserved.
   */
  voidOrder: (id: string, db: Db): Promise<Order> =>
    db.order.update({ where: { id }, data: { status: 'voided' } }),
}

export type { OrderWithItems, DraftOrderWithItems, SubmittedOrderWithItems }
EOF
```

- [ ] **Step 2：验证 orders.ts 单独 tsc 过**

```bash
cd server
./node_modules/.bin/tsc --noEmit src/repositories/orders.ts 2>&1 | head
```

预期：**0 error**。

**若挂**，常见原因：
- `DraftOrder` / `SubmittedOrder` 从 shared 导入失败——Phase B Task 7 的 `shared/types.ts` 判别联合是否正确 export 了
- Prisma 类型推断和自定义 narrow type 冲突——可能需要更显式的类型 assertion（`as Promise<...>` 已经加了）
- `OrderItem.itemKey` 在 schema 里没有——回去确认 Task 2 Prisma schema 里 OrderItem model 包含 `itemKey String @map("item_key")`

- [ ] **Step 3：验证整个 server tsc 依然干净**

```bash
cd server
./node_modules/.bin/tsc --noEmit 2>&1 | grep -cE "error TS"
```

预期：和 Task 16 完成时一致。

- [ ] **Step 4：commit**

```bash
cd "$(git rev-parse --show-toplevel)"
git add server/src/repositories/orders.ts
git commit -m "feat(phase-5): add orders repository — B2 core with optimistic lock

Phase D Task 17 — second repo, most complex.
- findSubmitted (default excludes draft, 95% use case, D24)
- findDraft (explicit cart-only, D24)
- createDraftOrder (nested Order + items + options, atomic)
- upsertDraftItem / removeDraftItem (optimistic lock via version)
- submitDraft (draft → pending transition, D30)
- Type discriminants (DraftOrderWithItems / SubmittedOrderWithItems, D23)
  at return types prevent accidentally mixing drafts into settlement code.

Throws OPTIMISTIC_LOCK_CONFLICT on version mismatch — caller route layer
maps to HTTP 409 with client re-fetch + retry (Phase G Task 34 handles this).

orderRepo not yet imported by any controller; session-cart.ts and others
still use JsonStore. Migration happens in Phase G Task 33/34.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## 段 2 段 2a 暂停

Task 16 (`store.ts`) + Task 17 (`orders.ts`) 写完。

**本段 verify 要求**：Task 17 的 `orders.ts` 是 Phase G Task 34（B2 重写）的地基，写错会连锁崩坏。**把 orders.ts 完整代码贴对话里等用户 verify 一次再继续 Task 18-22（段 2 段 2b）**。


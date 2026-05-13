# Phase 5 Plan — Phase D：Stage 2 Repository 层

> **如何使用本文件**
>
> - 全局规则见 [`00-index.md`](./00-index.md#全局规则所有-task-遵守)
> - 本 phase 前置：[`phase-c-test-db.md`](./phase-c-test-db.md) 全部完成
> - 本 phase 输出：11 个语义化 repository 文件（每 entity 一个），`stores.ts` 和 `json-store.ts` **不动**
> - 规则 3 严格适用：所有写操作 repo 方法的 `db` 参数必填，读操作默认 `prisma`
> - 下一个 phase：Phase E（待批 2 写出）

## ⚠️ 文件大小例外声明（规则 8）

本文件 **~1523 行**（段 2b 完成后计数），超出 plan 单文件 **1200 行软上限**。

**例外理由**：Phase D 的 11 个语义化 repository 天然耦合——全部依赖 Task 16 `store.ts` 和 Phase B Task 6 `prisma-client.ts` 作为参考模式；整个 phase 的叙事是"Phase 5 storage 层的完整重写"。按文件拆分（选项 B/C）会割裂这条叙事，让 reviewer 在文件间跳转时丢失上下文。

**验收标准**（任一破防即触发回滚到选项 B 语义分组拆分）：
1. CC 能读完全文而不需要分段读（tool call 文件完整加载无截断）
2. 用户 review 时无"太长找不到哪改"的疲劳反馈
3. Phase D 实施阶段单个 task agent 执行不因"文档太长找不到自己任务"卡壳

**过程记录**：段 2b 完成时 CC 已**违反 1200 行上限**（写完 5 task 才检查 wc -l）；事后正确动作是停下来汇报并让用户决定（规则 8）。CC 初次汇报时用了"选项 A 最简"的事后合理化叙述，被用户识别修正。本声明是那次事件的直接产物。

---

## 设计前提（D53/D54 落地）— 必读

Spec §9.5 原本写的 "tsc -b 通过 + 基本登录功能跑通" 是**空想**，混淆了两层不同的切换：

- **Storage 层**（JSON 文件 → Postgres）：一次性切换
- **业务层**（controllers / services / routes 迁到 Prisma）：渐进逐域迁移

生产代码 grep 证据显示 JsonStore 深度嵌入业务代码（同步 `.map/.find` 链、非空断言、`session.orderIds` 专属字段），"生成通用适配器 + 加 await" 跑不起来。

已回填 spec 的决策：

- **D53 Repository 层形态**（commit `a9d18efc`）：11 个语义化 repo 文件（一 entity 一文件），含该 entity 的业务方法。**不做通用 CRUD 适配器**
- **D54 Phase D 切换层面**（commit `a9d18efc`）：一次性切换是 storage 层，业务层是渐进迁移。Phase D 不动业务代码，应用照常启动
- **D55 多步写参数窄化**（commit `4fdd6b6c`）：`≥2` 次 DB round-trip 且依赖前后一致性的写操作，签名用 `Prisma.TransactionClient`（不是 `Db` 联合），编译期强制 tx
- **D56 itemKey 模型修正**（commit `4fdd6b6c`）：DB 层用 `(orderItemId FK + quantity)`，彻底删 itemKey 字符串列；API 层保留 legacy 字符串透过 `server/src/lib/legacy-itemkey.ts` 薄转换（Phase G task）
- **D57 OrderItem.position**（commit `4fdd6b6c`）：稳定 idx 契约，caller 填 0-indexed，`@@unique([orderId, position])`

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
| 17 | `server/src/repositories/orders.ts` | **B2 核心**：`findSubmitted`（默认排除 draft）/ `findDraft` / `createDraftOrder` / **`replaceDraftItems`**（整批替换，匹配 legacy updateDeviceCart）/ `submitDraft`（乐观锁）/ `updateStatus` / `voidOrder`（state-guarded）|
| 18 | `server/src/repositories/sessions.ts` | `findById` / `findBySessionForTable` / `createForTable` / `closeSession` / `reopenSession` / `applyCoupon` |
| 19 | `server/src/repositories/payments.ts` | `create`（含 PaymentItem 嵌套，**FK 模型 `(orderItemId, paidQuantity)`，D56**）/ `findBySessionId` / `confirmStripe` / `sumConfirmed` / `derivePaidQuantityByOrderItem`（替代 legacy `derivePaidState`）|
| 20 | `server/src/repositories/split-bills.ts` | `create`（SplitBillItem **FK 模型 `(orderItemId, quantity)`**）/ `findActive` / `markPaid` / `invalidate`（冲突判定：`(orderItemId, quantity)` 与 paid + other splits 重叠）|
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

**方法清单**（D56/D57/D55 修正后）：

- `findById(id, db?)`：基础读
- `findBySessionId(sessionId, db?)`：查一个 session 的所有 orders（不含 draft），`orderBy createdAt asc`，items 按 `position asc`
- `findSubmitted(where, db?)`：**默认排除 draft**（D24 核心）。where 允许额外过滤
- `findDraft(sessionId, deviceId, db?)`：**显式查 draft**（cart 场景专用）。返回 `DraftOrderWithItems | null`
- `findActive(storeId, db?)`：kitchen/KDS 用（`pending` / `preparing`）
- `createDraftOrder(input, db)`：**单步嵌套 create**（D55 豁免）——Order + OrderItem[] + OrderItemOption[] 一个 SQL tx 原子。**Precondition**：caller 必须先 `findDraft` 确认没现存 draft（partial unique 否则抛 P2002）
- `replaceDraftItems(orderId, items, expectedVersion, tx)`：**整批替换语义**（D56）——对齐现有 `updateDeviceCart` 行为。DELETE 所有现存 OrderItem（cascade options）+ INSERT 新集合，position 重排 0..N-1。多步写 → `tx: TransactionClient` 必填（D55）
- `submitDraft(orderId, expectedVersion, tx)`：**乐观锁 draft→pending**（D30）。多步写 → `TransactionClient` 必填（D55）
- `updateStatus(id, status, db)`：kitchen 流转 `pending→preparing→served`，**无 version check**（submitted 之后物理互斥，容忍 last-write-wins）
- `voidOrder(id, db)`：管理端软失效——**状态 guard**：只允许 `pending/preparing` 被 void，served/voided 会抛

**关键实现要点**：
- **类型签名区分** `DraftOrderWithItems` vs `SubmittedOrderWithItems`（D23）——返回类型显式
- 所有读的 `include` 默认带 `items: { include: { options: true }, orderBy: { position: 'asc' }}`（D57）
- `findSubmitted` 默认用 `status: { not: 'draft' }`
- **多步写用 `Prisma.TransactionClient`（D55）**，不是 `Db`——编译期强制 caller withTenantContext
- **无 itemKey 列**（D56）——OrderItem 用 `position` 锚定 idx，PaymentItem/SplitBillItem 用 `(orderItemId FK + quantity)` 引用
- `crypto.randomUUID` 不需要（legacy 代码的 itemKey UUID 设计是 spec 错误事实假设，D56/D57 已修正）

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
 *   - Type discriminants at function boundaries reject draft at compile time
 *
 * Optimistic locking (D30):
 *   - version column bumped on every draft mutation
 *   - submitDraft + replaceDraftItems take expectedVersion
 *   - WHERE version=? AND status='draft' — affected_rows=0 → throw
 *     OPTIMISTIC_LOCK_CONFLICT (Phase G route layer maps to HTTP 409)
 *
 * Position contract (D57):
 *   - OrderItem.position is 0-indexed; @@unique(orderId, position)
 *   - createDraftOrder and replaceDraftItems both assign position from
 *     items[] array index (0..N-1)
 *   - items always loaded via orderBy: { position: 'asc' }
 *
 * No itemKey column (D56):
 *   - legacy `"orderId:idx:qty"` string never persisted on OrderItem
 *   - PaymentItem / SplitBillItem reference order items by FK + quantity
 *   - API boundary still emits/accepts legacy string via server/src/lib/legacy-itemkey.ts
 *
 * Partial unique constraint (schema-level):
 *   UNIQUE (session_id, device_id) WHERE status='draft'
 *   — enforces "one draft per device per session"
 */

import { Prisma } from '@prisma/client'
import type { Order, OrderItem, OrderItemOption } from '@prisma/client'
import { prisma, type Db } from './prisma-client.js'

type OrderWithItems = Order & {
  items: (OrderItem & { options: OrderItemOption[] })[]
}

// Narrow OrderWithItems to draft/submitted based on status at the type level.
type DraftOrderWithItems = OrderWithItems & { status: 'draft' }
type SubmittedOrderWithItems = OrderWithItems & {
  status: Exclude<Order['status'], 'draft'>
}

const includeItemsAndOptions = {
  items: {
    include: { options: true },
    orderBy: { position: 'asc' },
  },
} as const satisfies Prisma.OrderInclude

/**
 * Draft item input — used by createDraftOrder and replaceDraftItems.
 * position is NOT part of this — repo fills it from array index (D57).
 * itemKey is NOT part of this — legacy UUID design was spec error (D56).
 */
type DraftItemInput = {
  menuItemId: string
  name: string
  unitPrice: number
  quantity: number
  note?: string
  options: {
    groupName: string
    name: string
    priceAdjust: number
  }[]
}

// ========== Reads ==========

export const orderRepo = {
  findById: (id: string, db: Db = prisma): Promise<OrderWithItems | null> =>
    db.order.findUnique({
      where: { id },
      include: includeItemsAndOptions,
    }) as Promise<OrderWithItems | null>,

  /**
   * All orders attached to a session — EXCLUDES draft (use findDraft for cart).
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
   * DEFAULT-EXCLUDES draft — caller cannot accidentally include drafts.
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

  // ========== Writes ==========

  /**
   * Single-step atomic nested create (rule D55 exempt — one SQL round-trip).
   *
   * PRECONDITION: caller must verify no existing draft for (sessionId, deviceId)
   * via findDraft first. Partial unique index rejects duplicates with P2002.
   *
   * Typical controller flow:
   *   const existing = await orderRepo.findDraft(sessionId, deviceId, tx)
   *   if (existing)
   *     return orderRepo.replaceDraftItems(existing.id, newItems, existing.version, tx)
   *   return orderRepo.createDraftOrder({...}, tx)
   *
   * position is assigned from items[] array index (0, 1, 2, ...) — D57.
   */
  createDraftOrder: async (
    input: {
      storeId: string
      sessionId: string
      tableId: string
      deviceId: string
      items: DraftItemInput[]
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
          create: input.items.map((i, idx) => ({
            storeId: input.storeId,
            menuItemId: i.menuItemId,
            position: idx,                // D57: repo fills from array index
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
   * Whole-array replacement — matches legacy updateDeviceCart semantics.
   *
   * Rationale (D56): cart-add/remove identity on server side was position+qty,
   * never a stable key. Frontend computes full CartItem[] for the device and
   * sends it; server wipes and re-inserts. No itemKey merge logic needed.
   *
   * Multi-step write (D55): tx MUST be a TransactionClient, not PrismaClient.
   * Optimistic lock spans version check + delete + insert — all one tx.
   *
   * Position reassigned 0..N-1 from items[] array order.
   */
  replaceDraftItems: async (
    orderId: string,
    items: DraftItemInput[],
    expectedVersion: number,
    tx: Prisma.TransactionClient
  ): Promise<DraftOrderWithItems> => {
    const bumped = await tx.order.updateMany({
      where: { id: orderId, version: expectedVersion, status: 'draft' },
      data: { version: { increment: 1 }, lastCartActivityAt: new Date() },
    })
    if (bumped.count === 0) {
      const err = new Error('Draft order version mismatch or order not in draft status')
      ;(err as any).code = 'OPTIMISTIC_LOCK_CONFLICT'
      throw err
    }

    // Wipe existing items (cascade deletes options via FK).
    await tx.orderItem.deleteMany({ where: { orderId } })

    // Need storeId to populate redundant store_id columns.
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: { storeId: true },
    })
    if (!order) throw new Error(`Order ${orderId} vanished mid-replace`)

    // Insert new set with position 0..N-1.
    // Sequential inserts (N round-trips) rather than createMany —
    // createMany doesn't support nested options.create. For typical
    // cart sizes (≤15 items), the overhead is acceptable.
    for (let idx = 0; idx < items.length; idx++) {
      const i = items[idx]
      await tx.orderItem.create({
        data: {
          storeId: order.storeId,
          orderId,
          menuItemId: i.menuItemId,
          position: idx,
          name: i.name,
          unitPrice: i.unitPrice,
          quantity: i.quantity,
          note: i.note ?? null,
          options: {
            create: i.options.map(o => ({
              storeId: order.storeId,
              groupName: o.groupName,
              name: o.name,
              priceAdjust: o.priceAdjust,
            })),
          },
        },
      })
    }

    const updated = await tx.order.findUnique({
      where: { id: orderId },
      include: includeItemsAndOptions,
    })
    return updated as DraftOrderWithItems
  },

  /**
   * Promote draft → pending (order submit).
   * Optimistic lock: WHERE version=? AND status='draft'.
   *
   * Multi-step (version check + status flip + read) — tx MUST be TransactionClient (D55).
   *
   * This is THE B2 transition point. After this:
   *   - partial unique (session, device, status='draft') releases, allowing
   *     a new draft for subsequent cart-add
   *   - kitchen/KDS queries (findActive) start seeing this order
   *   - settlement queries (findSubmitted) include this order
   *   - SSE 'order:created' should fire from the controller AFTER tx commit (rule 2)
   */
  submitDraft: async (
    orderId: string,
    expectedVersion: number,
    tx: Prisma.TransactionClient
  ): Promise<SubmittedOrderWithItems> => {
    const bumped = await tx.order.updateMany({
      where: { id: orderId, version: expectedVersion, status: 'draft' },
      data: { version: { increment: 1 }, status: 'pending' },
    })
    if (bumped.count === 0) {
      const err = new Error('Draft order version mismatch or already submitted')
      ;(err as any).code = 'OPTIMISTIC_LOCK_CONFLICT'
      throw err
    }
    const submitted = await tx.order.findUnique({
      where: { id: orderId },
      include: includeItemsAndOptions,
    })
    return submitted as SubmittedOrderWithItems
  },

  /**
   * Advance a submitted order's status (pending → preparing → served).
   *
   * INTENTIONAL: no version check, last-write-wins.
   * Rationale: kitchen/KDS flow is physically mutex (one staff terminal /
   * single KDS display). Concurrent status flips on the same submitted order
   * do not happen in practice — draft was the real concurrency hotspot and
   * is already guarded by version lock.
   *
   * Status 'draft' is rejected at type level — drafts transition via submitDraft only.
   * Single-step write — `db: Db` OK (D55 exempt).
   */
  updateStatus: (
    id: string,
    status: Exclude<Order['status'], 'draft'>,
    db: Db
  ): Promise<Order> =>
    db.order.update({ where: { id }, data: { status } }),

  /**
   * Void a submitted order (admin action).
   *
   * State guard: only `pending` or `preparing` are voidable.
   *   - served orders require `refundOrder` (not yet implemented — touches Payment)
   *   - already-voided orders throw to surface bugs/double-click
   *
   * Single-step (updateMany + guard check is one tx round-trip counted as one step).
   */
  voidOrder: async (id: string, db: Db): Promise<Order> => {
    const result = await db.order.updateMany({
      where: { id, status: { in: ['pending', 'preparing'] } },
      data: { status: 'voided' },
    })
    if (result.count === 0) {
      throw new Error(`Cannot void order ${id}: not in voidable state (pending/preparing)`)
    }
    const voided = await db.order.findUnique({ where: { id } })
    if (!voided) throw new Error(`Order ${id} vanished after void`)
    return voided
  },
}

export type { OrderWithItems, DraftOrderWithItems, SubmittedOrderWithItems, DraftItemInput }
EOF
```

- [ ] **Step 2：验证 orders.ts 单独 tsc 过**

```bash
cd server
./node_modules/.bin/tsc --noEmit src/repositories/orders.ts 2>&1 | head
```

预期：**0 error**。

**若挂**，常见原因：
- Prisma 类型推断和自定义 narrow type 冲突——可能需要更显式的类型 assertion（`as Promise<...>` 已经加了）
- `OrderItem.position` 字段不存在——Phase B Task 2 Prisma schema 必须含 `position Int` + `@@unique([orderId, position])`
- `PaymentItem` 外键字段名不对——必须是 `orderItemId`（@map `order_item_id`）+ `paidQuantity`（@map `paid_quantity`），无 `itemKey` 列
- `Prisma.TransactionClient` 类型不存在——Prisma 版本问题，确认 `@prisma/client` >= 5.0

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

Phase D Task 17 — B2 foundation for Phase G Task 34.
- findSubmitted (default excludes draft, D24) / findDraft (explicit, D24)
- findBySessionId / findActive / findById
- createDraftOrder (nested Order + items + options, single-step atomic)
- replaceDraftItems (whole-array replace, matches legacy updateDeviceCart;
  multi-step write, TransactionClient required per D55)
- submitDraft (draft → pending transition, D30; TransactionClient required)
- updateStatus (kitchen flow, last-write-wins — see code comment for rationale)
- voidOrder (state-guarded: only pending/preparing voidable)
- Type discriminants (DraftOrderWithItems / SubmittedOrderWithItems, D23)

D56 compliant: no itemKey column on OrderItem. Position column (D57) anchors
idx contract. PaymentItem/SplitBillItem reference via FK + quantity in Task 19/20.

Throws OPTIMISTIC_LOCK_CONFLICT on version mismatch — Phase G route layer
maps to HTTP 409 + client retry (see Phase G handoff work-log).

orderRepo not yet imported by any controller; session-cart.ts and others
still use JsonStore. Migration happens in Phase G Task 33/34.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## 段 2 段 2a 完成

Task 16 (`store.ts`) + Task 17 (`orders.ts`) verify 通过（对话中，2026-04-17）。
Nit：`replaceDraftItems` 顺序插入循环已加 createMany 限制说明注释。

---

## Task 18：写 `server/src/repositories/sessions.ts`

**Files:**
- Create: `server/src/repositories/sessions.ts`

**前置**：Task 17 完成。

**方法清单**：

- `findById(id, db?)`：读单行
- `findActiveByTable(tableId, db?)`：查桌号当前 open session（唯一）
- `listByStore(db?)`：读当前租户所有 session（用于 admin 视图）
- `createForTable(input, tx)`：**多步**——创建 session + 更新 `table.current_session_id`。原子性。`TransactionClient` 必填（D55）
- `closeSession(id, tx)`：**多步**——`status='closed'` + `closed_at` + 清 `table.current_session_id`
- `reopenSession(id, tx)`：**多步**——反向，重新 set `table.current_session_id`
- `applyCouponSnapshot(id, snapshot, db)`：单步更新，flatten 字段（`coupon_code` / `coupon_type` / `coupon_value` / `coupon_applied_at`）
- `updateSettlementMode(id, mode, db)`：单步写（by-item / by-percent / unset）

- [ ] **Step 1：写文件**

```bash
cat > server/src/repositories/sessions.ts <<'EOF'
/**
 * Session entity repository.
 *
 * Session is THE source of truth for table occupancy + settlement mode +
 * coupon snapshot. Has 1:N with orders (drafts + submitted) and payments.
 *
 * Coupon snapshot (D13-adjacent): flattened onto Session row at apply time
 * (coupon_code / coupon_type / coupon_value / coupon_applied_at) — not a
 * JSONB blob, not a FK. Keeps historical record of "what coupon was applied
 * to this session" even if the Coupon row later changes.
 *
 * Multi-step methods (createForTable/close/reopen) touch both sessions and
 * tables.current_session_id — tx mandatory per D55.
 */

import { Prisma } from '@prisma/client'
import type { Session, SessionStatus } from '@prisma/client'
import { prisma, type Db } from './prisma-client.js'

export const sessionRepo = {
  findById: (id: string, db: Db = prisma): Promise<Session | null> =>
    db.session.findUnique({ where: { id } }),

  /**
   * Find the currently-open session for a table. At most one row expected
   * (business invariant — enforced by application logic, not DB constraint).
   */
  findActiveByTable: (tableId: string, db: Db = prisma): Promise<Session | null> =>
    db.session.findFirst({ where: { tableId, status: 'open' } }),

  listByStore: (db: Db = prisma): Promise<Session[]> =>
    db.session.findMany({ orderBy: { createdAt: 'desc' } }),

  /**
   * Atomic: create session + set table.current_session_id.
   * Caller should first verify no existing open session for the table
   * (findActiveByTable) — otherwise two open sessions collide at application level.
   */
  createForTable: async (
    input: { storeId: string; tableId: string },
    tx: Prisma.TransactionClient
  ): Promise<Session> => {
    const session = await tx.session.create({
      data: {
        storeId: input.storeId,
        tableId: input.tableId,
        status: 'open',
        settlementMode: 'unset',
      },
    })
    await tx.table.update({
      where: { id: input.tableId },
      data: { currentSessionId: session.id },
    })
    return session
  },

  /**
   * Close: status='closed', closedAt=now, table.current_session_id=null.
   * Does NOT verify "fully paid" — that's service-layer concern (settlement gateway).
   */
  closeSession: async (id: string, tx: Prisma.TransactionClient): Promise<Session> => {
    const closed = await tx.session.update({
      where: { id },
      data: { status: 'closed', closedAt: new Date() },
    })
    await tx.table.update({
      where: { id: closed.tableId },
      data: { currentSessionId: null },
    })
    return closed
  },

  reopenSession: async (id: string, tx: Prisma.TransactionClient): Promise<Session> => {
    const reopened = await tx.session.update({
      where: { id },
      data: { status: 'open', closedAt: null },
    })
    await tx.table.update({
      where: { id: reopened.tableId },
      data: { currentSessionId: reopened.id },
    })
    return reopened
  },

  /**
   * Single-step: flatten coupon fields onto session row.
   * Snapshot semantics — if the referenced Coupon later changes, session keeps
   * the original values (couponType / couponValue frozen at apply time).
   */
  applyCouponSnapshot: (
    id: string,
    snapshot: {
      couponCode: string
      couponType: string
      couponValue: number
    },
    db: Db
  ): Promise<Session> =>
    db.session.update({
      where: { id },
      data: {
        couponCode: snapshot.couponCode,
        couponType: snapshot.couponType,
        couponValue: snapshot.couponValue,
        couponAppliedAt: new Date(),
      },
    }),

  updateSettlementMode: (
    id: string,
    mode: 'unset' | 'by-item' | 'by-percent',
    db: Db
  ): Promise<Session> =>
    db.session.update({ where: { id }, data: { settlementMode: mode } }),
}
EOF
```

- [ ] **Step 2：tsc + commit**

```bash
cd server && ./node_modules/.bin/tsc --noEmit src/repositories/sessions.ts 2>&1 | head
cd "$(git rev-parse --show-toplevel)"
git add server/src/repositories/sessions.ts
git commit -m "feat(phase-5): add sessions repository

Task 18: session CRUD + lifecycle (create/close/reopen) + coupon snapshot +
settlementMode update. Multi-step lifecycle methods require TransactionClient
(D55) since they atomically update both sessions and tables.current_session_id.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 19：写 `server/src/repositories/payments.ts`

**Files:**
- Create: `server/src/repositories/payments.ts`

**前置**：Task 18 完成。

**方法清单**（D56 落地 — FK + paidQuantity 模型）：

- `create(input, tx)`：**多步**——Payment + PaymentItem[]（含 orderItemId FK + paidQuantity）。原子
- `findById(id, db?)`：含 items relation
- `findBySessionId(sessionId, db?)`：本 session 所有支付
- `findByStripeId(stripePaymentIntentId, db?)`：webhook 幂等用
- `confirmStripe(stripePaymentIntentId, db)`：webhook 确认——`status='pending' → 'confirmed'`
- `sumConfirmed(sessionId, db?)`：聚合本 session confirmed 支付总额
- `derivePaidQuantityByOrderItem(sessionId, db?)`：**D56 核心**——返回 `Map<orderItemId, paidQty>`，替代 legacy `derivePaidState` 的 `paidItemIds` 字符串集合

- [ ] **Step 1：写文件**

```bash
cat > server/src/repositories/payments.ts <<'EOF'
/**
 * Payment entity repository (D56 FK model).
 *
 * PaymentItem is the normalized replacement for legacy Payment.itemKeys
 * string array — each row is (paymentId, orderItemId FK, paidQuantity).
 * Never emits or accepts the legacy "orderId:idx:qty" string here — that's
 * the API boundary's concern (see server/src/lib/legacy-itemkey.ts, Phase G task).
 *
 * derivePaidQuantityByOrderItem replaces legacy derivePaidState.paidItemIds
 * with a Map<orderItemId, qty> aggregate — used by settlement to skip
 * already-paid items during FIFO / split creation.
 */

import { Prisma } from '@prisma/client'
import type { Payment, PaymentItem } from '@prisma/client'
import { prisma, type Db } from './prisma-client.js'

type PaymentWithItems = Payment & { items: PaymentItem[] }

export const paymentRepo = {
  findById: (id: string, db: Db = prisma): Promise<PaymentWithItems | null> =>
    db.payment.findUnique({
      where: { id },
      include: { items: true },
    }) as Promise<PaymentWithItems | null>,

  findBySessionId: (sessionId: string, db: Db = prisma): Promise<PaymentWithItems[]> =>
    db.payment.findMany({
      where: { sessionId },
      include: { items: true },
      orderBy: { createdAt: 'asc' },
    }) as Promise<PaymentWithItems[]>,

  findByStripeId: (
    stripePaymentIntentId: string,
    db: Db = prisma
  ): Promise<PaymentWithItems | null> =>
    db.payment.findFirst({
      where: { stripePaymentIntentId },
      include: { items: true },
    }) as Promise<PaymentWithItems | null>,

  /**
   * Atomic: create Payment + its PaymentItem[] in one tx.
   * Multi-step (insert Payment, then N inserts for items) — TransactionClient required.
   * Single-step Prisma nested create would work too, but we use explicit two-phase
   * to match Task 17 replaceDraftItems style + allow future per-item validation.
   */
  create: async (
    input: {
      storeId: string
      sessionId: string
      method: string            // 'stripe' | 'cash'
      amount: number            // cents, excludes tip
      tipAmount?: number
      taxAmount?: number
      stripePaymentIntentId?: string
      status: 'pending' | 'confirmed' | 'refunded'
      items: { orderItemId: string; paidQuantity: number }[]
    },
    tx: Prisma.TransactionClient
  ): Promise<PaymentWithItems> => {
    const payment = await tx.payment.create({
      data: {
        storeId: input.storeId,
        sessionId: input.sessionId,
        method: input.method,
        amount: input.amount,
        tipAmount: input.tipAmount ?? 0,
        taxAmount: input.taxAmount ?? 0,
        stripePaymentIntentId: input.stripePaymentIntentId ?? null,
        status: input.status,
        items: {
          create: input.items.map(i => ({
            storeId: input.storeId,
            orderItemId: i.orderItemId,
            paidQuantity: i.paidQuantity,
          })),
        },
      },
      include: { items: true },
    })
    return payment as PaymentWithItems
  },

  /**
   * Webhook handler: mark a pending Payment as confirmed.
   * Idempotent — if already confirmed, returns existing row.
   * Throws if Payment with given stripe ID doesn't exist.
   */
  confirmStripe: async (
    stripePaymentIntentId: string,
    tx: Prisma.TransactionClient
  ): Promise<PaymentWithItems> => {
    const existing = await tx.payment.findFirst({
      where: { stripePaymentIntentId },
      include: { items: true },
    })
    if (!existing) throw new Error(`No Payment with stripe id ${stripePaymentIntentId}`)
    if (existing.status === 'confirmed') return existing as PaymentWithItems

    const confirmed = await tx.payment.update({
      where: { id: existing.id },
      data: { status: 'confirmed' },
      include: { items: true },
    })
    return confirmed as PaymentWithItems
  },

  /**
   * Sum of confirmed payment amounts (excludes tip, per project convention).
   */
  sumConfirmed: async (sessionId: string, db: Db = prisma): Promise<number> => {
    const agg = await db.payment.aggregate({
      where: { sessionId, status: 'confirmed' },
      _sum: { amount: true },
    })
    return agg._sum.amount ?? 0
  },

  /**
   * D56 core: paid quantity aggregation keyed by orderItemId.
   * Only counts items from CONFIRMED payments.
   *
   * Used by settlement gateway to:
   *   - skip already-paid items in FIFO attribution
   *   - validate split requests don't overlap paid quantity
   *   - compute "remaining" for by-item mode
   *
   * Returns Map<orderItemId, totalPaidQty>.
   */
  derivePaidQuantityByOrderItem: async (
    sessionId: string,
    db: Db = prisma
  ): Promise<Map<string, number>> => {
    const rows = await db.paymentItem.findMany({
      where: {
        payment: { sessionId, status: 'confirmed' },
      },
      select: { orderItemId: true, paidQuantity: true },
    })
    const map = new Map<string, number>()
    for (const r of rows) {
      map.set(r.orderItemId, (map.get(r.orderItemId) ?? 0) + r.paidQuantity)
    }
    return map
  },
}

export type { PaymentWithItems }
EOF
```

- [ ] **Step 2：tsc + commit**

```bash
cd server && ./node_modules/.bin/tsc --noEmit src/repositories/payments.ts 2>&1 | head
cd "$(git rev-parse --show-toplevel)"
git add server/src/repositories/payments.ts
git commit -m "feat(phase-5): add payments repository (D56 FK model)

Task 19: Payment + PaymentItem CRUD with (orderItemId FK + paidQuantity).
derivePaidQuantityByOrderItem replaces legacy derivePaidState.paidItemIds
string aggregation — returns Map<orderItemId, paidQty> for settlement logic.

Legacy itemKey string format (orderId:idx:qty) lives only at API boundary
(Phase G legacy-itemkey.ts helper); this repo is pure FK.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 20：写 `server/src/repositories/split-bills.ts`

**Files:**
- Create: `server/src/repositories/split-bills.ts`

**前置**：Task 19 完成。

**方法清单**（D56 FK 模型）：

- `create(input, tx)`：**多步**——SplitBill + SplitBillItem[]（by-item 才有 items，by-percent items 为空）
- `findById(id, db?)`：含 items
- `findActive(sessionId, db?)`：`status='active'` 的 splits
- `markPaid(id, tx)`：单步——`status='paid'`
- `delete(id, db)`：**物理删除**（和现有 deleteSplitBill 语义一致，active split 取消即删）
- `sumAssignedQuantityByOrderItem(sessionId, db?)`：**active splits** 的已分配量聚合——for 冲突检测

- [ ] **Step 1：写文件**

```bash
cat > server/src/repositories/split-bills.ts <<'EOF'
/**
 * SplitBill entity repository (D56 FK model).
 *
 * SplitBillItem is (splitBillId, orderItemId FK, quantity) — the D56
 * replacement for legacy itemKey string encoding.
 *
 * Conflict detection (for settlement gateway's createSplit):
 *   available(orderItemId) = orderItem.quantity
 *                          - derivePaidQuantityByOrderItem(orderItemId)
 *                          - sumAssignedQuantityByOrderItem(orderItemId)
 *   requested ≤ available → accept; otherwise reject
 *
 * Invalidation (physical delete via `delete`): when a payment lands that
 * overlaps an active split's items, the settlement gateway calls delete(id)
 * on conflicting splits. Historical splits aren't preserved — the payment
 * itself is the historical record of what was paid.
 */

import { Prisma } from '@prisma/client'
import type { SplitBill, SplitBillItem } from '@prisma/client'
import { prisma, type Db } from './prisma-client.js'

type SplitBillWithItems = SplitBill & { items: SplitBillItem[] }

export const splitBillRepo = {
  findById: (id: string, db: Db = prisma): Promise<SplitBillWithItems | null> =>
    db.splitBill.findUnique({
      where: { id },
      include: { items: true },
    }) as Promise<SplitBillWithItems | null>,

  findActive: (sessionId: string, db: Db = prisma): Promise<SplitBillWithItems[]> =>
    db.splitBill.findMany({
      where: { sessionId, status: 'active' },
      include: { items: true },
      orderBy: { createdAt: 'asc' },
    }) as Promise<SplitBillWithItems[]>,

  /**
   * Create SplitBill + items (by-item only; by-percent passes empty items[]).
   * Multi-step — TransactionClient required (D55).
   * Caller (settlement gateway) is responsible for pre-validating conflicts
   * via derivePaidQuantityByOrderItem + sumAssignedQuantityByOrderItem.
   */
  create: async (
    input: {
      storeId: string
      sessionId: string
      type: 'by-item' | 'by-percent'
      percent?: number
      subtotal: number
      tax: number
      tip?: number
      amount: number
      items: { orderItemId: string; quantity: number }[]
    },
    tx: Prisma.TransactionClient
  ): Promise<SplitBillWithItems> => {
    const created = await tx.splitBill.create({
      data: {
        storeId: input.storeId,
        sessionId: input.sessionId,
        type: input.type,
        percent: input.percent ?? null,
        subtotal: input.subtotal,
        tax: input.tax,
        tip: input.tip ?? 0,
        amount: input.amount,
        status: 'active',
        items: {
          create: input.items.map(i => ({
            storeId: input.storeId,
            orderItemId: i.orderItemId,
            quantity: i.quantity,
          })),
        },
      },
      include: { items: true },
    })
    return created as SplitBillWithItems
  },

  markPaid: (id: string, tx: Prisma.TransactionClient): Promise<SplitBill> =>
    tx.splitBill.update({ where: { id }, data: { status: 'paid' } }),

  /**
   * Physical delete. Matches legacy deleteSplitBill semantics — cancelled
   * splits leave no DB trace (payment rows carry audit instead).
   * Cascade deletes SplitBillItem via FK.
   */
  delete: (id: string, db: Db): Promise<SplitBill> =>
    db.splitBill.delete({ where: { id } }),

  /**
   * Sum of quantity assigned to ACTIVE splits, keyed by orderItemId.
   * Used by settlement gateway to check "how much of each orderItem is
   * already reserved by other active splits?" before accepting a new split.
   *
   * Returns Map<orderItemId, totalAssignedQty>.
   */
  sumAssignedQuantityByOrderItem: async (
    sessionId: string,
    db: Db = prisma
  ): Promise<Map<string, number>> => {
    const rows = await db.splitBillItem.findMany({
      where: {
        splitBill: { sessionId, status: 'active' },
      },
      select: { orderItemId: true, quantity: true },
    })
    const map = new Map<string, number>()
    for (const r of rows) {
      map.set(r.orderItemId, (map.get(r.orderItemId) ?? 0) + r.quantity)
    }
    return map
  },
}

export type { SplitBillWithItems }
EOF
```

- [ ] **Step 2：tsc + commit**

```bash
cd server && ./node_modules/.bin/tsc --noEmit src/repositories/split-bills.ts 2>&1 | head
cd "$(git rev-parse --show-toplevel)"
git add server/src/repositories/split-bills.ts
git commit -m "feat(phase-5): add split-bills repository (D56 FK model)

Task 20: SplitBill + SplitBillItem with (orderItemId FK + quantity).
sumAssignedQuantityByOrderItem pairs with payments.derivePaidQuantityByOrderItem
for settlement gateway's conflict detection.

Physical delete for cancellation (matches legacy deleteSplitBill).

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 21：写 `server/src/repositories/menu.ts`

**Files:**
- Create: `server/src/repositories/menu.ts`

**前置**：Task 20 完成。

**方法清单**（涵盖 Category + MenuItem + MenuItemOption 三实体）：

- `listMenu(db?)`：读当前租户菜单——categories + 嵌套 menuItems（按 sortOrder）+ 嵌套 options
- `listCategories(db?)`：**(Phase E 段 3a 回填)** flat categories（不带 nested menuItems）——analytics/admin 列表用，避免 listMenu 的 nested 负载
- `findCategory(id, db?)` / `findItem(id, db?)`：基础 read
- `upsertCategory(data, db)` / `upsertItem(data, db)` / `upsertOption(data, db)`：单步写
- `setItemAvailability(id, isAvailable, db)`：单步
- `replaceItemOptions(itemId, options, tx)`：多步——wipe + re-insert，matches orders.ts replaceDraftItems 模式

- [ ] **Step 1：写文件**

```bash
cat > server/src/repositories/menu.ts <<'EOF'
/**
 * Menu domain repository — bundles Category + MenuItem + MenuItemOption.
 *
 * Single file (not three) because these always query together: listMenu
 * returns Category[] with nested menuItems with nested options. Splitting
 * would force every caller to do 3 joins manually.
 *
 * Options model: when an admin edits an item's options, the whole set is
 * replaced (replaceItemOptions) — matching the cart replaceDraftItems
 * pattern. Keeps callers simple; tiny option arrays make the DELETE+INSERT
 * cost trivial.
 */

import { Prisma } from '@prisma/client'
import type { Category, MenuItem, MenuItemOption } from '@prisma/client'
import { prisma, type Db } from './prisma-client.js'

type MenuItemWithOptions = MenuItem & { options: MenuItemOption[] }
type CategoryWithItems = Category & { menuItems: MenuItemWithOptions[] }

export const menuRepo = {
  /**
   * Full menu for current tenant, ordered + nested.
   * Inactive categories hidden; unavailable items included (caller filters).
   */
  listMenu: (db: Db = prisma): Promise<CategoryWithItems[]> =>
    db.category.findMany({
      where: { isActive: true },
      include: {
        menuItems: {
          include: { options: { orderBy: { sortOrder: 'asc' } } },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    }) as Promise<CategoryWithItems[]>,

  /** Phase E 段 3a 回填: flat categories (no nested items) for analytics/admin lists. */
  listCategories: (db: Db = prisma): Promise<Category[]> =>
    db.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    }),

  findCategory: (id: string, db: Db = prisma): Promise<Category | null> =>
    db.category.findUnique({ where: { id } }),

  findItem: (id: string, db: Db = prisma): Promise<MenuItemWithOptions | null> =>
    db.menuItem.findUnique({
      where: { id },
      include: { options: { orderBy: { sortOrder: 'asc' } } },
    }) as Promise<MenuItemWithOptions | null>,

  upsertCategory: (data: Prisma.CategoryUncheckedCreateInput, db: Db): Promise<Category> =>
    db.category.upsert({
      where: { id: data.id ?? '' },
      create: data,
      update: {
        name: data.name,
        nameEn: data.nameEn,
        sortOrder: data.sortOrder,
        isActive: data.isActive,
        quickTags: data.quickTags,
      },
    }),

  upsertItem: (data: Prisma.MenuItemUncheckedCreateInput, db: Db): Promise<MenuItem> =>
    db.menuItem.upsert({
      where: { id: data.id ?? '' },
      create: data,
      update: {
        categoryId: data.categoryId,
        name: data.name,
        nameEn: data.nameEn,
        description: data.description,
        descriptionEn: data.descriptionEn,
        imageUrl: data.imageUrl,
        price: data.price,
        originalPrice: data.originalPrice,
        isAvailable: data.isAvailable,
        isStaffOnly: data.isStaffOnly,
        sortOrder: data.sortOrder,
      },
    }),

  setItemAvailability: (id: string, isAvailable: boolean, db: Db): Promise<MenuItem> =>
    db.menuItem.update({ where: { id }, data: { isAvailable } }),

  /**
   * Whole-set replace for an item's options. Multi-step — TransactionClient
   * required. Matches replaceDraftItems pattern (wipe + re-insert).
   */
  replaceItemOptions: async (
    itemId: string,
    options: {
      groupName: string
      name: string
      nameEn?: string
      priceAdjust: number
      isDefault?: boolean
      sortOrder?: number
    }[],
    tx: Prisma.TransactionClient
  ): Promise<MenuItemWithOptions> => {
    const item = await tx.menuItem.findUnique({
      where: { id: itemId },
      select: { storeId: true },
    })
    if (!item) throw new Error(`MenuItem ${itemId} not found`)

    await tx.menuItemOption.deleteMany({ where: { menuItemId: itemId } })

    for (const opt of options) {
      await tx.menuItemOption.create({
        data: {
          storeId: item.storeId,
          menuItemId: itemId,
          groupName: opt.groupName,
          name: opt.name,
          nameEn: opt.nameEn,
          priceAdjust: opt.priceAdjust,
          isDefault: opt.isDefault ?? false,
          sortOrder: opt.sortOrder ?? 0,
        },
      })
    }

    const updated = await tx.menuItem.findUnique({
      where: { id: itemId },
      include: { options: { orderBy: { sortOrder: 'asc' } } },
    })
    return updated as MenuItemWithOptions
  },
}

export type { CategoryWithItems, MenuItemWithOptions }
EOF
```

- [ ] **Step 2：tsc + commit**

```bash
cd server && ./node_modules/.bin/tsc --noEmit src/repositories/menu.ts 2>&1 | head
cd "$(git rev-parse --show-toplevel)"
git add server/src/repositories/menu.ts
git commit -m "feat(phase-5): add menu repository (Category + MenuItem + MenuItemOption)

Task 21: single-file bundle for the three menu entities.
listMenu returns nested Category[] > MenuItem[] > Option[] in one round-trip.
replaceItemOptions follows replaceDraftItems pattern for option edits.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 22：写 `server/src/repositories/staff.ts`

**Files:**
- Create: `server/src/repositories/staff.ts`

**前置**：Task 21 完成。

**方法清单**：

- `findById(id, db?)`：含 role relation
- `findByUsername(username, db?)`：login 用（RLS 已保证本租户）
- `listAll(db?)`
- `create(data, db)`：单步
- `updateRole(staffId, roleId, db)`：单步
- `setClockPin(staffId, clockPin, db)`：单步
- `setPassword(staffId, passwordHash, db)`：单步——**字段名 passwordHash 不是 password**（D56 的同类事实修正——schema 字段名已在 Phase B Task 2 修正）

**Phase E 段 3b 回填方法**（原 Task 22 plan 未列，Phase E 实施期发现依赖缺失）：

- `delete(id, db)`：**(段 3b 决策点 F)** 物理删除 Staff——Agent B `removeStaff` 流程依赖（legacy `staff.service.ts:114`）
- `findActiveTimeEntry(staffId, db?)`：**(段 3b Phase D 遗漏)** 查 staffId 未 clockOutAt 的 TimeEntry——verifyPin / clockInAt 路径依赖（legacy `clock.service.ts:19`）
- `createTimeEntry(data, db)`：创建打卡记录（legacy `clock.service.ts:40`）
- `closeTimeEntry(entryId, clockOutAt, db)`：关闭打卡记录——repo update `clockOutAt` only（schema 无 duration 列；**决策点 G refresh**：duration 在 `listTimeEntries` RETURN shape compute on-the-fly via mapper, NOT persisted column, schema-migration-avoiding per D89 self-application）
- `listTimeEntries(storeId, filter?, db?)`：列工时, 返回 `TimeEntryWithDuration[]`（derived `duration` = clockOutAt - clockInAt in minutes; null if not closed）（legacy `clock.service.ts:67` + Agent C `analytics.service.getStaffPerformance` 依赖）

- [ ] **Step 1：写文件**

```bash
cat > server/src/repositories/staff.ts <<'EOF'
/**
 * Staff entity repository.
 *
 * Field name note: legacy JsonStore used `password`; Prisma schema uses
 * `passwordHash`. This repo surfaces the Prisma name — controller-layer
 * auth.service must assign bcrypt(password) to passwordHash, not password.
 *
 * RLS note: findByUsername doesn't need explicit storeId because the
 * tenant context (app.current_store_id) restricts rows at DB level.
 */

import type { Staff, Role, TimeEntry } from '@prisma/client'
import { prisma, type Db } from './prisma-client.js'

type StaffWithRole = Staff & { role: Role | null }
type TimeEntryWithDuration = TimeEntry & { duration: number | null }

export const staffRepo = {
  findById: (id: string, db: Db = prisma): Promise<StaffWithRole | null> =>
    db.staff.findUnique({
      where: { id },
      include: { role: true },
    }) as Promise<StaffWithRole | null>,

  findByUsername: (username: string, db: Db = prisma): Promise<StaffWithRole | null> =>
    db.staff.findFirst({
      where: { username },
      include: { role: true },
    }) as Promise<StaffWithRole | null>,

  listAll: (db: Db = prisma): Promise<StaffWithRole[]> =>
    db.staff.findMany({
      include: { role: true },
      orderBy: { createdAt: 'asc' },
    }) as Promise<StaffWithRole[]>,

  create: (
    data: {
      storeId: string
      username: string
      passwordHash: string
      roleId: string
      clockPin?: string
      displayName?: string
    },
    db: Db
  ): Promise<Staff> =>
    db.staff.create({
      data: {
        storeId: data.storeId,
        username: data.username,
        passwordHash: data.passwordHash,
        roleId: data.roleId,
        clockPin: data.clockPin ?? null,
        displayName: data.displayName ?? null,
      },
    }),

  updateRole: (staffId: string, roleId: string, db: Db): Promise<Staff> =>
    db.staff.update({ where: { id: staffId }, data: { roleId } }),

  setClockPin: (staffId: string, clockPin: string, db: Db): Promise<Staff> =>
    db.staff.update({ where: { id: staffId }, data: { clockPin } }),

  setPassword: (staffId: string, passwordHash: string, db: Db): Promise<Staff> =>
    db.staff.update({ where: { id: staffId }, data: { passwordHash } }),

  // ========== Phase E 段 3b 回填: delete + TimeEntry methods ==========

  delete: (id: string, db: Db): Promise<Staff> =>
    db.staff.delete({ where: { id } }),

  findActiveTimeEntry: (staffId: string, db: Db = prisma): Promise<TimeEntry | null> =>
    db.timeEntry.findFirst({
      where: { staffId, clockOutAt: null },
      orderBy: { clockInAt: 'desc' },
    }),

  createTimeEntry: (
    data: { staffId: string; storeId: string; clockInAt: Date },
    db: Db
  ): Promise<TimeEntry> =>
    db.timeEntry.create({
      data: {
        staffId: data.staffId,
        storeId: data.storeId,
        clockInAt: data.clockInAt,
        clockOutAt: null,
      },
    }),

  /**
   * Close an active TimeEntry. Decision point G (refresh): schema has no
   * duration column — duration is derived in the RETURN shape of
   * listTimeEntries (compute on-the-fly: clockOutAt - clockInAt in minutes).
   * Repo updates clockOutAt only. Caller passes only clockOutAt timestamp.
   * Throws if entry already closed (double-close guard).
   * Schema-migration-avoiding per D89 self-application — business invariant
   * still enforced in repo (mapper layer), NOT in persisted column.
   */
  closeTimeEntry: async (
    entryId: string,
    clockOutAt: Date,
    db: Db
  ): Promise<TimeEntry> => {
    const entry = await db.timeEntry.findUnique({ where: { id: entryId } })
    if (!entry) throw new Error(`TimeEntry ${entryId} not found`)
    if (entry.clockOutAt) throw new Error(`TimeEntry ${entryId} already closed`)
    return db.timeEntry.update({
      where: { id: entryId },
      data: { clockOutAt },
    })
  },

  listTimeEntries: (
    storeId: string,
    filter: { staffId?: string; from?: Date; to?: Date } = {},
    db: Db = prisma
  ): Promise<TimeEntryWithDuration[]> =>
    db.timeEntry.findMany({
      where: {
        storeId,
        ...(filter.staffId && { staffId: filter.staffId }),
        ...(filter.from && { clockInAt: { gte: filter.from } }),
        ...(filter.to && { clockInAt: { lte: filter.to } }),
      },
      orderBy: { clockInAt: 'desc' },
    }).then((rows) => rows.map((e) => ({
      ...e,
      duration: e.clockOutAt
        ? Math.floor((e.clockOutAt.getTime() - e.clockInAt.getTime()) / 60000)
        : null,
    }))),
}

export type { StaffWithRole, TimeEntryWithDuration }
EOF
```

- [ ] **Step 2：tsc + commit**

```bash
cd server && ./node_modules/.bin/tsc --noEmit src/repositories/staff.ts 2>&1 | head
cd "$(git rev-parse --show-toplevel)"
git add server/src/repositories/staff.ts
git commit -m "feat(phase-5): add staff repository

Task 22: basic CRUD + findByUsername (login) + role/clockPin/password setters.
Field rename: legacy 'password' → Prisma 'passwordHash' (D56-adjacent fix).

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## 段 2 段 2b 完成

Task 18-22 全部写完（sessions / payments / split-bills / menu / staff）。

**用户 spot check 建议**：Task 19 payments.ts（D56 FK + derivePaidQuantityByOrderItem 是核心）+ 随机一个 Task 18/20/21/22 即可。其他信汇报。

---

## 段 2c（Task 23-26）见独立文件

**2026-04-17 文件拆分**：段 2c 的 4 个 task（roles / coupons / waitlist / platform-admin）移至独立文件以符合规则 8（避免本文件继续累积破防）：

→ [`phase-d-repositories-part2.md`](./phase-d-repositories-part2.md)

拆分理由见该文件开头小节。完整 Phase D 验收（11 个 repo 一次冒烟）的命令仍在本文件上方 "Phase D 最终验收" 小节。

---

## Phase E 回填附录（2026-04-17 事后补丁）

Phase E plan 段 3a/3b/3c 实施期发现 Phase D 原始 plan 存在 5 项方法/文件缺失——
实施 agent 跑到调用点时发现 Phase D repo 未覆盖。5 项集中在本附录作为事后补丁
记录，对应方法/文件本体已在上方 Task 21/22 + `phase-d-repositories-part2.md`
Task 23 原位 inline 回填（保持 plan 对实施 agent 的机械可读性）：

| # | 补丁内容 | 原 Task | 发现来源 | 原位回填处 |
|---|---|---|---|---|
| 1 | `menuRepo.listCategories` | Task 21 menu.ts | 段 3a 决策点 A | 本文件 Task 21 inline |
| 2 | `staffRepo.delete` | Task 22 staff.ts | 段 3b 决策点 F | 本文件 Task 22 inline |
| 3 | `staffRepo.findActiveTimeEntry` + `createTimeEntry` + `closeTimeEntry` + `listTimeEntries` | Task 22 staff.ts | 段 3b Phase D 遗漏（clock.service 依赖） | 本文件 Task 22 inline |
| 4 | `roleRepo.findByName` | Task 23 roles.ts | 段 3b 决策点 E | `phase-d-repositories-part2.md` Task 23 inline |
| 5 | **`printerRepo` 新文件** | 新增（本附录直接落） | 段 3c Phase D 遗漏 | **本附录下方** |

### Phase E 回填项 5：`printerRepo` 新文件

**Files:**
- Create: `server/src/repositories/printer.ts`

**设计职责**：Printer entity 的最小 repo。Store 和 Printer 是 1:1 关系（app convention，每店最多一个 printer 配置）。Phase D 原始 11 repo 清单无 printer——Phase E Agent C 段 3c 发现缺失。Schema state: `model Printer / @@map("printers") / @@index([storeId])` (NOT `@@unique`) — schema-migration-avoiding per D89 self-application, findFirst + create/update flow at app layer.

**方法清单**：
- `findByStoreId(storeId, db?)`：读当前 store 的 printer config（0/1 行；findFirst — schema 只 `@@index([storeId])` NOT `@@unique`）
- `upsertConfig(storeId, config, tx)`：多步 atomic upsert——findFirst + (existing ? update : create), schema-migration-avoiding per D89 self-application. **D55 多步 tx 强制**: signature `tx: Prisma.TransactionClient` (caller 必 wrap `prisma.$transaction(async tx => ...)`). 折叠 legacy 3 步 get/check/create（`printer.service.ts:14-34`）

**实施模板**：

```bash
cat > server/src/repositories/printer.ts <<'EOF'
/**
 * Printer entity repository.
 *
 * Store ↔ Printer is 1:1 by app convention. Schema only has @@index(storeId)
 * (NOT @@unique) — app layer enforces single config per store via findFirst
 * + create/update flow. Future migration may add @@unique for hard guarantee
 * (optional, schema-migration-avoiding per D89 self-application).
 *
 * Scope: CRUD on config row. Actual print dispatch (printOrder / reprintOrder)
 * stays in service layer — it's hardware protocol, not data access.
 */

import type { Printer, Prisma } from '@prisma/client'
import { prisma, type Db } from './prisma-client.js'

export const printerRepo = {
  findByStoreId: (storeId: string, db: Db = prisma): Promise<Printer | null> =>
    db.printer.findFirst({ where: { storeId } }),

  /**
   * Upsert by storeId — multi-step atomic (findFirst + update OR create).
   * Schema only @@index(storeId) NOT @@unique, so Prisma upsert by storeId
   * is unavailable. D89 self-application schema-migration-avoiding path.
   * D55: multi-step tx requires `tx: Prisma.TransactionClient` signature
   * (caller must wrap `prisma.$transaction(async tx => ...)`).
   * Collapses legacy 3-step get/check/create (see printer.service.ts:14-34).
   */
  upsertConfig: async (
    storeId: string,
    config: {
      name?: string
      type: string
      host?: string | null
      port?: number | null
      isEnabled?: boolean
    },
    tx: Prisma.TransactionClient
  ): Promise<Printer> => {
    const existing = await tx.printer.findFirst({ where: { storeId } })
    if (existing) {
      return tx.printer.update({
        where: { id: existing.id },
        data: {
          type: config.type,
          ...(config.name !== undefined && { name: config.name }),
          ...(config.host !== undefined && { host: config.host }),
          ...(config.port !== undefined && { port: config.port }),
          ...(config.isEnabled !== undefined && { isEnabled: config.isEnabled }),
        },
      })
    }
    return tx.printer.create({
      data: {
        storeId,
        type: config.type,
        name: config.name ?? 'Default Printer',
        host: config.host ?? null,
        port: config.port ?? null,
        isEnabled: config.isEnabled ?? true,
      },
    })
  },
}
EOF
```

**Prisma schema 依赖**（Phase B Task 2 已含 `model Printer / @@map("printers")`, schema state confirmed by Phase D-5 batch entry CC dump 2026-05-11）：
- `model Printer` 实体：id / storeId / type (String required no default) / name / host (String?) / port (Int?) / isEnabled (Boolean) / createdAt
- `@@index([storeId])` 索引（NOT `@@unique` — 1:1 由 app layer enforce via findFirst + create/update; schema-migration-avoiding per D89 self-application. Future migration 可加 `@@unique([storeId])` 升级为 hard guarantee, optional）
- RLS policy（同其他 tenant-scoped 表，`USING (store_id = current_setting('app.current_store_id'))`）

Phase B Task 2 schema 已含 `model Printer`，无需新增 migration。

**Phase D 验收命令更新**：原 11 repo for 循环改为 12：

```bash
for f in server/src/repositories/{store,orders,sessions,payments,split-bills,menu,staff,roles,coupons,waitlist,platform-admin,printer}.ts; do
  cd server && ./node_modules/.bin/tsc --noEmit $f 2>&1 | grep -E "error TS" && echo "FAIL: $f" || echo "OK: $f"
  cd ..
done
```

---

### 回填方式的设计决策

- **原位 inline（项 1-4）**：方法写进原 Task heredoc，实施 agent 按 Task 读一遍就能机械执行——不用跨文件跳转
- **附录独立小节（项 5）**：printerRepo 是新文件而非加方法，附录定义更清晰
- **每项 git blame 可追溯**：commit message 明示每项来源段，reviewer `git log -p` 能看到每方法是 2026-04-17 事后补充，不是 Phase D 原始设计
- **00-index.md 的 Phase D 任务数不改**：附录的 printerRepo 不占 Task 编号——避免 Phase E/F/G 的 Task 27+ 编号连锁变动


# Phase 5 Plan — Phase E Stage 3a：Agent A（menu + category 域迁移）

> **如何使用本文件**
>
> - 全局规则见 [`00-index.md`](./00-index.md#全局规则所有-task-遵守)
> - 本 phase 前置：Phase D 实施全部完成（Task 16-26 写出 + 实施到位），Phase B Task 6 (`withTenantContext`) + Task 8 (`tenantAwareRoute` 装饰器) 已落。
> - 本文件只含 **Task 27**（Agent A 工作包）
> - 姐妹文件：[`phase-e-agent-b.md`](./phase-e-agent-b.md)（Agent B staff 体系）/ [`phase-e-agent-c.md`](./phase-e-agent-c.md)（Agent C coupon/analytics/printer）
> - 执行方式（spec D43 / §9.6）：**串行 A → B → C，不开 worktree**——共享文件冲突概率低，但 controller 层的 import 和测试 setup 可能互相牵连

## Spec §9.6 事实修正（规则 7 主动应用）

spec §9.6 "Agent A 独占" 列表有事实错误（grep 验证于 2026-04-17）：

| spec 声明 | 实际状态 | 处理 |
|---|---|---|
| `server/src/routes/menu.routes.ts` | ✅ 存在 | 修改 |
| `server/src/routes/category.routes.ts` | ❌ **不存在**（category 路由合并在 menu.routes.ts 内） | 从 spec 列表删 |
| `server/src/controllers/menu.service.ts` | ✅ 存在（含 category + menuItem 两套 CRUD） | 修改 |
| `server/src/__tests__/menu.test.ts` | ❌ **不存在** | 新建（RLS-aware 测试） |

**spec 回填**：批 2 Phase E-K 全部 plan 完成后，加一个 `docs(phase-5): reconcile spec §9.6 Agent A/B/C file lists` commit，修正此三项 + Agent B/C 的类似错误（如果有）。对应 00-index.md 里 "待批 2 完成后统一回填" 的补强项清单新增条目。

**历史教训**（和 Phase D spec §4.1 itemKey 错误同类）：spec 写作时凭印象列文件名，未 grep 现存状态。这是 Phase 5 项目内第二次发现 spec 事实错误，反证规则 7 在 spec 阶段的必要性。

---

## Task 27：Agent A — menu + category 域迁移

**Files:**
- Modify: `server/src/controllers/menu.service.ts`
- Modify: `server/src/routes/menu.routes.ts`
- Create: `server/src/__tests__/menu.test.ts`

**前置**（必须先完成）：
- Phase D 全部 plan 写完（Task 16-26）**且** 实施到位（特别是 Task 16 `store.ts` + Task 21 `menu.ts` repo 文件存在于 `server/src/repositories/`）
- Phase B Task 6 `withTenantContext` 生效，Phase B Task 8 `tenantAwareRoute` 装饰器可用

### grep ground truth（规则 7 嵌入）

**2026-04-17 验证数字**（实施时应重跑 grep 以防代码变动）：

```bash
# 当前 JsonStore 调用点
grep -cE "categoryStore|menuItemStore" server/src/controllers/menu.service.ts
# 预期：15
#   categoryStore 7 处（line 7 const 声明 + 6 处 CRUD 调用 lines 16/135/142/146/151/158/162）
#   menuItemStore 8 处（line 8 const 声明 + 7 处 CRUD 调用 lines 21/49/55/111/115/119/125/129）

grep -nE "storeStore" server/src/controllers/menu.service.ts
# 预期：1 处 import（line 3）——实施时 grep 其在 menu.service.ts 内的使用点决定迁移策略

# JsonStore/old store 引用（迁移完成条件）
grep -cE "JsonStore|categoryStore|menuItemStore" server/src/controllers/menu.service.ts
# 迁移完成目标：0
```

**Task 完成三道门**（ground truth gate）：
1. `grep -cE "categoryStore|menuItemStore" server/src/controllers/menu.service.ts` = **0**
2. `grep -c "new JsonStore" server/src/controllers/menu.service.ts` = **0**
3. `server/src/__tests__/menu.test.ts` 存在且 `pnpm test menu` 绿

---

### 迁移总纲

Agent A 的标准动作集（spec §9.6:1231 "每个 agent 的动作"）：

1. **删 JsonStore 调用** → 换 Prisma repo
2. **async 化** 所有 service 导出函数（服务于 await repo 调用）
3. **包 `tenantAwareRoute`** 装饰器在 routes（让 `withTenantContext` 生效）
4. **`emit(` 移 tx 外**（规则 2）——grep 验证 menu 域有无 emit
5. **新建 RLS-aware 测试**（`menu.test.ts`）

Service 函数**外部签名必须保持稳定**——同步 → 异步以外，参数/返回类型不变。client 代码不动是 Phase E 的底线。

---

### Step 1：读现状 + 细化 grep

```bash
# 1.1 验证 grep 数字（如上）——若偏差，标注在 commit message
# 1.2 读 menu.service.ts 所有 export function 的签名，列出：
grep -nE "^export (async )?function" server/src/controllers/menu.service.ts

# 1.3 storeStore 用途调查
grep -nE "storeStore\." server/src/controllers/menu.service.ts
# 结果决定：留原样（借用 storeRepo 读 store meta）/ 删除（unused import）/ 改走 menuRepo

# 1.4 emit 位置
grep -nE "emit\(" server/src/controllers/menu.service.ts
# 若有 emit，Step 5 处理

# 1.5 menu.routes.ts 现状——route handler 是否已 async / 是否含 category routes
grep -nE "router\.(get|post|patch|delete)" server/src/routes/menu.routes.ts
```

- [ ] **Step 1a**：跑上述 grep，把实际输出贴到本 task 的实施 work-log（或 commit message）。若任何数字与本文档预期不一致，说明代码在 plan 写作后变动过——**暂停**汇报，不自行调整。

---

### Step 2：替换 categoryStore → menuRepo

对照 Phase D Task 21 `menuRepo` 的方法表（在 `phase-d-repositories.md` Task 21 小节）：

| legacy 调用 | 替换为 |
|---|---|
| `categoryStore.getByField('storeId', storeId)` | `menuRepo.listMenu(tx)` → 取 `.map(c => c)` **or** 新增 `menuRepo.listCategories(tx)`（见下方决策点 A） |
| `categoryStore.getById(id)` | `menuRepo.findCategory(id, tx)` |
| `categoryStore.create(cat)` | `menuRepo.upsertCategory({ ...cat, id: undefined }, tx)` |
| `categoryStore.update(id, updates)` | `menuRepo.upsertCategory({ id, ...updates }, tx)`（以 id 作 where 的 upsert） |
| `categoryStore.delete(id)` | 需要 `menuRepo` 新增 `deleteCategory(id, tx)` 方法——见决策点 B |

**决策点 A**：`listCategories`（不带 nested items）是否值得加进 `menuRepo`？
- **理由加**：legacy `getAllCategories(storeId)` 返回扁平 `Category[]`，直接用 `listMenu` 会多拉 menuItems，浪费。
- **理由不加**：多一个方法对齐成本。可以在 service 层 `listMenu(tx).map(c => omit(c, 'menuItems'))` 手工裁剪。
- **建议**：**加**。Phase D Task 21 plan 补一个方法定义（独立补丁 commit，在本 task 实施前），签名：
  ```ts
  listCategories: (db: Db = prisma): Promise<Category[]> =>
    db.category.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } })
  ```
  （不强制 `isActive` 过滤的场景，service 可通过 `tx.category.findMany` 直查——repo 专职常用路径）

**决策点 B**：`deleteCategory` 需要处理孤儿 MenuItem（categoryId 失效）。Phase 5 schema 若用 CASCADE FK——级联删除 menuItems + options，数据丢失风险。若用 SET NULL——items 变 "uncategorized"。Phase D Task 21 实施时按 spec §4.1 决定 FK 行为；本 task 实施时**先查 schema**，不拍脑袋。

---

### Step 3：替换 menuItemStore → menuRepo

| legacy 调用 | 替换为 |
|---|---|
| `menuItemStore.getByField('storeId', storeId)` | `menuRepo.listMenu(tx).flatMap(c => c.menuItems)` **or** 新增 `menuRepo.listItems(tx)` |
| `menuItemStore.getById(id)` | `menuRepo.findItem(id, tx)` |
| `menuItemStore.create(item)` | `menuRepo.upsertItem({ ...item, id: undefined }, tx)` |
| `menuItemStore.update(id, updates)` | `menuRepo.upsertItem({ id, ...updates }, tx)` |
| `menuItemStore.delete(id)` | 需要 `menuRepo.deleteItem(id, tx)` 方法——Phase D Task 21 plan 补 |

**决策点 C**：`isStaffOnly` 过滤——legacy `getMenu`（顾客端）过滤 `isStaffOnly=true` 的 item。Phase D Task 21 `listMenu` 当前**不过滤**。迁移时 service 层的 `getMenu` 手工过滤即可，或者 Phase D plan 补 `listMenu({ includeStaffOnly: false })` 参数。建议后者——明确的 repo 方法意图。

---

### Step 4：storeStore import 决策

根据 Step 1.3 grep 输出：
- **若 unused**：删除 import
- **若读 store 字段**（e.g., taxRate / paymentMode）：改为 `storeRepo.findById(storeId, tx)`
- **若写 store 字段**：不应发生——store write 走 admin/platform 路径；若发现，停下汇报（设计违规）

---

### Step 5：async 化 service + routes

**Service 侧**（`menu.service.ts`）：

```diff
- export function getCategories(storeId: string): Category[] {
-   return categoryStore.getByField('storeId', storeId)
- }
+ export async function getCategories(
+   storeId: string,
+   tx: Prisma.TransactionClient = prisma
+ ): Promise<Category[]> {
+   return menuRepo.listCategories(tx)
+ }
```

**注意**：Service 签名加 `tx` 参数但**给默认值 `prisma`**——让老调用点（如测试）无需改动。Route 层调用时传入 `withTenantContext` 的 tx。

**Route 侧**（`menu.routes.ts`）包 `tenantAwareRoute`：

```diff
- router.get('/stores/:storeId/categories', (req, res) => {
-   const { storeId } = req.params
-   const categories = getCategories(storeId)
-   res.json(categories)
- })
+ router.get('/stores/:storeId/categories', tenantAwareRoute(async (req, res, tx) => {
+   const { storeId } = req.params
+   const categories = await getCategories(storeId, tx)
+   res.json(categories)
+ }))
```

其中 `tenantAwareRoute`（Phase B Task 8）内部：
1. 从 JWT / req.params 解析 storeId
2. 调 `withTenantContext(storeId, async tx => handler(req, res, tx))`
3. 处理 error（OPTIMISTIC_LOCK_CONFLICT 映射 HTTP 409 等）

**不手动调 `withTenantContext`**——统一走装饰器。规则 2 的 emit 时机由 `tenantAwareRoute` 在 tx 返回后处理（见决策点 D）。

**决策点 D**：emit 在哪发？
- 选项 1：Service 函数返回事件 payload，route 层在 tx commit 后 emit——**推荐**，符合规则 2
- 选项 2：`tenantAwareRoute` 接 `onCommit` 回调——更通用但 Phase B Task 8 要实现
- 选项 3：继续在 service 里 emit——违规则 2，**不选**

menu 域 grep 验证（Step 1.4）：若 emit 调用为 0，决策点 D 暂不触发（menu 本身可能不 emit，菜单更新靠前端手动刷）。若有 emit，按选项 1 处理。

---

### Step 6：建 `__tests__/menu.test.ts`

RLS-aware 测试结构：

```ts
// server/src/__tests__/menu.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { withTenantContext, withPlatformContext } from '../repositories/prisma-client.js'
import { menuRepo } from '../repositories/menu.js'
import { storeRepo } from '../repositories/store.js'
import { setupTwoTenants, cleanup } from './fixtures.js'  // Phase C Task 13

describe('menu repository — RLS tenant isolation', () => {
  let tenantA: string
  let tenantB: string

  beforeAll(async () => {
    const setup = await setupTwoTenants()
    tenantA = setup.tenantAId
    tenantB = setup.tenantBId
  })

  afterAll(async () => {
    await cleanup()
  })

  it('listMenu under tenant A does not return tenant B categories', async () => {
    const menuA = await withTenantContext(tenantA, tx => menuRepo.listMenu(tx))
    const categoryIds = menuA.flatMap(c => c.id)
    expect(categoryIds).not.toContain('category-id-from-tenant-B')  // pre-seeded in fixture
  })

  it('upsertCategory inside tenant A context writes with correct storeId', async () => {
    const cat = await withTenantContext(tenantA, tx =>
      menuRepo.upsertCategory({ storeId: tenantA, name: 'Test', sortOrder: 1, isActive: true }, tx)
    )
    expect(cat.storeId).toBe(tenantA)
  })

  it('attempting upsertCategory with mismatched storeId fails WITH CHECK', async () => {
    // Under tenant A context, insert with storeId=tenantB should violate RLS WITH CHECK
    await expect(
      withTenantContext(tenantA, tx =>
        menuRepo.upsertCategory({ storeId: tenantB, name: 'Evil', sortOrder: 1, isActive: true }, tx)
      )
    ).rejects.toThrow()
  })
})
```

**测试覆盖底线**（至少包含）：
1. `listMenu` 租户隔离（核心 RLS 测试）
2. `upsertCategory` / `upsertItem` 写入后可读回
3. 跨租户 storeId mismatch 被 WITH CHECK 拒绝（正向防御测试）
4. `replaceItemOptions` 多步 tx 原子性（options 全替换 success / rollback on error）

**不覆盖**（留给 integration 测试 / Stage 4）：
- HTTP 层（route handler + express middleware 集成）——那是 Phase E/F/G 全部完成后的 Stage 4 事

---

### Step 7：verify

```bash
# 7.1 三道门 grep
grep -cE "categoryStore|menuItemStore" server/src/controllers/menu.service.ts
# 预期 0

grep -c "new JsonStore" server/src/controllers/menu.service.ts
# 预期 0

ls server/src/__tests__/menu.test.ts
# 预期存在

# 7.2 tsc（server 整体）
cd server && ./node_modules/.bin/tsc --noEmit 2>&1 | grep -cE "error TS"
# 预期：和 Phase D 末尾 tsc 错误数一致（新增 = 0）
# 如果新增错误：逐个修，不 @ts-ignore 糊弄

# 7.3 menu test
cd server && pnpm vitest menu 2>&1 | tail -20
# 预期：全绿

# 7.4 应用启动冒烟（可选但建议）
cd server && pnpm dev &
PID=$!
sleep 3
curl -s http://localhost:3001/api/stores/demo-store-uuid/menu | jq '.[] | .name' | head
# 预期：菜单类别名列表
kill $PID

# 7.5 JsonStore 全局剩余（前瞻 Stage 3b/3c 要清理的）
grep -rn "categoryStore\|menuItemStore" server/src
# 预期：仅在 server/src/scripts/ 或 _archive/（若已存在）
# 若 controllers/ 或 routes/ 下仍有残留，说明迁移未完——修
```

---

### Step 8：commit

```bash
cd "$(git rev-parse --show-toplevel)"
git add server/src/controllers/menu.service.ts \
        server/src/routes/menu.routes.ts \
        server/src/__tests__/menu.test.ts
git commit -m "feat(phase-5): phase E Agent A — migrate menu + category to Prisma repo

Phase E Stage 3a Agent A (Task 27): menu.service.ts now reads/writes via
menuRepo (Phase D Task 21) instead of JsonStore<Category>/MenuItem. Routes
wrapped in tenantAwareRoute; RLS enforced per-request via withTenantContext.

Migration summary (grep ground truth verified before/after):
- categoryStore call sites: 7 → 0
- menuItemStore call sites: 8 → 0
- storeStore import: [resolution from Step 4]
- emit calls: [0 if none / moved post-tx if any]
- Service signatures: all async, tx param with prisma default (caller compat)

New test file __tests__/menu.test.ts: RLS tenant isolation +
WITH CHECK rejection + replaceItemOptions atomicity (4 cases minimum).

JsonStore references in server/src remaining: [count from Step 7.5].
Phase E Agent B (staff) + Agent C (coupon/analytics/printer) pending.

spec §9.6 Agent A file list has factual errors (category.routes.ts and
__tests__/menu.test.ts don't exist pre-migration). Recorded in
phase-e-agent-a.md; spec reconciliation commit will fix post-batch-2.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Agent A 完成后的状态

- `menu.service.ts` 不再 import JsonStore
- `menu.routes.ts` 全部 handler 包 `tenantAwareRoute`
- `menu.test.ts` 是 Phase 5 第一个 "新建的 RLS-aware 集成测试样板"——Agent B/C 的测试照此模式写
- 应用从 menu 域起，走 Prisma（但 session/order/payment 等域仍在 JsonStore，要等 Stage 3c）

## 风险点

1. **Client 端不动是底线**：menu page / menu admin 所有 API 调用的路径和 payload 必须保持兼容。Stage 4 集成测试兜底；本 task 实施时发现"client 要改"→ 暂停汇报（可能是 service 签名不小心变了，或者 repo 返回结构不兼容）。
2. **`storeStore` 跨文件牵连**：`storeStore` 在 server/src 多处 import，Agent A 删 import 不影响其他文件（本文件独立）。但若 Agent A 发现 storeStore 用法语义变了（e.g., 改用 `storeRepo.withinLicense` 返回 `{ store, license }` 而非 `Store`），可能影响其他 service 文件的同样调用——**不扩散修改**，只在本文件内替换，跨文件留给 Stage 3c 主 agent。
3. **`menu.routes.ts` 行数可能比 `menu.service.ts` 小但 handler 多**：每个 handler 都要包装装饰器，重复 diff 量大。不是难点但容易漏——Step 1.5 的 grep 必须跑。

## 下一步

Task 27 完成后停下，等用户 review。无破防则进 Agent B（Task 28，见 [`phase-e-agent-b.md`](./phase-e-agent-b.md)）。

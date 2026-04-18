# Phase 5 Plan — Phase E Stage 3a：Agent C（coupon / analytics / printer 域迁移）

> **如何使用本文件**
>
> - 全局规则见 [`00-index.md`](./00-index.md#全局规则所有-task-遵守)
> - 前置：Phase D 实施完成 + `phase-e-agent-a.md`（Task 27）+ `phase-e-agent-b.md`（Task 28）完成
> - 执行方式（spec D43 / §9.6）：**串行**——本任务在 Task 28 commit 后启动
> - 本文件只含 **Task 29**（Agent C 工作包，3 个子域）
> - 姐妹文件：[`phase-e-agent-a.md`](./phase-e-agent-a.md) / [`phase-e-agent-b.md`](./phase-e-agent-b.md)

## Spec §9.6 事实核查（规则 7）

**Agent C 独占文件存在性**（grep 验证 2026-04-17）：

| spec 声明 | 实际 | 处理 |
|---|---|---|
| `server/src/routes/coupon.routes.ts` | ✅ 78 行 | 修改 |
| `server/src/routes/analytics.routes.ts` | ✅ 17 行 | 修改 |
| `server/src/routes/printer.routes.ts` | ✅ 37 行 | 修改 |
| `server/src/controllers/coupon.service.ts` | ✅ 54 行 | 修改 |
| `server/src/controllers/analytics.service.ts` | ✅ 130 行 | 修改 |
| `server/src/controllers/printer.service.ts` | ✅ 60 行 | 修改 |
| `server/src/__tests__/coupons.test.ts` | ❌ 不存在 | 新建 |

**Agent C 是 spec §9.6 最干净的工作包**——6/7 真实存在，唯一缺的是测试文件（符合 spec:1231 "写 RLS-aware 测试" 语义）。Agent C 无新增 spec 事实错误。

## Phase D 设计遗漏：printerRepo（规则 7 追加发现）

`printer.service.ts` 用 `printerStore`（line 7 声明 + lines 10/21/32 调用）做 PrinterConfig CRUD，但 Phase D 11 个 repo 列表（`00-index.md:183-193` 清单）**无对应 `printerRepo`**：

- store / orders / sessions / payments / split-bills / menu / staff / roles / coupons / waitlist / platform-admin —— **没有 printer**

**决策**（同 TimeEntry 模式）：新增 Phase D 回填补丁 `printerRepo`——方法集简单（PrinterConfig 只有 per-store 单行 CRUD）：

```ts
// 回填 Phase D：新文件 server/src/repositories/printer.ts
printerRepo.findByStoreId: (storeId: string, db?: Db) => Promise<PrinterConfig | null>
printerRepo.upsertConfig: (storeId: string, config: ConfigInput, db: Db) => Promise<PrinterConfig>
```

**选项权衡**：并入现有 repo vs 独立文件？
- 并入 `storeRepo`：printer config 是 Store 的运营元数据——合理但污染 storeRepo 语义
- 独立 `printer.ts`：Phase D 11 repo 变 12，但语义清晰
- **建议独立**——与决策 D53（每 entity 一文件）一致

回填 commit 同批次处理。

## Phase D 回填清单更新（累积）

本段 3c 结束后的完整 Phase D 回填清单（用户确认"收尾批次统一处理，不零散补丁"）：

| # | 内容 | 来源 | 归属 |
|---|---|---|---|
| 1 | `menuRepo.listCategories` | 段 3a 决策点 A | Phase D Task 21 补丁 |
| 2 | `staffRepo` TimeEntry 4 方法 | 段 3b Phase D 遗漏节 | Phase D Task 22 补丁 |
| 3 | `staffRepo.delete` | 段 3b 决策点 F | Phase D Task 22 补丁 |
| 4 | `roleRepo.findByName` | 段 3b 决策点 E | Phase D Task 23 补丁 |
| 5 | **`printerRepo` 新文件（2 方法）** | 本段 3c 上方 | Phase D 新增 Task 22b（或并入 22） |

5 项，合并一个 commit。

---

## Task 29：Agent C — coupon / analytics / printer 完整迁移

**Files（7 个文件）**：
- Modify: `server/src/controllers/{coupon,analytics,printer}.service.ts`
- Modify: `server/src/routes/{coupon,analytics,printer}.routes.ts`
- Create: `server/src/__tests__/coupons.test.ts`

**前置**：
- Task 27 + Task 28 完成并 merge
- Phase D 回填清单 1-5 全部补丁 commit 已 land
- Phase D Task 24 `couponRepo` / Task 17 `orderRepo` 实施完成
- Phase D 新 `printerRepo` 实施完成

### grep ground truth（规则 7 嵌入）

**2026-04-17 基线**：

```bash
# 3 个域 JsonStore 调用点
grep -cE "couponStore|printerStore|orderStore" \
  server/src/controllers/{coupon,analytics,printer}.service.ts
# 预期分别：7 / 2 / 4（合计 13）

# 3 个域 emit（预期 0——grep 验证）
grep -cE "^\s*emit\(" server/src/controllers/{coupon,analytics,printer}.service.ts
# 预期：0 0 0
```

**Task 完成 4 道门**：
1. `grep -cE "couponStore|printerStore|orderStore" server/src/controllers/{coupon,analytics,printer}.service.ts` = **0**
2. `grep -c "new JsonStore" server/src/controllers/{coupon,analytics,printer}.service.ts` = **0**
3. `server/src/__tests__/coupons.test.ts` 存在且 `pnpm vitest coupons` 绿
4. `cd server && ./node_modules/.bin/tsc --noEmit 2>&1 | grep -cE "error TS"` = 和 Agent B 完成时一致（新增 0）

---

### 子任务 29.1：coupon.service.ts 迁移（7 调用，Phase D Task 24 完备对齐）

**Phase D Task 24 `couponRepo` 方法（见 `phase-d-repositories-part2.md`）完整覆盖 legacy**：

| legacy | 替换为 |
|---|---|
| `couponStore.getByField('storeId', storeId)` | `couponRepo.findByStoreId(storeId, tx)` |
| `couponStore.getById(couponId)` | `couponRepo.findById(couponId, tx)` |
| `couponStore.create(coupon)` | `couponRepo.create({...}, tx)` |
| `couponStore.update(couponId, updates)` | `couponRepo.update(couponId, updates, tx)` |
| `couponStore.delete(couponId)` | `couponRepo.delete(couponId, tx)` |

**决策点 K**：`couponRepo.incrementUses`（Phase D Task 24 已定义）的调用者——不在 `coupon.service.ts` 里，而在 payment service 里（支付成功确认 coupon 被用）。Phase E Agent C 迁移**不触**这个——只迁 CRUD。`incrementUses` 的 wire-up 在 Phase G（payment 链迁移）里做。**不扩散修改**。

**Service 签名**：
```diff
- export function getCoupons(storeId: string): Coupon[]
+ export async function getCoupons(
+   storeId: string,
+   tx: Prisma.TransactionClient = prisma
+ ): Promise<Coupon[]>
```

`createCoupon` / `updateCoupon` / `deleteCoupon` 签名同模式改 async，加 tx 参数。

---

### 子任务 29.2：analytics.service.ts 迁移（2 调用，**只读聚合，不新建 repo**）

**关键设计决策（决策点 J）**：analytics 不需要独立 `analyticsRepo`。analytics 是 cross-entity 只读聚合查询，直接调现有业务 repo（`orderRepo` / `staffRepo`）组合即可。新建 repo 反而污染边界——Phase D D53 "每 entity 一 repo" 不包括聚合层。

**映射**：

| legacy | 替换为 |
|---|---|
| `orderStore.getByField('storeId', storeId)` | `orderRepo.findSubmitted({ storeId }, tx)` |
| `getStaffPerformance` 内部隐含的工时查询 | `staffRepo.listTimeEntries(storeId, filter, tx)`（Phase D 回填项 2） |

**注意**：`analytics.service.ts:101 getStaffPerformance` 查工时统计——依赖 **Phase D 回填项 2**（`staffRepo.listTimeEntries`）。若 Phase E 收尾批次补丁 commit 未 land，`getStaffPerformance` 无法迁移。实施前 grep 确认：

```bash
grep -nE "listTimeEntries" server/src/repositories/staff.ts
# 若无匹配 → 暂停，等补丁 commit
```

**决策点 L**：`orderStore.getByField('storeId', storeId)` 原来**不区分 draft / submitted**（legacy JsonStore 无 status 过滤）。迁移后用 `findSubmitted` 默认**排除 draft**（D24）——语义加强，不是漂移。analytics 统计本来就不该算未提交的 cart，这是 B2 带来的正向收益。记录在 commit message 里。

---

### 子任务 29.3：printer.service.ts 迁移（4 调用 + **依赖新 printerRepo**）

**前置**：Phase D 回填项 5（新 `printerRepo`）实施完成。

**映射**：

| legacy | 替换为 |
|---|---|
| `printerStore.getByField('storeId', storeId)` (line 10, 取第一个) | `printerRepo.findByStoreId(storeId, tx)` |
| `printerStore.update(existing.id, updates)` (line 21) | `printerRepo.upsertConfig(storeId, updates, tx)` |
| `printerStore.create(config)` (line 32) | `printerRepo.upsertConfig(storeId, config, tx)` |

**upsert 简化**：legacy 用 "先 get，有则 update，无则 create" 三步（lines 14-34），`printerRepo.upsertConfig` 一步完成。Service 层 `updatePrinterConfig` 直接单行调用：

```diff
- export function updatePrinterConfig(storeId, updates) {
-   const existing = getPrinterConfig(storeId)
-   if (existing) {
-     return printerStore.update(existing.id, updates)!
-   }
-   const config = {...}
-   return printerStore.create(config)
- }
+ export async function updatePrinterConfig(
+   storeId: string,
+   updates: Partial<PrinterConfig>,
+   tx: Prisma.TransactionClient = prisma
+ ): Promise<PrinterConfig> {
+   return printerRepo.upsertConfig(storeId, updates, tx)
+ }
```

**不迁移的部分**：`printOrder` (line 35) / `reprintOrder` (line 49) 是**实际打印机协议调用**（side-effect to hardware），和 Prisma 无关。扫一眼这两个函数体确认无 JsonStore 调用（上方 grep 已验证无）——保持原样。

---

### 测试：`__tests__/coupons.test.ts`（用户业务语义策略）

**5 个业务 case + 1 RLS smoke**：

1. **findActiveByCode 过期边界**：`expiresAt < now()` 的 coupon 不返回（测 `OR: [null, gt: now]` 的边界）
2. **findActiveByCode active=false**：active=false 不返回（正向）
3. **incrementUses 原子性**：连续调用 10 次，`currentUses` 最终 = 10（无 read-modify-write 竞态）
4. **discount 计算**——这个其实是 service 层逻辑（不在 repo）。实现方式：测试 service function `applyCoupon`，验证 percentage 和 fixed 两种 discountType 金额正确
5. **maxUses 耗尽**：当 `currentUses >= maxUses` 时，service 层 `applyCoupon` 拒绝——这也是 service 层逻辑
6. **RLS smoke**：tenant A 的 coupon code 在 tenant B context 下 `findActiveByCode` 返回 null

**printer / analytics 测试**？
- printer：业务几乎为 0（upsert 单行 config），RLS 由 Phase C global 覆盖——**不单独建 test 文件**
- analytics：聚合查询适合集成测试，留给 Stage 4——**不单独建 test 文件**
- 可选：在 `coupons.test.ts` 最后加 1 个 printer RLS smoke（upsert 后 tenant 隔离）——加分项，非必须

---

### Step 1-6：实施 + verify + commit

**Step 1**：验证 grep 基线（上方 ground truth）与代码一致。偏差 → 停汇报。

**Step 2**：迁移 3 个子域（顺序：coupon → analytics → printer）。coupon 最简单 warm up，printer 最后（依赖 printerRepo 补丁）。

**Step 3**：Routes 包 `tenantAwareRoute`（模式见 Agent A 段 3a）。

**Step 4**：建 `coupons.test.ts`（6 case）。

**Step 5**：verify：

```bash
# 4 道门
grep -cE "couponStore|printerStore|orderStore" \
  server/src/controllers/{coupon,analytics,printer}.service.ts
# 预期：0

grep -c "new JsonStore" server/src/controllers/{coupon,analytics,printer}.service.ts
# 预期：0

ls server/src/__tests__/coupons.test.ts && cd server && pnpm vitest coupons

cd server && ./node_modules/.bin/tsc --noEmit 2>&1 | grep -cE "error TS"
```

**Step 6**：commit（单 commit，对齐 Agent A/B 粒度）：

```bash
cd "$(git rev-parse --show-toplevel)"
git add server/src/controllers/{coupon,analytics,printer}.service.ts \
        server/src/routes/{coupon,analytics,printer}.routes.ts \
        server/src/__tests__/coupons.test.ts
git commit -m "feat(phase-5): phase E Agent C — migrate coupon/analytics/printer to Prisma

Phase E Stage 3a Agent C (Task 29): 3-domain migration covering 13 JsonStore
call sites (smallest of the three agents; no emit to migrate per rule 2).

Per-domain migration:
- coupon.service.ts (7 sites → 0): couponStore → couponRepo (Phase D Task 24
  完备对齐). incrementUses wire-up deferred to Phase G payment chain per
  decision point K — not migrated here.
- analytics.service.ts (2 sites → 0): orderStore → orderRepo.findSubmitted;
  getStaffPerformance → staffRepo.listTimeEntries (Phase D 回填 item 2).
  Semantic strengthening (decision point L): analytics now excludes draft
  orders by default (D24), which matches intent — legacy accidentally
  counted any JsonStore rows without status filter. B2 side benefit.
- printer.service.ts (4 sites → 0): printerStore → printerRepo
  (Phase D 回填 item 5 — new repo file). updatePrinterConfig collapses
  3-step get-check-create into 1 upsertConfig call. printOrder/reprintOrder
  unchanged (hardware protocol, no DB).

analytics intentionally has no dedicated analyticsRepo (decision point J):
cross-entity read-only aggregations call existing business repos, not a new
repo — keeps D53 'one entity, one repo' semantics clean.

New test: __tests__/coupons.test.ts — 5 business cases + 1 RLS smoke
(expired/inactive coupons / incrementUses atomicity / discount calc /
maxUses exhaustion / cross-tenant isolation).
printer + analytics not given dedicated test files: printer has ~zero
business logic (single-row upsert); analytics suits integration tests
(Stage 4).

Phase D backfill commit (containing 5 items accumulated across Agent A/B/C)
must land before Agent C implementation — tracked in phase-e-agent-c.md
'Phase D 回填清单' section.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Agent C 完成后状态

- coupon / analytics / printer 3 域走 Prisma
- `couponStore` / `printerStore` / `orderStore` 在 `server/src/controllers/` 下引用归零（Stage 5 才删 repositories/stores.ts）
- 1 个新 test 文件（`coupons.test.ts`），6 case 业务语义
- 所有 Phase E 外围域迁移完毕——Agent A + B + C 共计 **76 处 JsonStore 调用清零**（15 + 48 + 13），**4 处 emit 移 tx 外**（全部来自 waitlist）

## 风险点

1. **Phase D 回填 5 项必须先 land**：Agent C 依赖其中 item 2（`listTimeEntries` 给 analytics 用）和 item 5（`printerRepo` 给 printer 用）。Step 1 第一动作 grep 确认两个回填方法/文件存在。
2. **分析域 legacy 语义漂移（决策点 L）**：`findSubmitted` 排除 draft 是**加强**不是 regression。但若 QA 对比 Stage 4 的 analytics 数字和 legacy 有差异，应确认差异来自 draft 过滤（应该有差，且是正向）。记在 Stage 4 测试对照表里。
3. **printer hardware 函数不迁移**：`printOrder` / `reprintOrder` 保持原样。Step 1 grep 确认这两个函数无 JsonStore/repo 调用后放行。若有 → 汇报（历史遗留耦合点）。
4. **coupon incrementUses 不在此 agent 迁移**：决策点 K 划出边界。实施时不要"顺手"把 payment service 里的 `couponStore.incrementUses` 一起改了——跨 agent 改动违规则 5。

## 下一步

Task 29 完成后停下。**Phase E 全部 agent plan（27/28/29）就绪**，进入 **Phase E plan 收尾批次**（用户约定的 4 个 commit）：

1. Phase D 回填补丁 commit（5 项方法/文件）
2. Phase B Task 8 `afterCommit` 机制补丁（决策点 D / H 共用）
3. spec §9.6 事实修正 commit（3 个 agent 的缺失文件 + 新增 waitlist.test.ts）
4. `00-index.md` 更新（Phase E 行指向 3 个 agent 文件 + 大小）

4 commit 完成后本 session 收尾，Phase F/G 留给下个 session。

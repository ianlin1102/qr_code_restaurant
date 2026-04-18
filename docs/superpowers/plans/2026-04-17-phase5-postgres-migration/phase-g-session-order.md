# Phase 5 Plan — Phase G 段 1：session-crud + order.service 迁移（Task 32-33）

> **如何使用本文件**
>
> - 全局规则见 [`00-index.md`](./00-index.md#全局规则所有-task-遵守)
> - 前置：Phase D 实施全部完成 + Phase E Agent A-C 完成 + Phase B Task 8（含 `afterCommit` 补丁）
> - **本 session 写作目标**：Phase G 段 1（本文件）+ 段 2（B2 重写）+ 段 3（Task 35）共 3 段；段 4-5（Task 36-42）留下个 session
> - spec 锚点：§9.8 Stage 3c 子任务 1-2
> - 参考：[`phase-g-handoff.md`](../work-logs/2026-04-17-phase-g-handoff.md) 启动输入（§5 4 条决议 + §6 grep 附录）

## 规则 8 约束（Ian 2026-04-17 设定）

本 session 剩余预算 ~3.5 小时（段 1+2+3）。立刻暂停汇报信号：
- 段 1 grep 发现事实和 spec 冲突
- 段 2 写作超 2 小时未完
- pending commits > 1（规则 8.1 严格）
- Ian 回复变短或只说"确认"

## Pending commits 清单（规则 8.1 显式外化）

本 session Phase G plan 写作预计 4 commits：

- [ ] C1：**本文件 `phase-g-session-order.md`**（Task 32-33 段 1）
- [ ] C2：**`phase-g-session-cart-b2.md`**（Task 34 段 2，B2 最高风险区）
- [ ] C3：**`phase-g-b2-checkpoint.md` 或并入段 2**（Task 35 段 3，7 场景 checkpoint）
- [ ] C4：**`RESUME.md` + `00-index.md`** 收尾单 commit

---

## Spec §9.8 锚点核查

spec §9.8 line 1250-1284 列的 Stage 3c 子任务顺序：

```
1. session-crud.ts 迁移                          ← Task 32 本文件
2. order.service.ts → orderRepo.findSubmitted    ← Task 33 本文件
3. session-cart.ts → B2 重写 (pendingCart → draft order)
   ├─ cart.routes.ts + useCartSync 前端 hook 调整
   ├─ SSE cart:updated 事件载体改为 draft order 快照  ← 见 handoff 5c: payload 本身不变, fetch API 才变
   ├─ 乐观锁从 session.cartVersion 搬到 order.version
   └─ 完成后自动跑该域测试 + tsc -b

>>> 🛑 MANUAL CHECKPOINT (D50) <<<                ← Task 35 段 3

4. payment.service.ts → paymentRepo + PaymentItem 关联
5. settlement/gateway.ts → 包 withTenantContext
6. settlement/actions/*.ts → async 化
7. split-bill.service.ts → splitBillRepo + SplitBillItem
8. split-bill-invalidation.ts → async，emit 移 tx 外
9. webhook routes → async，操作全部包在一个 tx
10. session-payment.ts + session-settlement.ts → 收尾
```

**子任务 1-2**（本段 Task 32-33）和 **3**（Task 34 段 2）+ **checkpoint**（Task 35 段 3）覆盖本 session 目标。

**spec §9.8 事实核查**（规则 7）：子任务 3 spec 原文 "SSE cart:updated 事件载体改为 draft order 快照" **与 handoff §5c grep 证据矛盾**——当前 SSE 载荷本身是极简的 `{type, storeId, sessionId}`，B2 改造不改 SSE payload，改的是 fetch API response shape。**spec 在这一处不准确**——本 plan 以 handoff §5c grep 证据为准，在段 2 Task 34 plan 中显式标注此修正（延续 §9.6 Agent A/B/C 文件列表事实修正模式）。

---

## Task 32：`session-crud.ts` 迁移（16 JsonStore 调用 → Prisma）

**Files:**
- Modify: `server/src/controllers/session-crud.ts`
- Modify: `server/src/routes/session.routes.ts`（部分 handler——本 task 仅涉及 session CRUD 路由）

**前置**：Phase D Task 18 `sessionRepo` 实施完成 + Task 16 `storeRepo` + Task 17 `orderRepo` 可用。

### grep ground truth（规则 7）

**2026-04-17 基线**：

```bash
grep -cE "sessionStore|tableStore|orderStore" server/src/controllers/session-crud.ts
# 预期：16

grep -cE "emit\(" server/src/controllers/session-crud.ts
# 预期：0 —— session-crud 本身不 emit（emit 在 session.service.ts 聚合层）

grep -nE "session\.orderIds" server/src/controllers/session-crud.ts
# 预期：2 处（line 92, 其他）—— B2 决策点 32-A
```

**Task 完成三道门**：
1. `grep -cE "sessionStore|tableStore|orderStore" server/src/controllers/session-crud.ts` = **0**
2. `grep -c "new JsonStore" server/src/controllers/session-crud.ts` = **0**
3. `cd server && ./node_modules/.bin/tsc --noEmit 2>&1 | grep -cE "error TS"` 不新增错误

### 迁移映射表

| legacy（行号） | 替换为 |
|---|---|
| `sessionStore.create(session)` (line 13) + `tableStore.update(tableId, {currentSessionId})` (line 14) | `sessionRepo.createForTable({storeId, tableId}, tx)`（**多步写已在 Phase D Task 18 封装**，TransactionClient 必填 D55） |
| `sessionStore.getByField('storeId', storeId)` (line 19) | `sessionRepo.listByStore(tx)`（RLS 自动过滤 storeId） |
| `sessionStore.getById(id)` (line 24) | `sessionRepo.findById(id, tx)` |
| `sessionStore.getById + sessionStore.update` (line 30-35) | `sessionRepo.updateCouponSnapshot` / 其他 update 方法按语义拆分（本函数是 `addOrderToSession` 的 order 归属写入——见决策点 32-A） |
| `sessionStore.update(sessionId, {status: 'closed', ...})` (line 46-50) + `tableStore.update(..., {currentSessionId: null})` (line 53) | `sessionRepo.closeSession(id, tx)`（已封装，TransactionClient 必填） |
| `sessionStore.update(sessionId, {status: 'active', ...})` (line 64-68) + `tableStore.update(..., {currentSessionId: session.id})` (line 71) | `sessionRepo.reopenSession(id, tx)`（已封装） |
| `orderStore.getByField('tableId', ...)` (line 80) + `orderStore.update(o.id, {sessionId})` (line 89) | **`adoptOrphanedOrders` 整块重设计** — 见决策点 32-B |
| `sessionStore.update(session.id, {orderIds: newOrderIds})` (line 92) | 见决策点 32-A（`orderIds` 字段去留） |

### 决策点 32-A：`session.orderIds` 字段去留（B2 预备）

**现状**（grep 证据）：legacy `Session` 有专属 `orderIds: string[]` 字段，维护"本 session 有哪些 order"。`session-crud.ts:92, 214` 两处显式维护。`order.service.ts:213-214` 删 order 时也同步维护。

**B2 后**：`Order` 表有 `sessionId` FK，`session.orderIds` **冗余**——可通过 `orderRepo.findBySessionId(sessionId)` 动态派生。

**选项**：
- **A（完全去除 `orderIds` 字段）**：
  - Phase D schema 已定：`Session` 表**无** `orderIds` 字段（spec §4.1 Session model）——已 grep 核查
  - 迁移动作：所有 `session.orderIds` 读改 `orderRepo.findBySessionId(sessionId, tx).then(o => o.map(x => x.id))`；所有 `session.orderIds` 写**删除**（redundant，FK 自动维护）
  - **推荐**
- B（保留冗余缓存）：违反 D56 同类原则（"缓存 vs 计算值"）——不推荐

**建议**：**A**。Phase D schema 已经这样设计（Session 无 orderIds），本 task 迁移只需删除 legacy 写入代码（line 92 那种 update）+ 读改成 `findBySessionId`。

**规则 7 证据**：grep `spec §4.1` Session model line 280+（本 plan 未精确核查行号，实施期验证"Session 表无 orderIds 字段"）。若 spec 定义了 orderIds JSON 字段 → 暂停汇报（和本决议冲突）。

### 决策点 32-B：`adoptOrphanedOrders` 函数存废

**现状**（grep 证据 `session-crud.ts:79-98`）：`adoptOrphanedOrders(session)` 遍历 `orderStore.getByField('tableId', session.tableId)`，把 `sessionId` 未设的 order 认养到当前 session。**legacy 设计缺陷补丁**——B2 前 order 不强制关联 session，deviceId 扫码直发订单跳过 session 创建时出现 orphan。

**B2 后**：`Order` 创建必须指定 `sessionId`（FK NOT NULL）——schema 层面消除 orphan 可能。

**选项**：
- **A（删除 `adoptOrphanedOrders` 函数）**：B2 后 schema 不再允许 orphan，该函数无用武之地
- **B（保留为 defensive migration 工具）**：读历史数据（如 EC2 backup 恢复）时可能遇到 legacy orphan——但 spec D36/D47 已决"EC2 orders/sessions 不迁移"，无 legacy 数据进新库
- **C（保留但转为 admin manual tool）**：管理端手动触发（比如 support 工单处理"订单没关联 session"的投诉）

**建议**：**A**。schema 层面禁止 orphan 后函数无使用场景。**grep 确认**实施期无前端/其他 controller 调用 `adoptOrphanedOrders`：

```bash
grep -rn "adoptOrphanedOrders" server/src client/src
# 预期：仅 session-crud.ts 定义 + session.service.ts 聚合层导出，无实际调用
```

若 grep 有调用点 → 暂停汇报（需 B 或 C 选项重新评估）。

### 决策点 32-C：service 层签名 async 化连锁

legacy 8 个 export function 都是同步。迁移后必须全部 async（await repo 调用）——**service 签名变化影响 `session.service.ts` 聚合层的 re-export**（line 31 `getSessionCart`）+ `session.routes.ts` 所有 handler。

**迁移策略**：全部 async 化 + 加 `tx: Prisma.TransactionClient = prisma` 参数（默认值让测试/CLI 脚本无需改）。`session.service.ts` 的 re-export 保持原签名形态（也 async）。route handler 包 `tenantAwareRoute` 装饰器（Phase B Task 8），从 `res.locals.tx` 取 tx 传给 service。

### Step 1-5：实施

- **Step 1**：grep 基线验证（数字和本 plan 预期一致，偏差即暂停汇报）
- **Step 2**：按映射表逐行替换（从上到下，最后一行的 `session.orderIds` 相关代码删除）
- **Step 3**：route handler 包 `tenantAwareRoute`（参考 Phase E Agent A 样板）
- **Step 4**：grep `adoptOrphanedOrders` 使用点 → 删定义 + 所有 callsite（如无 → 仅删定义）
- **Step 5**：tsc + 相关测试（`pnpm vitest session` 覆盖——Phase G 段 2 会加 B2 专门测试）
- **Step 6**：commit `feat(phase-5): Phase G Task 32 — migrate session-crud to Prisma`

### 测试

Phase G 段 1 **不建新 test 文件**——session-crud 的测试主要是集成测试，留给 Task 34 `session.test.ts`（B2 session+cart 合并场景）覆盖。Phase C 的 `tenant-isolation.test.ts` 已覆盖 RLS smoke。

---

## Task 33：`order.service.ts` 迁移（20 JsonStore + **11 emit** → Prisma + afterCommit）

**Files:**
- Modify: `server/src/controllers/order.service.ts`
- Modify: `server/src/routes/order.routes.ts`（所有 emit 移到 afterCommit）

**前置**：Task 32 完成 + Phase B Task 8 `afterCommit` 机制已实施。

### grep ground truth（规则 7）

```bash
# JsonStore 调用
grep -cE "orderStore|sessionStore|storeStore|tableStore" server/src/controllers/order.service.ts
# 预期：20

# emit 调用（规则 2 核心迁移对象）
grep -cE "^\s*emit\(" server/src/controllers/order.service.ts
# 预期：11（lines 128/129/130, 158/159, 227, 260/261/262, 317/318/319）

# served 状态保留语义 check（CLAUDE.md 防御规则）
grep -nE "status === 'served'|status !== 'served'" server/src/controllers/order.service.ts
# 预期：lines 168, 191, 220, 271（4 处）—— 迁移后行为必须等价
```

**Task 完成四道门**：
1. `grep -cE "orderStore|sessionStore|storeStore|tableStore" server/src/controllers/order.service.ts` = **0**
2. `grep -c "new JsonStore" server/src/controllers/order.service.ts` = **0**
3. `grep -cE "^\s*emit\(" server/src/controllers/order.service.ts` = **0**（全部移到 route 层 afterCommit）
4. tsc 不新增错误

### 迁移策略：规则 2 + regex 批量替换

**规则 2 严格应用**——11 处 emit 必须全部从 service 层移出。**service 函数返回 `{data, events[]}` 模式**，route 层用 afterCommit 发事件：

```diff
- export function updateOrderStatus(storeId, orderId, status): Order | {error} {
-   const order = orderStore.getById(orderId)
-   if (!order) return { error: 'Not found' }
-   // ... DB update ...
-   const updated = orderStore.update(orderId, { status })!
-   emit({ type: 'order:updated', ..., order: updated })
-   emit({ type: 'store:orders', ... })
-   return updated
- }
+ export async function updateOrderStatus(
+   storeId: string, orderId: string, status: OrderStatus,
+   tx: Prisma.TransactionClient = prisma
+ ): Promise<{ data: Order; events: AppEvent[] } | { error: string }> {
+   const order = await orderRepo.findById(orderId, tx)
+   if (!order) return { error: 'Not found' }
+   const updated = await orderRepo.updateStatus(orderId, status, tx)
+   return {
+     data: updated,
+     events: [
+       { type: 'order:updated', storeId: updated.storeId, sessionId: updated.sessionId ?? '', order: updated },
+       { type: 'store:orders', storeId: updated.storeId },
+     ],
+   }
+ }
```

Route 层：

```ts
router.patch('/:orderId/status', tenantAwareRoute(async (req, res) => {
  const result = await updateOrderStatus(storeId, orderId, status, res.locals.tx)
  if ('error' in result) return res.status(400).json(result)
  for (const e of result.events) res.locals.afterCommit!(() => emit(e))
  res.json(result.data)
}))
```

**11 处 emit 分布**（迁移时对照）：

| 行号 | 函数 | 事件 | 迁移去向 |
|---|---|---|---|
| 128 | createOrder | `order:created` | events[0] of createOrder |
| 129 | createOrder | `session:summary` | events[1] |
| 130 | createOrder | `store:orders` | events[2] |
| 158 | updateOrderStatus | `order:updated` | events[0] |
| 159 | updateOrderStatus | `store:orders` | events[1] |
| 227 | deleteOrder | `store:orders` | events[0] of deleteOrder |
| 260 | voidItem | `order:updated` | events[0] of voidItem |
| 261 | voidItem | `session:summary` | events[1] |
| 262 | voidItem | `store:orders` | events[2] |
| 317 | updateOrderItems | `order:updated` | events[0] of updateOrderItems |
| 318 | updateOrderItems | `session:summary` | events[1] |
| 319 | updateOrderItems | `store:orders` | events[2] |

（11 处分布在 5 个 function 里——5 个 function 返回 `events[]`，平均 2-3 event/function）

### 迁移映射表（20 JsonStore 调用）

| legacy 行号 | 函数 | 替换为 |
|---|---|---|
| 15 | createOrder（内部 count 查询）| `orderRepo.countByStore(storeId, tx)`（**需 Phase D Task 17 回填**——见决策点 33-D） |
| 44 | createOrder（最近 orders）| `orderRepo.findSubmitted({storeId, createdAt: {gt: oneHourAgo}}, tx)` |
| 90 | createOrder（store config）| `storeRepo.findById(storeId, tx)` |
| 116 | createOrder（insert）| `orderRepo.create(data, tx)`（**Phase D Task 17 `createOrder` 需要检查——目前只有 `createDraftOrder`**——决策点 33-A） |
| 136 | getOrders | `orderRepo.findSubmitted({storeId}, tx)`（默认排除 draft，D24） |
| 147 | updateOrderStatus（get）| `orderRepo.findById(orderId, tx)` |
| 152 | updateOrderStatus（update）| `orderRepo.updateStatus(orderId, status, tx)` |
| 164 | transferOrder（get）| `orderRepo.findById` |
| 180 | transferOrder（update tableId）| `orderRepo.updateTableId(orderId, newTableId, tx)`（**Phase D 可能未列——决策点 33-B**）|
| 190 | transferOrder（remaining check）| `orderRepo.findActive(storeId, tx).then(orders => orders.filter(o => o.tableId === sourceTableId && o.id !== orderId))` |
| 206 | deleteOrder（get）| `orderRepo.findById` |
| 211-214 | deleteOrder（session.orderIds 维护）| **删除**（决策点 32-A：orderIds 字段去除） |
| 219 | deleteOrder（remaining check）| `orderRepo.findSubmitted({tableId: order.tableId}, tx)` |
| 225 | deleteOrder（delete）| `orderRepo.delete(orderId, tx)` |
| 238 | voidItem（get）| `orderRepo.findById` |
| 253 | voidItem（update items）| `orderRepo.updateItems(orderId, items, totalPrice, tx)`（**Phase D 可能未列——决策点 33-C**）|
| 267 | updateOrderItems（get）| `orderRepo.findById` |
| 301 | updateOrderItems（update）| 同 253 决策 |
| 312 | updateOrderItems（session find）| `sessionRepo.findById` 或 `sessionRepo.listByStore().find(active)` |

### 决策点 33-A：legacy `createOrder` vs B2 `createDraftOrder`

**现状**（grep 证据 `order.service.ts:29-133`）：legacy `createOrder(storeId, req)` 直接插入 `pending` 或 `preparing` 状态的 order（跳过 draft）。这是**管理端/staff 手动建单路径**（不走顾客 cart）。

**B2 后两个路径**：
- 顾客 cart → submit → draft order → pending/preparing（走 Task 34 B2 重写）
- 管理端手动建单 → ???

**选项**：
- **A（保留 legacy createOrder 语义）**：`orderRepo` 新增 `createSubmitted(...)` 方法，绕过 draft 直接插 pending/preparing。Phase D Task 17 回填。
- **B（统一走 draft）**：管理端也先建 draft 再 submit——UX 变化（多一步），但模型纯粹
- **C（legacy createOrder 临时保留 + 弃用警告）**：管理端照旧，标记 legacy，未来清理

**建议**：**A**（保留语义，对齐 staff 心智模型——"staff 开单不是购物车"是产品设计选择）。Phase D Task 17 回填 `createSubmitted` 方法。

**回填内容**（加入 Phase G 事后回填清单）：

```ts
// Phase D Task 17 补：
orderRepo.createSubmitted: (
  input: { storeId, sessionId, tableId, deviceId?, items, initialStatus: 'pending'|'preparing' },
  tx: TransactionClient
) => Promise<SubmittedOrderWithItems>
```

### 决策点 33-B：`orderRepo.updateTableId` 方法

Phase D Task 17 设计 `updateStatus` / `voidOrder` / `replaceDraftItems` / `submitDraft`——**没有 `updateTableId`**。Legacy `transferOrder` 需要。

**选项**：
- **A**：Phase D Task 17 回填 `updateTableId(orderId, tableId, tx)` 单步方法
- **B**：用 `tx.order.update({where: {id}, data: {tableId}})` 直写——违反"只走 repo"原则
- **C**：更泛化 `updateMeta(orderId, patch, tx)` 方法 —— over-generic

**建议**：**A**。Phase G 事后回填。

### 决策点 33-C：`orderRepo.updateItems` 方法

Legacy `voidItem` / `updateOrderItems` 对 submitted order 的 items 做局部更新（标 voided 或整批替换）。Phase D Task 17 只有 `replaceDraftItems`（draft only）。

**选项**：
- **A**：Phase D Task 17 回填 `updateSubmittedItems(orderId, items, tx)` ——**语义危险**：修改已 submitted items 会破坏"订单不可变"直觉
- **B**：语义分离——`voidItem(orderId, itemPosition, tx)` 专用 void 单 item；`addItemToSubmitted`（如果业务支持）
- **C**：禁止修改 submitted items——legacy 的 `voidItem` / `updateOrderItems` 改为"创建补单"逻辑

**建议**：**B**。B 保持审计清晰（void 独立 action，add 独立 action），A 过于通用容易误用。Phase D Task 17 回填 `voidItem` 方法。

**回填内容**：

```ts
// Phase D Task 17 补：
orderRepo.voidOrderItem: (
  orderId: string,
  position: number,
  tx: TransactionClient
) => Promise<SubmittedOrderWithItems>

// Legacy updateOrderItems 整批替换 submitted 的语义 → 停止支持（grep 确认前端调用点，如有则一起重写）
```

### 决策点 33-D：`orderRepo.countByStore` 方法

Legacy line 15 用 `orderStore.getByField('storeId', storeId).length` 在 `createOrder` 内部算"订单号序列号"。B2 后用 Postgres 自增或另算。

**选项**：
- **A**：Phase D 回填 `orderRepo.countByStore(storeId, tx)` 用 `prisma.order.count({where: {storeId}})`
- **B**：订单号改为 uuid 的截断 /  DB sequence —— schema 改动
- **C**：完全去除"订单号"字段，用 Order.id 展示

**建议**：**A**（最小迁移影响）。Phase D Task 17 回填。

### Phase G 事后回填清单（本段 1 发现）

和 Phase E/F 收尾批次同模式——本段 1 发现以下 Phase D Task 17 回填：

| # | 内容 | 依据 |
|---|---|---|
| G1-1 | `orderRepo.createSubmitted(...)` | 决策点 33-A，staff 开单 bypass draft |
| G1-2 | `orderRepo.updateTableId(id, tableId, tx)` | 决策点 33-B，transferOrder 需要 |
| G1-3 | `orderRepo.voidOrderItem(orderId, position, tx)` | 决策点 33-C，voidItem 语义分离 |
| G1-4 | `orderRepo.countByStore(storeId, tx)` | 决策点 33-D，createOrder 序列号 |

**处理策略**：Phase G 段 2 / 段 3 如发现新回填项一并累积；收尾 commit 不触 Phase D/Task 17（Phase G plan 内部消化），等下个 session 开 Phase G 实施阶段再集中回填 Phase D Task 17 + 实施 Task 32-42。

### Step 1-6：实施

同 Task 32 5 步模式 + 追加 Step 6：regex 批量处理 11 处 emit 移到 events[] 返回。

### 测试

Phase G 段 1 对应测试新建 `__tests__/order.test.ts`（业务语义策略，3-5 case + 1 RLS smoke）：
1. createOrder staff path（decision 33-A，createSubmitted 直接 pending/preparing）
2. updateOrderStatus kitchen flow（pending → preparing → served）
3. `served` 状态保留不被 deleteOrder 的 closed-filter 排除（CLAUDE.md 防御规则回归测试）
4. transferOrder 跨桌（tableId 变化，remaining order 数对）
5. voidOrderItem 单 item void（position 正确）
6. RLS smoke：tenant A 的 order 不可见于 tenant B

### commit（段 1 落地）

```bash
cd "$(git rev-parse --show-toplevel)"
git add docs/superpowers/plans/2026-04-17-phase5-postgres-migration/phase-g-session-order.md
git commit -m "plan(phase-g): section 1 - session-crud and order-service migration (Task 32-33)

Phase G 段 1 plan: session-crud.ts (16 JsonStore → 0) + order.service.ts
(20 JsonStore + 11 emit → 0 + 0, events via afterCommit hook, Phase B
Task 8 commit 2f51b8cb).

Grep ground truth embedded per rule 7:
- session-crud.ts: 16 calls (sessionStore/tableStore/orderStore), 0 emit,
  0 itemKey dependency
- order.service.ts: 20 calls, 11 emit (lines 128/129/130 /158/159 /227
  /260/261/262 /317/318/319), 0 itemKey, 4 'served' guards (CLAUDE.md
  防御规则: served != 已结账, 迁移后行为必须等价)

Phase G 事后回填清单 (段 1 发现 4 项, 累积到段 2/3 一并 land):
- G1-1 orderRepo.createSubmitted (staff bypass draft, 决策点 33-A)
- G1-2 orderRepo.updateTableId (transferOrder, 决策点 33-B)
- G1-3 orderRepo.voidOrderItem (void 语义分离, 决策点 33-C)
- G1-4 orderRepo.countByStore (createOrder 序列号, 决策点 33-D)

spec §9.8 子任务 3 '事件载体改为 draft order 快照' 与 handoff §5c
grep 证据矛盾 (SSE payload 本身不变, 改的是 fetch API response shape).
本 plan 以 grep 证据为准, 段 2 Task 34 将显式标注该 spec 修正.

决策点 32-A: session.orderIds 字段去除 (Phase D schema Session 无该字段,
冗余). 迁移动作: 读改派生, 写删除.

决策点 32-B: adoptOrphanedOrders 函数删除 (B2 schema 禁止 orphan,
无使用场景). 实施前 grep 确认无 callsite.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## 下一步

段 1 C1 commit 后 → 段 2 `phase-g-session-cart-b2.md`（B2 最高风险区，Task 34）+ 段 3 `phase-g-b2-checkpoint.md` 或并入段 2（Task 35，7 场景）。

**段 2 预算警戒线**：>2 小时未完成立刻暂停汇报（Ian 2026-04-17 设定）。

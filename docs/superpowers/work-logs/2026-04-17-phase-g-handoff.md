# Phase G Handoff Work-Log

记录 Phase D 期间发现的、需要在 Phase E/F/G 执行阶段落地的具体实施任务。Phase G agent 开工时先读本文档。

---

## 1. `server/src/lib/legacy-itemkey.ts` — 实现任务（D56 薄兼容层）

**归属**：Phase G Task 34 之前的基础设施子任务（Agent E、Agent F、Agent G 任一都可做，实际独立无冲突）

**设计要点**（D56 精确定义：Controller 1cm 薄转换层）：

```ts
// server/src/lib/legacy-itemkey.ts
import type { Prisma } from '@prisma/client'

/**
 * Parse legacy "orderId:idx:qty" string into relational (orderItemId, quantity) pair.
 * Requires tx (read under tenant context).
 */
export async function parseItemKey(
  key: string,
  tx: Prisma.TransactionClient
): Promise<{ orderItemId: string; quantity: number }> {
  const parts = key.split(':')
  if (parts.length < 2) throw new Error(`Invalid itemKey: ${key}`)
  const orderId = parts[0]
  const position = parseInt(parts[1], 10)
  const quantity = parts.length >= 3 ? parseInt(parts[2], 10) : Infinity

  const item = await tx.orderItem.findFirst({
    where: { orderId, position },
  })
  if (!item) throw new Error(`No OrderItem found for ${orderId}:${position}`)
  return { orderItemId: item.id, quantity }
}

/**
 * Format (orderItemId, quantity) back to legacy "orderId:idx:qty" string.
 * Caller passes pre-loaded order.items to avoid extra DB hit.
 */
export function formatItemKey(
  orderItemId: string,
  quantity: number,
  orderItemsInOrder: { id: string; position: number; orderId: string }[]
): string {
  const item = orderItemsInOrder.find(i => i.id === orderItemId)
  if (!item) throw new Error(`formatItemKey: orderItemId ${orderItemId} not in provided items`)
  return `${item.orderId}:${item.position}:${quantity}`
}
```

**使用方**：
- Controller 层 Request 进来：`request.itemKeys: string[]` → `parseItemKey` 转 (orderItemId, quantity) 对，传给 repo
- Controller 层 Response 出去：repo 返回 `PaymentItem[]` → `formatItemKey` 转回字符串给前端

**前端契约不变**：前端依然发/收 `"orderId:idx:qty"` 字符串。

---

## 2. 5 处散落 `.split(':')` 废弃 checklist

Phase G 迁移时把下列 5 处代码统一替换为 `parseItemKey()` 调用（不再手动 `.split(':')` + 自行解析）：

| # | 文件 | 行号 | 当前逻辑 | 迁移后 |
|---|---|---|---|---|
| 1 | `server/src/controllers/session-settlement.ts` | 101 | 解析 `paidItemIds` 的 `orderId:idx:qty` | 从 `PaymentItem` 查 FK 对 |
| 2 | `server/src/lib/session-state.ts` | 121 | FIFO 归因生成 `${baseKey}:${qty}` | 直接创建 PaymentItem `(orderItemId, paidQuantity)` |
| 3 | `server/src/controllers/split-bill.service.ts` | 47 | 冲突检测解析 itemKey | SplitBillItem FK 关系 + 聚合查 paid_qty |
| 4 | `server/src/controllers/split-bill-summary.ts` | 64 | 计算 split subtotal 从 itemKey 解析 | JOIN SplitBillItem + OrderItem 直接聚合 |
| 5 | `server/src/settlement/rules.ts` | 57 | 规则检查解析 itemKey | 同上 |

**迁移后 `grep -rn "split(':')"` 在 server/src/controllers + server/src/lib + server/src/settlement 应返回 0**（仅 `legacy-itemkey.ts` 内部保留一处）。

---

## 3. `OPTIMISTIC_LOCK_CONFLICT` 错误码升级为 class

**现状**（Phase D Task 17 `orders.ts`）：
```ts
const err = new Error('Draft order version mismatch...')
;(err as any).code = 'OPTIMISTIC_LOCK_CONFLICT'
throw err
```

**Phase G 实施时**：在 `server/src/lib/errors.ts`（或类似位置）定义：

```ts
export class OptimisticLockError extends Error {
  readonly code = 'OPTIMISTIC_LOCK_CONFLICT' as const
  constructor(message: string) {
    super(message)
    this.name = 'OptimisticLockError'
  }
}
```

`orders.ts` / `sessions.ts` / 其他乐观锁位置全部改用 `throw new OptimisticLockError(...)`。Route 层 `catch (err) { if (err instanceof OptimisticLockError) return 409 }`——类型安全，不再用 `(err as any).code`。

**grep 清单**：实施时 `grep -rn "OPTIMISTIC_LOCK_CONFLICT" server/src` 应只在 `errors.ts` 定义和 route 层 `instanceof` 检查，repo 层不直接用字符串。

---

## 4. Phase D → Phase G 其他 handoff 条目

（Phase D 后续 task 完成时可能追加更多条目；此文档持续更新到 Phase G 开工为止）

- [ ] Client OrderStatus switch sites（`2026-04-17-phase5-client-orderstatus-todos.md`）→ Phase G Task 34
- [ ] Phase C `tenant-isolation.test.ts` Case 2 修正（真实 table setup 让 RLS/WITH CHECK 真正失败）→ Phase D 末尾或 Phase G 开头

---

## 5. Phase G 启动输入：4 条决策（Ian 确认 · 2026-04-17）

> **定位**：Phase G plan 独占下个新 session 写作时的输入清单。本小节 4 条决策已由 Ian 拍板，Phase G agent 开工时按此直接执行，不需再议（除非 grep 证据推翻）。
>
> **措辞约束**：本文档用"启动输入"而非"前置"——避免暗示 Phase G 已在进行。

### 5a. `Order.version` 起始值

- **决议**：`@default(0)`，不继承 session.cartVersion
- **Spec 锚点**：§4.1 line 313 `version Int @default(0)` 已 grep 核查 ✅
- **依据**：D47 + D36，EC2 sessions/orders/payments 都不迁移，无 pending cart 悬挂问题
- **前端连锁**：所有 `session.cartVersion` 引用切到 `order.version`——挂到 5c 的前端 subtask `G-frontend-contract` 一起处理

### 5b. `Order.deviceId` 落位

- Spec D30 + §4.1 已决，无需再议
- Partial unique index `(session_id, device_id) WHERE status='draft'`

### 5c. SSE + Fetch API 契约（subtask `G-frontend-contract`）

**关键发现**（grep 证据完整附 §6 附录）：

- SSE `cart:updated` 载荷**极简**——仅 `type` / `storeId` / `sessionId`，无 cart items
- 前端收到事件后**主动 fetch**（`useCartSync.ts:126` subscribe → fetchAndApply）
- **SSE payload 本身 B2 无破坏性变化**（`storeId` + `sessionId` 继续够用）
- **真正破坏点**在 fetch API `GET /stores/:storeId/sessions/:sessionId/cart` 的 response shape——当前 `{ items: CartItem[], cartVersion, lastCartSubmitAt }`，B2 后自然形状是 draft order 结构

**三选项重述**（对象为 fetch API 契约，不是 SSE payload）：

- **选项 A**：fetch 保留旧 cart 形状——服务端加 `draftOrderToCartShape()` 映射层，前端零改动。额外工作：映射函数 + 字段双向兼容（`unitPrice↔price` / `note↔remark` / `options↔selectedOptions` / `addedByDevice` 归属重排）
- **选项 B**：fetch 改 draft order 形状——前端 `CartPage` / `useCartSync` / `OrderConfirmPage` 解析改写。额外工作：5+ 前端文件的字段映射和类型调整
- **选项 C**：过渡期双发（response 同时含旧字段和新字段，写弃用日志）——N 周后切 B。额外工作：double-emit 代码 + deprecation tracking + 切换日期承诺

**决策归属**：Phase G session 启动时 Ian 判——基于附录 §6 grep 证据的三选项对比

**硬约束**：
- 不拆独立 Phase G-frontend；subtask 必须与 `session-cart.ts` 重写**同一 deploy 窗口**（避免契约错位期）
- 前端乐观锁字段 `session.cartVersion` → `order.version` 的引用迁移（5a 连锁）**也挂在本 subtask 处理**

### 5d. `legacy-itemkey.ts` 文件顶注释（实施约束）

当 Phase G 按 §1 创建 `server/src/lib/legacy-itemkey.ts` 时，**文件顶部必须字面照抄以下注释**（首行，在所有 import 之前）：

```ts
// EXIT CONDITION: 当 /api/*/payment 和 /api/*/split-bill 的请求体
// 改用 { orderItemId, quantity } 替代 itemKey 字符串时删除本文件。
// 目前前端 API 契约不变（D56），本文件无退场时间表。
// 如需退场，搜索所有调用 parseItemKey / formatItemKey 的 controller 文件。
```

**文档措辞约束**：
- **不建 Phase L 空壳**（若曾有"Phase L = 清理 legacy-itemkey"提议，否决）
- **不在任何文档用"薄兼容层"措辞**——永久保留就字面写永久

### 5e. Task 35（B2 Checkpoint）粒度约定

**Grep 核查历史**（规则 7）：2026-04-17 session 内 `grep -rn "Task 35\|场景 c\|scenario c\|双层结构\|intent.*concrete" docs/` 返回 0 匹配。Ian 后确认模板是"Claude chat instance 上 session 当场生成的模板，不是项目内已有文档"——CC grep 为 0 正确，是 Ian 传递信息时误引用归属。规则 7 执行正确。

**模板定位**：Phase G plan Task 35 必须按此双层结构展开 7 场景 a-g。只写 steps 不写 intent 不合格。

**结构模板**（以场景 c 为示例）：

```
### 场景 c：换设备扫同桌 → 不看到 A 的购物车

**Verification intent**（为什么测这个）：
防止同一 sessionId 下 deviceId A 的 cart 泄露到 deviceId B。
这是 B2 deviceId 隔离的核心不变量。违反会导致多人同桌时购物车互相污染。

**Concrete steps**（当下怎么做）：
1. 设备 A 扫码加入桌 T → 加菜品 X 到 cart
2. 设备 B 扫码加入同桌 T（同一 sessionId）
3. 验证点：设备 B 的 cart UI 为空，不包含 X
4. 设备 B 加菜品 Y → 提交
5. 验证点：设备 A 的 cart 仍含 X，未被 Y 污染

**Failure mode handling**：
如果 concrete steps 和现实不对齐（URL 变 / UI 流程改），
参考 intent 重写 steps——不要盲目 pass。
intent 永远不会过期，steps 可能过期。

**Pass criteria**：所有验证点通过
**Tag on pass**：记录 `phase5-b2-checkpoint.scenario-c.pass`
```

**7 场景清单**（顺序验证，每条独立 pass/fail）：

- a. 顾客扫码进桌 → 加 3 道菜 → draft order 有
- b. 关页面重开 → 购物车从 draft 恢复
- c. 换设备扫同桌 → 不看到 A 的购物车（deviceId 隔离）
- d. Pay-first 取消 → 购物车还在（B2 修复的 bug）
- e. 多设备各自 draft → 各自提交成独立 order
- f. 提交后 kitchen 视图可见
- g. 提交后 draft 消失，同 deviceId 可建新 draft

7 场景全 pass 后打 tag `phase5-b2-checkpoint` 到 main 分支。

**Phase G plan 写作时的约束**：

Task 35 子小节必须为 7 个场景各自写完整 intent + concrete steps + failure mode + pass criteria + tag。
不允许只写 steps。不允许 concrete steps 不可执行（必须明确到"点哪个按钮、看哪个字段"）。
如果写 Task 35 时发现某场景的 intent 不清楚——停下来让 Ian 定义 intent，不要凭印象填。

---

## 6. Phase G 启动输入：5c 补充 grep 证据附录

### 6.1 前端 cart fetch 入口

**`client/src/hooks/useCartSync.ts:90-96`** (`fetchAndApply`):
```ts
api.getSessionCart(storeId, sessionId)
  .then(({ items: serverItems, cartVersion, lastCartSubmitAt }) =>
    applyServerCart(serverItems, cartVersion, lastCartSubmitAt ?? undefined))
```

**`client/src/services/api/session.ts:39-42`** (`getSessionCart` 定义):
```ts
getSessionCart: (storeId, sessionId) =>
  fetchJSON<{ items: CartItem[]; cartVersion: number; lastCartSubmitAt: string | null }>(
    `/stores/${storeId}/sessions/${sessionId}/cart`,
  )
```

### 6.2 服务端路由 response 形状

**`server/src/routes/session.routes.ts:44-56`** (`GET /stores/:storeId/sessions/:sessionId/cart`):
```ts
router.get('/:sessionId/cart', (req, res) => {
  // ... 404 guard ...
  const items = svc.getSessionCart(req.params.sessionId)
  res.json({
    items,
    cartVersion: session?.cartVersion ?? 0,
    lastCartSubmitAt: session?.lastCartSubmitAt ?? null,
  })
})
```

**`server/src/controllers/session-cart.ts:8-15`** (`getSessionCart`):
基于 `session.pendingCart`（legacy 支持 `CartItem[]` 或 `Record<deviceId, CartItem[]>`），返回**flatten 后的 `CartItem[]`**。

### 6.3 `CartItem` 字段 vs B2 后 `OrderItem` 字段（字段级对比）

| 当前 `CartItem` | B2 `OrderItem` | 差异 |
|---|---|---|
| `menuItemId` | `menuItemId` | 同 |
| `name` | `name` | 同 |
| `price` | `unitPrice` | **改名** |
| `quantity` | `quantity` | 同 |
| `remark` | `note` | **改名** |
| `selectedOptions` | `options` (OrderItemOption[]) | **嵌套结构变**（CartItem.selectedOptions 内联 object vs OrderItemOption FK 实体）|
| `addedBy` | ❌ schema 无 | **可能消失**或需要 Order 层面的 `customerName` 字段承接 |
| `addedByDevice` | （Order 层 `deviceId`，不在 Item 层）| **语义上移**（per-item → per-order） |

### 6.4 当前 response shape vs B2 自然 shape

| 字段 | 当前 | B2 draft order 直接序列化 |
|---|---|---|
| 顶层形状 | `{ items, cartVersion, lastCartSubmitAt }` | `DraftOrder` 或 `DraftOrder[]`（看聚合粒度——单 device vs 全 session） |
| `items` | 单一 flatten 数组（所有 device 混合）| 嵌在 `order.items`，每个 draft order 各自一套 |
| `cartVersion` | `session.cartVersion` | `order.version`（多 draft order 时有多个 version）|
| `lastCartSubmitAt` | session 级 ISO string | `order.lastCartActivityAt`（语义微变：活动 vs 提交） |

### 6.5 语义结构差异（最大风险点）

- **当前**：session 级 `pendingCart: Record<deviceId, CartItem[]>`——一个 session 所有 device 的 cart 在一个字段，fetch 时 flatten 为 `CartItem[]`
- **B2**：**每 device 各自一个 draft Order**（`@@unique(sessionId, deviceId) WHERE status='draft'`）——N 个 draft orders 各自独立，各自有 `version` 和 `lastCartActivityAt`

"列一个 session 所有 device 的 cart" 的实现方案：
- **方案 1**：新 `findDrafts(sessionId)` 返回 `DraftOrder[]`（多个独立订单，前端决定如何 merge/展示）
- **方案 2**：server 端 `flatMap(order => order.items)` 回到 `CartItem[]` flat shape（即选项 A 的核心映射逻辑）

**选项 A/B 核心权衡**：A 维持"单 flatten 数组 + 单 cartVersion"语义（隐藏多 draft order 结构），B 暴露多 draft order 结构让前端显式处理。选项 A 兼容成本集中在 server（映射 + 多 version 如何汇总成单 version 需要设计），选项 B 成本散在前端多文件。

---

## Phase G Task 41 handoff: D62 候选 webhook 幂等

**发现来源**：Phase G C4a grep（`38e198b8`, 2026-04-17）

**当前状态**：webhook.routes.ts 纯转发（25 行，0 业务），无显式幂等处理。
重放同 PaymentIntent 会重复 addPayment，真钱风险。

**D62 候选方案**（Task 41 webhook plan 时正式决议）：

- **候选 A**：processed_webhook_events 表
  - 表结构：event_id (PK) + processed_at + event_type
  - 处理：webhook 入口先查表，已处理则直接 return
  - 需额外：过期清理策略（Stripe 事件保留 30 天）
  - 事务边界：查表 + 处理 + 插表 原子事务

- **候选 B**：stripe_payment_intent_id UNIQUE on Payment
  - 在 Payment 表加 UNIQUE 约束
  - 重复 insert 触发 DB 层冲突 → catch 后认定已处理
  - 0 应用层代码
  - 依赖：Stripe PaymentIntent ID 天然幂等（同一支付意图重试同一 ID）

**Ian 倾向 B**，理由：

1. DB 层强制，0 应用层代码
2. 无需额外过期清理策略
3. Stripe PaymentIntent ID 天然幂等
4. processed_webhook_events 需事务边界设计 + 与 webhook handler 交互顺序

**非当前决议**：Task 41 webhook plan 写作时 Ian 正式判，可能结合当时 grep 发现调整。

**Task 41 实施依赖**：

- 若选 B，Phase B Task 2 schema 需回填 `@@unique` 约束或新 migration 文件
- 若选 A，新建 processed_webhook_events 表 migration

**D62 候选 B 落地依赖**（2026-04-19 段 5 范围校对 `20e69b30` 发现）：

当前 Phase B schema（`phase-b-infrastructure.md` line 379）`Payment.stripePaymentIntentId` 字段是 `@@index` 不是 `@@unique`。
候选 B 落地需要 Phase B schema 增量 migration：

- 新建 `prisma/migrations/2026XXXXXXXX_payment_stripe_unique/migration.sql`
- 迁移内容：`ALTER TABLE "Payment" DROP INDEX "stripePaymentIntentId_idx"`；`ADD UNIQUE INDEX ...`
- Task 41 plan 写作时必须包含此 migration 设计

此发现**不改变候选 B vs A 的比较**（B 仍然比 A 简单），但增加 B 的落地成本约 1 个 migration 文件 + rollback 设计。
Task 41 plan 写作时，Ian 拍板 D62 候选时可考虑此 "~50 行 migration vs ~100 行 processed_webhook_events 表 + 清理逻辑" 的成本对比。

# Phase G 段 4 前置 Grep 证据（C4a）

**目的**：为 Phase G 段 4 Task 36（`payment.service.ts` B2 适配）plan 写作（C4b）提供 grep-anchored 事实基础。对应 Ian 2026-04-18 指令中的 C4a 独立 commit。

**规则 7 合规**：所有"当前系统行为"断言均带 grep 命令 + 原始输出 + 含义说明。

---

## 🛑 规则 8 触发信号汇总（**先看这里**）

C4a grep 过程发现 **3 个规则 8 预警信号**，其中 **2 个严重**。按 Ian 2026-04-17 指令"C4a push 成功后暂停不立即启动 C4b"——本文件 commit + push 后 **HOLD 讨论**，不自行进 C4b。

| 信号 | Ian 设定阈值 | 实际 | 严重度 |
|---|---|---|---|
| **现有 snapshot/幂等机制** | 有 → 停下讨论扩展还是新建 | 无直接 snapshot/idempotenc/externalRef，**但** `pi.metadata.cartData` 是**语义相近的 cart 序列化快照**（§2） | 🟡 中（讨论是扩展思路还是新建）|
| **payment 域 legacy itemKey 依赖** | 任何存在即触发"二次 itemKey 风险"首发信号 | **24+ 处深度依赖**，分布 4 文件（§5）——handoff §1 `legacy-itemkey.ts` 薄层的**真正主用户**在 payment 域 | 🔴 **严重** |
| **D58 路径 X 在 payment 域未覆盖边界** | 任何发现即停 | **重大发现**：legacy webhook 是 `createOrder(metadataCart)` 不是 `submitDraft(existingDraftId)`——两种语义**根本不同**（§3） | 🔴 **严重** |

**HOLD 讨论条目**（等 Ian 决策方向后 C4b 才能动）：

1. **R-X1 snapshot 是新建还是扩展 `pi.metadata.cartData` 现有思路？** → D59 候选之一（不止 A/B path 选择）
2. **payment 域 24+ itemKey 依赖如何处理？** → handoff §1 薄层对齐 + 渐进迁移还是一次性切 FK 模型
3. **D58 路径 X 在 payment 域的落地形态？** → legacy "webhook createOrder from metadata" vs B2 "webhook submitDraft(draftId)" 的**衔接模式**
   - 变体 X.1：保留 cart data in metadata，webhook createOrder-from-metadata 保持（最小改动，但违反 "draft in DB" 纯粹性）
   - 变体 X.2：PaymentIntent metadata 只存 `{draftId, version}`（pointer），webhook 读 draft 后 submitDraft（最纯 B2，但失去离线 metadata 恢复能力）
   - 变体 X.3：冗余双存 metadata（cartData + draftId），webhook 优先读 draft 失败回退 metadata（最防御，但复杂度高）

---

## Pending commits 清单（规则 8.1 实时）

本 session 2026-04-18 Phase G Task 36 预计 3 commit（按 Ian 指令拆分）：

- [ ] **C4a**：本文件 `phase-g-section-4-grep.md`（前置 grep 证据 + HOLD 标注）
- [ ] C4b：`phase-g-payment-service.md` (Task 36 plan 主文件)——**仅当 Ian 明示 C4b GO 后开启**
- [ ] 收尾 commit：RESUME + 00-index 同步（Task 36 完成后）

C4a commit 后 pending = 2/3（C4b 挂起 + 收尾）。**Ian 若选 HOLD**，pending 停留在 1/3（仅收尾 commit 依赖 Task 36 完成）。

---

## 1. `payment.service.ts` 现状完整读

### 结构摘要

- **行数**：291
- **文件职责**：Stripe PaymentIntent 创建（pay-first + session-payment 两路径）+ webhook 处理（payment_intent.succeeded）
- **JsonStore 调用**：**5 处**
- **Stripe SDK 调用**：`getStripe().paymentIntents.create` (line 74, 136) + `getStripe().webhooks.constructEvent` (line 170) + `getStripe().refunds.create` (line 194, 215)

### JsonStore 调用点枚举（grep 验证）

```bash
grep -cE "paymentStore|sessionStore|orderStore|storeStore|tableStore|JsonStore" server/src/controllers/payment.service.ts
# 预期：5
```

| # | 行号 | 代码 | 语义 |
|---|---|---|---|
| 1 | 6 | `import { orderStore, sessionStore, paymentStore } from '../repositories/stores.js'` | 3 个 store 导入 |
| 2 | 106 | `sessionStore.getById(req.sessionId)` | session-payment 路径查 session |
| 3 | 209 | `paymentStore.update(result.payment.id, { method: 'stripe' })` | webhook 标记 session 支付为 stripe |
| 4 | 266 | `orderStore.update(result.id, { isPaid: true, updatedAt: ... })` | **pay-first webhook 建 order 后标 isPaid** |
| 5 | 274 | `paymentStore.update(payResult.payment.id, { method: 'stripe' })` | pay-first webhook 标记支付方法 |

### 函数清单

| 行号 | 函数 | 签名 | 核心逻辑 |
|---|---|---|---|
| 21-90 | `createPaymentIntent(req: CheckoutRequest)` | pay-first 入口 | 计算 amount → **cart data 序列化进 metadata**（line 49-72）→ Stripe PaymentIntent create |
| 105-157 | `createPaymentIntentForSession(req: SessionCheckoutRequest)` | pay-later / split 入口 | 校验 session → 计算 chargeAmount → metadata 存 `{storeId, sessionId, type: 'session-payment', settlementType, itemKeys(JSON), percent}`（line 139-148） |
| 161-291 | `handleWebhookEvent(payload, signature)` | webhook 处理器 | 构造 event → 根据 metadata.type 分派：session-payment（line 177-229）or pay-first 建 order（line 231-287）|

### 金额计算逻辑（R-X1 相关）

**pay-first 路径** (line 24-47)：

```ts
for (const item of req.items) {
  const menuItem = getMenuItemById(req.storeId, item.menuItemId)
  const optAdjust = (item.selectedOptions ?? []).reduce((s, o) => s + o.priceAdjust, 0)
  subtotal += (menuItem.price + optAdjust) * item.quantity
}
// ... discount + tax + fee + tip = chargeAmount
```

**amount 快照在 PaymentIntent 创建时就确定**（Stripe 文档最佳实践一致）。若 cart 在付款中途改变，amount 不自动更新——**R-X1 漂移的本质发生点就在这里**。

**session-payment 路径** (line 114-122)：基于 session 总额计算（`deriveSessionTotalAmount` + `derivePaidState` + `remaining`），不涉及 draft order 模型。

---

## 2. 现有 snapshot / 幂等 / externalRef 机制核查

### grep 命令

```bash
grep -rn "snapshot\|idempotenc\|externalRef" server/src/controllers server/src/lib server/src/routes | grep -iE "payment|webhook|stripe|intent"
```

### 结果：**0 直接匹配**

项目**无现有 snapshot / idempotency / externalRef 机制**。但 grep metadata 发现语义相近的机制：

**`pi.metadata.cartData` 是 cart 状态序列化快照**（`payment.service.ts:49-72`）——pay-first 路径把 cart 完整内容序列化存进 Stripe PaymentIntent metadata，webhook 时反序列化重建 order：

- Line 54-56：`cartData = JSON.stringify({s: storeId, t: tableId, i: compactItems, c: customerName})`
- Line 58-72：若超 500 字节分 chunk 存（`cart_0`, `cart_1`, ... + `cartChunks`）
- Line 232-253（webhook）：反序列化 chunks → 重建 cart 对象

**含义**（R-X1 设计关系）：

- 方向 A：**R-X1 扩展现有思路**——把 cart 的"内容快照"升级为"version+内容快照"，webhook 校验 version 一致
- 方向 B：**R-X1 新建独立机制**——Stripe metadata 只存 `{draftId, version}` pointer，不存内容（cart 内容在 DB draft 里）
- 方向 C：两者共存（双存 metadata：旧 cartData + 新 draftId/version）

**三个方向都技术可行**——选择影响 C4b Task 36 的 snapshot 实现代码位置和 D58 路径 X 在 payment 域的落地形态（见 §3）。

### 幂等机制实际状态

webhook handler 无显式幂等处理（重放同一 PaymentIntent 会重复 addPayment / createOrder）——**潜在风险**但超出 Task 36 范围（应归 Task 41 webhook plan）。Stripe 端 webhook 默认有 delivery guarantee + retry，应用层处理**重复 event** 时若不幂等会重复建 order。

标注：**[Phase G Task 41 handoff]** webhook 幂等性加固——添加 `processed_webhook_events` 表或 `stripe_payment_intent_id unique on Payment` 约束。

---

## 3. Stripe PaymentIntent 完整交互链

### Pay-first 流程（当前 legacy）

```
[前端] 扫码 → cart 加菜 → session.pendingCart
 ↓
[前端] cart 页点"去付款"
 ↓
api.submitSessionCart → POST /submit-cart  (session.routes.ts:73-96)
 ↓ pay-first 分支: 清 pendingCart + 返回 items + paymentMode='pay-first'
[前端] 拿 items 后调 api.createCheckout → POST /checkout
 ↓
controllers/payment.service.ts:createPaymentIntent
 ↓ 把完整 cart 内容序列化进 metadata.cartData (可能分 chunks)
Stripe PaymentIntent created (amount + metadata)
 ↓ 前端拿 clientSecret → Stripe.js confirmPayment
顾客完成支付 / 取消 / 失败
 ↓ (success 路径)
Stripe webhook → POST /api/webhook/stripe
 ↓
handleWebhookEvent → payment_intent.succeeded
 ↓ pay-first 分支 (line 231-287)
从 metadata 反序列化 cart → createOrder(storeId, {tableId, items}) → orderStore.update({isPaid: true}) → addPayment
```

### metadata 字段清单

**Pay-first** (`payment.service.ts:58-72`)：

| Key | Value | 用途 |
|---|---|---|
| `storeId` | req.storeId | webhook 分派 |
| `tableId` | req.tableId | webhook 建 order |
| `type` | `'pay-first'` | webhook 分派 |
| `sessionId` | session?.id (可选) | webhook attach payment |
| `tipAmount` | String(tip) (可选) | webhook 记小费 |
| `cartData` or `cart_0/cart_1/.../cartChunks` | JSON 序列化 cart | webhook 重建 order |

**Session-payment** (`payment.service.ts:139-148`)：

| Key | Value | 用途 |
|---|---|---|
| `storeId` | req.storeId | webhook 分派 |
| `sessionId` | req.sessionId | webhook attach payment |
| `type` | `'session-payment'` | webhook 分派 |
| `paidBy` | req.paidBy ?? '' | 审计 |
| `settlementType` | `'by-item' \| 'by-percent'` (可选) | webhook attribution |
| `itemKeys` | `JSON.stringify(req.itemKeys)` (可选, **legacy itemKey**) | webhook by-item attribution |
| `percent` | String(req.percent) (可选) | webhook by-percent attribution |
| `tipAmount` | String(tip) (可选) | 小费 |

### B2 后 metadata 设计变化点（C4b 需决策）

- pay-first `cartData` 去留 → R-X1 snapshot 方向决定
- session-payment `itemKeys` → handoff §1 legacy-itemkey.ts 需要**在 metadata 层转**（orderItemId + quantity 太长可能超 metadata 500 字节限制）——**新 constraint**

---

## 4. Webhook 与 payment.service 职责边界

### `webhook.routes.ts`（25 行，纯转发）

```ts
// 全文：
router.post('/stripe', async (req, res) => {
  const signature = req.headers['stripe-signature']
  if (!signature || typeof signature !== 'string') {
    res.status(400).json({ error: 'Missing stripe-signature header' }); return
  }
  try {
    const eventType = await handleWebhookEvent(req.body as Buffer, signature)
    res.json({ received: true })
  } catch (err) {
    logger.error({ err }, 'stripe webhook verification failed')
    res.status(400).json({ error: 'Webhook verification failed' })
  }
})
```

**grep 验证**：
- `submitDraft` / `orderRepo` / `sessionRepo` / `JsonStore` / `emit(` 在 webhook.routes.ts 内 = **0 匹配**
- 所有业务逻辑在 `payment.service.ts:handleWebhookEvent`

### 当前 webhook 职责（payment.service.ts:161-291）

1. **Verify signature** (line 170)
2. **event.type === 'payment_intent.succeeded'** 分派：
   - **`type === 'session-payment'`** 分支（line 177-229）：`addPayment(storeId, sessionId, amount, paidBy, pi.id, tip, itemKeys, percent)` → 可能 refund（超额自动退）→ emit `session:summary/store:orders/store:tables` → `paymentStore.update({method:'stripe'})` → `invalidateConflictingSplits`
   - **pay-first** 分支（line 231-287）：**从 metadata 重建 cart → `createOrder` → `orderStore.update({isPaid:true})` → `addPayment`** → emit

### R-X1 version 校验的自然位置

**两个候选位点**：

- **create-time 防御**（`createPaymentIntent` 里）：读当前 draft.version → 存入 metadata.draftVersion。若重复 createPaymentIntent（并发 race）→ 后来的读到更新 version → 旧的 PaymentIntent 潜在过期
- **webhook-time 校验**（`handleWebhookEvent` 里）：读 metadata.draftVersion → grep draft 当前 version → 不一致则 refund + 通知前端

**路径 X（D58）语义下**：webhook 不是 `createOrder` 而是 `submitDraft(draftId, expectedVersion)`——version 校验**天然在 submitDraft 内做**（`orderRepo.submitDraft` 已带 expectedVersion 参数，mismatch 抛 `OPTIMISTIC_LOCK_CONFLICT`）。

**问题**：orderRepo.submitDraft(draftId, expectedVersion) mismatch 后**不能直接拒绝付款**（Stripe 已扣钱）——必须**refund + alert**。这是 Phase G Task 36 需明确的失败恢复语义。

---

## 5. 🔴 payment 域 legacy itemKey 依赖（**二次 itemKey 风险首发信号**）

### grep 命令

```bash
grep -rnE "itemKey|split\(':'\)" server/src/controllers/*payment* server/src/routes/*payment* server/src/routes/*webhook*
```

### 完整输出

**`payment.service.ts`**（4 处）：
- 101：`itemKeys?: string[]` (SessionCheckoutRequest 字段)
- 145：`...(req.itemKeys ? { itemKeys: JSON.stringify(req.itemKeys) } : {})` (metadata 写入)
- 180-181：webhook parse `pi.metadata.itemKeys` → `JSON.parse(...) as string[]`
- 186-189：`addPayment(..., webhookItemKeys, webhookPercent)` 传递

**`session-payment.ts`**（**12 处，深度最大**）：
- 27：`itemKeys?: string[]` (addPayment 签名参数)
- 53-56：`resolvedItemKeys = itemKeys && itemKeys.length > 0 ? itemKeys : FIFO-derive`
- 65：构造 payment object 写 `itemKeys` 字段
- 74-77：根据 itemKeys 存在性决定 settlement mode
- 108, 112：`confirmItemPayment(sessionId, itemKeys)` 签名
- 128, 131：deprecated `confirmItemPayment` 的 JSDoc
- 142-151：`target.itemKeys` 读取 + `paymentStore.update(..., { itemKeys })` 写入
- 156：`logger.info({ ..., itemKeys })` 审计日志

**`split-bill-payment.service.ts`**（6 处）：
- 8-10：`splitAttribution` helper 拆 SplitBill.itemKeys
- 30, 59, 115：调 `addPayment` 时传 `attribution.itemKeys`

**`payment.routes.ts`**（2 处）：
- 11：route body 解构 `itemKeys`
- 21：转发给 `createPaymentIntentForSession({..., itemKeys})`

**合计：4 文件 / 24+ 处**（如果把 `session-payment.ts:142-156` 的 5 行 itemKeys 操作算一体则 ~20，按独立 grep hit 计 24）。

### 语义分析

这**不是**"个别地方用了 itemKey 字符串"——这是 **legacy 支付 attribution 的核心 API**：

- Request 层：`POST /checkout` 接收 `itemKeys: string[]`
- 服务层：`addPayment` 的 SSOT attribution 逻辑围绕 itemKeys（`session-payment.ts:53-56`）
- 存储层：`Payment.itemKeys: string[]` 字段（`paymentStore.update({itemKeys})`）
- Webhook 层：Stripe metadata 存 `itemKeys JSON string`
- SplitBill 协作：`SplitBill.itemKeys → splitAttribution → addPayment(itemKeys)`

**handoff §1 `legacy-itemkey.ts` 薄兼容层的真正用武之地**就在这里——不是 session-cart 域（已确认 0 依赖），是 payment + split-bill 整条链。

### C4b Task 36 的处理选项（HOLD 讨论点）

- **选项 P1（薄层保持 API contract 兼容）**：
  - `payment.routes.ts` / webhook 继续收发 `itemKeys: string[]`（legacy API 不动）
  - Controller 层入口调 `parseItemKey()`（handoff §1）→ (orderItemId, quantity) 对 → 传 repo
  - Controller 层出口 `formatItemKey()` → 回字符串给前端
  - **工作量中**：薄层 4 文件的 itemKey 操作都用 helper 包
  
- **选项 P2（一次性切 FK 模型 API）**：
  - 前端改发 `paymentItems: [{orderItemId, quantity}]` → 违反 handoff §5d "前端 API 契约不变 D56" 硬约束
  - **违反既定决议**——不选

- **选项 P3（分批切换）**：
  - Task 36 只处理 payment.service.ts 入口（createPaymentIntent metadata 字段）
  - session-payment.ts / split-bill-payment.service.ts 留到 Task 38+
  - **风险**：半状态——addPayment 签名混用 itemKeys string 和 PaymentItem FK

**建议**：**P1（薄层）**——handoff §1 legacy-itemkey.ts 就是为这个设计的。

---

## 6. Phase D 回填候选清单（段 4 新增）

### grep 命令

```bash
grep -nE "^  (find|create|update|confirm|refund)[A-Z]" \
  docs/superpowers/plans/2026-04-17-phase5-postgres-migration/phase-d-repositories.md \
  | grep -A 0 -B 0 "paymentRepo\|Payment"
```

### 当前 paymentRepo 已有方法（Phase D Task 19）

- `findById` / `findBySessionId` / `findByStripeId`
- `create({storeId, sessionId, method, amount, tipAmount, taxAmount, stripePaymentIntentId, status, items: PaymentItemInput[]}, tx)` → **D56 FK 模型**（items 是 `{orderItemId, paidQuantity}[]`）
- `confirmStripe(stripePaymentIntentId, tx)` → `status='pending' → 'confirmed'`
- `sumConfirmed(sessionId, db?)`
- `derivePaidQuantityByOrderItem(sessionId, db?)` → `Map<orderItemId, paidQty>`

### 段 4 Task 36 潜在回填候选

**G4-1（候选）**：`paymentRepo.markMethodStripe(paymentId, tx)` — 对应 legacy `paymentStore.update(id, {method: 'stripe'})`（line 209, 274）

- 简单 single-step write
- **但**：实际可能不需要——`paymentRepo.create` 已接 `method` 参数（构造时传 `method: 'stripe'`）
- **需验证**：legacy 为什么要在 create 之后 update method？看似 race condition 处理（create 时可能不知道是 stripe）——Task 36 实施期决定是否保留该二步模式

**G4-2（候选）**：`paymentRepo.markOrderPaid(orderId, tx)` — 对应 legacy `orderStore.update(id, {isPaid: true, updatedAt})` (line 266, pay-first webhook)

- B2 后 `Order.isPaid` 字段是否保留需决策（`orderRepo.findPaid` 过滤方式改变）
- 或更语义：`orderRepo.markPaid(id, paidAt, tx)` 归 orderRepo

**G4-3（条件触发）**：视 HOLD §3 的 D58 payment 域变体决议——
- 变体 X.1（cartData 保留）：不需要新 repo 方法
- 变体 X.2（metadata 存 draftId+version）：需 `orderRepo.findDraftWithVersion(draftId, expectedVersion, tx)` 或现有 submitDraft 够用
- 变体 X.3（双存）：同 X.2

**累积（含前面段）**：
- 无条件 6 项：G1-1..G1-4 + G2-1 + G2-2（未变）
- 段 4 候选 G4-1 / G4-2（待 Task 36 plan 确认）+ G4-3 条件（待 D58 变体决议）

---

## 7. 小结：C4a 触发的 HOLD 讨论清单

Ian 需要决策 **3 个 hold item** 后 C4b 才能写：

### Hold 1：R-X1 snapshot 和 `pi.metadata.cartData` 的关系

- **方向 A**：扩展 `cartData` → `{cart, version}`
- **方向 B**：新建 `{draftId, version}` pointer（cartData 不再存）
- **方向 C**：双存（兼容过渡期）

### Hold 2：payment 域 24+ itemKey 依赖处理策略

- **P1 薄层保持 API contract（handoff §1 legacy-itemkey.ts 真用场）**（推荐）
- **P2 切 FK 模型 API**（违反 handoff §5d 硬约束，不选）
- **P3 分批切换**（半状态风险）

### Hold 3：D58 路径 X 在 payment 域的落地变体（受 Hold 1 影响）

- **变体 X.1**：保留 `cartData` metadata，webhook `createOrder-from-metadata` 保持
  - 最小改动，但 **违反 B2 "draft in DB" 纯粹性**
  - 场景 d 仍通过（draft 留在 DB + metadata 也有 cartData 备份）
- **变体 X.2**：metadata 只存 `{draftId, version}`，webhook 读 draft 调 `submitDraft(draftId, version)`
  - 最纯 B2，失去离线恢复
  - R-X1 校验在 submitDraft 内 expectedVersion 机制
- **变体 X.3**：双存（cartData + draftId），webhook 优先 submitDraft，失败回退 createOrder-from-metadata
  - 最防御，复杂度高
  - 隐含问题：何为"submitDraft 失败"——draft 已被清/submitted/并发改？

### 建议联合决策

Hold 1 + 3 实际是同一问题两面——选 **X.2** 等于 Hold 1 选 B；选 **X.1** 等于 Hold 1 选 A；选 **X.3** 等于 Hold 1 选 C。

Hold 2 独立，建议 **P1**（符合 handoff §1 设计意图）。

---

## 下一步

**本文件 commit + push** → **汇报 Ian** → 等方向决策：

- **C4b GO**（Ian 给 Hold 1/2/3 决议后）：按决议写 `phase-g-payment-service.md`
- **HOLD 讨论**：Ian 讨论完 Hold items 再 C4b

不自行启动 C4b。

# Phase 5 Plan — Phase G 段 4：`payment.service.ts` B2 适配（Task 36）

> **如何使用本文件**
>
> - 全局规则见 [`00-index.md`](./00-index.md#全局规则所有-task-遵守)
> - 前置：段 1-3 plan 完成（Task 32-35）+ 实施到位（特别是 Phase D Task 19 `paymentRepo` + Task 17 `orderRepo` 含 6 项无条件回填 land）+ Phase B Task 8 `afterCommit` 机制可用
> - 参考：
>   - [`phase-g-section-4-grep.md`](../work-logs/2026-04-18-phase-g-section-4-grep.md) C4a 前置 grep 证据（24+ itemKey 依赖 / pi.metadata.cartData 语义 / webhook 职责边界）
>   - [`phase-g-handoff.md`](../work-logs/2026-04-17-phase-g-handoff.md) §1 `legacy-itemkey.ts` 薄兼容层设计
>   - [`phase-g-session-cart-b2.md`](./phase-g-session-cart-b2.md) §5.2 D58 路径 X 决议（5 条理由）
> - spec 锚点：§9.8 Stage 3c 子任务 4（`payment.service.ts` → `paymentRepo + PaymentItem 关联`）

## 规则 7 段 4 强化条款（Ian 2026-04-18）

1. **D59 / D60 / D61 每条理由必须有依据**——引用 C4a grep 具体行号 / spec 原文 / Stripe 官方文档；**不允许"推断"作为最终理由**
2. **`legacy-itemkey.ts` 的"4 文件 24+ 处"数据必须用 C4a §5 实际 grep 数字**，不允许近似或 round
3. **R-X1 时序图**（metadata → webhook → submitDraft）必须标 `[Task 41 webhook plan 时 final verify]`——不假装本 plan 已覆盖 webhook 细节

违反本条款的写作 → 停下自查修正，不 push。

## 规则 8 段 4 自查记录（写作期）

- ✅ Pending commits 全程 ≤ 1（本 C4b 为唯一 pending，C4a 已落地 `38e198b8`，收尾未启）
- ✅ D59/D60/D61 + D62 候选列清，**无第 4 条派生决策浮现**
- ✅ legacy-itemkey.ts "4 文件 24+ 处"数字全部对齐 C4a §5 实际 grep（见 §5.3 具体分布表）
- ✅ 写作期无 "我假设 webhook 应该 X" 的情况出现（所有 webhook 断言都标 `[Task 41 final verify]`）

## Pending commits 清单（规则 8.1）

- [x] C4a：`phase-g-section-4-grep.md` — commit `38e198b8`
- [ ] **C4b：本文件** `phase-g-payment-service.md`（Task 36 plan + D59/D60/D61 + D62 候选）
- [ ] 收尾 commit：RESUME + 00-index 同步（Task 36 完成后）

---

## Task 36：`payment.service.ts` B2 适配

**Files:**
- Modify: `server/src/controllers/payment.service.ts`（5 处 JsonStore → Prisma + metadata shape 切换 + webhook 重写）
- Modify: `server/src/routes/payment.routes.ts`（itemKey 薄层：parseItemKey 入口 / formatItemKey 出口）
- Create: `server/src/lib/legacy-itemkey.ts`（handoff §1 薄兼容层实际建立，**顶部注释按 D61 修正版**，见 §5.3）
- Create: `server/src/__tests__/payment.service.test.ts`（R-X1 version 校验 + D58 路径 X + refund 路径）

**前置**：
- Phase D Task 19 `paymentRepo` 实施完成（含 `create` 的 D56 FK 模型 `PaymentItem.{orderItemId, paidQuantity}` + `confirmStripe` + `sumConfirmed` + `derivePaidQuantityByOrderItem`）
- Phase D Task 17 `orderRepo` 实施完成 + 6 项无条件回填 land（特别是 G2-1 `findDraftsBySession` + `submitDraft` 的 `expectedVersion` 参数）
- Phase B Task 8 `afterCommit` hook 可用（规则 2 合规）

### Task 完成 5 道门

1. `grep -cE "paymentStore|sessionStore|orderStore|storeStore|tableStore" server/src/controllers/payment.service.ts` = **0**
2. `grep -c "new JsonStore" server/src/controllers/payment.service.ts` = **0**
3. `grep -cE "^\s*emit\(" server/src/controllers/payment.service.ts` = **0**（全部走 `res.locals.afterCommit`）
4. `grep -nE "itemKey" server/src/controllers/payment.service.ts` = **仅在 parseItemKey/formatItemKey 调用点**（D61 强制：service 层无字符串参数，只在 controller 边界）
5. `payment.service.test.ts` 覆盖 R-X1 version mismatch 场景 + D58 路径 X 转换（draft → pending via `submitDraft(draftId, expectedVersion)`）+ webhook refund 路径

---

### 1. 事实核查（引用 C4a grep）

（源：`phase-g-section-4-grep.md`）

- **payment.service.ts 当前结构**（C4a §1）：291 行 / 5 处 JsonStore / 3 个 export function（`createPaymentIntent` pay-first / `createPaymentIntentForSession` pay-later / `handleWebhookEvent`）
- **JsonStore 5 处**（C4a §1 表）：line 6 import / 106 `sessionStore.getById` / 209 `paymentStore.update` / 266 `orderStore.update` / 274 `paymentStore.update`
- **Stripe SDK 调用**（C4a §1）：`paymentIntents.create` (74, 136) + `webhooks.constructEvent` (170) + `refunds.create` (194, 215)
- **metadata 现状**（C4a §3）：pay-first `{storeId, tableId, type, sessionId?, tipAmount?, cartData / cart_* / cartChunks}` / session-payment `{storeId, sessionId, type, paidBy, settlementType?, itemKeys? (JSON string), percent?, tipAmount?}`
- **webhook.routes.ts**（C4a §4）：25 行纯转发，0 业务
- **snapshot/idempotenc/externalRef grep** = **0 直接匹配**（C4a §2）
- **payment 域 itemKey 依赖**（C4a §5）：**4 文件 24+ 处**——具体分布见 §5.3 表

---

### 2. JsonStore → Prisma 切换点枚举（D58 路径 X + D59 pointer metadata）

| C4a grep 行号 | legacy 调用 | 替换为 |
|---|---|---|
| line 6 | `import { orderStore, sessionStore, paymentStore } from '../repositories/stores.js'` | 删除此 import；改 `import { orderRepo, sessionRepo, paymentRepo } from '../repositories/...'` |
| line 106 | `sessionStore.getById(req.sessionId)` | `sessionRepo.findById(req.sessionId, tx)` |
| line 209 | `paymentStore.update(result.payment.id, { method: 'stripe' })` | **`paymentRepo.create` 参数 `method: 'stripe'` 构造时传**——消除二步 update 模式。若现有 `paymentRepo.create` 未含 method 字段，Phase D Task 19 回填（见 §7 G4-1 候选） |
| line 266 | `orderStore.update(result.id, { isPaid: true, updatedAt: ... })` | **替换为 `orderRepo.submitDraft(draftId, expectedVersion, tx)`**（D58 路径 X）——`isPaid` 字段 B2 后由 `status = 'pending'` 派生，不再冗余字段（见 §7 G4-2 候选决议） |
| line 274 | `paymentStore.update(payResult.payment.id, { method: 'stripe' })` | 同 line 209 处理 |

**规则 2 合规**：当前 webhook 内 4 处 `emit(...)`（C4a §4 摘要：line 202/203/205/279/281/282）全部移到 route 层 `res.locals.afterCommit` hook（对齐 Phase E Agent B 的 emit 移动模式）。由于 webhook 是 POST handler 而非 `tenantAwareRoute` 包裹（webhook 不走 tenant context）——需要 **[Task 41 webhook plan 时 final verify]** 确定 `afterCommit` hook 在 webhook route 的适配形态（可能需要 `platformAwareRoute` 或独立 `withPlatformContext` + 手动 hook 管理）。

---

### 3. R-X1 金额漂移 snapshot 实现（D59 + D60 落地）

#### 3.1 PaymentIntent 创建时：metadata = {draftId, version}（D59）

**Pay-first 路径改造**（`createPaymentIntent`）：

```diff
- // Compact cart metadata for Stripe (500 char limit per value) — legacy cartData
- const compactItems = req.items.map(i => ({ m: i.menuItemId, q: i.quantity, r: i.remark, o: ... }))
- const cartData = JSON.stringify({ s: req.storeId, t: req.tableId, i: compactItems, c: req.customerName })
- if (cartData.length <= 500) { metadata.cartData = cartData }
- else { /* chunk into cart_0, cart_1, ... */ }

+ // D59: metadata = pointer to DB draft (SSOT in DB, 非 Stripe metadata)
+ // B2 flow: cart 已经在 DB 里作为 draft Order，metadata 只需引用 draftId + 冻结当时的 version
+ const drafts = await orderRepo.findDraftsBySession(session!.id, tx)  // G2-1 回填依赖
+ // R-X1 前置: 创建 PaymentIntent 时需要确定唯一 draftId 对应唯一 amount
+ // 场景: session 多 device 各自 draft —— 本 checkout 属于哪个 device?
+ // 实施期需确认 (见 §3.3 [ASSUMPTION]):
+ //   A. 如果 checkout flow 是 per-device (前端 cart 页点付款携带 deviceId): metadata.draftId = 该 deviceId 对应 draft
+ //   B. 如果是 per-session (合并所有 device drafts 一次付): 需新 "合并 draft" 概念或多 PaymentIntent
+ const targetDraft = drafts.find(d => d.deviceId === req.deviceId)  // [ASSUMPTION A, needs verification in Phase G implementation]
+ if (!targetDraft) return { error: 'No active draft for this device', status: 400 }
+
+ metadata.draftId = targetDraft.id
+ metadata.draftVersion = String(targetDraft.version)
+ // 不再存 cartData / cart_* / cartChunks —— D59 理由 1: 单一 SSOT
```

**Session-payment 路径改造**（`createPaymentIntentForSession`）：

session-payment 路径**不**涉及 draft order（是对已有 session 的补付），R-X1 不适用。但**itemKey 参数**（C4a §5）必须切 FK 模型——见 §5.2。

#### 3.2 Webhook 时：校验 version（D60）

**Pay-first webhook 分支改造**（line 231-287）：

```diff
- // --- Pay-first: create order from cart metadata --- (legacy)
- let cartDataRaw = pi.metadata.cartData
- if (!cartDataRaw && pi.metadata.cartChunks) { /* reassemble chunks */ }
- const cart = raw.s ? { storeId: raw.s, tableId: raw.t, items: ..., ... } : raw
- const result = createOrder(cart.storeId, { tableId: cart.tableId, items: cart.items, ... })
- orderStore.update(result.id, { isPaid: true, updatedAt: ... })
- addPayment(storeId, sid, pi.amount, cart.customerName || 'customer', pi.id, payFirstTip)

+ // D58 路径 X + D60: metadata 已是 pointer, webhook 只需 submitDraft + payment
+ const draftId = pi.metadata.draftId
+ const expectedVersion = parseInt(pi.metadata.draftVersion, 10)
+ if (!draftId || isNaN(expectedVersion)) {
+   logger.error({ paymentIntentId: pi.id }, 'webhook: missing draftId/draftVersion in metadata')
+   // 无 metadata 指针 → 无法 B2 语义恢复 (D59 理由 2: 离线恢复在 B2 失效)
+   // 全额 refund, 因为没有 B2 路径可走
+   await getStripe().refunds.create({ payment_intent: pi.id })
+   return event.type
+ }
+
+ try {
+   // D58 路径 X: draft → pending via submitDraft (atomic: version check + status flip)
+   // orderRepo.submitDraft 内部校验 expectedVersion, mismatch 抛 OPTIMISTIC_LOCK_CONFLICT
+   const submitted = await orderRepo.submitDraft(draftId, expectedVersion, tx)
+
+   // 记录 payment (D56 FK 模型, paymentRepo.create 的 items 自动填满 draft 的 orderItems)
+   const payment = await paymentRepo.create({
+     storeId, sessionId, method: 'stripe', amount: pi.amount,
+     tipAmount: parseInt(pi.metadata.tipAmount ?? '0', 10),
+     stripePaymentIntentId: pi.id, status: 'confirmed',
+     items: submitted.items.map(oi => ({ orderItemId: oi.id, paidQuantity: oi.quantity })),
+   }, tx)
+
+   // 规则 2: emit via afterCommit (webhook 层的 afterCommit 形态见 §2 末尾 [Task 41 final verify])
+   afterCommit(() => emit({ type: 'order:created', storeId, sessionId, orderId: submitted.id }))
+   afterCommit(() => emit({ type: 'session:summary', storeId, sessionId }))
+   afterCommit(() => emit({ type: 'store:orders', storeId }))
+ } catch (err) {
+   if (err.code === 'OPTIMISTIC_LOCK_CONFLICT') {
+     // D60: version mismatch = cart 在付款中被改
+     // Refund + alert + SSE notify (非重建 PaymentIntent, D60 理由 3/4)
+     await getStripe().refunds.create({ payment_intent: pi.id })
+     logger.warn({ paymentIntentId: pi.id, draftId, expectedVersion }, 'webhook: version mismatch, refunded')
+     afterCommit(() => emit({ type: 'payment_failed_version_mismatch', storeId, sessionId, draftId }))
+   } else {
+     throw err  // 其他错误上抛交 webhook 外层处理
+   }
+ }
```

#### 3.3 [ASSUMPTION] 标注

- `[ASSUMPTION A, needs verification in Phase G implementation]`：本 plan 假设 pay-first checkout flow 是**per-device**（一个 PaymentIntent 对应一个 deviceId 的 draft）——依据：前端现有 `updateSessionCart(storeId, sessionId, deviceId, items)` API contract 表明支付流程在 device 粒度。若实施期发现前端 pay-first 是 "合并所有 device drafts 一次付"，本节需扩展"多 draft 合并"语义（可能需要 G2-1 `findDraftsBySession` 之外新加"合并快照" repo 方法）
- `[Task 41 webhook plan 时 final verify]`：webhook handler 的 `afterCommit` hook 适配（webhook 不走 `tenantAwareRoute`，需 `platformAwareRoute` 或独立机制）

---

### 4. D58 路径 X 时序协调

#### 4.1 `payment.service` 不调 `submitDraft`（保持单一职责）

- `createPaymentIntent` / `createPaymentIntentForSession` **只创建 PaymentIntent**，不翻 draft 状态
- `handleWebhookEvent` 调 `orderRepo.submitDraft`（而不是 legacy `createOrder`）——这是 B2 "draft already in DB, webhook only flips state" 语义的直接体现

#### 4.2 时序图 `[Task 41 webhook plan 时 final verify]`

```
[前端 cart 页] 点付款
 ↓
[client] api.createPaymentIntent(storeId, {tableId, items, deviceId, customerName, tipAmount?})
 ↓
[server payment.service.ts:createPaymentIntent]
  tx: withTenantContext
    sessionRepo.findById → draft = orderRepo.findDraftsBySession (G2-1, 取 deviceId 对应)
    stripe.paymentIntents.create({
      amount: chargeAmount, currency: 'usd',
      metadata: {storeId, tableId, type: 'pay-first', sessionId, deviceId,
                 draftId: draft.id, draftVersion: draft.version, tipAmount?: ...}
    })
  return {clientSecret, amount, subtotal, tax, serviceFee}
 ↓
[client] Stripe.js confirmPayment (用户完成支付 / 取消 / 失败)
 ↓ (success 路径)
[Stripe] webhook → POST /api/webhook/stripe
 ↓
[server payment.service.ts:handleWebhookEvent] payment_intent.succeeded
  tx: [Task 41 webhook plan 决定上下文 - platform? tenant?]
    draftId = pi.metadata.draftId
    expectedVersion = pi.metadata.draftVersion
    try {
      submitted = orderRepo.submitDraft(draftId, expectedVersion, tx)
        // version 校验 atomic 在 repo 内, mismatch 抛 OPTIMISTIC_LOCK_CONFLICT
      paymentRepo.create({..., items: submitted.items → {orderItemId, paidQuantity}}, tx)
    } catch (OPTIMISTIC_LOCK_CONFLICT) {
      stripe.refunds.create({payment_intent: pi.id})  // D60: refund + alert
      afterCommit(emit payment_failed_version_mismatch)
    }
    afterCommit(emit order:created / session:summary / store:orders)

失败路径 (顾客取消 / Stripe 返 failed):
  [Stripe] webhook payment_intent.payment_failed / canceled
  [server] 无动作 —— draft 保持 'draft' 状态, 下次用户回 cart 页仍能看到 (D58 路径 X 场景 d 通过)
```

---

### 5. Legacy itemKey 处理（D61 落地）

#### 5.1 Controller 边界：`parseItemKey` 入口 / `formatItemKey` 出口

**`payment.routes.ts` 改造**（基于 C4a §5 枚举的 line 11, 21）：

```diff
// POST /stores/:storeId/session-payment route handler
 router.post('/session-payment', tenantAwareRoute(async (req, res) => {
   const { storeId } = req.params
-  const { sessionId, amount, paidBy, tipAmount, settlementType, itemKeys, percent } = req.body
+  const { sessionId, amount, paidBy, tipAmount, settlementType, itemKeys: itemKeyStrings, percent } = req.body
+
+  // D61 入口: parseItemKey 薄层 (handoff §1 设计意图)
+  // itemKeyStrings 是 legacy "orderId:idx:qty" 字符串数组
+  // 转成 FK 模型数组 {orderItemId, quantity} 传入 service 层
+  const paymentItems = itemKeyStrings && itemKeyStrings.length > 0
+    ? await Promise.all(itemKeyStrings.map(k => parseItemKey(k, res.locals.tx)))
+    : undefined
+
   const result = await createPaymentIntentForSession({
     storeId, sessionId, amount, paidBy, tipAmount,
-    settlementType, itemKeys, percent,
+    settlementType, paymentItems, percent,  // service 层全 FK
   }, res.locals.tx)
   if ('error' in result) return res.status(result.status ?? 400).json(result)
   res.json(result)
 }))
```

**`payment.service.ts` service 层签名改造**（D61 强制：service 层无 `itemKey: string` 参数）：

```diff
 interface SessionCheckoutRequest {
   storeId: string
   sessionId: string
   amount: number
   paidBy?: string
   tipAmount?: number
   settlementType?: 'by-item' | 'by-percent'
-  itemKeys?: string[]        // ❌ legacy string, D61 禁止在 service 层
+  paymentItems?: { orderItemId: string; quantity: number }[]  // FK 模型
   percent?: number
 }
```

#### 5.2 session-payment.ts / split-bill-payment.service.ts / settlement actions 连锁改造

**Task 36 范围内**：只动 `payment.service.ts` + `payment.routes.ts` 边界薄层。`session-payment.ts` 的 `addPayment` 签名改 FK 模型、`split-bill-payment.service.ts` 的 attribution helper 改 FK——**归属 Task 37-38（下个 session）**，本 task 不扩散。

**过渡期风险（规则 8 提示）**：Task 36 land 后、Task 37 未 land 时——`payment.service.ts` 的 service 层是 FK 模型，但调用下游 `addPayment(...)` 仍接 `itemKeys: string[]`。**接口错位需要临时适配**：

```ts
// Task 36 临时: service 层用 FK, 但 addPayment 仍是 legacy 签名
// 不 recommended, 只作为 Task 36-37 间过渡期方案
const legacyItemKeys = paymentItems
  ? paymentItems.map(pi => formatItemKey(pi.orderItemId, pi.quantity, orderItemsContext))
  : undefined
addPayment(storeId, sessionId, amount, paidBy, pi.id, tipAmount, legacyItemKeys, percent)
```

这是半状态——建议 Task 37 紧跟 Task 36（不留过渡期），避免 FK↔string 双向转换的混乱。Ian 本 session 约定 Task 37-38 下 session——**过渡期不可避免**，本 plan 明示标注。

#### 5.3 `legacy-itemkey.ts` 顶部注释修正（基于 D61 的真实体量）

**上 session 3d 讨论基础**（handoff §5d 原注释，~50 行 shim 估计）：

```ts
// EXIT CONDITION: 当 /api/*/payment 和 /api/*/split-bill 的请求体
// 改用 { orderItemId, quantity } 替代 itemKey 字符串时删除本文件。
// 目前前端 API 契约不变（D56），本文件无退场时间表。
// 如需退场，搜索所有调用 parseItemKey / formatItemKey 的 controller 文件。
```

**本 session C4a §5 grep 证据**：真实分布是 **4 文件 24+ 调用点**（不是"个别点"），退场规模是**独立 phase 级重构**——Ian D61 决议要求替换注释反映真实体量。

**修正版注释**（Task 36 实施创建 `legacy-itemkey.ts` 时**顶部字面照抄**，替换 handoff §5d 原 exit condition）：

```ts
// EXIT CONDITION: 当 /api/*/payment 和 /api/*/split-bill 的请求体
// 改用 { orderItemId, quantity } 替代 itemKey 字符串时删除本文件。
//
// 真实体量：4 文件 24+ 调用点（截至 2026-04-17 Phase G C4a grep）：
//   - server/src/controllers/session-payment.ts （12 处，最深——addPayment/
//     confirmItemPayment 整个模块围绕 itemKeys 做 attribution）
//   - server/src/controllers/split-bill-payment.service.ts （6 处——
//     splitAttribution helper + addPayment 调用链）
//   - server/src/controllers/payment.service.ts （4 处——CheckoutRequest.itemKeys
//     字段 + PaymentIntent metadata.itemKeys + webhook parse）
//   - server/src/routes/payment.routes.ts （2 处——route body 解构 + 转发）
// 退场规模 = 独立 phase 级重构，不是"删除一个文件"的随手工作。
//
// 目前前端 API 契约不变（D56），本文件无退场时间表。
// 如需退场，搜索所有调用 parseItemKey / formatItemKey 的 controller 文件
// 并重构其对应 service 层方法签名。
```

**规则 7 强化核查**：4 文件 + 分布数字直接取自 C4a §5 原始 grep（payment.service.ts 4 / session-payment.ts 12 / split-bill-payment.service.ts 6 / payment.routes.ts 2 = 24）——**不近似、不 round**。总 24 处是 C4a "24+" 字面下界。

---

### 6. 决策小节（D59 / D60 / D61）

#### D59：PaymentIntent.metadata SSOT 模型

**决议**（2026-04-18 Ian 拍板）：metadata 存 `{draftId, version}` 指针，**不存 cartData 快照**。

**5 条理由（仿 D58 格式，每条带依据）**：

1. **设计意图纯粹**——D58 路径 X（commit `ccf7fce8` §5.2）语义是"draft 就是 cart，webhook 只 flip state"。若 metadata 存 cartData 则 DB draft 和 Stripe metadata 成**双 SSOT**，引入"哪个是真相"问题。**依据**：D58 决议 5 条理由之第 2 条"schema 沉淀债 vs 应用层复杂度不对称"的延伸——多 SSOT 是沉淀债
2. **X.1 的"离线恢复能力"在 B2 下实际失效**——B2 后 webhook `submitDraft(draftId, expectedVersion)` 要求 draftId 存在；DB 丢 draft row 时即使拿 cartData 也无处可用（B2 无 `createOrder-from-metadata` 入口，那是 legacy 独有）。保留 X.1 = 保留跑不到的 dead code。**依据**：C4a §1 grep 证实 legacy webhook line 231-287 是 `createOrder(cart)` 路径，B2 路径 X 不复用此入口
3. **Stripe metadata 不是可靠恢复源**——字段 500 字符限制 per key、总计 8KB（参考 legacy `cart_0/cart_1/cartChunks` 分 chunk 机制暗示超限场景）。大量 items / 长商品名场景存不下。"恢复能力"只在小 cart 成立。**依据**：C4a §1 payment.service.ts:49-72 分 chunk 代码是 500 限制的直接应对
4. **Webhook retry ≠ metadata 恢复**——Stripe webhook retry 处理"endpoint 暂时 down"场景（HTTP 5xx 重试），**不**处理"DB 丢 draft row"场景。后者正解是 pg_dump 备份。**依据**：Phase A-1 plan (`phase-a-backup.md`) 已设计 EC2 每日 pg_dump → S3 的备份机制，承担 DB 恢复职责
5. **R-X1 version 校验天然封装**——`orderRepo.submitDraft(draftId, expectedVersion, tx)` 内部做 `WHERE id=? AND version=? AND status='draft'` 原子检查，mismatch 抛 `OPTIMISTIC_LOCK_CONFLICT`。payment service 层**无需重建 PaymentIntent**，只 refund + alert。**依据**：Phase D Task 17 `phase-d-repositories.md` orderRepo.submitDraft 签名明确含 `expectedVersion: number` 参数 + throws OPTIMISTIC_LOCK_CONFLICT 语义

#### D60：R-X1 金额漂移处理策略

**决议**：webhook 时 `expectedVersion` 校验（而非 PaymentIntent 创建时），mismatch → **refund + alert**，**不重建 PaymentIntent**。

**4 条理由**：

1. **PaymentIntent 创建时校验无意义**——那时 `draft.version` 就是当前 version，天然一致。要在"创建 → 支付完成"窗口捕捉 cart 变化才有价值，**只有 webhook 时才能观察到窗口末端的 version**。**依据**：Stripe 文档 [PaymentIntents lifecycle](https://stripe.com/docs/payments/payment-intents/verifying-status) 明确 `payment_intent.succeeded` 是支付完成事件，是"用户已扣钱"的唯一可靠时点
2. **Webhook 时校验捕获"支付中 cart 被改"场景**——R-X1 的 threat model 是"用户点付款 → cart 页没关 → 另 tab 改 cart → Stripe 付款完成时 DB cart 已变"。只有 webhook 这一时点能观察"支付时 vs 支付后"version 差异。**依据**：C4a §3 metadata 字段表——支付过程中 `pi.metadata.draftVersion` 冻结，DB 中 `draft.version` 可继续 bump
3. **Refund + alert 语义简单**——`stripe.refunds.create({payment_intent: pi.id})` 是单 Stripe API，前端通过 SSE 收 `payment_failed_version_mismatch` 刷新 cart 页状态。**依据**：C4a §1 legacy webhook handler 已使用 `stripe.refunds.create` (line 194, 215)——这个 API 在项目内成熟
4. **自动重建 PaymentIntent 引入 Stripe 侧未完成意图悬挂 + 用户多次确认心智负担**——若 webhook 内自动 `paymentIntents.create` 新 intent 就让用户再付一次，需要额外的"重新付款"UX 设计，且 Stripe Dashboard 会遗留多个 PaymentIntent（原 succeeded 但 refunded + 新 requires_payment_method）。**依据**：Stripe Dashboard UX 观察——管理员/support 调查事故时遗留 intents 造成干扰

#### D61：payment 域 legacy itemKey 兼容层深度

**决议**：薄层**严格限制在 controller 边界**。service 层（`session-payment.ts` / `payment.service.ts` / settlement actions）**全部用 FK 模型**（`orderItemId + quantity`），**不允许字符串和 FK 混用**。

**3 条理由**：

1. **双模型混用在代码审查中不可控**——service 层若同时接 `itemKeys: string[]` 和 `paymentItems: FK[]`，或函数内混用，reviewer 无法快速判断"这段逻辑操作的是哪种表示"。规则 7 的 evidence-first 在双模型场景下会退化为双倍 grep 开销。**依据**：C4a §5 `session-payment.ts:53-56` `resolvedItemKeys = itemKeys && itemKeys.length > 0 ? itemKeys : FIFO-derive` 已经在 legacy 里有 "传入 vs 派生"的双路径，再加 FK 就 4 种状态
2. **handoff §1 legacy-itemkey.ts 设计意图明示"1cm 薄层"**——当前设计是 controller 边界一次性转换（入口 parse / 出口 format），而非深入 service 层。若 service 层保留 string 参数等于把薄层"抹厚"到 service 层，handoff §1 设计失效。**依据**：handoff §1 原文"Controller 1cm 薄转换层"
3. **Task 37-38 下 session 执行依赖本约定**——`session-payment.ts addPayment` / `split-bill-payment.service.ts` 的 FK 切换工作量评估（12 + 6 = 18 处）基于"service 层纯 FK"假设。若允许混用，Task 37-38 范围会扩大到"清理混用残留"。**依据**：C4a §5 四文件调用点分布表 + Ian 本 session 明确 "Task 37-38 下 session"

**具体落地**（见 §5.1 改造 diff）：
- Controller 入口：`parseItemKey(body.itemKeys)` → FK 数组 → 传入 service 层
- Service 层：全 FK 模型操作（`PaymentItem.{orderItemId, paidQuantity}` D56 FK model）
- Controller 出口：`formatItemKey(fkData)` → itemKey 字符串 → response body
- **service 层方法签名不得出现 `itemKey: string` 参数**（Task 37-38 同样约束）

**D62 候选（webhook 幂等机制）**：

登记位置：`phase-g-handoff.md` 的 "Phase G Task 41 handoff: D62 候选 webhook 幂等" 小节。
原因：webhook 幂等超出 Task 36 范围，Task 41 webhook plan 时正式决议。
C4a §4 grep 已确认当前 webhook 无显式幂等处理。

---

### 7. Phase D 回填补丁清单（段 1-4 累积）

和 Phase E/F 回填同模式——本 plan 内部消化，等实施阶段集中 land：

| # | 内容 | 段 | 签名 / 说明 |
|---|---|---|---|
| G1-1 | `orderRepo.createSubmitted(input, tx)` | 段 1 / 33-A | staff 开单 bypass draft |
| G1-2 | `orderRepo.updateTableId(id, tableId, tx)` | 段 1 / 33-B | transferOrder 需要 |
| G1-3 | `orderRepo.voidOrderItem(orderId, position, tx)` | 段 1 / 33-C | 单 item void 语义 |
| G1-4 | `orderRepo.countByStore(storeId, tx)` | 段 1 / 33-D | createOrder 序列号 |
| G2-1 | `orderRepo.findDraftsBySession(sessionId, tx)` | 段 2 | **本 Task 36 核心依赖**（§3.1 pay-first metadata 构造 + §4.2 webhook 流程） |
| G2-2 | `orderRepo.deleteDraftsBySession(sessionId, tx)` | 段 2 | clearSessionCart B2 等价 |

**段 4 新增 Task 36 回填候选**：

| # | 内容 | 依据 |
|---|---|---|
| G4-1（候选）| `paymentRepo.create` 参数含 `method: 'stripe'` 构造时传 | §2 表 line 209/274 替代方案——消除二步 update 模式。Phase D Task 19 plan 已含 `method: string` 参数（`phase-d-repositories.md` Task 19 grep 确认），本 candidate **可能已满足**，Task 36 实施时 verify 不必追加 |
| G4-2 | `Order.isPaid` 字段**去除**（B2 后由 `status='pending'` 派生） | §2 line 266 替代决议——`orderRepo.findPaid` 改为 `orderRepo.findSubmitted({ status: 'pending' })`。**触发 Phase B Task 2 schema 调整**（Order 表去除 `isPaid` 字段 + migration），归属 Phase B 回填批次 |
| G4-3 | `paymentRepo.create` 的 `status` 参数实际行为明确 | §3.2 webhook 代码示 `status: 'confirmed'` 直接写入——确认 Phase D Task 19 `create` 接受 `status: 'pending' \| 'confirmed'` 两态。若现有 plan 只含 `'pending'` 创建 + `confirmStripe` 翻态，则 webhook 应拆 2 步（create pending + confirmStripe）——Task 36 实施时对齐现有 repo 方法语义 |

**累积状态**：
- 无条件 6 项：G1-1..G1-4 + G2-1 + G2-2（未变）
- 段 4 新增 3 项：G4-1（候选，可能已满足）/ G4-2（Phase B schema 调整）/ G4-3（实施时对齐语义）
- D58 选 X 取消：G2-3 / G2-4（已记录在段 2 plan `ccf7fce8` §5.2）

---

### 8. 测试：`payment.service.test.ts`

**业务语义 case**（对齐 Phase E/G 测试策略，5 业务 case + 1 RLS smoke）：

1. **pay-first PaymentIntent 创建 → metadata 含 draftId + draftVersion**（非 cartData）——D59 实证
2. **webhook 成功路径 → submitDraft 翻 draft → pending**（D58 路径 X + D60 version 校验通过）
3. **webhook version mismatch → refund + SSE payment_failed_version_mismatch**（D60 失败路径）
4. **webhook missing metadata draftId → refund**（D59 理由 2 的 dead-code 防御）
5. **itemKey parseItemKey / formatItemKey 往返**（D61 controller 边界转换正确性，string → FK → string 不丢信息）
6. **RLS smoke**：tenant A 的 PaymentIntent webhook 不影响 tenant B 的 order 表

---

### 9. 实施 Step（Task 36 实施期指引）

- **Step 1**：grep 基线复核（C4a 数字：5 JsonStore / 24+ itemKey / 0 snapshot）
- **Step 2**：创建 `server/src/lib/legacy-itemkey.ts`（handoff §1 parseItemKey + formatItemKey），**顶部注释用 §5.3 修正版**
- **Step 3**：`payment.service.ts` `createPaymentIntent` 改造（§3.1 pay-first metadata pointer）
- **Step 4**：`payment.service.ts` `handleWebhookEvent` pay-first 分支改造（§3.2 submitDraft + version 校验 + refund）
- **Step 5**：`payment.service.ts` `createPaymentIntentForSession` service 层签名改 FK（§5.1）
- **Step 6**：`payment.routes.ts` controller 边界 parseItemKey / formatItemKey（§5.1）
- **Step 7**：session-payment.ts 过渡期适配（§5.2 临时 FK→string 转换，若 Task 37 不跟紧则保留）
- **Step 8**：`__tests__/payment.service.test.ts` 6 case
- **Step 9**：verify（5 道门）+ commit

### 10. commit（本 plan 落地）

本文件 commit 命令见 C4b commit 策略（单 commit push `plan(phase-g): section 4 Task 36 - payment.service B2 with D59/D60/D61 decisions`）。

# Phase 5 Plan — Phase G 段 6:split-bill 域 4 文件 B2 重构(Task 38 part 2 / C6b2)

> **如何使用本文件**
>
> - 全局规则见 [`00-index.md`](./00-index.md#全局规则所有-task-遵守)
> - 前置:Task 37 全 land(C5b1 + C5b2)+ Task 38 C6b1 land(actions signature FK + rules.ts 改造)
> - 参考:
>   - [`phase-g-section-6a-grep.md`](../work-logs/2026-04-18-phase-g-section-6a-grep.md) C6a 前置 grep 证据
>   - [`phase-g-settlement-actions.md`](./phase-g-settlement-actions.md) C6b1 §4 跨 task 耦合网 + §6 split-bill-summary:53 归属判定 + §8 C6b2 范围预告
>   - [`phase-g-settlement-gateway.md`](./phase-g-settlement-gateway.md) C5b1 §6 handoff §2 11 处归属表
>   - [`phase-g-settlement-gateway-part2.md`](./phase-g-settlement-gateway-part2.md) C5b2 §3 derivePaidState FK 切换清单
> - spec 锚点:§9.8 Stage 3c 子任务 6 延伸

---

## 范围声明(Part 2 / 2)

本 plan 是 **Task 38 拆分后的 Part 2(C6b2)**,与 C6b1 同 Task 38 物理拆分(独立文件,先例:`phase-g-settlement-gateway-part2.md`)。

- **C6b2(本文件)范围**:split-bill 4 文件深度改造
  - `server/src/controllers/split-bill.service.ts`(152 行,核心)
  - `server/src/controllers/split-bill-invalidation.ts`(72 行)
  - `server/src/controllers/split-bill-summary.ts`(74 行)
  - `server/src/controllers/split-bill-payment.service.ts`(131 行,含 manual capture deferred)
- **改造点**:5 处 `.split(':')` 消除(handoff §2 归 C6b2 的 5 处)+ 29 JsonStore → Prisma + FK signature 传染(从 actions C6b1 延续)
- **D63 落地**:消费方切 `paidItems: { orderItemId, paidQty }[]`(derivePaidState 已 C5b2 FK)+ `buildAssignedQtyMap` Key 切 orderItemId
- **不在 C6b2 范围**:Task 39+(webhook plan / session-payment 收尾)/ Task 42(session-settlement 非 derivePaidState 部分)

---

## 规则 7 段 6 part 2 强化条款

1. **每个 D58-D63 在 split-bill 域成立性断言必须有 grep / C5b1 D63 settlement 域推论引用**——不外推
2. **5 处 `.split(':')` 消除路径必须对齐 C5b1 §6 表 + C6a §4.1 行号**——不凭印象
3. **FK signature 传染每处假设必须有 actions C6b1 §2 先例对照**——不另起设计
4. **manual capture PI metadata 独立 lifecycle 声明必须明示非 D59 适用域**——不混淆 D59 决议范围

违反本条款的写作 → 停下自查修正,不 push。

## 规则 8 段 6 part 2 自查记录

- ✅ Pending commits 全程 ≤ 1(本 C6b2 为唯一 pending,C6b1 已落地 `e52342f5`)
- ✅ 未触发严格信号:无 D64+ 新决议候选 / 无 B2 语义重构(invalidation 冲突检测 FK 化是机械替换)/ Phase D 回填候选在既定清单扩展内
- ✅ manual capture metadata 独立 lifecycle 已声明,与 D59 不混淆
- ✅ FK signature 传染对齐 C6b1 §2 先例(actions 层 paymentItems FK)

## Pending commits 清单(规则 8.1 严格定义:本 session 未 commit 产出)

- [x] C6a:`70a2eaee`
- [x] C6b1:`e52342f5`
- [ ] **C6b2:本文件**(Task 38 part 2)

(收尾 commit / Task 39+ 属未来产出规划,不计 pending)

---

## Task 38 part 2:split-bill 4 文件深度改造

**Files (C6b2 范围)**:
- Modify: `server/src/controllers/split-bill.service.ts`
- Modify: `server/src/controllers/split-bill-invalidation.ts`
- Modify: `server/src/controllers/split-bill-summary.ts`
- Modify: `server/src/controllers/split-bill-payment.service.ts`
- Modify: `server/src/__tests__/split-billing-integration.test.ts`(测试更新,FK signature 传染)

**前置**:
- Task 37 C5b2 land(derivePaidState FK + 11 调用方原子切完成)
- Task 38 C6b1 land(actions signature FK + checkPaymentItems + rules.ts orderRepo)
- Phase D Task 19 `paymentRepo` + Task 20 `splitBillRepo` 实施完成

### Task 完成 5 道门(C6b2 部分)

1. `grep -rn "split(':')" server/src/controllers/split-bill*.ts server/src/settlement/rules.ts` = **0**(C6b1 + C6b2 共消除 6 处:rules:46 + split-bill.service:48/144 + split-bill-invalidation:37 + split-bill-summary:53)
2. `grep -rn "paidItemIds" server/src/controllers/split-bill*.ts` = **0**(全部消费 paidItems FK 模型)
3. `grep -cE "(splitBillStore|sessionStore|orderStore|storeStore|paymentStore)" server/src/controllers/split-bill*.ts` = **0**(29 JsonStore 全切 Repo)
4. `grep -nE "itemKeys?\s*:\s*string\[\]" server/src/controllers/split-bill*.ts` = **0**(string itemKey signature 全消除)
5. `tsc -b` 全通过(actions C6b1 调用端 + split-bill C6b2 service 端 + Task 42 session.service 端三方 FK signature 对齐 → 原子 deploy)

---

### 1. 事实核查(引用 C6a + C6b1)

**C6a §1 数据**:split-bill 4 文件 + rules.ts 共 544 行(本 plan 涉 4 文件 = 429 行,排除 rules.ts 115 行 C6b1 已处理)

**C6a §3 JsonStore 调用分布**(C6b2 范围):
- split-bill.service: 9 处(splitBillStore × 4 / sessionStore × 2 / orderStore × 1 / storeStore × 2)
- split-bill-invalidation: 3 处(sessionStore × 1 / splitBillStore × 2)
- split-bill-summary: 4 处(sessionStore × 1 / orderStore × 2 / storeStore × 1)
- split-bill-payment.service: 12 处(splitBillStore × 8 / paymentStore × 1 / sessionStore × 1 + 2 stripe.paymentIntents async 调用)
- **C6b2 总计 28 处 JsonStore**(C6a §3 总 29 - rules.ts 1 = 28,核对一致)

**C6a §4.1 itemKey 在 C6b2 范围分布**:
- 解析型 .split(':'):5 处(split-bill.service:48/144 + split-bill-invalidation:37 + split-bill-summary:53 —— 注:C6a §4.1 列 7 处含 split-bill.service:42 / split-bill-invalidation:22 已 Task 37 C5b2 消除)
- 透传型 signature/arg:13 处(split-bill.service 3 + split-bill-invalidation 3 + split-bill-summary 1 + split-bill-payment.service 6)

---

### 2. 4 文件深度改造

#### 2.1 split-bill.service.ts(152 行,核心)

**改造点**:
- `createSplitBill` signature FK + 内部 `data.itemKeys` 改 `data.paymentItems`
- `data.itemKeys` 解析(line 47-61)→ FK 直接读 OrderItem(消除 .split(':') line 48)
- `buildAssignedQtyMap` Key 切 orderItemId(消除 .split(':') line 144)
- 9 JsonStore 切 Repo(splitBillRepo / sessionRepo / orderRepo / storeRepo)
- `splitBillStore.create(splitBill)` → `splitBillRepo.create(splitBill, tx)`(D56 SplitBillItem FK 模型)
- async + tx 化(签名传染:caller actions C6b1 + gateway C5b1 已 async)

**关键 diff**(由 string 字段 → FK 字段):

```diff
 export async function createSplitBill(
   storeId: string, sessionId: string,
-  data: { type: 'by-item' | 'by-percent'; itemKeys?: string[]; percent?: number; label?: string },
+  data: {
+    type: 'by-item' | 'by-percent';
+    paymentItems?: { orderItemId: string; quantity: number }[];
+    percent?: number; label?: string
+  },
+  tx: Prisma.TransactionClient,
 ): Promise<SplitBill | { error: string }> {
   ...
   if (data.type === 'by-item') {
-    const { paidItemIds } = derivePaidState(sessionId)
-    const paidQtyMap = new Map<string, number>()
-    for (const pid of paidItemIds) { ... .split(':') ... }
-    for (const key of data.itemKeys ?? []) {
-      const parts = key.split(':')
-      ...
-    }
+    const { paidItems } = await derivePaidState(sessionId, tx)
+    const paidQtyMap = new Map<string, number>(paidItems.map(p => [p.orderItemId, p.paidQty]))
+    for (const pi of data.paymentItems ?? []) {
+      const item = await orderRepo.findOrderItem(pi.orderItemId, tx)
+      const paidQty = paidQtyMap.get(pi.orderItemId) ?? 0
+      const assignedQty = (await buildAssignedQtyMap(await getSplitBills(sessionId, tx))).get(pi.orderItemId) ?? 0
+      const available = (item?.quantity ?? 0) - paidQty - assignedQty
+      if (available < pi.quantity) return { error: `Item ${pi.orderItemId} has insufficient unpaid quantity (available: ${available})` }
+    }
   }
```

**SplitBillItem 模型**:`splitBillRepo.create` 接 D56 FK 模型 `{ orderItemId, quantity }[]`(对齐 PaymentItem FK 模型)。

#### 2.2 split-bill-invalidation.ts(72 行)

**改造点**:
- 消费 derivePaidState 切 paidItems(line 19 已 Task 37 C5b2 切)
- `sb.itemKeys` overlap 检测(line 35-44)→ FK orderItemId overlap(消除 .split(':') line 37)
- 3 JsonStore 切 Repo
- async + tx
- `invalidateConflictingSplits` signature 改 async + tx(caller payment.service:222 已 Task 36 async)

**关键 diff**:

```diff
-export function invalidateConflictingSplits(sessionId: string, storeId: string): number {
+export async function invalidateConflictingSplits(
+  sessionId: string, storeId: string, tx: Prisma.TransactionClient,
+): Promise<number> {
   const splits = await getSplitBills(sessionId, tx)
-  const session = sessionStore.getById(sessionId)
+  const session = await sessionRepo.findById(sessionId, tx)
   ...
-  const { paidItemIds } = derivePaidState(sessionId)
-  const paidQtyMap = new Map<string, number>()
-  for (const pid of paidItemIds) { ... .split(':') ... }
+  const { paidItems } = await derivePaidState(sessionId, tx)
+  const paidOrderItemSet = new Set(paidItems.map(p => p.orderItemId))
   ...
   for (const sb of splits) {
     if (sb.type === 'by-item' && sb.items) {  // sb.items: SplitBillItem[]
-      for (const key of sb.itemKeys) {
-        const parts = key.split(':')
-        const baseKey = `${parts[0]}:${parts[1]}`
-        if (paidQtyMap.has(baseKey)) { conflict = true; reason = '...'; break }
+      for (const sbItem of sb.items) {
+        if (paidOrderItemSet.has(sbItem.orderItemId)) { conflict = true; reason = 'item overlap with paid items'; break }
       }
     }
   }
```

**B2 语义保持**(规则 7 自查):"by-item: delete if any items overlap with newly paid" 语义不变,只是比较从字符串 baseKey → orderItemId FK。**不是 B2 语义重构**(交接包警告区已确认)。

#### 2.3 split-bill-summary.ts(74 行)

**改造点**:
- `getMainBillSummary` 接 tx + async,内部 4 JsonStore 切 Repo
- `assignedQty` Map<string,number> → Map<orderItemId,number>(line 14 + 23)
- `calcByItemSubtotal` signature 改 paymentItems FK + 消除 .split(':') line 53

**关键 diff**(`calcByItemSubtotal`):

```diff
 export async function calcByItemSubtotal(
   orderIds: string[], sessionId: string,
-  itemKeys: string[],
+  paymentItems: { orderItemId: string; quantity?: number }[],
+  tx: Prisma.TransactionClient,
-): { subtotal: number } | { error: string } {
+): Promise<{ subtotal: number } | { error: string }> {
-  const assignedQty = buildAssignedQtyMap(getSplitBills(sessionId))
+  const assignedQty = await buildAssignedQtyMap(await getSplitBills(sessionId, tx))

   let subtotal = 0
-  for (const key of itemKeys) {
-    const parts = key.split(':')
-    const orderId = parts[0]
-    const idx = parseInt(parts[1], 10)
-    const qty = parts.length >= 3 ? parseInt(parts[2], 10) : undefined
-    const order = orderStore.getById(orderId)
-    if (!order || !orderIds.includes(orderId)) return { error: `Order ${orderId} not found` }
-    const item = order.items[idx]
+  for (const pi of paymentItems) {
+    const item = await orderRepo.findOrderItem(pi.orderItemId, tx)
+    if (!item || !orderIds.includes(item.orderId)) return { error: `Item ${pi.orderItemId} not found` }
     ...
-    const baseKey = `${orderId}:${idx}`
-    const alreadyAssigned = assignedQty.get(baseKey) ?? 0
+    const alreadyAssigned = assignedQty.get(pi.orderItemId) ?? 0
     const remaining = item.quantity - alreadyAssigned
-    const assignQty = qty != null ? Math.min(qty, remaining) : remaining
+    const assignQty = pi.quantity != null ? Math.min(pi.quantity, remaining) : remaining
     ...
   }
```

#### 2.4 split-bill-payment.service.ts(131 行,含 manual capture deferred)

**改造点**:
- `splitAttribution` helper signature FK(`{ paymentItems?: FK[], percent?: number }`,对齐 §4 FK 传染)
- `paySplitBillCard` / `paySplitBillCash` async + tx,12 JsonStore 切 Repo
- `addPayment` 调用 signature FK(传 `attribution.paymentItems` 不传 itemKeys —— 依赖 Task 42 addPayment 改 FK)
- `captureSplitBillPayment` 同模式(manual capture,Phase 2.5 deferred 路径,本 plan 实现 FK 切换但不 deep dive)

**manual capture PI metadata 独立 lifecycle 声明**:

```ts
// split-bill-payment.service.ts:82-86
const pi = await stripe.paymentIntents.create({
  amount: holdAmount, currency: 'usd',
  capture_method: 'manual',
  metadata: { splitBillId, sessionId: sb.sessionId, storeId },
})
```

**与 D59 区别**:
- **D59 适用域**:pay-first cart checkout(metadata = `{draftId, draftVersion}` cart pointer)
- **manual capture metadata 独立 lifecycle**:`{splitBillId, sessionId, storeId}` —— SplitBill 是已存在的 unpaid 实体(无 draft 状态),metadata 是 splitBill 标识符 + 上下文,**不是 cart pointer**
- **不需 D64 新决议**:manual capture 的 PaymentIntent → SplitBill 关联通过 `splitBillStore.update({paymentIntentId})`(line 88-90),已有简单关系,不需要 D59 类型的 expectedVersion 校验
- **Phase 2.5 deferred**:manual capture 路径整体在 Phase 2.5 deferred(C6a §5.2 + 当前代码 line 110-111 注释证实),C6b2 仅做 FK 机械化切换,不重新设计

**关键 diff**(`splitAttribution`):

```diff
-function splitAttribution(sb: SplitBill): { itemKeys?: string[]; percent?: number } {
-  if (sb.type === 'by-item') return { itemKeys: sb.itemKeys }
-  if (sb.type === 'by-percent') return { percent: sb.percent }
-  return {}
-}
+function splitAttribution(sb: SplitBill): { paymentItems?: { orderItemId: string; quantity: number }[]; percent?: number } {
+  if (sb.type === 'by-item') return { paymentItems: sb.items?.map(i => ({ orderItemId: i.orderItemId, quantity: i.quantity })) }
+  if (sb.type === 'by-percent') return { percent: sb.percent }
+  return {}
+}
```

---

### 3. handoff §2 5 处 `.split(':')` 消除清单

对齐 C5b1 §6 表(归 C6b2 的 5 处)+ C6a §4.1 行号修正:

| C5b1 §6 # | 文件 | 行号(C6a 修正) | C6b2 改造小节 |
|---|---|---|---|
| #7 | split-bill.service.ts | 48 | §2.1 createSplitBill 内 data.paymentItems FK |
| #8 | split-bill.service.ts | 144 | §2.1 buildAssignedQtyMap Key orderItemId |
| #10 | split-bill-invalidation.ts | 37 | §2.2 sb.items overlap 检测 FK |
| (handoff 原列) | split-bill-summary.ts | 53 | §2.3 calcByItemSubtotal paymentItems FK |
| (handoff 原列) | rules.ts | 46 | **C6b1 §3 已消除**(本 plan 不再处理,标记交叉引用) |

**C6b2 内消除 4 处**(#7 / #8 / #10 + summary:53)+ **C6b1 已消除 1 处**(rules:46)= handoff §2 归 C6b2 的 5 处全闭合。

**最终验证**(C6b2 完成后):

```bash
$ grep -rn "split(':')" server/src/
# 期望: 仅 server/src/lib/legacy-itemkey.ts 内部保留 1 处 (D56 入口转换,handoff §1 设计)
```

---

### 4. FK signature 传染处理

**从 actions C6b1 延续**(C6b1 §5.1 stable / unstable 分类):

| 函数 | C6b1 端 signature | C6b2 端 signature | Task 42 端 signature | 原子 commit 协调 |
|---|---|---|---|---|
| `createSplitBill` | actions create-split.ts 调 paymentItems FK(C6b1 §2.1) | **C6b2 §2.1 service 端 paymentItems FK** | — | C6b1 + C6b2 原子 |
| `payByItems` | actions pay-items.ts 调 paymentItems FK(C6b1 §2.2) | — | **Task 42 session.service 端 paymentItems FK** | C6b1 + Task 42 原子 |
| `paySplitBillCard/Cash` | actions pay-split.ts 不变(C6b1 §2.3 typecheck 传染) | **C6b2 §2.4 service 端 async + tx**(signature 主体不变,新增 tx 参数) | — | C6b1 + C6b2 原子(若 C6b2 加 tx,actions 需同步加) |
| `invalidateConflictingSplits` | — | **C6b2 §2.2 async + tx** | payment.service:222 caller 已 Task 36 async | Task 36 + C6b2 原子(已就绪) |
| `getMainBillSummary` / `calcByItemSubtotal` | — | **C6b2 §2.3 async + tx + paymentItems FK** | gateway.ts caller 已 C5b1 async | C5b1 + C6b2 原子(已就绪) |

**协调建议**:C6b1 + C6b2 + Task 42 三方原子 land(减少 typecheck unstable 期 + shim 债务)。**[ASSUMPTION,needs final decision at Task 38/42 implementation]**:具体 land 顺序由 Ian 实施期判。

---

### 5. JsonStore → Prisma 28 处切换枚举

| 文件 | C6a 行号 | legacy 调用 | 替换为 |
|---|---|---|---|
| split-bill.service | 18 | `splitBillStore.getByField('sessionId', sessionId)` | `splitBillRepo.findBySessionId(sessionId, tx)` |
| split-bill.service | 28 | `sessionStore.getById(sessionId)` | `sessionRepo.findById(sessionId, tx)` |
| split-bill.service | 54 | `orderStore.getById(orderId)`(in by-item 字符串解析,§2.1 改造后用 `orderRepo.findOrderItem(pi.orderItemId, tx)` 替代,本行删除) | (删) |
| split-bill.service | 76 / 85 | `storeStore.getById(storeId)` × 2 | `storeRepo.findById(storeId, tx)` × 2 |
| split-bill.service | 110 | `splitBillStore.create(splitBill)` | `splitBillRepo.create({ ...splitBill, items: paymentItems → SplitBillItem[] }, tx)`(D56 FK) |
| split-bill.service | 113 | `sessionStore.update(sessionId, { settlementMode })` | `sessionRepo.update(sessionId, { settlementMode }, tx)` |
| split-bill.service | 126 / 129 | `splitBillStore.getById/delete` | `splitBillRepo.findById/delete` |
| split-bill-invalidation | 16 | `sessionStore.getById` | `sessionRepo.findById(_, tx)` |
| split-bill-invalidation | 61 | `splitBillStore.delete(sb.id)` | `splitBillRepo.delete(sb.id, tx)` |
| split-bill-summary | 7 | `sessionStore.getById` | `sessionRepo.findById(_, tx)` |
| split-bill-summary | 11 | `session.orderIds.map(orderStore.getById)` | `await Promise.all(session.orderIds.map(id => orderRepo.findById(id, tx)))` |
| split-bill-summary | 38 | `storeStore.getById(storeId)` | `storeRepo.findById(_, tx)` |
| split-bill-summary | 58 | `orderStore.getById(orderId)`(in §2.3 改造后用 orderRepo.findOrderItem 替代) | (删) |
| split-bill-payment | 21 / 38 / 48 / 68 / 76 / 88 / 98 / 119 / 130 | `splitBillStore.getById/update` × 9 | `splitBillRepo.findById/update(_, tx)` × 9 |
| split-bill-payment | 63 | `paymentStore.update(payResult.payment.id, { method: 'cash' })` | `paymentRepo.update(_, { method: 'cash' }, tx)` |
| split-bill-payment | 125 | `sessionStore.getById(sb.sessionId)` | `sessionRepo.findById(_, tx)` |

**总计 28 处**(C6a §3 = 29 - rules.ts 1 已 C6b1 处理)。

---

### 6. D58/D59/D60/D61/D63 在 split-bill 域成立性自查(规则 7 严格)

| 决议 | split-bill 域成立? | grep / 推论锚点 |
|---|---|---|
| **D58 路径 X**(submitDraft 仅 webhook) | ✅ 成立 | C6a §5.1 grep 0 处 submitDraft/submitOrder/submitCart 在 split-bill 域 |
| **D59 metadata pointer**(cart pointer)| ✅ 不直接适用,无冲突 | split-bill-payment:85 manual capture metadata 是 `{splitBillId, sessionId, storeId}`,与 D59 cart `{draftId, draftVersion}` 不同 lifecycle(§2.4 详述) |
| **D60 webhook expectedVersion**(version 校验)| ✅ 不直接适用,无冲突 | manual capture 的 capture-on-demand 流程不涉 cart version,SplitBill 状态机用 `status: 'unpaid' → 'pending-capture' → 'paid'` 锁定 |
| **D61 service 层全 FK**(无 string itemKey)| ✅ 落地中 | C6b2 §2.1-§2.4 改造目标 = signature 全 FK,`splitAttribution` helper FK,无 controller 边界(split-bill 无 routes 直接接 itemKey 字符串) |
| **D63 derivePaidState FK**(paidItems 消费)| ✅ 落地中 | §2.1 createSplitBill / §2.2 invalidateConflictingSplits 消费 `paidItems` Set/Map,对齐 C5b2 D63 11 调用方切换模式 |

**无 D64+ 新决议候选浮现**——本 C6b2 改造全部在 D58-D63 + D56(FK 模型)框架内。

---

### 7. 跨 task 耦合补充(从 C6b1 §4 延伸)

**Task 38 ↔ Task 36(已完成)**:
- `payment.service.ts:222` 调 `invalidateConflictingSplits(sessionId, storeId, tx)` —— C6b2 §2.2 改 async + tx,Task 36 已 async,**已就绪**

**Task 38 ↔ Task 39(webhook plan)**:
- `invalidateConflictingSplits` 在 webhook 路径调用,Task 39 webhook plan 写作时引用本 plan §2.2 + §4 表

**Task 38 ↔ Task 42(session-payment 收尾)**:
- `paySplitBillCard/Cash` / `captureSplitBillPayment` 调 `addPayment`(session.service)—— Task 42 改 addPayment FK signature 时,本 plan §2.4 splitAttribution.paymentItems 直传,**协调要求 C6b2 + Task 42 原子 commit**(§4 表)

**Task 38 ↔ Task 38 内部(C6b1 ↔ C6b2)**:
- C6b1 actions 调 `createSplitBill`(C6b2 §2.1) —— C6b1 + C6b2 原子 commit

**[NEEDS TASK ASSIGNMENT VERIFICATION 状态更新]** C6b1 §4.3 标的 pay-split → split-bill-payment 归属:**本 plan §2.4 已纳入 C6b2 范围**(split-bill-payment.service.ts 是 split-bill 5 文件之一,Ian 拆分锚点已明确)。verification 状态闭合。

---

### 8. Phase D 回填候选(段 6 part 2)

**段 6 新增第 2 项 G6-2 候选**:

| # | 内容 | 依据 |
|---|---|---|
| G6-2(候选,可能已满足)| `splitBillRepo.create` 接 D56 FK 模型 `{ ...splitBillData, items: SplitBillItem[] }` 多步原子 | Phase D Task 20 plan(`phase-d-repositories.md` Task 20 grep 确认 `splitBillRepo` 含 SplitBillItem FK 模型 + 多步原子 create) |
| G6-3(候选,可能已满足)| `splitBillRepo.findBySessionId(sessionId, tx)` | 同 Task 20 验证,`getSplitBills` C6b2 §2.1/§2.2 消费 |

**累积状态**:
- 无条件 6 + 段 4 新增 3 + 段 5 新增 2 + 段 6 新增:G6-1(C6b1)+ **G6-2 / G6-3(本 plan)** = **14 项**

---

### 9. Task 38 收尾预告

**Task 38 plan 三部分完成度**(C6b2 land 后):
- C6a:`70a2eaee` 前置 grep(307 行)
- C6b1:`e52342f5` actions + rules(412 行)
- C6b2:本文件(预估 ~470 行)
- **Task 38 plan 总体量**:约 1189 行(分 3 文件,无单文件超 500 行)

**Task 38 收尾 commit 内容**(本 plan 范围之外):
- RESUME.md:Phase G 进度 3.6/5 段 + Task 38 plan 三部分锚点 + D63 settlement 域落地完成
- 00-index.md:Task 38 行指向 3 文件(C6a + C6b1 + C6b2)

**收尾 commit 由 Ian 拍**(本窗口做 / 下窗口做)。

---

### 10. 实施 Step(Task 38 part 2 实施期指引)

- **Step 1**:grep 基线复核 + Phase D Task 20 `splitBillRepo` verify(G6-2/G6-3 候选状态)
- **Step 2**:split-bill.service.ts 改造(§2.1 完整 + §5 表 9 处 JsonStore)
- **Step 3**:split-bill-invalidation.ts 改造(§2.2 + §5 表 3 处)
- **Step 4**:split-bill-summary.ts 改造(§2.3 + §5 表 4 处)
- **Step 5**:split-bill-payment.service.ts 改造(§2.4 + §5 表 12 处,manual capture 路径仅 FK 机械切换)
- **Step 6**:`__tests__/split-billing-integration.test.ts` 同步更新(FK signature 传染)
- **Step 7**:tsc -b 验证(预期 C6b1 + C6b2 + Task 42 原子 land 后全绿,本 step 单独 land 可能 unstable —— 见 §4 协调)
- **Step 8**:5 道门验证 + commit `feat(phase-5): Task 38 part 2 - split-bill domain FK + 5 .split消除 + 28 JsonStore`

---

### 11. commit(本 plan 落地)

```bash
git add docs/superpowers/plans/2026-04-17-phase5-postgres-migration/phase-g-settlement-split-bill.md
git commit -m "plan(phase-g): section 6b2 - split-bill B2 refactor (Task 38 part 2)"
git push origin main
```

**收尾 commit**(Task 38 全部 plan land 后):RESUME + 00-index 同步,由 Ian 拍本窗口或下窗口做。

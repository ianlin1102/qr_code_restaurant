# Phase 5 Plan — Phase G 段 5:session-payment + session-settlement B2(Task 42,段 5 末尾)

> **如何使用本文件**
>
> - 全局规则见 [`00-index.md`](./00-index.md#全局规则所有-task-遵守)
> - 前置:Task 36-41 plan 完成 + Phase D Task 17/19/20 实施完成 + Phase B Task 8 `tenantAwareRoute`/`withTenantContextAndHooks` 可用
> - 参考:
>   - [`phase-g-segment-5-scope-check.md`](../work-logs/2026-04-19-phase-g-segment-5-scope-check.md) §5(Task 42 实际剩余工作量)
>   - [`phase-g-settlement-gateway.md`](./phase-g-settlement-gateway.md) C5b1 §7(Task 42 范围调整声明:session-settlement 收窄到非 derivePaidState 部分)
>   - [`phase-g-settlement-gateway-part2.md`](./phase-g-settlement-gateway-part2.md) C5b2 §3(D63 + 11 调用方原子切,含 session-settlement 3 调用点)
>   - [`phase-g-settlement-actions.md`](./phase-g-settlement-actions.md) C6b1 §4.1(Task 38 ↔ Task 42 耦合:6 actions signature 同步)
>   - [`phase-g-settlement-split-bill.md`](./phase-g-settlement-split-bill.md) C6b2 §4(C6b1 + C6b2 + Task 42 三方原子 commit 协调)
>   - [`phase-g-webhook.md`](./phase-g-webhook.md) Task 41 plan(Task 41 ↔ Task 42 不耦合声明)
> - spec 锚点:§9.8 Stage 3c 子任务 9(段 5 末尾 task)

---

## 范围声明

- **本 task 范围**:
  - `server/src/controllers/session-payment.ts`(165 行,13 JsonStore + ~10 itemKey + emit verify + confirmItemPayment FK)
  - `server/src/controllers/session-settlement.ts` 整文件(187 行,**含 C5b2 范围 3 derivePaidState + 3 .split(':') 整合**)
  - `server/src/__tests__/split-billing-integration.test.ts`(9 处 `confirmItemPayment(itemKeys: string[])` 调用同步改 FK)
- **不在本 task 范围**:
  - session.service.ts(50 行 re-export aggregator,signature 自动传递,无需直接改)
  - settlement 域 4 文件(C6b2 已 plan)
  - actions 9 文件(C6b1 已 plan)
  - webhook(Task 41)
  - routes 层 split-bill.routes(Task 39 已 plan)

**关键聚合声明**:
- C5b2 plan §3 声明 "Modify session-settlement.ts" 含 3 derivePaidState 调用点切换 + 3 .split(':') 消除 —— **本 Task 42 plan 把这 3 处与文件其余 7 处 JsonStore + 业务函数 async 整合在同一 implementation commit**(对齐 C6b2 §4 三方原子模式),不在 plan 写作期再切分

---

## 规则 7 段 5 task 42 强化条款

1. **C5b2 范围 vs Task 42 范围的边界必须明示**——session-settlement.ts 整文件改造在 Task 42 实施(C5b2 plan 是声明,实施期合并 land)
2. **confirmItemPayment 处理决议必须基于 grep 证据**——9 处测试调用 grep 证实(`server/src/__tests__/split-billing-integration.test.ts`)
3. **Task 38 ↔ Task 42 耦合 6 actions signature 同步必须列具体函数 + 改造点**——不凭印象

违反本条款的写作 → 停下自查修正,不 push。

## 规则 8 段 5 task 42 自查记录

- ✅ Pending commits 全程 ≤ 1(本 plan 为唯一 pending,Task 41 plan 已 land `6513f80b`)
- ✅ confirmItemPayment 不删除决议 + 测试同步改 FK
- ✅ C5b2 ↔ Task 42 边界明示(plan vs implementation 分层)
- ✅ Task 38 ↔ Task 42 三方原子 commit 协调要求引用 C6b2 §4

## Pending commits 清单(规则 8.1)

- [x] Task 39 合并 plan:`bc8fcca3`
- [x] Task 41 webhook plan:`6513f80b`
- [ ] **Task 42 session-payment + session-settlement plan:本文件**

---

## Task 42:session-payment + session-settlement B2

**Files (本 task 范围)**:
- Modify: `server/src/controllers/session-payment.ts`(13 JsonStore → Prisma + ~10 itemKey FK + confirmItemPayment FK + emit verify)
- Modify: `server/src/controllers/session-settlement.ts`(整文件 10 JsonStore → Prisma + payByItems signature FK + C5b2 范围 3 derivePaidState + 3 .split(':') 整合)
- Modify: `server/src/__tests__/split-billing-integration.test.ts`(9 处 `confirmItemPayment(string[])` 改 FK + 涉及 payByItems / addPayment 等 caller 同步 FK)

**前置**:
- Task 36-41 plan 完成
- Phase D Task 19 `paymentRepo.create` 接 PaymentItem FK 模型 + Phase D Task 17 `orderRepo.findById/findOrderItem`
- Phase B Task 8 `tenantAwareRoute` 可用(routes 层 caller 提供 tx)
- C6b1 (actions FK signature) + C6b2 (split-bill FK service) + Task 42 (本) **三方原子 commit**(C6b2 §4)

### Task 完成 6 道门

1. `grep -cE "(sessionStore|orderStore|paymentStore|storeStore|splitBillStore)" server/src/controllers/session-payment.ts server/src/controllers/session-settlement.ts` = **0**(13 + 10 = 23 JsonStore 全切 Repo)
2. `grep -nE "itemKeys?\s*:\s*string\[\]" server/src/controllers/session-payment.ts server/src/controllers/session-settlement.ts` = **0**(itemKey 字符串 signature 全消除)
3. `grep -rn "split(':')" server/src/` = **仅 `legacy-itemkey.ts` 内部 1 处**(C5b1 §6 + C6b1 §3 + C6b2 §3 + Task 42 三方协调最终验证)
4. `grep -n "paidItemIds" server/src/` = **0**(C5b2 D63 全消除,session-settlement.ts 3 调用点 Task 42 实施期一并切)
5. `grep -cE "^\s*emit\(" server/src/controllers/session-payment.ts server/src/controllers/session-settlement.ts` = **0**(emit 通过 routes 层 / settlement gateway afterCommit 触发,本 task 文件内 0 直接 emit)
6. `tsc -b` 全通过(C6b1 actions paymentItems FK + C6b2 split-bill FK + Task 42 session-payment/settlement FK 三方原子 land)

---

### 1. 事实核查(引用 scope-check + C5b2 + 本 plan grep)

**session-payment.ts(165 行,grep verify)**:
- JsonStore 13 处:storeStore × 2(line 11/16)+ sessionStore × 5(line 30/82/97/132/161/163)+ paymentStore × 6(line 69/101/115/116/144/147/154)
- itemKey 依赖 ~10 处:`addPayment(itemKeys?: string[])` line 27 / `resolvedItemKeys` line 55-57 / `payment.itemKeys` set line 65 / `recordCashPayment(itemKeys?: string[])` line 108/112 / `confirmItemPayment(itemKeys: string[])` line 131 / line 137/147/151/156 内部使用
- emit:**0 直接 emit**(grep 0 命中)
- 函数:`calcTax` / `calcServiceFee` / `addPayment` / `getPayments` / `recordCashPayment` / `confirmItemPayment` / `confirmPercentPayment`
- `deriveFifoItemKeys` 调用 line 57 → C5b2 已改名 `deriveFifoOrderItems` + FK 返回值,本文件实施期对齐

**session-settlement.ts(187 行,grep verify)**:
- JsonStore 10 处:sessionStore × 5(line 11/16/76/89/96/154)+ orderStore × 2(line 18/98)+ storeStore × 3(line 20/140/141/158)
- derivePaidState 3 处(line 24/99/162)→ **C5b2 plan §3 范围**,Task 42 实施期一并切 paidItems FK
- .split(':') 3 处(line 38/104/112)→ **C5b2 plan §3 范围**,Task 42 实施期一并消除
- itemKey signature:`payByItems(itemKeys: string[])` line 87 → Task 42 改 FK
- 函数:`getSessionSummary` / `startSettlement` / `payByItems` / `payByPercent`
- emit:**0 直接 emit**(grep 0 命中)

**confirmItemPayment 使用情况**(grep verify):
- production source:仅 session-payment.ts:131 + session.service.ts:26(re-export)
- production webhook **不调**(L128 注释 "Production webhook no longer calls this" 证实 + grep payment.service.ts 内无命中)
- **9 处测试调用**(`split-billing-integration.test.ts:153/161/236/282/294/308/349/360/374`)
- **决议**:**保留 confirmItemPayment**(测试依赖)+ FK signature 切换 + 测试同步更新

**session.service.ts**:50 行 re-export aggregator,signature 自动传递,**Task 42 不直接改**(子文件 signature 改 FK 后,本文件无需改动)。

---

### 2. session-payment.ts 改造(13 JsonStore + itemKey FK + emit verify)

#### 2.1 calcTax / calcServiceFee 改 async

```diff
-export function calcTax(storeId: string, subtotal: number): number {
-  const store = storeStore.getById(storeId)
+export async function calcTax(storeId: string, subtotal: number, tx: Prisma.TransactionClient): Promise<number> {
+  const store = await storeRepo.findById(storeId, tx)
   return sharedCalcTax(subtotal, store?.taxRate ?? 0)
 }
 // calcServiceFee 同模式
```

**影响**:caller(session-settlement.ts § 2 表 + 其他调用方)需 await + tx。

#### 2.2 addPayment FK signature(D61 + Task 38 actions paymentItems 对齐)

```diff
 export async function addPayment(
   storeId: string, sessionId: string,
   amount: number, paidBy?: string, stripePaymentIntentId?: string,
   tipAmount?: number,
-  itemKeys?: string[],
+  paymentItems?: { orderItemId: string; quantity: number }[],
   percent?: number,
+  tx: Prisma.TransactionClient,
-): { session: Session; payment: Payment } | { error: string } {
+): Promise<{ session: Session; payment: Payment } | { error: string }> {
-  const session = sessionStore.getById(sessionId)
+  const session = await sessionRepo.findById(sessionId, tx)
   ...
-  const { totalPaid: priorTotalPaid } = derivePaidState(sessionId)
+  const { totalPaid: priorTotalPaid } = await derivePaidState(sessionId, tx)
   ...
-  const resolvedItemKeys = itemKeys && itemKeys.length > 0
-    ? itemKeys
-    : (percent != null ? [] : deriveFifoItemKeys(sessionId, storeId, effectiveFood))
+  const resolvedPaymentItems = paymentItems && paymentItems.length > 0
+    ? paymentItems
+    : (percent != null ? [] : await deriveFifoOrderItems(sessionId, storeId, effectiveFood, tx))
   ...
-  const payment: Payment = { ..., ...(resolvedItemKeys.length > 0 ? { itemKeys: resolvedItemKeys } : {}), ... }
-  paymentStore.create(payment)
+  // D56 FK 模型: paymentRepo.create 接 PaymentItem 嵌套
+  const payment = await paymentRepo.create({
+    storeId, sessionId, amount: effectiveFood + tip,
+    method: stripePaymentIntentId ? 'stripe' : 'cash',
+    stripePaymentIntentId,
+    tipAmount: tip,
+    refundAmount: refundAmount > 0 ? refundAmount : undefined,
+    items: resolvedPaymentItems,  // PaymentItem[] 自动创建
+    percent,
+    paidBy,
+    status: 'confirmed',
+  }, tx)
   ...
   if (Object.keys(updates).length > 0) {
-    sessionStore.update(sessionId, updates)
+    await sessionRepo.update(sessionId, updates, tx)
   }
   ...
-  return { session: sessionStore.getById(sessionId)!, payment }
+  return { session: (await sessionRepo.findById(sessionId, tx))!, payment }
 }
```

**关键变化**:
- `itemKeys: string[]` → `paymentItems: { orderItemId, quantity }[]`(D61 + C6b1 §2.1/§2.2 actions signature 对齐)
- `paymentStore.create` 多步 → `paymentRepo.create` 单 atomic(含 PaymentItem FK 自动嵌套,D56)
- `deriveFifoItemKeys` → `deriveFifoOrderItems`(C5b2 已改名 + FK 返回)

#### 2.3 recordCashPayment / getPayments / confirmPercentPayment FK + async

`getPayments`:`paymentStore.getByField('sessionId', sessionId)` → `paymentRepo.findBySessionId(sessionId, tx)`

`recordCashPayment`:signature 改 paymentItems FK + 内部 `paymentStore.update` → `paymentRepo.update` + addPayment 调用加 tx

`confirmPercentPayment`:`sessionStore.update` → `sessionRepo.update` + async + tx

#### 2.4 confirmItemPayment FK signature(测试依赖,不删除)

```diff
-export function confirmItemPayment(sessionId: string, itemKeys: string[]): void {
-  const session = sessionStore.getById(sessionId)
+export async function confirmItemPayment(
+  sessionId: string,
+  paymentItems: { orderItemId: string; quantity: number }[],
+  tx: Prisma.TransactionClient,
+): Promise<void> {
+  const session = await sessionRepo.findById(sessionId, tx)
   ...
-  sessionStore.update(sessionId, { settlementMode: newMode })
+  await sessionRepo.update(sessionId, { settlementMode: newMode }, tx)
   ...
-  const payments = paymentStore.getByField('sessionId', sessionId)
-  const target = [...payments].reverse().find(p => !p.itemKeys?.length)
+  const payments = await paymentRepo.findBySessionId(sessionId, tx)
+  const target = [...payments].reverse().find(p => !p.items?.length)
   if (target) {
-    paymentStore.update(target.id, { itemKeys })
+    // D56 FK: 添加 PaymentItem[] 到现有 Payment
+    await paymentRepo.attachItems(target.id, paymentItems, tx)
   } else {
-    const synthetic: Payment = { ..., amount: 0, itemKeys, ..., }
-    paymentStore.create(synthetic)
+    await paymentRepo.create({
+      storeId: session.storeId, sessionId, amount: 0, paidBy: 'system-confirm',
+      items: paymentItems,
+    }, tx)
   }
 }
```

**新依赖** G7-6:`paymentRepo.attachItems(paymentId, paymentItems, tx)`(对现有 Payment 追加 PaymentItem 关联,D56 FK)—— Phase D Task 19 plan verify 是否已含;若无,实施期补。

#### 2.5 emit verify(0 直接 emit)

`session-payment.ts` 当前 grep 0 emit 调用——业务效应通过 caller 链触发:
- `addPayment` 由 `actions/add-payment.ts`(C6b1)→ settlement gateway(C5b1)→ afterCommit emit
- `confirmItemPayment` 由测试调用,实施期不需 emit(测试场景)
- `recordCashPayment` 同 addPayment

**结论**:本文件 0 emit 改造,但实施期 verify caller 链 afterCommit 已就绪(C5b1 settlement gateway §3 4 emit afterCommit + C6b1 actions 通过 gateway 触发)。

---

### 3. session-settlement.ts 改造(整文件:10 JsonStore + payByItems FK + C5b2 范围整合)

#### 3.1 getSessionSummary 整体 async + tx + paidItems 消费

```diff
-export function getSessionSummary(storeId: string, sessionId: string) {
-  const session = sessionStore.getById(sessionId)
+export async function getSessionSummary(storeId: string, sessionId: string, tx: Prisma.TransactionClient) {
+  const session = await sessionRepo.findById(sessionId, tx)
   if (!session || session.storeId !== storeId) return null

-  adoptOrphanedOrders(session)
+  await adoptOrphanedOrders(session, tx)

-  const freshSession = sessionStore.getById(sessionId)!
+  const freshSession = (await sessionRepo.findById(sessionId, tx))!
   const orders = await Promise.all(
-    freshSession.orderIds.map(id => orderStore.getById(id))
+    freshSession.orderIds.map(id => orderRepo.findById(id, tx))
   ).then(rs => rs.filter(Boolean))

-  const payments = getPayments(sessionId)
+  const payments = await getPayments(sessionId, tx)
-  const store = storeStore.getById(storeId)
+  const store = await storeRepo.findById(storeId, tx)
   ...
-  const { totalPaid, paidItemIds } = derivePaidState(sessionId)
+  // D63: paidItems FK 模型 (C5b2 已切签名)
+  const { totalPaid, paidItems } = await derivePaidState(sessionId, tx)
   ...

-  // C5b2 范围: 消除 .split(':')
-  const paidQtyMap = new Map<string, number>()
-  for (const pid of paidItemIds) {
-    const parts = pid.split(':')
-    const baseKey = `${parts[0]}:${parts[1]}`
-    const qty = parts.length >= 3 ? parseInt(parts[2], 10) : Infinity
-    paidQtyMap.set(baseKey, (paidQtyMap.get(baseKey) ?? 0) + qty)
-  }
+  // C5b2 + Task 42 整合: paidItems 直接 build paidQtyMap(orderItemId → paidQty)
+  const paidQtyMap = new Map<string, number>(paidItems.map(pi => [pi.orderItemId, pi.paidQty]))

   for (const order of orders) {
     for (let idx = 0; idx < order.items.length; idx++) {
       const item = order.items[idx]
       if (item.voided) continue
-      const baseKey = `${order.id}:${idx}`
-      const paidQty = Math.min(paidQtyMap.get(baseKey) ?? 0, item.quantity)
+      // D63: 直接读 orderItemId(item 已含 id 字段, D56 OrderItem FK)
+      const paidQty = Math.min(paidQtyMap.get(item.id) ?? 0, item.quantity)
       ...
     }
   }
   ...
   return { ..., totalAmount, discountAmount, totalPaid, paidItems, ... }
 }
```

**关键变化**:
- `derivePaidState` 返回 `paidItems` FK 模型(C5b2 D63 落地,Task 42 实施期合并)
- 消除 .split(':')(C5b2 范围 #1 line 38,Task 42 实施)
- `paidQtyMap` Key 从 baseKey 字符串改 orderItemId
- 返回字段 `paidItemIds` → `paidItems`(API 契约变化,前端连锁——见 §4)

#### 3.2 startSettlement async + tx

```diff
-export function startSettlement(storeId: string, sessionId: string, mode: 'by-item' | 'by-percent'): Session | { error: string } {
+export async function startSettlement(storeId: string, sessionId: string, mode: 'by-item' | 'by-percent', tx: Prisma.TransactionClient): Promise<Session | { error: string }> {
-  const session = sessionStore.getById(sessionId)
+  const session = await sessionRepo.findById(sessionId, tx)
   ...
-  return sessionStore.update(sessionId, { settlementMode: mode })!
+  return (await sessionRepo.update(sessionId, { settlementMode: mode }, tx))!
 }
```

#### 3.3 payByItems FK signature + 整合 C5b2 范围

```diff
-export function payByItems(storeId: string, sessionId: string, itemKeys: string[]):
-  { amount: number; tax: number; serviceFee: number } | { error: string } {
+export async function payByItems(
+  storeId: string, sessionId: string,
+  paymentItems: { orderItemId: string; quantity?: number }[],
+  tx: Prisma.TransactionClient,
+): Promise<{ amount: number; tax: number; serviceFee: number } | { error: string }> {
-  const session = sessionStore.getById(sessionId)
+  const session = await sessionRepo.findById(sessionId, tx)
   ...

-  const { totalPaid: derivedTotalPaid, paidItemIds: derivedPaidItemIds } = derivePaidState(sessionId)
+  const { totalPaid: derivedTotalPaid, paidItems: derivedPaidItems } = await derivePaidState(sessionId, tx)

-  // 消除 .split(':') line 104, 112 (C5b2 范围)
-  const paidQtyMap = new Map<string, number>()
-  for (const pid of derivedPaidItemIds) {
-    const parts = pid.split(':')
-    ...
-  }
+  const paidQtyMap = new Map<string, number>(derivedPaidItems.map(pi => [pi.orderItemId, pi.paidQty]))

   let subtotal = 0
-  for (const key of itemKeys) {
-    const parts = key.split(':')
-    const orderId = parts[0]
-    const idx = parseInt(parts[1], 10)
-    ...
-    const order = orders.find(o => o!.id === orderId)
-    const item = order.items[idx]
-    const alreadyPaid = paidQtyMap.get(`${orderId}:${idx}`) ?? 0
+  for (const pi of paymentItems) {
+    const item = await orderRepo.findOrderItem(pi.orderItemId, tx)
+    if (!item || !session.orderIds.includes(item.orderId)) return { error: `Item ${pi.orderItemId} not found` }
+    const alreadyPaid = paidQtyMap.get(item.id) ?? 0
     ...
   }
   ...
 }
```

#### 3.4 payByPercent async + tx(无 itemKey,机械改造)

```diff
-export function payByPercent(storeId: string, sessionId: string, percent: number):
+export async function payByPercent(storeId: string, sessionId: string, percent: number, tx: Prisma.TransactionClient):
-  { amount: number; tax: number; serviceFee: number } | { error: string } {
+  Promise<{ amount: number; tax: number; serviceFee: number } | { error: string }> {
-  const session = sessionStore.getById(sessionId)
+  const session = await sessionRepo.findById(sessionId, tx)
   ...
-  const store = storeStore.getById(storeId)
+  const store = await storeRepo.findById(storeId, tx)
   ...
 }
```

---

### 4. C6b1 + C6b2 + Task 42 三方原子 commit 协调(C6b2 §4 引用)

**协调要求**(C6b2 §4 表):
- C6b1:actions paymentItems FK signature(已 plan)
- C6b2:split-bill 域 service paymentItems FK signature(已 plan)
- Task 42:session-payment / session-settlement paymentItems FK signature(本 plan)

**实施期 deploy 顺序**(对齐 C6b2 §4 + 本 plan):
1. **三方原子 commit**:C6b1 + C6b2 + Task 42 同一 implementation commit(避免 typecheck unstable 期)
2. **Task 39 routes 跟进**:Task 38/42 三方 land 后,Task 39 routes 改造可独立 land(routes 调用面对齐 service signature)
3. **Task 41 webhook 独立**:无 itemKey signature 依赖,可任意时机 land(D62 候选 B 决议 + schema migration 是 Task 41 自足)

**前端 API 契约变化**(`getSessionSummary` 返回字段 `paidItemIds` → `paidItems`):

`paidItemIds: string[]` → `paidItems: { orderItemId: string; paidQty: number }[]` —— 前端消费方需同步改。**[ASSUMPTION,实施期前端 verify]**:前端是否消费 `paidItemIds` 字段(可能仅 server 内部使用,不暴露给前端)。grep 确认后:
- 若无前端消费 → API 契约变化无影响,Task 42 land 即可
- 若有前端消费 → 前端 caller 改造同 Task 42 deploy(避免 production 错位)

---

### 5. 测试同步:`__tests__/split-billing-integration.test.ts` 9 处 confirmItemPayment 改 FK

**当前**(grep verify):
```ts
confirmItemPayment(sessionId, [`${orderId}:0:4`])  // line 153
confirmItemPayment(sessionId, [`${orderId}:0:2`])  // line 161, 236, 282, 294, 308, 349, 374
confirmItemPayment(sessionId, [`${orderId}:0:4`, `${orderId}:1:1`, `${orderId}:2:1`])  // line 360
```

**改造模式**:
```ts
// 测试需先 setup orderItems (Phase D Task 17 fixture 建好), 然后用 orderItemId 引用
const orderItem0 = await orderRepo.findOrderItem(`${orderId}:position:0`, tx)  // OR fixture helper
await confirmItemPayment(sessionId, [{ orderItemId: orderItem0.id, quantity: 4 }], tx)
```

**测试 fixture helper 候选 G7-7**:`orderItemByPosition(orderId, position, tx)` 返回 OrderItem(测试用,简化 setup)—— Phase C Task 13 fixture 文件可能已含,实施期 verify。

---

### 6. confirmItemPayment 处理决议

**决议**:**保留**(测试依赖)+ FK signature 切换 + 测试同步更新

**理由**:
1. **production webhook 不调**(L128 注释 + grep payment.service.ts 0 命中证实)
2. **9 处测试调用**(split-billing-integration.test.ts grep 证实)—— 直接删除会导致 9 个测试 case fail
3. **删除替代方案需要重构 9 个测试**(用 addPayment 直接添加 PaymentItem 模拟"已确认"状态)—— 代价大,测试可读性可能下降
4. **未来 cleanup 候选**:Phase 5 之后的 cleanup phase,若所有测试改用 addPayment 直接模式,可删除 confirmItemPayment(本 task 不做)

**记录**:本 task 完成后 `confirmItemPayment` 状态 = "保留 + FK signature + 测试依赖" —— 标 deprecated 注释可保留(production webhook 仍不调)。

---

### 7. Phase D 回填补丁清单(段 5 task 42)

**段 5 task 42 新增回填候选**:

| # | 内容 | 依据 |
|---|---|---|
| **G7-6(必需)** | `paymentRepo.attachItems(paymentId, paymentItems, tx)` | §2.4 confirmItemPayment FK 切换需要对现有 Payment 追加 PaymentItem 关联;Phase D Task 19 plan verify 是否已含 |
| G7-7(候选,测试用)| `orderItemByPosition(orderId, position, tx)` fixture helper | §5 测试改造简化 setup;Phase C Task 13 fixture 可能已含 |

**累积状态**:
- 无条件 6 + 段 4 三 + 段 5 二 + 段 6 三 + 段 5 task 39 一 + 段 5 task 41 三 + **段 5 task 42 二 = 20 项**

---

### 8. 段 5 收尾预告(Task 42 完成后)

**段 5 plan 完整状态**(Task 42 land 后):
- Task 39 合并(routes + handoff verify):`bc8fcca3` ✅
- Task 41 webhook + D62 决议:`6513f80b` ✅
- Task 42 session-payment + session-settlement:本 plan ✅
- **段 5 plan 完成度 3/3** → **Phase G 完整 plan 完成度 5/5 段**

**Phase G 完整 plan 5/5 段**(Task 32-42 全部 plan):
- 段 1:Task 32-33(session-crud + order.service)
- 段 2:Task 34(session-cart B2 + D58)
- 段 3:Task 35(B2 checkpoint 7 场景)
- 段 4:Task 36(payment.service B2 + D59/D60/D61)
- 段 5:Task 37(settlement gateway part 1+2 + D63)+ Task 38(actions + split-bill part 1+2)+ Task 39(合并)+ Task 41(webhook + D62)+ Task 42(本)

**收尾 commit 内容**(本 plan 范围之外,Ian 拍本 / 下窗口做):
- RESUME.md 更新:Phase G 进度 5/5 + Task 39/41/42 完整锚点 + D62 决议
- 00-index.md 更新:Phase G 行 + Task 39/41/42 描述 + D62 补强项追加
- 段 5 task 数最终 = 3(非交接包 4),编号 39/41/42(40 悬空)

---

### 9. 实施 Step(Task 42 实施期指引)

- **Step 1**:grep 基线复核 + Phase D Task 19 verify(`paymentRepo.create` 含 items / `paymentRepo.attachItems` G7-6 / `paymentRepo.findBySessionId`)
- **Step 2**:三方原子 commit 准备(C6b1 + C6b2 + Task 42 land 在同一 implementation commit,避免 typecheck unstable)
- **Step 3**:`session-payment.ts` 改造(§2 完整,7 函数 async + 13 JsonStore + itemKey FK)
- **Step 4**:`session-settlement.ts` 改造(§3 完整,4 函数 async + 10 JsonStore + payByItems FK + C5b2 范围 3 derivePaidState + 3 .split(':') 整合)
- **Step 5**:`__tests__/split-billing-integration.test.ts` 改造(§5,9 处 confirmItemPayment + 涉及 caller 同步)
- **Step 6**:tsc -b 验证(C6b1 + C6b2 + Task 42 三方 land 后全绿,Task 39 routes 跟进可独立 land)
- **Step 7**:6 道门验证 + commit `feat(phase-5): Task 42 - session-payment + session-settlement B2 + C5b2 范围整合 + Task 38↔42 三方原子`

**注意**:
- API 契约变化(`paidItemIds` → `paidItems`)前端 verify(§4 末尾 ASSUMPTION)
- `confirmItemPayment` 保留(§6 决议,测试依赖)
- 三方原子 commit 是规则要求,**不允许 Task 42 单独 land**(Task 38 caller signature mismatch 会 typecheck fail)

---

### 10. commit(本 plan 落地)

```bash
git add docs/superpowers/plans/2026-04-17-phase5-postgres-migration/phase-g-session-payment-settlement.md
git commit -m "plan(phase-g): task 42 - session-payment + session-settlement B2 (segment 5 final)"
git push origin main
```

**段 5 收尾**(Task 42 plan land 后):RESUME + 00-index 同步,Ian 拍本窗口或下窗口做。Phase G plan 完整 5/5 段。

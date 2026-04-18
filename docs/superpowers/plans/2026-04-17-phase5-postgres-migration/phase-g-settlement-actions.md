# Phase 5 Plan — Phase G 段 6:`settlement/actions/*.ts` + `rules.ts` 签名 FK 化(Task 38 part 1 / C6b1)

> **如何使用本文件**
>
> - 全局规则见 [`00-index.md`](./00-index.md#全局规则所有-task-遵守)
> - 前置:Task 37 part 2(C5b2)land——derivePaidState FK 签名稳定 + 11 调用方切换完成(gateway.ts 已消费 `paidItems: { orderItemId, paidQty }[]`)
> - 参考:
>   - [`phase-g-section-6a-grep.md`](../work-logs/2026-04-18-phase-g-section-6a-grep.md) C6a 前置 grep 证据(14 文件 862 行 / itemKey 29 处 / JsonStore 29 处 / emit 0)
>   - [`phase-g-settlement-gateway.md`](./phase-g-settlement-gateway.md) C5b1 §5 D63 决议 + C5b1 §6 handoff §2 归属分配表
>   - [`phase-g-settlement-gateway-part2.md`](./phase-g-settlement-gateway-part2.md) C5b2 §3 11 调用方原子切清单
>   - [`phase-g-handoff.md`](../work-logs/2026-04-17-phase-g-handoff.md) §2 5 处 .split(':') 废弃 checklist(行号微差已在 C6a §4.3 修正)
> - spec 锚点:§9.8 Stage 3c 子任务 6(`settlement/actions/*.ts` + `rules.ts` → Prisma + D61 落地)

---

## 范围声明(Part 1 / 2)

本 plan 是 **Task 38 拆分后的 Part 1(C6b1)**,对齐 Ian 2026-04-18 C6a 后拆分决议(方案 B,依据 C6a §8 规则 8 触发:itemKey 29 > 25 阈值):

- **C6b1(本文件)范围**:actions 层 9 文件 signature FK 化 + rules.ts 改造(`checkItemKeys` FK + 1 `.split(':')` 消除 + 1 JsonStore → Prisma)
- **C6b2(Ian C6b1 完成后拍板启动)范围**:split-bill 域 5 文件(split-bill.service / split-bill-invalidation / split-bill-summary / split-bill-payment.service)深度改造 + handoff §2 5 处 `.split(':')` 消除(split-bill.service:48/144 + split-bill-invalidation:37 + split-bill-summary:53 + rules:46 —— 其中 rules:46 已在 C6b1 消除,见 §3)

**拆分锚点风险分界**:C6b1 = 机械替换(22 处透传型 signature 改 FK + 1 处解析型 rules:46 消除),C6b2 = 逻辑改造(5 处解析型 + 可能 D64+)。

---

## 规则 7 段 6 part 1 强化条款

1. **任何数字断言必须有 C6a grep / C6b1 §1 修正对照表锚点**——不凭印象
2. **Task 38 跨 task 耦合网三层结构**:主体(展开 deploy 时序)/ 附加(仅登记)/ 不确定(标 `[NEEDS TASK ASSIGNMENT VERIFICATION]`)—— **不扩散详细 deploy 时序到附加层**
3. **handoff §2 split-bill-summary:53 归属判定必须给理由**——不凭感觉判,按文件归属一致原则

违反本条款的写作 → 停下自查修正,不 push。

## 规则 8 段 6 part 1 自查记录

- ✅ Pending commits 全程 ≤ 1(本 C6b1 为唯一 pending,C6a 已落地 `70a2eaee`)
- ✅ C6a 数字错误(7 → 6 actions)以修正声明处理,不 amend(选项 1 Ian 批准)
- ✅ Task 38 跨 task 耦合网分层登记,主体 Task 38 ↔ Task 42 展开 / 附加 Task 38 ↔ Task 39 仅登记
- ✅ handoff §2 split-bill-summary:53 归属判定带理由

## Pending commits 清单(规则 8.1)

- [x] C6a:`phase-g-section-6a-grep.md` — commit `70a2eaee`(含已知"7 actions"统计误差,本 plan §1 修正)
- [ ] **C6b1:本文件** `phase-g-settlement-actions.md`(actions 9 文件 + rules.ts)
- [ ] C6b2(待 Ian C6b1 完成后拍板启动):split-bill 5 文件
- [ ] 收尾 commit:RESUME + 00-index 同步(Task 38 全部完成后)

---

## Task 38 part 1:actions 9 文件 + rules.ts 改造

**Files (C6b1 范围)**:
- Modify: `server/src/settlement/actions/create-split.ts`(signature FK + checkItemKeys 调用 FK + createSplitBill 调用 FK)
- Modify: `server/src/settlement/actions/pay-items.ts`(同模式)
- Modify: `server/src/settlement/actions/add-payment.ts`(无 itemKey,仅 typecheck 传染,见 §2.3)
- Modify: `server/src/settlement/actions/cash-payment.ts`(同 add-payment)
- Modify: `server/src/settlement/actions/close-session.ts`(同)
- Modify: `server/src/settlement/actions/delete-split.ts`(同)
- Modify: `server/src/settlement/actions/pay-percent.ts`(同)
- Modify: `server/src/settlement/actions/pay-split.ts`(同)
- Modify: `server/src/settlement/actions/reopen-session.ts`(同)
- Modify: `server/src/settlement/rules.ts`(`checkItemKeys` FK signature + line 46 `.split(':')` 消除 + line 52 `orderStore.getById` → Prisma)

**前置**:
- Task 37 C5b2 已 land(derivePaidState / buildPaidOrderItemSet / deriveFifoOrderItems 全 FK)
- D63 决议稳定(paidItems 消费模式)

### Task 完成 4 道门(C6b1 部分)

1. `grep -cE "itemKeys?\s*:\s*string\[\]" server/src/settlement/actions/*.ts server/src/settlement/rules.ts` = **0**(旧 `itemKeys: string[]` 签名全消除,替换为 FK 模型)
2. `grep -cE "split\(':'\)" server/src/settlement/rules.ts` = **0**(rules.ts 内唯一 .split(':') 消除)
3. `grep -cE "orderStore|sessionStore|storeStore|paymentStore|splitBillStore" server/src/settlement/rules.ts` = **0**(rules.ts 1 JsonStore 消除)
4. `tsc -b` 无新增错误(actions 9 文件 + rules.ts 独立 typecheck 通过,依赖 Task 37 C5b2 已 land 的 FK signature)

---

### 1. 事实核查(引用 C6a + 数据修正)

(源:`phase-g-section-6a-grep.md` + 本 C6b1 grep verify)

- **Task 38 域规模**(C6a §1):14 文件 / 862 行总量 / actions 9 文件 318 行 / split-bill+rules 5 文件 544 行
- **itemKey 依赖**(C6a §4):29 处(7 解析 + 22 透传),**C6b1 范围 = 22 透传 + 1 解析(rules:46) + 1 signature(rules:41) = 24 处**
- **JsonStore 调用点**(C6a §3):C6b1 范围 actions 0 + rules 1 = **1 处**(rules:52 `orderStore.getById`)
- **emit 调用点**:0(Task 38 域无 emit,C6a §5.4 证实)
- **D58/D59/D60 钩子**:0(C6a §5.1 §5.2 证实)

#### 1.1 C6a 数据修正登记(C6a §6.1 + §7 误统计 7 actions → session.service)

**grep 证据**(C6b1 §1 verify):

```bash
$ grep -lE "from '\.\./\.\./controllers/session\.service'" server/src/settlement/actions/*.ts | wc -l
# 实际 6, 不是 C6a 写的 7
```

**修正对照(6 actions + 6 service 函数)**:

| Action 文件 | session.service 函数 |
|---|---|
| add-payment.ts | `addPayment` |
| cash-payment.ts | `recordCashPayment` |
| close-session.ts | `closeSession` |
| pay-items.ts | `payByItems` |
| pay-percent.ts | `payByPercent` |
| reopen-session.ts | `reopenSession` |

**原 C6a 文件保留**(规则 8 精神:违规诚实标记 + 不 post-hoc rationalization;成熟工程实践:错误 commit 作为历史记录比"假装没错过"更诚实)。本小节作为 C6a 误统计的审计锚点。

**影响范围**:
- **Task 38 ↔ Task 42 耦合声明数字对齐为 6**(§4.1)
- **C6a 其他核心数字不受波及**:itemKey 29 / JsonStore 29 / D58/D59/D60 全 0 / emit 0 / handoff §2 5 处

---

### 2. actions 层 9 文件改造详情

**核心分布**:9 个 actions 中仅 **2 个涉 itemKey**(create-split / pay-items),其他 7 个 signature 不动(仅 typecheck 传染检查)。

#### 2.1 create-split.ts(itemKey 5 处,核心改造)

**当前 signature**(C6a §4.1 B 类透传型):

```ts
type: 'create-split'; splitType: 'by-item' | 'by-percent'; itemKeys?: string[]; percent?: number; label?: string
```

**改造**(signature FK + 调用链 FK):

```diff
 export function execute(ctx: SettlementContext, action: {
-  type: 'create-split'; splitType: 'by-item' | 'by-percent'; itemKeys?: string[]; percent?: number; label?: string
+  type: 'create-split'; splitType: 'by-item' | 'by-percent';
+  paymentItems?: { orderItemId: string; quantity: number }[];
+  percent?: number; label?: string
 }) {
   ...
   if (action.splitType === 'by-item') {
-    if (!Array.isArray(action.itemKeys) || action.itemKeys.length === 0) {
-      return { error: 'INVALID_ITEM_KEY', message: 'itemKeys required for by-item split' }
+    if (!Array.isArray(action.paymentItems) || action.paymentItems.length === 0) {
+      return { error: 'INVALID_ITEM_KEY', message: 'paymentItems required for by-item split' }
     }
-    const itemCheck = checkItemKeys(ctx, action.itemKeys, true, true)
+    const itemCheck = checkPaymentItems(ctx, action.paymentItems, true, true)
     ...
   }
   const result = createSplitBill(ctx.store.id, ctx.session.id, {
     type: action.splitType,
-    itemKeys: action.itemKeys,
+    paymentItems: action.paymentItems,
     percent: action.percent ? Math.round(action.percent) : undefined,
     label: action.label,
   })
```

**依赖**:
- `checkPaymentItems`(从 rules.ts 改名,见 §3)
- `createSplitBill` signature FK(**Task 38 C6b2 范围**)—— C6b1 调用端用新 signature,**实施期 C6b1 完成后 C6b2 未完成时 typecheck 会报错**——见 §5 typecheck 稳定性声明

#### 2.2 pay-items.ts(itemKey 5 处,核心改造)

**改造模式同 create-split**:

```diff
 export function execute(ctx: SettlementContext, action: {
-  type: 'pay-items'; itemKeys: string[]
+  type: 'pay-items'; paymentItems: { orderItemId: string; quantity: number }[]
 }) {
   ...
-  if (!Array.isArray(action.itemKeys) || action.itemKeys.length === 0) {
-    return { error: 'INVALID_ITEM_KEY', message: 'itemKeys array required' }
+  if (!Array.isArray(action.paymentItems) || action.paymentItems.length === 0) {
+    return { error: 'INVALID_ITEM_KEY', message: 'paymentItems array required' }
   }
-  const itemCheck = checkItemKeys(ctx, action.itemKeys, true, false)
+  const itemCheck = checkPaymentItems(ctx, action.paymentItems, true, false)
   ...
-  const result = payByItems(ctx.store.id, ctx.session.id, action.itemKeys)
+  const result = payByItems(ctx.store.id, ctx.session.id, action.paymentItems)
```

**依赖**:`payByItems` signature FK(**Task 42 范围**)—— C6b1 ↔ Task 42 deploy 时序,见 §4.1

#### 2.3 其他 7 actions(无 itemKey,仅 typecheck 传染)

**清单**:add-payment / cash-payment / close-session / delete-split / pay-percent / pay-split / reopen-session

**C6b1 改造**:**signature + 内部代码不动**。

**typecheck 传染检查**:
- add-payment / cash-payment / close-session / pay-percent / reopen-session 调 session.service 函数(addPayment / recordCashPayment / closeSession / payByPercent / reopenSession)—— Task 42 改 signature 时 typecheck 传染(§4.1 耦合声明)
- delete-split 调 split-bill.service.deleteSplitBill —— **Task 38 C6b2 范围**,C6b2 改 signature 时 typecheck 传染
- pay-split 调 split-bill-payment.service(paySplitBillCard/Cash)—— **Task 38 C6b2 范围,或 Task 39 / 其他归属不确定**,见 §4.3

**C6b1 实施期验证**:对这 7 个 actions 跑 `tsc -b` 应通过(依赖函数 signature C6b1 阶段均未改)。

---

### 3. rules.ts 改造

**3 个改造点**:
1. **checkItemKeys signature 改 FK + 改名 checkPaymentItems**(C6a §4.1 B 类透传 rules:41)
2. **line 46 `.split(':')` 消除**(C6a §4.1 A 类解析 rules:46,handoff §2 原列 rules:57 行号微差)
3. **line 52 `orderStore.getById` → Prisma**(C6a §3 唯一 JsonStore 调用)

**改造 diff**(核心):

```diff
-import { orderStore } from '../repositories/stores'
+import { orderRepo } from '../repositories/orders'
+import type { Prisma } from '@prisma/client'

-export function checkItemKeys(
-  ctx: SettlementContext,
-  itemKeys: string[],
-  checkPaid: boolean,
-  checkAssigned: boolean,
-): ErrorCode | null {
-  for (const key of itemKeys) {
-    const parts = key.split(':')
-    if (parts.length < 2) return 'INVALID_ITEM_KEY'
-    const orderId = parts[0]
-    const idx = parseInt(parts[1], 10)
-    if (isNaN(idx)) return 'INVALID_ITEM_KEY'
-
-    const order = orderStore.getById(orderId)
-    if (!order || !ctx.session.orderIds.includes(orderId)) return 'INVALID_ITEM_KEY'
-    const item = order.items[idx]
-    if (!item || item.voided) return 'INVALID_ITEM_KEY'
-
-    const baseKey = `${orderId}:${idx}`
-    const reqQty = parts.length >= 3 ? parseInt(parts[2], 10) : item.quantity
-    ...
-  }
-  return null
-}

+export async function checkPaymentItems(
+  ctx: SettlementContext,
+  paymentItems: { orderItemId: string; quantity: number }[],
+  checkPaid: boolean,
+  checkAssigned: boolean,
+  tx: Prisma.TransactionClient,
+): Promise<ErrorCode | null> {
+  for (const pi of paymentItems) {
+    // FK 直接读 OrderItem (D56 模型), 无字符串解析
+    const item = await orderRepo.findOrderItem(pi.orderItemId, tx)
+    if (!item) return 'INVALID_ITEM_KEY'
+    if (!ctx.session.orderIds.includes(item.orderId)) return 'INVALID_ITEM_KEY'
+    if (item.voided) return 'INVALID_ITEM_KEY'
+
+    const reqQty = pi.quantity
+    if (checkPaid) {
+      // paidQtyMap 在 SettlementContext 层面已从 FK 模型重建 (C5b2 后)
+      const paidQty = ctx.paidQtyMap.get(item.id) ?? 0
+      const available = item.quantity - paidQty
+      if (reqQty > available) return 'ITEM_ALREADY_PAID'
+    }
+    if (checkAssigned) {
+      const paidQty = ctx.paidQtyMap.get(item.id) ?? 0
+      const assignedQty = ctx.assignedQtyMap.get(item.id) ?? 0
+      const available = item.quantity - paidQty - assignedQty
+      if (reqQty > available) return 'ITEM_ALREADY_ASSIGNED'
+    }
+  }
+  return null
+}
```

**依赖**:
- `orderRepo.findOrderItem(orderItemId, tx)` —— **Phase D 回填候选 G6-1**(见 §7,可能已定义 grep verify)
- `ctx.paidQtyMap` / `ctx.assignedQtyMap` key 从字符串 baseKey → orderItemId —— **SettlementContext 类型变化**,gateway.ts C5b2 内已完成 paidQtyMap 构造切 FK,但 assignedQtyMap 依赖 `buildAssignedQtyMap` (split-bill.service,**Task 38 C6b2 范围**)

---

### 4. Task 38 跨 task 耦合网(三层结构)

#### 4.1 主体耦合(展开 deploy 时序):Task 38 ↔ Task 42

**6 actions 依赖 session.service 函数 signature**:

| Action 文件 | session.service 函数 | Task 42 改 signature 时 actions 同步改 |
|---|---|---|
| add-payment.ts | `addPayment` | 若 addPayment 改 FK(D61 落地),add-payment signature 无 itemKey 不受 FK 影响;若 addPayment 参数个数变化(如 tx 强制参数),actions 同步加 tx |
| cash-payment.ts | `recordCashPayment` | 同上 |
| close-session.ts | `closeSession` | 同上 |
| pay-items.ts | `payByItems` | **直接 FK 传染**(C6b1 §2.2 改 signature 时 payByItems 需同步改)|
| pay-percent.ts | `payByPercent` | 无 itemKey,仅 tx 可能变化 |
| reopen-session.ts | `reopenSession` | 同 add-payment |

**Deploy 时序要求**:
- **C6b1 完成后 actions 的 typecheck 稳定**(当前 signature,除 pay-items 依赖 payByItems 改 FK 同步——见 §5)
- **Task 42 改 session.service signature → actions 需同轮 deploy**(不分批,否则 actions TS 报错)
- **Task 42 plan 写作时引用本声明**,规划 session.service FK 改造 + actions 同步改造作为原子 commit

**Handoff**:Task 42 plan 作者读到 session.service signature 改造时,应同时检查本 §4.1 表 6 个 actions 对应文件。

#### 4.2 附加耦合(仅登记,不展开):Task 38 ↔ Task 39

**[注]Task 39 范围**:本 plan 未明确 Task 39 具体范围(RESUME 仅列"段 5 Task 39-42 = webhook plan / session-payment 收尾 / 等"),**附加耦合仅作为登记**。

**3 actions 依赖 split-bill.service / split-bill-payment.service(Task 38 C6b2 范围)**:

| Action 文件 | split-bill 域函数 | 所属 task |
|---|---|---|
| create-split.ts | `createSplitBill` from split-bill.service | **Task 38 C6b2** |
| delete-split.ts | `deleteSplitBill` from split-bill.service | **Task 38 C6b2** |
| pay-split.ts | `paySplitBillCard` / `paySplitBillCash` from split-bill-payment.service | **`[NEEDS TASK ASSIGNMENT VERIFICATION, Ian or next session]`**(可能 Task 38 C6b2,可能独立 task,C6b1 不凭感觉判) |

**不展开 deploy 时序**——详细 deploy 时序是 C6b2 plan / 专门 handoff 的职责。

#### 4.3 不确定归属

`pay-split.ts` → `paySplitBillCard` / `paySplitBillCash`(来自 split-bill-payment.service)的归属:

- C6a 列 split-bill-payment.service 作为 Task 38 域的一部分(see C6a §1)
- 但 Ian 拆分选 B 时明示 C6b2 = "split-bill 5 文件"—— split-bill-payment.service 是其中之一
- 同时 split-bill-payment.service 依赖 `addPayment`(session.service,Task 42 域)+ `derivePaidState`(已 Task 37 C5b2 FK)+ Stripe SDK
- 这使其**跨 Task 38 ↔ Task 42 边界**

**标记**:`[NEEDS TASK ASSIGNMENT VERIFICATION, Ian or next session]`—— C6b2 plan 写作时由 Ian 拍板,或下 session handoff 时明确。本 plan 不凭感觉判。

---

### 5. typecheck 稳定性保证

#### 5.1 C6b1 完成后 typecheck 稳定范围

- **Stable**:7 个无 itemKey actions(add-payment / cash-payment / close-session / delete-split / pay-percent / pay-split / reopen-session)`tsc -b` 通过
- **Stable**:rules.ts `checkPaymentItems` + `orderRepo` 依赖,`tsc -b` 通过(Phase D Task 17 `orderRepo.findOrderItem` 已定义 / Task 37 C5b2 后 `ctx.paidQtyMap` key 为 orderItemId)
- **Unstable(需同步改)**:create-split.ts / pay-items.ts 内调用的 `createSplitBill` / `payByItems` —— 这些函数 signature FK 化分别在 Task 38 C6b2 / Task 42 改造

#### 5.2 Unstable 的协调选项

**选项 A(推荐)**:C6b1 实施期 create-split / pay-items 的调用端写新 signature(paymentItems),但 `createSplitBill` / `payByItems` 未改时 typecheck 报错 —— **C6b1 故意 typecheck fail**,等 C6b2 + Task 42 land 后全绿

**选项 B**:C6b1 实施期保留调用端旧 signature(itemKeys 字符串),signature FK 改造延后到 C6b2/Task 42 联合 land

**选项 C**:C6b1 内加 shim(创建 string[] ↔ FK[] 转换 helper,临时过渡)

**C6b1 plan 不选,等实施期 Ian 判**。**[ASSUMPTION,needs decision at Task 38 implementation]**:C6b1 / C6b2 / Task 42 原子 land 建议(减少 shim 债务)。

---

### 6. handoff §2 split-bill-summary:53 归属判定

**判定**:**归 C6b2**(不在 C6b1 范围)

**理由**(规则 7 要求带理由):
1. **文件归属一致原则**:split-bill-summary.ts 是 split-bill 5 文件之一(Ian 拆分锚点:actions+rules=C6b1,split-bill 5 文件=C6b2)。handoff §2 `.split(':')` 解析点位置在该文件,归属应跟文件。
2. **拆分锚点跨越代价**:若 C6b1 处理 split-bill-summary:53,会跨拆分锚点(C6b1 文件集 + 1 split-bill 文件),违反 Ian 方案 B "风险层级分界"原则(C6b1 机械替换 / C6b2 逻辑改造)。split-bill-summary:53 是 `.split(':')` 解析型,属逻辑改造,天然归 C6b2。
3. **rules:46 留 C6b1 是例外,因 rules.ts 整体归 C6b1**(rules 和 actions 一同被 Ian 拆 C6b1)—— split-bill-summary.ts 整体归 C6b2,其内部 :53 自然归 C6b2

---

### 7. Phase D 回填候选(段 6 part 1)

**段 6 新增第 1 项 G6-1 候选**:

| # | 内容 | 依据 |
|---|---|---|
| G6-1(候选,可能已满足)| `orderRepo.findOrderItem(orderItemId, tx)` 返回单个 OrderItem(含 orderId / quantity / voided / etc) | **Phase D Task 17 plan verify**(`phase-d-repositories.md` grep 确认 `orderRepo` 定义含 findByOrderItemId 或类似方法)。C6b1 §3 rules.ts `checkPaymentItems` 内部依赖此方法 —— 若 Phase D 已定义 → G6-1 不需追加;若未定义 → 实施期加到 paymentRepo/orderRepo(具体 repo 归属根据 FK 模型) |

**累积状态更新**:
- 无条件 6 项:G1-1..G1-4 + G2-1 + G2-2(未变)
- 段 4 新增 3 项:G4-1 / G4-2 / G4-3
- 段 5 新增 2 项:G5-1(splitBillStore 死 import)+ G5-2(paymentRepo.derivePaidQuantityByOrderItem 候选已满足)
- **段 6 新增 1 项:G6-1(orderRepo.findOrderItem 候选,C6b1 verify)**

---

### 8. C6b2 预告(Ian C6b1 完成后拍板启动)

**C6b2 范围**:
- split-bill.service.ts(152 行):`createSplitBill` signature FK + 2 处 `.split(':')` 消除(line 48/144)+ `buildAssignedQtyMap` FK + 9 JsonStore → Prisma
- split-bill-invalidation.ts(72 行):1 处 `.split(':')` 消除(line 37)+ 3 JsonStore → Prisma
- split-bill-summary.ts(74 行):1 处 `.split(':')` 消除(line 53,§6 判定归 C6b2)+ `calcByItemSubtotal` FK + 4 JsonStore → Prisma
- split-bill-payment.service.ts(131 行):`splitAttribution` helper FK(C6a §4.4 已分析)+ 12 JsonStore → Prisma + manual capture PI metadata 兼容性 verify([Task 41 webhook 协调])

**C6b2 预估**:~400-500 行(5 处 `.split(':')` 消除 + 29 JsonStore 改造 + FK signature 传染)

**C6b2 commit message 草案**:`plan(phase-g): section 6b2 - split-bill domain FK + 5 .split消除 (Task 38 part 2) + handoff §2 final`

---

### 9. 实施 Step(Task 38 part 1 实施期指引)

- **Step 1**:grep 基线复核
  - C6a 数字 + C6b1 §1.1 修正(6 actions 非 7)
  - Phase D Task 17 `orderRepo.findOrderItem` verify(G6-1 候选状态)
- **Step 2**:rules.ts 改造(§3 完整 diff)—— `checkItemKeys` → `checkPaymentItems` FK signature + 内部 FK + `orderStore` → `orderRepo`
- **Step 3**:create-split.ts / pay-items.ts 改 signature(§2.1 §2.2)
- **Step 4**:7 个无 itemKey actions tsc 传染检查(§2.3,signature 不动,typecheck 应通过)
- **Step 5**:tsc -b 验证
  - create-split / pay-items 调用 createSplitBill / payByItems 可能 typecheck fail(§5.1 Unstable,等 C6b2 / Task 42 land)
  - 其他 actions + rules.ts 应绿
- **Step 6**:4 道门验证 + commit `feat(phase-5): Task 38 part 1 - actions signature FK + rules.ts`

---

### 10. commit(本 plan 落地)

本文件 commit 命令:

```bash
git add docs/superpowers/plans/2026-04-17-phase5-postgres-migration/phase-g-settlement-actions.md
git commit -m "plan(phase-g): section 6b1 - settlement actions signature + rules (Task 38 part 1)"
git push origin main
```

**不更新 RESUME / 00-index**——等 Task 38 全部完成(C6b2 land 后)一次性同步。

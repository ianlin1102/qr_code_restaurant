# Phase 5 Plan — Phase G 段 5：`derivePaidState` FK 改造 + 11 调用方原子切（Task 37 part 2 / C5b2）

> **规则 8 例外声明**（Ian 2026-04-18 批准）
>
> 本文件 **394 行**,超 Ian C5b2 启动指令预设 300 行阈值 94 行。
>
> **理由**:§3/§4 11 调用方清单 + handoff §2 8 消除 / 3-5 留手 / 2 verify 分配 + C5b2 消除验证 grep 命令精确性优先。收缩方案 B（合并 §3/§4 单表 + §8 Task 38 预告压缩 + §4 验证 grep 合并）可达 ~335 行,但 Ian 判"未造成实际问题"(可读性未下降 / agent 执行未受阻 / review 疲劳在 plan 文件 394 行属边界)——选择书面化例外而非强压缩,保留实施期可用性。
>
> **回滚路径**:若 Task 37 part 2 实施期发现文件过长影响执行,可在本 plan revision 内:
> 1. §3 深度切 8 处 + §4 浅切 6 处合并为单 11 调用方表(8 deep + 3 shallow + 3 Task 38 同列,diff 列区分)—— 省 ~25 行
> 2. §8 Task 38 预告压缩到 10 行(仅锚点 + 验证标准,余 handoff 化)—— 省 ~20 行
> 3. §4 验证 grep 命令合并为 1 block—— 省 ~15 行
>
> 预估收缩后 ~335 行。**当前版本保留完整展开形态作为 C5b2 原始实施指引**,实施期若确需压缩再 revision。
>
> **先例**:规则 8 例外书面化机制同 Phase D 段 2b（`phase-d-repositories.md` 1523 行超 1200 软上限 323 行）的处理——记录生产真实形态,审计可追溯。
>
> ---

> **如何使用本文件**
>
> - 全局规则见 [`00-index.md`](./00-index.md#全局规则所有-task-遵守)
> - **本文件是 [`phase-g-settlement-gateway.md`](./phase-g-settlement-gateway.md) 的 Part 2**——derivePaidState FK 签名改造 + 11 调用方原子切（其中 8 处 C5b2 内消除,3-5 处留 Task 38）
> - 前置：C5b1 已 land（`97361fc8`,gateway.ts B2 主体 + D63 决议登记 + handoff §2 补登记）+ Phase D Task 19 `paymentRepo` 实施完成（**含 `derivePaidQuantityByOrderItem`,phase-d-repositories.md line 926/940/1094 grep 证实已定义,替代 legacy derivePaidState.paidItemIds**）
> - 参考：
>   - [`phase-g-settlement-gateway.md`](./phase-g-settlement-gateway.md) §5 D63 决议（5 条理由,本 plan **引用不重新登记**）
>   - [`phase-g-settlement-gateway.md`](./phase-g-settlement-gateway.md) §6 handoff §2 11 处归属分配表（本 plan §4 严格对齐）
>   - [`phase-d-repositories.md`](./phase-d-repositories.md) Task 19 `paymentRepo` 定义（含 `derivePaidQuantityByOrderItem` + `findBySessionId`）
> - spec 锚点：§9.8 Stage 3c 子任务 5 延伸

---

## 范围声明（Part 2 / 2）

本 plan 是 **Task 37 拆分后的 Part 2（C5b2）**,与 C5b1 同 Task 37 物理拆分（独立文件,先例：`phase-d-repositories.md` + `phase-d-repositories-part2.md`）。

- **C5b2（本文件）范围**：derivePaidState 签名 FK 化 + 内部 paymentRepo 切换 + 11 调用方原子 commit + handoff §2 8 处消除
- **不在 C5b2 范围**：Task 38 归属 3-5 处 .split(':')（split-bill.service:48/144 / split-bill-invalidation:37 + handoff 原列未触发 2 处 split-bill-summary:64 / settlement/rules:57）—— Task 38 plan 处理
- **D63 决议引用**：本 plan **不重新登记 D63**,直接引用 C5b1 §5（避免双登记）

---

## 规则 7 段 5 part 2 强化条款

1. **每个调用方切换前必须引用 C5b1 §6 归属分配表的具体行号**——不凭印象判断"这处是 C5b2 还是 Task 38"
2. **handoff §2 8 处消除路径必须可验证**——C5b2 完成后 grep 验证标准明列（§4 末尾）
3. **Phase D 回填 G5-2 候选必须 grep 实证 paymentRepo 现状**——本 plan §7 已 grep 确认 derivePaidQuantityByOrderItem 已定义

违反本条款的写作 → 停下自查修正,不 push。

## 规则 8 段 5 part 2 自查记录

- ✅ Pending commits 全程 ≤ 1（本 C5b2 为唯一 pending,C5b1 已落地 `97361fc8`）
- ✅ D63 引用不重新登记（避免双登记）
- ✅ handoff §2 数字严格对齐 C5b1 §6 表（8 内消除 + 3-5 留手 + 2 verify）
- ✅ G5-2 候选基于 grep 证据（phase-d-repositories.md line 926/940/1094）

## Pending commits 清单（规则 8.1）

- [x] C5a：`phase-g-section-5a-grep.md` — commit `69203a8c`
- [x] C5b1：`phase-g-settlement-gateway.md` — commit `97361fc8`
- [ ] **C5b2：本文件** `phase-g-settlement-gateway-part2.md`（Task 37 part 2 + derivePaidState FK + 11 callers + handoff §2 8 消除）
- [ ] 收尾 commit：RESUME + 00-index 同步（C5b2 land 后）

---

## Task 37 part 2：derivePaidState FK 改造 + 11 调用方原子切

**Files (C5b2 范围)**:
- Modify: `server/src/lib/session-state.ts`（derivePaidState 签名 + buildPaidKeySet + deriveFifoItemKeys 全 FK 化）
- Modify: `server/src/settlement/gateway.ts`（消费方切 FK,删除 C5b1 §8 parsePaidItemKey helper）
- Modify: `server/src/settlement/mode.ts`（paidItemIds.length → paidItems.length）
- Modify: `server/src/settlement/auto-close.ts`（仅 totalPaid,加 await）
- Modify: `server/src/controllers/payment.service.ts`（仅 totalPaid,加 await）
- Modify: `server/src/controllers/session-payment.ts`（仅 totalPaid,加 await）
- Modify: `server/src/controllers/split-bill-payment.service.ts`（仅 totalPaid,加 await）
- Modify: `server/src/controllers/split-bill-invalidation.ts`（line 22 → FK 直接读;**line 37 留 Task 38**）
- Modify: `server/src/controllers/split-bill.service.ts`（line 42 → FK 直接读;**line 48/144 留 Task 38**）
- Modify: `server/src/controllers/session-settlement.ts`（3 调用点全切 FK,本 plan 内消除 line 38/104/112）

**前置**：
- Phase D Task 19 `paymentRepo` 实施完成,`derivePaidQuantityByOrderItem` 可用
- C5b1 land(gateway.ts B2 主体已 async 化)

### Task 完成 5 道门（C5b2 部分）

1. `grep -n "paidItemIds" server/src/` = **0 命中**（旧字段名全消除,只剩 paidItems 新字段）
2. `grep -rn "split(':')" server/src/settlement server/src/lib server/src/controllers/{session-settlement,session-payment,payment.service,split-bill-invalidation}.ts` = **0 命中**（C5b2 范围 8 处全消除）
3. `grep -rn "split(':')" server/src/controllers/split-bill.service.ts server/src/controllers/split-bill-invalidation.ts` 命中数 ≤ **3 处**（Task 38 留手:split-bill.service:48/144 + split-bill-invalidation:37）
4. `derivePaidState(sessionId, tx)` 签名 = `Promise<{ totalPaid: number, paidItems: { orderItemId: string, paidQty: number }[] }>` —— **TS 编译通过**
5. 11 调用方全部 `await derivePaidState(...)` —— `grep -rn "derivePaidState(" server/src/ | grep -v await | grep -v "//"` 应仅命中 session-state.ts 自身定义 + import 行

---

### 1. derivePaidState 签名改造

**当前签名**（C5b1 §1 引用 + session-state.ts:44-56 grep 证实）：

```ts
export function derivePaidState(sessionId: string): {
  totalPaid: number
  paidItemIds: string[]
} {
  const payments = paymentStore.getByField('sessionId', sessionId)
  let totalPaid = 0
  const paidItemIds: string[] = []
  for (const p of payments) {
    totalPaid += p.amount - (p.tipAmount ?? 0)
    if (p.itemKeys?.length) paidItemIds.push(...p.itemKeys)
  }
  return { totalPaid, paidItemIds }
}
```

**新签名（D63 落地）**：

```ts
import type { Prisma } from '@prisma/client'
import { paymentRepo } from '../repositories/payments.js'

export async function derivePaidState(
  sessionId: string,
  tx: Prisma.TransactionClient,
): Promise<{
  totalPaid: number
  paidItems: { orderItemId: string; paidQty: number }[]
}> {
  // totalPaid: from paymentRepo.findBySessionId aggregation (excludes tip per project convention)
  const payments = await paymentRepo.findBySessionId(sessionId, tx)
  const totalPaid = payments.reduce((s, p) => s + (p.amount - (p.tipAmount ?? 0)), 0)

  // paidItems: from paymentRepo.derivePaidQuantityByOrderItem (D56 FK model)
  // Phase D Task 19 plan line 926/940/1094: replaces legacy paidItemIds string set
  const paidQtyMap = await paymentRepo.derivePaidQuantityByOrderItem(sessionId, tx)
  const paidItems = Array.from(paidQtyMap.entries()).map(([orderItemId, paidQty]) => ({
    orderItemId,
    paidQty,
  }))

  return { totalPaid, paidItems }
}
```

**关键变化**：
- `paymentStore.getByField` → `paymentRepo.findBySessionId`（Phase D 已定义,grep 确认 line 81）
- 新增 `paymentRepo.derivePaidQuantityByOrderItem` 调用（**G5-2 候选可能已满足**——见 §7）
- 返回 `paidItems: { orderItemId, paidQty }[]` 替代 `paidItemIds: string[]`
- async + 必填 tx 参数

---

### 2. buildPaidKeySet + deriveFifoItemKeys 同步切 FK

**buildPaidKeySet**（session-state.ts:62-73,handoff §2 表 #5）：

```diff
-function buildPaidKeySet(sessionId: string, excludePaymentId?: string): Set<string> {
-  const payments = paymentStore.getByField('sessionId', sessionId)
-  const set = new Set<string>()
-  for (const p of payments) {
-    if (excludePaymentId && p.id === excludePaymentId) continue
-    for (const k of p.itemKeys ?? []) {
-      const parts = k.split(':')
-      set.add(`${parts[0]}:${parts[1]}`)
-    }
-  }
-  return set
-}

+async function buildPaidOrderItemSet(
+  sessionId: string,
+  tx: Prisma.TransactionClient,
+  excludePaymentId?: string,
+): Promise<Set<string>> {
+  // 直接读 PaymentItem FK, 不再字符串解析
+  const payments = await paymentRepo.findBySessionId(sessionId, tx)
+  const set = new Set<string>()
+  for (const p of payments) {
+    if (excludePaymentId && p.id === excludePaymentId) continue
+    for (const item of p.items) set.add(item.orderItemId)
+  }
+  return set
+}
```

**改名**：`buildPaidKeySet` → `buildPaidOrderItemSet`（语义清晰化:"已付 OrderItem 集合"而非"已付 key 集合"）。**调用方 deriveFifoItemKeys 同步改名**。

**deriveFifoItemKeys**（session-state.ts:84-127,handoff §2 表 #4）：

```diff
 export function deriveFifoItemKeys(
   sessionId: string, storeId: string, foodAmount: number, excludePaymentId?: string,
 ): string[] {
+  // 改为 deriveFifoOrderItems, 返回 FK 模型 (D63 落地)
 export async function deriveFifoOrderItems(
   sessionId: string, storeId: string, foodAmount: number,
   tx: Prisma.TransactionClient, excludePaymentId?: string,
 ): Promise<{ orderItemId: string; qty: number }[]> {
   ...
-  const paidBaseKeys = buildPaidKeySet(sessionId, excludePaymentId)
+  const paidOrderItemIds = await buildPaidOrderItemSet(sessionId, tx, excludePaymentId)
   ...
   for (const order of orders) {
     for (let idx = 0; idx < order.items.length; idx++) {
       const item = order.items[idx]
       if (item.voided) continue
-      const baseKey = `${order.id}:${idx}`
-      if (paidBaseKeys.has(baseKey)) continue
+      if (paidOrderItemIds.has(item.id)) continue  // FK 直接读

       ...
       if (budget >= itemWithTax) {
         budget -= itemWithTax
-        attributed.push(`${baseKey}:${item.quantity}`)
+        attributed.push({ orderItemId: item.id, qty: item.quantity })
       }
     }
   }
   return attributed
 }
```

**改名**：`deriveFifoItemKeys` → `deriveFifoOrderItems`（语义对齐 FK 模型）。

---

### 3. 11 调用方原子切清单（按 C5b1 §6 表归属）

**C5b2 内消除 8 处**（C5b1 §6 表 #1 #2 #3 #4 #5 #6 #9 #11）:

| C5b1 §6 # | 文件 | 行号 | 改造 |
|---|---|---|---|
| #1 | session-settlement.ts | 38 | `for (const pid of paidItemIds) { const parts = pid.split(':'); ... }` → `for (const item of paidItems) { paidQtyMap.set(item.orderItemId, ...) }` |
| #2 | session-settlement.ts | 104 | 同 #1 模式（另一调用方法 internal） |
| #3 | session-settlement.ts | 112 | 同 itemKey 格式字符串解析,改 FK 直接读 |
| #4 | session-state.ts | 121 | `attributed.push(\`${baseKey}:${item.quantity}\`)` → `attributed.push({ orderItemId: item.id, qty: item.quantity })`（见 §2 deriveFifoOrderItems） |
| #5 | session-state.ts | 68 | `k.split(':')` → 直接读 `item.orderItemId`（见 §2 buildPaidOrderItemSet） |
| #6 | split-bill.service.ts | 42 | `for (const pid of paidItemIds) { const parts = pid.split(':'); ... }` → FK 直接读 |
| #9 | split-bill-invalidation.ts | 22 | 同 #6 模式 |
| #11 | gateway.ts | 38 | **删除 C5b1 §8 parsePaidItemKey helper**,直接消费 `paidItems[]`（无字符串解析） |

**Task 38 留手 3 处 + verify 2 处**（C5b1 §6 表 #7 #8 #10 + 原列未触发 2 处）:

| C5b1 §6 # | 文件 | 行号 | 留 Task 38 原因 |
|---|---|---|---|
| #7 | split-bill.service.ts | 48 | split conflict detection 字符串解析,split-bill 域整体改造在 Task 38 |
| #8 | split-bill.service.ts | 144 | split summary 计算字符串解析,同 Task 38 域 |
| #10 | split-bill-invalidation.ts | 37 | invalidation 内部另字符串变量,同 Task 38 域 |
| (handoff 原列) | split-bill-summary.ts | 64 | C5b1 §6 标 [ASSUMPTION,Task 38 verify]——本 session grep 未触发,Task 38 实施时复核行号 |
| (handoff 原列) | settlement/rules.ts | 57 | 同上,Task 38 verify |

**消除 + 留手验证标准**（C5b2 完成后 grep）:

```bash
# C5b2 内消除 8 处验证（应 0 命中）
grep -rn "split(':')" server/src/settlement/{gateway,mode,auto-close}.ts \
  server/src/lib/session-state.ts \
  server/src/controllers/{session-settlement,session-payment,payment.service,split-bill-invalidation.ts}
# 期望: 0 命中
# 注: split-bill-invalidation.ts 内 line 22 (C5b2 消除) + line 37 (Task 38 留手) → grep 仍命中 line 37

# 修正 grep（精确到 C5b2 消除范围）
grep -rn "split(':')" server/src/settlement server/src/lib/session-state.ts
# 期望: 0 命中

grep -n "split(':')" server/src/controllers/session-settlement.ts
# 期望: 0 命中

grep -n "split(':')" server/src/controllers/split-bill-invalidation.ts
# 期望: 1 命中 (line 37, Task 38 留手)

grep -n "split(':')" server/src/controllers/split-bill.service.ts
# 期望: 2 命中 (line 48 + 144, Task 38 留手)
```

**全局 paidItemIds 消除验证**：

```bash
grep -rn "paidItemIds" server/src/
# 期望: 0 命中（所有调用方切 paidItems）
```

---

### 4. 11 调用方代码切换详情（仅 totalPaid 5 处 + 仅 .length 1 处）

**仅消费 totalPaid 5 处**（C5a §4 数据,C5b2 仅加 await + tx 参数）:

| 文件 | 行号 | 改造 |
|---|---|---|
| settlement/auto-close.ts | 27 | `const { totalPaid } = derivePaidState(session.id)` → `const { totalPaid } = await derivePaidState(session.id, tx)` |
| controllers/payment.service.ts | 119 | 同上模式 |
| controllers/session-payment.ts | 41 | 同上模式（带改名 `priorTotalPaid`） |
| controllers/split-bill-payment.service.ts | 126 | `derivePaidState(sb.sessionId).totalPaid` → `(await derivePaidState(sb.sessionId, tx)).totalPaid` |
| controllers/session-settlement.ts | 162 | 同 auto-close.ts 模式（带改名 `derivedTotalPaid`） |

**仅 .length 1 处**（C5a §4）:

| 文件 | 行号 | 改造 |
|---|---|---|
| settlement/mode.ts | 18 | `const { totalPaid, paidItemIds } = derivePaidState(sessionId)` → `const { totalPaid, paidItems } = await derivePaidState(sessionId, tx)` ; line 19 `paidItemIds.length` → `paidItems.length` |

**11 调用方汇总**：5 totalPaid only + 1 length + 5 深度切（§3 表 8 处中除 #4/#5 是 session-state 自身,即 6 处外部 + 2 处自身 = 8 处深度,加 mode.ts 1 处轻度 + auto-close 等 5 处仅 await = 14 调用点位置,但 derivePaidState 调用方文件计数仍 9 文件 / 调用点 11 = C5a §1 数据一致）。

---

### 5. typecheck 连锁影响 + C5b1 inline comment 处理

**C5b1 typecheck assumption 消除声明**（D63 落地后 C5b1 §8 assumption 失效）：

C5b1 §8 显式标记的 typecheck assumption（"async 函数调用 sync derivePaidState = await nonThenable 返回原值"）在 C5b2 完成后**自动消除**——derivePaidState 转 async 后,gateway.ts:35 `await derivePaidState(sessionId, tx)` 是标准 async 调用,无 lint warning。

**C5b1 实施期 inline comment 补丁处理**：

C5b1 plan §8 末尾遗漏的 inline comment 要求（Ian 2026-04-18 反馈）:

> gateway.ts 内 async 函数调用 derivePaidState(sync) 的代码点必须有 inline comment 说明"此处不加 await 因 derivePaidState 同步实现,C5b2 切 async 后该注释可删"

**实施期处理**:
- **C5b1 实施期**:gateway.ts:35 `const { paidItemIds } = derivePaidState(sessionId)` 上方添加 inline comment:
  ```ts
  // C5b1 内 derivePaidState 仍同步实现, 不加 await
  // C5b2 转 async 后该注释 + 整行调用一并改为 await derivePaidState(sessionId, tx)
  const { paidItemIds } = derivePaidState(sessionId)
  ```
- **C5b2 实施期**:删除该 inline comment + 调用整行改 `const { paidItems } = await derivePaidState(sessionId, tx)`(§3 表 #11 落地)

**typecheck 连锁影响**:11 调用方代码形状从 `result.paidItemIds`(string[])→ `result.paidItems`({orderItemId, paidQty}[])。TS 编译会捕获所有未切换的旧字段访问点(类型错误),作为 C5b2 原子 commit 的天然防漏网。

---

### 6. D63 落地引用（不重新登记）

D63 决议正式登记位置：[`phase-g-settlement-gateway.md`](./phase-g-settlement-gateway.md) §5。本 plan 不重复 5 条理由,仅声明落地：

- **D63 落地范围**：本 plan §1-§4 全部内容是 D63 的实施步骤
- **D63 落地约束（C5b1 §5 末尾原文）已对齐**:
  - ✅ derivePaidState 内部切 paymentItemRepo（§1 用 paymentRepo.derivePaidQuantityByOrderItem,Phase D 已定义）
  - ✅ 11 调用方原子 commit 切换（§3-§4 表）
  - ✅ handoff §2 11 处 .split(':') 同 commit 全消除（**精确:C5b2 内 8 处 + Task 38 留 3-5 处**——§3 末尾验证标准）

---

### 7. Phase D 回填补丁清单（段 5 累积 + G5-2 候选）

**段 5 新增第 2 项 G5-2 候选**：

| # | 内容 | 依据 |
|---|---|---|
| G5-2（候选,可能已满足）| `paymentRepo.derivePaidQuantityByOrderItem(sessionId, tx)` 返回 `Map<orderItemId, paidQty>` | **Phase D Task 19 plan 已定义**(`phase-d-repositories.md` line 926/940/1094 grep 证实,描述"替代 legacy derivePaidState.paidItemIds")。**C5b2 实施期 verify**:若 Phase D Task 19 实施时该方法已实施且签名一致 → G5-2 不需追加 / 若签名差异(参数 or 返回类型) → 调整 derivePaidState 内部代码对齐 |

**累积状态更新**：
- 无条件 6 项：G1-1..G1-4 + G2-1 + G2-2（未变）
- 段 4 新增 3 项：G4-1（候选,可能已满足）/ G4-2（Phase B schema 调整）/ G4-3（实施时对齐语义）
- 段 5 新增：G5-1（splitBillStore 死 import,gateway.ts:8,C5b1 已登记）+ **G5-2（candidate,paymentRepo.derivePaidQuantityByOrderItem,本 plan 新登记）**

---

### 8. Task 38 预告（C5b2 完成后 Ian 拍板启动）

**Task 38 启动前可直接引用本小节**：

- **Task 38 文件归属**:`split-bill.service.ts` + `split-bill-invalidation.ts` + `split-bill-summary.ts` + `settlement/rules.ts` + 9 actions（settlement/actions/*.ts）+ `split-bill-payment.service.ts` 完整改造
- **Task 38 范围内 .split(':') 处理 3-5 处**(C5b1 §6 表 + 本 plan §3 表):
  - split-bill.service.ts:48 + 144（2 处）
  - split-bill-invalidation.ts:37（1 处）
  - split-bill-summary.ts:64（verify,行号可能 stale）
  - settlement/rules.ts:57（verify,行号可能 stale）
- **Task 38 启动前置**：C5b2 完成（Task 37 全 land）+ derivePaidState FK 签名稳定（Task 38 plan 不重新设计 derivePaidState）
- **Task 38 完成后验证**:
  ```bash
  grep -rn "split(':')" server/src/
  # 期望: 仅 server/src/lib/legacy-itemkey.ts 内部保留 1 处 (D56 入口转换)
  ```

**Task 38 commit message 草案**:`plan(phase-g): section 6 - settlement actions B2 (Task 38) + handoff §2 final 3-5 处消除`

---

### 9. 实施 Step（Task 37 part 2 实施期指引）

- **Step 1**:grep 基线复核
  - C5b1 完成度（`97361fc8` 已 land）
  - Phase D Task 19 `paymentRepo.derivePaidQuantityByOrderItem` 实施 verify（G5-2 候选状态确认）
- **Step 2**：lib/session-state.ts 改造
  - derivePaidState 签名改 FK + 内部切 paymentRepo（§1）
  - buildPaidKeySet → buildPaidOrderItemSet 改名 + FK 切（§2）
  - deriveFifoItemKeys → deriveFifoOrderItems 改名 + FK 切（§2）
- **Step 3**：11 调用方原子切（§3 表 8 处消除 + §4 表 6 处简单 await）
  - **顺序建议**:先切 5 处 totalPaid only（最简,await 即可）→ 1 处 .length（mode.ts）→ 8 处深度切（settlement-gateway / 3 session-settlement / 1 split-bill.service / 1 split-bill-invalidation / 2 session-state 自身）
- **Step 4**:gateway.ts 删除 C5b1 §8 parsePaidItemKey helper + inline comment 删除
- **Step 5**:tsc -b 验证（11 调用方未切换的话 TS 编译报错,作为防漏网）
- **Step 6**：5 道门验证（§ Task 完成 5 道门）+ commit `feat(phase-5): Task 37 part 2 - derivePaidState FK + 11 callers atomic switch + handoff §2 8 消除`

**注意**：测试新建在本 step 范围内（C5b1 §10 注释延后到 C5b2）—— `derivePaidState` 行为变化（返回字段名 + 类型）需要新测试 case 验证 paidItems 结构正确性。

---

### 10. commit（本 plan 落地）

本文件 commit 命令：

```bash
git add docs/superpowers/plans/2026-04-17-phase5-postgres-migration/phase-g-settlement-gateway-part2.md
git commit -m "plan(phase-g): section 5b2 - derivePaidState FK refactor + 11 callers (Task 37 part 2) + handoff §2 8 消除"
git push origin main
```

**收尾 commit**(C5b2 land 后):
- RESUME.md 同步（Phase G 进度 3.4/5 段 + D63 锚点 + handoff §2 重定向）
- 00-index.md 更新（Task 37 行指向两个 phase-g-settlement-gateway plan 文件 + part 标注）

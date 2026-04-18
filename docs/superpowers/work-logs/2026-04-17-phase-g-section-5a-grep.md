# Phase G Section 5a — Grep Evidence (Task 37 Settlement Gateway B2 Adaptation)

Created: 2026-04-18, before Task 37 plan write — evidence pack for `phase-g-settlement-gateway.md`（即将写）to reference. Naming aligns with C2a / C4a sibling files.

**Scope（hard boundary）**：本文件仅覆盖 **Task 37 = `server/src/settlement/gateway.ts`**。
- **不**深入 `settlement/actions/*.ts`（Task 38 域，下窗口 C6a 独立）
- **不**改任何代码，仅 grep + 读
- **不**做决议，仅记录证据

---

## 1. `gateway.ts` 整体规模 + 结构

```bash
$ wc -l server/src/settlement/gateway.ts
     137 server/src/settlement/gateway.ts
```

**含义**：单文件 137 行，远低于规则 8 软上限 200 行。结构紧凑：1 内部 helper（`loadContext`）+ 1 export 主入口（`executeSettlement`）+ 1 re-export（`httpStatus`）。

---

## 2. Imports 全量

```bash
$ grep -nE "import|require" server/src/settlement/gateway.ts
1:import type { SettlementAction, SettlementContext, SettlementResult } from './types'
2:import { createError, httpStatus } from './errors'
3:import type { ErrorCode } from './errors'
4:import { computeAllowedActions, EMPTY_ACTIONS } from './allowed-actions'
5:import { logSettlement } from './logger'
6:import { emit } from '../lib/event-bus.js'
7:import {
   sessionStore, orderStore, paymentStore, storeStore, splitBillStore,
} from '../repositories/stores'
10:import { getSplitBills, buildAssignedQtyMap, getMainBillSummary } from '../controllers/split-bill.service'
11:import { getSessionSummary } from '../controllers/session.service'
12:import { derivePaidState } from '../lib/session-state'
14:import { execute as payItems } from './actions/pay-items'
15:import { execute as payPercent } from './actions/pay-percent'
16:import { execute as cashPayment } from './actions/cash-payment'
17:import { execute as addPaymentAction } from './actions/add-payment'
18:import { execute as createSplit } from './actions/create-split'
19:import { executeCard as paySplitCard, executeCash as paySplitCash } from './actions/pay-split'
20:import { execute as deleteSplit } from './actions/delete-split'
21:import { execute as closeSessionAction } from './actions/close-session'
22:import { execute as reopenSessionAction } from './actions/reopen-session'
```

**含义**：
- **settlement 内部** 5 个模块（types / errors / allowed-actions / logger + actions/*）
- **跨模块**：5 个外部依赖
  - `repositories/stores`（5 store 单例）
  - `controllers/split-bill.service`（3 helper：getSplitBills / buildAssignedQtyMap / getMainBillSummary）
  - `controllers/session.service`（getSessionSummary）
  - `lib/session-state`（derivePaidState）
  - `lib/event-bus.js`（emit）
- **9 actions**（10 imports，pay-split 拆 card/cash 双 export）—— Task 38 域 1:1 映射

---

## 3. JsonStore 调用点（5 store 单例 imports → 实际使用面）

```bash
$ grep -nE "Store|JsonStore" server/src/settlement/gateway.ts
8:  sessionStore, orderStore, paymentStore, storeStore, splitBillStore,
25:  const store = storeStore.getById(storeId)
26:  const session = sessionStore.getById(sessionId)
30:    .map(id => orderStore.getById(id)).filter(Boolean) as any[]
31:  const payments = paymentStore.getByField('sessionId', sessionId)
```

**实际使用统计**：
- `storeStore.getById` × 1（line 25）
- `sessionStore.getById` × 1（line 26）
- `orderStore.getById` × 1（map 内，line 30）
- `paymentStore.getByField('sessionId', ...)` × 1（line 31）
- **`splitBillStore` 0 处使用**（line 8 imported 但 file 内未直接调用——通过 `getSplitBills` 间接使用）

**Task 37 实际改造点**：4 处 JsonStore 同步调用 → Prisma async（async/await 化）。
- `loadContext` 整个签名需变 `async`
- `executeSettlement` 主入口签名需变 `async`（line 64 `loadContext` 调用 + line 90 reload 调用）

**Phase D 回填候选 G5-1**：`splitBillStore` import 死代码（line 8）—— Phase D land 时清理或 Task 37 实施时顺手删（任一即可）。

---

## 4. Legacy itemKey 依赖（D61 settlement 域量化）

### 4.1 直接 itemKey/parseItemKey/formatItemKey 引用

```bash
$ grep -n "itemKey\|parseItemKey\|formatItemKey" server/src/settlement/gateway.ts
ZERO_MATCHES
```

**含义**：`gateway.ts` **0 处直接 itemKey 引用**。

### 4.2 隐式 itemKey-format 字符串解析（关键发现）

```bash
$ grep -n "split(':')" server/src/settlement/gateway.ts
38:    const parts = pid.split(':')
```

**上下文**（line 35-42）：

```ts
const { paidItemIds } = derivePaidState(sessionId)
const paidQtyMap = new Map<string, number>()
for (const pid of paidItemIds) {
  const parts = pid.split(':')
  const baseKey = `${parts[0]}:${parts[1]}`
  const qty = parts.length >= 3 ? parseInt(parts[2], 10) : Infinity
  paidQtyMap.set(baseKey, (paidQtyMap.get(baseKey) ?? 0) + qty)
}
```

**含义**：虽然 `gateway.ts` 没显式引用 `itemKey` 关键字，但**消费的是 itemKey 格式字符串**（`paidItemIds: string[]` 元素形如 `orderId:idx:qty`）。这是 handoff §2 5 处散落 `.split(':')` 之外的**第 6 处隐藏依赖**——之前 audit 漏列。

**D61 settlement 域落地结论**：
- gateway.ts **不属于** D61 严格"controller 边界薄层"——它是 service 层，但消费 `derivePaidState` 返回的 string[] 进而做字符串解析
- **真正的修复点不在 gateway.ts**：应在 `lib/session-state.ts` `derivePaidState` 改返回 `{ orderItemId, paidQty }[]` 结构（FK 模型），gateway 直接消费对象
- **handoff §2 第 6 处补登记**：`server/src/settlement/gateway.ts:38` 隐式 itemKey-format string 解析（base from `derivePaidState`）

### 4.3 `paidItemIds` / `derivePaidState` 上下游

```bash
$ grep -n "splitBillStore\|paidItemIds\|derivePaidState" server/src/settlement/gateway.ts
8:  sessionStore, orderStore, paymentStore, storeStore, splitBillStore,
12:import { derivePaidState } from '../lib/session-state'
35:  const { paidItemIds } = derivePaidState(sessionId)
37:  for (const pid of paidItemIds) {
```

**含义**：`derivePaidState` 是 SSOT 入口（D55 path）—— gateway 消费的"已付明细"全部从这里来。Task 37 改造时若不动 `derivePaidState` 返回类型，gateway.ts 的 line 38 字符串解析 **无法消除**。**Task 37 必须连带 `lib/session-state.ts` 一并 plan**——否则 D61 在 settlement 域落不了。

---

## 5. D58/D59/D60 交互探查

### 5.1 D58 路径 X 违反检测（gateway 调 submitDraft / submitOrder / submitCart？）

```bash
$ grep -nE "submitDraft|submitOrder|submitCart" server/src/settlement/gateway.ts
ZERO_MATCHES
```

**含义**：**0 处** ——gateway.ts **不违反 D58**（不在 settlement 路径调 submit；submit 仅 webhook 触发，D58 路径 X 在 settlement 域天然成立）。

### 5.2 D59/D60 metadata + expectedVersion 钩子

```bash
$ grep -nE "metadata|paymentIntent|expectedVersion" server/src/settlement/gateway.ts
ZERO_MATCHES
```

**含义**：**0 处** —— gateway.ts 不直接接触 PaymentIntent metadata 或 expectedVersion 校验。**D59/D60 在 Task 37 域不直接落地**——保留在 payment.service.ts（Task 36 域，已完成）和 webhook（Task 41 域，下下 session）。

### 5.3 emit 调用点（D58 affct'd commit-after 时序）

```bash
$ grep -n "emit(" server/src/settlement/gateway.ts
117:    emit({ type: 'session:summary', storeId, sessionId })
121:    emit({ type: 'split:changed', storeId, sessionId })
126:    emit({ type: 'store:tables', storeId })
130:    emit({ type: 'store:orders', storeId })
```

**含义**：4 处 emit，**全部在 `executeSettlement` 末尾的 `if (result.ok)` 块内**（line 115-131）—— Task 37 Prisma 化后**全部需要 afterCommit 包装**（规则 2：emit 必须在 tx commit 后）。

**与 Task 33 order.service.ts 对比**：Task 33 plan 11 emit → afterCommit；Task 37 是 4 emit → afterCommit。规模 1/3，模式相同。

---

## 6. 跨模块依赖矩阵（gateway → 外部）

```bash
$ grep -nE "from '\.\./" server/src/settlement/gateway.ts
6:import { emit } from '../lib/event-bus.js'
9:} from '../repositories/stores'
10:import { getSplitBills, buildAssignedQtyMap, getMainBillSummary } from '../controllers/split-bill.service'
11:import { getSessionSummary } from '../controllers/session.service'
12:import { derivePaidState } from '../lib/session-state'
```

**含义**：5 个跨模块依赖。**关键发现**：

```bash
$ grep -nE "payment\.service|payment\\.routes" server/src/settlement/gateway.ts
ZERO_MATCHES
```

- gateway.ts **0 处直接调用 payment.service**——payment 副作用通过 actions/ 层（add-payment / cash-payment / pay-items / pay-percent / pay-split）间接发生
- 这意味着 Task 36 (payment.service) ↔ Task 37 (gateway) **直接耦合面 = 0**
- 真正的耦合在 actions/ 层（Task 38）—— actions 文件会调 payment.service 的函数

**Phase D 回填候选检查**：
- `getSplitBills / buildAssignedQtyMap / getMainBillSummary` from `split-bill.service` —— Phase D 已有 `splitBillRepo`，Task 37 时这 3 helper 是否已 Prisma 化取决于 split-bill.service 改造进度（属 Task 38 split-bill 域）
- `getSessionSummary` from `session.service` —— 属 Task 32 已完成 session-crud / Task 33 order.service 范围（已 Prisma 化）
- `derivePaidState` from `lib/session-state` —— **新发现**：Task 37 必须连带改 derivePaidState 返回类型（见 §4.2 结论），不属 Phase D 回填，属 Task 37 plan 主体范围

---

## 7. Task 38 域规模预告（不读内容，仅边界）

```bash
$ ls -la server/src/settlement/actions/
-rw-r--r--  add-payment.ts        1263 bytes
-rw-r--r--  cash-payment.ts       1671 bytes
-rw-r--r--  close-session.ts       617 bytes
-rw-r--r--  create-split.ts       2561 bytes
-rw-r--r--  delete-split.ts       1005 bytes
-rw-r--r--  pay-items.ts          1877 bytes
-rw-r--r--  pay-percent.ts        1477 bytes
-rw-r--r--  pay-split.ts          2344 bytes
-rw-r--r--  reopen-session.ts      485 bytes

$ wc -l server/src/settlement/actions/*.ts
      35 add-payment.ts
      39 cash-payment.ts
      15 close-session.ts
      55 create-split.ts
      28 delete-split.ts
      42 pay-items.ts
      33 pay-percent.ts
      58 pay-split.ts
      13 reopen-session.ts
     318 total
```

**含义**：**9 文件 / 318 行总量**，单文件最大 58 行（pay-split.ts）。每个 action 极薄（13-58 行），符合"action = 业务 orchestration，detail 在 service / repo 层"的设计。

**下窗口 C6a 范围预估**：
- 9 文件 grep 全量（itemKey / JsonStore / payment.service 调用 / FK 边界）
- 比 C5a（gateway.ts 单文件）扩 9 倍，但每文件极薄——预计 C6a 窗口可完成
- **真二次 itemKey 风险高发区**：pay-items / pay-split / create-split / delete-split（涉 itemKeys 数组、splitAttribution）—— C6a 必须深查

---

## 8. 总结表（Task 37 plan 写作时直接引用）

| 维度 | 数量 | 含义 |
|---|---|---|
| gateway.ts 行数 | 137 | 远低于 200 软上限 |
| JsonStore 实际调用点 | 4 | storeStore/sessionStore/orderStore/paymentStore，全 read（getById/getByField）|
| 死 import | 1 | splitBillStore (line 8) → G5-1 回填候选 |
| 直接 itemKey 引用 | 0 | gateway.ts 不显式提 itemKey |
| 隐式 itemKey-format 解析 | 1 | line 38 `pid.split(':')` 消费 paidItemIds → handoff §2 第 6 处补登记 |
| submitDraft 等 D58 违反点 | 0 | D58 在 settlement 域天然成立 |
| metadata/expectedVersion 等 D59/D60 钩子 | 0 | D59/D60 不在 Task 37 域 |
| emit 调用点 | 4 | Task 37 全部需 afterCommit 包装（规则 2） |
| 跨模块依赖 | 5 | repositories/stores + 2 controllers + 1 lib + event-bus |
| 9 actions imports | 10 | 1:1 映射到 actions/* 9 文件（pay-split 双 export） |
| payment.service 直接调用 | 0 | Task 36 ↔ Task 37 直接耦合面 = 0 |
| Task 38 域规模 | 9 文件 318 行 | 单文件最大 58 行，C6a 可单窗口完成 |

---

## 9. 触发预警检查（规则 8）

| 检查项 | 阈值 | 实际 | 触发？ |
|---|---|---|---|
| gateway.ts itemKey 依赖 > 10 处 | > 10 | 0 显式 + 1 隐式 = 1 | ❌ 不触发 |
| 发现 submitDraft 在 gateway.ts 被调（违反 D58） | ≥ 1 | 0 | ❌ 不触发 |
| D59/D60/D61 推论在 settlement 域不成立 | 任一 | D59/D60 不在 Task 37 域（预期内）；D61 settlement 域落地需连带改 derivePaidState（**新约束，非"不成立"**） | ⚠️ 边界 |
| pending commits > 1 | > 1 | 1（本文件，待 commit） | ❌ 不触发 |

**⚠️ 边界说明（D61 settlement 域）**：本不算规则 8 触发，但属于"plan 写作约束追加"——D61 在 Task 37 落地需要 **derivePaidState 返回类型改造** 作为前置依赖。Task 37 plan 写作时必须包含 `lib/session-state.ts` 的范围扩展。**不需要立即追加 handoff**，Task 37 plan 写作时直接体现即可。

---

## 10. 下窗口 C6a 输入清单

C6a（Task 38 settlement actions B2 适配前置 grep）启动时直接消费本文件 §7 + 以下补充重点：

1. **9 actions 文件全量 grep**：itemKey / parseItemKey / formatItemKey / .split(':')
2. **每文件 payment.service 调用关系**：actions ↔ payment.service 是 Task 36 ↔ Task 38 真耦合面
3. **splitAttribution helper 在 split-bill 相关 actions 中的分布**：handoff §2 列 `split-bill-payment.service.ts` 6 处，actions/pay-split.ts 是入口
4. **FK 边界 vs string 边界**：D61 严格区分"controller 入口/出口"——actions 是不是 controller？需要 plan 时和 Ian 对齐措辞

---

**End of C5a evidence pack.**

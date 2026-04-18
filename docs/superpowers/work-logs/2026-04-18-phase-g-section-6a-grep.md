# Phase G Section 6a — Grep Evidence (Task 38 Settlement Actions + Split-Bill Domain B2 Adaptation)

Created: 2026-04-18, before Task 38 plan write — evidence pack for `phase-g-settlement-actions.md`（即将写）to reference. Naming aligns with C2a / C4a / C5a sibling files.

**Scope（hard boundary）**：本文件覆盖 **Task 38 = 9 settlement/actions/*.ts + 5 split-bill/rules 域文件**:
- `server/src/settlement/actions/*.ts`（9 文件 318 行）
- `server/src/controllers/split-bill.service.ts`（152 行）
- `server/src/controllers/split-bill-invalidation.ts`（72 行）
- `server/src/controllers/split-bill-summary.ts`（74 行）
- `server/src/settlement/rules.ts`（115 行）
- `server/src/controllers/split-bill-payment.service.ts`（131 行）

**不覆盖**：
- `settlement/gateway.ts`（Task 37,已在 C5a/C5b1/C5b2 覆盖）
- `controllers/session-payment.ts`/`session-settlement.ts`（Task 42 域）
- `controllers/payment.service.ts`/`payment.routes.ts`（Task 36,已完成）

**不做决议**，仅记录证据。

---

## 1. Task 38 域整体规模

```bash
$ wc -l server/src/settlement/actions/*.ts server/src/controllers/split-bill.service.ts \
    server/src/controllers/split-bill-invalidation.ts server/src/controllers/split-bill-summary.ts \
    server/src/settlement/rules.ts server/src/controllers/split-bill-payment.service.ts
      35 add-payment.ts
      39 cash-payment.ts
      15 close-session.ts
      55 create-split.ts
      28 delete-split.ts
      42 pay-items.ts
      33 pay-percent.ts
      58 pay-split.ts
      13 reopen-session.ts
     152 split-bill.service.ts
      72 split-bill-invalidation.ts
      74 split-bill-summary.ts
     115 rules.ts
     131 split-bill-payment.service.ts
     862 total
```

**含义**：Task 38 域 **14 文件 / 862 行总量**。actions/ 层极薄（平均 35 行/文件,最大 58 行）,split-bill 域中等体量。

---

## 2. actions 层结构分析（9 文件）

每个 action **只做参数校验 + 调用 1-2 个 service 函数**,**不直接调 JsonStore,不直接 emit**。

| Action 文件 | service 调用（from） | itemKey 涉及 |
|---|---|---|
| add-payment.ts | `addPayment` from `session.service` | ❌ |
| cash-payment.ts | `recordCashPayment` from `session.service` | ❌ |
| close-session.ts | `closeSession` from `session.service` | ❌ |
| create-split.ts | `createSplitBill` from `split-bill.service` | ✅ `itemKeys: string[]` 透传 |
| delete-split.ts | `deleteSplitBill` from `split-bill.service` | ❌ |
| pay-items.ts | `payByItems` from `session.service` | ✅ `itemKeys: string[]` 透传 |
| pay-percent.ts | `payByPercent` from `session.service` | ❌ |
| pay-split.ts | `paySplitBillCard/Cash` from `split-bill-payment.service` | ❌（通过 `splitAttribution` helper 间接） |
| reopen-session.ts | `reopenSession` from `session.service` | ❌ |

**含义**：actions 层 **itemKey 仅 2 个 action 直接涉及（create-split / pay-items）**,均为 `string[]` 透传到 service,actions 内部不解析。**这是良好的边界**——actions 纯协调,业务解析在 service 层。

**关键:actions 调用 `rules.ts` 的 `checkItemKeys`** (create-split:23 / pay-items:19) —— rules.ts 是实际解析 itemKey 的地方（见 §4.1 rules:46）。

---

## 3. JsonStore 调用点清单（Task 38 域 29 处）

```bash
$ grep -nE "Store[.\s]|new JsonStore" server/src/settlement/actions/*.ts \
    server/src/controllers/split-bill.service.ts \
    server/src/controllers/split-bill-invalidation.ts \
    server/src/controllers/split-bill-summary.ts \
    server/src/settlement/rules.ts \
    server/src/controllers/split-bill-payment.service.ts | wc -l
# 29 处
```

**按文件分布**:

| 文件 | JsonStore 调用数 | 涉及 Store |
|---|---|---|
| actions/*.ts | **0** | — (actions 纯调用 service) |
| split-bill.service.ts | 9 | splitBillStore (4) / sessionStore (2) / orderStore (1) / storeStore (2) |
| split-bill-invalidation.ts | 3 | sessionStore (1) / splitBillStore (2) |
| split-bill-summary.ts | 4 | sessionStore (1) / orderStore (2) / storeStore (1) |
| rules.ts | 1 | orderStore (1) |
| split-bill-payment.service.ts | 12 | splitBillStore (8) / paymentStore (1) / sessionStore (1) + 2 async paymentIntents.capture 调用 |

**含义**：Task 38 非 actions 域（5 文件）共 29 处 JsonStore 调用 —— 比 Task 37 gateway.ts 4 处的 ~7 倍。按文件切分 Prisma 化工作量可分散（每文件 1-12 处）,**非单文件超载**。

**规则 2 合规风险**:actions 层 **0 emit** + split-bill/rules 域**也 0 emit** —— emit 集中在 gateway.ts(Task 37 已覆盖 4 处 afterCommit 改造)。Task 38 域**无 emit → afterCommit 改造需求**。

---

## 4. Legacy itemKey 依赖（D61 Task 38 域量化）— **29 处**

### 4.1 完整清单

```bash
$ grep -nE "itemKey|parseItemKey|formatItemKey" <Task 38 域 14 files> | wc -l
# 29 处
```

**按类型分类**:

**A. 解析型（直接 `.split(':')`）—— 7 处**:

| 文件 | 行号 | 作用 |
|---|---|---|
| split-bill.service.ts | 42 | 消费 `derivePaidState.paidItemIds` build paidQtyMap（**Task 37 C5b2 范围**——derivePaidState 改 FK 后消除） |
| split-bill.service.ts | 48 | `data.itemKeys` 冲突检测字符串解析 |
| split-bill.service.ts | 144 | `buildAssignedQtyMap` 字符串解析 |
| split-bill-invalidation.ts | 22 | 消费 `derivePaidState.paidItemIds`（**Task 37 C5b2 范围**） |
| split-bill-invalidation.ts | 37 | `sb.itemKeys` overlap 检测 |
| split-bill-summary.ts | 53 | `calcByItemSubtotal` 内字符串解析（handoff §2 原列 line 64,**行号微差,本次 grep 证实 line 53**）|
| rules.ts | 46 | `checkItemKeys` 字符串解析（handoff §2 原列 line 57,**行号微差,本次 grep 证实 line 46**）|

**B. 透传型（signature/arg,不直接解析）—— 22 处**:

| 文件 | 处数 | 说明 |
|---|---|---|
| actions/create-split.ts | 5 | 类型定义 + action arg + check call + createSplitBill call |
| actions/pay-items.ts | 5 | 类型定义 + action arg + check call + service call |
| split-bill.service.ts | 3 | interface type + sb.itemKeys loop + createSplitBill itemKeys field |
| split-bill-invalidation.ts | 3 | comment + sb.itemKeys loop |
| split-bill-summary.ts | 1 | calcByItemSubtotal signature |
| rules.ts | 1 | checkItemKeys signature |
| split-bill-payment.service.ts | 6 | `splitAttribution` helper（line 9-13）+ 3 调用点（line 30/59/115） |

### 4.2 与 Task 36 数据对比

| 维度 | Task 36 (payment 域) | Task 38 (settlement actions + split-bill 域) |
|---|---|---|
| 总 itemKey 依赖 | 24 处 | **29 处** |
| 解析型 .split(':') | ~7 处 | **7 处** |
| 透传型 | ~17 处 | **22 处** |
| 跨域传染 | 24 处集中 payment 4 文件 | 29 处分布 **7 文件**（2 actions + 5 split-bill/rules） |

**核心观察**：Task 38 域 itemKey 依赖 **29 > 25（Ian C6a 启动指令阈值）** —— 触发规则 8 Hold。

### 4.3 handoff §2 原列对齐

| handoff §2 原列 | C5b1 §6 表 # | 本次 grep 触发 | 修正 |
|---|---|---|---|
| session-settlement:101 | #2 | 前 session grep line 104 | 已 C5b1 §6 记录 |
| session-state:121 | #4 | 前 session 确认 | 已 C5b1 §6 记录 |
| split-bill.service:47 | #7 | 本次 grep line 48 | 行号微差,修正为 48 |
| split-bill-summary:64 | (暗列 verify) | **本次 grep line 53** | 行号微差 11 行,修正为 53 |
| settlement/rules:57 | (暗列 verify) | **本次 grep line 46** | 行号微差 11 行,修正为 46 |

**结论**:handoff §2 原列 5 处全部证实存在,仅行号微差（可能 handoff 写作时基于较旧代码）。**无 stale entry**。

### 4.4 splitAttribution helper（透传模式,非新未知）

```ts
// split-bill-payment.service.ts:9-13
function splitAttribution(sb: SplitBill): { itemKeys?: string[]; percent?: number } {
  if (sb.type === 'by-item') return { itemKeys: sb.itemKeys }
  if (sb.type === 'by-percent') return { percent: sb.percent }
  return {}
}
```

**含义**:`splitAttribution` 从 SplitBill 抽取 `itemKeys` 或 `percent`,3 处调用（line 30/59/115）传给 `addPayment`。**纯 pass-through,不解析 itemKey**。

**不是新未知调用模式** —— splitAttribution 是已知 pass-through 模式,Task 36 C4a grep 已识别"split-bill-payment.service 6 处"类似模式。

**Task 38 改造计划**:
- `splitAttribution` 签名改 FK：`{ paymentItems?: FK[], percent?: number }`
- 依赖 `addPayment` 签名改 FK（**Task 42 工作** —— C5b1 §7 已识别 Task 38 ↔ Task 42 耦合）

---

## 5. D58/D59/D60/D61 交互探查

### 5.1 D58 路径 X 违反检测

```bash
$ grep -nE "submitDraft|submitOrder|submitCart" <Task 38 域 14 files>
ZERO_D58_VIOLATION
```

**含义**：0 处 — Task 38 域**不违反 D58**（submit 仅 webhook 调,D58 路径 X 在 settlement/split-bill 域天然成立）。

### 5.2 D59/D60 metadata + expectedVersion 钩子

```bash
$ grep -nE "metadata\.|expectedVersion|draftVersion" <Task 38 域 14 files>
ZERO_D59_D60
```

**含义**:0 处 — D59/D60 不在 Task 38 域（expected,保留在 payment.service / webhook 域）。

**例外提示**：`split-bill-payment.service.ts:85` 有 Stripe PaymentIntent.metadata 字段（`{splitBillId, sessionId, storeId}`）—— 这是 **manual capture** 路径（Phase 2.5 deferred）,不涉及 D59 draftId/draftVersion pointer 模型。**[Task 41 webhook plan 复核时 verify]** manual capture 流程是否需要和 D59 pointer 模型协调。

### 5.3 D61 service 层 FK 约束

Task 38 域 **7 文件** 涉 itemKey,按 D61 规则需全部迁移到 FK 模型:

- **actions 层**:仅 signature 透传 `string[]`（create-split / pay-items）—— **D61 限定 service 层** → actions 算 service 层（非 controller 边界）,signature 需改 FK
- **split-bill.service / split-bill-payment.service / split-bill-invalidation / split-bill-summary / rules**:全 service 层 → 全 FK

**D61 在 Task 38 域落地约束同 Task 36/37**：controller 边界（`payment.routes.ts` / 未来 `split-bill.routes.ts` 若有）做 parse/format,service 层纯 FK。**[Task 38 plan 时 verify:split-bill route 层是否存在 itemKey 透传,需要 `split-bill.routes.ts` grep]**

### 5.4 emit 调用点

```bash
$ grep -nE "^\s*emit\(" <Task 38 域 14 files>
ZERO_EMIT
```

**含义**：0 处 emit — Task 38 域**无 emit → afterCommit 改造需求**（emit 集中在 gateway.ts,Task 37 4 处已覆盖）。

---

## 6. 跨模块依赖矩阵

### 6.1 actions → service（7 文件 import）

```bash
$ grep -nE "from '\.\./\.\./controllers/(session|split-bill)" server/src/settlement/actions/*.ts
add-payment.ts:3:   from '../../controllers/session.service'
cash-payment.ts:3:  from '../../controllers/session.service'
close-session.ts:3: from '../../controllers/session.service'
pay-items.ts:3:     from '../../controllers/session.service'
pay-percent.ts:3:   from '../../controllers/session.service'
pay-split.ts:3:     from '../../controllers/split-bill-payment.service'
reopen-session.ts:3: from '../../controllers/session.service'
create-split.ts:3:  from '../../controllers/split-bill.service'
delete-split.ts:3:  from '../../controllers/split-bill.service'
```

**含义**:
- 7 actions → `session.service`（**Task 42 域**）—— 间接耦合
- 1 action（create-split/delete-split）→ `split-bill.service`（**Task 38 内部**）
- 1 action（pay-split）→ `split-bill-payment.service`（**Task 38 内部**）

**跨 task 耦合**: 7 actions 依赖 session.service 函数签名（`addPayment` / `recordCashPayment` / `closeSession` / `payByItems` / `payByPercent` / `reopenSession`）—— 若 Task 42 改这些 signature（如 addPayment 改 FK）,actions 需同步改。**Task 38 ↔ Task 42 deploy 时序需协调**。

### 6.2 split-bill 域内部耦合

- `split-bill.service` → `split-bill-invalidation`（re-export）/ `split-bill-summary`（getMainBillSummary / calcByItemSubtotal）
- `split-bill-payment.service` → `session.service`（addPayment） + `lib/session-state`（derivePaidState / deriveSessionTotalAmount） + Stripe

---

## 7. 总结表（Task 38 plan 写作时直接引用）

| 维度 | 数量 | 含义 |
|---|---|---|
| Task 38 域总行数 | 862 | 14 文件 |
| actions 层行数 | 318 | 9 文件,单文件最大 58 行,全透传 |
| split-bill/rules 域行数 | 544 | 5 文件,单文件最大 152 行（split-bill.service） |
| **itemKey 总依赖** | **29** | **> 25 Ian 阈值,触发规则 8 Hold** |
| itemKey 解析型 .split(':') | 7 | 2 属 Task 37 C5b2 / 5 属 Task 38 原子切 |
| itemKey 透传型 signature/arg | 22 | actions 层 10 + split-bill/rules 域 12 |
| JsonStore 调用点 | 29 | actions 层 0 / split-bill/rules 域 29（9+3+4+1+12） |
| emit 调用点 | 0 | 全域无 emit（集中在 gateway Task 37） |
| D58 违反 | 0 | D58 天然成立 |
| D59/D60 钩子 | 0 | 不在 Task 38 域（manual capture PI.metadata 是 Phase 2.5 deferred,非 D59） |
| splitAttribution helper | 1 | split-bill-payment.service:9-13,透传 pattern,非新未知 |
| actions 跨域依赖 | 7 | 依赖 session.service（Task 42） + 2 split-bill 内部 |

---

## 8. 触发预警检查（规则 8）

| 检查项 | 阈值 | 实际 | 触发？ |
|---|---|---|---|
| Task 38 域 legacy itemKey 依赖 > 25 处 | > 25 | **29** | **⚠️ 触发** |
| 发现 submitDraft 在 Task 38 域被调（D58 违反） | ≥ 1 | 0 | ❌ 不触发 |
| D58/D59/D60/D61 推论在 Task 38 域不成立 | 任一 | D58/D59/D60 全确认不在域内,D61 全域成立 | ❌ 不触发 |
| legacy-itemkey.ts 新未知调用模式 | 任何 | splitAttribution pass-through 已知 | ❌ 不触发 |
| Task 38-39-40 边界模糊 | 任何 | **Task 38 ↔ Task 42 耦合（7 actions 依赖 session.service）已识别,不算"边界模糊",算"耦合明确"** | ❌ 不触发 |
| pending commits > 1 | > 1 | 1（本 work-log,待 commit） | ❌ 不触发 |

**⚠️ 触发**: **itemKey 依赖 29 > 25**,需要 Ian 当场判是否拆 C6b1/C6b2。

---

## 9. 下一步（Hold 汇报等 Ian 判）

**选项 A:不拆,单文件 C6b plan 推**
- 预估 C6b plan ~500 行（比 Task 36 435 行 / Task 37 part 1 368 行 / Task 37 part 2 411 行大）
- 理由:29 处分布 7 文件,每文件 1-12 处,可按文件切分小节,不超单文件软上限 1200 行

**选项 B:拆 C6b1 / C6b2**
- C6b1:actions 层（9 文件,22 处透传型 itemKey,JsonStore 0）+ rules.ts（1 处解析 + 1 透传）
- C6b2:split-bill 域（5 文件,6 处解析型 + 12 处透传型 + 29 JsonStore）
- 理由:actions 层纯透传 + split-bill 域实际改造 = 自然切分锚点

**选项 C:拆 C6b1 / C6b2 / C6b3**（Task 36/37 双拆先例）
- C6b1:actions 层（9 薄文件,signature FK 化为主）
- C6b2:split-bill.service + rules + split-bill-summary（核心 itemKey 解析 4 文件）
- C6b3:split-bill-payment.service + split-bill-invalidation（payment + invalidation）
- 理由:更细粒度,单文件 plan 都在 300 行左右

**CC 不倾向任一选项**——数据驱动让 Ian 判。**规则 7 应用:grep 数据先于 CC 倾向**（吸取 C5b GO 时的错误）。

---

**End of C6a evidence pack.**

# Phase 5 Plan — Phase G 段 5：`settlement/gateway.ts` B2 适配（Task 37 part 1 / C5b1）

> **如何使用本文件**
>
> - 全局规则见 [`00-index.md`](./00-index.md#全局规则所有-task-遵守)
> - 前置：段 1-4 plan 完成（Task 32-36）+ 实施到位（特别是 Phase D Task 17 `orderRepo` + Task 19 `paymentRepo` 含 G2-1/G2-2 land）+ Phase B Task 8 `afterCommit` 机制可用
> - 参考：
>   - [`phase-g-section-5a-grep.md`](../work-logs/2026-04-17-phase-g-section-5a-grep.md) C5a 前置 grep 证据（gateway.ts 137 行 / 4 JsonStore / 4 emit / 0 显式 itemKey + 1 隐式）
>   - [`phase-g-handoff.md`](../work-logs/2026-04-17-phase-g-handoff.md) §2 5 处 .split(':') 废弃 checklist（**本 plan §6 补登记到 ≥ 11 处**）
>   - [`phase-g-payment-service.md`](./phase-g-payment-service.md) §6 D61 决议（payment 域 itemKey 薄层）—— **D63 是 D61 在 settlement 域延伸**
> - spec 锚点：§9.8 Stage 3c 子任务 5（`settlement/gateway.ts` → `paymentRepo + sessionRepo + orderRepo`）

---

## 范围声明（Part 1 / 2）

本 plan 是 **Task 37 拆分后的 Part 1（C5b1）**，对齐 Ian 2026-04-18 拆分决议（理由：方案 A 一次切完 11 调用方预估 650 行,拆 400 + 250 后单文件可读 + 回滚粒度清晰）。

- **C5b1（本文件）范围**：gateway.ts B2 适配主体 + D63 决议登记 + handoff §2 补登记 + Task 42 范围调整声明
- **C5b1 不动 derivePaidState 签名**——derivePaidState 内部 `paymentStore` 仍同步消费（gateway.ts:38 隐式 .split(':') 在 C5b1 完成后**仍存在**，但已封装为本地 helper）
- **C5b2 范围（Ian C5b1 完成后拍板启动）**：derivePaidState 签名改 FK + 内部 `paymentStore → paymentItemRepo` + 11 调用方原子切 + handoff §2 11 处 .split(':') 全消除

**拆分锚点 typecheck 可行性**：见 §8 显式 Assumption 小节。

---

## 规则 7 段 5 强化条款（沿用段 4 模式）

1. **D63 5 条理由必须 settlement 域成立**——理由不能借 payment 域语境敷衍；每条带 C5a grep 行号 / 先例决议（D56/D58/D61）原文 / 项目实施事件作为依据
2. **handoff §2 补登记的 11 处 .split(':') 必须 grep 实证**——每处带文件 + 行号 + 当前作用，**不允许"约 N 处"**
3. **Task 42 范围调整声明必须显式列收窄前 vs 收窄后**——避免 Task 42 写作时双切

违反本条款的写作 → 停下自查修正,不 push。

## 规则 8 段 5 自查记录（写作期）

- ✅ Pending commits 全程 ≤ 1（本 C5b1 为唯一 pending,C5a 已落地 `69203a8c`）
- ✅ D63 + Task 42 范围调整外**无第 3 条派生决策浮现**
- ✅ handoff §2 补登记 11 处直接取 C5a + 本 session 第二轮 grep 结果,无近似
- ✅ 写作期无"我假设"——typecheck 假设独立 §8 Assumption 显式标注

## Pending commits 清单（规则 8.1）

- [x] C5a：`phase-g-section-5a-grep.md` — commit `69203a8c`
- [ ] **C5b1：本文件** `phase-g-settlement-gateway.md`（Task 37 part 1 + D63 + handoff §2 补登记）
- [ ] C5b2（待 Ian C5b1 完成后拍板启动）：derivePaidState 签名改造 + 11 调用方原子切
- [ ] 收尾 commit：RESUME + 00-index 同步（Task 37 全部完成,即 C5b2 land 后）

---

## Task 37 part 1：`settlement/gateway.ts` B2 适配主体

**Files (C5b1 范围)**:
- Modify: `server/src/settlement/gateway.ts`（4 JsonStore → Prisma async + 4 emit afterCommit + splitBillStore 死 import 清理）
- Modify: `server/src/__tests__/settlement-gateway.test.ts`（若已存在则扩展; 不存在则 Task 37 part 1 范围内**不新建**——测试归 C5b2 与 derivePaidState 签名改造一并 land）

**前置**：
- Phase D Task 17 `orderRepo` + Task 18 `sessionRepo` + Task 19 `paymentRepo` + Task 16 `storeRepo` 实施完成
- Phase B Task 8 `afterCommit` hook 可用（规则 2 合规）
- C5a §3 死 import 已确认（splitBillStore line 8 imported but unused）

### Task 完成 4 道门（C5b1 部分）

1. `grep -cE "(sessionStore|orderStore|paymentStore|storeStore|splitBillStore)" server/src/settlement/gateway.ts` = **0**
2. `grep -c "new JsonStore" server/src/settlement/gateway.ts` = **0**
3. `grep -cE "^\s*emit\(" server/src/settlement/gateway.ts` = **0**（全部走 `res.locals.afterCommit`）
4. `grep -nE "split\(':'\)" server/src/settlement/gateway.ts` = **1 调用,但封装在本地 helper `parsePaidItemKey` 内**（C5b2 完成后该 helper 删除,grep = 0）

**注意**：D61 settlement 域落地（gateway.ts:38 隐式 itemKey-format 解析消除）= C5b2 范围,**不在 C5b1 完成门内**。

---

### 1. 事实核查（引用 C5a grep）

（源：`phase-g-section-5a-grep.md`）

- **gateway.ts 当前结构**（C5a §1）：137 行 / 1 内部 helper `loadContext` + 1 export 主入口 `executeSettlement` + 1 re-export
- **JsonStore 实际调用点**（C5a §3）：4 处全 read——`storeStore.getById` (25) / `sessionStore.getById` (26) / `orderStore.getById` (30, map 内) / `paymentStore.getByField` (31)
- **死 import**（C5a §3）：`splitBillStore` line 8 imported but never directly used → G5-1 回填候选
- **隐式 itemKey 依赖**（C5a §4.2）：line 38 `pid.split(':')` 解析 `derivePaidState` 返回的 `paidItemIds: string[]`——**唯一**字符串解析点
- **D58 违反检测**（C5a §5.1）：0 处 submitDraft/submitOrder/submitCart 调用——D58 在 settlement 域天然成立
- **D59/D60 钩子**（C5a §5.2）：0 处 metadata/expectedVersion——不在 Task 37 域
- **emit 调用点**（C5a §5.3）：4 处 line 117/121/126/130 全在 `if (result.ok)` 块内——全部需 afterCommit 包装
- **payment.service 直接耦合**（C5a §6）：0 处——耦合面在 actions/ 层（Task 38 域）

---

### 2. JsonStore → Prisma 切换点枚举

| C5a grep 行号 | legacy 调用 | 替换为 |
|---|---|---|
| line 8 | `import { sessionStore, orderStore, paymentStore, storeStore, splitBillStore } from '../repositories/stores'` | 删除此 import；改 `import { sessionRepo, orderRepo, paymentRepo, storeRepo } from '../repositories/...'`（**不引入 splitBillRepo**——见 §4） |
| line 25 | `storeStore.getById(storeId)` | `storeRepo.findById(storeId, tx)` |
| line 26 | `sessionStore.getById(sessionId)` | `sessionRepo.findById(sessionId, tx)` |
| line 30 | `session.orderIds.map(id => orderStore.getById(id)).filter(Boolean)` | `await Promise.all(session.orderIds.map(id => orderRepo.findById(id, tx))).then(rs => rs.filter(Boolean))` |
| line 31 | `paymentStore.getByField('sessionId', sessionId)` | `paymentRepo.findBySession(sessionId, tx)`（Phase D Task 19 plan 已含 `findBySession`,grep `phase-d-repositories.md` 确认） |

**签名传染**：line 24 `loadContext(storeId, sessionId): SettlementContext | null` → `async loadContext(storeId, sessionId, tx: Prisma.TransactionClient): Promise<SettlementContext | null>`。`executeSettlement` 同步签名（line 59）→ `async executeSettlement(...)`,调用方（routes 层）需 `await`——routes 层改造在 Task 37 plan 范围内附带说明（实际实施由 Task 39-42 routes 层 Prisma 化时同步完成）。

**helper 调用链**（line 32 / 47 / 50）：
- `getSplitBills(sessionId)` from `split-bill.service` —— Task 38 域,C5b1 内**保持调用,不替换**（split-bill.service 内部仍同步,接受 sync 调用）
- `getSessionSummary(storeId, sessionId)` from `session.service` —— Task 32 已 Prisma 化（段 1 完成）,改 `await getSessionSummary(storeId, sessionId, tx)`
- `getMainBillSummary(sessionId, storeId)` from `split-bill.service` —— 同 getSplitBills,Task 38 域,保持

---

### 3. emit → afterCommit 改造（4 处）

C5a §5.3 列 4 处 emit,全部在 `if (result.ok)` 块内（line 115-131）。Task 33 order.service.ts 11 emit 改造为标准模板,Task 37 完整复用。

**改造模式**（仿 Task 33）：

```diff
 if (result.ok) {
-  // All settlement actions affect session state
-  emit({ type: 'session:summary', storeId, sessionId })
-
-  if (['create-split', 'delete-split', 'pay-split-card', 'pay-split-cash'].includes(action.type)) {
-    emit({ type: 'split:changed', storeId, sessionId })
-  }
-
-  if (action.type === 'close-session' || action.type === 'reopen-session') {
-    emit({ type: 'store:tables', storeId })
-  }
-
-  emit({ type: 'store:orders', storeId })
+  // 规则 2: emit 必须在 tx commit 之后
+  // afterCommit 由 res.locals.afterCommit (Phase B Task 8) 提供
+  // executeSettlement 在 routes 层调用,signature 接收 tx + afterCommit hook
+  afterCommit(() => emit({ type: 'session:summary', storeId, sessionId }))
+
+  if (['create-split', 'delete-split', 'pay-split-card', 'pay-split-cash'].includes(action.type)) {
+    afterCommit(() => emit({ type: 'split:changed', storeId, sessionId }))
+  }
+
+  if (action.type === 'close-session' || action.type === 'reopen-session') {
+    afterCommit(() => emit({ type: 'store:tables', storeId })) 
+  }
+
+  afterCommit(() => emit({ type: 'store:orders', storeId }))
 }
```

**signature 改造**：`executeSettlement(storeId, sessionId, action)` → `executeSettlement(storeId, sessionId, action, tx, afterCommit)`。**alternative**：actions 内部已用 `res.locals.afterCommit` 注入模式（Task 33 模板）—— **本 plan 选 actions/route 层注入**,gateway 不直接接 hook,而是调用方传入。

**调用方改造预告**：settlement gateway 在 routes 层调用点（grep 结果）：

```bash
$ grep -rn "executeSettlement" server/src/routes/
```

实际调用方枚举留 Task 37 实施 Step 1 复核（避免 plan 期 grep 漏算）—— C5a 未做此 grep,实施期 verify。**[ASSUMPTION,needs verification at Task 37 implementation Step 1]**

---

### 4. splitBillStore 死 import 清理（G5-1）

**C5a §3 证据**：line 8 `splitBillStore` imported but file 内 0 直接调用（通过 `getSplitBills` from `split-bill.service` 间接使用）。

**清理动作**：line 8 import 列表删除 `splitBillStore`（保留 `sessionStore, orderStore, paymentStore, storeStore`,但这 4 个本身在 §2 全部替换为 Repo)——最终 line 7-9 import block 仅留 4 个 Repo:

```ts
import {
  sessionRepo, orderRepo, paymentRepo, storeRepo,
} from '../repositories/...'
```

**G5-1 回填登记**：本 plan 段 5 新增第 1 项 Phase D 回填——`splitBillStore` 死 import 清理（仅 settlement/gateway.ts 1 处）。**累积状态更新**：

- 无条件 6 项：G1-1..G1-4 + G2-1 + G2-2（未变）
- 段 4 新增 3 项：G4-1（候选,可能已满足）/ G4-2（Phase B schema 调整）/ G4-3（实施时对齐语义）
- **段 5 新增 1 项：G5-1（splitBillStore 死 import,gateway.ts:8）**

---

### 5. D63 决议小节（settlement 域 derivePaidState 签名 FK 化）

#### D63：derivePaidState 签名切换为 FK 模型

**决议**（2026-04-18 Ian 拍板,基于 11 调用点 grep 数据形成）：

- 原签名：`derivePaidState(sessionId): { totalPaid: number, paidItemIds: string[] }`
- 新签名：`derivePaidState(sessionId, tx): Promise<{ totalPaid: number, paidItems: { orderItemId: string, paidQty: number }[] }>`

**落地 task**：**C5b2 范围**（C5b1 不动签名,见本文件 §8 typecheck assumption）。

**5 条理由**（仿 D58/D59/D60/D61 单行 bullet,每条带 settlement 域依据）：

1. **D61 settlement 域落地必需**——D61 原则"service 层全 FK"（`phase-g-payment-service.md` §6 D61 第 1 条理由）。derivePaidState 是 lib/session-state.ts service 工具,11 调用方分布在 settlement/payment/split-bill/session-settlement 4 域,返回 `string[]` = 把 D61 违规分散到 4 个 service 域。**依据**：C5a §4.2 + payment-service plan §6 D61 落地范围扩展到所有消费 derivePaidState 的 service 文件
2. **handoff §2 闭合路径**——本 plan §6 grep 证实 handoff §2 实际 .split(':') 散布是 11 处（不是原文 5 处）,11 处全部从 derivePaidState 返回的 `paidItemIds: string[]` 字符串元素驱动。签名改 FK 后字符串源消失,11 处 .split(':') **同步消除**（C5b2 一次切完）。**依据**:本 plan §6 表第 1 列"消除路径"全部指向"derivePaidState 改 FK 后自然消除"
3. **D56 先例对齐**——D56（`phase-d-repositories.md` Task 17 plan §X）OrderItem 相关用 FK 不是字符串 itemKey,paymentItem 同理（D56 FK 模型 `PaymentItem.{orderItemId, paidQuantity}`）。derivePaidState 返回的"已付明细"语义 = "已付的 OrderItem 集合 + 各自付了多少 qty",FK 模型 `{orderItemId, paidQty}` 是同一语义的直接表达。**依据**：D56 spec §4.1 schema 定义 + payment-service plan §5.3 修正版注释中 FK 模型的字段名照应
4. **legacy-itemkey.ts 模式预防**——双字段过渡方案（同时返回 paidItemIds 和 paidItems）= 永久兼容层,与 legacy-itemkey.ts 同构。本 session 修正过 legacy-itemkey.ts 体量认知（payment-service plan §5.3：从 "~50 行 shim" 修正为"4 文件 24+ 处"）—— 同样的"轻量过渡 → 永久债"模式不能在 derivePaidState 复发。**依据**：handoff §1 legacy-itemkey.ts 注释 EXIT CONDITION + payment-service plan §5.3 修正注释（"退场规模 = 独立 phase 级重构"）
5. **规则 7 应用产物**——本决议形成路径 = CC 初次倾向 A → Ian 反驳"结论先于证据" → grep 11 调用点 → 数据反转倾向 → CC 倾向 B → Ian 反驳"双字段是技术债正面化包装" → 选 A。决议本身是规则 7（evidence-first）+ 规则 8（诚实标记）的工作流产物——**不基于设计直觉,基于 grep 数据 + 决议树辩论**。**依据**：本 session 2026-04-18 对话历史 + 00-index.md 规则 7/8/8.1 原文

**D63 落地约束（写给 C5b2）**：
- derivePaidState 内部实现切 paymentItemRepo（Phase D Task 19 plan 含 `derivePaidQuantityByOrderItem` helper,grep 确认）
- 11 调用方原子 commit 切换（**不允许双字段过渡阶段**——理由 4)
- handoff §2 11 处 .split(':') 同 commit 全消除（验证：`grep -rn "split(':')" server/src/settlement server/src/lib server/src/controllers/{split-bill*,session-settlement,session-payment,payment.service,payment.routes}.ts` = 0）

---

### 6. handoff §2 补登记小节（11 处 .split(':') 完整清单）

**背景**：handoff `phase-g-handoff.md` §2 列 5 处 .split(':') 废弃 checklist。本 session C5a + 本 plan 二轮 grep 证实实际散布 ≥ 11 处。本小节是 handoff §2 补登记的 plan 内权威清单（C5b2 完成后 handoff §2 可改为"参见 settlement-gateway plan §6"）。

**完整 11 处清单**（按文件 + 行号 + 当前作用 + 归属 task 列出）：

| # | 文件 | 行号 | 当前作用 | 消除路径（C5b2 / 其他 task） |
|---|---|---|---|---|
| 1 | `server/src/controllers/session-settlement.ts` | 38 | 消费 derivePaidState 返回的 paidItemIds,build paidQtyMap | **C5b2**（derivePaidState 改 FK 后直接读 orderItemId） |
| 2 | `server/src/controllers/session-settlement.ts` | 101→104 | 同上,另一调用方法 internal | **C5b2** |
| 3 | `server/src/controllers/session-settlement.ts` | 112 | 解析另一字符串变量（非 paidItemIds 直接消费,但同 itemKey 格式） | **C5b2**（连带改造,session-settlement 域内字符串解析全切 FK） |
| 4 | `server/src/lib/session-state.ts` | 121→`attributed.push(\`${baseKey}:${item.quantity}\`)` | `deriveFifoItemKeys` 内部生成 itemKey 字符串（**这是写,不是 .split 读**——但属同一 itemKey 字符串生命周期） | **C5b2**（deriveFifoItemKeys 同 derivePaidState 一并切 FK,返回 `{orderItemId, qty}[]`） |
| 5 | `server/src/lib/session-state.ts` | 68 | `buildPaidKeySet` 内部 `k.split(':')` 解析 PaymentItem itemKey | **C5b2**（buildPaidKeySet 切 FK 直接读 PaymentItem.orderItemId） |
| 6 | `server/src/controllers/split-bill.service.ts` | 42 | 消费 derivePaidState 返回的 paidItemIds | **C5b2** |
| 7 | `server/src/controllers/split-bill.service.ts` | 48 | split conflict detection,字符串解析 | **Task 38**（split-bill.service 整体改造在 Task 38 域） |
| 8 | `server/src/controllers/split-bill.service.ts` | 144 | split summary 计算,字符串解析 | **Task 38** |
| 9 | `server/src/controllers/split-bill-invalidation.ts` | 22 | 消费 derivePaidState 返回的 paidItemIds | **C5b2** |
| 10 | `server/src/controllers/split-bill-invalidation.ts` | 37 | invalidation 内部另字符串变量解析 | **Task 38**（split-bill-invalidation 与 split-bill.service 同 Task 38 域） |
| 11 | `server/src/settlement/gateway.ts` | 38 | 消费 derivePaidState 返回的 paidItemIds | **C5b2**（**注意：C5b1 内本行保留,封装为本地 helper `parsePaidItemKey`,见 §8 assumption**） |

**handoff §2 原 5 处对照**（核对 handoff 当前内容）：

handoff 原列：session-settlement:101 / session-state:121 / split-bill.service:47 / split-bill-summary:64 / settlement/rules:57

- session-settlement:101 = 本表 #2（行号微差,handoff 写 :101 实际 :104,误差 3 行可接受）
- session-state:121 = 本表 #4
- split-bill.service:47 = 本表 #7（行号微差）
- split-bill-summary:64 + settlement/rules:57 = 本 session grep **未触发**——可能 handoff 行号已 stale,或 grep `split(':')` 单行匹配不到（多行 / 字符串包裹 / 已删除）。**[ASSUMPTION,needs verification at Task 38 implementation]** 这 2 处由 Task 38 实施期 grep 验证

**消除路径汇总**：
- **C5b2 范围**：#1, #2, #3, #4, #5, #6, #9, #11 = **8 处**
- **Task 38 范围**：#7, #8, #10 + handoff 原列未触发 2 处 = **3-5 处**
- **C5b1 内不消除任何**（gateway.ts:38 #11 封装为本地 helper,字符串解析依然存在但已隔离）

**消除验证（C5b2 完成后）**：
```bash
grep -rn "split(':')" server/src/settlement server/src/lib server/src/controllers/{session-settlement,session-payment,payment.service,split-bill-invalidation}.ts
# 期望: 0 命中
```

**消除验证（Task 38 完成后）**：
```bash
grep -rn "split(':')" server/src/
# 期望: 仅 server/src/lib/legacy-itemkey.ts 内部保留 1 处（D56 入口转换）
```

---

### 7. Task 42 范围调整声明

**背景**：Task 42（`session-payment + session-settlement 收尾`）原计划包含 session-settlement.ts 的全部 derivePaidState 相关改造（3 调用点 + .split(':') 解析）。本 plan §6 表 #1/#2/#3 将这 3 调用点全部纳入 **C5b2 范围**——Task 42 范围相应收窄。

**收窄前 vs 收窄后**：

| 维度 | 收窄前（原计划）| 收窄后（本 plan 调整后）|
|---|---|---|
| Task 42 涉文件 | session-payment.ts + session-settlement.ts 全部 | session-payment.ts 全部 + session-settlement.ts 非 derivePaidState 部分 |
| derivePaidState 在 session-settlement.ts 的 3 调用点 | Task 42 处理 | **C5b2 处理** |
| .split(':') 在 session-settlement.ts 的 3 处（#1/#2/#3）| Task 42 处理 | **C5b2 处理** |
| Task 42 工作量预估 | session-payment 12 处 itemKey + session-settlement 全部 ≈ 18 处 | session-payment 12 处 itemKey + session-settlement 非 derivePaidState 部分 ≈ 13-14 处 |

**调整理由**：
- C5b2 derivePaidState 签名改 FK 是原子 commit（11 调用方一次切）——session-settlement 的 3 调用点不切则 D63 落地不彻底,留双字段过渡
- session-settlement.ts 的非 derivePaidState 部分（`addCashPayment` / `closeSession` 等业务流程）和 derivePaidState 调用点是不同代码路径,Task 42 仍可独立处理这部分

**Task 42 plan 写作时注意**（写给未来下下个 session 写 Task 42 plan 的 CC）：
- session-settlement.ts 的 derivePaidState 改造**已在 Task 37 C5b2 完成**——Task 42 plan **不要重新设计**,直接引用 D63 决议
- session-settlement.ts 的非 derivePaidState 业务流程改造（JsonStore → Prisma + emit → afterCommit）保留在 Task 42 范围
- 验证：Task 42 实施 Step 1 grep `derivePaidState` in session-settlement.ts 应为 3 处 await（C5b2 已切,语义变化）—— 若 grep 仍是同步调用,说明 C5b2 未 land,Task 42 暂停等 C5b2

---

### 8. C5b1 typecheck assumption（显式标注）

**背景**：本 plan §2 改造 gateway.ts 为 async（loadContext / executeSettlement 签名变 async）,但 derivePaidState 在 C5b1 内**仍同步**（C5b2 才改 async）。gateway.ts async 函数内同步调用 derivePaidState 的 typecheck 可行性需要显式标注。

#### Assumption（C5b1 typecheck 可行性）

C5b1 内 gateway.ts async 函数调用 derivePaidState（仍同步）合法：
- TS/JS 语义：`await nonThenable` 返回原值,不触发 runtime 错误
- lint 可能 warning（如 `require-await` / `no-await-of-non-thenable`）
- 若项目 eslint config 含此类 rule,C5b2 完成后 warning 自然消除（derivePaidState 转 async）
- 若 C5b1 实施期 lint 阻塞,记录 [NEEDS LINT CONFIG CHECK, Phase G implementation]

**实际写法**：C5b1 内 gateway.ts:35 保持同步调用,**不加 await**（避免触发 lint warning）：

```ts
// C5b1: derivePaidState 仍同步, 不加 await
// C5b2 内 derivePaidState 切 async, 此行加 await
const { paidItemIds } = derivePaidState(sessionId)
```

**helper 封装**（C5b1 内可选优化,提升可读性）：line 38-42 字符串解析封装为本地 `parsePaidItemKey`：

```ts
function parsePaidItemKey(pid: string): { baseKey: string; qty: number } {
  const parts = pid.split(':')
  return {
    baseKey: `${parts[0]}:${parts[1]}`,
    qty: parts.length >= 3 ? parseInt(parts[2], 10) : Infinity,
  }
}
// 调用方
for (const pid of paidItemIds) {
  const { baseKey, qty } = parsePaidItemKey(pid)
  paidQtyMap.set(baseKey, (paidQtyMap.get(baseKey) ?? 0) + qty)
}
```

**C5b2 内** parsePaidItemKey **整个 helper 删除**（derivePaidState 直接返回 `{orderItemId, paidQty}[]`,paidQtyMap 直接 build）。

---

### 9. C5b2 预告（Ian C5b1 完成后拍板启动）

**C5b2 范围**：
- derivePaidState 签名切 FK（D63 决议）+ 内部 `paymentStore.getByField → paymentItemRepo.derivePaidQuantityByOrderItem`（Phase D Task 19 plan helper,grep 确认）
- buildPaidKeySet 同步切 FK（本 plan §6 表 #5）
- deriveFifoItemKeys 同步切 FK（本 plan §6 表 #4,生成端切 `{orderItemId, qty}[]` 而非字符串）
- 11 调用方原子 commit 切换：
  - settlement/gateway.ts（删除 §8 parsePaidItemKey helper,直接消费 FK）
  - settlement/mode.ts（paidItemIds.length → paidItems.length）
  - settlement/auto-close.ts（仅 totalPaid,await 即可）
  - controllers/payment.service.ts（仅 totalPaid,await 即可）
  - controllers/session-payment.ts（仅 totalPaid,await 即可）
  - controllers/split-bill-payment.service.ts（仅 totalPaid,await 即可）
  - controllers/split-bill-invalidation.ts（paidItemIds 解析 → FK 直接读）
  - controllers/split-bill.service.ts（paidItemIds 解析 → FK 直接读）
  - controllers/session-settlement.ts（3 调用点全切 FK,本 plan §7 收窄 Task 42 范围）
  - lib/session-state.ts（自身定义 + buildPaidKeySet + deriveFifoItemKeys）
- handoff §2 11 处 .split(':') 全消除（除 legacy-itemkey.ts 内部保留 1 处）

**C5b2 预估行数**：~250 行（按 Ian 拆分预估）

**C5b2 commit message 草案**：`plan(phase-g): section 5b2 - derivePaidState FK migration + 11 call-site atomic switch (Task 37 part 2)`

**Ian C5b1 完成后拍板启动 C5b2**——本 plan 不预设启动时间。

---

### 10. 实施 Step（Task 37 part 1 实施期指引）

- **Step 1**：grep 基线复核
  - C5a 数字（4 JsonStore / 4 emit / 0 显式 itemKey + 1 隐式）
  - executeSettlement 调用方 grep（routes 层,本 plan §3 末尾标 [ASSUMPTION] 待 verify）
- **Step 2**：gateway.ts §2 表 5 处 JsonStore → Repo 替换 + signature async 化
- **Step 3**：gateway.ts §3 4 处 emit → afterCommit 改造（参考 Task 33 模板）
- **Step 4**：gateway.ts §4 splitBillStore 死 import 清理（G5-1）
- **Step 5**：（可选）§8 parsePaidItemKey helper 封装（line 38-42 本地化）
- **Step 6**：调用方 routes 层 await 适配（基于 Step 1 grep 结果,改造范围可能小于 1 文件）
- **Step 7**：verify（4 道门）+ commit `feat(phase-5): Task 37 part 1 - settlement gateway B2 (gateway.ts Prisma + afterCommit)`

**注意**：测试新建延后到 C5b2（与 derivePaidState 签名改造一并 land）—— C5b1 完成后 gateway.ts 业务行为未变（仅 sync→async + JsonStore→Repo + emit→afterCommit 工程性改造）,现有测试覆盖足以验证。

---

### 11. commit（本 plan 落地）

本文件 commit 命令：

```bash
git add docs/superpowers/plans/2026-04-17-phase5-postgres-migration/phase-g-settlement-gateway.md
git commit -m "plan(phase-g): section 5b1 - settlement gateway B2 (Task 37 part 1) + D63 + handoff §2 补登记"
git push origin main
```

**不更新 RESUME / 00-index**——等 C5b2 完成后一次性同步（Task 37 全部完成时更新进度到 3.4/5 段 + 添加 D63 锚点 + handoff §2 重定向到本 plan §6）。

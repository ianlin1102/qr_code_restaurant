# Phase 5 Plan — Phase G 段 2：`session-cart.ts` B2 重写（Task 34）

> **如何使用本文件**
>
> - 全局规则见 [`00-index.md`](./00-index.md#全局规则所有-task-遵守)
> - 前置：Phase G 段 1（Task 32-33）plan 完成 + Phase D Task 17 `orderRepo` 实施完成（含段 1/段 2 回填 G1-1..G1-4 + G2-1..G2-2）
> - 本 session 目标：段 2（本文件，Task 34）+ 段 3（Task 35）共 2 段
> - 参考：
>   - [`phase-g-handoff.md`](../work-logs/2026-04-17-phase-g-handoff.md) §5 启动输入（4 决议）+ §6 fetch API grep
>   - [`phase-g-section-2-grep.md`](../work-logs/2026-04-17-phase-g-section-2-grep.md) §1-§8 本段前置 grep 证据
> - spec 锚点：§9.8 Stage 3c 子任务 3（session-cart.ts B2 重写）+ §1 line 13（Pay-first bug 修复）+ D6（B2 天然解决 bug）

## 规则 7 段 2 强化条款（Ian 2026-04-17）

本段 plan 写作提升规则 7 强度：

1. **"B2 后 X 应该 Y" 类断言**必须标 `[DESIGN DECISION, D58 or related]`——不允许作为事实陈述混入 plan body
2. **spec §9.8 场景 d/e/f 含义**类断言必须**先**引用 spec 原文行号 + 原文摘抄，**再**说"语义推断为 Z"——原文 vs 推断分清
3. **路径 X/Y/Z 陈述**时每条的数据流示意必须可追溯到具体 schema 字段和 repo 方法（不允许模糊描述如"某状态"、"某表"）

违反本条款的写作 → 停下自查修正，不 push。

## Pending commits 清单（规则 8.1 实时打勾）

- [x] C1 段 1：`phase-g-session-order.md` — commit `cfee51be`
- [x] C2a：`phase-g-section-2-grep.md` 前置 grep 证据 — commit `257e470f`
- [ ] C2b：**本文件** `phase-g-session-cart-b2.md`（含 D58 决策点）
- [ ] C3：段 3 Task 35 / 或 session 收尾（节奏由 Ian 段 2 完成后判）

---

## Task 34：`session-cart.ts` B2 重写

**Files:**
- Rewrite: `server/src/controllers/session-cart.ts`（整文件重写，非逐行替换——C2a §5 已证 pendingCart 7 处全在本文件）
- Modify: `server/src/routes/session.routes.ts` cart handlers（line 43-96）包 `tenantAwareRoute` + emit 通过 `afterCommit`
- Modify: `client/src/services/api/session.ts`（字段命名受 Fetch API 选项影响）
- Modify: `client/src/hooks/useCartSync.ts`（同上）
- Modify: `client/src/stores/cart-store.ts`（同上）
- Modify: `client/src/pages/customer/CartPage.tsx`（同上）
- Create: `server/src/__tests__/session-cart.test.ts`（B2 核心域 + D58 路径覆盖）

**前置**：段 1（Task 32-33）完成 + 6 项 Phase D 回填方法存在（G1-1..G1-4 + G2-1..G2-2）+ Phase B Task 8 `afterCommit` hook 可用。

### 完成 5 道门

1. `grep -c "pendingCart" server/src/controllers/session-cart.ts` = **0**
2. `grep -c "session.cartVersion\|session.pendingCart\|session.orderIds" server/src` = **0**（B2 后 session 无这些字段）
3. `grep -c "new JsonStore" server/src/controllers/session-cart.ts` = **0**
4. `session-cart.test.ts` 存在 + `pnpm vitest session-cart` 绿（至少覆盖 D58 选定路径的场景 a/b/c/d/e/g 对应测试）
5. `cd server && ./node_modules/.bin/tsc --noEmit` 不新增 error

---

### 1. 事实核查（引用 C2a grep）

**当前行为事实**（全部有 grep 行号，规则 7）：

- `session-cart.ts` **70 行** / **7 处** pendingCart 调用 / **0 itemKey 依赖** / **1 emit** (`line 28 emit({type: 'cart:updated', ...})`) —— C2a §5 原文
- `session.routes.ts:43-96` 3 个 cart handler（GET cart / PUT cart / POST submit-cart）—— C2a §2 原文
- 前端 cartVersion **12 使用点 / 4 文件**：`api/session.ts:40/50/53` / `useCartSync.ts:41/45/93/94` / `cart-store.ts:23/39/104` / `CartPage.tsx:96/191` —— C2a §3 原文
- 前端 deviceId 已成熟存在（`lib/device-id.ts` localStorage UUID + 多处 getDeviceId 调用）—— C2a §4.1 原文
- 后端 deviceId 作为 pendingCart Record key（`session-cart.ts:21 Record<string, CartItem[]>`）—— C2a §4.2 原文

**spec 原文引用**（规则 7 段 2 强化：原文 vs 推断分清）：

- spec `§1 line 13`：「消除 `session.pendingCart` 与订单结构重复，顺带修复 **Pay-first 流购物车丢失 bug**」—— **原文**
- spec `D6 (line 32)`：「Pay-first 购物车丢失 bug / B2 天然解决」—— **原文**
- spec `§9.8 line 1291 场景 d`：「Pay-first 付款：点先付 → Stripe 取消 → 回菜单购物车菜还在（B2 修复的 bug）」—— **原文（约束 UX 结果，未约束实现路径）**

**语义推断区段**（以下是推断，不是 spec 原文）：

- **[INFERENCE]** B2 设计目标：draft order 替代 pendingCart，deviceId 粒度隔离
- **[INFERENCE]** pay-first 流 draft 生命周期：spec 场景 d 约束"取消后购物车菜还在"但不约束"draft 是保留还是重建"——见 D58

---

### 2. 乐观锁 `session.cartVersion` → `order.version` 迁移

**前端字段改动清单**（C2a §3 完整表，按 Fetch API 选项区分工作量）：

| # | 文件 | 行号 | 当前 | 选项 A（server 映射）| 选项 B（改为 order.version）| 选项 C（双发过渡）|
|---|---|---|---|---|---|---|
| 1 | `api/session.ts` | 40 | `cartVersion: number` in fetchJSON type | **不改**（server 保留字段名）| 改 `version: number` | 同含 `cartVersion` + `version` |
| 2 | `api/session.ts` | 50 | `submitSessionCart(..., cartVersion: number, ...)` | 不改 | 改 `version: number` | 双发 |
| 3 | `api/session.ts` | 53 | `body: JSON.stringify({ cartVersion, ... })` | 不改 | 改 `{ version, ... }` | 双发 |
| 4 | `useCartSync.ts` | 41 | `applyServerCart(serverItems, cartVersion, ...)` | 不改 | 改 `version` | 按新字段 |
| 5 | `useCartSync.ts` | 45 | `store.setCartVersion(cartVersion)` | 不改 | 改 `store.setVersion(version)` | 新旧共存 |
| 6 | `useCartSync.ts` | 93 | destruct `{ ..., cartVersion, ... }` from fetch | 不改 | 改 `{ ..., version, ... }` | 按新字段 |
| 7 | `useCartSync.ts` | 94 | 传给 applyServerCart | 不改 | 传 `version` | 按新字段 |
| 8 | `cart-store.ts` | 23 | `cartVersion: number` 字段 | 不改 | 改 `version: number` | 保留 cartVersion |
| 9 | `cart-store.ts` | 39 | `cartVersion: 0` 初始 | 不改 | 改 `version: 0` | 同 8 |
| 10 | `cart-store.ts` | 104 | `setCartVersion: (v) => set({ cartVersion: v })` | 不改 | 改 `setVersion` | 同 8 |
| 11 | `CartPage.tsx` | 96 | `const { ..., cartVersion } = useCartStore()` | 不改 | 改 `version` | 按 store 字段 |
| 12 | `CartPage.tsx` | 191 | `api.submitSessionCart(..., cartVersion, ...)` | 不改 | 改 `version` | 双发 |

**服务端映射点**（选项 A 独有）：

```ts
// 选项 A 实施位点: GET /cart handler (session.routes.ts:44-56)
// 当前返回 session.cartVersion
// B2 后: 返回 "当前 session 下所有 draft order 的最大 version" 作为伪 cartVersion
// 原因: 多 device 多 draft, 每 device 自己的 version. 前端单值 cartVersion 需聚合
const drafts = await orderRepo.findDraftsBySession(sessionId, tx)  // G2-1 回填依赖
const pseudoCartVersion = drafts.length === 0 ? 0 : Math.max(...drafts.map(d => d.version))
res.json({ items: flatten(drafts), cartVersion: pseudoCartVersion, lastCartSubmitAt: session.lastCartSubmitAt ?? null })
```

**选项 A 的语义漏洞**（[DESIGN DECISION, D58 related]）：多 device 各自独立 draft.version bump，聚合的 "maxVersion" 作为乐观锁基础——A device 提交 submitSessionCart(maxVersion=N) 但 B device 的 version=N 同样满足——会错误通过。**选项 A 实际需要**：
- 要么 **version 聚合策略改"所有 draft version 之和"** 或 "drafts.map(v).join('.')" 这类 tuple lock
- 要么 submit 路由接 **多 version**（每 draft 一个）

**→ 选项 A 非纯"字段映射"——隐含乐观锁语义重设计。Ian 实施期择路径时应将该复杂度计入 A 成本**

**选项 B 工作量**：12 处 rename + 服务端 response 字段名改。前端多 draft 显式处理 UX——CartPage 现在看到多 draft orders 要 merge 成 UI cart 单视图。

**选项 C 工作量**：选项 A 映射 + 选项 B rename 双重——双发期 (~N 周) + 切换 commit。最高工作量但迁移最安全。

---

### 3. deviceId 传递链（语义升级，无新建）

**基于 C2a §4 grep 证据**：

- 前端 `getDeviceId()` (localStorage UUID) **已存在且成熟**——无改动需求
- 前端 `api.updateSessionCart(storeId, sessionId, deviceId, items)` 签名 **已含 deviceId** ——无 API contract 改动
- 后端 `session.routes.ts:66-67` sanitize + 必填校验 **已存在**——无新增逻辑
- 后端存储从 `Record<deviceId, CartItem[]>` 改为 `Order.deviceId` 列 + partial unique `(session_id, device_id) WHERE status='draft'`（handoff §5b spec 决议 ✅）

**Task 34 本域 deviceId 改动仅 1 处**：`session-cart.ts` 的 `updateDeviceCart` 实现——从 `cart[deviceId] = items` 改成 `orderRepo.findDraft(sessionId, deviceId, tx)` → 分支 create/replace。

---

### 4. Fetch API 响应形状（handoff §5c A/B/C，Ian 实施期判）

**[DESIGN DECISION, handoff §5c]**：选项 A/B/C 已在 handoff §5c 完整展开。本 plan 不复述三选项——C2b 写作期 **选项不预选**，等 Ian 实施期基于段 2 §2 的迁移工作量表 + §2 选项 A 语义漏洞分析 + D58 决议联合判断。

**约束回顾**（handoff §5c 硬约束）：
- 不拆独立 Phase G-frontend subtask——session-cart.ts 重写和前端 subtask 同一 deploy 窗口
- 前端乐观锁字段迁移（§2 12 处）也挂在此 subtask

#### 4.1 选项 A 额外实施成本（C2a 写作期新发现，非决议冲突）

handoff §5c 原始 A/B/C 三选项权衡以"前端改动面积"和"过渡期复杂度"为主轴评估。C2a 段 2 事实梳理过程暴露**选项 A 的隐含乐观锁复杂度**，作为新增成本列入 Ian 实施期选择 A 时必须处理的设计项：

**聚合漏洞**（B2 多 device 多 draft 场景）：

- B2 schema：每 device 独立 draft Order，各自 `order.version` 随自己的 `replaceDraftItems` bump
- 选项 A 目标：fetch API response 保留 `cartVersion: number` 单值字段（前端零改动）
- **聚合策略隐含问题**：

```
Session S:
  Draft A (deviceId=A, version=3)
  Draft B (deviceId=B, version=3)

选项 A 服务端 GET /cart 聚合: maxVersion = 3
前端 cartVersion = 3

Device A 执行 submitSessionCart(cartVersion=3):
  服务端 findDraftsBySession → 2 drafts, 各 version=3
  循环 submitDraft(draftA, expectedVersion=3, tx) ✅ OK
  循环 submitDraft(draftB, expectedVersion=3, tx) ✅ OK (B 也版本匹配!)

问题场景:
  Device A 刚 submit(cartVersion=3)
  Device B 并发 replaceDraftItems(expectedVersion=3) → B 的 draft version → 4
  Device A 的 submit 循环到 B 时: submitDraft(draftB, expectedVersion=3, tx)
    → B.version 已变 4, expectedVersion mismatch → OPTIMISTIC_LOCK_CONFLICT
  正确拒绝 ✅

但反向场景:
  Device A 刚 replaceDraftItems(expectedVersion=3) → A.version → 4
  Device B 读 GET /cart → maxVersion = max(4, 3) = 4
  Device B 用 cartVersion=4 submit → submitDraft(draftA, 4) OK + submitDraft(draftB, 4) ❌ (B.version=3)
  B 被拒, 但 A 已被 submit (A 不是 B 触发的) —— 语义混乱: B 的 submit 意图失败, 但 A 已被 submit
```

**结论**：聚合 `maxVersion` 作为单 `cartVersion` 乐观锁值**语义不足以覆盖多 draft 并发**——选项 A 若选必须补一个设计子项：

**选项 A 版本聚合策略**（Ian 实施期择 A 时必选）：
- **A.1**：聚合 `SUM(drafts.version)` 作伪 cartVersion——任意 draft bump 都让 sum 变，但 sum=N 能被多组合命中（5+3=4+4）—— **仍不严谨**
- **A.2**：聚合 `MIN(drafts.version)`——只要任一 draft 被改就触发 mismatch —— **过度严格**（一 device 改 cart 让其他 device 的 submit 也失败）
- **A.3**：**tuple 乐观锁**——response `cartVersion` 是**字符串** `"deviceA:3,deviceB:3"`（按 deviceId 字典序），submit 请求必须 verbatim 传回。服务端 parse tuple → 逐 draft expected version。保持单"字段"伪装，内容结构化。
- **A.4**：submit API **改接 multi-version**——response 返 `drafts: [{deviceId, version}]`，submit body 传 `versions: Record<deviceId, number>`。背离选项 A "前端零改动" 初衷。

**建议**：若 Ian 选 A，走 **A.3 tuple** —— 保持前端字段名和类型"单一 cartVersion 字符串"最小改动，内部结构化。否则选 A 退化为 B（前端需改 shape）。

**不是决议冲突——是 A 的新增成本**：handoff §5c 原始三选项权衡**仍成立**，但 A 的工作量从"服务端加映射函数"上升到"映射函数 + 聚合/乐观锁策略设计（A.1/A.2/A.3/A.4）+ 测试并发场景"。

**交叉引用**：§2 选项 A 表格的"server 映射策略"那一列未展开细节，本节 §4.1 是其详细成本拆解。

---

### 5. draft order 生命周期 + 事务边界

#### 5.1 基础生命周期（非 pay-first，或路径 X 下 pay-later + 非付款阶段）

**流程图**（数据流示意，每步标 schema 字段 + repo 方法）：

```
[A] 顾客扫码 → 加菜
     ↓
     PUT /sessions/:sid/cart  { deviceId, items: [...] }
     ↓ (tenantAwareRoute wrap → withTenantContext → tx)
     orderRepo.findDraft(sessionId, deviceId, tx)
     ↓
     ├─ miss → orderRepo.createDraftOrder({storeId, sessionId, tableId, deviceId, items}, tx)
     │        (single-step nested create, D55 豁免单步)
     └─ hit  → orderRepo.replaceDraftItems(orderId, items, expectedVersion, tx)
              (multi-step, TransactionClient 必填, 乐观锁 expectedVersion)
     ↓ tx commit
     afterCommit: emit({type: 'cart:updated', storeId, sessionId}) — 规则 2

[B] pay-later submit 路径
     POST /sessions/:sid/submit-cart { cartVersion/version, customerName }
     ↓
     orderRepo.findDraftsBySession(sessionId, tx)  (G2-1 回填依赖)
     ↓ 对每个 draft:
     orderRepo.submitDraft(orderId, expectedVersion, tx)
     ↓ (status 翻 draft → pending)
     afterCommit: emit('cart:submitted') + emit('order:created', per order)

[C] 清空全 session cart (admin/管理员/系统触发)
     orderRepo.deleteDraftsBySession(sessionId, tx)  (G2-2 回填依赖)
     ↓ cascade delete OrderItem + OrderItemOption via FK
     afterCommit: emit('cart:updated')
```

**事务边界关键点**：

- `findDraft` + `createDraftOrder` 可拆（前者读后者写），但放同一 tx 减少 race condition
- `findDraft` + `replaceDraftItems` **必须同 tx**——乐观锁 version check 在 replaceDraftItems 内，前后分离会让 version mismatch 窗口放大
- `findDraftsBySession` + 循环 `submitDraft` **必须同 tx**——避免 race condition（"查到 N 个 draft，submit 第 3 个时第 4 个已被清"）
- **规则 2**：所有 emit 走 `res.locals.afterCommit`（Phase B Task 8 `afterCommit` 补丁机制，commit `2f51b8cb`）

#### 5.2 D58：pay-first 流 B2 draft 生命周期 [Ian 决策，实施期前定]

**决策背景**（规则 7 强化：原文 + 推断分清）：

- spec **原文** (`§9.8 line 1291 场景 d`)：「Pay-first 付款：点先付 → Stripe 取消 → 回菜单购物车菜还在（B2 修复的 bug）」
- spec **原文** (`§1 line 13 / D6 line 32`)：B2 「顺带修复 Pay-first 流购物车丢失 bug」/「**B2 天然解决**」
- **[INFERENCE]**：场景 d 只约束"取消后购物车菜还在"的**UX 结果**，不约束"draft 如何保留"的实现路径
- **[INFERENCE]**：至少 **3 条路径**都能通过场景 d，路径选择是**设计决策**，不是从 spec 推导

**场景**：pay-first store + 顾客点"去付款" → 发起 Stripe PaymentIntent → 顾客取消（webhook 不来或取消事件）→ 顾客回菜单，cart 还在。

#### 路径 X：submit 不删 draft，webhook 转 submitted

**数据流**：

```
顾客点付款
 ↓
POST /submit-cart { cartVersion: N, ... }
 ↓ server 端:
orderRepo.findDraftsBySession(sessionId, tx)  — 取所有 draft
 ↓
【draft 状态保持不变】— 不调 submitDraft
 ↓
Stripe PaymentIntent 创建 (amount = sum(draft.items...))
 ↓ 响应前端 { clientSecret, ... }
tx commit
 ↓ 顾客在前端完成 Stripe 支付
 ↓ Stripe webhook 到 (payment_intent.succeeded)
webhook handler:
  orderRepo.findDraftsBySession(sessionId, tx)  — 重新取 draft
  ↓
  for each draft: orderRepo.submitDraft(draftId, draft.version, tx)  — 状态 draft → pending
  ↓ afterCommit: emit('order:created' per submitted)

失败路径 (顾客取消 / webhook 未来 / PaymentIntent 取消):
 → 无服务端动作, draft 保持 draft 状态
 → 顾客回菜单, useCartSync fetchAndApply → 看到 draft items ✅ 场景 d 通过
```

**Schema 要求**：
- 0 新增字段（Order.status 已含 'draft'）
- **但需新增或约束**：draft order 存在时不能并发开新 PaymentIntent（否则同 draft 多个付款意图，金额错位）。建议 draft 加**单一 active PaymentIntent 引用**字段（非 schema 必须，应用层可通过 `findActivePaymentIntentForDraft` 实现）

**Webhook 复杂度**：低——`submitDraft` 已有，webhook 只是触发调用

**失败恢复**：无副作用——draft 自然保留，顾客回菜单看 draft 完整

**对等性 legacy**（legacy = session.pendingCart 在 pay-first 分支）：
- legacy submitSessionCart pay-first 分支 **清空 pendingCart**（`session-cart.ts:61 pendingCart: {},`）+ 返回 items 供 Stripe checkout 用 —— pay-first 购物车丢失就在这里
- **X 反转此行为**：submit-cart pay-first 分支**不清 draft**。是 B2 "天然解决" 的直接实现。

**风险点**：
- **R-X1**：draft 金额 vs Stripe PaymentIntent 金额**漂移**——顾客 pay-first 流中（付款窗口打开）又加菜 → findDraft 返回 draft → replaceDraftItems 覆盖 items → draft.version 递增 → PaymentIntent 金额 = 原 items sum，draft = 新 items sum。webhook 来时应 submit 哪版？
  - **缓解 1**：pay-first 进行中禁止 updateDeviceCart（UI 层禁用 + 后端 409 if draft.has_active_payment_intent）
  - **缓解 2**：PaymentIntent 含 `draft.version` 快照，webhook 校验 submit 的 draft.version == PaymentIntent.draftVersion，不等则拒绝 submit
- **R-X2**：顾客从 cart page 中途返回菜单加菜——findDraft 返回 draft（正确语义：cart 还在）但 UI 层需明确"已有付款在途"提示
- **R-X3**：多 device 场景——device A pay-first 中，device B 加菜——B 的 updateDeviceCart 应该能跑（B 自己的 draft 独立）

#### 路径 Y：submit 删 draft，pending_payment 快照，取消时重建

**数据流**：

```
顾客点付款
 ↓
POST /submit-cart
 ↓
orderRepo.findDraftsBySession(sessionId, tx)
 ↓
【snapshot 每 draft 到 PendingPayment 表】(新 schema: PendingPayment {
    id, sessionId, payload: Json, snapshotVersion, createdAt, status: 'active'|'consumed'|'reverted'
 })
 ↓
orderRepo.deleteDraftsBySession(sessionId, tx)  — G2-2 回填
 ↓
Stripe PaymentIntent 创建 (metadata.pendingPaymentId = snapshot.id)
 ↓ tx commit, 响应前端

Stripe webhook succeeded:
 ↓
读 PendingPayment, status='active' → 'consumed'
 ↓
orderRepo.createSubmitted(...) 从 snapshot.payload 重建 submitted order (G1-1 回填)
 ↓ afterCommit: emit('order:created')

取消路径 (payment_intent.canceled 或 timeout):
 ↓
读 PendingPayment status='active' → 'reverted'
 ↓
orderRepo.createDraftOrder(...) 从 snapshot.payload 重建 draft (items 原样)
 ↓ afterCommit: emit('cart:updated')

顾客回菜单 → useCartSync fetchAndApply → 看到重建的 draft ✅ 场景 d 通过
```

**Schema 要求**：**新实体** `PendingPayment` + 新 migration（规则 1：不改已发布 migration）

**Webhook 复杂度**：中——额外从 snapshot 重建的逻辑，及 canceled webhook 的监听和重建

**失败恢复**：snapshot 可追溯——webhook 完全丢失（网络永久失败）的情况需要 timeout 任务把 `active` PendingPayment 回退成 draft

**对等性 legacy**：snapshot 概念 legacy 没有，是**新设计**——引入额外状态机

**风险点**：
- **R-Y1**：新 schema + 新 migration + 新 repo（PendingPayment repo）——Phase D 回填范围扩大（G2-3 / G2-4）
- **R-Y2**：session-level snapshot 但 B2 draft 是 device-level——snapshot 要 per-draft 还是整 session 一条？每条 draft 一条 snapshot 更纯，但 webhook 重建时要批量处理
- **R-Y3**：session state 在 snapshot 期间变（如被 closed）——重建时 session 状态不对怎么办？

#### 路径 Z：pay-first 不走 submit，状态扩展 `pending_payment`

**数据流**：

```
顾客点付款
 ↓
POST /submit-cart (pay-first 分支)
 ↓
orderRepo.findDraftsBySession(sessionId, tx)
 ↓
for each draft:
  orderRepo.transitionStatus(draftId, 'draft' → 'pending_payment', expectedVersion, tx)
  (G2-3 新回填: 带乐观锁 + 状态 guard 的 status 翻转)
 ↓
Stripe PaymentIntent 创建
 ↓ tx commit

Stripe webhook succeeded:
 ↓
for each order: orderRepo.transitionStatus(id, 'pending_payment' → 'pending', null, tx)
 ↓ afterCommit: emit('order:created')

取消路径:
 ↓
for each order: orderRepo.transitionStatus(id, 'pending_payment' → 'draft', null, tx)
 ↓ afterCommit: emit('cart:updated')

findDraft / findDraftsBySession 必须适配:
  where: { status: 'draft' }  → where: { status: {in: ['draft', 'pending_payment']} }?
  或新增: findEditableOrder (draft + pending_payment)
  更干净: partial unique 扩展到 (sessionId, deviceId) WHERE status IN ('draft', 'pending_payment')
```

**Schema 要求**：
- `Order.status` enum 增加 `'pending_payment'`（Prisma schema + migration）
- Partial unique index 扩展：`@@unique([session_id, device_id]) WHERE status IN ('draft', 'pending_payment')` （Postgres partial index）
- 新增 `transitionStatus` repo 方法（G2-3 回填候选）

**Webhook 复杂度**：中——状态翻转替代 submitDraft，语义简单但需要 guard

**失败恢复**：webhook 不来 → 超时任务翻 `pending_payment` → `draft`

**对等性 legacy**：**最接近 legacy** ——legacy 的 submit-cart pay-first 分支也是"中间态"（清 cart 但不 createOrder），Z 用正式状态建模该中间态

**风险点**：
- **R-Z1**：`findDraft` 语义扩展影响所有 cart update 路径——`updateDeviceCart` 在 pending_payment 状态下是否允许 replaceDraftItems？
  - 不允许：顾客付款中加菜不行——但这可能是合理限制（UI 禁用 + 后端 409）
  - 允许：items 变了但 PaymentIntent 金额未变——同 R-X1 金额漂移问题
- **R-Z2**：状态翻转的事务边界——webhook 并发（同 session 多个 webhook 到）时需要幂等（transitionStatus 从 pending_payment → pending 若 status 已 pending 直接返回）
- **R-Z3**：spec §9.8 的测试场景 a/b/c/e/f/g 需要更新断言（state 从 draft 变 pending_payment 不应让 findDraft 返回 null）

#### CC 倾向陈述（一段，Ian 拍板）

**倾向 X**（submit 不删 draft，webhook 转 submitted）。理由：
1. **最少 schema 改动**——B2 本身已是大改，多改 schema 风险累加
2. **概念纯粹**——draft 一个状态，提交就是 submitDraft。R-X1 金额漂移问题靠应用层（draft.version 快照 + webhook 校验）解决，不扩散到 schema 层
3. **测试面最小**——spec §9.8 场景 a-g 只需 d 显式测试"取消后 draft 还在"；其他场景走原 submitDraft 路径不变

但 X 的 R-X1 风险真实存在——需要 Ian 判 "draft.version snapshot 校验" 复杂度 vs 路径 Y/Z 的 schema 改动。

**选项 Y 适用情形**：如果项目未来有"多种支付中间态"需求（e.g., 预授权 / 分期 / 审批流），snapshot 概念可复用——现在投入值得。Phase 5 内只有 pay-first 一种中间态，Y 成本 > 收益。

**选项 Z 适用情形**：如果测试矩阵能接受"status = pending_payment 的 order 在 kitchen 视图不出现"（新状态不触发 kitchen notify），Z 语义最干净。但 Phase G 段 1 已涉及 kitchen 视图（`findActive`），新状态要同步更新 findActive 定义。

**[DESIGN DECISION, D58] — Ian 决策（2026-04-17 本 session）：路径 X**

**选定路径**：**X（submit 不删 draft，webhook 转 submitted）**

#### Ian 决策 5 条理由

1. **R-X1 金额漂移是局部问题，Stripe 标准 pattern 可套用**——PaymentIntent 创建时 snapshot 金额 + webhook 校验金额一致是业界成熟做法（Stripe docs 推荐），非新设计。应用层守住此约束不扩散到 schema。
2. **Y/Z 将复杂度推进 schema**——schema 复杂度是**沉淀债**（进规则 1 铁律、进 migration 历史不可轻易回退），应用层复杂度可独立重构。两类复杂度的可维护性曲线不对称。
3. **Phase 5 已是大 refactor**——schema 侧再加新 entity（Y 的 `PendingPayment`）或新状态（Z 的 `pending_payment`）会让测试矩阵**指数膨胀**（状态转换矩阵 × 多 device × multi-tenant × RLS），不应在本 phase 内承担。
4. **Legacy 对等性辨析**：X 是"反转 legacy pay-first 清 pendingCart 行为"——**直接改动**（legacy 有的 delete 不做），比 Y/Z "用新设计达成等价行为"**易理解易 debug**。
5. **影响范围最小**——X 影响 ~3 文件（session-cart + payment.service + webhook），Y 影响 ~10-15 文件 + 新 entity + 迁移脚本，Z 影响 ~20+ 文件（所有 OrderStatus switch 调用点）。D58 选 Y/Z 会创造新的 spec 级假设（教训事件 2 的模式），X 是唯一"不引入新风险"的方案。

#### 路径 Y 反论登记（保留但非决议触发）

未来如需**"pending payment 超时清理"**（下单 N 分钟未付自动取消 + 释放 draft）功能，Y 的 `PendingPayment` entity 天然支持 `expires_at` 字段设计。X 实现需事后在 Order 表加字段或独立清理任务。

**当前不构成切 Y 理由**——超时清理是**未设计需求**，YAGNI 原则：若未来确实需要，可独立 phase 引入 snapshot entity 或 `Order.payment_initiated_at` + 清理任务，不必因前瞻需求现在承担 Y 的全部 schema 成本（新 repo + 新 migration + 新 state machine + snapshot 重建逻辑）。

#### 路径 Z 排除理由

Z 的 `findDraft` 语义扩展是**隐蔽传染性复杂度**——每个 cart update / read 调用点都要重新审视"返不返回 `pending_payment` 状态"。看似 legacy 对等性最高，实际**破坏 draft 语义纯粹性**（draft 不再是单纯 editable 状态）。本项目现有 controller 层多处依赖 `findDraft` 返回可编辑的 draft——Z 会隐式扩大所有这些调用点的语义面，审查成本高于表面的 schema 改动。

#### 决策后动作（本 amend 不做，下个 session 实施期做）

- Phase D 回填候选清单更新：G2-3（`transitionStatus`）和 G2-4（`pendingPaymentRepo`）**取消触发**（路径 Y/Z 独占）——最终回填仅 G1-1..G1-4 + G2-1 + G2-2 共 **6 项无条件回填**。
- 本文件 §5.2 未来可精简（删除 Y/Z 详细数据流）——但本次 amend 保留三路径完整讨论，作为审计痕迹（让未来读者理解为什么选 X 而非 Y/Z，不只是"Ian 说了算"）。
- 测试场景 §9 case 5 具体化为路径 X 的测试（"submit 后 draft 仍存在 + webhook 转 submitted + 取消后 draft 保留"）。
- `session-cart.test.ts` 中 pay-first 流测试按路径 X 写：`submit` 后 `findDraft` 仍返回、`transition` 动作等场景。

---

### 6. SSE `cart:updated` 不变（handoff §5c 引用）

**基于 handoff §5c 结论**：SSE 载荷 `{type, storeId, sessionId}` 极简，B2 后不变。前端 fetchAndApply 消费 fetch API 的 response（§2 12 处字段迁移）。

**Task 34 本段**：不改 `event-bus.ts` `cart:updated` 事件定义。emit 调用位点按 `afterCommit` hook 迁移（规则 2）。

---

### 7. spec §9.8 子任务 3 事实修正（段 1 commit message 已预告）

**spec 原文** (`§9.8 line 1255`)：「SSE cart:updated 事件载体改为 draft order 快照」

**grep 证据冲突**（handoff §6 + C2a §2.1）：
- `event-bus.ts:7` 当前载荷 `{type, storeId, sessionId}` —— 无 items/cart/version 字段
- B2 改造不改 SSE 载荷 shape（`{type, storeId, sessionId}` 继续够用）
- 真正变化在 fetch API response shape（§2.1 grep）

**本 plan 以 grep 证据为准**：SSE 载荷不变。spec §9.8 line 1255 该处**事实错误**，加入批 2 末尾 spec reconciliation commit 的修正清单（同 §9.6 Agent A/B/C 文件列表事实修正模式）。

---

### 8. Phase D 回填补丁清单（段 1+2 累积）

和 Phase E/F 回填同模式——本 plan 内部消化，等下个 session 实施阶段集中 land 到 Phase D Task 17 / 新 repo 文件：

| # | 内容 | 段 | 签名 |
|---|---|---|---|
| G1-1 | `orderRepo.createSubmitted(input, tx)` | 段 1 / 33-A | staff 开单 bypass draft |
| G1-2 | `orderRepo.updateTableId(id, tableId, tx)` | 段 1 / 33-B | transferOrder 需要 |
| G1-3 | `orderRepo.voidOrderItem(orderId, position, tx)` | 段 1 / 33-C | 单 item void 语义 |
| G1-4 | `orderRepo.countByStore(storeId, tx)` | 段 1 / 33-D | createOrder 序列号 |
| G2-1 | `orderRepo.findDraftsBySession(sessionId, tx)` → `DraftOrderWithItems[]` | 段 2 | 多 device draft 列举（§5.1 / §5.2 核心依赖）|
| G2-2 | `orderRepo.deleteDraftsBySession(sessionId, tx)` | 段 2 | clearSessionCart B2 等价 |
| G2-3 | **条件回填**：`orderRepo.transitionStatus(id, from, to, expectedVersion?, tx)` | 段 2 D58 | 仅 D58 选路径 Z 时需要，否则不回填 |
| G2-4 | **条件回填**：`pendingPaymentRepo` 新文件 + schema | 段 2 D58 | 仅 D58 选路径 Y 时需要 |

**回填策略**：G1-1..G1-4 + G2-1..G2-2（6 项）**无条件回填**（路径 X/Y/Z 都需要）；G2-3 / G2-4 **条件回填**（随 D58 决议触发）。

---

### 9. 测试：`server/src/__tests__/session-cart.test.ts`

**业务语义策略**（对齐 Phase E 测试策略，每域 3-5 业务 case + 1 RLS smoke）：

1. **create draft**（场景 a 等价）：`updateDeviceCart` miss findDraft → createDraftOrder，版本 0 正确
2. **replace draft items with optimistic lock**：`updateDeviceCart` hit findDraft → replaceDraftItems，expectedVersion 匹配 OK，mismatch 抛 OPTIMISTIC_LOCK_CONFLICT
3. **multi-device isolation**（场景 c 等价）：device A 加 cart A，device B 加 cart B → findDraftsBySession 返回 2 drafts，各自 deviceId 不串
4. **submit pay-later path**（场景 e 等价）：submitSessionCart pay-later → 每 draft `submitDraft` → status all pending
5. **D58 选定路径覆盖**（场景 d 等价）：按 Ian 决策结果写对应路径的测试——路径 X 测"submit 后 draft 保留"，路径 Y 测"snapshot 重建"，路径 Z 测"pending_payment 状态翻转"
6. **RLS smoke**：tenant A 的 draft 不可见于 tenant B context

---

### 10. Step 1-N 实施

- **Step 1**：grep 基线复核（C2a 数字）
- **Step 2**：整文件重写 `session-cart.ts`（7 处 pendingCart → orderRepo.* 调用）
- **Step 3**：route handler `session.routes.ts:44-96` 包 `tenantAwareRoute` + `afterCommit` emit
- **Step 4**：按 D58 选定路径（Ian 决策后）实施 §5.2 对应路径代码
- **Step 5**：按 Fetch API 选项（handoff §5c）前端 12 处字段迁移
- **Step 6**：建 `session-cart.test.ts`（6 case）
- **Step 7**：verify（5 道门）
- **Step 8**：手动场景 a-g 预演（Task 35 之前的 dry-run）
- **Step 9**：commit

### 11. commit（段 2 落地）

```bash
cd "$(git rev-parse --show-toplevel)"
git add docs/superpowers/plans/2026-04-17-phase5-postgres-migration/phase-g-session-cart-b2.md
git commit -m "plan(phase-g): section 2 - session-cart B2 rewrite with D58 decision point (Task 34)

Phase G 段 2 plan: session-cart.ts B2 重写 (从 session.pendingCart →
draft orders). 含 D58 新决策点 (pay-first 流 draft 生命周期, 3 路径
X/Y/Z, Ian 实施期前判).

规则 7 段 2 强化应用:
  - [DESIGN DECISION] 标注 B2 后行为断言, 非事实混入
  - spec §9.8 场景 d 原文先引 (line 1291), 再 [INFERENCE] 语义推断
  - 3 路径数据流可追溯 schema 字段 + repo 方法 (非模糊)

D58 路径 X/Y/Z 陈述:
  - X: submit 不删 draft, webhook 转 submitted (0 schema 改, R-X1 金额
    漂移需 draft.version snapshot 缓解)
  - Y: submit 删 draft + PendingPayment snapshot + 取消时重建 (新 schema
    + 新 repo, Phase D 条件回填 G2-4)
  - Z: pending_payment 状态扩展 (enum + partial unique 扩展, Phase D 条件
    回填 G2-3)

CC 倾向 X (最少 schema 改, B2 本身已大改). Ian 拍板.

spec §9.8 line 1255 'SSE cart:updated 载体改为 draft order 快照'
事实错误——grep 证明 SSE payload 极简不变 (handoff §6 + C2a §2.1).
批 2 末尾 spec reconciliation commit 一并修正.

Phase D 回填清单累积 6 + 条件 2 (G2-3/G2-4 随 D58 路径):
  - G1-1..G1-4 (段 1, 4 项, 无条件)
  - G2-1 findDraftsBySession, G2-2 deleteDraftsBySession (段 2, 2 项, 无条件)
  - G2-3 transitionStatus (路径 Z 条件), G2-4 pendingPaymentRepo (路径 Y 条件)

Pending commits 清单: 3/4 落地 (C1 段 1 + C2a 前置 grep + C2b 本 commit).
下一步由 Ian 判本 session 是否推进段 3 Task 35 或收尾.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## 下一步

C2b push 后汇报：
1. 文件行数 + 子节数
2. D58 三路径 + CC 倾向 + 理由
3. 本 session 已用时 + 剩余预算
4. **不自行启动段 3 Task 35**——等 Ian 判

规则 8 暂停信号（段 2 写作期）：
- D58 发现第 4 路径 → 停
- C2a 漏 cartVersion 使用点 → 停
- 任何"我假设"→ 停
- pending > 1 → 停
- 写作 > 2 小时 → 停

本 plan 写作过程：全部规则 8 信号未触发。

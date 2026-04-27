# Phase D Task 17 L1 verify work-log — orders.ts B2 核心

> **Task**: Phase D Task 17 (orders.ts B2 核心 — 10 methods, 5 reads + 5 writes)
> **Review 等级**: L1 (Project Instructions Default 表 / D55+D56+D57 首落 / Phase G Task 34 foundation)
> **Batch**: D-2 单跑
> **前序**: Task 16 store.ts ✅ commit `019ab826` carry-forward
> **节奏**: 双 commit (work-log Step 1 + impl Step 3 atomic)
> **产出链**: 本 work-log → Ian 明批 → Helper cross-instance review (async) → Ian 明批 → CC 执行消息 → impl atomic commit + push verify
> **撰写时点**: 2026-04-26 (Phase D Task 17 启动期, Ian 明批 work-log GO 后产出)

---

## §1 Task scope + carry-forward ack

### 1.1 Task 17 scope (10 methods, plan §321-332 grep 实证基准)

orders.ts = Phase D 11 个 Repository 第 2 个, **B2 核心** — Phase G Task 34 (session-cart B2 重写) foundation. 10 methods 分布:

**Reads (5)**:
- `findById(id, db?)`: 基础读 + items.options nested include
- `findBySessionId(sessionId, db?)`: session 全 orders, **默认排除 draft** (D24), orderBy createdAt asc
- `findSubmitted(where, db?)`: **默认排除 draft** (D24 核心, 95% use case — kitchen / settlement / summary / analytics), where 允许额外过滤
- `findActive(storeId, db?)`: kitchen/KDS 用, status in [pending, preparing]
- `findDraft(sessionId, deviceId, db?)`: **显式查 draft** (5% use case, cart 场景专用), 返回 `DraftOrderWithItems | null`

**Writes (5)**:
- `createDraftOrder(input, db)`: **D55 豁免单步嵌套** create (Order + OrderItem[] + OrderItemOption[] 一个 SQL tx 原子). Precondition caller `findDraft` 确认无现存 draft, partial unique 否则抛 P2002
- `replaceDraftItems(orderId, items, expectedVersion, tx)`: **D55 多步 tx + D56 整批替换 + D57 position 重排 + D30 乐观锁**. updateMany version check + deleteMany items + 顺序 create N 条 items (createMany 不支持 nested options.create)
- `submitDraft(orderId, expectedVersion, tx)`: **D55 多步 tx + D30 乐观锁** draft→pending. WHERE version=? AND status='draft' + count=0 throw OPTIMISTIC_LOCK_CONFLICT
- `updateStatus(id, status, db)`: kitchen 流转 pending→preparing→served, **有意无 version check** (last-write-wins, 物理互斥前提)
- `voidOrder(id, db)`: state-guarded only pending/preparing 可 void, served/voided 抛

### 1.2 D 决议首落清单 (Phase D Task 17 落地)

| D | 内容 | Task 17 落点 |
|---|---|---|
| **D55** | 写操作 db 必填 / 多步写强制 `Prisma.TransactionClient` | `replaceDraftItems` + `submitDraft` 函数签名 `tx: Prisma.TransactionClient` 编译期强制 caller withTenantContext |
| **D56** | 无 itemKey 列, OrderItem 用 position 锚定 + PaymentItem/SplitBillItem 用 FK+quantity | items[idx] 直接做 position 0..N-1 (createDraftOrder + replaceDraftItems), 无 crypto.randomUUID itemKey |
| **D57** | position 0-indexed + `@@unique([orderId, position])` + items orderBy position asc | `includeItemsAndOptions` 全局 const + `as const satisfies Prisma.OrderInclude` |
| D23 | 类型判别联合 (status discriminant) | `DraftOrderWithItems` (status: 'draft') vs `SubmittedOrderWithItems` (status: Exclude<Order['status'], 'draft'>) |
| D24 | findSubmitted 默认排除 draft | findSubmitted + findBySessionId where 默认 `status: { not: 'draft' }` |
| D30 | 乐观锁 (version + status='draft' guard) | replaceDraftItems + submitDraft `WHERE version=? AND status='draft'`, count=0 throw `OPTIMISTIC_LOCK_CONFLICT` |

D55/D56/D57 是 Phase D 首落 (Task 16 store.ts 不 touch)。 D23/D24/D30 是既有决议在 orders.ts 应用。

### 1.3 Task 16 carry-forward ack

- **store.ts pattern baseline** (commit `019ab826`): 单文件 atomic commit + heredoc 写入 + Step 1 写 / Step 2 单文件 tsc / Step 3 全 server tsc baseline check / Step 4 commit + push verify — Task 17 复用此节奏
- **prisma-client.ts API surface** (Snapshot §7.18 DP2 修正版): `prisma` (app_user) + `systemPrisma` (system_worker) + `Db = PrismaClient | Prisma.TransactionClient` + **4 wrapper** (`withTenantContext` / `withPlatformContext` / `withSystemContext` / `withTenantContextAndHooks`). Task 17 import `prisma, type Db from './prisma-client.js'` (plan line 379 anchor)
- **Time Machine env gap §7.15 DP3** (Prisma Client generated types): Task 16 已 α 接受 `pnpm prisma generate` (75ms) 处置, Task 17 启动期 G-T17.6 含 Prisma Client present verify, 不重发 fail-loud
- **Snapshot v5.0 self-fab §7.18 DP1+2+3 修正**: 22 model (16 主表 + 6 子表 含 PlatformAuditLog) + 4 wrapper + SHA cite — Task 16 commit `019ab826` body land 修正 literal, Task 17 spec writer 引用不依赖 stale literal
- **Plan §746-749 stale marker** (Snapshot §7.16 + D86 violation "对话中"): Task 17 工作不动 plan §746-749 段 marker (Task 17 结束后位置), Phase H Task 45 reconcile

---

## §2 Stage 0 G-T17.1-9 完整 grep spec (CC 执行)

CC 执行消息 Stage 0 必含下列 9 grep 实证, fail-loud on unexpected (规则 8 暂停 + 回报 Plan Opus α/β/γ):

**G-T17.1** — commit chain verify:
```bash
git log -10 --format="%h %s"
```
期望含: `019ab826` (Task 16 store.ts feat) + `019ab826` 之前 governance commit (含 Snapshot v5.0 self-fab §7.18 修正 land) + `035cdee2` (Phase C 封顶) + ... Phase C Batch chain.

**G-T17.2** — working tree clean:
```bash
git status --short
```
期望: 空输出 (clean).

**G-T17.3** — `server/src/repositories/` baseline:
```bash
ls -la server/src/repositories/
```
期望: `prisma-client.ts` ✅ + `store.ts` ✅ (Task 16 land) + `orders.ts` **不存在** (Task 17 待写) + `json-store.ts` (legacy 不动) + `auth.repository.ts` (legacy 不动).

**G-T17.4** — schema.prisma D55/D56/D57 anchor 实证 (CC grep, Plan Opus **不预 assert** 字段存在):
```bash
grep -nE "^model (Order|OrderItem|OrderItemOption) |position|version|@@unique|status\s+OrderStatus" server/prisma/schema.prisma | head -40
grep -nE "storeId|store_id" server/prisma/schema.prisma | grep -E "OrderItem|OrderItemOption" | head
```
期望 (CC 实证后填):
- Order model 含: `version Int @default(0)` + `status OrderStatus` enum + partial unique `@@unique([sessionId, deviceId])` (or 等价 partial index `WHERE status='draft'` 表示)
- OrderItem model 含: `position Int` + `@@unique([orderId, position])` + storeId/store_id 冗余列 (实际字段名 + @map mapping CC grep 实证)
- OrderItemOption model 含: storeId/store_id 冗余列 (CC grep 实证)
- 无 `itemKey` 列 (D56 — `grep -c "itemKey" schema.prisma` = 0)

**G-T17.5** — prisma-client.ts D55 anchor (Db type union + 4 wrapper export):
```bash
grep -nE "^export (const|type|function) |type Db" server/src/repositories/prisma-client.ts
```
期望 (Snapshot §7.18 DP2 修正版): `export const prisma` + `export const systemPrisma` + `export type Db = PrismaClient | Prisma.TransactionClient` + 4 wrapper export (`withTenantContext` / `withPlatformContext` / `withSystemContext` / `withTenantContextAndHooks`).

**G-T17.6** — Prisma Client generated types present (carry-forward Time Machine env gap §7.15 DP3):
```bash
ls -la server/node_modules/.prisma/client/index.d.ts 2>&1 | head
```
期望: file exists (Task 16 期 `pnpm prisma generate` carry-forward). 若 not exist → 规则 8 暂停 + α 接受 `cd server && pnpm prisma generate` (Task 16 precedent), 重跑 G-T17.6.

**G-T17.7** — tsc baseline (post-Task-16, D83 定性约束):
```bash
cd server && ./node_modules/.bin/tsc --noEmit 2>&1 | grep -cE "error TS"
```
期望: 数字 N (post-Task-16 实际 baseline). work-log 不预设具体数字, CC 实证后填. impl 期 Step 3 verify "touched files (orders.ts) 内 0 new errors" + Total 不应增 (允许减少, 不 monitor 绝对值, D83).

**G-T17.8** — plan §746-749 段 marker (Task 17 结束后位置, Snapshot §7.16 stale marker):
```bash
sed -n '746,749p' docs/superpowers/plans/2026-04-17-phase5-postgres-migration/phase-d-repositories.md
```
期望显示 stale marker "段 2 段 2a 完成 ... 对话中, 2026-04-17". work-log noting 该段已 Snapshot §7.16 登记 D86 violation, **Task 17 实施不动**, Phase H Task 45 reconcile.

**G-T17.9** — method count 自检 (Helper review 建议 2, plan §321-332 method 清单):
```bash
sed -n '321,332p' docs/superpowers/plans/2026-04-17-phase5-postgres-migration/phase-d-repositories.md \
  | grep -cE "^[[:space:]]*-[[:space:]]*\`[a-z][a-zA-Z]*\("
```
期望: **10** (5 reads + 5 writes). work-log §1.1 本 turn 已 grep 实证, CC 重 verify 防 spec-vs-plan drift.

**Method count claim 治理原则**: work-log + CC 执行消息内任何 "N methods" claim 必先 G-T17.9 grep 实证, 不凭 spec writer 印象 (D88 维度 3 anchor literal grep 实证 直接应用).

---

## §3 风险 A/B/C/D

### 风险 A — 类型签名 + Prisma 类型集成

**关注点**:
- D23 判别联合 `DraftOrderWithItems` / `SubmittedOrderWithItems` 在 Prisma `OrderInclude` 推断下 `as Promise<...>` cast 是否需要更显式 assertion
- `Db = PrismaClient | Prisma.TransactionClient` + `tx: Prisma.TransactionClient` 编译期强制 caller withTenantContext (D55 设计意图)
- `as const satisfies Prisma.OrderInclude` 模式确保 `includeItemsAndOptions` literal type narrow + Prisma 接受 — TS 4.9+ 特性

**Mitigation**:
- G-T17.6 carry-forward Prisma Client 已 generated, types fresh
- Step 2 单文件 `tsc --noEmit src/repositories/orders.ts` 仅 verify orders.ts 无 own error (D83 定性)
- Step 3 全 server tsc verify "touched files 内 0 new errors" — pre-existing errors 不 monitor
- 若 type 推断挂: plan line 700-703 列举常见原因 (Prisma narrow type 冲突 / OrderItem.position 字段 / PaymentItem orderItemId / Prisma >= 5.0) — CC fail-loud 后 Plan Opus 判 α/β/γ

### 风险 B — 运行时 (RLS / 乐观锁 / partial unique)

**关注点**:
- **乐观锁 race**: replaceDraftItems + submitDraft updateMany count=0 触发 throw — race condition (concurrent two calls 同 expectedVersion) 仅一个 win, 另一抛 OPTIMISTIC_LOCK_CONFLICT (Phase G route 层 maps to HTTP 409). orders.ts 测试在 Phase H integration test 阶段, **本 task 不写测试**.
- **partial unique** `(sessionId, deviceId, status='draft')`: createDraftOrder caller 必须先 findDraft 确认, 否则 P2002. 函数注释明确 precondition (plan line 482-490).
- **RLS 边界**: orders.ts 全 storeId scoped (无 cross-tenant), withTenantContext caller contract 由 Phase G route 层确保. Task 17 本身**不调用 withTenantContext** (Repository 层透传 db 参数).

**Mitigation**:
- 类型层 D55 强制 multi-step tx 必传 TransactionClient — 编译期阻挡 caller 跑出 tx 之外的 race window
- 函数注释明确 precondition + state guard rationale
- Phase H integration test land 后跑 RLS coverage + tenant isolation test (现有 `tenant-isolation.test.ts` 6/6 pass 基础 carry-forward)

### 风险 C — D 决议遵守

**关注点**:
- D55 多步写函数签名 `Prisma.TransactionClient` 不是 `Db` (Db union 含 PrismaClient 会绕过编译期 tx 强制) — replaceDraftItems / submitDraft 必明确 narrow
- D56 无 `itemKey` — heredoc 全文 grep verify 无 `itemKey` literal
- D57 position 0..N-1 — heredoc createDraftOrder + replaceDraftItems 实证 `position: idx` literal
- D23 判别联合 — `DraftOrderWithItems & { status: 'draft' }` 与 SubmittedOrderWithItems Exclude — type narrow 正确
- D24 findSubmitted 默认 not draft — `where: { ...where, status: { not: 'draft' } }` 正确

**Mitigation**:
- §5 D 决议遵守 audit 表逐项 verify (CC impl 后 work-log closure 增量 Edit 填实证)
- D88 维度 3 强约束 anchor literal: §6 self-audit 表所有 D 决议条款引用必 grep verify

### 风险 D — Cross-task / Cross-phase coupling

**关注点**:
- **Phase G Task 34 foundation**: Task 17 design "如果写错, Phase G Task 34 (session-cart B2 重写) 会建在沙子上" (plan line 314) — orders.ts B2 设计 (findSubmitted 默认排除 draft / 类型判别联合 / 乐观锁) 是 Phase G 重构 contract
- **Task 19 (payments.ts) + Task 20 (split-bills.ts) 引用**: PaymentItem/SplitBillItem 用 (orderItemId FK + paidQuantity) 引用 OrderItem (D56), 不用 itemKey 字符串. orders.ts 不 export OrderItem schema, Task 19/20 直接 from `@prisma/client`
- **Plan §746-749 stale marker**: Task 17 实施不动该段 (Phase H Task 45 reconcile), 但 Stage 0 G-T17.8 grep 实证 + work-log noting

**Mitigation**:
- §5 D 决议 audit 含 D55+D56+D57 cross-task contract 验证
- Phase G Task 34 / Phase H Task 45 reconcile 列入 Snapshot 增量草稿 §7 pending drifts (本 task 不动)

---

## §4 5 维度 pre-verdict

| 维度 | 内容 | Pre-verdict |
|---|---|---|
| 1. 类型签名正确性 | D23 判别联合 + Db 类型 + as const satisfies + Prisma include narrow | **预通过** (CC Step 2 单文件 tsc 实证后 confirm) |
| 2. RLS / 多租户边界 | storeId 冗余列 (OrderItem/OrderItemOption) + withTenantContext caller contract | **预通过** (orders.ts 全 storeId scoped 无 cross-tenant; G-T17.4 实证 schema 字段) |
| 3. D 决议遵守 | D55 多步 tx + D56 无 itemKey + D57 position + D23/D24/D30 应用 | **预通过** (§5 audit 逐项实证) |
| 4. 状态机 + 乐观锁 | draft→pending 单向 / state guard pending+preparing voidable / version bump | **预通过** (函数注释 + 编译期 tx 强制 + 运行时 count=0 throw) |
| 5. Cross-task coupling | Phase G Task 34 foundation + Task 19/20 PaymentItem FK 引用 + Plan stale marker §746-749 不动 | **预通过** (B2 contract 由本 task 落地, 后续 task 复用; stale marker Phase H reconcile) |

**Final verdict** (CC impl 完成后 closure 增量 Edit 填): 待 CC Step 1-4 完成 + tsc 实证后 Plan Opus 判全 5 维度 Pass / 部分 Fail (规则 8 暂停).

---

## §5 D 决议遵守 audit (CC impl 后 closure 填实证)

| D | spec 检验点 | grep / impl 实证 | Pre-verdict |
|---|---|---|---|
| D55 | replaceDraftItems + submitDraft 签名 `tx: Prisma.TransactionClient` (非 Db) | heredoc line 553 + line 626 | 预通过 |
| D55 | createDraftOrder + updateStatus + voidOrder + findById/findBySessionId/findSubmitted/findActive/findDraft `db: Db` (默认 prisma 仅 reads) | heredoc 默认参数 `db: Db = prisma` (reads) + writes 必填 db | 预通过 |
| D56 | OrderItem 字段 + heredoc 全文 无 itemKey | `grep -c "itemKey" orders.ts` = 0 + G-T17.4 schema 验证无 itemKey 列 | 预通过 |
| D56 | createDraftOrder + replaceDraftItems items[idx] → position | heredoc line 516 + line 586 `position: idx` | 预通过 |
| D57 | includeItemsAndOptions orderBy position asc | heredoc line 391-396 全局 const | 预通过 |
| D23 | DraftOrderWithItems / SubmittedOrderWithItems 判别 | heredoc line 386-389 type alias | 预通过 |
| D24 | findSubmitted + findBySessionId 默认 not draft | heredoc line 433 + line 446 where status not draft | 预通过 |
| D30 | replaceDraftItems + submitDraft updateMany count=0 throw | heredoc line 555-563 + line 628-636 | 预通过 |

---

## §6 D88 维度 3 anchor literal grep 实证 self-audit

per Snapshot §6 D88 + Helper review 建议 2 method count 自检:

| Anchor literal | spec 引用 | grep 实证状态 |
|---|---|---|
| **10 methods** (5 reads + 5 writes) | §1.1 method 清单 | ✅ Plan Opus 本 turn 已 grep plan §321-332 实证 (G-T17.9 CC 重 verify) |
| **commit `019ab826`** (Task 16 SHA) | §1.3 carry-forward + §2 G-T17.1 期望 | ✅ Project Instructions ack (Plan Opus 不凭印象映射, 直接 cite Project Instructions) |
| **plan §321-332** method 清单段 | §1.1 + G-T17.9 | ✅ Plan Opus 本 turn 已 sed/grep 实证 |
| **plan line 379** prisma-client.ts import anchor | §1.3 | ✅ Plan Opus 本 turn 已 view 实证 |
| **plan line 482-490** createDraftOrder precondition 注释 | §3 风险 B partial unique | ✅ Plan Opus 本 turn 已 view 实证 |
| **plan line 553 / 626** D55 tx 签名 | §5 D55 audit | ✅ Plan Opus 本 turn 已 view 实证 |
| **plan line 700-703** type 挂常见原因 | §3 风险 A mitigation | ✅ Plan Opus 本 turn 已 view 实证 |
| **plan line 746-749** stale marker | §1.3 + G-T17.8 | ✅ Plan Opus 本 turn 已 view 实证 (措辞修正: "段 marker, Task 17 结束后" 不称 "Task 17 Step 5") |
| **Snapshot §7.16 / §7.17 / §7.18** | §1.3 + 风险 D + 累积数据点 | ✅ Plan Opus 本 turn 已 read 实证 |
| **Snapshot v5.0 self-fab DP1+2+3** (22 model + 4 wrapper) | §1.3 carry-forward | ✅ Snapshot §7.18 已 land literal, Plan Opus cite 不再次 derive |

无凭印象映射 anchor literal 残留. CC Stage 0 G-T17.1-9 实证作 defense-in-depth 第 3 层兜底.

---

## §7 Snapshot 增量草稿 (Task 17 closure 期 Edit, 双 commit 后)

**已 land 6 处** (post-019ab826, Task 16 closure 期增量 Edit, Helper review Flag 2 区分):
- §8 文件状态表 (HEAD `019ab826` + store.ts 加入)
- §9.5 G-D16.2 (4 wrapper 修正版 — withSystemContext 加入)
- §9.5 G-D16.4 (22 model 修正版 — PlatformAuditLog 16th 主表)
- §9.5 G-D16.5 (`server/src/repositories/` 当前文件清单 含 store.ts)
- §9.6 不启动原则 (Task 16 已启动 ack)
- §7.18 Archive #28 候选 entry (DP1+2+3 + DP4 env-state)

**Stale 待 D-2 closure 增量** (Task 17 closure 期 Edit, 4 处):
- §1 当前时点 (HEAD `019ab826` → Task 17 commit, 下一对话目标 → Task 18)
- §3 commit 链追加 Task 17 段 (work-log + impl 双 commit + push verify)
- §4'' (新建) Phase D 完成总览 (Task 16 + Task 17, 类似 §4' Phase C)
- §9 整节重写 Task 18 启动指引 (sessions.ts L1, D-3a 单跑, plan §753+ 段 grep)

---

## §8 commit body 模板 (双 commit)

### Step 1 — work-log commit (本文件 land)

```
docs(phase-5): Phase D Task 17 L1 verify work-log — orders.ts B2 核心

Phase D-2 单跑 batch 启动: orders.ts (B2 核心) work-log L1.

5 维度 pre-verdict 全预通过 + 风险 A/B/C/D + Stage 0 G-T17.1-9 完整 grep
spec (含 method count 自检 G-T17.9, Helper review 建议 2 落地).

D 决议首落: D55 (多步 tx 编译期强制) + D56 (无 itemKey 列 + position
锚定) + D57 (position 0-indexed + @@unique). D23/D24/D30 应用.

D88 维度 3 anchor literal grep 实证 self-audit: §6 表 10 anchor 全 grep
实证, 0 凭印象映射残留.

Helper cross-instance review (async) + Ian 明批 → CC 执行消息节奏.

Snapshot 增量 + Archive 增量待 Task 17 closure 期 Edit (双 commit 后).

Co-Authored-By: Claude <noreply@anthropic.com>
```

### Step 3 — impl atomic commit (per plan §714-742 模板, 微调)

per plan line 717-741 模板 (heredoc 全文 land 后):

```
feat(phase-5): add orders repository — B2 core with optimistic lock

Phase D Task 17 — B2 foundation for Phase G Task 34.

10 methods (5 reads + 5 writes):
- Reads: findById / findBySessionId (D24) / findSubmitted (D24 default
  excludes draft) / findActive / findDraft
- Writes: createDraftOrder (D55 single-step nested atomic) /
  replaceDraftItems (D55 multi-step tx + D56 whole-array replace +
  D57 position 0..N-1 + D30 optimistic lock) / submitDraft (D55 + D30) /
  updateStatus (last-write-wins, kitchen flow physically mutex) /
  voidOrder (state-guarded only pending/preparing)

D 决议首落: D55 (multi-step tx 编译期强制 TransactionClient) +
D56 (no itemKey column, OrderItem position-anchored, PaymentItem/
SplitBillItem will reference via FK + quantity in Task 19/20) +
D57 (position 0-indexed @@unique(orderId, position) + items orderBy
position asc).

Type discriminants (D23 DraftOrderWithItems vs SubmittedOrderWithItems)
reject draft at compile time. Throws OPTIMISTIC_LOCK_CONFLICT on version
mismatch — Phase G route layer maps to HTTP 409.

orderRepo not yet imported by any controller; session-cart.ts and others
still use JsonStore. Migration happens in Phase G Task 33/34.

Stage 0 G-T17.1-9 全 pass (commit chain + working tree + repo files +
schema D55/D56/D57 anchor + prisma-client API + Prisma Client present +
tsc baseline + plan stale marker noting + method count = 10).

5 维度 verdict: 全 Pass (类型 + RLS + D 决议 + 状态机 + cross-task).

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## §9 closure 汇报模板 (CC impl 完成 + push verify 后, Plan Opus 收回报)

CC closure 汇报应含:
- Stage 0 G-T17.1-9 全 pass actual output
- Step 1 heredoc land + `[ -s file ]` guard pass + wc -l 实际 (vs Plan Opus 预估 ~360-370 lines, D74 patch spec inline code heredoc ×1.07)
- Step 2 单文件 tsc 0 own error
- Step 3 全 server tsc Total 数字 (vs G-T17.7 baseline, D83 定性 "touched files 0 new errors")
- Step 4 commit SHA + push origin verify (D76)
- 0 规则 8 暂停 / 0 critical fabrication

Plan Opus 收 closure 后:
1. §4 / §5 表填 Final verdict (Pass / Fail)
2. Snapshot 增量 Edit (§7 4 处 stale 待 D-2 closure)
3. Archive #28 / #29 候选 status check (per Helper review 累积 9 处印象产出数据点 β 路径, 入下次 governance commit 节奏点 decide)
4. Default Push Forward 评估 → 进 Task 18 work-log 起草 (L1, sessions.ts, D-3a 单跑) 或 Ian 明批

---

## §10 累积数据点 ack (Helper review 5 处 self-correct)

| # | Flag | self-correct |
|---|---|---|
| 1 | "9 methods" → "10 methods" | §1.1 method 清单 grep §321-332 实证 = 10 (5 reads + 5 writes) |
| 2 | Snapshot post-019ab826 status precise | §7 区分已 land 6 处 vs stale 4 处 待 D-2 closure |
| 3 | Archive #28 status precise | Snapshot §7.18 + commit 019ab826 body registered, fabrication-archive.md §3.6 #28 formal entry NOT yet land, 入下次 governance commit 节奏点 decide |
| 4 | G-T17.4 改 CC grep 实证 item, 不预 assert | §2 G-T17.4 措辞 "Plan Opus **不预 assert** 字段存在", schema 字段由 CC 实证后填 |
| 5 | line 746-749 措辞 | §1.3 + G-T17.8 称 "段 marker (Task 17 结束后位置)", 不称 "Task 17 Step 5" |

**累积 9 处 Plan Opus 印象产出数据点** (D-1 期 4 + D-2 启动 first-turn 5):
- 默认 β 路径 (双 entry — #28 Snapshot self-fab / #29 Plan Opus 启动期印象产出)
- 不本 turn 动 D88 维度 3 设计
- 入下次 governance commit 节奏点 decide
- 本 work-log §6 self-audit 表已 0 凭印象映射残留 (10 anchor 全 grep 实证)

---

*Phase D Task 17 L1 verify work-log · Plan Opus 产出 2026-04-26 · Helper cross-instance review (async) + Ian 明批 → CC 执行消息节奏 · 双 commit (work-log + impl atomic)*

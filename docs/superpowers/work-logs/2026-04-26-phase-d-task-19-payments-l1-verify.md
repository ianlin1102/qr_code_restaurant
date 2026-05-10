# Phase D Task 19 L1 verify work-log — payments.ts (D56 in payment scope 首落 + Stripe 真钱)

> **Task**: Phase D Task 19 (payments.ts — 7 methods, 5 reads + 2 multi-step writes; Stripe webhook idempotent; D56 FK model 在 payment scope 首落)
> **Review 等级**: L1 (Project Instructions Default 表 / D56 in payment scope 首落 / Stripe / 真钱 — 三 trigger 命中)
> **Batch**: D-3b 单跑
> **前序**: Task 18 sessions.ts ✅ commit `cb2efd5e` carry-forward (D55 + D13-adjacent + 双向 FK 一致性 + #30 防御层 first live demo work-as-designed)
> **节奏**: 双 commit (work-log Step 1 + impl Step 3 atomic)
> **产出链**: 本 work-log → Ian sync repo + 明批 → Helper cross-instance review (async, skipped per Default Push Forward) → Ian 明批 → CC 执行消息 → impl atomic commit + push verify
> **撰写时点**: 2026-04-26 (Phase D Task 18 closure 后 Default Push Forward, Plan Opus 起 Task 19 work-log L1)
> **#30 防御层 carry-forward Task 18 verdict (work-as-designed)**: Stage 0 G-T19.4 schema-side full field enumeration + G-T19.10 Prisma XOR predict 应用. **关键 difference vs Task 18**: Task 19 `create` 含 nested items.create (same pattern as Task 17 createDraftOrder pre-fix, 预测 Stage 2 TS2322 fail-loud high probability), α-extended forward-fix spec carry-forward Task 17 spec template 入 work-log §3 Risk A 预案

---

## §1 Task scope + carry-forward ack

### 1.1 Task 19 scope (7 methods, plan §918-927 grep 实证基准)

payments.ts = Phase D 11 个 Repository 第 4 个, **D56 in payment scope 首落 + Stripe 真钱关键**. 7 methods 分布:

**Reads (5)**:
- `findById(id, db?)`: 含 items relation
- `findBySessionId(sessionId, db?)`: 本 session 所有支付
- `findByStripeId(stripePaymentIntentId, db?)`: webhook 幂等用
- `sumConfirmed(sessionId, db?)`: 聚合本 session confirmed 支付总额 (Prisma aggregate)
- `derivePaidQuantityByOrderItem(sessionId, db?)`: **D56 核心** — 返回 `Map<orderItemId, paidQty>` 替代 legacy `derivePaidState.paidItemIds` 字符串集合

**Writes (2 multi-step)**:
- `create(input, tx)`: **D55 多步 tx** — Payment + PaymentItem[] (含 orderItemId FK + paidQuantity). 原子. **同 Task 17 createDraftOrder pre-fix pattern** (raw FK + nested items.create)
- `confirmStripe(stripePaymentIntentId, tx)`: **D55 多步 tx + idempotent** — find + update status pending→confirmed. webhook 重发返回 existing row.

### 1.2 D 决议涉及清单

| D | 内容 | Task 19 落点 |
|---|---|---|
| **D55** | 多步写强制 `Prisma.TransactionClient` | create + confirmStripe 2 处 `tx: Prisma.TransactionClient` 编译期强制 |
| **D56 in payment scope** (FK + paidQuantity 模型) | PaymentItem 用 (paymentId, orderItemId FK, paidQuantity) 替 legacy itemKey 字符串 | create.items.create + derivePaidQuantityByOrderItem 全 raw FK orderItemId + 数字 paidQuantity, 0 itemKey 字符串. **Task 17 D56 设计意图首次 cross-repo 验证** |
| **D56 核心 - paidQuantity 聚合** | 替 legacy derivePaidState.paidItemIds 字符串集合 | derivePaidQuantityByOrderItem 用 `Map<orderItemId, paidQty>` (find PaymentItems where payment.sessionId & status='confirmed', aggregate paidQuantity per orderItemId) |
| D55 (reads default) | 读默认 prisma | 5 reads `db: Db = prisma` 默认 |

**Stripe 真钱 idempotent contract**: confirmStripe 是 webhook handler, 必须 idempotent (重发同 stripePaymentIntentId 返回 existing confirmed row, 不抛). 风险 B 详.

### 1.3 Task 18 carry-forward ack

- **prisma-client.ts API surface** (Snapshot §7.18 DP2 修正版 / Task 16-18 carry-forward): `prisma` + `systemPrisma` + `Db = PrismaClient | Prisma.TransactionClient` + 4 wrapper. Task 19 import `prisma, type Db from './prisma-client.js'` (per Task 17/18 import pattern)
- **Task 17 orders.ts** (`ff5e881b`): D56 in OrderItem (无 itemKey 列, position 锚定 idx). Task 19 PaymentItem 用 (orderItemId FK + paidQuantity) 引用 OrderItem.id, **D56 设计 cross-repo 验证 first live demo**
- **Task 18 sessions.ts** (`cb2efd5e`): Session 1:N Payment relation. Task 19 Payment.session @relation 应已 schema 定义 (G-T19.4a 实证)
- **#30 防御层 work-as-designed Task 18 verdict carry-forward**:
  - G-T19.4 schema-side full field enumeration grep (Payment + PaymentItem model + Stripe 字段) 应用
  - G-T19.10 Prisma XOR predict 应用 — **Task 19 create 含 nested items.create (same pattern as Task 17 createDraftOrder pre-fix)**, 预测 Stage 2 TS2322 fail-loud high probability, α-extended forward-fix spec carry-forward Task 17 spec template 入 work-log §3 Risk A 预案
- **#28/#29/#30 候选 + 5 governance queue entries 状态** carry-forward (本 task commit body Self-flag 段同 ack)

---

## §2 Stage 0 G-T19.1-10 完整 grep spec (CC 执行)

CC 执行消息 Stage 0 必含下列 10 grep 实证. fail-loud on unexpected → 规则 8 暂停 + 回报 Plan Opus α/β/γ.

**G-T19.1** — commit chain verify:
```bash
git log -10 --format="%h %s"
# 期望 (post Task 18 closure + Step A/B sync):
#   <work-log SHA>      docs   Phase D Task 19 L1 verify work-log
#   <closure sync SHA>  docs   Phase D Task 18 closure — work-log Final verdict + Snapshot 增量
#   cb2efd5e            feat   Phase D Task 18 — sessions repository
#   6102725f            docs   Phase D Batch 3 Task 18 L1 verify work-log
#   ed73eab9            docs   Phase D Task 17 closure
#   ff5e881b            feat   Phase D Task 17 — orders repository B2 core
#   3bb5cd1c            docs   Phase D Task 17 work-log round 2 micro-adjust
#   7dc63fd3            docs   Phase D Task 17 L1 verify work-log
#   ...
# SHA mismatch → 规则 8 暂停
```

**G-T19.2** — working tree clean: `git status --short` 期望空输出.

**G-T19.3** — `server/src/repositories/` baseline:
```bash
ls -la server/src/repositories/
# 期望含: prisma-client.ts ✅ + store.ts ✅ + orders.ts ✅ + sessions.ts ✅ + json-store.ts (legacy) + auth.repository.ts (legacy)
# 期望不含: payments.ts (Task 19 待写)
```

**G-T19.4** — **schema.prisma full field enumeration** (Payment + PaymentItem model, **#30 防御层应用 carry-forward Task 18 work-as-designed**):
```bash
# G-T19.4a — Payment model 全字段
grep -n "^model Payment " server/prisma/schema.prisma
# CC 实证 record line N0
sed -n "N0,$((N0+50))p" server/prisma/schema.prisma | head -60
# 期望含字段 (CC 实证后 fill actual):
#   - id String @id (PK)
#   - storeId / store Store @relation
#   - sessionId / session Session @relation
#   - method String ('stripe' | 'cash' | other)
#   - amount Int (cents, excludes tip)
#   - tipAmount Int / taxAmount Int (default 0)
#   - stripePaymentIntentId String? (nullable)
#   - status PaymentStatus enum (pending / confirmed / refunded)
#   - items PaymentItem[] @relation (1:N reverse FK)
#   - createdAt DateTime
# CC 实证 record actual fields + required vs optional + @relation status

# G-T19.4b — PaymentItem model 全字段 (D56 核心 — orderItemId FK)
grep -n "^model PaymentItem " server/prisma/schema.prisma
# CC 实证 record line N1
sed -n "N1,$((N1+30))p" server/prisma/schema.prisma | head -40
# 期望含字段:
#   - id String @id (PK)
#   - storeId String / @relation? (RLS denormalized 可能 raw 同 Task 17 OrderItem 模式)
#   - paymentId / payment Payment @relation
#   - orderItemId / orderItem OrderItem @relation (D56 核心 FK)
#   - paidQuantity Int
# CC 实证 record actual relation field names + raw vs @relation status

# G-T19.4c — PaymentStatus enum 定义
grep -n "^enum PaymentStatus" server/prisma/schema.prisma
sed -n "<line>,<line+10>p" server/prisma/schema.prisma | head
# 期望: enum PaymentStatus { pending confirmed refunded } 或类似

# G-T19.4d — itemKey 残留检查 (D56 强约束 — schema 应 0 itemKey 列)
grep -c "itemKey" server/prisma/schema.prisma
# 期望: 0 (D56 — Phase B Task 2 schema 应已删除 itemKey 列, Task 17 Stage 0 G-T17.4 已实证 schema 无 itemKey)

# G-T19.4e — OrderItem.paymentItems 反向 FK
grep -nE "paymentItems" server/prisma/schema.prisma
# 期望: OrderItem 含 paymentItems PaymentItem[] @relation (1:N reverse)
```

**Decision branches** (post G-T19.4):
- Branch 1 (matches plan §Task 19 假设): 进 Stage 1 plan heredoc 逐字 sed extract
- Branch 2 (字段缺失 / drift, e.g. stripePaymentIntentId 未定义 / amount 类型 Decimal vs Int): 规则 8 暂停 → Plan Opus 重 spec α-extended forward-fix
- Branch 3 (PaymentItem.orderItem 反向 FK 命名 drift): 规则 8 暂停 → Plan Opus 重 spec
- Branch 4 (Payment @relation field name drift): 规则 8 暂停 → Plan Opus 重 spec
- Branch 5 (PaymentStatus enum 值 drift): 规则 8 暂停 → Plan Opus 评估对 confirmStripe + create input.status 影响

**G-T19.5** — prisma-client.ts API (carry-forward Task 17/18 G-T17.5/G-T18.5):
```bash
grep -nE "^export (const|type|function|async function) " server/src/repositories/prisma-client.ts
# 期望: prisma + systemPrisma + Db type + 4 wrapper
```

**G-T19.6** — Prisma Client functional verify (carry-forward Task 17/18 α functional):
```bash
cd server && ./node_modules/.bin/tsc --noEmit src/repositories/sessions.ts 2>&1 | grep -cE "error TS[0-9]+:" ; cd "<repo root>"
# 期望: 0 own errors in sessions.ts (carry-forward Task 18 closure verdict)
```

**G-T19.7** — tsc baseline:
```bash
cd server && ./node_modules/.bin/tsc --noEmit 2>&1 | grep -cE "error TS" ; cd "<repo root>"
# 期望: 103 (= post Task 18 healthy state, Snapshot §8 cite)
```

**G-T19.8** — plan §Task 19 整段 verify:
```bash
grep -n "^## Task 1[9]\|^## Task 2[0]" docs/superpowers/plans/2026-04-17-phase5-postgres-migration/phase-d-repositories.md
# 期望: Task 19 line 911 + Task 20 line 1105
sed -n '911,1103p' docs/superpowers/plans/2026-04-17-phase5-postgres-migration/phase-d-repositories.md
# heredoc body line 932-1081 范围 (CC sed 实证 record actual)
```

**G-T19.9** — method count 自检:
```bash
sed -n '918,927p' docs/superpowers/plans/2026-04-17-phase5-postgres-migration/phase-d-repositories.md \
  | grep -cE "^[[:space:]]*-[[:space:]]*\`[a-z][a-zA-Z]*\("
# 期望: 7 (5 reads + 2 multi-step writes)
# 不等 7 → 规则 8 暂停
```

**G-T19.10** — Prisma Create vs UncheckedCreate XOR predict (#30 防御层 carry-forward Task 18 work-as-designed):
```bash
sed -n '994,1014p' docs/superpowers/plans/2026-04-17-phase5-postgres-migration/phase-d-repositories.md
# 期望显示 create heredoc:
#   tx.payment.create({ data: { storeId, sessionId, method, amount, ..., items: { create: [{ storeId, orderItemId, paidQuantity }] } }, include: { items: true } })
```

**Predict 高概率 TS2322 fail-loud** (carry-forward Task 17 createDraftOrder pre-fix 同模式):
- create 含 raw FK (`storeId: input.storeId, sessionId: input.sessionId`) + nested `items: { create: [...] }` (含 raw `storeId: input.storeId, orderItemId: i.orderItemId`)
- 若 G-T19.4a 实证 Payment.store + Payment.session @relation, 触发 PaymentCreateInput XOR PaymentUncheckedCreateInput 推断 fail (Without<Checked, Unchecked> & Unchecked branch storeId: never)
- **预测 Stage 2 TS2322 high probability** — α-extended forward-fix spec **预案 carry-forward Task 17 spec template**:
  - Payment layer: `store: { connect: { id } } / session: { connect: { id } }` 替 raw FK
  - PaymentItem nested layer: `storeId raw kept (RLS denormalized) + orderItemId raw kept (per G-T19.4b 实证 PaymentItem.orderItem @relation 状态决定 connect vs raw)`
- **若 G-T19.4 实证 Payment 无 store/session @relation (raw FK columns only)**: 触发 Branch 2 → Plan Opus 重 spec, 但仍可能 Stage 2 通过 (Unchecked branch 直接命中, 同 Task 18 createForTable)

---

## §3 风险 A/B/C/D

### 风险 A — 类型签名 + Prisma 类型集成 (TS2322 高概率, α-extended 预案 carry-forward Task 17)

**关注点**:
- D55 multi-step tx 必填 `Prisma.TransactionClient` (2 处) 编译期强制
- **Task 19 create 含 nested items.create — same pattern as Task 17 createDraftOrder pre-fix**. G-T19.10 高概率 predict TS2322
- confirmStripe find + update in tx, 较 create 简单 (无 nested write), Prisma 推断更直接, 风险低
- derivePaidQuantityByOrderItem return Map<string, number> custom type, Prisma findMany select narrow + manual aggregation

**Mitigation** (carry-forward Task 17 α-extended spec):
- G-T19.10 pre-Stage-2 predict TS2322 high probability — Plan Opus 预案 α-extended forward-fix spec 已就绪 (Payment Checked relation connect for store/session + PaymentItem layer per G-T19.4b @relation status)
- Stage 2 fail-loud 触发 → Plan Opus 立即 GO α-extended forward-fix (carry-forward Task 17 createDraftOrder + replaceDraftItems Edit pattern)
- 若 G-T19.4 实证 Payment 无 store/session @relation: Branch 2 → Plan Opus 重 spec, 大概率 Stage 2 通过 (Unchecked branch 直接命中)

### 风险 B — 运行时 (Stripe 真钱 idempotent + multi-step tx atomicity + RLS)

**关注点**:
- **Stripe webhook 真钱 idempotent contract** (高风险): confirmStripe 重发同 stripePaymentIntentId 必须返回 existing confirmed row 不抛, 不重复 update. heredoc 实证已 idempotent ✅ (line 1031: `if (existing.status === 'confirmed') return existing`)
- **Multi-step tx atomicity** (高风险): create payment + N items 同 tx, partial commit 风险阻挡 by D55 强约束
- **RLS storeId scoped + Stripe webhook context**: webhook caller 用 system context (withSystemContext) 还是 tenant context? Phase G route 层确定. Repo 层透传 db 参数, 不调 wrapper.
- **Race condition Stripe webhook**: 两个 webhook 同时到达 (Stripe retry mechanism), idempotent + DB row lock 应阻挡 double confirm

**Mitigation**:
- D55 编译期强制 + idempotent guard heredoc line 1031
- Phase H integration test 跑 Stripe webhook idempotent + tenant isolation
- Stripe retry race condition 由 DB row lock + idempotent guard 双层防御
- 函数注释明确 idempotent contract (Phase G webhook handler caller 信任)

### 风险 C — D 决议遵守

**关注点**:
- D55 2 multi-step writes 必填 TransactionClient
- D56 in payment scope 首落 (PaymentItem 全 FK + paidQuantity, 0 itemKey 字符串). G-T19.4d schema 实证 itemKey count = 0 + heredoc 实证 PaymentItem create 用 (storeId raw + orderItemId raw + paidQuantity)
- D56 核心 derivePaidQuantityByOrderItem 实证 Map<orderItemId, paidQty> 替 legacy paidItemIds 字符串集合 — heredoc line 1063-1078 verify

**Mitigation**:
- §5 D 决议 audit 表逐项 verify
- D88 维度 3 §6 self-audit 全 grep 实证

### 风险 D — Cross-task / Cross-phase coupling

**关注点**:
- **Phase G route 层**: payment 创建 (Phase G Task 35 settlement gateway) + Stripe webhook handler (Phase G Task 36) — payments.ts 提供 contract
- **Task 17 orders.ts cross-repo D56 验证**: PaymentItem.orderItemId FK 引用 OrderItem.id (Task 17 OrderItem 表). **D56 设计 cross-repo first live demo**.
- **Task 18 sessions.ts cross-repo**: Payment.sessionId FK 引用 Session.id, findBySessionId / sumConfirmed / derivePaidQuantityByOrderItem 全 sessionId scoped
- **Task 20 split-bills.ts coupling** (Phase D 后续): SplitBillItem 用 (orderItemId FK + quantity) 同模式 (D56), Task 19 验证后 Task 20 复用
- **Phase G settlement gateway 用 derivePaidQuantityByOrderItem**: 替 legacy paidItemIds — D56 核心 contract 由本 task land

**Mitigation**:
- §5 D 决议 audit 含 cross-task contract 验证
- Phase G Task 35/36 / Task 20 reconcile 列入 Snapshot 增量草稿 §7 pending drifts (本 task 不动)

---

## §4 5 维度 pre-verdict

| 维度 | 内容 | Final verdict (post a7752a30) |
|---|---|---|
| 1. 类型签名正确性 | D55 multi-step tx + Prisma type integration + create nested items.create XOR risk | **Pass** — Stage 2.0 raw=4 (env noise file-agnostic, orders.ts symmetric probe 同 4 实证) / filtered=0 / 0 src/ errors. G-T19.10 XOR predict false alarm informational (NOT fabrication archive) — Prisma 6 当 data block 全 raw FK form 走 Unchecked branch 直接, 无视 schema @relation 双形. Task 17 createDraftOrder 实际 root cause = data block mixed @relation connect (OrderItem.menuItem) + raw FK 混用 mixed-style XOR fail. Task 19 data block 全 raw FK 无 connect 调用 → Unchecked 直接命中 → 0 TS2322. |
| 2. RLS / 多租户 + Stripe webhook 真钱 idempotent | storeId scoped + Stripe webhook idempotent guard + multi-step tx atomicity | **Pass** — D55 编译期强制 + payments.ts line 1031 idempotent guard + PaymentItem.storeId raw RLS denormalized (G-T19.4b 实证 同 Task 17 OrderItem 模式) |
| 3. D 决议遵守 | D55 + D56 in payment scope + D56 核心 derivePaidQuantityByOrderItem | **Pass** — §5 audit 全 Pass (impl 实证 land) |
| 4. 状态机 + Stripe lifecycle | pending → confirmed (idempotent) | **Pass** — payments.ts line 1031 idempotent guard + state guard 设计意图 land |
| 5. Cross-task coupling | Phase G Task 35/36 + Task 17/18 cross-repo + Task 20 D56 同模式复用 | **Pass** — D56 in payment scope first cross-repo live demo land (PaymentItem.orderItemId FK 引用 OrderItem.id, Task 17 D56 设计 work-as-designed) |

**Final verdict**: 全 5 维度 Pass. 1 规则 8 暂停 (G-T19.6 spec literal definition-incompatible) Plan Opus α 决议 turn resolved + 1 informational G-T19.10 XOR predict 假 alarm (NOT fabrication, 防御层 predict 模型 nuance refinement — Task 20+ trigger condition refined: "data block mixed @relation connect + raw FK" 替 "schema @relation 双形").

---

## §5 D 决议遵守 audit (CC impl 后 closure 填实证)

| D | spec 检验点 | impl 实证 | Final verdict |
|---|---|---|---|
| D55 (tx) | create + confirmStripe 签名 `tx: Prisma.TransactionClient` 编译期强制 multi-step tx | payments.ts line 992 + 1024 (sed extract verified) | **Pass** |
| D55 (reads) | 5 reads `db: Db = prisma` 默认 | payments.ts reads 默认参数 (findById line 952 / findBySessionId line 958 / findByStripeId line 965 / sumConfirmed line 1044 / derivePaidQuantityByOrderItem line 1063) | **Pass** |
| D56 in payment scope | PaymentItem 全 FK + paidQuantity, 0 itemKey 字符串 | G-T19.4d schema itemKey count = 0 + payments.ts line 1005-1009 (storeId raw + orderItemId raw + paidQuantity) | **Pass** — Task 17 D56 设计 cross-repo first live demo work-as-designed |
| **D56 核心** | derivePaidQuantityByOrderItem 用 Map<orderItemId, paidQty> 替 legacy paidItemIds 字符串集合 | payments.ts line 1063-1078 Map aggregate land | **Pass** — Phase G settlement gateway contract by 本 task land |
| Stripe idempotent | confirmStripe 重发返回 existing confirmed 不重复 update | payments.ts line 1031 idempotent guard land | **Pass** |

---

## §6 D88 维度 3 anchor literal grep 实证 self-audit

| Anchor literal | spec 引用 | 实证状态 |
|---|---|---|
| **7 methods** (5 reads + 2 multi-step writes) | §1.1 method 清单 | ✅ Plan Opus 本 turn 已 grep plan §918-927 实证 (G-T19.9 CC 重 verify) |
| **commit `cb2efd5e`** (Task 18 SHA) | §1.3 carry-forward + §2 G-T19.1 期望 | ✅ Snapshot §3 Phase D-3a 段 land 实证 + Project Instructions ack |
| **plan §911-1103** Task 19 整段 | §1.1 + §2 G-T19.8 + §5 audit | ✅ Plan Opus 本 turn 已 sed/grep 实证 (line 911-1103, 末尾 separator) |
| **plan §994-1014** create heredoc XOR predict | §3 风险 A G-T19.10 + §5 D55 audit | ✅ Plan Opus 本 turn 已 view 实证 |
| **plan §1031** confirmStripe idempotent guard | §3 风险 B Stripe idempotent | ✅ Plan Opus 本 turn 已 view 实证 |
| **plan §1063-1078** derivePaidQuantityByOrderItem D56 核心 | §5 D56 核心 audit | ✅ Plan Opus 本 turn 已 view 实证 |
| **Snapshot §3 Phase D-3a + §4'' Task 18 row** (Task 18 closure carry-forward) | §1.3 carry-forward + 风险 D | ✅ Plan Opus 本 turn 已 read + Edit 实证 (workspace 已 land Phase D-3a 段 + §4'' Task 18 row) |
| **Task 17 D56 设计 (无 itemKey + position 锚定)** | §1.2 D56 in payment scope cross-repo 验证 | ✅ Task 17 work-log §1.2 D56 audit + commit body Self-flag 段 ack |
| **schema.prisma Payment + PaymentItem field enumeration** | §2 G-T19.4 + §3 Risk A/B + §4 维度 1/2/3 | ✅ **closure 矫正** — Payment line 333 (raw FK + @relation 双形 storeId/store + sessionId/session, status=PaymentStatus no @default), PaymentItem (storeId raw only NO @relation RLS denormalized matches Task 17 OrderItem, paymentId+payment + orderItemId+orderItem 双形), PaymentStatus enum line 25 { pending, confirmed, refunded }, OrderItem.paymentItems @ line 308 reverse FK. **Branch 1 命中 plan §Task 19 假设**. |
| **wc -l N (payments.ts)** | Stage 1 D75 | ✅ **closure 矫正** — 150 lines (sed extract heredoc body line 932-1081, exact match) |
| **N0 / N1 tsc baseline** | Stage 0.7 + Stage 3 | ✅ **closure 矫正** — N0=N1=103 (Stage 3 diff=0, D83 定性 Pass) |
| **TS2322 fail-loud predict (Stage 2)** | §3 风险 A G-T19.10 #30 防御层 | ✅ **closure 矫正 — predict 假 alarm informational** — Stage 2.0 filtered=0 / 0 TS2322. Root cause: Prisma 6 当 data block 全 raw FK form 走 Unchecked branch 直接, 无视 schema @relation 双形. Task 17 实际 root cause = mixed @relation connect + raw FK 混用 mixed-style XOR fail (OrderItem.menuItem connect 触发). 防御层 over-cautious 数据点 informational only (NOT fabrication archive). 模型 nuance refinement: Task 20+ trigger condition = "data block mixed @relation connect + raw FK". |

**0 凭印象映射 anchor literal 残留** ✅ closure 矫正 12/12 anchor 全 ✅ 实证 (4 forward-looking 项 ⚠️ → ✅).

**关键 closure 数据点**:
- G-T19.6 spec literal definition-incompatible (DP10 NEW, #30 D79 候选 sub-instance 第 3 数据点) — α 决议 forward-only filtered semantics Task 20+
- G-T19.10 XOR predict 假 alarm (informational, 防御层 predict 模型 nuance refinement — data block mixed-style trigger 替 schema @relation 双形)
- Cat 5 子项 第 4+5 数据点 NEW (Plan Opus path / content-state assumption — Snapshot path drift handoffs/ vs archive/ + project knowledge ≠ working tree state)

---

## §7 Snapshot 增量草稿 (Task 19 closure 期 Edit, 双 commit 后)

待 D-3b closure 增量 Edit:
- §1 当前时点 (HEAD ← Task 19 commit, 下一对话目标 → Task 20 split-bills.ts D-4 batch 起步)
- §3 commit 链追加 Phase D-3b 段
- §4'' Phase D 完成总览 add Task 19 row (D56 in payment scope 首落 verdict)
- §6 / §7 / §8 / §9 整节重写 Task 20 启动指引 (split-bills.ts L2 / D-4 batch 切换 review 等级 — Plan Opus + Ian 决议 batch order: Task 20 → 21 → 22 串行 or 并行)
- §7.19 Cat 5 子项 第 3 数据点登记 (Plan Opus working tree vs project knowledge file 混淆, 本 task Plan Opus oversight, CC Stop 拦住 working-as-designed)

---

## §8 commit body 模板 (双 commit)

### Step 1 — work-log commit (本文件 land)
docs(phase-5): Phase D Task 19 L1 verify work-log — payments.ts (D56 in payment scope 首落 + Stripe 真钱)
Phase D-3b 单跑 batch 启动: payments.ts (D56 in payment scope 首落 + Stripe
真钱) work-log L1.
7 methods (5 reads + 2 multi-step writes) + D56 核心 derivePaidQuantityByOrderItem
(Map<orderItemId, paidQty> 替 legacy paidItemIds 字符串) + Stripe webhook
idempotent confirmStripe + Payment + PaymentItem 多步 tx.
5 维度 pre-verdict 全预通过 (with 高概率 Stage 2 TS2322 α-extended forward-fix
预案) + 风险 A/B/C/D + Stage 0 G-T19.1-10 完整 grep spec (含 G-T19.4
schema-side full field enumeration grep #30 防御层应用 + G-T19.10 Prisma XOR
predict carry-forward Task 17 createDraftOrder pre-fix pattern).
D 决议涉及: D55 (2 multi-step tx 编译期强制) + D56 in payment scope (PaymentItem
全 FK + paidQuantity, 0 itemKey 字符串) + D56 核心 (derivePaidQuantityByOrderItem
Map aggregate) + Stripe idempotent contract.
D88 维度 3 anchor literal grep 实证 self-audit: §6 表 12 anchor (8 ✅ grep 实证

4 ⚠️ forward-looking — schema enumeration / wc -l / tsc baseline /
Stage 2 TS2322 probabilistic predict, CC closure 期矫正), 0 凭印象映射 anchor
literal 残留.

Helper cross-instance review skip per Default Push Forward Rule 2 (0 自 flag
风险面 + 不属 Exception Triggers + Plan Opus 新 instance re-grep 已等价
cross-instance verify) + Ian 明批 α 接受全文 → CC 执行消息节奏 atomic.
#30 防御层 second live demo 应用 — Task 18 first live demo work-as-designed
verdict carry-forward, Task 19 应用 G-T19.4 + G-T19.10 + α-extended 预案
carry-forward Task 17 spec template (若 Stage 2 TS2322 触发, Plan Opus 立即
GO forward-fix 不重 turn — Default Push Forward Rule 4 root cause Task 17
已 nail down).
Plan Opus oversight 自 flag (Cat 5 子项 第 3 数据点 候选, 本 commit 由 CC
Stop fail-loud 拦截 working-as-designed): Plan Opus 假设 working tree 已含
work-log file 基于 project knowledge 该 file 存在性, 实际 working tree 空 →
CC git add empty stage 拦截. 同 family as Cowork workspace path 假设
(Snapshot §7.19 Cat 5 子项 数据点 1). 入下次 governance commit batch decide
carry-forward queue.
sessions.json runtime noise revert ack: server/data/sessions.json 修改源 dev
server runtime write (Phase 5 Phase D 期 JsonStore legacy persistence, 无业务
价值, 同 family Snapshot §7.8 qr-order-pg 容器内遗留测试数据). 本 commit 前
revert (git checkout --), 不入任何本对话 commit.
Snapshot 增量 + Archive #28/#29/#30 候选 + Cat 5 子项 (含本 task 第 3 数据点) +
5 governance queue entries carry-forward 入下次 governance commit 节奏点 batch
decide.
Co-Authored-By: Claude noreply@anthropic.com

### Step 3 — impl atomic commit (per plan §1085-1100 模板, Task 17/18 教训增量)
feat(phase-5): add payments repository — D56 in payment scope 首落 + Stripe 真钱
Phase D Task 19 — payments.ts (Phase D 第 4 个 repo).
7 methods:

Reads (5): findById / findBySessionId / findByStripeId / sumConfirmed
(Prisma aggregate) / derivePaidQuantityByOrderItem (D56 核心 Map aggregate)
Writes (2 multi-step): create (Payment + PaymentItem[] 多步 tx) /
confirmStripe (find + update idempotent webhook handler)

D 决议: D55 (2 multi-step tx 编译期强制 TransactionClient) + D56 in payment
scope (PaymentItem 全 FK + paidQuantity, 0 itemKey 字符串 — Task 17 D56 设计
cross-repo 验证 first live demo) + D56 核心 (derivePaidQuantityByOrderItem
Map<orderItemId, paidQty> 替 legacy paidItemIds 字符串集合).
Stripe webhook idempotent contract: confirmStripe 重发同 stripePaymentIntentId
返回 existing confirmed row 不重复 update (line 1031 idempotent guard).
paymentRepo not yet imported by any controller; settlement gateway / webhook
handler 仍用 JsonStore. Migration happens in Phase G Task 35/36.
Stage 0 G-T19.1-10 全 pass (CC 实证 fill in actuals).
5 维度 verdict (CC 实证 fill in actuals).
Post-impl tsc Total: <N1> (vs baseline 103, diff <N1-103> ≤ 0, D83 定性 Pass).
D86 verify forward-fix gate semantic 应用: git diff staged check (carry-forward
Task 18 closure precedent), 0 staged additions D86 violations ✅.
Self-flag carry-forward Task 17/18 — 累积清单 (本 task <N> 数据点 — 期望 0
新增 if G-T19.4 + G-T19.10 防御层 carry-forward Task 18 work-as-designed; 1
Cat 5 子项 第 3 数据点 已在 Step 1 commit body Self-flag 登记 working tree vs
project knowledge file 混淆).
类别 1 D88 维度 3 anchor literal grep 实证 (#29 候选, 5 + 8th + 9th + 本 task):

Task 15 setup.ts (Archive #27)
Task 15 wc -l 38±2 (Archive #27)
Task 16 Risk C moduleResolution
Task 17 G-T17.6 path literal pnpm hoist
Task 17 Stage 1 D56 grep 不自洽
Workspace folder 双空格 path (Task 17 closure)
Plan Opus v5.0 851505d9 commit body self-claim '0 violation' vs 5 处实际

类别 2 D79 候选 Plan-as-code dryrun missing (#30 候选, 2 数据点 + Task 18
work-as-designed verification + 本 task second live demo):
6. Task 17 Stage 2 TS2322 Prisma XOR semantics
7. Task 17 Stage 2-fix.0 schema field discovery (Order.tableName + OrderItem.menuItemId raw)

Task 18 #30 防御层 first live demo work-as-designed (G-T18.4 + G-T18.10 双 pre-empt 0 真 fail-loud)
本 task #30 防御层 second live demo (G-T19.4 + G-T19.10 应用)

Cat 5 协作心智模型混淆 子项 (3 数据点):

Cowork workspace path 假设 (跨 system topology, Snapshot §7.19 数据点 1)
Helper Round 2 Flag A 误归 §6 forward-looking 措辞冗余 (Task 17 closure)
Plan Opus working tree vs project knowledge file 混淆 (本 task Step 1 lead-up,
CC Stop fail-loud 拦截 working-as-designed, Plan Opus oversight)

5 governance queue entries (本 task carry-forward, 入下次 governance commit
batch atomic decide):

Pre-Flight Checklist D86 条款 update (gate semantic = git diff staged check)
Project description Default Decision Rule 不变项段 D86 条款 sync
Snapshot §6 D86 候选 entry sub-class update (verify gate + exempt enum)
Phase H Task 45 reconcile queue 加项 (§7 heading rename + D86 spec template)
D88 维度 3 延伸 sub-rule 候选 (self-state assertion 凭印象 about
self-produced artifact 必先 grep 实证)

Plan §Task 19 heredoc patch v9 候选 (next governance commit decide):

若 G-T19.4 schema drift 触发 α-extended forward-fix → plan §Task 19 同步修订
若 G-T19.10 XOR predict 命中 TS2322 → plan §Task 19 同 Task 17 模式修订
(Payment Checked relation connect store/session + PaymentItem keep raw FK)

#28/#29/#30 候选 + Cat 5 子项 (3 数据点) + 5 governance queue entries β 双 entry
路径状态 — 入下次 governance commit batch atomic decide.
Work-log: docs/superpowers/work-logs/2026-04-26-phase-d-task-19-payments-l1-verify.md
(<wc -l> lines @ <work-log SHA>).
Co-Authored-By: Claude noreply@anthropic.com

---

## §9 closure 汇报模板 (CC impl 完成 + push verify 后, Plan Opus 收回报)

CC closure 汇报应含:
- Stage 0 G-T19.1-10 全 pass actual output (含 G-T19.4 schema 实证 字段清单)
- Step 1 heredoc land + D75 + wc -l 实际
- Step 2 单文件 tsc 0 own error (含 G-T19.10 XOR predict 是否 fail-loud 触发, 若 fail → α-extended forward-fix 后 Stage 2-fix.4 0 own error)
- Step 3 全 server tsc Total vs baseline 103 (D83 定性)
- Step 4 commit SHA + push origin verify (D76)
- Total 规则 8 暂停 count + 处置 (期望 0-1, 若 G-T19.10 命中 1 处 α-extended forward-fix)

Plan Opus 收 closure 后:
1. §4 / §5 / §6 表填 Final verdict + ⚠️ → ✅ 矫正
2. Snapshot 增量 Edit (§1 / §3 / §4'' / §9 Task 20 启动指引重写)
3. #28/#29/#30 候选 + Cat 5 子项 (3 数据点) + 5 governance queue entries status carry-forward (本 task 期望 0 新增 D88 维度 3 / D79 数据点 if 防御层成功; 1 Cat 5 子项 第 3 数据点 已登记 working tree vs project knowledge file 混淆)
4. Default Push Forward → 进 Task 20 work-log 起草 (split-bills.ts L2 / D-4 batch — 决议 Task 20/21/22 batch order)

---

## §10 累积数据点 ack (Task 17/18 carry-forward + 本 task 防御层应用 + 本 task Cat 5 第 3 数据点)

**Task 17/18 closure 期 9 数据点 + Cat 5 子项 (2 → 3) + 5 governance queue entries** carry-forward:

类别 1 D88 维度 3 anchor literal grep 实证 (#29 候选, 7 sub-instance):
1-5. Task 15 setup.ts SHA + wc / Task 16 Risk C / Task 17 G-T17.6 / Task 17 D56 grep
6 (8th). Workspace folder 双空格 path (Task 17 closure)
7 (9th). Plan Opus v5.0 851505d9 commit body self-claim discrepancy

类别 2 D79 候选 Plan-as-code dryrun missing (#30 候选, 2 数据点):
8 (Task 17 Stage 2 TS2322 Prisma XOR) + 9 (Task 17 Stage 2-fix.0 schema field discovery)

类别 5 协作心智模型混淆 子项 (3 数据点):
- Cowork workspace path 假设 (跨 system topology)
- Helper Round 2 Flag A 误归 §6 forward-looking 措辞冗余
- **本 task** Plan Opus working tree vs project knowledge file 混淆 (Step 1 lead-up, CC Stop fail-loud 拦截 working-as-designed)

**本 task 防御层应用** (carry-forward Task 18 work-as-designed verdict):
- G-T19.4 schema-side full field enumeration grep (Payment + PaymentItem model 全字段 + @relation status + required vs optional + itemKey count 0 verify)
- G-T19.10 Prisma XOR predict (create method 含 nested items.create — same pattern as Task 17 createDraftOrder pre-fix, 高概率 Stage 2 TS2322 α-extended forward-fix carry-forward Task 17 spec template)
- §6 self-audit 表 12 anchor 全 grep 实证 (含 forward-looking 4 项 closure 期矫正)
- D88 维度 3 + D79 防御层 second live demo (本 task)

**Helper Round 2 minor flag carry-forward Task 17/18** (closed):
- D68 source verify (Task 17): pre-existing in Snapshot §6 v1 既有 7 项 第 2 个, ignore branch confirmed
- §6 anchor ⚠️ 误归 forward-looking (Task 17 closure): 措辞冗余 Cat 5 子项候选, 入下次 governance commit decide

**累积 9 数据点 + Cat 5 子项 (3) + 5 governance queue entries** β 双 entry 路径状态: 入下次 governance commit 节奏点 Ian 明批 batch decide, 本 task 不动 D 候选升格 / Archive formal entry.

**Task 19 actual outcome (closure 矫正)**:
- 0 新增 D88 维度 3 anchor literal grep 实证 数据点 (#29 候选 carry-forward 9 sub-instance unchanged)
- **DP10 NEW** entry #30 D79 候选 (3 sub-instance):
  - DP6: Task 17 Stage 2 TS2322 Prisma XOR semantics (existing)
  - DP7: Task 17 Stage 2-fix.0 schema field discovery (existing) + Task 18 防御层 first live demo + Task 19 防御层 second live demo
  - **DP10 NEW**: Task 19 G-T19.6 bare tsc invocation semantics (默认 ES3 vs Prisma 6 library.d.ts ES2015+ 冲突, file-agnostic env noise — α 决议 spec literal forward-only filtered semantics Task 20+, D77 不 retro-amend Task 17/18/19 已 land work-log)
- **Cat 5 子项 累积 5 数据点 trend rising 强化 D89 候选**:
  - DP1: Cowork workspace path 假设 (跨 system topology, Snapshot §7.19 数据点 1)
  - DP2: Helper Round 2 Flag A 误归 §6 forward-looking (Task 17 closure)
  - **DP3 NEW**: Plan Opus working tree vs project knowledge file 存在性 混淆 (Phase D-3b Step 1 lead-up)
  - **DP4 NEW**: Plan Opus path 凭印象 cross-system topology (handoffs/ vs archive/, Phase D-3b §F Stage 1)
  - **DP5 NEW**: Plan Opus assumed project knowledge file content = current repo state (Phase D-3b §F Stage 1, Task 18 closure 增量 in /mnt/project 但不在 repo) — α′ 路径 atomic absorb T18 deferred 增量 + T19 增量
- **Informational 防御层 predict 模型 nuance refinement** (NOT fabrication, NOT D 候选 升格 本 turn): G-T19.10 XOR predict 假 alarm 由 Prisma 6 Unchecked branch 直接命中 raw FK form 解释. 入 Plan Opus 内部知识 carry-forward Task 20+ spec output + 7th governance queue entry NEW (Pre-Flight Checklist v2 candidate, Helper R3 minor flag 1).

**累积**: 9 (D88 维度 3) + 3 (D79 sub-instance, DP10 NEW) + 5 (Cat 5 子项, DP3+DP4+DP5 NEW, trend rising 强化 D89 候选) + 8 governance queue entries (NEW 6th: Task 20+ G-Tn.6 filtered semantics; NEW 7th: Pre-Flight Checklist v2 XOR predict trigger refinement explicit; NEW 8th: Plan Opus 跨 system / path / state assumption 必先 CC dump 实证, /mnt/project 是 input reference 不是 working tree state 权威) — β 双 entry 路径状态: 入下次 governance commit batch atomic decide.

---

*Phase D Task 19 L1 verify work-log · Plan Opus 产出 2026-04-26 · #30 防御层 second live demo (G-T19.4 schema enumeration + G-T19.10 Prisma XOR predict) carry-forward Task 18 work-as-designed verdict · α-extended forward-fix spec 预案 carry-forward Task 17 spec template (若 Stage 2 TS2322 触发, Plan Opus 立即 GO 不重 turn) · Stripe 真钱 idempotent contract 关键风险*

# Phase D Task 18 L1 verify work-log — sessions.ts (业务 source of truth)

> **Task**: Phase D Task 18 (sessions.ts — 8 methods, 3 reads + 5 writes; 3 multi-step tx 双向 update)
> **Review 等级**: L1 (Project Instructions Default 表 / 业务 source of truth + 多步 tx 双向 update parent.child_id ↔ child.parent_id 升级 trigger 命中)
> **Batch**: D-3a 单跑
> **前序**: Task 17 orders.ts ✅ commit `ff5e881b` carry-forward (D55+D56+D57+D68 首落 + α/α-extended forward-fix + 7 数据点 #29/#30 候选累积)
> **节奏**: 双 commit (work-log Step 1 + impl Step 3 atomic)
> **产出链**: 本 work-log → Ian sync repo + 明批 → Helper cross-instance review (async) → Ian 明批 → CC 执行消息 → impl atomic commit + push verify
> **撰写时点**: 2026-04-26 (Phase D Task 17 closure 后 Default Push Forward, Plan Opus 起 Task 18 work-log L1)
> **应用 Task 17 教训**: Stage 0 增 schema-side full field enumeration grep (Session + Table model) per #30 数据点 7 教训 + D88 维度 3 延伸 sub-rule 候选 live demo

---

## §1 Task scope + carry-forward ack

### 1.1 Task 18 scope (8 methods, plan §753-892 grep 实证基准)

sessions.ts = Phase D 11 个 Repository 第 3 个, **业务 source of truth** — Session 1:N orders (draft + submitted) + 1:N payments + table occupancy state. 8 methods 分布:

**Reads (3)**:
- `findById(id, db?)`: 基础读
- `findActiveByTable(tableId, db?)`: 桌号当前 open session (业务 invariant 应用层 enforced, 非 DB constraint)
- `listByStore(db?)`: 当前租户全 session (admin 视图)

**Writes (5)**:
- `createForTable(input, tx)`: **D55 多步 tx 双向 update** (tx.session.create + tx.table.update currentSessionId)
- `closeSession(id, tx)`: **D55 多步 tx 双向 update** (status='closed' + closedAt + 清 table.currentSessionId)
- `reopenSession(id, tx)`: **D55 多步 tx 双向 update** (反向, status='open' + closedAt=null + table.currentSessionId reset)
- `applyCouponSnapshot(id, snapshot, db)`: **D13-adjacent coupon snapshot 哲学** flatten 字段 (couponCode / couponType / couponValue / couponAppliedAt frozen at apply time, 不 FK)
- `updateSettlementMode(id, mode, db)`: 单步写 (by-item / by-percent / unset)

### 1.2 D 决议涉及清单

| D | 内容 | Task 18 落点 |
|---|---|---|
| **D55** | 写操作 db 必填 / 多步写强制 `Prisma.TransactionClient` | createForTable + closeSession + reopenSession 3 处 `tx: Prisma.TransactionClient` 编译期强制 |
| **D13-adjacent** | Coupon snapshot 哲学 (与 D68 同 family — 写入 freeze, 不 FK) | applyCouponSnapshot flatten 4 字段 (couponCode / couponType / couponValue / couponAppliedAt) |
| D55 (single-step writes) | 单步写 db: Db 必填 | applyCouponSnapshot + updateSettlementMode `db: Db` 必填非 default |
| D55 (reads) | 读默认 prisma | 3 reads `db: Db = prisma` 默认 |

**双向 update 边界** (L1 升级 trigger 核心): Session.tableId ↔ Table.currentSessionId 双向 FK 更新原子性. createForTable / closeSession / reopenSession 3 method 必单 tx 完成 (avoid orphan state — Session created but Table.currentSessionId not set, 或反之).

### 1.3 Task 17 carry-forward ack

- **prisma-client.ts API surface** (Snapshot §7.18 DP2 修正版): `prisma` (app_user) + `systemPrisma` (system_worker) + `Db = PrismaClient | Prisma.TransactionClient` + 4 wrapper. Task 18 import `prisma, type Db from './prisma-client.js'` (per Task 17 plan line 379 anchor pattern)
- **Task 17 orders.ts** (`ff5e881b`): findBySessionId + findDraft 引用 sessionId, sessions.ts 提供 Session row 作 Task 17 method input. **Cross-task contract**: Task 17 期望 Session 表存在 + storeId / id / tableId 字段 + status enum (open / closed)
- **Task 17 α-extended 教训内化** (carry-forward to Task 18 Stage 0 G-T18.4):
  - schema field discovery missing 防御: cat schema.prisma 全 model field enumeration + @relation status + required vs optional 实证
  - Prisma Create vs UncheckedCreate XOR semantics 防御: heredoc 检查 nested write 是否 mix raw FK + relation, predict TS2322 风险
- **#28 + #29 + #30 候选状态** (待下次 governance commit decide, carry-forward Task 18 commit body Self-flag 段 ack)

---

## §2 Stage 0 G-T18.1-10 完整 grep spec (CC 执行)

CC 执行消息 Stage 0 必含下列 10 grep 实证. fail-loud on unexpected → 规则 8 暂停 + 回报 Plan Opus α/β/γ.

**G-T18.1** — commit chain verify:
```bash
git log -10 --format="%h %s"
# 期望 (post Task 17 closure + Step A/B sync):
#   <work-log SHA>      docs   Phase D Task 18 L1 verify work-log
#   <closure sync SHA>  docs   Phase D Task 17 closure — work-log §4/§5/§6 + Snapshot 增量
#   ff5e881b            feat   Phase D Task 17 — orders repository B2 core (10 methods)
#   3bb5cd1c            docs   Phase D Task 17 work-log round 2 micro-adjust
#   7dc63fd3            docs   Phase D Task 17 L1 verify work-log
#   019ab826            feat   Phase D Task 16 store.ts + Snapshot v5.0 增量 Edit
#   ...
# SHA mismatch → 规则 8 暂停
```

**G-T18.2** — working tree clean: `git status --short` 期望空输出.

**G-T18.3** — `server/src/repositories/` baseline:
```bash
ls -la server/src/repositories/
# 期望含: prisma-client.ts ✅ + store.ts ✅ + orders.ts ✅ (Task 17 land) + json-store.ts (legacy) + auth.repository.ts (legacy)
# 期望不含: sessions.ts (Task 18 待写)
```

**G-T18.4** — **schema.prisma full field enumeration** (Session + Table model, **#30 教训 应用 + D88 维度 3 延伸 sub-rule 候选 live demo**):
```bash
# G-T18.4a — Session model 全字段 (CC sed 实证 line range, plan Opus 不预 assert exact line — Snapshot §7.18 G-D16.4 cite 22 model 不含 Session line 号 anchor)
grep -n "^model Session " server/prisma/schema.prisma
# 期望: Session model 行号 N0
sed -n "<N0>,<N0+50>p" server/prisma/schema.prisma | head -60
# 期望含字段:
#   - id String @id (PK)
#   - storeId String / store Store @relation
#   - tableId String / table Table @relation
#   - status SessionStatus enum (open / closed)
#   - settlementMode String? (nullable, 'unset' / 'by-item' / 'by-percent')
#   - couponCode String? / couponType String? / couponValue Decimal/Int? / couponAppliedAt DateTime? (snapshot fields)
#   - closedAt DateTime?
#   - createdAt DateTime @default(now())
# CC 实证 record actual fields + required vs optional + @relation status

# G-T18.4b — Table model 全字段 (currentSessionId 反向 FK)
grep -n "^model Table " server/prisma/schema.prisma
# 期望: Table model 行号 N1
sed -n "<N1>,<N1+30>p" server/prisma/schema.prisma | head -40
# 期望含字段:
#   - id, storeId, name (Mode C δ 桶 1 RESOLVED label→name), number (required Int)
#   - currentSessionId String? (反向 FK to Session, nullable)
#   - currentSession Session? @relation(fields: [currentSessionId], references: [id]) — 可能命名不同, CC 实证
#   - sessions Session[] @relation("session_table_FK") — Session.table FK 反向 (1:N relation alias)
# CC 实证 record actual relation field names + alias (避免 Task 17 数据点 7 schema field discovery missing 重发)

# G-T18.4c — SessionStatus enum 定义
grep -n "^enum SessionStatus" server/prisma/schema.prisma
sed -n "<line>,<line+10>p" server/prisma/schema.prisma | head
# 期望: enum SessionStatus { open closed } 或 类似 (大小写 + 值)

# G-T18.4d — settlementMode field 类型 verify (String? vs enum?)
grep -nE "settlementMode|settlement_mode" server/prisma/schema.prisma
# CC 实证 actual type — plan §Task 18 heredoc literal `'unset' | 'by-item' | 'by-percent'` 期望 String? (3 string union not enum)
```

**Decision branches** (post G-T18.4 schema 实证):
- Branch 1 (schema matches plan §Task 18 heredoc 假设): 进 Stage 1 plan heredoc 逐字 sed extract
- Branch 2 (Session 字段缺失 / 命名 drift, e.g. `closedAt` 未定义): 规则 8 暂停 → Plan Opus 重 spec heredoc α-extended forward-fix
- Branch 3 (Table.currentSessionId 反向 FK 命名不同, e.g. `current_session` 而非 `currentSession`): 规则 8 暂停 → Plan Opus 重 spec heredoc relation field name
- Branch 4 (Session @relation field name 不同, e.g. `store` / `table` relation 命名 drift): 规则 8 暂停 → Plan Opus 重 spec
- Branch 5 (双向 FK schema 一侧 only, e.g. Session.table 有 @relation 但 Table.currentSession 无): 规则 8 暂停 → Plan Opus 评估是否影响 plan §Task 18 双向 update 实现

**G-T18.5** — prisma-client.ts D55 anchor (carry-forward Task 17 G-T17.5):
```bash
grep -nE "^export (const|type|function|async function) " server/src/repositories/prisma-client.ts
# 期望: prisma + systemPrisma + Db type + 4 wrapper (Snapshot §7.18 DP2 修正版)
```

**G-T18.6** — Prisma Client generated types present (carry-forward Task 17 G-T17.6 α forward-fix):
```bash
# Functional verify (替代 path literal check)
cd server && ./node_modules/.bin/tsc --noEmit src/repositories/orders.ts 2>&1 | grep -cE "error TS[0-9]+:" ; cd "<repo root>"
# 期望: 0 own errors in orders.ts (transitive 不计)
```

**G-T18.7** — tsc baseline (post Task 17, D83 定性 reference):
```bash
cd server && ./node_modules/.bin/tsc --noEmit 2>&1 | grep -cE "error TS" ; cd "<repo root>"
# 期望: 103 (= Snapshot §8 cite, post Task 17 healthy state)
# 不等 103 → 规则 8 暂停 + 回报 Plan Opus
```

**G-T18.8** — plan §Task 18 整段 line range:
```bash
grep -n "^## Task 1[89]" docs/superpowers/plans/2026-04-17-phase5-postgres-migration/phase-d-repositories.md
# 期望: Task 18 line 753 + Task 19 line 911
sed -n '753,892p' docs/superpowers/plans/2026-04-17-phase5-postgres-migration/phase-d-repositories.md
# 期望显示 Task 18 8 method 完整 + heredoc body line 774-891 范围
```

**G-T18.9** — method count 自检 (per work-log §1.1 实证基准):
```bash
sed -n '760,769p' docs/superpowers/plans/2026-04-17-phase5-postgres-migration/phase-d-repositories.md \
  | grep -cE "^[[:space:]]*-[[:space:]]*\`[a-z][a-zA-Z]*\("
# 期望: 8 (3 reads + 5 writes)
# 不等 8 → 规则 8 暂停 + 回报 Plan Opus
```

**G-T18.10** — Prisma Create vs UncheckedCreate XOR predict (per #30 数据点 6 教训, **Plan-as-code dryrun 候选 live demo**):
```bash
# Predict heredoc createForTable 是否触发 TS2322 XOR fail
sed -n '813,830p' docs/superpowers/plans/2026-04-17-phase5-postgres-migration/phase-d-repositories.md
# 期望显示:
#   tx.session.create({ data: { storeId: input.storeId, tableId: input.tableId, status: 'open', settlementMode: 'unset' }})
#   tx.table.update({ where: { id: input.tableId }, data: { currentSessionId: session.id }})
# Predict:
#   - session.create 用 raw FK (storeId / tableId): 同 Task 17 createDraftOrder pre-fix pattern
#   - 若 Session 在 schema 含 store + table @relation, raw FK + 无 nested create 触发 TS2322 (Without<Checked, Unchecked> & Unchecked branch storeId: never)
#   - 但无 nested write (items: { create }), TS XOR 推断更直接, 可能 raw FK 模式仍 work — Plan Opus 不预 assert
#   - CC Stage 1 单文件 tsc 实证后判 (Stage 2-fix 类似处理路径 carry-forward)
```

**Stage 0 closure 条件**: G-T18.1-10 全 pass + 0 规则 8 暂停 → 进 Stage 1.

---

## §3 风险 A/B/C/D

### 风险 A — 类型签名 + Prisma 类型集成

**关注点**:
- D55 multi-step tx 必填 `Prisma.TransactionClient` (3 处) 编译期强制 caller withTenantContext
- session.create + table.update 是否触发 Prisma Create vs UncheckedCreate XOR (Task 17 #30 数据点 6 同模式风险) — G-T18.10 predict
- applyCouponSnapshot input type structure (snapshot 字段 nested object) Prisma update data 字段类型对齐

**Mitigation**:
- G-T18.10 Plan-as-code dryrun predict + Stage 1 单文件 tsc 实证
- 若 TS2322 出 → α-extended forward-fix (Order Checked relation connect 同 Task 17 pattern: `store: { connect }`, `table: { connect }`)

### 风险 B — 运行时 (双向 update 原子性 + RLS + race)

**关注点**:
- **双向 update 原子性**: createForTable / closeSession / reopenSession 必须 single tx, partial update 导致 orphan state (Session created but Table.currentSessionId not set / Table.currentSessionId points to non-existent Session)
- **Race condition**: createForTable caller 应先 findActiveByTable 确认无 open session. 同 Task 17 createDraftOrder partial unique precondition pattern. 但 Session schema 可能无 partial unique constraint — 仅应用层 invariant.
- **RLS**: 全 storeId scoped, withTenantContext caller contract.

**Mitigation**:
- D55 编译期强制 multi-step tx 必填
- 函数注释 doc race precondition (caller findActiveByTable 先)
- Phase H integration test 跑 RLS coverage + tenant isolation (carry-forward Phase C tests, sessions table 应自动包含 in tenant_isolation policy 6 表 list)

### 风险 C — D 决议遵守

**关注点**:
- D55 3 multi-step writes 必填 TransactionClient (vs Db union 会绕编译期 tx 强制)
- D13-adjacent coupon snapshot 哲学: applyCouponSnapshot flatten 字段 vs FK pattern. heredoc 实证 4 字段 (couponCode / couponType / couponValue / couponAppliedAt) 直接 update Session row, 不 reference Coupon row.
- D 决议关于 settlementMode: heredoc literal `'unset' | 'by-item' | 'by-percent'` — 3 string union, 应是 String? schema (G-T18.4d 实证)

**Mitigation**:
- §5 D 决议 audit 表逐项 verify (CC impl 后 closure 增量 Edit 填实证 anchor)
- D88 维度 3 §6 self-audit 全 grep 实证

### 风险 D — Cross-task / Cross-phase coupling

**关注点**:
- **Phase G Task 33+ session-cart 重写 foundation**: Session 是 cart context, Phase G route 层 session 创建 + cart 嵌入 logic 由 sessions.ts 提供 baseline contract
- **Task 17 orders.ts 引用**: orders.ts findBySessionId / findDraft 用 sessionId — Session 必须 already exist (createForTable 先于 createDraftOrder 调用)
- **Table model 双向 FK 共享**: sessions.ts 直接 update Table.currentSessionId — 与 Task 16 store.ts (Store model) / 后续 Task 21 menu.ts (可能含 Table?) coupling. CC G-T18.4b 实证 Table model 字段 + sessions.ts 与其他 repo 是否 collide.
- **Coupon model 引用** (D13-adjacent): applyCouponSnapshot 不 FK Coupon, 但 caller (Phase G route 层) 需先 read Coupon row 才能 build snapshot. Task 24 coupons.ts 是 Coupon repo. Cross-task contract: Task 24 coupons.findByCode 提供 Coupon row, Phase G route 层调 sessions.applyCouponSnapshot.

**Mitigation**:
- §5 D 决议 audit 含 cross-task contract 验证
- Phase G Task 33+ / Task 24 reconcile 列入 Snapshot 增量草稿 §7 pending drifts (本 task 不动)

---

## §4 5 维度 pre-verdict

| 维度 | 内容 | Pre-verdict |
|---|---|---|
| 1. 类型签名正确性 | D55 multi-step tx + Prisma type integration + applyCouponSnapshot snapshot input type | **预通过** (G-T18.10 predict + Stage 1 tsc 实证后 confirm; #30 教训 应用 — 若 TS2322 出 α-extended forward-fix carry-forward Task 17 pattern) |
| 2. RLS / 多租户边界 + 双向 update 原子性 | storeId scoped + Session.tableId ↔ Table.currentSessionId 双向 update + tx 编译期强制 | **预通过** (D55 强约束 + 函数注释 race precondition + Phase H integration test 跑) |
| 3. D 决议遵守 | D55 多步 tx + D13-adjacent coupon snapshot + 双向 update 原子性 | **预通过** (§5 audit 逐项实证) |
| 4. 状态机 + 双向 FK 一致性 | open ↔ closed lifecycle + currentSessionId reset/clear/set 一致 | **预通过** (函数注释 + tx 编译期强制 + race precondition doc) |
| 5. Cross-task coupling | Phase G Task 33+ foundation + Task 17 orders.ts findBySessionId 引用 + Task 24 coupons.ts cross-repo + Table model shared (Task 21 menu.ts coupling 待 plan §Task 21 探究) | **预通过** (B2 / Phase G contract 由本 task land, 后续 task 复用) |

**Final verdict** (CC impl 完成后 closure 增量 Edit 填): 待 CC Step 1-4 完成 + tsc 实证后 Plan Opus 判全 5 维度 Pass / 部分 Fail (规则 8 暂停).

---

## §5 D 决议遵守 audit (CC impl 后 closure 填实证)

| D | spec 检验点 | grep / impl 实证 | Pre-verdict |
|---|---|---|---|
| D55 (tx) | createForTable + closeSession + reopenSession 签名 `tx: Prisma.TransactionClient` (非 Db, 编译期强制 multi-step tx) | heredoc plan §Task 18 line ~815 + ~836 + ~848 (forward-looking, CC实证矫正) | 预通过 |
| D55 (reads) | findById + findActiveByTable + listByStore (3 reads) `db: Db = prisma` 默认 | heredoc reads 默认参数 | 预通过 |
| D55 (writes single-step) | applyCouponSnapshot + updateSettlementMode (2 single-step writes) `db: Db` 必填非 default | heredoc writes 签名 `db: Db` 必填 | 预通过 |
| D13-adjacent | applyCouponSnapshot flatten 4 字段 (couponCode / couponType / couponValue / couponAppliedAt frozen at apply time, 不 FK Coupon) | heredoc plan §Task 18 line ~865-882 update data 4 字段 | 预通过 |
| 双向 update 原子性 | createForTable / closeSession / reopenSession 必 tx, session ↔ table.currentSessionId 同 tx | heredoc 3 method 内部 await tx.session.X + await tx.table.update 2-step 模式 | 预通过 |

---

## §6 D88 维度 3 anchor literal grep 实证 self-audit

| Anchor literal | spec 引用 | 实证状态 |
|---|---|---|
| **8 methods** (3 reads + 5 writes) | §1.1 method 清单 | ✅ Plan Opus 本 turn 已 grep plan §753-892 实证 (G-T18.9 CC 重 verify) |
| **commit `ff5e881b`** (Task 17 SHA) | §1.3 carry-forward + §2 G-T18.1 期望 | ✅ Snapshot §3 Phase D-2 段 land 实证 + Project Instructions ack |
| **plan §753-892** Task 18 整段 | §1.1 + §2 G-T18.8 + §5 audit | ✅ Plan Opus 本 turn 已 sed/grep 实证 |
| **plan §753-892 line 813-830** createForTable heredoc | §3 风险 A G-T18.10 + §5 双向 update audit | ✅ Plan Opus 本 turn 已 view 实证 |
| **plan §865-882** applyCouponSnapshot heredoc 4 字段 | §5 D13-adjacent audit | ✅ Plan Opus 本 turn 已 view 实证 |
| **Snapshot §7.18 / §3 Phase D-2 段** (Task 17 closure carry-forward) | §1.3 + 风险 D + 累积数据点 | ✅ Plan Opus 本 turn 已 read 实证 (workspace 已 land Phase D-2 段) |
| **D68 pre-existing in Snapshot §6 v1 既有 7 项 第 2 个** (Helper Round 2 minor flag closed) | §1.3 carry-forward Task 17 D68 应用 | ✅ Plan Opus 本 turn 已 verify (Snapshot §6 v1 既有清单) |
| **schema.prisma Session + Table model** field enumeration | §2 G-T18.4 + §3 Risk A/B + §4 维度 1/2/4 | ⚠️ **forward-looking** — Plan Opus 不预 assert exact 字段 / @relation 状态 / line range, CC G-T18.4 实证后 record (#30 教训应用, D88 维度 3 延伸 sub-rule 候选 live demo) |
| **wc -l N (sessions.ts)** | Stage 1 D75 | ⚠️ **forward-looking** — Plan Opus 不预设 N (Archive #27 教训 — 不用 N±M range claim), CC Stage 1 实证 record |
| **N0 / N1 tsc baseline** | Stage 0.7 + Stage 3 | ⚠️ **forward-looking** — CC 实证 record (期望 N0=N1=103, D83 定性 Pass) |

**0 凭印象映射 anchor literal 残留**. forward-looking 项明示标 ⚠️ + CC closure 期实证矫正. **Flag A noting carry-forward Task 17** (work-log §10 第 3 条 forward-looking 性质).

---

## §7 Snapshot 增量草稿 (Task 18 closure 期 Edit, 双 commit 后)

待 D-3a closure 增量 Edit:
- §1 当前时点 (HEAD ← Task 18 commit, 下一对话目标 → Task 19 payments.ts D-3b 单跑)
- §3 commit 链追加 Phase D-3a 段 (Task 18 work-log + impl 双 commit + closure docs sync)
- §4'' Phase D 完成总览 add Task 18 row
- §6 / §7 / §8 / §9 整节重写 Task 19 启动指引 (payments.ts L1, D-3b 单跑, plan §911+ 段 carry-forward)

---

## §8 commit body 模板 (双 commit)

### Step 1 — work-log commit (本文件 land)

```
docs(phase-5): Phase D Task 18 L1 verify work-log — sessions.ts (业务 source of truth + 双向 update L1)

Phase D-3a 单跑 batch 启动: sessions.ts (业务 source of truth) work-log L1.

8 methods (3 reads + 5 writes) + 3 multi-step tx 双向 update (session.tableId ↔
table.currentSessionId) + D13-adjacent coupon snapshot 哲学 (applyCouponSnapshot
flatten 4 字段).

5 维度 pre-verdict 全预通过 + 风险 A/B/C/D + Stage 0 G-T18.1-10 完整 grep spec
(含 G-T18.4 schema-side full field enumeration grep #30 教训应用 + D88 维度 3
延伸 sub-rule 候选 live demo + G-T18.10 Prisma XOR predict).

D 决议涉及: D55 (3 multi-step tx 编译期强制) + D13-adjacent (coupon snapshot
flatten 字段) + 双向 FK 一致性 (Session ↔ Table.currentSessionId).

D88 维度 3 anchor literal grep 实证 self-audit: §6 表 10 anchor (7 ✅ grep
实证 + 3 ⚠️ forward-looking CC closure 期矫正), 0 凭印象映射 anchor literal
残留.

Helper cross-instance review (async) + Ian 明批 → CC 执行消息节奏.

Snapshot 增量 + Archive #28/#29/#30 候选 carry-forward 入下次 governance commit
节奏点 batch decide (本 task 不动 D 候选升格).

Co-Authored-By: Claude <noreply@anthropic.com>
```

### Step 3 — impl atomic commit (per plan §894-907 模板, Task 17 教训增量)

```
feat(phase-5): add sessions repository — 业务 source of truth + 双向 update tx

Phase D Task 18 — sessions.ts (Phase D 第 3 个 repo).

8 methods:
- Reads: findById / findActiveByTable / listByStore (3 reads, db: Db = prisma 默认)
- Writes: createForTable / closeSession / reopenSession (3 D55 multi-step tx
  双向 update session ↔ table.currentSessionId) + applyCouponSnapshot
  (D13-adjacent coupon snapshot flatten 4 字段) + updateSettlementMode (单步)

D 决议: D55 (3 multi-step tx 编译期强制 TransactionClient) + D13-adjacent
(coupon snapshot flatten 字段, frozen at apply time, 不 FK Coupon).

双向 update 原子性: createForTable / closeSession / reopenSession 同 tx 完成
session.X + table.update currentSessionId, partial update 阻挡 (orphan state
风险 by D55 强约束 + caller findActiveByTable race precondition).

sessionRepo not yet imported by any controller; session-cart.ts / settlement
gateway 等仍用 JsonStore. Migration happens in Phase G Task 33+.

Stage 0 G-T18.1-10 全 pass:
- commit chain HEAD = <work-log SHA> (Task 18 work-log + closure sync)
- working tree clean
- repo files (orders.ts ✅ + sessions.ts written by 本 commit)
- schema.prisma Session + Table model full field enumeration ✅ (CC G-T18.4
  实证: <Session 字段清单> + <Table.currentSessionId 反向 FK>)
- prisma-client API 4 wrapper ✅
- Prisma Client functional verify ✅
- tsc baseline pre-impl: <N0> = 103
- plan §753-892 Task 18 整段 ✅
- method count = 8 (3 reads + 5 writes)
- Prisma XOR predict + (forward-fix branch if needed)

5 维度 verdict (CC 实证):
1. 类型签名正确性: <Pass/Fail per Stage 2 单文件 tsc>
2. RLS / 多租户 + 双向 update: Pass
3. D 决议遵守: Pass (D55 + D13-adjacent + 双向 FK 一致性)
4. 状态机 + 双向 FK 一致性: Pass
5. Cross-task coupling: Pass (Phase G Task 33+ + Task 17 + Task 24 contract land)

Post-impl tsc Total: <N1> (vs baseline 103, diff <N1-103> ≤ 0, D83 定性 Pass).

Self-flag carry-forward Task 17 — 7 数据点累积 (#29 5 + #30 2) 入下次 governance
commit decide. 本 task Stage 0 G-T18.4 schema-side full field enumeration 应用
#30 教训, **本 task 0 新增数据点期望** (G-T18.4 + G-T18.10 防御层应防 schema
field discovery + Prisma XOR semantics 重发).

Work-log: docs/superpowers/work-logs/2026-04-26-phase-d-task-18-sessions-l1-verify.md
  (<wc -l> lines @ <work-log SHA> — Step 1 work-log + impl Step 3 atomic commit 双 commit).

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## §9 closure 汇报模板 (CC impl 完成 + push verify 后, Plan Opus 收回报)

CC closure 汇报应含:
- Stage 0 G-T18.1-10 全 pass actual output (含 G-T18.4 schema 实证 字段清单)
- Step 1 heredoc land + D75 guard pass + wc -l 实际
- Step 2 单文件 tsc 0 own error (含 G-T18.10 XOR predict 是否 fail-loud)
- Step 3 全 server tsc Total vs baseline (D83 定性)
- Step 4 commit SHA + push origin verify (D76)
- 0 规则 8 暂停 (期望) / 0 critical fabrication

Plan Opus 收 closure 后:
1. §4 / §5 / §6 表填 Final verdict + ⚠️ → ✅ 矫正
2. Snapshot 增量 Edit (§1 / §3 / §4'' / §9 Task 19 启动指引重写)
3. #28/#29/#30 候选 status carry-forward (本 task 期望 0 新增数据点 if G-T18.4 + G-T18.10 防御成功)
4. Default Push Forward → 进 Task 19 work-log 起草 (L1, payments.ts, D-3b 单跑, Stripe 真钱 + D56 in payment scope 首落)

---

## §10 累积数据点 ack (Task 17 carry-forward + 本 task 防御应用)

**Task 17 closure 期 7 数据点累积** (carry-forward, 本 task commit body Self-flag 段同 ack):

类别 1 — D88 维度 3 anchor literal grep 实证 (5 数据点, #29 候选):
1. Task 15 setup.ts last commit (Archive #27)
2. Task 15 wc -l 38±2 (Archive #27)
3. Task 16 Risk C moduleResolution
4. Task 17 G-T17.6 path literal pnpm hoist
5. Task 17 Stage 1 D56 grep 不自洽

类别 2 — D79 候选 Plan-as-code dryrun missing (2 数据点, #30 候选):
6. Task 17 Stage 2 TS2322 Prisma XOR semantics
7. Task 17 Step 2-fix.0 schema field discovery (Order.tableName + OrderItem.menuItemId raw)

**本 task 防御应用** (避免 #30 重发):
- Stage 0 G-T18.4 schema-side full field enumeration grep (Session + Table model 全字段 + @relation status + required vs optional)
- Stage 0 G-T18.10 Prisma Create vs UncheckedCreate XOR predict (heredoc createForTable nested 检查)
- §6 self-audit 表 10 anchor 全 grep 实证 (含 forward-looking 3 项 closure 期矫正)
- D88 维度 3 延伸 sub-rule 候选 (本 task G-T18.4 live demo, formal entry 入下次 governance commit decide)

**Helper Round 2 minor flag carry-forward Task 17** (closed, ignore):
- D68 source verify: D68 pre-existing in Snapshot §6 v1 既有 7 项 第 2 个 (Order snapshot 哲学), Helper "ignore" branch confirmed, 第 8 处累积数据点候选不触发, #29 范围不扩展.

**累积 7 数据点 + Cat 5 子项 (Cowork workspace path 假设)** β 双 entry 路径状态: 入下次 governance commit 节奏点 Ian 明批 batch decide, 本 task 不动 D 候选升格 / Archive formal entry.

---

*Phase D Task 18 L1 verify work-log · Plan Opus 产出 2026-04-26 · Helper cross-instance review (async) + Ian 明批 → CC 执行消息节奏 · 双 commit (work-log + impl atomic) · #30 教训应用 G-T18.4 schema-side full field enumeration grep + G-T18.10 Prisma XOR predict 防御层落地*

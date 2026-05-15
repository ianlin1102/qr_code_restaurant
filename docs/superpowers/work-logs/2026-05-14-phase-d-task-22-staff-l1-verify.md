# Phase D Task 22 L1 verify work-log — staff.ts

> **Task**: Phase D 第 7 个 repo / Phase D-5a batch 头 task (含 Phase E 段 3b 回填 5 methods)
> **前置**: Task 21 menu.ts `aaf9fa79` + plan patch v10 `39666dc8` + D89 升格 atomic batch `c0b8f4e0` → Round 2 `1d93e4af`
> **Review 等级**: L1 (Default Review 表 + Helper review 升级 trigger fired per Phase D-4 batch entry CC dump 6+ 字段 drift)
> **Date**: 2026-05-14

---

## §1 摘要 + scope

**Task 22 deliverable** — `server/src/repositories/staff.ts` (12 methods, plan v10 post-land state per `phase-d-repositories.md` Task 22 段 line 1442-1622)

### Method 清单

| # | Method | 性质 | Origin | Schema 操作 |
|---|---|---|---|---|
| 1 | `findById(id, db?)` | read | 原 Task 22 | `staff.findUnique` + include role |
| 2 | `findByUsername(username, db?)` | read | 原 Task 22 | `staff.findFirst` + include role (RLS 保证本租户) |
| 3 | `listAll(db?)` | read | 原 Task 22 | `staff.findMany` + include role |
| 4 | `create(data, db)` | write single-step | 原 Task 22 | `staff.create` (roleId required no `?? null` fallback per plan v10 patch 1) |
| 5 | `updateRole(staffId, roleId, db)` | write single-step | 原 Task 22 | `staff.update` |
| 6 | `setClockPin(staffId, clockPin, db)` | write single-step | 原 Task 22 | `staff.update` |
| 7 | `setPassword(staffId, passwordHash, db)` | write single-step | 原 Task 22 | `staff.update` (字段 passwordHash NOT password, schema field name fix Phase B Task 2) |
| 8 | `delete(id, db)` | write single-step | Phase E 段 3b 回填 (决策点 F) | `staff.delete` (Agent B removeStaff flow 依赖) |
| 9 | `findActiveTimeEntry(staffId, db?)` | read | Phase E 段 3b 回填 (Phase D 遗漏) | `timeEntry.findFirst` (verifyPin / clockInAt 路径) |
| 10 | `createTimeEntry(data, db)` | write single-step | Phase E 段 3b 回填 | `timeEntry.create` (staffId NOT userId, clockInAt NOT clockIn per plan v10 patches 2-3) |
| 11 | `closeTimeEntry(entryId, clockOutAt, db)` | write multi-step async | Phase E 段 3b 回填 | `timeEntry.findUnique` + check + `timeEntry.update` (read-guard pattern, NOT D55 trigger) |
| 12 | `listTimeEntries(storeId, filter?, db?)` | read with mapper | Phase E 段 3b 回填 | `timeEntry.findMany` + mapper compute duration (Decision G refresh "RETURN shape" per plan v10 patch 5) |

### D 决议应用

- **D55 多步 tx 编译期强制**: closeTimeEntry NOT D55 trigger — 一致 Snapshot §7.23 reasoning ("printer.upsertConfig 触, closeTimeEntry 不触, 因 closeTimeEntry read 是 guard NOT write 依赖 read 决分支"). closeTimeEntry sig `db: Db` 一致 Task 18 sessions.ts `cb2efd5e` carry-forward. Race tolerance: business-level last update wins, NOT data loss.
- **D56 模型对齐**: NA — Task 22 staff/role/TimeEntry scope no cross-entity FK 关联.
- **D57 RLS context**: listAll RLS-relied (no explicit storeId where), listTimeEntries storeId explicit belt-and-suspenders (defense-in-depth RLS + explicit filter). Caller responsibility for `withStoreContext(storeId)` wrap.
- **D89 schema-migration-avoiding**: Decision G refresh "duration in RETURN shape" mapper compute `Math.floor((clockOutAt.getTime() - clockInAt.getTime()) / 60000)` (minutes integer, null if open entry). Mapper layer business invariant NOT DB persisted column. Path B 一致 (Task 22 duration + Printer findFirst + Task 25 estimatedWait drop per Snapshot §7.23).

---

## §2 Stage 0 grep set G-T22.x (9 checks + 1 post-write G-T22.6)

### G-T22.1 — plan v10 file anchor verify (post-v10 land state)

```bash
grep -n "^## Task 22\|^### Phase E 回填项 5" \
  docs/superpowers/plans/2026-04-17-phase5-postgres-migration/phase-d-repositories.md
```

**Expected**:
- `1442:## Task 22:写 server/src/repositories/staff.ts`
- `1659:### Phase E 回填项 5:printerRepo 新文件`

### G-T22.2 — schema Staff + Role + TimeEntry 全字段 enumeration (#30 5th live demo + D89 L3 verify gate)

```bash
grep -A 30 "^model Staff " server/prisma/schema.prisma
echo "---"
grep -A 25 "^model TimeEntry " server/prisma/schema.prisma
echo "---"
grep -A 25 "^model Role " server/prisma/schema.prisma
```

**Expected fields** (per Snapshot §7.23 D-5 batch entry pre-flight CC dump captured):

- **Staff**: id / storeId / username / passwordHash (NOT `password`) / roleId (**required**, NOT NULL) / clockPin? / displayName? / createdAt / updatedAt + relation `role: Role`
- **TimeEntry**: id / **staffId** (NOT `userId`) / storeId / **clockInAt** (NOT `clockIn`) / **clockOutAt?** (NOT `clockOut`, optional) / **NO `duration` field** / createdAt
- **Role**: id / storeId / name / permissions (Json) / createdAt / updatedAt

**Fail-loud branch**: 任一 schema field mismatch §7.23 captured state → 规则 8 暂停 + Plan Opus α/β/γ 决议.

### G-T22.3 — HEAD verify + Task 21 baseline 一致

```bash
git rev-parse HEAD
git log --oneline | head -8
```

**Expected HEAD**: `1d93e4af` (D89 升格 atomic batch Round 2 placeholder replace).

**Expected last 8 commits prefix**: 1d93e4af / c0b8f4e0 / 39666dc8 / ffc7719f / aaf9fa79 / 06a746d7 / cf46f1c5 / (Task 19 closure 等).

### G-T22.4 — Prisma client type imports verify (Phase B Task 9a regenerate post-schema)

```bash
ls -la server/node_modules/.prisma/client/index.d.ts | head -1
grep -E "^export type (Staff|Role|TimeEntry)\b" \
  server/node_modules/.prisma/client/index.d.ts | head -6
```

**Expected**: `.d.ts` exists + 3 type exports present (per Snapshot §8 file 状态表 "Prisma Client types | 已最新 | Task 9a Stage 4c regenerate, post-schema").

**Fail-loud branch**: type 缺 → 规则 8 暂停 → Plan Opus 决议: 跑 `pnpm prisma generate` (D82) OR escalate Stage 0.

### G-T22.5 — tsc baseline N1=103 maintained (D83 diff=0)

```bash
cd server && ./node_modules/.bin/tsc --noEmit 2>&1 | grep -cE "error TS" || echo "0"
```

**Expected**: `103` (per Snapshot §8 + Phase D-2/3a/3b/4 commit body cumulative).

### G-T22.6 — Stage 1 post-write semantic verify (post staff.ts heredoc write at Step 3 impl)

(Executed after Step 3 Stage 1 write, before Step 3 commit)

```bash
# Field name verify per plan v10 patches 2-3
grep -cE "\bstaffId\b" server/src/repositories/staff.ts
# Expected: >= 4

grep -cE "\bclockInAt\b" server/src/repositories/staff.ts
# Expected: >= 4

grep -cE "\bclockOutAt\b" server/src/repositories/staff.ts
# Expected: >= 5

# Legacy field name drift detect (word-boundary regex)
grep -cE "\buserId\b|\bclockIn\b|\bclockOut\b" server/src/repositories/staff.ts
# Expected: 0 (clockIn/clockOut as standalone words must NOT appear;
#           clockInAt/clockOutAt match the \bclockInAt\b / \bclockOutAt\b patterns)

# Decision G refresh: no duration field write
grep -cE "data: \{[^}]*duration" server/src/repositories/staff.ts
# Expected: 0

# duration RETURN shape mapper present
grep -cE "duration:" server/src/repositories/staff.ts
# Expected: >= 2 (TimeEntryWithDuration type + mapper ternary)
```

**Fail-loud branch**: 任一 count mismatch → 规则 8 暂停 + α 决议.

### G-T22.7 — D86 language-layer commit body scan

```bash
echo "$COMMIT_BODY" | grep -E "本对话|这次|刚刚|上一 ?(Opus|chat)|下一 ?(Opus|chat)|本轮|上轮|上次|方才"
```

**Expected**: 0 match (D86 strict — commit body 禁 session-relative phrasing).

**Fail-loud branch**: 任一 match → CC halt + rewrite commit body using date / SHA / 具体事件描述.

### G-T22.8 — D75 + D76 file/push/origin SHA verify

```bash
[ -s docs/superpowers/work-logs/2026-05-14-phase-d-task-22-staff-l1-verify.md ] && \
  echo "D75 OK file non-empty" || (echo "D75 FAIL"; exit 1)

wc -l docs/superpowers/work-logs/2026-05-14-phase-d-task-22-staff-l1-verify.md
# Forward-looking 460-540 lines (D83 ±10% buffer)

git push origin main
LOCAL_HEAD=$(git rev-parse HEAD)
ORIGIN_HEAD=$(git rev-parse origin/main)
[ "$LOCAL_HEAD" = "$ORIGIN_HEAD" ] && echo "D76 OK $LOCAL_HEAD" || \
  (echo "D76 FAIL local=$LOCAL_HEAD vs origin=$ORIGIN_HEAD"; exit 1)
```

### G-T22.10 — Prisma XOR predict (Task 17-21 carry-forward)

**Predict** (per Task 17-21 carry-forward Snapshot §3 view): `tsc --noEmit src/repositories/staff.ts 2>&1 | grep -E "^src/" | grep -cE "error TS[0-9]+:" || echo "0"` = **0**.

**Reasoning** (Unchecked branch direct, no Checked-relation-connect needed):
- `staff.create({ data: { storeId, roleId, ... } })` — Unchecked direct, roleId required, 0 TS2322 XOR ambiguity
- `staff.update({ where: { id }, data: { roleId | clockPin | passwordHash } })` — Unchecked direct
- `timeEntry.create({ data: { staffId, storeId, clockInAt, clockOutAt: null } })` — Unchecked direct
- `timeEntry.update({ where: { id }, data: { clockOutAt } })` — Unchecked direct
- 0 nested `connect: {...}` patterns (vs Task 17 orders.ts Checked-relation-connect α-extended forward-fix per Snapshot §3 Phase D-2 row)

---

## §3 5 维度 pre-verdict 表

| # | 维度 | Pre-verdict | 依据 + 引用 source |
|---|---|---|---|
| 1 | **D55 多步 tx 编译期强制** | ✅ Pass | closeTimeEntry read-guard pattern (findUnique + check + update) NOT D55 trigger 一致 Snapshot §7.23 reasoning ("printer.upsertConfig 触 D55, closeTimeEntry 不触, 因 read 是 guard NOT write 依赖 read 决分支"). closeTimeEntry sig `db: Db` 一致 Task 18 sessions.ts `cb2efd5e` carry-forward (Snapshot §3 Phase D-3a row). |
| 2 | **D56 模型对齐** | ✅ Pass NA | Task 22 staff/role/TimeEntry scope no cross-entity FK 关联. D56 模型 applicable only Task 17/19/20 scope. |
| 3 | **D57 RLS context** | ✅ Pass | listAll RLS-relied 一致 Task 18 findActiveSession family. listTimeEntries `where: { storeId, ... }` belt-and-suspenders explicit. Caller responsibility for `withStoreContext` wrap. |
| 4 | **#30 防御层 schema-side full field enumeration (5th live demo continuity)** | ✅ Pass predict | Task 18-21 4 consecutive work-as-designed (Snapshot §1 + §3 Phase D-3a/3b/4). Stage 0 G-T22.2 CC dump schema verify gate + 5 schema drift 已 plan v10 incorporate (patches 1-5 per Snapshot §7.23). |
| 5 | **D89 mandate anchor literal source freshness (post-formal-land first spec live field test)** | ✅ Pass per §7 Self-audit | D89 formal land `c0b8f4e0` per Snapshot §6 D89 sub-section + Digest §6 D89 entry + §10 v6 批. Task 22 work-log spec is post-formal-land first spec produce → live field test. §7 Self-audit 全 anchor literal + source 标注 = mandate compliance evidence. |

---

## §4 风险 A/B/C/D

### Risk A — closeTimeEntry double-close guard correctness + open entry null handling

**Scope**: Inline `if (entry.clockOutAt) throw` branch (plan v10 heredoc line ~1578). `findUnique` returns `TimeEntry | null` — must also handle null entry case (`if (!entry) throw` line ~1577).

**Pre-verdict**: ✅ Accept α path inline.

**Rationale**:
- Plan v10 heredoc lines 1576-1582 implement guard correctly:
  - L1576: `const entry = await db.timeEntry.findUnique({ where: { id: entryId } })`
  - L1577: `if (!entry) throw new Error(...not found)`
  - L1578: `if (entry.clockOutAt) throw new Error(...already closed)`
  - L1579-1582: `return db.timeEntry.update({ where: { id: entryId }, data: { clockOutAt } })`
- Schema-migration-avoiding business-invariant-at-app-layer 一致 Printer findFirst + (existing ? update : create) pattern (Snapshot §7.23 path B consistency).
- Race tolerance: 两 client concurrent close 同 entryId — 都 pass `!entry.clockOutAt` check, 都 update clockOutAt, last update wins (NOT data loss; same clockOutAt value if caller logic 一致). Business-level acceptable.

**Forward-pointer**: Phase G Agent C `analytics.service.getStaffPerformance` 期 if race issue 报 → revisit upgrade to `tx: Prisma.TransactionClient` + `SELECT ... FOR UPDATE` 行级锁.

### Risk B — #30 防御层 5th live demo continuity

**Scope**: Task 22 期 5+ schema field touch (TimeEntry 4 fields rename + roleId required + duration 删持久列) post-v10 land verify baseline maintained.

**Pre-verdict**: ✅ Accept α path inline (predict 0 真 fail-loud).

**Rationale**:
- Task 18-21 4 consecutive #30 防御层 work-as-designed (Snapshot §3 Phase D-3a/3b/4) — schema-side full field enumeration grep pre-empt + Prisma XOR predict 0 fail-loud carry-forward.
- Plan v10 5 patches incorporate schema field rename in heredoc.
- Stage 0 G-T22.2 schema CC dump verify gate (mandate D89 L3 fallback compliance).
- Stage 1 G-T22.6 post-write semantic verify legacy field name 0 match (word-boundary regex).

**Risk Trigger**: Stage 0 G-T22.2 任一 schema field mismatch §7.23 captured state → 规则 8 暂停 + Plan Opus α/β/γ 决议.

### Risk C — D89 mandate inline self-application live field test (post-formal-land first spec)

**Scope**: D89 formal entry `c0b8f4e0` land 后 Task 22 work-log spec is **first spec produce** — mandate compliance gate + value validate.

**Pre-verdict**: ✅ Accept α path inline (per §7 Self-audit).

**Rationale**:
- D89 entry text (Snapshot §6 D89 sub-section + Digest §6 D89 entry) requires every anchor literal satisfy Condition A (本 turn CC dump) OR Condition B (本 chat self-produce 上一 turn) OR query CC dump 后再产 spec.
- This session 续 chat post-D89 land + `/mnt/project/*` re-uploaded (per §6 D89 sub-section Project knowledge re-upload mandate) — Project knowledge fresh post-v10 + post-D89 land state baseline.
- §7 Self-audit 全 anchor literal + 标 source = mandate compliance evidence.
- Live field test value: 升格 spec self-违反 third live demo Patch B 模式 precedent ack (Snapshot §10 v5.X+1 批) — Task 22 spec strict mandate compliance 期望 0 self-违反, 验证 mandate value @ field level.

**Risk Trigger**: §7 Self-audit 任一 anchor literal 标 "印象 from [context source]" → 重新评估是否 query CC dump 后 redo spec.

### Risk D — listTimeEntries mapper duration compute correctness

**Scope**: Decision G refresh "duration in RETURN shape" — mapper layer compute `Math.floor((clockOutAt.getTime() - clockInAt.getTime()) / 60000)` + null handling open entry.

**Pre-verdict**: ✅ Accept α path inline.

**Rationale**:
- Plan v10 heredoc lines 1598-1603 implement mapper:
  - L1598-1603: `.then((rows) => rows.map((e) => ({ ...e, duration: e.clockOutAt ? Math.floor((e.clockOutAt.getTime() - e.clockInAt.getTime()) / 60000) : null })))`
- TypeScript narrowing: `e.clockOutAt` from `Date | null` to `Date` inside ternary truthy → `.getTime()` safe.
- Null branch: open entry returns duration null — matches business invariant "open entry no duration yet".
- `TimeEntryWithDuration` type (plan v10 line 1486): `type TimeEntryWithDuration = TimeEntry & { duration: number | null }` — type-level RETURN shape guarantee.
- Schema-migration-avoiding 一致 D89 self-application path B.

**Risk Trigger**: tsc Stage 2 type error on mapper compute → 规则 8 暂停 + α 决议.

---

## §5 Step 1/3 双 commit 节奏 (L1)

### Step 1 — work-log docs commit (本 work-log file land)

Commit body template:
docs(phase-5): Phase D Task 22 L1 verify work-log — staff.ts
Phase D 第 7 个 repo / Phase D-5a batch 头 task.
12 methods (4 reads + 8 writes 含 1 multi-step async closeTimeEntry +
1 read with mapper listTimeEntries duration RETURN shape).
Phase E 段 3b 回填 5 methods 含 (delete + findActiveTimeEntry +
createTimeEntry + closeTimeEntry + listTimeEntries).
5 维度 pre-verdict 全 Pass L1 完整. Stage 0 G-T22.1-10 grep set defined.
风险 A/B/C/D 全 identified.
D89 mandate compliance: §7 Self-audit 全 anchor literal + source 标注
作 post-formal-land first spec live field test.
#30 防御层 5th live demo carry-forward (Task 18-21 4 consecutive 累积).
Schema-migration-avoiding path B consistency (Task 22 duration RETURN shape +
Printer findFirst + Task 25 estimatedWait drop), Decision G refresh per
D89 self-application.
Helper async review trigger post-this commit land per L1 default +
post-D89 §6 sub-section Project knowledge re-upload mandate.
Co-Authored-By: Claude noreply@anthropic.com

D86 language-layer scan: 0 session-relative phrasing match (G-T22.7 gate).

### Step 3 — impl atomic commit (separate spec post-Helper-review-return)

Plan Opus produce Step 3 impl spec post-Helper-review-return → CC 执行 (Stage 1 heredoc staff.ts + Stage 2 tsc filtered=0 + N1=103 baseline maintained + Stage 3 D75 + D76 + D86 + Snapshot 增量 atomic absorb per Task 17/19 α′ atomic absorb precedent).

---

## §6 D88 维度 3 anchor literal grep 实证 self-audit (Plan Opus spec writer 期)

| # | Anchor literal | Source attribution | Status |
|---|---|---|---|
| 1 | "Task 21 menu.ts `aaf9fa79`" | Snapshot §1 + §3 Phase D-4 row | ✅ |
| 2 | "plan patch v10 `39666dc8`" | Snapshot §1 + §3 D-4 closure row | ✅ |
| 3 | "D89 升格 atomic batch `c0b8f4e0`" | Snapshot §6 D89 sub-section + §10 v5.X+1 批 + Digest §10 v6 批 | ✅ |
| 4 | "D89 升格 Round 2 `1d93e4af`" | Snapshot §1 HEAD ack + §10 v5.X+1 批 D77 forward-fix template | ✅ |
| 5 | "Task 22 段 line 1442-1622" | `/mnt/project/phase-d-repositories.md` view this session | ✅ |
| 6 | "Phase E 回填项 5 line 1659-1745" | `/mnt/project/phase-d-repositories.md` view this session | ✅ |
| 7 | "12 methods" | Counted from plan v10 heredoc Task 22 段 view this session | ✅ |
| 8 | "Snapshot §7.23 D-5 batch entry pre-flight CC dump analysis" | Snapshot §7.23 view this session | ✅ |
| 9 | "tsc baseline N1=103" | Snapshot §8 file 状态表 view this session | ✅ |
| 10 | "Task 18 sessions.ts `cb2efd5e`" | Snapshot §3 Phase D-3a row view this session | ✅ |
| 11 | "Decision G refresh `Math.floor((clockOutAt - clockInAt) / 60000)` line 1598-1603" | `/mnt/project/phase-d-repositories.md` Task 22 plan heredoc view this session | ✅ |
| 12 | "Snapshot §6 D89 entry / §10 v6 批 / §3 Phase D-4 row" | Snapshot view this session (multiple sections) | ✅ |
| 13 | "Schema-migration-avoiding path B (Task 22 duration + Printer findFirst + Task 25 estimatedWait drop)" | Snapshot §7.23 view this session | ✅ |

**Status**: 13/13 anchor literal source fresh from `/mnt/project/*` view this session. 0 anchor 凭印象 source. D88 维度 3 compliance pass.

---

## §7 D89 mandate anchor literal source freshness self-audit (post-formal-land first spec live field test)

### D89 mandate text recap (per Digest §6 D89 entry view this session)

> Plan Opus 写 spec 涉及任何 anchor literal, **必满足 1 of 2 条件**:
> A. 该 anchor 在本 turn 之内 CC dump 实证过 (cite turn + command)
> B. 该 anchor 在本 chat 内由 Plan Opus 自己上一 turn produce (cite turn + artifact)
> 若 neither A nor B → 必先 query CC dump 后再产 spec, 不凭印象 source

### Boundary case: post-formal-land first spec context

D89 §6 sub-section explicit mandate (Snapshot §6 view this session): "Project knowledge re-upload mandate: Helper review return clean + Plan Opus closure ack 后, Ian 必 Desktop App → ... upload latest from repo (post-D89 land commit state). 下次 Plan Opus chat 启动 → 读 fresh Project knowledge → 自动 ack D89 formal entry → apply mandate inline at Task 22 work-log spec writing."

→ `/mnt/project/*` view this session = mandate-acked fresh baseline (NOT "Project knowledge upload-time snapshot 可能 stale" 印象 source 子类 since re-upload mandate compliance baseline).

### Anchor literal source attribution

| # | Anchor category | Source | Standoff |
|---|---|---|---|
| 1 | SHA literals (019ab826, ff5e881b, cb2efd5e, a7752a30, cf46f1c5, aaf9fa79, 06a746d7, ffc7719f, 39666dc8, c0b8f4e0, 1d93e4af) | Fresh from Snapshot §1 + §3 view this session | ✅ Re-upload mandate baseline |
| 2 | Line range literals (1442-1622 / 1659-1745 / 1576-1582 / 1598-1603 / 1486) | Fresh from `/mnt/project/phase-d-repositories.md` view this session | ✅ Re-upload mandate baseline |
| 3 | Schema field literals (Staff/Role/TimeEntry field names + types + @map values) | Snapshot §7.23 D-5 batch entry pre-flight CC dump captured (prior session) viewed fresh this session | ⚠️ L3 Defense-in-depth tier-3 verify gate at Stage 0 G-T22.2 CC dump @ Step 3 impl execution time (Ian 启动消息 "不直起 CC 执行消息" this turn constraint — tier-3 fallback per D89 entry "L3 CC fail-loud — fallback 兜底 if L1 漏") |
| 4 | "12 methods (4 reads + 8 writes)" | Counted from plan v10 heredoc Task 22 段 view this session | ✅ Direct count from fresh source |
| 5 | D89 mandate text quote | Fresh from Snapshot §6 + Digest §6 view this session | ✅ Direct cite from fresh source |
| 6 | "tsc baseline N1=103" | Fresh from Snapshot §8 view this session | ✅ Direct fresh |
| 7 | "Cat 5 trend 9 数据点" | Fresh from Snapshot §1 + §7.23 view this session | ✅ Direct fresh |
| 8 | "Schema-migration-avoiding path B" | Fresh from Snapshot §7.23 view this session | ✅ Direct fresh |
| 9 | "Helper protocol 1/2/3 + Patch B 模式" | Fresh from Snapshot §10 v5.X+1 批 + Digest §10 v6 批 view this session | ✅ Direct fresh |
| 10 | "L1/L2/L3 review level + Default Push Forward + Exception Trigger" | Ian 启动消息 Project Instructions content (governance scope user-supplied, NOT subject to mandate as IS the governance content) | ✅ Project Instructions scope |

**Status**:
- 9/10 anchor categories ✅ direct fresh from re-upload mandate baseline
- 1/10 (#3 schema field literals) ⚠️ conditional fresh — L3 tier-3 verify gate at Stage 0 G-T22.2 CC dump @ Step 3 execution time
- **0 anchor literal 凭印象 source** (4 类印象 source per D89 entry: Ian 启动消息历史 snapshot / Project knowledge stale upload / Self-produced earlier turn / Cross-instance handoff context)

### Mandate compliance verdict

✅ **Pass live field test** — Task 22 work-log spec 0 self-违反 D89 mandate (vs 升格 spec self-违反 third live demo Patch B 模式 precedent per Snapshot §10 v5.X+1 批).

Schema field literal Defense-in-depth tier-3 fallback gate (Stage 0 G-T22.2 CC dump @ Step 3 execution) — 0 mandate violation because:
1. Source is captured prior session CC dump (NOT impression / NOT stale)
2. L3 verify gate enforced at Step 3 execution (NOT bypassed)
3. Project knowledge re-upload mandate compliance baseline (post-D89 land fresh)

---

## §8 Snapshot 增量草稿 (Step 3 atomic absorb deferred)

Snapshot 增量 deferred 入 Step 3 impl atomic commit per Task 17 / Task 19 α′ atomic absorb precedent (Snapshot §3 Phase D-2/3b).

### §1 时点 update (Step 3 land 期 fill `[FEAT_SHA]`)

最后更新: 2026-05-14 (Phase D-5a Task 22 staff.ts L1 — [FEAT_SHA] 12 methods 含 Phase E 段 3b 回填 5 methods. #30 防御层 5th live demo work-as-designed continuity (Task 18/19/20/21/22 5 consecutive carry-forward). D89 mandate inline self-application first post-formal-land spec live field test pass. Decision G refresh schema-migration-avoiding live (duration RETURN shape mapper). 0 真 fail-loud / 0 暂停 / 0 forward-fix.)
最后 commit on main: [FEAT_SHA] feat(phase-5): Phase D Task 22 — staff repository
Phase D 状态: 7/11 完成 (Task 16-22 ✅), Task 23-26 + printer 附录 ⏸️ 待启动 (D-5a' printer next)


### §3 commit chain Phase D-5a 段 prepend
Phase D-5a 对话 (2026-05-14, Task 22 staff.ts L1 impl, 2 commits + 0 暂停 + 0 真 fail-loud + #30 5th live demo + D89 first post-formal-land spec live field test pass)
SHA性质内容[FEAT_SHA]featPhase D Task 22 — staff repository (12 methods 4 reads + 8 writes 含 Phase E 段 3b 回填 5 methods: delete + findActiveTimeEntry + createTimeEntry + closeTimeEntry read-guard pattern + listTimeEntries mapper) — closeTimeEntry NOT D55 trigger + D56 NA + D57 listAll RLS-relied / listTimeEntries belt-and-suspenders + D89 self-application Decision G refresh "duration in RETURN shape" Math.floor((clockOutAt - clockInAt) / 60000) mapper / 5 维度 verdict 全 Pass / Stage 0 G-T22.1-10 全 pass / Stage 2 tsc filtered=0 + N1=103 baseline (D83 diff=0) / Stage 3 D75 + D76 + D86 staged 全 pass / #30 5th live demo work-as-designed (Task 18/19/20/21/22 5 consecutive carry-forward) / D89 mandate inline self-application first post-formal-land spec live field test pass (§7 Self-audit 13 anchor literal + source 标注, 0 印象 source)[DOC_SHA]docsPhase D Task 22 L1 verify work-log — staff.ts (~[N] lines, 5 维度 pre-verdict + 风险 A/B/C/D + Stage 0 G-T22.1-10 完整 grep spec + §6 D88 维度 3 self-audit 13 anchor 全 ✅ + §7 D89 mandate self-audit post-formal-land first spec live field test)

### §4'' Phase D 完成总览 update (heading 6/11 → 7/11 + Task 22 row + Acceptance bullets)
Acceptance bullets NEW:

Phase D 7/11 land + closeTimeEntry read-guard pattern NOT D55 trigger 一致 Snapshot §7.23 reasoning
#30 防御层 5th live demo work-as-designed (Task 18-22 5 consecutive carry-forward)
D89 mandate inline self-application first post-formal-land spec live field test pass
Decision G refresh schema-migration-avoiding path B live (duration RETURN shape mapper)


### §9 整节重写 Phase D-5a' printer 附录 启动 ritual (Plan Opus draft @ Step 3 closure)

### §10 v5.X+2 批 entry

2026-05-14 v5.X+2 批 (Phase D-5a Task 22 staff.ts L1 closure — [FEAT_SHA] + [DOC_SHA] atomic absorb):

§1 时点 / HEAD [FEAT_SHA] / Phase D 7/11
§3 commit chain Phase D-5a 段 prepend
§4'' Phase D 完成总览 heading 6/11 → 7/11 + Task 22 row + Acceptance bullets 4 新条目
§9 整节重写 Phase D-5a' printer 附录 启动 ritual
§10 本条目
触发事件: Phase D-5a Task 22 closure (2 commits + 0 暂停 / 0 真 fail-loud) + #30 5th live demo + D89 first post-formal-land spec live field test pass




---

## §9 Helper async review trigger 节奏 (L1 default + post-D89 §6 sub-section mandate)

### Trigger timing

Post-Step 1 work-log docs commit land (本 work-log file commit + push origin/main verify per G-T22.8).

### Ian Desktop App workflow

1. Ian copy fresh `/mnt/project/*` post-Step-1-land:
   - `docs/superpowers/work-logs/2026-05-14-phase-d-task-22-staff-l1-verify.md` (本 work-log file)
   - `docs/superpowers/archive/phase-5-state-snapshot.md` (post-Step-1 state, unchanged since Snapshot 增量 deferred Step 3)
   - `docs/superpowers/archive/phase-5-governance-digest.md` (unchanged)
   - `docs/superpowers/archive/phase-5-fabrication-archive.md` (unchanged)
   - `docs/superpowers/plans/2026-04-17-phase5-postgres-migration/phase-d-repositories.md` (plan v10 fresh post-land)
2. Ian start new Helper Opus chat instance
3. Helper Opus review work-log + cross-ref handoff + flag per Helper compass

### Helper return paths

- **Clean return**: Helper 0 flag → Plan Opus closure ack → Step 3 impl spec → CC 执行
- **Flags return**: Helper raise flags → Plan Opus α/β/γ 决议 per Default Decision Rules (Step 2 明批 default α if Helper "α accept" or "no flag" + 不属 Exception Trigger)
- **Helper protocol 1/2/3 (per Snapshot §10 v5.X+1 批)**: Stage 0 anchor verify strict + A 不 amend D77 + ≤ 5 single-line edit threshold (Patch B 模式 Mode 1 economic spec forward-fix)

### Post-Step-3 impl atomic commit

Plan Opus consume Helper review return → produce impl spec (Stage 1 heredoc staff.ts + Stage 2 tsc filtered=0 + N1=103 + Stage 3 D75/D76/D86 + Snapshot 增量 atomic absorb in same commit per Task 17/19 α′ precedent).

---

## §10 修订轨迹 / Final verdict (post-impl Step 3 closure update via D77 forward-fix OR same-commit closure ack)

### Plan Opus pre-verdict (work-log Step 1 land 期)

| # | 维度 / Risk | Pre-verdict | Verify Stage |
|---|---|---|---|
| 1 | D55 多步 tx (closeTimeEntry read-guard NOT trigger) | ✅ Pass | Stage 0 G-T22.3 + Stage 1 G-T22.6 |
| 2 | D56 模型对齐 | ✅ Pass NA | (no cross-entity FK) |
| 3 | D57 RLS context | ✅ Pass | Stage 0 G-T22.3 |
| 4 | #30 schema-side full field enumeration (5th live demo) | ✅ Pass predict | Stage 0 G-T22.2 |
| 5 | D89 mandate anchor literal source freshness | ✅ Pass live test | §7 Self-audit |
| 6 | Risk A closeTimeEntry guard | ✅ Accept α | Stage 1 G-T22.6 + Stage 2 |
| 7 | Risk B #30 5th live demo continuity | ✅ Accept α | Stage 0 G-T22.2 + Stage 1 G-T22.6 |
| 8 | Risk C D89 live field test | ✅ Accept α | §7 Self-audit |
| 9 | Risk D listTimeEntries mapper compute | ✅ Accept α | Stage 2 tsc |
| 10 | Plan Opus final ack (post-impl + Helper return) | ⏸️ Pending Step 3 land | Step 3 closure |

### Final verdict 10 row (post-impl Step 3 closure 期 update)

| Row | Final verdict | Evidence |
|---|---|---|
| (TBD post-Step-3-land) | (TBD) | (TBD) |

---

## §11 修订记录

- 2026-05-14: Initial Plan Opus produce (post Ian α GO ack scope outline → full spec → Ian α GO ack → CC land Step 1 docs commit)
- (TBD): Plan Opus closure ack post-Step-3-land + Helper review return resolution

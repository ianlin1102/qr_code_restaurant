# Phase C Batch 3 Task 15 L1 verify work-log

**日期**: 2026-04-21
**Phase**: 5 — Postgres migration
**Phase C Batch**: 3 (Task 15 only, L1 最严单独跑)
**Task**: 15 — `module-registry.test.ts` 幽灵权限检测
**Review 级别**: L1 最严 (项目内建制术语, Governance Digest §4.1)

**锚 commits**:
- `308f7d54` — Phase C Batch 2 Task 14 feat (6/6 tests pass, dual-URL + adminDb TRUNCATE live baseline)
- `0da7456a` — Governance v4.4 (D85 + D86 登记 + Archive #26, Language-layer enforcement 生效 baseline)
- `364c0bf6` — v4.5 Snapshot (Batch 3 启动指引 + Stage 0 HEAD pre-check anchor)
- `00558997` — plan patch v8 (Task 15 heredoc naming drift fix: MODULE_REGISTRY + ALL_MODULE_PERMISSIONS)

**产出对象**: Plan Opus 读本 work-log 后直接产 Task 15 CC 执行消息 spec.

---

## 1. Review Scope

Task 15 plan heredoc (phase-c-test-db.md lines 780-885, `00558997` v8 baseline) 产出 1 test file:

- `server/src/__tests__/integration/module-registry.test.ts` (2 tests):
  - Test 1: every `requirePermission()` call references a registered permission (code → registry 单向 guard)
  - Test 2: `MODULE_REGISTRY` export has expected shape

L1 最严 5 维度 (Phase 5 State Snapshot §9.4 明文):

1. `shared/modules.ts` 单一注册中心字段 literal 对齐
2. role × module × action 组合覆盖矩阵完整性
3. 实际 router / handler 位置 (production code 对齐 registry)
4. 幽灵权限检测 assertion 逻辑 (orphan role / orphan module / orphan action + regex 覆盖性)
5. Task 14 carry-forward infra (testDb + adminDb + `withTestTenant` / `withTestPlatform` 消费)

---

## 2. Stage 0 Grep Fact Base 汇总 (G-T15.1-4, `364c0bf6` baseline)

### 2.1 G-T15.1 — `shared/modules.ts` 单一注册中心

**canonical path**: `shared/modules.ts` (repo root, 52 lines, `import type { Permission } from './types'`).

**Exports** (5 surface):

- `MODULE_REGISTRY` (const object, 6 keys: `core` / `analytics` / `coupons` / `waitlist` / `staff-management` / `printer`, each含 `name` / `required` / `permissions`)
- `ALL_MODULE_PERMISSIONS` (`Permission[]`, flatMap generated from `MODULE_REGISTRY`)
- `ModuleId` (type = `keyof typeof MODULE_REGISTRY`)
- `getModulePermissions(moduleIds: ModuleId[]): Permission[]` (helper, auto-includes `core`)
- (internal Permission type import)

**14 permissions × 6 modules breakdown**:

- `core` (10, required=true): `orders:read` / `orders:write` / `tables:read` / `tables:write` / `menu:read` / `menu:write` / `settings:read` / `settings:write` / `billing:read` / `billing:write`
- `analytics` (1, required=false): `analytics:read`
- `coupons` (2, required=false): `coupons:read` / `coupons:write`
- `waitlist` (2, required=false): `waitlist:read` / `waitlist:write`
- `staff-management` (1, required=false): `staff:manage`
- `printer` (2, required=false): `printer:read` / `printer:write`

**路径观察**: 5 worktree copies (`.claude/worktrees/agent-*/shared/modules.ts`) 均 agent isolation artifact, 非 canonical source. Plan Task 15 test 仅扫 `server/src`, 不接触 worktrees.

### 2.2 G-T15.2 — production `requirePermission` API surface

- **唯一 API**: `requirePermission` (import `../middleware/permission.middleware.js`)
- **0 命中**: `requireRole` / `@Roles` / `@RequireAction` / `authzCheck` / `resolvePermission` / `requireModule`
- **分布 11 route files, 100+ 命中** (head -60 estimate):
  - `analytics.routes.ts` (1) / `table.routes.ts` (11) / `payment-adjust.routes.ts` (1) / `upload.routes.ts` (1) / `printer.routes.ts` (3) / `session.routes.ts` (6+) / `order.routes.ts` (5) / `menu.routes.ts` (10) / `coupon.routes.ts` (4) / `staff.routes.ts` (4) / `split-bill.routes.ts` (5+)
- **形态统一**: `requirePermission('literal-string')` 单引号字面, 0 变量 / 0 模板 literal / 0 helper wrap
- **plan Test 1 regex** `requirePermission\(['"]([^'"]+)['"]\)` **覆盖 ✓** (风险 A 关闭)

### 2.3 G-T15.3 — Task 15 plan heredoc (v8 `00558997` baseline)

phase-c-test-db.md lines 780-885 完整 view 已 verify. v8 heredoc naming 全对齐 G-T15.1 实际 exports:

- Import: `ALL_MODULE_PERMISSIONS` from `@qr-order/shared/modules`
- Test 1 registered Set: `new Set(ALL_MODULE_PERMISSIONS as readonly string[])`
- Test 2 assertions: `mod.MODULE_REGISTRY` + `mod.ALL_MODULE_PERMISSIONS` 4 expects
- Expected output line: `✓ MODULE_REGISTRY export has expected shape`
- Commit message body: `permission string is registered in shared/modules.ts MODULE_REGISTRY`

### 2.4 G-T15.4 — Cross-phase literal coupling (D84 激活 + D81 landscape)

**4 处 module-related naming surface** (Stage 0 fact base enumerated):

- `shared/modules.ts` `MODULE_REGISTRY` (canonical)
- `server/prisma/seed.ts:11` `ALL_MODULES` (Task 9a `f06f333d` hardcoded 6 module IDs, D81 候选原触发)
- `server/src/__tests__/integration/fixtures.ts:416` `MODULES_FULL` (Task 13 `57894f8f` hardcoded 6 module IDs, `fixtures.ts:479` `storeOverrides?.modules ?? MODULES_FULL` 消费)
- plan §4.4 aspirational `MODULES` / `ALL_PERMISSIONS` (`00558997` v8 patch 已 reconcile, plan heredoc 对齐实际 code)

**schema.prisma permission-related models**:

- `Role` (line 122): `storeId String @map("store_id")` + `permissions String[]` (role-level permission storage, 独立 model, 与 MODULE_REGISTRY 解耦)
- `ModuleLicense` (line 110): `storeId String @unique @map("store_id")` + `@@map("module_licenses")` (store-level module subscription)

---

## 3. L1 5 维度 Verdict (`00558997` post-state)

| 维度 | Verdict | 事实依据 |
|---|---|---|
| 1. `shared/modules.ts` 字段 literal 对齐 | ✅ Pass | v8 heredoc import `ALL_MODULE_PERMISSIONS` + Test 2 assert `MODULE_REGISTRY` / `ALL_MODULE_PERMISSIONS` defined 对齐 G-T15.1 实际 5 exports. naming drift 已在 `00558997` v8 patch 9 处 reconcile |
| 2. role × module × action 矩阵完整性 | 🟡 Partial | 14 permissions × 6 modules (action 维度 enumerate 完整). role 维度在 `Role.permissions String[]` 独立 model, `MODULE_REGISTRY` 不含 role → Test 2 shape check 未覆盖 role-permission 关系. Phase D Repository / Phase G SOP scope, Task 15 非覆盖面 |
| 3. 实际 router / handler 对齐 | ✅ Pass | 11 route files × 100+ `requirePermission('literal')` 单一 API surface; 0 其他 permission API (`requireRole` / `@Roles` / `authzCheck` / 等); literal string 形态统一 (非变量 / 模板 / helper wrap) |
| 4. Ghost assertion 逻辑 | 🟡 Partial | Test 1 regex 覆盖 production API ✓ (风险 A 关闭); 反方向 registry→code orphan 未覆盖 (风险 B, plan intent 单向 guard by design); regex 不含 `resolvePermission` / `requireModule` 等 G-T15.2 0 命中形态 (未来若 API surface 扩展, Test 1 silent blind spot) |
| 5. Task 14 carry-forward infra 消费 | 📋 Notes | Task 15 heredoc 纯 import + execSync + registry lookup; 不消费 `testDb` / `adminDb` / `withTestTenant` / `withTestPlatform`. `setup.ts` `beforeEach` TRUNCATE 对 `integration/` 目录全 `.test.ts` 生效 → Task 15 仍需 `pnpm test:db:up` (架构 inherent, 非 spec 问题). test-db 容器空运行 (Test 1 grep 子进程无 DB 依赖, Test 2 dynamic import 无 DB 依赖) |

---

## 4. 风险面处置 (A / B / C / D)

**风险 A — Test 1 regex 覆盖不全**: ✅ **关闭**. G-T15.2 fact base 证 production 唯一 API = `requirePermission('literal')` 单一形态, plan regex 完整覆盖.

**风险 B — registry → code 反向 orphan 不覆盖**: 📋 **持存, plan intent 单向 guard**. L1 work-log 显式登记 Task 15 非覆盖面 — 若某 permission 在 `MODULE_REGISTRY` 声明但 production code 从未 `requirePermission` 消费 (dead permission / orphan registry entry), 当前 test scope 不检测. Phase C scope 外, 是否扩展由 spec §4.4 意图 / Phase E role migration / Phase G SOP 决.

**风险 C — D81 候选 seed + fixtures drift 正交**: 📋 **持存, L1 非覆盖面**. `seed.ts:11` `ALL_MODULES` + `fixtures.ts:416` `MODULES_FULL` 与 `shared/modules.ts` `MODULE_REGISTRY` 6 keys 当前等价 (core / analytics / coupons / waitlist / staff-management / printer), 但 hardcode 与 canonical 独立维护, drift potential 持存. D81 候选 α (runtime assertion) / β (build-time check) / γ (comment reminder, Phase B Task 9a 选定) 三路径, Phase H Task 45 reconcile. Task 15 test scope 为 code→registry 单向, 不覆盖 seed→registry + fixtures→registry.

**风险 D — workspace alias 解析**: 📋 **runtime verify point**. plan heredoc `import { ... } from '@qr-order/shared/modules'` — alias 解析依赖 server `tsconfig` paths + vitest resolve + pnpm workspace 配置. Phase B `seed.ts` 用相对 import (`./seed-data/store.js`), Task 14 test 用相对 import (`../setup.js`). `@qr-order/shared/modules` 在 server test context 的解析路径 Stage 0 fact base 未直接覆盖. Task 15 CC Step 3 test run 为 runtime verify:
- 若 `ERR_MODULE_NOT_FOUND` / `Cannot find module '@qr-order/shared/modules'` / `TS2307 Cannot find module` → 规则 8 暂停, 回报 Plan Opus 判路径 α (改相对 import) / β (配 server tsconfig paths + vitest resolve.alias)
- 非 Stage 0 可预判, Plan Opus 不预先 spec fix

---

## 5. 治理层事件登记回顾

### 5.1 Archive #25 same-pattern 第 3 数据点 (convention-level export naming drift)

Plan Task 15 heredoc `MODULES` / `ALL_PERMISSIONS` 基于 spec §4.4 aspirational naming, 未 grep verify 实际 `shared/modules.ts` export. Archive #25 原 scope = cross-phase 硬 invariant (DB name `qr_order`, D84 收录); 第 3 数据点 scope = convention-level export naming (非硬 invariant, D84 不收录, 属 convention).

- **第 1 数据点** (`d67da999` 登记): repo 路径 `docs/superpowers/phase5/` vs 实际 `docs/superpowers/archive/`.
- **第 2 数据点** (`0da7456a` 前 Round 2 Stage 0 observation): `server/docker-compose.test.yml` vs repo root `docker-compose.test.yml`.
- **第 3 数据点** (`00558997` v8 patch 触发): export naming aspirational (`MODULES` / `ALL_PERMISSIONS`) vs actual (`MODULE_REGISTRY` / `ALL_MODULE_PERMISSIONS`).

**共性**: Plan Opus 写 spec 前未 grep 外部 artifact literal. Governance Digest §7 Pre-Flight Checklist 第 5 行 "Cross-phase literal coupling" 条款已含硬 invariant 维度; D84 definition note 规定 convention 类 drift 归 Pre-Flight Checklist 新条款 (Phase H Task 45 reconcile). 第 3 数据点巩固此 reconcile 方向.

### 5.2 D81 candidate landscape 扩展 (4 surface naming inconsistency)

D81 原触发事件: Phase B Task 9a `seed.ts` `ALL_MODULES` 硬编码 6 模块 vs `shared/modules.ts` 潜在 drift (单对). `00558997` v8 patch 过程 Stage 0 G-T15.4 返回扩展 landscape — **4 处 module-related naming surface 并存**:

- `shared/modules.ts` `MODULE_REGISTRY` (canonical, keys 集合 `{core, analytics, coupons, waitlist, staff-management, printer}`)
- `server/prisma/seed.ts:11` `ALL_MODULES` (Task 9a hardcode, 完整 value `head -50` 截止 line 11, 需 Phase H Task 45 reconcile 期完整 grep)
- `server/src/__tests__/integration/fixtures.ts:416` `MODULES_FULL` (Task 13 hardcode, 6 IDs 集合等价 MODULE_REGISTRY keys, 顺序 `['core', 'analytics', 'coupons', 'waitlist', 'printer', 'staff-management']` 与 canonical 略异但 set 等价)
- plan §4.4 aspirational `MODULES` (`00558997` v8 前 Task 15 plan heredoc 引用, v8 已 reconcile; spec §4.4 aspirational 本身入 Phase H Task 45 reconcile queue)

D81 α / β / γ 三路径决议 Phase H Task 45 同时处理 4 surface (非单对). Task 15 test scope 单向 guard, 不兜 D81 drift.

### 5.3 D74 桶 B (replacement plan heredoc) 第 2 数据点

`00558997` 实测: 13 insertions / 13 deletions / 净 0 行 (`git diff --stat` 基准). Plan Opus v8 spec 预估: +14 / -12 / 净 +2. 偏差 +1 / -1 / 净 -1 (D83 定性约束 ±3 tolerance 内 pass).

- **桶 B 第 1 数据点** (`ca863caa`): 71 ins / 9 del (scope 含结构性 Patch 5 `global-setup.ts` rewrite).
- **桶 B 第 2 数据点** (`00558997`): 13 ins / 13 del (scope = 9 处 literal 1:1 替换 + 1 处 fallback 段 rewrite).

两点不足定桶 B 系数, Phase H Task 45 D74 reconcile input. 候选 sub-bucket: "纯 literal 对齐 replacement" 与 "结构性 replacement" 拆分 (scope 度量基准差异).

### 5.4 A.1 全角标点防御应用 (v8 spec 预置 + live 验证 unaffected)

`00558997` v8 spec 预置 "全角标点 punctuation 显式标记" 段, 9 old_str 含全角 (`，：。、`) — 源 phase-c-test-db.md verbatim. CC 执行 9 patches 全 unique match 一次命中, 0 字符 drift, 0 str_replace fail. A.1 drift (`0da7456a` 期 CC Edit 全角逗号 observation) 应用于 spec 产出前显式标记, v8 执行期无 str_replace fail 事件, 防御机制 live demo.

### 5.5 CC 程序性观察: Stage 0 parallel 判定

G-T15.1-4 Stage 0 CC 并行跑 HEAD pre-check + 4 grep tool calls (降 latency). Plan Opus 判: spec 原文 "不自行跑后续 grep" 语境 = HEAD drift → 规则 8 fail-fast 分支, 非全程强制 sequential. CC 并行于 drift benign 前提下数据 valid. Phase H Task 45 Pre-Flight 候选条款 (不新升格, 教训内化): Stage 0 spec 显式标 "HEAD pre-check 单独 sequential; pass 后续 grep 可并行" 避免语义歧义.

### 5.6 v8 post-patch verify grep 计数预期精度

Plan Opus v8 spec 预 "bare MODULES / ALL_PERMISSIONS" 2 match. CC 实测 1 match line (单行同时含两词). 规则 8 trigger 条件 `match > 2` 未触发, 数据 valid. 偏差根因: 预估基于 "每词独立 1 match" 假设, 实际 grep `-E` 按 line 返单行 (Patch 2 new_str 单行同时含 `MODULES` + `ALL_PERMISSIONS` backtick citation). Phase H Task 45 Pre-Flight 候选条款 (不新升格, 教训内化): grep count 预估需指定基准 "line match vs occurrence count".

---

## 6. L1 Maximum Strictness Verdict (`00558997` post-state)

- **5 维度 Pre-Pass**:
  - 维度 1 ✅ (naming drift `00558997` reconcile)
  - 维度 2 🟡 Partial (role 维度 plan 非覆盖面, 预期)
  - 维度 3 ✅ (production API surface 单一 literal 形态)
  - 维度 4 🟡 Partial (单向 guard, plan intent)
  - 维度 5 📋 Notes (Task 15 不消费 Task 14 infra, 预期)
- **0 silent security hole**: 风险 A 关闭 (regex 覆盖 production 唯一 API surface)
- **风险 B / C / D 持存**: B / C 为 test scope 边界 (plan intent 单向 guard), D 为 runtime verify point (Task 15 Step 3 test run 捕获)
- **Test heredoc 0 fabrication**: v8 patch 后 naming 对齐 G-T15.1 实际 code, import / registered Set / expect 逐项 verified
- **规则 1 铁律无涉**: 0 migration / 0 schema / 0 production code 动

**推荐**: Ian 明批 "Task 15 GO" 起 Task 15 CC 执行消息 (Snapshot §9.4 三步走第二步完成 → 第三步启动).

---

## 7. Task 15 CC 执行消息 Scope 前置声明

**CC 执行消息 scope**:

- **1 test file 新建**:
  - `server/src/__tests__/integration/module-registry.test.ts` (plan v8 Task 15 Step 2 heredoc 逐字, 不含 plan `cat > ... <<'EOF'` heredoc 包装行)
- **0 动**:
  - `shared/modules.ts` (canonical, G-T15.1 verified `364c0bf6` state)
  - `server/src` production code (G-T15.2 verified, 11 route files `requirePermission` literals)
  - `schema.prisma` / migration / `seed.ts` / `fixtures.ts`
  - Task 11/12/13/14 相关 files (Task 14 infra live carry-forward, Task 15 不消费)
  - `docker-compose.test.yml` / `global-setup.ts` / `setup.ts`
  - Task 15 plan heredoc (`00558997` v8 baseline 已对齐实际 code, 不动)

**CC 执行消息 Stage 0 pre-check (D86 强制)**:

依赖 HEAD SHA:
- `phase-c-test-db.md` 最近改动 = `00558997` (v8 plan patch)
- HEAD 含本 work-log commit (SHA 产出时填入) + `00558997` 作 ancestor
- 治理三文件最近改动 = `0da7456a` (v4.4 baseline) 或 `364c0bf6` (v4.5 Snapshot)

依赖 file state:
- `server/src/__tests__/integration/module-registry.test.ts` 不存在 (Task 15 待创建)
- `shared/modules.ts` 存在, exports = `MODULE_REGISTRY` / `ALL_MODULE_PERMISSIONS` / `ModuleId` / `getModulePermissions` (G-T15.1 verified, 52 lines)
- `server/src/__tests__/integration/setup.ts` 最近改动 = `f49139a0` (v7 adminDb)
- `server/src/__tests__/integration/global-setup.ts` 最近改动 = `308f7d54` (Task 14 feat) 或 `f49139a0`

任一 drift → 规则 8 暂停.

**CC 执行消息 执行流**:

1. Stage 0 pre-check (HEAD + 5 files 最近 SHA + `module-registry.test.ts` 不存在 verify)
2. Write `server/src/__tests__/integration/module-registry.test.ts` (逐字对齐 plan v8 Task 15 Step 2 heredoc body)
3. `pnpm test:db:up` (起 `qr-order-postgres-test` 容器 — 架构 inherent; Task 15 自身不消费 DB)
4. `cd server && pnpm test:integration module-registry 2>&1 | tail -15`
5. 预期 `Test Files 1 passed (1)` / `Tests 2 passed (2)`
6. **风险 D 捕获点** (workspace alias): `ERR_MODULE_NOT_FOUND` / `Cannot find module '@qr-order/shared/modules'` / `TS2307` → 规则 8 暂停, 回报 Plan Opus 判 α (改相对 import) / β (配 alias)
7. **风险 B 捕获点** (Test 1 red — ghost permissions): Test 1 fail 显示 ghost 清单 → 依 plan v8 line 867 note "不回滚测试, Phase E TODO" 由 plan intent 定, 但 L1 最严分级需 Plan Opus 判 accept red test vs fix `shared/modules.ts`. 规则 8 暂停, 不自行 accept red
8. **风险 C 捕获点** (TS2352 Permission cast): `new Set(ALL_MODULE_PERMISSIONS as readonly string[])` 若 TS2352 cast incompatible → 回报 Plan Opus (`Permission` type 定义影响, G-T15.1 未 cat `shared/types.ts` 详情)
9. 2/2 test pass 后 `pnpm test:db:down` 清场
10. Commit + push (D76 origin SHA verify)

**CC 执行消息 commit message body 必含**:

- 触发 anchor: `00558997` (v8 Task 15 heredoc naming drift fix) + 本 work-log commit SHA
- Task 15 产出 (1 test file 新建)
- L1 5 维度 verdict 锚 (本 work-log reference + runtime test 2/2 pass 证据)
- 风险 A 关闭 (regex 覆盖 production 唯一 API) / 风险 B / C plan intent 单向 guard + runtime verify result
- 风险 D runtime verify 结果 (workspace alias 解析 pass / 改相对 import 路径 α)
- D81 landscape 4 surface Phase H Task 45 reconcile queue 登记
- Archive #25 same-pattern 第 3 数据点 `00558997` v8 reconcile 完成
- D86 language-layer self-check applied (全文 SHA / date / phase / task anchor, 无 session-relative 指示词)

**不需要 re-grep** (L1 work-log 本身即 fact base):

- G-T15.1-4 fact base
- Task 14 infra carry-forward (Snapshot §9.3 Batch 2 新增 verified, `00558997` 后未动)

---

## 8. 下一动作

Ian read 本 work-log → 明批 "Task 15 GO" → Plan Opus 产 Task 15 CC 执行消息 spec (按 §7 scope + Stage 0 pre-check 模板 + 风险 B / C / D runtime 捕获路径).

**Async-executable 原则 live**: 本 work-log `00558997` baseline 产出, 任何时间点 Ian 发起 → Plan Opus 读 (4 handoff 附件 + `00558997` v8 plan commit body + 本 work-log commit body) → 产 Task 15 CC 执行消息 spec 链路完整. 无 session 连续性 precondition.

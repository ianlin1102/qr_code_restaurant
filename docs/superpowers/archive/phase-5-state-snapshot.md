# Phase 5 State Snapshot

> **读者**: 下一个 Opus chat instance
> **性质**: **live 增量维护**文档,每对话收尾增量 Edit 更新,Phase 封顶(Phase B/C/D... 封顶)时 Opus 全文 regen 一次
> **使用方式**: 每对话启动必读附件之一。提供"当前项目实时状态"的唯一 source of truth;Phase 封顶 regen 作节奏里程碑 + fabrication 风险集中点(Opus 注意力预算充分)
> **配套文件**:
> - `phase-5-governance-digest.md` — 治理体系静态参考(累积)
> - `phase-5-fabrication-archive.md` — Fabrication 历史(累积)
>
> **机制要点**: 本文件最新版即最终版。任何"当前状态"问题读本文件;读 Archive 可查历史 fabrication;读 Digest 查规则。**Mode C stale handoff 类 fabrication**(Archive #14)**+ Snapshot 环境状态片面**(Archive #22)的防御来自 **live 增量维护**机制(每对话收尾更新,Phase 封顶 regen) —— 文字任意时点写,本文件整体永远 live;增量式避免 regen 过程成为 fabrication 高发时点(响应 #24 原型教训)。

---

## 1. 当前时点

- **最后更新**: 2026-04-21 (Phase C 封顶 v5.0 regen — Phase B 10/10 + Phase C 5/5 双里程碑 + Batch 3 closure 治理增量)
- **最后 commit on main**: `035cdee2` feat(phase-5): Phase C Batch 3 Task 15 — module-registry.test.ts ghost permission guard (2/2 tests pass)
- **Phase B 状态**: **10/10 完成 ✅**
- **Phase C 状态**: **5/5 完成 ✅** (Batch 1: Task 11/12/13 / Batch 2: Task 14 / Batch 3: Task 15)
- **下一对话目标**: **Phase D Repository 启动 (Task 16, 11 个语义化 repo 第一个)** —— plan Phase D 完整 (`phase-d-repositories.md`), Stage 0 carry-forward Phase C testDb infra + #11 path drift verify (`server/src/repositories/prisma-client.ts` import path Phase C Batch 1 §7.11 已 grep 实证, Phase D 直接消费)

---

## 2. Phase 进度表

| Phase | 内容 | Plan | 实施 |
|---|---|---|---|
| A | ~~备份~~ SKIPPED(Ian calibration 2026-04-19) | N/A | N/A |
| B | 基础设施(schema + migration + seed + docker + ESLint) | ✅ 完整 | ✅ **10/10 完成** |
| C | 测试 DB | ✅ 完整 | ✅ **5/5 完成** |
| D | Repository(11 个语义化 repo) | ✅ 完整 | ⏸️ **待启动** (下对话第一目标) |
| E | 外围域(3 agent) | ✅ 完整 | ⏸️ 未启动 |
| F | Platform Admin | ✅ 完整 | ⏸️ 未启动 |
| G | 核心业务链 + SOP | ✅ 5/5 + SOP | ⏸️ 未启动 |
| H | 集成测试 | 🟡 1/3(Task 43 ✅,44/45 待) | ⏸️ 未启动 |
| I | 清理 | ⏸️ 批 2 待写 | ⏸️ 未启动 |
| J | 部署 | ⏸️ 批 2 待写 | ⏸️ 未启动 |
| K | e2e 验收 | ⏸️ 批 2 待写 | ⏸️ 未启动 |

**Phase 5 整体实施约 ~25-28%**(Phase B 10/10 + Phase C 5/5 = 15/15 implementation tasks across 2 phases)。

---

## 3. 最近 commit 链(按时间倒序)

### Phase C Batch 3 对话 (2026-04-21, 3 commits + 2 规则 8 暂停 resolved (D + α 接受 spec 内部不一致 forward-fix) + 2 规则 8 暂停 resolved (Time Machine env gap: Docker daemon + node_modules) + 0 critical fabrication 逃逸)

| SHA | 性质 | 内容 |
|---|---|---|
| `035cdee2` | feat | Phase C Batch 3 Task 15 — `module-registry.test.ts` ghost permission guard (46 lines, plan v8 heredoc 逐字), 2/2 tests pass 1.00s, 风险 A/B/C/D 全关闭 (regex 覆盖 production 唯一 API / 0 ghost permission / Permission type cast pass / `@qr-order/shared/modules` workspace alias 解析 pass) |
| `aea392ff` | docs | Phase C Batch 3 Task 15 L1 verify work-log (250 lines, Stage 0 G-T15.1-4 grep fact base + 5 维度 pre-verdict + 风险 A/B/C/D + Archive #25 same-pattern 第 3 数据点登记 + D81 landscape 4 surface 扩展) |
| `00558997` | docs | Phase C Batch 3 plan patch v8 — Task 15 heredoc naming drift fix (9 patches, MODULES → MODULE_REGISTRY + ALL_PERMISSIONS → ALL_MODULE_PERMISSIONS, plan §4.4 aspirational naming 与实际 code drift 对齐, Archive #25 same-pattern 第 3 数据点 trigger) |

### Phase C Batch 2 对话 (2026-04-21, 6 commits + 3 规则 8 暂停 resolved + 0 critical fabrication 逃逸)

| SHA | 性质 | 内容 |
|---|---|---|
| `308f7d54` | feat | Phase C Batch 2 Task 14 impl — RLS coverage (2 tests) + tenant isolation (4 tests) + dual-URL + adminDb TRUNCATE + L1 5 维度 all runtime Pass (6/6 pass, 1.19s) |
| `f49139a0` | docs | plan patch v7 — setup.ts beforeEach TRUNCATE adminDb (D85 家族 drift #3 forward-fix, app_user lacks TRUNCATE privilege) |
| `0a4696eb` | docs | plan patch v6 — Task 14 tenant-isolation tableName 补齐 (D85 家族 drift #2 forward-fix, Phase B Order schema tableName required) |
| `efa3d2e9` | docs | Task 14 L1 verify work-log 新建 + Snapshot §10 同步 (5 维度 verdict 表 + γ 方案事实依据 + 治理事件登记回顾) |
| `0da7456a` | docs | governance v4.4 — D85 + D86 登记 + Archive #26 追加 (同对话规则循环子类, D86 语言层自违反首次登记) |
| `ca863caa` | docs | plan patch v5 — dual-URL model for L1 最严 RLS (Task 14 L1 review catch testDb=postgres superuser BYPASSRLS 盲点) |

### Phase C Batch 1 对话(2026-04-21,8 commit + 3 规则 8 暂停 resolved)

| SHA | 性质 | 内容 |
|---|---|---|
| `43ff7850` | docs | Phase C Batch 1 收尾(Archive #25 + D84 候选 + Pre-Flight §7 扩展 + Snapshot A 路径切换 + Snapshot 增量) |
| `57894f8f` | feat | Task 13 impl(integration/fixtures.ts + fixtures.test.ts,platform_admin context BYPASSRLS seed + 3 tests passed) |
| `0b070a92` | fix | DB name cross-phase align(docker-compose.test.yml + package.json qr_order_test → qr_order,#25 root cause fix,D77 forward-fix 不 amend) |
| `61f8964e` | docs | Phase C plan patch v4(DB name align + Cross-Phase Invariant 注释) |
| `ffcc7cdc` | docs | Phase C plan patch v3(fixtures.test.ts table.label → table.name,Mode C δ 桶 1 read-side spill-over) |
| `a55da4ae` | feat | Task 12 impl(vitest.config + integration/setup.ts + global-setup.ts + γ3c 目录隔离 + testDb null-guard defense-in-depth) |
| `e13f7f37` | docs | Phase C plan patch v2(vitest 4 adapt: singleFork → maxWorkers:1 + isolate:false) |
| `f538941b` | feat | Task 11 impl(docker-compose.test.yml + package.json test:db:* scripts + γ3c CLI 分流) |

### Phase B Task 10 对话(2026-04-20 晚 / 2026-04-21 凌晨,2 commit)

| SHA | 性质 | 内容 |
|---|---|---|
| `55fff0da` | feat | Task 10 impl(Phase B 封顶)—— .env.example + server/eslint.config.mjs + RESUME 工具陷阱追加 + Phase B acceptance(/api/health 200 + 空库 migrate/seed 复现全通)。α.3 保留 qr-order-pg compose 不动 + γ.2' 重建 postgres-seed-test 空容器验收 + β.2 host curl 验收 |

### Phase B Task 9b 对话(2026-04-20 日间,2 commit)

| SHA | 性质 | 内容 |
|---|---|---|
| `714d61b1` | feat | Task 9b impl(seed.ts step 4-6 + ensure-system-roles helper + seed-data/menu+tables)—— Stage 0 发现 Table schema `label→name` rename + required `number` drift,α.1 plan patch + β.2 static imports 与 Task 9a 对齐 + bcrypt 密码 roundtrip verified |
| `d11205cf` | docs | Handoff 3-file 结构(governance / state / fabrication)整合 v1/v2/v3 |

### Phase B Task 8-9a 对话(2026-04-20 早,v3 对话 6 commit)

见 git log(v2 对话 8 commit + v1 对话更早)。本 Snapshot 不展开,可 `git log --oneline | head -40` 回溯。Task 9a `f06f333d` / Task 9a Patch 6 `1187b50f` / Task 8 `820389a9` / Task 8 Patch 5 `b8ef8fd4`.

### 更早(Phase B Task 4-7 / 启动期)

见 git log。Task 7 `39d297a7` / Task 7 β refinement `60fdcfe0` / Task 6 `49a53a3a` + `fff4f27f` / Task 5 `ad27caba` / Task 4 `2effedb5` + `bb1428ac` / Task 3 `9153f076` / Task 2 `75fd9084`.

---

## 4. Phase B 完成总览(全 10 task)

| Task | SHA 链 | 核心产出 |
|---|---|---|
| 2 | `75fd9084` + 更早 | schema.prisma 完整 + Mode C δ 桶 1 RESOLVED(16 MVP 必需字段) |
| 3 | `9153f076` 系 | 20260417000001_extend_schema 增量 migration |
| 4 | `bb1428ac` + `2effedb5` | rls_and_roles migration(β 双侧 ::text cast)|
| 5 | `ad27caba` | seed_platform_admin migration(SQL 极简)|
| 6 | `fff4f27f` + `49a53a3a` | prisma-client.ts(withTenantContext + β refinement)|
| 7 | `39d297a7` + `60fdcfe0` | shared/types.ts(OrderStatus 6→5 + 判别联合)|
| 8 | `9531f364` + `b8ef8fd4` + `820389a9` | tenant-aware.ts + G7-4 helper(Patch 5 Express 5 types)|
| 9a | `d9a21d66` + `1187b50f` + `f06f333d` | seed.ts platform admin + demo store + ModuleLicense |
| 9b | `714d61b1` | seed.ts roles + owner + menu + tables |
| 10 | `55fff0da` | .env.example + ESLint + Phase B acceptance |

**Acceptance 证据**(spec §9.3 / D46):

- ✅ Prisma 基建完备: 4 migration + schema 新增表 + seed 幂等
- ✅ Phase B chain 可复现: 空 postgres → migrate → seed 完整通过(`55fff0da` Stage 8 证明)
- ✅ JsonStore runtime 不受影响: `qr-order-server` 仍在 `/api/health` 200(Prisma 未被引用)
- ✅ 业务 code 未切 Prisma: 留给 Phase D
- ✅ ESLint no-floating-promises 生效 + baseline 0: Phase G async 重构有防御

---

## 4'. Phase C 完成总览(全 5 task)

| Task | SHA 链 | 核心产出 |
|---|---|---|
| 11 | `f538941b` + fix `0b070a92` + plan v3/v4 `ffcc7cdc`/`61f8964e` | docker-compose.test.yml + test:db:* scripts + γ3c CLI 分流 + DB name `qr_order` cross-phase align (#25 forward-fix) |
| 12 | `a55da4ae` + plan v2 `e13f7f37` | vitest.config.integration.ts + integration/setup.ts + global-setup.ts + γ3c 目录隔离 + testDb null-guard defense-in-depth + vitest 4 maxWorkers:1 + isolate:false adapt |
| 13 | `57894f8f` | integration/fixtures.ts + fixtures.test.ts + platform_admin context BYPASSRLS seed + 3 tests passed |
| 14 | `308f7d54` + plan v5/v6/v7 `ca863caa`/`0a4696eb`/`f49139a0` + work-log `efa3d2e9` + governance v4.4 `0da7456a` | rls-coverage.test.ts (2 tests) + tenant-isolation.test.ts (4 tests) + dual-URL identity model (TEST_ADMIN_DATABASE_URL = postgres superuser / TEST_DATABASE_URL = app_user / DATABASE_URL = postgres double-guard) + adminDb beforeEach TRUNCATE + global-setup.ts ALTER ROLE app_user password via WHATWG URL parser + L1 5 维度 all Pass runtime (6/6 tests, 1.19s) |
| 15 | `035cdee2` + plan v8 `00558997` + work-log `aea392ff` | module-registry.test.ts ghost permission guard (2 tests) + plan v8 heredoc naming drift fix MODULE_REGISTRY + ALL_MODULE_PERMISSIONS + Archive #25 same-pattern 第 3 数据点 reconcile + D81 landscape 4 surface 扩展登记 + 2/2 tests pass 1.00s |

**Acceptance 证据**:

- ✅ 测试 DB 基建完备: `qr-order-postgres-test:5433` + tmpfs + γ3c CLI 分流 + 4 migrations apply (init / extend_schema / rls_and_roles / seed_platform_admin)
- ✅ Dual-URL 测试身份模型 live: postgres superuser (admin / migrate + ALTER ROLE / TRUNCATE) + app_user (RLS subject runtime)
- ✅ RLS coverage + tenant isolation: 6/6 tests verify 每 store_id 表有 RLS enabled + tenant_isolation policy + WITH CHECK 完整 + 跨租户 SELECT 隔离 + WITH CHECK INSERT mismatch 拒绝
- ✅ Ghost permission guard: code → registry 单向 guard, 11 route files × 100+ requirePermission literals all ∈ ALL_MODULE_PERMISSIONS (14 permissions × 6 modules)
- ✅ L1 最严 review 节奏验证: Task 14 (`efa3d2e9`) + Task 15 (`aea392ff`) work-log → Ian 明批 → CC 三步走 live precedent

---

## 5. Mode C 状态(δ 分桶 matrix,live)

**决议**: Ian 在 Phase B Task 2 对话选 δ(分类处理)。Phase B Task 9a/9b/10 + Phase C Task 11-15 全程 verify 桶 2/4 无阻塞。

| 桶 | 字段数 | 内容 | 状态 |
|---|---|---|---|
| 1 | 16 | MVP 必需字段(Table rename+5 / Store+5 / Order+2 / Coupon+1 / MenuItem+1 / Category+1) | ✅ **RESOLVED** in `75fd9084`(Task 2 impl scope 扩展) |
| 2 | 6 | Floor plan(`x / y / width / height / shape / zone`) | 🔵 **delegated Phase I/J** |
| 3 | 3 | Deprecated(`Table.currentBillId / Table.currentOrderId / Table.paymentMode`) | ⚫ **不补**(Store 级 paymentMode 已够) |
| 4 | 6 | 次要扩展(`Waitlist.estimatedWait/notifiedAt / Printer.address / MenuItem.dietary/isRecommended/quickTags / Category.hideQuickTags`) | 🔵 **delegated Phase H/I** |

---

## 6. D 候选累积清单(Phase H Task 45 升格队列)

**累积 19 项**,按来源分段:

### v1 既有(7 项)

- **D67** 反向 drift 处理(types.ts > JSON)
- **D68** Order snapshot 哲学
- **D69** maxTables 留 Store 级
- **D70** Coupon schema 完整补入
- **D71** Seed-as-SSOT
- **D72** OrderStatus 派生状态前端展示
- **D73** JWT 不向后兼容部署纪律

### v2 新增(4 项)

- **D74** Plan 行数预算 + 实时预警 + **双向校准**(原桶 ×0.8 简单 / ×1.25 复杂 + 新桶 ×1.07 patch spec inline code heredoc + 新桶候选 ×1.5-1.8 work-log w/ grep embed)
- **D75** 数据 guard(`[ -s file ]` 后置)(live 应用 15+ task 0 fail)
- **D76** Commit 后强制 push + verify origin SHA(live 应用 15+ task 0 fail,CC memory 已落)
- **D77** Task 4 注释 E 事实修正 + β 决议理由更新

### v3 新增(5 项)

- **D78** Patch spec range mandatory grep-verify terminus(live 应用 5+ 次)
- **D79** Plan-as-code dryrun 前置(新依赖/framework module/type 系统 feature 引入时)
- **D80** @types/express v5 vs express v4 版本 skew
- **D81** Seed hardcode vs source SSOT drift 防御模式(α/β/γ)—— **Phase C Batch 3 期 landscape 扩展为 4 surface naming inconsistency** (shared/modules.ts MODULE_REGISTRY / seed.ts ALL_MODULES / fixtures.ts MODULES_FULL / spec §4.4 aspirational MODULES), 原单对 drift 升级为多 surface inconsistency family
- **D82** Schema-write tasks must enforce `prisma generate` step

### Task 9b 对话新增(1 项)

- **D83** Plan 绝对数字基准改用相对约束

### Phase C Batch 1 对话新增(1 项)

- **D84** Cross-Phase Invariants handoff 第四份文件(候选)
  - 触发: Fabrication #25(Task 11 plan `qr_order_test` 与 Phase B migration `qr_order` 跨 phase literal drift)
  - 收录范围: 硬 invariant only (DB name / role name / GUC / migration SQL literal); convention 类 drift 归 Pre-Flight Checklist 新条款

### Phase C Batch 2 plan patch v5 `ca863caa` 后续新增(2 项)

- **D85** 同 plan 跨 Task 基础假定 consistency check(候选)
  - 触发: Phase C Batch 2 Task 14 L1 review catch Task 11/12 vs Task 14 testDb 身份 assumption drift, `ca863caa` dual-URL forward-fix 修复

- **D86** Spec async-executable 原则(候选)
  - 触发: Ian 2026-04-21 meta observation
  - 落地: 所有 CC 执行消息最前必含 Stage 0 pre-check + Language-layer enforcement (禁 session-relative 指示词)
  - 首次登记自违反: `ca863caa` commit body 含 session-relative 措辞 → Archive #26 (D77 不 amend, Digest 正式登记 body 应用修正语言)

### Phase C Batch 3 对话新增(1 项)

- **D88** Plan Opus spec value-density self-audit + anchor literal grep 实证(候选)
  - 触发: Helper Opus 2026-04-21 raise (在外部 chat instance value-density 评估表) + Plan Opus 2026-04-21 Phase C Batch 3 closure 期 evaluate 后修正版含 sub-rule 4 维度 + Plan Opus 2026-04-21 Phase C Batch 3 期 2 次 spec 内部不一致 fabrication (Stage 0 setup.ts last anchor f49139a0 vs 实际 308f7d54 / Post-write wc -l verify range 38±2 vs 实际 plan v8 = 46 lines)
  - 原则: Plan Opus 产 spec 前 4 维度 self-audit:
    1. **Verification**: spec 含 verify (grep / tsc / runtime / D75 / D86 scan) 吗? 0 verify → 重新评估是否需 CC 路径
    2. **Judgement**: spec 含 fail-loud branch (规则 8 暂停触发条件) 吗? 0 branch → 内容机械度高, CC 路径冗余
    3. **Anchor literal grep 实证**: spec 含 anchor literal (SHA / line number / wc -l count / file path) 吗? **若有**, 必先 grep 实证后再写 spec, 不凭对 plan / commit 内容的高层印象映射
    4. **Path-of-least-defense**: 维度 1+2+3 全 0 → 模式 A (机械落盘), Ian 手动路径或 helper-direct-write (MCP 配后) 可用; **保留** D75 + wc + D86 三项 post-write verify (Ian 跑 3 行 bash command 等价, 不丢 verification 层)
  - 与 Helper raise 框架修正点: 不消除 CC 模式 A 的 verification 层 / 不主张 CC "co-thinker" 化 (保持 fail-loud 机械执行 = defense-in-depth 第 3 层) / 模式 A 节省 ≈ CC instance 启停 latency + Plan Opus → CC spec 中转 token, 不节省 LLM 调用本身 / 加入维度 3 anchor literal grep 实证 (核心治理意义 > value-density 优化)
  - 与既有规则家族关系:
    - **D74 数量估算治理** (产物行数估自己) vs **D88 维度 3** (anchor literal 引用 plan/commit 内容时的 grep 实证): 两者都属"期望数量"类规则家族, D88 子类专攻 anchor literal 子类
    - **Pre-Flight Checklist §7 第 5 行 cross-phase literal coupling** (spec 涉跨 phase artifact 时 grep 实证) vs **D88 维度 3** (spec 涉 commit/file anchor 时 grep 实证): 同 evidence-first 原则, D88 扩展到 anchor literal 子类
    - **Helper raise value-density 框架** (4 模式 A/B/C/D): D88 维度 1+2+4 内化此分级思想, 但路径 (Ian 手动 / helper-direct-write) 保留 verification 层
  - 升格时机: Phase H Task 45

**全文**: 见 `phase-5-governance-digest.md` §6。

---

## 7. Pending drifts(本对话未修,转下对话或 Phase H Task 45)

**Phase 封顶 v5.0 regen reconcile**: 7.9 / 7.10 / 7.11 / 7.12 由 Phase B/C 完成节点机制清理 (内化已 land 状态), Snapshot 不再单独登记。新增 Phase C Batch 2/3 期 7.13 / 7.14 / 7.15。

### 7.1 Line 17 Phase B batch summary 表 Task 3 subject drift

- **位置**: `phase-b-infrastructure.md` line 17
- **当前**: `| 3 | 生成 20260417000001_init/migration.sql |`
- **正确**: `| 3 | 生成 20260417000001_extend_schema/migration.sql |`(Task 3 β 增量路径)
- **处理**: Phase H Task 45 spec reconcile
- **外化锚**: `1187b50f` commit body

### 7.2 `seed.ts.pre-phase5` backup untracked

- **位置**: `server/prisma/seed.ts.pre-phase5`(64 行,Task 9a Stage 2 备份)
- **处理**: Phase I `_archive/` 归档
- **外化锚**: `f06f333d` commit body

### 7.3 Task 6 plan 缺 `pnpm prisma generate` step(D82 触发事件)

- **位置**: `phase-b-infrastructure.md` Task 6 段
- **处理**: Phase H Task 45 reconcile
- **外化锚**: `f06f333d` commit body

### 7.4 `stores.tipBase` 无 `@map("tip_base")`(顺手项)

- **位置**: `schema.prisma` stores.tipBase 字段
- **处理**: Phase H/I 任何 touch schema.prisma 的 task 顺手补
- **当前**: Task 10 / Phase C Task 11-15 也未 touch schema.prisma,持续传递

### 7.5 Task 4 注释 E storeId 格式 "cuid" 错误(D77 触发事件)

- **位置**: `2effedb5` migration.sql 注释 E
- **处理**: Phase H Task 45 spec reconcile
- **不能 amend**: 已 push

### 7.6 phase-b-infrastructure.md Task 9b plan heredoc label/number 未同步 Mode C δ 桶 1(#20 触发事件)

- **位置**: `phase-b-infrastructure.md` Task 9b 段 line ~2085(`seed-data/tables.ts` heredoc)+ Stage 4 table upsert 段
- **问题**: plan heredoc 用 `label` 字段(schema 已 rename 为 `name`)+ 漏 `number` required 字段
- **Task 9b 实际执行**: CC 已在 `714d61b1` 用 α.1 修订路径 land 正确 schema,plan 本身未 patch
- **处理**: Phase H Task 45 reconcile 时统一同步 Task 9b plan heredoc 与 Mode C δ 桶 1 schema
- **外化锚**: `714d61b1` commit body + Archive #20

### 7.7 Task 10 docker-compose.yml 与现有 dev stack drift

- **背景**: Task 10 plan 设计时未考虑现有 `docker-compose.yml`(4-service stack 已 Up 长期, daily dev 使用)
- **差异**: container_name (`qr-order-pg` vs plan `qr-order-postgres`) / password (hardcoded `qrorder123` vs plan `${POSTGRES_SUPERUSER_PASSWORD:-devonly}` fallback) / user (`qrorder` vs plan `postgres` superuser 模式) / sibling services (adminer/server/nginx) plan 未涵盖
- **Task 10 决议**: α.3 保留现状 compose 不动, `.env.example` 按 plan template 写作为 aspirational 文档
- **处理**: Phase H Task 45 reconcile —— 统一 compose naming + creds 策略 + `.env.example` vs 实际 compose env 一致性决定
- **外化锚**: `55fff0da` commit body(explicit drift section)

### 7.8 qr-order-pg 容器内遗留测试数据(legacy schema, Phase 5 前)

- **位置**: `qr-order-pg` PostgreSQL 容器 + `pg_data` volume
- **内容**: `stores` 表 2 行(store-demo-001 示例餐厅 / store-demo-002 火锅世界)+ `store_users` 表 6 行(每 store 3 个用户 admin/staff1/staff2,bcrypt 密码)
- **Schema**: Task 2/3 expansion 前老 schema(`store_users` 用 text `role` 列,非新 Staff+Role FK 模型)
- **Ian confirmed**: 测试残留, 无业务价值
- **处理**: Phase H/I/J 清理时一起 reconcile (`docker compose down postgres + volume rm` + 用 qr-order-pg 跑 Phase 5 schema 的决策时机)
- **外化锚**: Task 10 Stage 8 用新 `postgres-seed-test` 跑验收, qr-order-pg 未 touch

### 7.13 phase-c-test-db.md spec §4.4 aspirational naming Phase H Task 45 reconcile

- **位置**: `phase-c-test-db.md` §4.4 段 (设计阶段定 `MODULES` + `ALL_PERMISSIONS` 作 shared/modules.ts export 名)
- **问题**: 实际 code (Phase B `310f43ff` 期 land) 用 `MODULE_REGISTRY` + `ALL_MODULE_PERMISSIONS` (5 exports / 6 modules / 14 permissions). spec §4.4 文字未同步更新, plan v8 `00558997` 仅 fix Task 15 heredoc, §4.4 spec 文字 drift 持存
- **处理**: Phase H Task 45 reconcile 时统一 spec §4.4 文字与实际 code naming 对齐 (或反向决议升级实际 code 为 `MODULES` / `ALL_PERMISSIONS`, 由 reconcile 期判)
- **触发链**: Archive #25 same-pattern 第 3 数据点 (Plan Opus 写 plan v8 前 spec §4.4 凭印象 naming, 未 grep 实际 code) → CC L1 work-log Stage 0 G-T15.1 grep 实证 → plan v8 Task 15 heredoc forward-fix
- **外化锚**: `00558997` commit body + Archive #25 第 3 数据点 + Task 15 L1 work-log `aea392ff`

### 7.14 D81 candidate landscape 4 surface naming inconsistency

- **位置**: 4 处 module-related naming surface 并存:
  - `shared/modules.ts` `MODULE_REGISTRY` (canonical, Phase B `310f43ff`)
  - `server/prisma/seed.ts:11` `ALL_MODULES` (Task 9a `f06f333d` hardcoded 6 module IDs, D81 候选原触发)
  - `server/src/__tests__/integration/fixtures.ts:416` `MODULES_FULL` (Task 13 `57894f8f` hardcoded 6 module IDs, 顺序与 canonical 略异但 set 等价)
  - `phase-c-test-db.md` §4.4 aspirational `MODULES` (drift 项, 见 7.13)
- **问题**: D81 候选原 scope = seed hardcode vs source SSOT 单对 drift, Phase C Batch 3 G-T15.4 fact base 揭示扩展为多 surface naming inconsistency family
- **处理**: Phase H Task 45 reconcile 时同时处理 4 surface (非单对). D81 α/β/γ 三路径 (runtime assertion / build-time check / comment reminder, 当前 γ 最弱防御) 决议范围扩展
- **外化锚**: `aea392ff` work-log §5.2 D81 landscape 4 surface 登记 + `035cdee2` commit body Governance 段

### 7.15 Time Machine restore env gap pattern (Phase C Batch 3 期登记)

- **位置**: 协作环境基础设施层 (Mac dev environment + Docker Desktop + node_modules)
- **背景**: Mac 砖机 (Logic Gate 故障, 2026-04-22 OS update 后) → Time Machine 4/4 备份还原 → Phase 5 协作链路重启
- **3 数据点**:
  - 数据点 1: Docker Desktop daemon 未自启 (socket `/Users/.../docker.sock` 不存在), 容器 image 需 rebuild — Phase C Batch 3 Task 15 启动期 CC Stage 0 docker ps fail-loud 拦截
  - 数据点 2: `server/node_modules/.bin/vitest` 缺失 (Time Machine 备份 node_modules 不完整, pnpm install 未跑过) — Phase C Batch 3 Task 15 test run 期 fail-loud `sh: vitest: command not found` 拦截
  - 数据点 3: Prisma Client generated types 缺失 (`server/node_modules/.prisma/` 不存在, `pnpm prisma generate` 未跑过) — Phase D Task 16 启动期 CC Stage 4.1 fail-loud (TS2305 ModuleLicense + TS2353 tipBase / moduleLicense 字段缺失, 4 store.ts own errors) → α 接受 `cd server && pnpm prisma generate` (75ms) → 重跑 Stage 4.1 store.ts 0 own error + Stage 4.2 baseline 123 → 103 (-20 transitive errors, BASELINE_TSC §8 cite 验证准确, env transient drift 非 cite stale, 见 §7.18 数据点 4)
- **处置**: 3 数据点均 Ian 一手 + α 接受路径处置 (`open -a Docker` + `docker compose build` / `pnpm install --frozen-lockfile` / `pnpm prisma generate`), spec 内 Risk E 子类已预置处置路径
- **观察**: Snapshot §8 "Daily dev stack 5 容器 Up 长期" 在 Time Machine 还原后失效, 整体 env restore 工作量比 Snapshot §8 假设大
- **处理**: Phase H Task 45 候选条款 "Backup restore protocol" 教训内化, 不新升格 D 候选; Snapshot §8 候选 sub-clause "post-restore env gap risk acknowledgment" 列出环境层 gap checklist (Docker daemon 自启 + container image rebuild + node_modules 完整性 + `.env` 文件存在 + DB volume 持久化 + tooling CLI install)
- **外化锚**: `035cdee2` commit body Governance 段 Time Machine env gap observation + Phase H Task 45 reconcile queue + Phase D Task 16 commit body 数据点 3 追加

### 7.16 phase-d-repositories.md §746 "段 2a 完成" stale marker

- **位置**: docs/superpowers/plans/2026-04-17-phase5-postgres-migration/phase-d-repositories.md line 746-749
- **内容**: "段 2 段 2a 完成. Task 16 (store.ts) + Task 17 (orders.ts) verify 通过 (对话中, 2026-04-17). Nit: replaceDraftItems 顺序插入循环已加 createMany 限制说明注释."
- **问题**: 2026-04-17 Plan 撰写期旧 attempt 残留 marker (Phase A skip + Phase B/C 重排前的旧叙事). 实际 HEAD 851505d9 时点 store.ts / orders.ts 不存在, git log 空 — Phase 5 main lineage 实际未实施.
- **附属违反**: line 748 含 D86 禁词 "对话中" (session-relative 措辞)
- **处理**: Phase H Task 45 reconcile, Plan §746-749 整段删除或改写为 "Phase D 启动期重新实施" marker
- **外化锚**: Phase D Task 16 启动 Stage 0 G-D16.5 grep 实证 (HEAD 851505d9, store.ts/orders.ts 不存在 + git log 空) + Plan line 748 D86 violation

### 7.17 PlatformAuditLog Task 26 归属决议待办

- **位置**: phase-d-repositories.md §85-88 Task 26 方法清单 + schema.prisma model PlatformAuditLog
- **问题**: Phase D plan §88 Task 26 方法清单写 "PlatformAdmin + ModuleLicense (这个走 withPlatformContext, bypass RLS)", 未提 PlatformAuditLog. 22 model 全清单 Stage 0 G-D16.4 实证 PlatformAuditLog 存在 (含 adminId / action / targetStoreId / payload / ipAddress / userAgent + 3 @@index), 归属 Task 26 (含在 platform-admin.ts) vs 单独 audit-log.ts 待决议.
- **处理**: Task 26 batch (D-5) 启动期 Plan Opus + Ian 决议. 必要时 plan §88 patch 增量补 PlatformAuditLog 方法.
- **外化锚**: Phase D Task 16 启动 Stage 0 G-D16.4 grep 22 model 全清单 + Task 16 work-log §1 G-T16.3 + §3 风险 A 关联 + Stage 0.3c PlatformAuditLog 字段 grep 实证

### 7.18 Snapshot v5.0 self-fabrication 多数据点 + env-state observation (Archive #28 候选)

- **位置**: Snapshot v5.0 §8 文件状态表 + §9.3 Phase B carry-forward + §9.5 G-D16.2 / G-D16.4 启发, 共 4+ literal occurrence (本批 D-1 Stage 5.2-5.5 一并修)
- **数据点 1** (count drift): 两处 "21 model (16 主表 + 6 子表)" literal (§8 line 408 + §9.5 G-D16.4), Stage 0 G-D16.4 实证为 22 model (16 主表 + 6 子表, +PlatformAuditLog as 16th 主表). root cause: Plan Opus 凭 Phase B Task 2 期记忆产出 enumerable count, 未 grep schema.prisma 实证.
- **数据点 2** (wrapper count drift): §9.5 G-D16.2 fact base 写 "3 wrapper (withTenantContext / withPlatformContext / withTenantContextAndHooks)", Stage 0 G-D16.2 实证为 4 wrapper (漏 `withSystemContext`). root cause: Plan Opus 凭 Phase B Task 6 期记忆产出, 未 cat prisma-client.ts 实证.
- **数据点 3** (SHA cite drift): §9.5 G-D16.2 cite "Phase B `49a53a3a` + `60fdcfe0` baseline" 引用错误. Stage 0.4 实证: prisma-client.ts git log 显示 `820389a9` (Task 8 G7-4 helper) + `49a53a3a` (Task 6 init), 不含 `60fdcfe0`. `60fdcfe0` 实际是 Task 7 shared/types.ts (DraftOrder/SubmittedOrder + OrderStatus 5 + StoreUser/JWT). root cause: Plan Opus 凭对 Phase B Task 6/7 期 commit chain 印象映射 SHA, 未 git log 实证.
- **数据点 4** (env-state observation, **NOT cite self-stale**): Snapshot §8 cite "tsc baseline 103 errors" 经 Stage 0.7 pre-generate 测得 123 (drift +20). Stage 4.2 post-generate (运行 `pnpm prisma generate` 后) 测得 103 (= cite 准确). 结论: `103` 数字本身不是 self-stale, drift 来源 = Time Machine restore 后 Prisma Client 未 generate (env transient drift, 见 §7.15 数据点 3). 录本 DP 用于区分 "cite 真 stale" (DP1+2+3 印象产出类) vs "env 异常导致 cite 似 stale" (本 DP), 防御层不同.
- **谁拦**: CC fail-loud Stage 0/4 grep + Helper Opus cross-instance review 2026-04-26 第 2 turn 同模式 anchor literal 印象映射 flag (defense-in-depth 第 6 层 retrospective fabrication 暴露 working-as-designed)
- **处理**: §8 + §9.5 G-D16.2/4 21 → 22 model + 3 → 4 wrapper + SHA cite forward-fix, 本批 D-1 commit 一并 update. Archive #28 候选 (Category 1 子类 "Phase 封顶 regen 期 enumerable count + SHA cite 印象产出") 下次 governance commit 节奏点 land. DP4 单独标记为 env-state observation, 不入 Archive #28 主体 (不算 fabrication)
- **防御候选** (下窗口 D88 正式登记时考虑): (1) Type β-adjacent 主子规则 "信任 prior Plan instance produced artifact literal 不 grep 实证" (覆盖 SHA / count / 任意 enumerable literal 引用) — 与 D88 维度 3 同构. (2) DP4 区分子规则 "env-state 异常导致 cite 似 stale 不入 self-fabrication 范畴, 必须 post-recovery state 验证才判 cite 真 stale" — 防止 false positive Archive 登记.
- **外化锚**: 851505d9 governance v5.0 commit body (fabrication 源 DP1+2+3) + Phase D Task 16 启动 Stage 0 G-D16.2/4 + Stage 0.4 git log + Stage 4.1/4.2 tsc + Helper 2026-04-26 cross-instance review 第 2 turn flag

---

## 8. 环境状态(全 stack,响应 #22 + Phase C 完成 + Time Machine restore 后状态)

### Docker 容器全量

| 容器 | image | Port 映射 | 状态 (本 v5.0 regen 时点) | 用途 |
|---|---|---|---|---|
| `qr-order-pg` | postgres:16-alpine | 5432:5432 | Up (Time Machine restore 后 Ian `docker compose up` 重起) | Daily dev stack 主 postgres(legacy schema, 有测试残留数据 §7.8) |
| `qr-order-server` | local build | 3001:3001 | Up | Daily dev server(JsonStore 模式), Phase B Step 9 验收使用 |
| `qr-order-nginx` | nginx | 80:80 | Up | Daily dev reverse proxy |
| `qr-order-adminer` | adminer:latest | 8081:8080 | Up | Daily dev DB GUI |
| `postgres-seed-test` | postgres:16-alpine | 15432:5432 | Up (Task 10 Stage 1 重建 + Time Machine 后 Ian 重起) | **Phase B acceptance 证据** —— 全 Phase B schema(4 migration)+ 完整 seed |
| `qr-order-postgres-test` | postgres:16-alpine | 5433:5432 | Down (Phase C 完成 Step 5 cleanup, `pnpm test:db:up` 重起 / Phase D test 期消费) | Phase C 测试 DB γ3c tmpfs (4 migrations apply + dual-URL identity model + adminDb TRUNCATE) |

**关键**: qr-order-pg / postgres-seed-test / qr-order-postgres-test 三容器并存, 数据彼此隔离(不同 volume + 不同 port + 不同 DB user 配置). Phase D Repository 实施期 Stage 0 verify `qr-order-postgres-test:5433` (`pnpm test:db:up`) 起容器后跑 integration test.

### 文件状态

| 项 | 状态 | 备注 |
|---|---|---|
| `docker-compose.yml` | 保留现状未改(Task 10 α.3) | 4-service 定义(postgres/server/adminer/nginx) |
| `docker-compose.test.yml` | Phase C Task 11 + fix `0b070a92` 落定 | qr-order-postgres-test (postgres:16-alpine + tmpfs + DB name `qr_order` cross-phase align) |
| `.env.example` | Task 10 新建(aspirational) | Phase J Task 48 ALTER ROLE 时实际生效 |
| `server/eslint.config.mjs` | Task 10 新建(ESLint 9 flat) | `@typescript-eslint/no-floating-promises = error` |
| `server/.eslintrc.*` | 不存在 | (Task 10 Branch C 选 flat config) |
| `server/package.json` | Task 10 加 ESLint deps + Task 11 加 test:db:* scripts + Task 14 加 test:db:migrate / test:integration scripts (`f49139a0` v7) | eslint@^9 + @typescript-eslint/parser@^8 + eslint-plugin@^8 + vitest@^4 (lockfile aligned) |
| `server/prisma/seed.ts.pre-phase5` | untracked | Phase I `_archive/` 归档 (§7.2) |
| `server/prisma/seed.ts` | Task 9a + 9b 完整 | platform admin + demo store + ModuleLicense + roles + owner + menu + tables (D81 候选 ALL_MODULES hardcode §7.14 内入 4 surface) |
| `shared/modules.ts` | Phase B 期 `310f43ff` 单一 commit | 52 lines / 5 exports (MODULE_REGISTRY + ALL_MODULE_PERMISSIONS + ModuleId + getModulePermissions) / 6 modules × 14 permissions |
| Prisma Client types | 已最新 | Task 9a Stage 4c regenerate, post-schema |
| tsc baseline | 103 errors(pristine HEAD, v3/v4 drift 修正) | Phase B/C Task 每次 verify "touched files 内 0 new errors" |
| ESLint `no-floating-promises` baseline | 0 errors | Task 10 Stage 6 验证 |
| HEAD == origin/main | ✅ `035cdee2` | Phase C 封顶 — Task 15 feat (module-registry.test.ts ghost permission guard, 2/2 tests pass). Snapshot §8 HEAD SHA 每对话收尾增量 Edit 同步 (§7.9 pattern Phase 封顶 regen reconcile 已内化机制, 不再单独登记)。 |

### Shell / OS 环境状态 (post-Time Machine restore)

- **DATABASE_URL / TEST_DATABASE_URL / TEST_ADMIN_DATABASE_URL**: 未持久 export 到 Ian 的 shell(Bash 工具 session 独立), 下对话需 re-export. Phase C Task 14 dual-URL pattern (`TEST_ADMIN_DATABASE_URL` 后台用 / `TEST_DATABASE_URL` runtime 身份)
- **Docker Desktop**: Running (Time Machine 还原后 Ian 一手 `open -a Docker` + `docker compose build` 重起, §7.15 数据点 1)
- **server/node_modules**: 完整 (Time Machine 还原后 Ian 一手 `pnpm install --frozen-lockfile` 修复 vitest binary, §7.15 数据点 2). `vitest@4.1.2 darwin-arm64 node-v24.6.0` lockfile aligned
- **Mac 硬件**: 运行中 (Logic Gate 故障已通过 Time Machine 还原修复)
- **`@types/bcryptjs`**: 不需要(bcryptjs v3+ bundled types, Task 9a Stage 0.3 check 已删除)
- **`pre-phase-5-demo` branch**: 存在 origin (从 `bed2b504` Phase B Task 2 改动前最后纯 docs commit checkout), 本地无 tracking. Demo Planner handoff (`emergency-demo-planner-handoff.md`) 已产出, demo session 启动 ritual 待 Ian 触发 (与 Phase 5 main scope 完全隔离)

---

## 9. 下一对话第一件事 (Phase D Repository 启动 — Task 16 第一个 task)

### 9.1 Phase D 启动 scope

**Phase D = 11 个语义化 Repository 重构** (`phase-d-repositories.md` 完整). 起点 = Task 16 (Repository 11 个之第 1 个, 具体 model 需 Stage 0 grep `phase-d-repositories.md` Task 16 段确认). Phase D 整体批次切分 (Batch 数 / 每 Batch task 数 / L1/L2/L3 review 级别) 由 Plan Opus 启动期 Stage 0 grep `phase-d-repositories.md` 后判.

**预期 batch 切分启发**(基于 Phase B/C 经验):

- L1 最严级别 task (跨 tenant 关键 helper / RLS 边界 helper / Repository core CRUD pattern 初始化等) 单独 batch, work-log → Ian 明批 → CC 三步走
- L2 spot check task (后续 Repository 复用 L1 已验证 pattern) 可批量 batch
- 具体由 plan §1-§N 段标 review 级别字段定 (Phase D plan 写作期已含)

### 9.2 启动 ritual

1. **读** (按顺序):
   - 本 Snapshot v5.0 (live 增量, HEAD `035cdee2`)
   - `phase-5-fabrication-archive.md` (27 条, 最新 #27 Plan Opus spec 内部不一致 forward-fix 双数据点)
   - `phase-5-governance-digest.md` (含 D85 / D86 / D88 + Pre-Flight §7 全条款)
   - `docs/superpowers/plans/2026-04-17-phase5-postgres-migration/phase-d-repositories.md` (Task 16 段起整体 scope)
   - Phase C 封顶 v5.0 regen commit body (本 commit, 治理 v5.0 + Archive #27 锚)

2. **Grep verify** (Stage 0 carry-forward ritual):

       git log -10 --format="%h %s"

   确认 commit 链含: `035cdee2` (Phase C Task 15 feat) + 本 v5.0 regen commit + Archive #27 commit + Phase C Batch 3 三 commit (`aea392ff` / `00558997`) + Phase C Batch 2 六 commit + Phase C Batch 1 八 commit + Phase B 完成链.

3. **环境 verify**:

       docker ps --format "{{.Names}}\t{{.Status}}"

   预期 5 dev 容器 Up. `qr-order-postgres-test` 应为下 (Phase C Batch 3 Task 15 Step 5 清场), Phase D 启动期 `pnpm test:db:up` 重起 (若 Task 16 实施含 integration test).

4. **#11 path drift verify**:

       ls server/src/repositories/prisma-client.ts

   预期 file exists. Phase D Repository 必 import production prisma-client (`withTenantContext` / `withPlatformContext` / hooks helper), `server/src/repositories/` 路径 §7.11 已 grep 实证, Phase D 直接消费.

### 9.3 Stage 0 carry-forward (Phase B + Phase C 完整 verified, Phase D 直接信任)

**Phase B carry-forward** (Task 2-10 全 land):
- Schema (16 主表 + 6 子表 + Mode C δ 桶 1 RESOLVED) / 4 migrations (init / extend_schema / rls_and_roles / seed_platform_admin) / Prisma Client regenerated / seed.ts (platform admin + demo store + roles + menu + tables 完整)
- prisma-client.ts (`server/src/repositories/prisma-client.ts`, withTenantContext + withPlatformContext + withTenantContextAndHooks G7-4) / shared/types.ts (OrderStatus 5 + 判别联合) / tenant-aware.ts (Express middleware) / shared/modules.ts (52 lines, MODULE_REGISTRY + ALL_MODULE_PERMISSIONS)
- `.env.example` aspirational / ESLint 9 flat config / no-floating-promises baseline 0

**Phase C carry-forward** (Task 11-15 全 land):
- 测试 DB 基建: `qr-order-postgres-test:5433` + tmpfs + γ3c CLI 分流 / `pnpm test:db:up` / `pnpm test:db:down` / `pnpm test:db:migrate` / `pnpm test:integration` scripts
- Dual-URL 测试身份模型 live: `TEST_ADMIN_DATABASE_URL` (postgres superuser, migrate + ALTER ROLE + adminDb TRUNCATE) / `TEST_DATABASE_URL` (app_user, RLS subject runtime) / `DATABASE_URL` (postgres double-guard)
- `server/src/__tests__/integration/setup.ts` adminDb pattern beforeEach TRUNCATE + testDb null-guard defense-in-depth + `withTestTenant` + `withTestPlatform` helpers
- `server/src/__tests__/integration/global-setup.ts` migrate deploy + ALTER ROLE app_user password via WHATWG URL parser
- `server/src/__tests__/integration/fixtures.ts` 桥 helpers (Task 13 land, 含 MODULES_FULL D81 §7.14)
- `server/src/__tests__/integration/rls-coverage.test.ts` (51 lines, 2 tests) + `tenant-isolation.test.ts` (77 lines, 4 tests) + `module-registry.test.ts` (46 lines, 2 tests)
- L1 最严 review 节奏 live precedent: Task 14 + Task 15 work-log → Ian 明批 → CC 三步走

### 9.4 规则应用提醒 (Phase B + C 累积 informed)

- **Opus Spec Pre-Flight Checklist** (Digest §7, 含 Language-layer self-check + Cross-phase literal coupling + 本对话内新规则激活 全条款 + D88 候选 anchor literal grep 实证)
- **D74 双向校准**: 预估行数分桶 (Phase C Batch 3 累积桶 B replacement plan heredoc 第 2 数据点)
- **D83 定性约束**: verify 用 "expected 结构出现 / unexpected 未出现", 不用 ±N%
- **D84 Cross-Phase Invariants live**: DB name `qr_order` / role name (`app_user` / `platform_admin` / `system_worker`) / GUC `app.current_store_id` / policy `tenant_isolation` 硬 invariant. plan writer 引用必 grep 实证
- **D85 infra identity 变更 dryrun 全 lifecycle 链路**: plan writer 改 infra 身份时 plan 必 exercise beforeEach / fixture / afterAll 全链路
- **D86 async-executable + language-layer self-check**: 所有治理 / commit message / CC 执行消息 / work-log 禁 session-relative 指示词 + Stage 0 repo 状态 pre-check 模板强制
- **D88 Plan Opus spec 4 维度 self-audit**: 产 spec 前自审 verification + judgement + anchor literal grep 实证 + path-of-least-defense (维度 3 直接响应 Phase C Batch 3 closure 期 2 处 spec 内部不一致 fabrication, 强约束)
- **#14/#22/#25/#26/#27 防御**: Snapshot 每对话收尾增量 Edit + Phase 封顶 regen + cross-phase grep + language-layer self-check + spec writer anchor literal grep 实证
- **#20 完整 dump**: Stage 0 grep schema / migration 用 `cat` 或 `grep -A N` 完整 dump
- **Time Machine restore env gap (§7.15)**: 跨设备 / 跨环境恢复后必 verify Docker daemon + container image + node_modules + `.env` + DB volume + tooling CLI

### 9.5 关键 grep 清单 (Phase D Task 16 启动期, 待 plan 段读后细化)

**G-D16.1** — Phase D plan Task 16 段完整 view:

    sed -n "<TASK_16_LINE_RANGE>p" docs/superpowers/plans/2026-04-17-phase5-postgres-migration/phase-d-repositories.md

(具体行号由 Plan Opus Stage 0 grep `^### Task 16` 定位.)

**G-D16.2** — production prisma-client API surface (Phase B `49a53a3a` Task 6 init + `820389a9` Task 8 add G7-4 helper baseline):

    cat server/src/repositories/prisma-client.ts

Fact base: `prisma` (app_user) / `systemPrisma` (system_worker) export + `Db = PrismaClient | Prisma.TransactionClient` 类型 + 4 wrapper (`withTenantContext` / `withPlatformContext` / `withSystemContext` / `withTenantContextAndHooks`) + `assertUuid` SQL injection guard + Hook 语义 (tx commit FIFO fire / tx throw 0 fire / hook throw console.error 不传播). [Snapshot v5.0 self-stale 修正, 见 §7.18 Archive #28 候选 数据点 2 + 3]

**G-D16.3** — Phase B Task 8 tenant-aware.ts (Express middleware) integration point:

    cat server/src/middleware/tenant-aware.ts

Fact base: req-level storeId 注入逻辑 + Repository 层 db 参数透传 contract.

**G-D16.4** — schema.prisma model 完整 (Phase B `75fd9084` baseline):

    grep -nE "^model |@@map" server/prisma/schema.prisma

Fact base: 22 models (16 主表 + 6 子表, +PlatformAuditLog as 16th 主表) 命名空间, Phase D 11 个 Repository 对应 model 选择. [Snapshot v5.0 self-stale 修正, 见 §7.18 Archive #28 候选 数据点 1]

**G-D16.5** — `server/src/repositories/` 当前文件清单 (Phase D Task 16 启动 baseline, `851505d9` 时点):

    ls -la server/src/repositories/

Fact base:
- `auth.repository.ts` (704 B, Mar 23, legacy pre-Phase 5)
- `json-store.ts` (2080 B, Apr 26, JsonStore singleton)
- `prisma-client.ts` (6213 B, Apr 26, Phase B Task 6 + Task 8 baseline — SHA chain `49a53a3a` + `820389a9`, 见 G-D16.2)
- `stores.ts` (1153 B, Apr 26, JsonStore singleton, Phase D 期 NOT 改动 — Plan §47/§52 铁律)

`store.ts` / `orders.ts` (Task 16/17 目标文件) Phase D Task 16 实施前不存在; git log 空 — Plan §746 "段 2a 完成" stale marker, 见 §7.16.

(其他 grep 由 plan §1 整体 scope 读后扩展.)

### 9.6 不启动原则

新 Plan Opus 启动后:

1. 读完 ritual (9.2) → CoT 输出 Phase D scope 理解 + Phase B/C carry-forward ack
2. Stage 0 grep `phase-d-repositories.md` 整体 + Task 16 段 (9.5 G-D16.1-5)
3. 视 plan §1 review 级别字段定 batch 切分 + 第一个 task 是 L1 / L2 / L3 review
4. L1 → 同 Phase C Task 14/15 三步走 (work-log → Ian 明批 → CC); L2 → 直接 CC 执行消息; L3 → 摘要委托
5. **不直接起 CC 执行消息** 在 Phase D 启动期; plan 整体 scope 读完 + Stage 0 grep 完成 + Ian 明批 batch 1 第一个 task GO 后才进入 CC 执行消息

### 9.7 Phase C 封顶 closure 记录 (供 Phase D Plan Opus 理解 Phase C 协作节奏)

Phase C 5/5 + 三 Batch + 17+ commits + 6 规则 8 暂停全 resolved + 0 critical fabrication 逃逸:

- Batch 1 (Task 11-13): 8 commits + 3 规则 8 暂停 (vitest 4 / label read-side / DB name cross-phase) + Archive #25 + D84 候选首登
- Batch 2 (Task 14): 6 commits + 3 规则 8 暂停 (URL encoding / tableName / TRUNCATE privilege) + Archive #26 + D85 + D86 候选 + dual-URL 治理样板
- Batch 3 (Task 15): 3 commits + 2 规则 8 暂停 (Plan Opus spec 内部不一致 setup.ts anchor + wc -l range, 双 α 接受 forward-fix) + 2 规则 8 暂停 (Time Machine env gap: Docker daemon + node_modules) + Archive #27 + D88 候选 + Archive #25 third data point + D81 landscape 4 surface

**Fabrication 拦截统计 (Phase C 累积)**:
- Ian 一手 (Flag): 3+ 次 (URL encoding regex / D86 语言层自违反 #26 / D88 raise 后 sub-rule 修正)
- CC grep / tsc / runtime fail-loud: 8+ 次 (规则 8 暂停 6 次 resolved 全计)
- Plan Opus 自审: 0 次 (Phase C Batch 3 期数据点证 spec writer 凭印象 anchor literal 子类自审弱, D88 sub-rule 强约束)
- Helper Opus 跨 chat raise: 1 次 (D88 candidate value-density 分级)

**协作节奏观察**:

- L1 最严 review 节奏 (work-log → Ian 明批 → CC) Phase C 三 batch 累积 Task 14 + Task 15 双数据点, 模型稳定. Phase D / Phase G L1 task 复制此节奏.
- Plan Opus spec 内部不一致 fabrication 在 Task 15 CC 执行消息 (8 anchor + 5 failure mode + 7 阶段) 复杂度场景下 2 次同模式 (anchor SHA / 数量 range). 提示 D88 维度 3 anchor literal grep 实证子规则核心治理意义, Phase D 启动期立即应用.
- Helper Opus 在外部 chat instance raise D88 雏形 → Plan Opus Phase C Batch 3 closure 期 evaluate + 修正版含 sub-rule 4 维度. Helper 与 Plan 角色边界 + 规则进入路径 first time 试运行.

---

## 10. 当前修订轨迹

- **2026-04-20 首版**: Task 8 impl + Task 9a 完整。
- **2026-04-21 v2 regen** (Phase B Task 10 完成后): Phase B 10/10 收尾里程碑.
- **2026-04-21 A 路径切换 + Phase C Batch 1 收尾增量 Edit**: 顶部声明从"覆盖式,每对话全文重写"改为"live 增量维护,Phase 封顶 regen". 理由: regen 过程本身是 fabrication 高发时点(#24 原型教训),增量式对齐 Archive/Digest 三文件机制一致性.
- **2026-04-21 D2 下对话启动指引补丁**: §9 整节重写 Phase C Batch 2 启动指引 (Task 14 only, L1 最严单独跑).
- **2026-04-21 v4.4 批 (Phase C Batch 2 plan patch v5 `ca863caa` 后续治理更新)**: §6 D85 + D86 / 同期 Digest §6 新增 D85 + D86 / Archive #26 追加 (D86 语言层自违反首次登记).
- **2026-04-21 Task 14 L1 verify work-log 产出 (`efa3d2e9`)**.
- **2026-04-21 v4.5 批 (Phase C Batch 2 Task 14 closure, `308f7d54` feat commit 后)**: §1 时点 / §2 Phase C 行 / §3 Batch 2 段 / §8 HEAD SHA / §9 整节重写 Phase C Batch 3 (Task 15) 启动指引.
- **2026-04-21 v5.0 全文 regen (Phase B 10/10 + Phase C 5/5 双封顶里程碑节奏点, 本 commit)**:
  - 顶部声明保留 (live 增量 + Phase 封顶 regen 哲学)
  - §1 时点更新 / HEAD `035cdee2` / Phase C 5/5 完成 / 下一对话目标 Phase D 启动
  - §2 Phase C 行状态 → 完成 / Phase D → 待启动 (下对话第一目标)
  - §3 commit 链追加 Phase C Batch 3 段 3 commits (`035cdee2` + `aea392ff` + `00558997`) + 保留 Batch 1/2 段 + Phase B 段
  - §4 Phase B 完成总览保留 + 新加 §4' Phase C 完成总览节 (5 task SHA 链 + Acceptance 证据 + L1 最严 review 节奏 live precedent)
  - §5 Mode C 状态保留 (Phase C 全程 verify 桶 2/4 无阻塞)
  - §6 D 候选 18 → 19 (加 D88 候选: Plan Opus spec value-density self-audit + anchor literal grep 实证 4 维度, Helper raise 修正版 + 本对话 2 次同模式 fabrication 触发)
  - §7 pending drifts reconcile (清 7.9-7.12 已内化项, 加 7.13-7.15 Phase C Batch 2/3 期登记: phase-c-test-db.md spec §4.4 aspirational naming reconcile / D81 landscape 4 surface / Time Machine restore env gap 2 数据点)
  - §8 全 stack 重新 audit + HEAD `035cdee2` + qr-order-postgres-test Phase C 完成 down 状态 + Time Machine restore 后状态 + `pre-phase-5-demo` branch origin 存在 (本地无 tracking, demo 与 Phase 5 main 隔离)
  - §9 整节重写 Phase D Repository 启动指引 (Task 16 第一个 task / Stage 0 carry-forward Phase B+C 完整 / 关键 grep G-D16.1-4 / 不启动原则 + L1/L2/L3 review 级别 batch 切分启发)
  - §10 本条目 + Phase C 封顶 closure 记录 §9.7
  - 触发事件: Phase C Batch 3 Task 15 (`035cdee2`) feat commit land + 5/5 tasks Phase C 封顶 + 本对话 governance 增量 (2 处 Plan Opus spec 内部不一致 forward-fix + D88 候选修正版 + Time Machine env gap 2 数据点 + Archive #25 third data point + D81 landscape 4 surface 扩展)
  - 同期 Archive §3.5 v5 批追加 #27 (Plan Opus spec 内部不一致同模式 2 数据点) / 总 25 → 26 (#26 D86 语言层自违反 + #27 Plan Opus spec writer anchor literal 凭印象 双数据点合并独立编号) wait, 26 → 27, count update
  - 同期 Digest §6 新增 D88 候选 + §10 v5.0 修订条目 (与 Snapshot v5.0 同节奏点合并产出 Phase D 启动前)
  - **本对话窗口 β 路径**: Snapshot v5.0 + Archive #27 本窗口产出. Digest D88 + Phase D 启动指引 ritual 下窗口 (新 Plan Opus chat instance) 产, 与 Phase D Task 16 启动期合并.

---

*Phase 5 State Snapshot · live 增量维护, 每对话收尾更新, Phase 封顶 regen · 与 Governance Digest + Fabrication Archive 配套*

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

- **最后更新**: 2026-04-21 (Phase C Batch 2 closure — Task 14 feat land + governance v4.4 + plan v5/v6/v7 forward-fixes)
- **最后 commit on main**: `308f7d54` feat(phase-5): Phase C Batch 2 Task 14 — RLS coverage + tenant isolation tests + dual-URL + adminDb TRUNCATE (6/6 tests pass 1.19s)
- **Phase B 状态**: **10/10 完成 ✅**
- **Phase C 状态**: **Batch 1 + Batch 2 完成 (4/5 task: Task 11/12/13/14)**; Batch 3 = Task 15 (module-registry.test.ts, L1 最严单独跑)
- **下一对话目标**: **Phase C Batch 3 (Task 15 — module-registry.test.ts 幽灵权限检测, L1 最严单独 batch)** —— plan Task 15 段完整 (phase-c-test-db.md lines 689-end), 不写新 plan, 做 Stage 0 carry-forward + Task 15 L1 verify work-log + 实施

---

## 2. Phase 进度表

| Phase | 内容 | Plan | 实施 |
|---|---|---|---|
| A | ~~备份~~ SKIPPED(Ian calibration 2026-04-19) | N/A | N/A |
| B | 基础设施(schema + migration + seed + docker + ESLint) | ✅ 完整 | ✅ **10/10 完成** |
| C | 测试 DB | ✅ 完整 | 🟢 **Batch 1 + Batch 2 完成 (4/5 task)**; Batch 3 = Task 15 待跑 |
| D | Repository(11 个语义化 repo) | ✅ 完整 | ⏸️ 未启动 |
| E | 外围域(3 agent) | ✅ 完整 | ⏸️ 未启动 |
| F | Platform Admin | ✅ 完整 | ⏸️ 未启动 |
| G | 核心业务链 + SOP | ✅ 5/5 + SOP | ⏸️ 未启动 |
| H | 集成测试 | 🟡 1/3(Task 43 ✅,44/45 待) | ⏸️ 未启动 |
| I | 清理 | ⏸️ 批 2 待写 | ⏸️ 未启动 |
| J | 部署 | ⏸️ 批 2 待写 | ⏸️ 未启动 |
| K | e2e 验收 | ⏸️ 批 2 待写 | ⏸️ 未启动 |

**Phase 5 整体实施约 ~12-15%**(Phase B 10/10 占 Phase 5 ~15%)。

---

## 3. 最近 commit 链(按时间倒序)

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
| (本 commit) | docs | Phase C Batch 1 收尾(Archive #25 + D84 候选 + Pre-Flight §7 扩展 + Snapshot A 路径切换 + Snapshot 增量) |
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

| SHA | 性质 | 内容 |
|---|---|---|
| `f06f333d` | feat | Task 9a impl(seed.ts + seed-data/store.ts + package.json prisma.seed;3 次规则 8 暂停 resolved) |
| `1187b50f` | plan | Task 9a Patch 6 γ(migration drift) |
| `d9a21d66` | work-log | Task 9a pre-grep fact base |
| `820389a9` | feat | Task 8 impl(tenant-aware.ts + G7-4 helper) |
| `b8ef8fd4` | plan | Task 8 Patch 5(Express 5 types 兼容) |
| `9531f364` | plan | Task 8 β refinement supplement |

### 更早(Phase B Task 4-7 / 启动期)

见 git log(v2 对话 8 commit + v1 对话更早)。本 Snapshot 不展开,可 `git log --oneline | head -30` 回溯。

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

## 5. Mode C 状态(δ 分桶 matrix,live)

**决议**: Ian 在 Phase B Task 2 对话选 δ(分类处理)。Task 9a pre-grep + Task 9b + Task 10 全程 verify 桶 2/4 无阻塞。

| 桶 | 字段数 | 内容 | 状态 |
|---|---|---|---|
| 1 | 16 | MVP 必需字段(Table rename+5 / Store+5 / Order+2 / Coupon+1 / MenuItem+1 / Category+1) | ✅ **RESOLVED** in `75fd9084`(Task 2 impl scope 扩展) |
| 2 | 6 | Floor plan(`x / y / width / height / shape / zone`) | 🔵 **delegated Phase I/J** |
| 3 | 3 | Deprecated(`Table.currentBillId / Table.currentOrderId / Table.paymentMode`) | ⚫ **不补**(Store 级 paymentMode 已够) |
| 4 | 6 | 次要扩展(`Waitlist.estimatedWait/notifiedAt / Printer.address / MenuItem.dietary/isRecommended/quickTags / Category.hideQuickTags`) | 🔵 **delegated Phase H/I** |

---

## 6. D 候选累积清单(Phase H Task 45 升格队列)

**累积 18 项**,按来源分段:

### v1 既有(7 项)

- **D67** 反向 drift 处理(types.ts > JSON)
- **D68** Order snapshot 哲学
- **D69** maxTables 留 Store 级
- **D70** Coupon schema 完整补入
- **D71** Seed-as-SSOT
- **D72** OrderStatus 派生状态前端展示
- **D73** JWT 不向后兼容部署纪律

### v2 新增(4 项)

- **D74** Plan 行数预算 + 实时预警 + **双向校准**(原桶 ×0.8 简单 / ×1.25 复杂 + 新桶 ×1.07 patch spec inline code heredoc)
- **D75** 数据 guard(`[ -s file ]` 后置)(live 应用 10+ task 0 fail)
- **D76** Commit 后强制 push + verify origin SHA(live 应用 10+ task 0 fail,CC memory 已落)
- **D77** Task 4 注释 E 事实修正 + β 决议理由更新

### v3 新增(5 项)

- **D78** Patch spec range mandatory grep-verify terminus(live 应用 2+ 次)
- **D79** Plan-as-code dryrun 前置(新依赖/framework module/type 系统 feature 引入时)
- **D80** @types/express v5 vs express v4 版本 skew
- **D81** Seed hardcode vs source SSOT drift 防御模式(α/β/γ)
- **D82** Schema-write tasks must enforce `prisma generate` step

### Task 9b 对话新增(1 项)

- **D83** Plan 绝对数字基准改用相对约束
  - 原则: plan 内 "Total N tsc errors unchanged / wc -l == N / literal count == N" 类绝对数字硬约束,改用相对约束(touched files 内 0 new errors / ±tol 范围 / `grep -c` live verify)
  - 触发事件: Task 9b Stage 4 发现 plan 声明 tsc baseline = 102,实际 pristine HEAD = 103
  - 与 D74 / D78 同属"期望数量"类治理规则家族

### Phase C Batch 1 对话新增(1 项)

- **D84** Cross-Phase Invariants handoff 第四份文件(候选)
  - 原则: 跨 phase 共享 literal(DB name / role name / container name / port / schema identifier / migration literal)外化到独立 handoff 文件,Opus plan 写作 / CC Stage 0 / Ian review 三方 read-reference,不凭印象
  - 触发事件: Fabrication #25(Task 11 plan `qr_order_test` 与 Phase B migration `qr_order` 跨 phase literal drift)
  - 首批条目: `DB name = qr_order`(migration `20260417000002_rls_and_roles:16` GRANT CONNECT 硬编码,规则 1 不可变)
  - 维护机制: live 增量维护(与 Archive/Digest/Snapshot 三文件对齐,A 路径)
  - 配套 Pre-Flight Checklist 扩展: 任何 plan 内 literal 出现在已有 migration / docker-compose / package.json / seed 其他位置时,必先 grep cross-phase 实证

### Phase C Batch 2 plan patch v5 `ca863caa` 前后新增(2 项)

- **D85** 同 plan 跨 Task 基础假定 consistency check(候选)
  - 原则: 同 plan 跨 Task plan writer 对 infra 身份 / state / assumption 保持一致性
  - 触发事件: Phase C Batch 2 Task 14 L1 review catch Task 11/12 vs Task 14 testDb 身份 assumption drift (Task 11/12 隐含 testDb = postgres superuser vs Task 14 假定 testDb = app_user), `ca863caa` dual-URL forward-fix 修复
  - 与 D79 家族关系: D79 code-level 假设 verify, D85 plan-level assumption consistency, 同 "plan 写作期 sanity check" 家族不同层次
  - 升格时机: Phase H Task 45

- **D86** Spec async-executable 原则(候选)
  - 原则: 系统治理 robustness 不依赖桥梁节点 session 连续性; Plan Opus spec 任何时间点可执行, Stage 0 repo 状态 pre-check 防 temporal drift silent apply
  - 触发事件: Ian 2026-04-21 meta observation (响应 `ca863caa` plan patch v5 spec 产出流程)
  - 具体落地: 所有 CC 执行消息最前必含 Stage 0 pre-check (关键文件 + HEAD SHA anchor + fail-loud drift); Language-layer enforcement (禁 session-relative 指示词, 用日期 / SHA / 具体事件 locate)
  - 首次登记自违反附注: `ca863caa` commit body 含 "本对话 Ian meta observation" session-relative 措辞, Ian 2026-04-21 拦截, 归 Archive #26 (Category 1 子类). `ca863caa` 不 amend (D77), D86 Digest 正式登记 body 应用修正语言.
  - 与家族关系: Archive #14 reader-side stale (D86 producer-side) / D79 code contract (D86 repo state contract) / D84 spatial cross-phase coupling (D86 temporal drift), 三向 orthogonal
  - 升格时机: Phase H Task 45

**全文**: 见 `phase-5-governance-digest.md` §6。

**D74 精细化最新**(Task 9a/9b/10 延伸):

- 原桶: 简单 ×0.8 / 复杂 ×1.25(v2 建立,v3 + Task 9b/10 多数据点验证充分)
- **新桶 1**: Patch spec w/ inline code heredoc **×1.07**(v3 3 数据点 + Task 9b/10 未新增反例)
- **新桶 2**(候选,不足升格): Work-log w/ grep 结果 embed **×1.5-1.8**(v3 1 数据点,待积累)

---

## 7. Pending drifts(本对话未修,转下对话或 Phase H Task 45)

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
- **当前**: Task 10 也未 touch schema.prisma,持续传递

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

- **背景**: Task 10 plan 设计时未考虑现有 `docker-compose.yml`(4-service stack 已 Up 4h,daily dev 使用)
- **差异**:
  - container_name: `qr-order-pg` vs plan `qr-order-postgres`
  - password: hardcoded `qrorder123` vs plan `${POSTGRES_SUPERUSER_PASSWORD:-devonly}` fallback
  - user: `qrorder` vs plan `postgres` superuser 模式
  - sibling services(adminer/server/nginx)plan 未涵盖
- **Task 10 决议**: α.3 保留现状 compose 不动,`.env.example` 按 plan template 写作为 aspirational 文档
- **处理**: Phase H Task 45 reconcile —— 统一 compose naming + creds 策略 + `.env.example` vs 实际 compose env 一致性决定
- **外化锚**: `55fff0da` commit body(explicit drift section)

### 7.8 qr-order-pg 容器内遗留测试数据(legacy schema,Phase 5 前)

- **位置**: `qr-order-pg` PostgreSQL 容器 + `pg_data` volume
- **内容**: `stores` 表 2 行(store-demo-001 示例餐厅 / store-demo-002 火锅世界 / Mar 9-10 创建)+ `store_users` 表 6 行(每 store 3 个用户 admin/staff1/staff2,bcrypt 密码)
- **Schema**: Task 2/3 expansion 前老 schema(`store_users` 用 text `role` 列,非新 Staff+Role FK 模型)
- **Ian confirmed**: 测试残留,无业务价值
- **处理**: Phase H/I/J 清理时一起(`docker compose down postgres + volume rm` + 用 qr-order-pg 跑 Phase 5 schema 的决策时机)
- **外化锚**: Task 10 Stage 8 用新 `postgres-seed-test` 跑验收,qr-order-pg 未 touch

### 7.9 Snapshot §8 HEAD SHA drift(阶段性)

- **位置**: §8 环境状态表 "HEAD == origin/main" 行
- **问题**: 上对话 Snapshot v2 生成时 HEAD 是 `55fff0da`,后续 handoff 同步 commit `10c4eb93` 及 Phase C Batch 1 8 commit 陆续 land。覆盖式哲学下未即时 regen,drift 累积。
- **处理**: A 路径切换后,每对话收尾增量 Edit §8 HEAD SHA(已在本 commit §3.8 同步)。Phase 封顶时 Opus regen §8 其他字段作里程碑
- **外化锚**: Archive #22 + A 路径切换 + 本 commit

### 7.10 postgres-seed-test container 归宿延后(Phase C 期间并存)

- **位置**: `postgres-seed-test:15432`(Task 10 Stage 1 建,Phase B acceptance 证据容器)vs Phase C Task 11 新建 `qr-order-postgres-test:5433`(γ3c tmpfs 测试容器)
- **并存关系**: 不同 port / 不同 volume / 不同 container name,Phase C 期间并存不冲突
- **处理**: Phase C 完成后 Phase I/J 清理 reconcile,决定 `postgres-seed-test` 去留(建议归档为 frozen acceptance 证据,不拆)
- **外化锚**: Task 10 commit body + Phase C Batch 1 启动期 Opus 登记

### 7.11 phase-c-test-db.md prisma-client.ts 路径 mental model drift

- **位置**: plan Task 12 setup.ts heredoc 内 import mental model 假设 `server/src/db/prisma-client.ts`(plan 作者 mental model)
- **实际 repo 位置**: `server/src/repositories/prisma-client.ts`(Stage 0 G4 grep 实证)
- **Phase C blocking**: NOT blocking — plan Task 12 setup.ts 实际 `new PrismaClient(...)` 独立 instance,不 import project 的 prisma-client
- **Phase D blocking**: verify required — Phase D repos 实际 import production client 时必 verify path
- **处理**: Phase D 启动时 Stage 0 显式 confirm import path;Phase H Task 45 reconcile plan 文字
- **外化锚**: Phase C Batch 1 Stage 0 G4 grep

### 7.12 Task 11 f538941b docker-compose.test.yml / package.json stale literal(已 forward-fix)

- **位置**: Task 11 commit `f538941b`(docker-compose.test.yml line 9 POSTGRES_DB + line 16 healthcheck + server/package.json test:integration 行)
- **内容**: stale `qr_order_test` literal(plan 自造,与 Phase B migration `qr_order` 跨 phase drift,#25)
- **处理**: 已由 fix commit `0b070a92` forward-fix(D77 不 amend 已 push commit,D77 纪律 applied)
- **HEAD 当前状态**: 正确 literal `qr_order`,fix commit 已 land
- **spec reconcile**: Phase H Task 45 统一 Task 11 commit body note / 或纳入 D84 Cross-Phase Invariants 文件作 invariant example
- **外化锚**: `0b070a92` commit body + #25 Archive + D84 候选

---

## 8. 环境状态(全 stack,响应 #22)

### Docker 容器全量

| 容器 | image | Port 映射 | 状态 | 用途 |
|---|---|---|---|---|
| `qr-order-pg` | postgres:16-alpine | 5432:5432 | Up 4h+ | Daily dev stack 主 postgres(legacy schema,有测试残留数据 §7.8) |
| `qr-order-server` | local build | 3001:3001 | Up 4h+ | Daily dev server(JsonStore 模式),Phase B Step 9 验收使用 |
| `qr-order-nginx` | nginx | 80:80 | Up 4h+ | Daily dev reverse proxy |
| `qr-order-adminer` | adminer:latest | 8081:8080 | Up 4h+ | Daily dev DB GUI |
| `postgres-seed-test` | postgres:16-alpine | 15432:5432 | Up(Task 10 Stage 1 重建) | **Phase B acceptance 证据** —— 全 Phase B schema(4 migration)+ 完整 seed |

**关键**: qr-order-pg 和 postgres-seed-test 并存,数据彼此隔离(不同 volume + 不同 port)。Phase C 可 consume 任一容器或另起新容器 —— 视 plan 要求定。

### 文件状态

| 项 | 状态 | 备注 |
|---|---|---|
| `docker-compose.yml` | 保留现状未改(Task 10 α.3) | 4-service 定义(postgres/server/adminer/nginx) |
| `.env.example` | Task 10 新建(aspirational) | Phase J Task 48 ALTER ROLE 时实际生效 |
| `server/eslint.config.mjs` | Task 10 新建(ESLint 9 flat) | `@typescript-eslint/no-floating-promises = error` |
| `server/.eslintrc.*` | 不存在 | (Task 10 Branch C 选 flat config) |
| `server/package.json` | Task 10 加 ESLint deps | eslint@^9 + @typescript-eslint/parser@^8 + eslint-plugin@^8 |
| `server/prisma/seed.ts.pre-phase5` | untracked | Phase I `_archive/` 归档 |
| Prisma Client types | 已最新 | Task 9a Stage 4c regenerate,post-schema |
| tsc baseline | 103 errors(pristine HEAD,v3/v4 drift 修正) | Phase B Task 每次 verify "touched files 内 0 new errors" |
| ESLint `no-floating-promises` baseline | 0 errors | Task 10 Stage 6 验证 |
| HEAD == origin/main | ✅ `308f7d54` | Phase C Batch 2 closure — Task 14 feat commit (RLS coverage + tenant isolation + dual-URL + adminDb TRUNCATE, 6/6 tests runtime pass). Snapshot §8 HEAD SHA 每对话收尾增量 Edit 同步 (§7.9 pattern). |

### Shell 环境状态

- **DATABASE_URL**: 未持久 export 到 Ian 的 shell(Bash 工具 session 独立),下对话需 re-export
- **Docker Desktop**: Running
- **@types/bcryptjs**: 不需要(bcryptjs v3+ bundled types,Task 9a Stage 0.3 check 已删除)

---

## 9. 下一对话第一件事 (Phase C Batch 3 启动 — Task 15 only)

### 9.1 Batch 3 scope

**Task 15 only** (L1 最严单独 batch — Snapshot §9.1 Batch 2 同原则延续). Task 16/17 不在 Phase C scope (Phase C = Task 11-15, Batch 4 无).

Task 15 产出:
- `server/src/__tests__/integration/module-registry.test.ts` (幽灵权限检测: 验证 shared/modules.ts 单一注册中心 + role × module × action 组合无 orphan / no ghost)

**L1 最严理由**: 幽灵权限 = 某 role 有某 module 某 action 权限但实际代码无对应 handler / 某 handler 存在但无 role 声明 → silent privilege gap. L1 review 逐字段对齐 shared/modules.ts registry + 实际 router / handler.

### 9.2 启动 ritual

1. **读** (按顺序):
   - 本 Snapshot (live 增量, HEAD `308f7d54`)
   - `phase-5-fabrication-archive.md` (25 条, 最新 #26 D86 语言层自违反)
   - `phase-5-governance-digest.md` (含 D85 + D86 + Pre-Flight §7 Language-layer self-check 条款)
   - `docs/superpowers/plans/2026-04-17-phase5-postgres-migration/phase-c-test-db.md` Task 15 段 (lines 689-end, v5/v6/v7 baseline)
   - `docs/superpowers/work-logs/2026-04-21-phase-c-batch-2-task-14-l1-verify.md` (Batch 2 live 参考)
   - Phase C Batch 2 closure commit `308f7d54` body (6/6 tests runtime pass anchor)

2. **Grep verify** (Stage 0 carry-forward ritual):

       git log -10 --format="%h %s"

   确认 commit 链含: `308f7d54` (Batch 2 Task 14 feat) / `f49139a0` (v7) / `0a4696eb` (v6) / `efa3d2e9` (work-log) / `0da7456a` (governance v4.4) / `ca863caa` (v5) / Batch 1 8 commits.

3. **环境 verify**:

       docker ps --format "{{.Names}}\t{{.Status}}"

   预期 5 dev 容器 Up. `qr-order-postgres-test` 应为下 (Batch 2 Step 8 清场 `pnpm test:db:down`). Batch 3 Task 15 执行期 `pnpm test:db:up` 重起.

### 9.3 Stage 0 carry-forward (Batch 1 + Batch 2 已 verify, Batch 3 直接信任)

Batch 1 carry-forward (原 §9.3 Batch 1 清单延用) + Batch 2 新增 carry-forward:

**Batch 2 新增 verified fact base**:
- **Dual-URL 测试身份模型** live (`ca863caa` + `f49139a0` + `308f7d54` land):
  - `TEST_ADMIN_DATABASE_URL` = postgres superuser (global-setup migrate + ALTER ROLE + setup.ts adminDb beforeEach TRUNCATE)
  - `TEST_DATABASE_URL` = app_user runtime (testDb RLS subject)
  - `DATABASE_URL` = postgres double-guard
- **setup.ts adminDb pattern** live: `beforeEach` 用 adminDb TRUNCATE (app_user 无 TRUNCATE privilege, least-privilege 原则不动 migration)
- **global-setup.ts ALTER ROLE app_user password 机制** live (WHATWG URL parser, 与 Prisma connection-string 同 decoding 合约)
- **Task 14 2 test files 存在**: `rls-coverage.test.ts` (51 lines) + `tenant-isolation.test.ts` (77 lines, tableName v6 baseline)
- **Phase B Order schema tableName required** (`75fd9084` Mode C δ 桶 1 + Task 14 plan v6 forward-fix 确认) — Task 15 若涉 Order create 需加 tableName
- **app_user privilege live**: SELECT/INSERT/UPDATE/DELETE on public tables, NO TRUNCATE, NOT BYPASSRLS, NOT SUPERUSER
- **platform_admin / system_worker**: BYPASSRLS via attribute (非 privilege), SET LOCAL ROLE 切换生效
- **testDb connect as app_user identity** (PG 16 default postgres = SUPERUSER BYPASSRLS, 不能用)
- **L1 5 维度 Task 14 all Pass runtime verify** (guardian 功能完整 — 未来 RLS 相关 migration drift / prisma-client.ts set_config 语义变更由 Task 14 CI guard 兜住)

**Batch 3 Stage 0 只需做 Task 15 新增 grep** (详 9.5).

### 9.4 第一动作 — Task 15 L1 verify work-log

Plan Opus 启动后第一个产出 **不是** CC 执行消息, 而是 **L1 verify work-log commit** (同 Batch 2 efa3d2e9 pattern, scope 窄 focused Task 15).

work-log 建议路径: `docs/superpowers/work-logs/2026-04-22-phase-c-batch-3-task-15-l1-verify.md` (日期按实际启动日).

work-log 内容 5 维度 (对应 9.5 grep 结果 + Task 15 plan heredoc 逐字段对比):
1. shared/modules.ts 单一注册中心字段 literal 对齐
2. role × module × action 组合覆盖矩阵完整性
3. 实际 router / handler 位置 (production code 对齐 registry)
4. 幽灵权限检测 assertion 逻辑 (orphan role / orphan module / orphan action)
5. Task 14 carry-forward infra (testDb + adminDb + withTestTenant / withTestPlatform 是否 Task 15 消费)

work-log commit land 后 Ian 明批 "Task 15 GO" → 起 CC 执行消息.

### 9.5 关键 grep 清单 (Batch 3 新增, L1 verify 依据)

**G-T15.1 — shared/modules.ts 单一注册中心 literal**:

    grep -nE "export|role|module|action" server/src/shared/modules.ts 2>/dev/null || \
    find server -name "modules.ts" -path "*/shared/*" -exec grep -nE "export|role|module|action" {} +

Fact base: 实际 module 列表 + role 列表 + action 列表 (与 Task 15 plan heredoc assertion 对齐).

**G-T15.2 — production router / handler role 声明位置**:

    grep -rnE "requireRole|@Roles|@RequireAction|authzCheck" server/src 2>&1 | head -30

Fact base: 实际 production code 声明哪些 role-action 组合, Task 15 幽灵检测对比基准.

**G-T15.3 — Task 15 plan heredoc 完整 view**:

    sed -n "689,<end>p" docs/superpowers/plans/2026-04-17-phase5-postgres-migration/phase-c-test-db.md
    # <end> 由 grep "^### Task\|^---" 定位 Task 15 段终点

Fact base: plan heredoc 完整内容, 产出 L1 work-log 5 维度 verdict 依据.

**G-T15.4 — Cross-phase literal coupling (D84 激活)**:

    grep -nE "shared/modules|ModuleLicense|module_license|role_permission" \
      docs/superpowers/plans/2026-04-17-phase5-postgres-migration/phase-c-test-db.md | head -20

Fact base: plan Task 15 段 literal 对齐 Phase B migration + schema.prisma + seed-data.

### 9.6 规则应用提醒 (Batch 2 实施经验 informed)

- **Opus Spec Pre-Flight Checklist** (Digest §7, 含 Language-layer async-executable self-check 条款, D86 生效 baseline `0da7456a`)
- **D74 双向校准**: 预估行数分桶 (Batch 2 累积 3 sub-bucket 候选: 治理文档纯追加 ×0.7 / 治理短段追加 / Write replace w/ structural preserve 偏差 −76% deletions)
- **D83 定性约束**: verify 用 "expected 结构出现 / unexpected 未出现", 不用 ±N%
- **D85 infra identity 变更 dryrun 全 lifecycle 链路** (Batch 2 live 3 drift 数据点): plan writer 改 infra 身份 (dual-URL / role / privilege) 时 plan 必 exercise beforeEach / fixture / afterAll 全链路
- **D86 async-executable + language-layer self-check**: 所有治理文档 / commit message / CC 执行消息 / work-log 禁 session-relative 指示词 (引号内清单 legitimate 豁免); Stage 0 repo 状态 pre-check 模板
- **#14/#22 防御**: Snapshot §8 每对话收尾增量 Edit (A 路径)
- **#20 完整 dump**: Stage 0 grep schema / migration 用 `cat` 或 `grep -A N` 完整 dump
- **#25 subclass path drift** 2 数据点: repo 文件路径 Opus 写 spec 前 grep verify
- **#26 Language-layer self-check**: spec 产出前全文扫 session-relative 指示词

### 9.7 不启动原则

新 Plan Opus 启动后:
1. 读完 ritual (9.2) → CoT 输出 Batch 3 scope 理解 + Batch 1+2 carry-forward ack
2. 做 Stage 0 Task 15 新增 grep (9.5) → 产出 L1 verify work-log (9.4)
3. work-log commit land + Ian 明批 "Task 15 GO" → 起 CC 执行消息

**不直接起 CC 执行消息**. work-log → Ian review → CC 三步走, 对应 L1 最严级别.

### 9.8 Phase C Batch 2 closure 记录 (供 Plan Opus 理解 Batch 2 协作节奏)

Batch 2 = 40+ 对话轮 + 6 commits + 3 规则 8 暂停全 resolved + 0 critical fabrication 逃逸:

- 规则 8 暂停 #1: post-Edit D86 self-check 命中 2 (line 230 legitimate self-reference 保留 / line 266 实质违反 "上轮输出" self-fix)
- 规则 8 暂停 #2: Step 6 tsc 3 new errors on tenant-isolation.test.ts 缺 tableName (D85 drift #2, plan patch v6 forward-fix)
- 规则 8 暂停 #3: Step 7 test run 6/6 fail 'permission denied for table stores' (D85 drift #3, plan patch v7 adminDb pattern forward-fix)

Fabrication 拦截: Ian 一手 2 次 (Flag 1 URL encoding regex / D86 语言层自违反 Archive #26) + CC grep/tsc 自审 3 次 (规则 8 暂停).

**协作节奏观察**: L1 最严 review 价值验证 — Task 14 实施中途暴露 3 个 D85 家族 drift, 全部 infra layer silent gap, 若无 L1 review catch 则 tests 绿但防御失效 (silent security hole). Batch 2 为未来 L1 最严 task (Task 15 / Phase H Task 43-45 / Phase G SOP) 树立 live precedent.

---

## 10. 当前修订轨迹

- **2026-04-20 首版**: Task 8 impl + Task 9a 完整。
- **2026-04-21 v2 regen**(Phase B Task 10 完成后):
  - §1 时点更新 2026-04-21 / commit `55fff0da` / Phase B 10/10
  - §2 Phase B 实施状态 → 完成
  - §3 commit 链更新(Task 10 / 9b 对话 + 更早批次)
  - §4 新节 Phase B 完成总览(全 10 task acceptance 证据)
  - §6 D 候选 17 项(加 D83)
  - §7 pending drifts 加 §7.6(Task 9b plan heredoc drift / #20)+ §7.7(Task 10 compose drift)+ §7.8(qr-order-pg legacy data)
  - §8 环境状态全 stack 覆盖(响应 #22)—— 从单容器表改为全容器 table
  - §9 下一步改为 Phase C 启动指引
- **2026-04-21 A 路径切换 + Phase C Batch 1 收尾增量 Edit**(本 commit):
  - 顶部声明从"覆盖式,每对话全文重写"改为"live 增量维护,Phase 封顶 regen"
  - 理由: regen 过程本身是 fabrication 高发时点(#24 原型教训),增量式对齐 Archive/Digest 三文件机制一致性,Phase 封顶 regen 作里程碑节奏点。覆盖式哲学实际已 drift(§7 pending drifts 一直累积,从未 regen 清过)—— A 路径是承认现实,不是改变实践
  - §1 commit 更新 HEAD SHA / Phase C 状态 Batch 1 完成(3/5 task)
  - §2 Phase C 行状态 Batch 1 完成
  - §3 commit 链追加 Phase C Batch 1 对话 8 commit
  - §6 D 候选 17 → 18(加 D84)
  - §7 pending drifts §7.9/7.10/7.11/7.12 追加(Batch 1 启动期未 land 的 3 条 + 本批新 7.12)
  - §8 HEAD SHA 更新
  - §9 完整替换为 Phase C Batch 2 启动指引(含 D84 激活 + #25 防御 + L1 维度 5 项)
- **2026-04-21 D2 下对话启动指引补丁**(本对话收尾,不含 Batch 2 内容):
  - §8 HEAD SHA verify `43ff7850`(Batch 1 closure)
  - §9 整节重写:"下一对话目标" 从泛化 "Phase C Batch 2 启动" 具体化为:
    - §9.1 Batch 2 scope = Task 14 only(Task 15 不纳入,L1 最严单独跑)
    - §9.2 启动 ritual(读取顺序 / grep verify / 环境 verify)
    - §9.3 Stage 0 carry-forward 清单(Batch 1 已验证,Batch 2 直接信任)
    - §9.4 第一动作 = L1 verify work-log commit(非 CC 执行消息)
    - §9.5 关键 grep 清单 G-T14.1-6(含 Cross-phase literal coupling #25/D84 激活)
    - §9.6-9.7 规则应用 + 不启动原则
    - §9.8 字符漂 sanity check 注记(低风险,新 Opus 自查)
  - 目的: 新 Plan Opus 启动降 ritual overhead + L1 最严级别的三步走(work-log → Ian review → CC)
  - Path drift 教训(本对话 spec 用 `docs/superpowers/phase5/`,实际 `docs/superpowers/archive/`)内化:Phase H Task 45 reconcile 时定归属(Pre-Flight Checklist 新条款 vs D84 扩展 vs 合并),本对话不落档
- **2026-04-21 本对话末次增量更新**(Batch 1 收尾 + D2 补丁后教训外化,docs 专项 commit):
  - Archive #25 body 追加 path drift subclass 注解(行为层同构 #25 主 body,升格层硬 invariant vs convention 区分;归类同 #24 作为 #23 subclass,**Archive count 仍 24 不变**)
  - Digest §6 D84 body 加 definition note(收录范围严格限 硬 invariant;convention 类 drift 归入 Pre-Flight Checklist 新条款,Phase H Task 45 reconcile)
  - Digest §7 Pre-Flight Checklist 应用方式段加 framework major version bump field-level fate note(vitest 4 singleFork 实例,教训内化不新编号)
  - §10 本条目
  - 目的: 本对话 50+ turn 产生的 3 项教训外化到三件套,新 Plan Opus 启动 Batch 2 读到完整治理状态,避免 #14 stale handoff
- **2026-04-21 v4.4 批 (Phase C Batch 2 plan patch v5 `ca863caa` 后续治理更新)**:
  - §6 Phase C Batch 2 段追加 D85 + D86 (D 候选 18 → 20)
  - §10 本条目
  - 同期 Digest §6 新增 D85 + D86 body 完整条目 / §7 追加 Language-layer self-check 条款 / §10 追加 v4.4 批修订 / §8 Cat 1 成员 9 → 10
  - 同期 Archive §1 count 24 → 25 / §2 Cat 1 成员 9 → 10 含 #26 "同对话规则循环"子类 / §3.4 末尾追加 #26 (D86 语言层自违反) / §4 Ian 7 → 8 / §5 mapping 追加 #26 / §7 追加 v4.4 批修订
  - 触发事件: Ian 2026-04-21 meta observation (`ca863caa` commit body 语言层自违反拦截) + Phase C Batch 2 Task 14 L1 review catch (`ca863caa` dual-URL 修复) → D85 + D86 候选登记
  - `ca863caa` 已 push 不 amend (D77), D86 Digest 登记 body 应用修正语言作 live demo
- **2026-04-21 Task 14 L1 verify work-log 产出 (`0da7456a` 后 work-log commit)**:
  - 新建 `docs/superpowers/work-logs/2026-04-21-phase-c-batch-2-task-14-l1-verify.md`
  - 内容: Round 1+2 grep fact base 汇总 + L1 5 维度逐条 verdict 表 + γ 方案事实依据 + 治理层事件登记回顾 (D85 / D86 / #26 / #25 subclass 第 2 数据点 / D74 桶 refinement 候选 / A.1 CC Edit 全角逗号 drift 观察) + Task 14 CC 执行消息 scope 前置声明 (D86 Stage 0 pre-check anchor: `ca863caa` + `0da7456a`)
  - L1 maximum strictness verdict: 5 维度 all Pass (`ca863caa` post-state), 0 silent security hole, 推荐 Ian 明批 "Task 14 GO"
  - Snapshot §9.4 三步走 第二步 完成
- **2026-04-21 v4.5 批 (Phase C Batch 2 Task 14 closure, `308f7d54` feat commit 后 Snapshot live 增量)**:
  - §1 时点 / commit SHA / Phase C 状态 / 下一对话目标 更新 (Batch 2 完成, Batch 3 = Task 15 启动)
  - §2 Phase C 行 Batch 2 完成追加
  - §3 追加 Phase C Batch 2 对话段 6 commits 完整表 (放 Batch 1 对话段之前, 时间倒序)
  - §8 HEAD SHA `ca863caa` → `308f7d54` (Batch 2 closure)
  - §9 整节重写为 Phase C Batch 3 (Task 15) 启动指引:
    - §9.1 Batch 3 scope = Task 15 only (L1 最严单独跑)
    - §9.2 启动 ritual 读取顺序 6 件
    - §9.3 Stage 0 carry-forward Batch 1 + Batch 2 累积 fact base (dual-URL / adminDb pattern / Task 14 infra live)
    - §9.4 第一动作 = L1 verify work-log (Batch 2 efa3d2e9 pattern)
    - §9.5 关键 grep 清单 G-T15.1-4 (含 shared/modules.ts registry + production handler + cross-phase literal)
    - §9.6 规则应用提醒 (含 D85 + D86 live 经验)
    - §9.7 不启动原则 三步走 (work-log → Ian review → CC)
    - §9.8 Phase C Batch 2 closure 记录 (6 commits + 3 规则 8 暂停 resolved + fabrication 拦截统计 + L1 最严 review 价值观察)
  - §10 本条目
  - 触发事件: Phase C Batch 2 Task 14 (RLS coverage + tenant isolation) feat commit `308f7d54` land + 6/6 tests runtime pass + 3 D85 家族 drift 全 forward-fix 收敛

---

*Phase 5 State Snapshot · live 增量维护,每对话收尾更新,Phase 封顶 regen · 与 Governance Digest + Fabrication Archive 配套*

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

- **最后更新**: 2026-04-21(Phase C Batch 1 Task 13 完成 + 本 commit 收尾)
- **最后 commit on main**: Phase C Batch 1 closure commit(Archive #25 + D84 + A 路径切换 + Snapshot 增量;见 `git log -1` 取 SHA)
- **Phase B 状态**: **10/10 完成 ✅**
- **Phase C 状态**: **Batch 1 完成 (3/5 task: Task 11/12/13)**
- **下一对话目标**: **Phase C Batch 2(Task 14 — rls-coverage.test.ts + tenant-isolation.test.ts,L1 最严 RLS / A2 set_config strict / WITH CHECK reversal 三重防御验证)** —— plan Task 14 段完整,不写新 plan,做 Stage 0 carry-forward + 实施

---

## 2. Phase 进度表

| Phase | 内容 | Plan | 实施 |
|---|---|---|---|
| A | ~~备份~~ SKIPPED(Ian calibration 2026-04-19) | N/A | N/A |
| B | 基础设施(schema + migration + seed + docker + ESLint) | ✅ 完整 | ✅ **10/10 完成** |
| C | 测试 DB | ✅ 完整 | 🟢 **Batch 1 完成 (3/5 task)** |
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
| HEAD == origin/main | ✅ Phase C Batch 1 closure commit | A 路径切换后首次增量 Edit;具体 SHA 见 `git log -1` |

### Shell 环境状态

- **DATABASE_URL**: 未持久 export 到 Ian 的 shell(Bash 工具 session 独立),下对话需 re-export
- **Docker Desktop**: Running
- **@types/bcryptjs**: 不需要(bcryptjs v3+ bundled types,Task 9a Stage 0.3 check 已删除)

---

## 9. 下一对话第一件事(Phase C Batch 2 启动)

### 9.1 Phase C Batch 2 scope

Batch 2 = **Task 14**(`integration/rls-coverage.test.ts` + `integration/tenant-isolation.test.ts`,L1 **最严** review —— RLS policy 全表覆盖 + A2 set_config strict mode 防御 + WITH CHECK reversal INSERT 拒绝 三重防御验证)

**启动前置**:
- HEAD 对齐 Phase C Batch 1 closure commit(本 commit)
- Task 11/12/13 已 land(`f538941b` / `a55da4ae` / `57894f8f`)
- Task 13 fixtures.ts 作基础(seedStoreWithMenu 供 tenant A/B cross-store 测试)
- fix commit `0b070a92` DB name align 已 land
- docs patch v2/v3/v4 plan 修订全 land(`e13f7f37` / `ffcc7cdc` / `61f8964e`)

**不重写 plan**: phase-c-test-db.md Task 14 段 plan 完整,Batch 2 做:
- Stage 0 carry-forward verify(Batch 1 已验:schema / migration literal / prisma-client GUC / vitest 4 syntax / DB name align)
- Task 14 plan heredoc verify(Opus L1 针对 rls-coverage.test.ts + tenant-isolation.test.ts 的每 assertion 对 schema / policy / RLS 机制的字面量对齐)
- 实施

**L1 review 维度(Task 14 特别强)**:
- RLS policy 表达式字面量(`store_id::text = current_setting('app.current_store_id')::text`)
- A2 set_config strict mode 验证(`testDb.order.findMany()` without tenant context 必抛 unrecognized configuration 或等价)
- WITH CHECK 反向 INSERT 拒绝(tenant A context 内 insert storeId=B 必 reject)
- pg_policies 元查询(`policyname = 'tenant_isolation'` 字面量对齐 Task 4 migration)
- platform_admin BYPASSRLS role 命名(对齐 Task 4 migration)

### 9.2 启动 ritual

1. **读**: 本 Snapshot + Governance Digest + Fabrication Archive + `phase-c-test-db.md` Task 14 段(完整)+ Batch 1 对话 handoff(CC 上轮汇报 + 本 commit)
2. **Grep verify**: `git log -10 --format="%h %s"` 确认 commit 链含 本 closure / `57894f8f` / `0b070a92` / `61f8964e` / `a55da4ae` / `f538941b`
3. **环境 verify**: `docker ps` 对齐 §8 全 stack(`qr-order-pg` / `qr-order-server` / `qr-order-nginx` / `qr-order-adminer` / `postgres-seed-test` 5 容器 Up;`qr-order-postgres-test` Batch 1 收尾已 down,Batch 2 启动时重起)
4. **L1 维度**: Task 14 L1 最严,按 9.1 列的 5 维度逐项 verify plan heredoc
5. **Cross-phase literal grep**(D84 激活,响应 #25): Task 14 plan 内任何 RLS policy literal / role literal / GUC literal,grep 对齐 Phase B migrations 实际 literal

### 9.3 规则应用提醒(Phase C Batch 1 实施经验 informed)

- **Opus Spec Pre-Flight Checklist**(Digest §7): 所有"期望/应该/不存在/成对 / Cross-phase literal coupling"断言需 grep fact base(Cross-phase 第 5 行 Batch 1 新增,响应 #25)
- **D74 双向校准**: 预估行数主动分桶
- **D82 候选**: Phase C 不 touch schema,无 prisma generate 需求
- **D83 定性约束**: verify 用"expected 结构出现 / unexpected 未出现",不用 ±N%
- **#14/#22 防御**: Snapshot §8 每对话收尾增量 Edit(A 路径)
- **#20 防御**: Stage 0 grep schema / migration 用 `grep -A N` 完整 dump,不用 narrow pattern
- **#21 防御**: reasoning 出现"不大惊小怪 / shorthand" → 立即 suspect
- **#23/#24 防御**: 本对话登记或 handoff 引用既有规则,CoT 扫一遍主动应用
- **#25 防御 + D84 候选激活**: Task 14 plan 内 cross-phase literal(RLS policy / role name / GUC)必 grep Phase B migration 对齐

### 9.4 不启动原则

不直接实施 Phase C Task 14。先 L1 verify + Ian 明批 "GO"。

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

---

*Phase 5 State Snapshot · live 增量维护,每对话收尾更新,Phase 封顶 regen · 与 Governance Digest + Fabrication Archive 配套*

# Phase C Batch 2 Task 14 L1 verify work-log

**日期**: 2026-04-21
**Phase**: 5 — Postgres migration
**Phase C Batch**: 2 (Task 14 only, Task 15 后续单独跑)
**Task**: 14 — `rls-coverage.test.ts` + `tenant-isolation.test.ts` 集成测试
**Review 级别**: L1 最严 (项目内建制术语, 见 Governance Digest §4.1)

**锚 commits**:
- `d67da999` — Batch 1 末次治理教训外化 (path drift subclass + D84 definition + vitest 4 field-level fate)
- `ca863caa` — Phase C Batch 2 plan patch v5: dual-URL model for L1 最严 RLS (Task 14 infra 对齐修复)
- `0da7456a` — Governance v4.4: D85 + D86 登记 + Archive #26 追加 (treatment after `ca863caa`)

**产出对象**: 下一次 Plan Opus 读本 work-log 后直接产 Task 14 CC 执行消息 spec.

---

## 1. Review Scope

Task 14 plan heredoc (phase-c-test-db.md lines 500-686, `ca863caa` baseline 不改 Task 14 heredoc 段) 产出两 test file:

- `server/src/__tests__/integration/rls-coverage.test.ts` (2 tests — RLS enabled + policy 覆盖 / policies 成对 USING+WITH CHECK)
- `server/src/__tests__/integration/tenant-isolation.test.ts` (4 tests — 裸查抛错 / 裸 insert 抛错 / 跨租户 SELECT 隔离 / WITH CHECK INSERT mismatch 拒绝)

L1 最严 5 维度 (Phase 5 State Snapshot §9.4 明文):

1. RLS policy 表达式 literal 对齐
2. A2 set_config strict mode 验证机制
3. WITH CHECK reversal INSERT 拒绝路径
4. `pg_policies` / `pg_tables` 元查询 literal 对齐
5. `platform_admin` BYPASSRLS role 命名对齐 + testDb 身份 RLS 真实 apply

---

## 2. Round 1+2 Grep Fact Base 汇总

### 2.1 Round 1 Stage 0 — G-T14.1+4+5 合并: migration.sql 完整 dump (#20)

**文件**: `server/prisma/migrations/20260417000002_rls_and_roles/migration.sql` (70 lines, Phase B Task 4 `2effedb5` + refinement)

**核心事实**:

- **Role 三套 (CREATE ROLE + BYPASSRLS 语义)**:
  - `app_user LOGIN PASSWORD 'placeholder_set_by_env'` (非 BYPASSRLS, RLS subject 运行时身份)
  - `platform_admin LOGIN PASSWORD 'placeholder_set_by_env' BYPASSRLS` (跨租户 platform 动作)
  - `system_worker LOGIN PASSWORD 'placeholder_set_by_env' BYPASSRLS` (后台 job)

- **GRANT 链**:
  - `GRANT platform_admin TO app_user` — role membership, INHERIT true 默认继承 privileges 但不继承 attributes (SUPERUSER / BYPASSRLS 不继承), attribute 切换需 `SET LOCAL ROLE platform_admin` 显式
  - `GRANT CONNECT ON DATABASE qr_order TO app_user, platform_admin, system_worker` — DB name `qr_order` 硬编码 (D84 Cross-Phase Invariant 首批条目, 规则 1 增量 migration 铁律不可变)
  - `GRANT USAGE ON SCHEMA public` + `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public` + `GRANT USAGE ON ALL SEQUENCES IN SCHEMA public` — 三角色同 grant
  - `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ... TO app_user, platform_admin, system_worker` — future table auto-grant, Phase H/I incremental schema 无需 re-GRANT

- **RLS policy 动态 SQL** (DO $$ 块 FOR LOOP over `information_schema.columns WHERE column_name = 'store_id'`):

      ALTER TABLE %I ENABLE ROW LEVEL SECURITY
      CREATE POLICY tenant_isolation ON %I
        USING (store_id::text = current_setting('app.current_store_id')::text)
        WITH CHECK (store_id::text = current_setting('app.current_store_id')::text)

  - Policy 命名: `tenant_isolation` (Phase B 统一 convention)
  - USING 和 WITH CHECK 表达式 **完全对称** (β 决议 `2effedb5` / Phase H Task 45 D77 reconcile queue)
  - 双侧 `::text` cast (β 决议 — `store_id` Prisma schema `String @map("store_id")` 即 PG TEXT, `current_setting` 返回 TEXT, 显式 cast 表达类型对齐意图)
  - `current_setting('app.current_store_id')` **1-arg form** — PG strict mode: 若 GUC 未设 → 抛 `unrecognized configuration parameter`. 2-arg form `current_setting(name, missing_ok=true)` 会返回 NULL, 本 migration 刻意避免 (A2 strict mode 防御核心)

- **platform_audit_log 特例**: 使用 `target_store_id` 列名, 动态 SQL FOR LOOP 的 `column_name = 'store_id'` filter 自动跳过. RLS 刻意不 apply — platform-scope audit 跨租户 by design, `platform_admin` BYPASSRLS 读取 (DP-PF-4 决议 A).

### 2.2 Round 1 Stage 0 — G-T14.2: prisma-client.ts A2 set_config 实现

**文件**: `server/src/repositories/prisma-client.ts` (plan §7.11 mental model drift 已登记, 实际路径 `repositories/` 非 `db/`)

**核心事实**:

- `withTenantContext(storeId, fn)` 实现 (line 61-68):
  - `testDb.$transaction` 包裹
  - 首行 `await tx.$executeRaw\`SELECT set_config('app.current_store_id', ${storeId}, true)\``
  - `is_local=true` 即 PG `SET LOCAL` 语义, tx commit/rollback 时 reset
  - 对齐 RLS policy `current_setting('app.current_store_id')::text` literal (GUC 变量名一致)

- `withPlatformContext(fn)` 实现 (line 81-84):
  - tx 包裹 + `await tx.$executeRaw\`SET LOCAL ROLE platform_admin\``
  - `SET LOCAL ROLE` tx commit/rollback 时 reset, 安全 for connection pool reuse

- `withTenantContextAndHooks(storeId, fn, hooks)` (line 125-150 附近) — Phase D Task 8 G7-4 helper, 基于 `withTenantContext` 叠加 afterCommit hook, Task 14 不直接消费

- Comment 7 明文 A2 strict mode 预期错误 literal: `"unrecognized configuration parameter app.current_store_id" because RLS policy runs first`

### 2.3 Round 1 Stage 0 — G-T14.3: plan pg_* column literal

**目标**: 验证 `phase-c-test-db.md` Task 14 heredoc 内 pg_catalog / information_schema 元查询 column 名对齐 PG 16 真实 schema.

**核心事实**: 命中 column 名全部 PG 16 真实 column, 0 fabrication.

- `pg_class.relrowsecurity` ✓ (PG 16 真 column, boolean, per-table RLS enabled flag)
- `pg_policies.policyname` ✓ (PG 16 真 column)
- `pg_policies.tablename` ✓
- `pg_policies.schemaname` ✓
- `pg_policies.qual` ✓ (USING 表达式)
- `pg_policies.with_check` ✓ (WITH CHECK 表达式)
- `information_schema.columns.column_name` + `table_schema` + `table_name` ✓ (ISO SQL standard)
- `pg_tables.schemaname` + `tablename` ✓

### 2.4 Round 1 Stage 0 — G-T14.6: cross-phase literal coupling (D84 激活)

**核心事实**: plan Task 14 heredoc 内 cross-phase literal 全部对齐 Phase B migration + prisma-client.ts + docker-compose.test.yml:

- `qr_order` (DB name) — Phase B migration line 16 GRANT CONNECT 硬编码 + docker-compose.test.yml `POSTGRES_DB: qr_order` + package.json 三 URL (`ca863caa` post-state)
- `app_user` — Phase B migration CREATE ROLE + `ca863caa` package.json `TEST_DATABASE_URL` 身份 + Task 14 plan 假定
- `platform_admin` — Phase B migration CREATE ROLE BYPASSRLS + prisma-client.ts `withPlatformContext` + Task 14 plan heredoc `SET LOCAL ROLE platform_admin`
- `system_worker` — Phase B migration CREATE ROLE BYPASSRLS (Task 14 不消费)
- `app.current_store_id` (GUC) — Phase B migration policy literal + prisma-client.ts set_config literal + Task 14 plan 测试 error regex `/app\.current_store_id|unrecognized configuration/i`
- `tenant_isolation` (policy name) — Phase B migration CREATE POLICY literal + Task 14 plan heredoc `WHERE policyname = 'tenant_isolation'` meta query

### 2.5 Round 2 Stage 0 — R2.1: setup.ts cat (64 lines, `a55da4ae` land)

**文件**: `server/src/__tests__/integration/setup.ts`

**核心事实**:

- `const testDbUrl = process.env.TEST_DATABASE_URL` — 自动读 env (`ca863caa` dual-URL 改 TEST_DATABASE_URL = app_user 后 setup.ts **0 动** 自动 pick 新身份)
- `testDb: PrismaClient = testDbUrl ? new PrismaClient({ datasources: { db: { url: testDbUrl } } }) : null as unknown as PrismaClient` — null-guard defense-in-depth (若 non-integration run 加载此 module 则 null deref fail-fast 非 silent connect dev DB)
- `beforeEach` TRUNCATE all tables via `pg_tables` query (schema='public' AND NOT LIKE '_prisma%')
- `afterAll` `testDb.$disconnect()`
- `withTestTenant(storeId, fn)` — mirror production `withTenantContext`, 仅 `set_config('app.current_store_id', ...)`, **无 SET ROLE**
- `withTestPlatform(fn)` — `SET LOCAL ROLE platform_admin` tx-scoped BYPASSRLS (fixture 建 store 等跨租户动作用)

**Task 14 消费面**: 两 test file import `testDb` + `withTestTenant` + `withTestPlatform` 均 live, 无需 setup.ts 再改.

### 2.6 Round 2 Stage 0 — R2.2: global-setup.ts cat (`ca863caa` 前 26 lines 原状)

**文件**: `server/src/__tests__/integration/global-setup.ts` (`a55da4ae` land 原版, `ca863caa` plan patch v5 规定 Task 14 CC 执行期替换)

**`ca863caa` 前核心事实**:

- 仅 `execSync('pnpm prisma migrate deploy', { env: { ...process.env, DATABASE_URL: url }, stdio: 'inherit' })`, `url = process.env.TEST_DATABASE_URL`
- 无 role attribute 调整, 无 ALTER ROLE password override
- `teardown` no-op (tmpfs 容器 compose down 时自动释放)

**`ca863caa` 后规划状态** (plan patch v5 已 land 到 Task 12 heredoc, Task 14 CC 执行期按新 heredoc replace code):

- 双 env 读: `TEST_ADMIN_DATABASE_URL` + `TEST_DATABASE_URL`
- `migrate deploy` 走 admin URL (postgres superuser, 需 DDL 权限)
- 新增 admin PrismaClient 跑 `ALTER ROLE app_user WITH PASSWORD <WHATWG URL parser 从 TEST_DATABASE_URL 提取>`
- WHATWG URL parser (`new URL(testUrl)`, `parsed.password`) 替代 regex, 与 Prisma connection-string parser 同 decoding 合约
- 单引号 escape 手工 (`password.replace(/'/g, "''")`) for `ALTER ROLE` literal (PG 不支持 parameterized password binding)

### 2.7 Round 2 Stage 0 — R2.3: docker-compose.test.yml cat (21 lines, at repo root)

**文件**: `docker-compose.test.yml` (**repo root, 非 `server/`** — Round 2 CC Glob self-correction, #25 subclass path drift 第 2 数据点 登记)

**核心事实**:

- `image: postgres:16-alpine`
- `container_name: qr-order-postgres-test`
- `environment.POSTGRES_USER: postgres` (PG default = bootstrap **SUPERUSER**, 隐含 BYPASSRLS)
- `environment.POSTGRES_PASSWORD: test`
- `environment.POSTGRES_DB: qr_order`
- `ports: 5433:5432`
- `tmpfs: /var/lib/postgresql/data`
- `healthcheck: pg_isready -U postgres -d qr_order`
- **无 init script / entrypoint / POSTGRES_INITDB_ARGS** — 无 role attribute 调整机制

---

## 3. L1 最严 5 维度 Verdict 表

| 维度 | 维度描述 | `ca863caa` 前 verdict | `ca863caa` 后 verdict | 事实锚点 |
|---|---|---|---|---|
| 1 | RLS policy 表达式 literal 对齐 | Pass | Pass | Section 2.1 migration.sql DO $$ 块 USING/WITH CHECK 对称 `store_id::text = current_setting('app.current_store_id')::text`; Section 2.4 cross-phase literal 对齐 |
| 2 | A2 set_config strict mode 验证机制 | Pass (机制层) / Effectively Fail (生效层: testDb = superuser BYPASSRLS 不触发 strict mode) | Pass | Section 2.1 `current_setting(name)` 1-arg = strict mode; Section 2.2 prisma-client.ts `set_config('app.current_store_id', value, true)` is_local=true 对齐; `ca863caa` dual-URL testDb 改 app_user 身份后 RLS evaluate → strict mode 真实触发 → 裸查抛 `unrecognized configuration parameter` |
| 3 | WITH CHECK reversal INSERT 拒绝路径 | Effectively Fail (superuser BYPASSRLS 不评 policy, WITH CHECK 不触发) | Pass | Section 2.1 WITH CHECK 表达式与 USING 对称 + 双侧 `::text` cast; `ca863caa` testDb = app_user 身份后 WITH CHECK 激活 — mismatching `storeId` INSERT 抛 `new row violates row-level security policy` |
| 4 | pg_policies / pg_tables 元查询 literal 对齐 | Pass | Pass | Section 2.3 plan heredoc 内 column 名 (`relrowsecurity` / `policyname` / `tablename` / `qual` / `with_check` / `schemaname`) 全部 PG 16 真 column, 0 fabrication |
| 5 | platform_admin BYPASSRLS role 命名对齐 + testDb 身份 RLS 真实 apply | Effectively Fail (POSTGRES_USER default = postgres SUPERUSER, testDb 连接隐含 BYPASSRLS, RLS policy 不 evaluate, tenant-isolation.test.ts 4 tests 语义全失守) | Pass | Section 2.7 docker-compose `POSTGRES_USER: postgres`; Section 2.5 setup.ts 无降权; `ca863caa` Patch 2/5 dual-URL: `TEST_DATABASE_URL` = app_user (非 BYPASSRLS) + `TEST_ADMIN_DATABASE_URL` = postgres (仅 global-setup infra); `withTestPlatform` tx-scoped 显式 `SET LOCAL ROLE platform_admin` 临时 BYPASSRLS 于 fixture 建 store 场景 |

**关键 insight**: Task 11/12 land (`a55da4ae` 前后) 时 Task 13 fixtures.test.ts 3 tests 全 Pass, 但均在 `withTestPlatform` tx-scoped BYPASSRLS 内跑, **未 exercise RLS 真实 apply 语义**. Task 14 裸查 + 跨租户 SELECT + WITH CHECK INSERT 是 Phase 5 整个 tenant 安全防御模型首次真实暴露点 — L1 最严存在的必要性即此 catch.

---

## 4. γ 方案事实依据 (Ian 2026-04-21 选定)

### 4.1 问题 (`ca863caa` 前 state)

`TEST_DATABASE_URL=postgresql://postgres:test@localhost:5433/qr_order` (package.json `a55da4ae` 前 state)  →  testDb 连接 = postgres superuser → PG 16 docs: "superusers always bypass all permission checks" → RLS 整体 bypassed → tenant-isolation.test.ts 4 tests 全部 silent fail (测试绿但防御未生效) = silent security hole.

### 4.2 α/β/γ/δ 评估

- **α** (删 Test 1 `bare prisma query throws` + 其余 3 tests 用 helper 规避裸查): 放弃 A2 strict mode 回归防御 CI guard. Phase B Task 4 β 决议双侧 `::text` cast + strict mode 防御刻意建立的回归层失守. 不接受.
- **β** (setup.ts `withTestTenant` 加 `SET LOCAL ROLE app_user`): Test 3/4 修复但 Test 1/2 裸查 connection 仍 superuser, 需与 α 组合. 不独立.
- **γ** (双 URL 模型): blast radius 2 file, 语义完整保全, 规则 1 不破, 贴 prod 语义. **选定**.
- **δ** (global `SET SESSION AUTHORIZATION app_user`): Prisma 连接池 multi-connection reuse, SET SESSION 行为不可控 (连接 N+1 可能无 SET), 需 pool size=1 规避, 影响测试并发. 不接受.

### 4.3 γ 方案实施 (`ca863caa` land)

**Blast radius 2 files** (code 层, Task 14 CC 执行期按 plan patch v5 规定执行):

- `server/package.json` 2 scripts (test:db:migrate + test:integration):
  - `test:db:migrate` 从 `TEST_DATABASE_URL=$TEST_DATABASE_URL` 改为 `DATABASE_URL=$TEST_ADMIN_DATABASE_URL`
  - `test:integration` 三 URL 注入 (`TEST_ADMIN_DATABASE_URL` = postgres superuser / `TEST_DATABASE_URL` = app_user / `DATABASE_URL` = postgres double-guard)
- `server/src/__tests__/integration/global-setup.ts` 替换 (dual-URL 读 + ALTER ROLE app_user password override via WHATWG URL parser)

**0 动 files**:
- `server/src/__tests__/integration/setup.ts` (testDbUrl 自动 pick 新 `TEST_DATABASE_URL` = app_user)
- `server/prisma/migrations/*` (规则 1 铁律)
- Task 14 plan heredoc (plan 本体正确, 仅 infra 对齐)
- `docker-compose.test.yml` (容器 bootstrap 仍 postgres superuser 保留, admin URL 消费此身份)

### 4.4 技术细节

- **PG 16 postgres role semantics**: POSTGRES_USER env 初始化 PG 数据库 bootstrap 过程创建 LOGIN SUPERUSER role. SUPERUSER 隐含 BYPASSRLS (PG docs: "BYPASSRLS... useful only for nonsuperusers"). NOBYPASSRLS on SUPERUSER 是 no-op.
- **Role membership vs attribute**: `GRANT platform_admin TO app_user` 继承 privileges (SELECT/INSERT/UPDATE/DELETE GRANT) 但不继承 attributes (SUPERUSER / BYPASSRLS / CREATEROLE). attribute 切换需 `SET LOCAL ROLE <role>` 显式. 这是 `withTestPlatform` 的机制基础.
- **Migration password immutability**: migration line 3 `CREATE ROLE app_user LOGIN PASSWORD 'placeholder_set_by_env'` 规则 1 铁律不可变. test env 通过 global-setup runtime `ALTER ROLE` 覆盖, 与 Phase J Task 48 prod deploy 机制同构.
- **WHATWG URL parser 替代 regex** (Ian 2026-04-21 Flag 1 catch): URL spec password 含 `@`/`#`/`:`/空格等字符需 URL-encode 为 `%XX`. regex `[^@]+` 提取编码形式字符串, 而 Prisma connection parser 自动 decode → DB 存 `%40` vs Prisma 发 `@` silent breakage. `new URL(testUrl).password` 与 Prisma 同 WHATWG URL Standard 合约, decoding 对齐.

---

## 5. 治理层事件登记回顾

### 5.1 D85 候选 — 同 plan 跨 Task 基础假定 consistency check

Governance Digest §6 正式登记 (`0da7456a` commit).

**触发 vs 本 work-log 相关性**: Task 11/12 plan 隐含 testDb = postgres superuser (admin URL 简单便利, 无显式 role assumption document), Task 14 plan 假定 testDb = app_user (RLS 激活才能验). 同 plan 跨 Task assumption drift, Task 14 L1 review 才 catch, `ca863caa` dual-URL forward-fix 修复.

### 5.2 D86 候选 — Spec async-executable 原则

Governance Digest §6 正式登记 (`0da7456a` commit).

**触发**: Ian 2026-04-21 meta observation.

**Language-layer enforcement** (D86 核心子节): 所有治理与协作产出文档禁止使用 session-relative 指示词, 用日期 / SHA / 具体事件 locate. 本 work-log 全文应用此规则 — 所有陈述用 `d67da999` / `ca863caa` / `0da7456a` / "Phase C Batch 2 plan patch v5" / "Ian 2026-04-21 meta observation" 等 anchor, 无 "本对话" / "上轮" / "本轮" 类措辞.

### 5.3 Archive #26 — D86 语言层自违反

Fabrication Archive §3.4 末尾正式登记 (`0da7456a` commit).

**触发**: Plan Opus `ca863caa` commit body session-relative 措辞 → Ian 2026-04-21 一手 metacognitive 拦截.

**类别**: Category 1 "同对话规则循环" 子类, 与 #23 组对 (#23 scope = D83 绝对数字约束规则领域 / #26 scope = D86 语言层 async-executable 规则领域).

### 5.4 #25 subclass path drift 第 2 数据点

Round 2 Stage 0 Opus prompt 路径 `server/docker-compose.test.yml` vs 实际 repo root `docker-compose.test.yml`. CC Glob self-correction 吸收, 非 full 规则 8 暂停.

**第 1 数据点** (`d67da999` 登记): `docs/superpowers/phase5/` vs 实际 `docs/superpowers/archive/` 混淆.

**第 2 数据点同构**: Plan Opus 写 spec 前未 grep 外部 artifact 的 path literal.

Phase H Task 45 assess 是否升格 Pre-Flight Checklist 新条款 (D84 definition note 已预登记此候选).

### 5.5 D74 桶 replacement patch 分级 refinement 候选

`ca863caa` git show --stat: 71 insertions / 9 deletions. 原桶 "patch spec w/ inline code heredoc ×1.07" 预估 ~108 行偏差 -38.8% — 不是真偏差, 是度量单位差 (diff algo 折算共享行).

原桶拆为:
- 桶 A (纯新增 plan heredoc, 首次写作): ×1.07, 3 数据点支撑
- 桶 B (replacement plan heredoc, 覆盖旧 heredoc): 系数待定, `ca863caa` 第 1 数据点

`0da7456a` git show --stat: 111 insertions / 10 deletions. 预估总 ~150 行偏差 -26%. 桶归类为简单 ×0.8 (治理文档纯追加 / 1-2 Step verify / 短段增量), 实测仍系统性偏低 — 候选 sub-bucket "治理文档纯追加短段增量" ×0.7.

Phase H Task 45 并入 D74 桶分类 reconcile.

### 5.6 A.1 全角逗号 drift (`0da7456a` CC 执行期观察)

`0da7456a` 治理 commit CC 执行时, A.1 Edit 首次 old_str 因全角逗号 `，` vs 半角 `,` 与 plan 实际 literal drift, str_replace fail. CC Grep 校准后重试 unique match 一次成功, 无规则 8 暂停.

**非 #25 subclass**: #25 scope = Opus 写 spec 前未 grep 外部 artifact. 本事件 scope = str_replace old_str 从 CC Round 2 Stage 0 transcript copy 时字符编码 drift, Opus 层无法 grep 预防 (source 即 CC Round 2 Stage 0 产出 transcript).

**归 CC Edit 工具层自校正行为观察**: Phase H Task 45 assess 是否值新 Pre-Flight 条款 (Plan Opus 写 str_replace spec 时全/半角 punctuation 显式标记).

---

## 6. L1 Maximum Strictness Verdict

- **5 维度 all Pass** (`ca863caa` post-state).
- **0 silent security hole** (dual-URL 修复路径 fact-based, 非 wishful thinking).
- **Test heredoc 0 fabrication** (Round 1+2 grep 全 verify, 所有 literal 对齐 Phase B migration + prisma-client.ts + 当前 code state).
- **A2 strict mode 回归防御层保全** (Test 1 `bare prisma query throws` 在 `ca863caa` 后生效, 未来 prisma-client.ts 若改 strict mode → CI guard 兜住).
- **WITH CHECK reversal 回归防御保全** (Test 4 INSERT mismatch 拒绝在 `ca863caa` 后生效).
- **规则 1 铁律不破** (migration 0 动).

**推荐**: Ian 明批 "Task 14 GO" 起 Task 14 CC 执行消息 (Snapshot §9.4 三步走第二步完成 + 第三步启动).

---

## 7. Task 14 CC 执行消息 Scope 前置声明

**CC 执行消息 scope (下一次 Plan Opus 产出)**:

- 3 code files 改:
  - `server/package.json` 2 scripts (test:db:migrate + test:integration, plan patch v5 规定内容)
  - `server/src/__tests__/integration/global-setup.ts` 替换 (plan patch v5 Patch 5 heredoc 内容)
- 2 test files 新建:
  - `server/src/__tests__/integration/rls-coverage.test.ts` (plan Task 14 Step 1 heredoc 逐字)
  - `server/src/__tests__/integration/tenant-isolation.test.ts` (plan Task 14 Step 2 heredoc 逐字)
- 0 动:
  - `server/src/__tests__/integration/setup.ts`
  - migration files
  - `docker-compose.test.yml`
  - Task 14 plan heredoc

**CC 执行消息 Stage 0 pre-check (D86 强制)**:

依赖 HEAD SHA:
- `phase-c-test-db.md` 最近改动 = `ca863caa` (plan patch v5, Task 14 heredoc 内容 + Task 11/12 dual-URL 规定)
- 治理三文件最近改动 = `0da7456a` (D85/D86/#26 登记, D86 Language-layer enforcement 生效 baseline)
- HEAD 含 `ca863caa` + `0da7456a` 作 ancestor (之间可能有 `0da7456a` 后新 docs commit 改其他文件, 只要 Task 14 scope 5 files 未被动即 pass)

依赖 file state:
- `server/package.json` 最近改动 SHA 对齐 `a55da4ae` (Task 12) 或 `f538941b` (Task 11), 非 `a55da4ae` 后其他 commit
- `server/src/__tests__/integration/global-setup.ts` 最近改动 = `a55da4ae`
- `server/src/__tests__/integration/setup.ts` 最近改动 = `a55da4ae`
- `server/src/__tests__/integration/rls-coverage.test.ts` + `tenant-isolation.test.ts` 不存在 (Task 14 待创建)

任一 drift → 规则 8 暂停.

**CC 执行消息 执行流**:

1. Stage 0 pre-check
2. Edit `server/package.json` 2 scripts (逐字对齐 plan patch v5 Patch 1+2 new_str)
3. Replace `server/src/__tests__/integration/global-setup.ts` (逐字对齐 plan patch v5 Patch 5 new heredoc body, 不含 `cat > ... <<'EOF'` 和 `EOF` 包装行 — 此包装是 plan heredoc 用, Task 14 CC 直接 Write 文件内容)
4. Write new `server/src/__tests__/integration/rls-coverage.test.ts` (逐字对齐 plan Task 14 Step 1 heredoc body)
5. Write new `server/src/__tests__/integration/tenant-isolation.test.ts` (逐字对齐 plan Task 14 Step 2 heredoc body)
6. `pnpm test:db:up` (起 qr-order-postgres-test 容器)
7. `pnpm test:integration tenant-isolation rls-coverage 2>&1 | tail -30`
8. 预期 `Test Files 2 passed (2)` / `Tests 6 passed (6)`
9. 任一 test fail → 规则 8 暂停, 回报 fail detail (plan Task 14 Step 3 post-acceptance 已列 3 种 fail 模式对应 root cause)
10. `pnpm test:db:down` 清场
11. Commit + push

**CC 执行消息 commit message body 必含**:

- 触发 anchor: `ca863caa` (plan patch v5 spec) + `0da7456a` (governance v4.4 baseline)
- Task 14 产出 (2 test files + 3 code files 改)
- L1 5 维度 all Pass 证据锚 (grep / test output)
- dual-URL model land (D84 TEST_DATABASE_URL / TEST_ADMIN_DATABASE_URL invariants 登记)
- `a55da4ae` global-setup.ts forward-fix (D77 不 amend `a55da4ae`, 本 commit 新 content)
- D86 language-layer self-check 应用 (body 全文 no session-relative 措辞)

**不需要 re-grep**:
- vitest 4 `singleFork` sanity (Batch 1 Step 5 acceptance + `e13f7f37` docs patch v2 已 verify, `0da7456a` 后未再动 vitest.config)
- Round 1+2 grep fact base (本 work-log 汇总)

---

## 8. 下一动作

Ian read 本 work-log → 明批 "Task 14 GO" → 下一次 Plan Opus 产 Task 14 CC 执行消息 spec (按 Section 7 scope + Stage 0 pre-check 模板).

async-executable 原则 live: 本 work-log `0da7456a` baseline 产出, 任何时间点 Ian 发起 → 下一次 Plan Opus 读 (4 附件 + `ca863caa` commit body + `0da7456a` commit body + 本 work-log) → 产 CC 执行消息 spec 链路完整.

# Phase 5: PostgreSQL 迁移 + Cart/Order 合并（B2）实施计划 — 索引

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 一次性将 `server/data/*.json` + 同步 `JsonStore` 替换为 PostgreSQL + Prisma；同步完成 Cart 并入 Order（`status='draft'`）、Postgres RLS 多租户隔离、Platform Admin 三层权限体系。

**Architecture:** 共享 schema + `store_id` + Postgres RLS 行级隔离；`withTenantContext` 为唯一事务边界；repository 层默认排除 draft，类型判别联合 `DraftOrder` / `SubmittedOrder` 编译期防混用；EC2 + Docker Compose 自托管，SSM 管密码，每日 pg_dump 备份 S3。

**Tech Stack:** PostgreSQL 16 / Prisma 6 / Express / TypeScript / Vitest / Docker Compose / AWS SSM + S3

**Design doc:** `docs/superpowers/specs/2026-04-17-phase5-postgres-migration-design.md`（D1-D52 决策登记表在 §1）

---

## 如何使用本计划

1. **先读本索引文件** —— 全局规则、补强项追踪、Phase 映射都在这里
2. **按 Phase 顺序进入对应文件**执行 task
3. **每个 phase 文件独立可读** —— 头部引用本索引，task 内部自包含

---

## 全局规则（所有 task 遵守）

### 规则 1：增量 migration 铁律

任何阶段发现 schema 问题的处理路径：

- **失败类型 A（实现 bug）**：原地修业务代码，不动 schema
- **失败类型 B（schema 设计漏）**：新建增量 migration 目录 `prisma/migrations/20260418000001_b2_fix_xxx/migration.sql`，更新 `prisma/schema.prisma`，跑 `prisma migrate dev`
- **绝对禁止**：改已发布的 `20260417000001_init/migration.sql` 或 `20260417000002_rls_and_roles/migration.sql`。已发布 migration 改动会让 `prisma migrate` 状态混乱，团队成员本地 DB 无法同步

本规则适用全部 Phase A-K。

### 规则 2：SSE emit 时机

`emit(...)` 必须在 `withTenantContext` **返回之后**，不能在 tx 内。违反会导致"客户端收到事件 → fetch → 拿到 READ COMMITTED 下未 commit 的旧数据"。

### 规则 3：Repo 方法签名

写操作 repo 方法（`create` / `update` / `delete` / `upsert` / `bump*`）的 `db` 参数**必填**，读操作保留默认值（D52）。

### 规则 4：每 task 完成即 commit

不批量攒 commit。TypeScript/测试通过 → 立即 commit。commit message 按现有约定：`feat(phase-5): ...` / `fix(phase-5): ...` / `chore(phase-5): ...`。

### 规则 5：agent 文件独占边界

每个 agent 只改自己 task 声明的文件。跨 agent 共享文件（`shared/types.ts` / `shared/modules.ts` / `repositories/prisma-client.ts` / `docker-compose.yml`）由主 agent 在 Phase B 串行写定，之后任何 agent 只能读、不能写。

### 规则 6：验证前不得声明完成

`verification-before-completion` 的精神：任何"完成"声明前必须：
- `tsc -b`（server 和 client 各自）无新增错误
- 相关单元测试 `pnpm test <pattern>` 绿
- 贴实际命令输出到 commit 或 review，不靠"应该 ok"

---

## 批次结构

| 批 | 范围 | Task 数 | 状态 |
|---|---|---|---|
| 批 1 | Phase A-D（Stage -1、0、1、2） | 29 | 写作中 |
| 批 2 | Phase E-K（Stage 3a-7） | ~28 | 批 1 实施完 Phase A-B 后展开 |

**为什么分批**：批 2 的 task 详细度要反映批 1 实施中的真实发现（Prisma 查询语法细节、实际的 tsc 错误模式、seed 失败场景），避免提前固化错误假设。

**Phase 和 Stage 映射**：Phase 是 plan 的执行单位（按 agent 和并行规则切），Stage 是 spec §9 的设计单位（按阶段依赖切）。一对一映射见下方执行顺序表。

---

## Plan 阶段对 spec 的补强项

实施阶段比 spec 设计阶段更贴近代码，难免发现应该加强的防御。分两类：

**已回填 spec**（single commit 已同步）：

- **D53 / D54**（commit `a9d18efc`）：Phase D 从"通用 CRUD 适配器 + 加 await"重新定位为"11 个语义 repo，storage 层一次切、业务层渐进迁"。Spec §9.5 Stage 2 已完整重写

**待批 2 完成后统一回填**：

- **Task 4**：RLS policy 除 `USING` 外加了 `WITH CHECK`（spec §4.5 / §5.4 只提了 `USING`）。`WITH CHECK` 控制 INSERT/UPDATE 新值，防"漏写 store_id 的 insert 被接受"。加强但不冲突
- **Task 6**：`withTenantContext` 用 `set_config()` + 参数化（`$executeRaw` 标签模板），不再字符串拼接。spec §5.4 示例代码用的是 `$executeRawUnsafe`——plan 升级了防御。`withPlatformContext` 同步改用 `tx.$executeRaw\`SET LOCAL ROLE platform_admin\``（style parity）
- **Task 2**：`Order.status` / `Session.status` / `Payment.status` / `SplitBill.status` 用 Prisma enum，DB 层强制（spec §4.1 schema 示例用的是 `String`）

批 2 完成后建一个 commit `docs(phase-5): reconcile spec with plan-stage enhancements` 把待回填的三条补回 spec。

---

## 执行顺序（Phase → Stage → 文件）

| Phase | Stage | 文件 | Task 数 | 前置 |
|---|---|---|---|---|
| A | -1 | [phase-a-backup.md](./phase-a-backup.md) | 3（1a/1b/1c） | 无 |
| B | 0 | [phase-b-infrastructure.md](./phase-b-infrastructure.md) | 10（Task 2-10） | Phase A 全部完成（1c 必须先跑） |
| C | 1 | [phase-c-test-db.md](./phase-c-test-db.md) | 5（Task 11-15） | Phase B 全部完成 |
| D | 2 | [phase-d-repositories.md](./phase-d-repositories.md) | 11（Task 16-26） | Phase C 全部完成 |
| E | 3a | _（批 2 待写）_ | 3（Task 27-29） | Phase D |
| F | 3b | _（批 2 待写）_ | 2（Task 30-31） | Phase D（可和 E 并行） |
| G | 3c | _（批 2 待写）_ | 11（Task 32-42，含 B2 checkpoint） | Phase E/F |
| H | 4 | _（批 2 待写）_ | 3（Task 43-45） | Phase G |
| I | 5 | _（批 2 待写）_ | 2（Task 46-47） | Phase H |
| J | 6 | _（批 2 待写）_ | 5（Task 48-51，含 49a/49b 拆分） | Phase I |
| K | 7 | _（批 2 待写）_ | 1（Task 52） | Phase J |

---

## 批 1 任务清单（供索引参考，详情见对应 phase 文件）

### Phase A：Stage -1 备份 EC2 演示数据 → [phase-a-backup.md](./phase-a-backup.md)

| Task | 内容 | 阻塞关系 |
|---|---|---|
| 1a | SSH + pg_dump 4 张表 | 先 |
| 1b | scp 回本地 + 完整性验证 | 在 1a 后 |
| 1c | 本地 dry-run restore | 在 1b 后，**必须在 Phase B 开始前完成** |

### Phase B：Stage 0 基础设施 → [phase-b-infrastructure.md](./phase-b-infrastructure.md)

| Task | 内容 |
|---|---|
| 2 | 写 `prisma/schema.prisma` 完整 15 主表 + 6 子表 |
| 3 | 生成 `20260417000001_init/migration.sql` |
| 4 | 手写 `20260417000002_rls_and_roles/migration.sql` |
| 5 | 手写 `20260417000003_seed_platform_admin/migration.sql` |
| 6 | 写 `repositories/prisma-client.ts` |
| 7 | 写 `shared/types.ts` 判别联合 |
| 8 | 写 `middleware/tenant-aware.ts` 装饰器 |
| 9a | 写 `prisma/seed.ts` 前 3 步（platform admin + demo store + ModuleLicense） |
| 9b | 写 `prisma/seed.ts` 后 3 步（system roles + owner staff + menu + tables） |
| 10 | 更新 `docker-compose.yml` + 开启 `no-floating-promises` |

### Phase C：Stage 1 测试 DB → [phase-c-test-db.md](./phase-c-test-db.md)

| Task | 内容 |
|---|---|
| 11 | 写 `docker-compose.test.yml` |
| 12 | 写 `vitest.config.ts` + `setup.ts` |
| 13 | 写 `fixtures.ts` |
| 14 | 写 `rls-coverage.test.ts` + `tenant-isolation.test.ts` |
| 15 | 写 `module-registry.test.ts` |

### Phase D：Stage 2 Repository 层 → [phase-d-repositories.md](./phase-d-repositories.md)

| Task | 内容 |
|---|---|
| 16 | 重写 `repositories/stores.ts`（choke point） |
| 17 | 写 `repositories/orders.ts`（B2 核心） |
| 18 | 写 `repositories/sessions.ts` |
| 19 | 写 `repositories/payments.ts` |
| 20 | 写 `repositories/split-bills.ts` |
| 21 | 写 `repositories/menu.ts` |
| 22 | 写 `repositories/staff.ts` |
| 23 | 写 `repositories/roles.ts` + `resolveLicensedPermissions` helper |
| 24 | 写 `repositories/coupons.ts` |
| 25 | 写 `repositories/waitlist.ts` |
| 26 | 写 `repositories/platform-admin.ts` |

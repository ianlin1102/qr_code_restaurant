# 2026-04-19 Phase B Task 3 L1 Verify — Migration 安全性深度审

Created: 2026-04-19, Phase B Task 2 plan 修订(`52903d31`)完结后,对 Task 3 extend_schema migration 做 L1 深度审核。Task 3 先于 Task 7 verify(Ian 决议:migration 不可逆 + Task 7 依赖 Task 3 schema 生效)。

**路径修正**(CC 3 轮前已 flag):Ian 指令 `backend/` → 实际 `server/`;JSON 扁平 `server/data/*.json`(非 per-store subdir)。

---

## 1. 现状速读(阶段 A)

### 1.1 Current applied migration(postgres 已应用)

```bash
$ ls server/prisma/migrations/
20260309182624_init/
migration_lock.toml  (provider = postgresql)
```

**init migration 内容**(前 40 行):
- `CREATE TABLE "stores"`(id, name, description, opening_hours, announcement, logo, created_at, updated_at)
- `CREATE TABLE "store_users"`(id, username, password, **role TEXT NOT NULL DEFAULT 'staff'**, store_id, created_at)
- 1 UNIQUE INDEX(store_users_store_id_username)
- 1 FK(store_users → stores ON DELETE RESTRICT)

**关键**:legacy `store_users.role` 列 **NOT NULL + DEFAULT 'staff'**(applied DB 级别),而 Task 2 plan schema 把它去掉了 —— Task 3 生成 SQL 会 **`DROP TABLE store_users`**(整表替换,非 ALTER)。

### 1.2 Current `schema.prisma`(Task 2 未写前)

```
10: model Store { ... }         (8 columns,DIFF with Task 2 plan schema)
24: model StoreUser { ... }     (要被 Task 2 schema 删除)
```

Schema.prisma 35 行,2 models。与 init migration 1:1 对齐(Prisma 单一 source)。

### 1.3 JSON backfill 准备度(关键发现)

| 字段 | Task 2 plan 要求 | JSON 现状 | 判定 |
|---|---|---|---|
| `staff.roleId` | NOT NULL + onDelete Restrict | 3 records:1 FK 填,2 null(record 1/2 storeId=store-demo-002) | Step 2.5 删 2 records 后 → 1 record FK ✅ |
| `tables.label` | Task 2 plan 改 name | **0 records 有 label 字段** | 🟢 Rename 是 **plan 内语义**,非 DB ALTER(见 §3 #4)|
| `tables.name` | required | 41/41 全有 ✅ | |
| `tables.number` | required | 41/41 全有 ✅ | |
| `tables.enabled` | @default(true) | 41/41 全有 ✅ | |
| `tables.status` | @default("idle") | 41/41 全有(39 idle + 2 occupied)| |
| `tables.waiterCalledAt` | DateTime? | 0/41 有 — **optional,无需 backfill** | |
| `tables.nameEn` | String? | 4/41 有(G-4 证实 tables 90% name_only) | |
| `stores.taxRate` | Float? | 4/4 有 | |
| `stores.paymentMode` | String? | 4/4 有 | |
| `orders.tableName` | required | 63 有(**orders 不迁移**,handoff §5a) | |
| `coupons.minOrderAmount` | Int? | 1/4 有(SAVE10/2000) | |
| `menu-items.originalPrice` | Int? | 0/22 有 — optional ✅ | |
| `categories.quickTags` | @default([]) | 0/9 有 — Prisma `@default([])` 自动处理 | |

**总结**:**JSON backfill 零阻塞**。Task 2 Step 2.5 删 store-demo-002 staff 2 records 后,剩余 record 3 roleId 完整。其他新字段 JSON 状态与 Prisma 默认值/optional 设计兼容。

---

## 2. Task 3 plan 完整 summary(line 666-787)

| Step | 内容 | 覆盖维度 |
|---|---|---|
| 前置 | 本地 postgres + 已应用 `20260309182624_init` | 部分覆盖维度 #2 |
| 1 | 起临时 postgres 容器(port 15432)| 环境准备 |
| 2 | 设置临时 `DATABASE_URL`(不写 .env)| 环境准备 |
| 3 | `pnpm prisma migrate dev --name extend_schema --create-only` + 目录重命名 | 覆盖维度 #1 + #6 |
| 4 | 审核生成 SQL(ALTER stores / DROP store_users / CREATE 20 new / @@index / @@unique / enum)| 覆盖维度 #1 部分 + #5 + #7 |
| 5 | 清理临时容器 | 环境清理 |
| 6 | commit migration | git 流程 |

**Plan 修订追加(2026-04-19)**:β 增量 path 声明 + applied state 说明(但未写"stores 表现有 rows"处理)。

---

## 3. 8 维度 verify 表

| # | 维度 | Task 3 plan 现状 | Gap 严重性 | 修订建议 |
|---|---|---|---|---|
| **1** | Migration 文件粒度 | 单 `20260417000001_extend_schema` migration,含 ALTER(stores)+ DROP(store_users)+ CREATE 20 new + 4 enum + 所有 index/FK | 🟢 **无** | 保持单 migration(规则 1 铁律:1 file 1 version 清晰) |
| **2** | 顺序依赖(Step 2.5 ↔ migrate apply)| Task 2 Step 2.5 暗示"先跑,否则 migrate 失败" | 🔴 **高**(语义错误)| **Step 2.5 实际不影响 Task 3 migrate apply**(详 §4 发现 1)。需修订 Task 2 Step 2.5 narrative |
| **3** | Backfill 步骤(Staff.roleId / Table.name 等)| Plan 未提 backfill — 但对 applied state(空业务表)正确,**Prisma CREATE TABLE 新表无需 backfill**,Staff NOT NULL 在空表直接生效 | 🟡 **中** | `stores` 表 ALTER ADD COLUMN 需注意 **applied DB stores 现有 rows** 状态;需补"pre-flight verify applied stores row count"Step |
| **4** | Rename 语义(label→name)| Task 2 plan 注释"rename label→name" | 🟢 **无(academic)** | JSON tables.json **从未有 label 字段**(grep verified),Applied DB 无 tables 表。Task 3 migrate = CREATE TABLE tables(用 name 字段),**非 ALTER RENAME**。Task 2 plan 注释误导(可轻量修订为"对齐 JSON" 而非 "rename")|
| **5** | 新字段默认值 | Task 2 schema 各字段已设 `@default(...)`(enabled=true / status="idle" / autoAcceptOrders=false / quickTags=[] / tipBase="pretax" 已在 init migration 外)| 🟢 **无** | Prisma 自动生成 `DEFAULT <value>`,ALTER ADD COLUMN 对 existing rows 正确回填 |
| **6** | Migration 命名(C1 决议)| `20260417000001_extend_schema`(单 migration,非细分)| 🟢 **无** | C1 已确认 |
| **7** | Index 同步(Order.tableName 等)| `@@index([storeId, status])` / `@@unique` 全由 Prisma 自动生成,新字段无独立 index 需求(tableName 是 snapshot,非查询键)| 🟢 **无** | Order.tableName 不需 @@index(fact:从 Order 查 Table 走 FK `tableId`) |
| **8** | 回滚机制 | Plan 未提回滚 | 🟡 **中** | Prisma 无 auto down;本地 dev 回滚 = `docker exec pg_dropdb qr_order && createdb qr_order && prisma migrate deploy`(需写入 Step 4 审核失败备注)|

---

## 4. 规则 8 触发项(超 scope 发现,独立汇报)

### 发现 1 · Step 2.5 顺序约束语义错误(高)

**问题**:Task 2 Step 2.5 plan 描述暗示"必须早于 `prisma migrate dev` apply,否则 NOT NULL + onDelete: Restrict 约束破坏"。

**实际**:
- Task 3 `prisma migrate deploy` apply 的是 **schema-level SQL**(CREATE TABLE staff),对象是 postgres 表结构,不涉及 `server/data/staff.json` 数据
- Applied DB 创建 `staff` 表时是空表 → Staff.roleId NOT NULL + onDelete Restrict 在空表上直接生效,**不需要预先清理 JSON**
- Step 2.5 真实约束对象是 **Phase H `import-legacy-json.ts`**(将 JSON → postgres INSERT),不是 Task 3 migrate

**建议**:Task 2 Step 2.5 plan 修订为:
- 调整 narrative:"本 sub-step 配合 Phase H import-legacy-json.ts 时 Staff.roleId NOT NULL 约束 INSERT 保护;**Task 3 migrate 本身不依赖**(CREATE TABLE 空表对 NOT NULL 透明)"
- 调整位置:从 Task 2 Step 2.5(本 task 内)挪到 **Phase H import 前**?—— 此决议属 Ian 设计偏好,CC 不自推

### 发现 2 · Applied `stores` 表现有 rows 状态未在 Task 3 plan 明示(中)

**问题**:现有 `stores` 表由 `20260309182624_init` 创建,若 Phase 5 前测试写入过 rows,Task 3 的 `ALTER TABLE stores ADD COLUMN` 会对 existing rows 做 DEFAULT 填充。Plan 未声明此状态。

**验证需求**:实施期前先跑:
```sql
-- 在本地 postgres 跑
SELECT count(*) FROM stores;
SELECT count(*) FROM store_users;
```
- 若 count > 0 → Task 3 Step 4 审核清单需加 `ALTER TABLE stores ADD COLUMN ... DEFAULT ...` 对 existing rows 的行为预测
- 若 count = 0 → 无需额外关注(空表 ALTER 零风险)

**建议**:Task 3 plan Step 1 前补一个 "Step 0:verify applied DB rows state"。

### 发现 3 · Task 3 plan 无回滚策略(低)

**问题**:Prisma migrate 无 auto down migration。Task 3 Step 4 "审核发现 SQL 问题" 时,plan 未写"如何丢弃 generated migration + retry"。

**建议**:Task 3 Step 4 加 "审核失败 → `rm -rf migrations/20260417000001_extend_schema/` + 修 schema + 重跑 Step 3"。

本地 dev 完整回滚:
```bash
docker stop postgres-migration-gen && docker rm postgres-migration-gen
# 或:drop database
docker exec postgres-migration-gen psql -U postgres -c "DROP DATABASE qr_order; CREATE DATABASE qr_order"
```

---

## 5. Task 3 plan 修订建议(优先级排序)

| 序 | 修订点 | 优先级 | 影响 Task 3 实施质量 |
|---|---|---|---|
| 1 | **修 Task 2 Step 2.5 narrative**(非 Task 3 内,但由本 verify 发现)| 🔴 高 | 语义错误误导实施者,可能在 Task 2 实施时纠结 "为什么要先清 JSON" |
| 2 | **Task 3 加 Step 0 verify applied DB rows state** | 🟡 中 | 防止 ALTER stores 对 existing rows 意外行为 |
| 3 | **Task 3 Step 4 加 审核失败 rollback 步骤** | 🟡 中 | 实施时自信遇错可恢复 |
| 4 | **Task 2 plan 修订 "rename label→name" 注释**(academic,改为"对齐 JSON")| 🟢 低 | 文档精度提升,非关键 |

### 建议执行顺序

1. 若 Ian 批,**单 commit 合并** 修订点 1 + 4(Task 2 plan 精度提升)+ 修订点 2 + 3(Task 3 plan 安全补强)
2. 命名:`plan: Phase B Task 2/3 L1 verify findings (Step 2.5 narrative + Task 3 rollback)`

---

## 6. 总结

**8 维度 verify 结果**:
- 🔴 高 gap:**1 项**(Step 2.5 顺序约束语义错,非 Task 3 内)
- 🟡 中 gap:**2 项**(applied rows 预检 + 回滚)
- 🟢 无 / 低 gap:**5 项**(文件粒度 / rename 语义 / 默认值 / 命名 / index)

**Task 3 Plan 主线就绪程度**:✅ 核心流程(Step 1-6)清晰可执行,微观补强即可;**无 Mode C 级重大缺失**。

**超 scope 发现汇总(规则 8 主动)**:3 项全记入 §4,最关键为发现 1(Task 2 Step 2.5 语义错)—— 建议下一轮 Ian 决议是否回修 Task 2 plan。

**Ian 决议候选**:
- α)立即修 Task 2 Step 2.5 narrative(独立 commit)→ 起 Task 3 实施
- β)Task 3 plan 微观补强 3 项(合并 Step 2.5 修)→ 起 Task 3 实施
- γ)直接进 Task 7 verify(Step 2.5 narrative 在 Task 2 实施期发现时再修)
- δ)跳 verify 直接起 Task 2 实施(当前 Plan 修订链已充分)

---

**End of Task 3 L1 verify.**

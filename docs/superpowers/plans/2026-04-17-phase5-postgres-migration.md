# Phase 5: PostgreSQL 迁移 + Cart/Order 合并（B2）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 一次性将 `server/data/*.json` + 同步 `JsonStore` 替换为 PostgreSQL + Prisma；同步完成 Cart 并入 Order（`status='draft'`）、Postgres RLS 多租户隔离、Platform Admin 三层权限体系。

**Architecture:** 共享 schema + `store_id` + Postgres RLS 行级隔离；`withTenantContext` 为唯一事务边界；repository 层默认排除 draft，类型判别联合 `DraftOrder` / `SubmittedOrder` 编译期防混用；EC2 + Docker Compose 自托管，SSM 管密码，每日 pg_dump 备份 S3。

**Tech Stack:** PostgreSQL 16 / Prisma 6 / Express / TypeScript / Vitest / Docker Compose / AWS SSM + S3

**Design doc:** `docs/superpowers/specs/2026-04-17-phase5-postgres-migration-design.md`（D1-D52 决策登记表在 §1）

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
| 批 1 | Phase A-D（Stage -1、0、1、2） | 29 | **本文档** |
| 批 2 | Phase E-K（Stage 3a-7） | ~28 | 批 1 实施完 Phase A-B 后展开 |

**为什么分批**：批 2 的 task 详细度要反映批 1 实施中的真实发现（Prisma 查询语法细节、实际的 tsc 错误模式、seed 失败场景），避免提前固化错误假设。

**Phase 和 Stage 映射**：Phase 是 plan 的执行单位（按 agent 和并行规则切），Stage 是 spec §9 的设计单位（按阶段依赖切）。一对一映射见批次结构表。

---

## Plan 阶段对 spec 的补强项（批 2 写完前回填 spec）

实施阶段比 spec 设计阶段更贴近代码，难免发现应该加强的防御。以下改动在 plan 里**已经落地**，但 spec 文档还没同步——批 2 完成后统一回填 design doc：

- **Task 4**：RLS policy 除 `USING` 外加了 `WITH CHECK`（spec §4.5 / §5.4 只提了 `USING`）。`WITH CHECK` 控制 INSERT/UPDATE 新值，防"漏写 store_id 的 insert 被接受"。加强但不冲突
- **Task 6**：`withTenantContext` 用 `set_config()` + 参数化（`$executeRaw` 标签模板），不再字符串拼接。spec §5.4 示例代码用的是 `$executeRawUnsafe`——plan 升级了防御
- **Task 2**：`Order.status` / `Session.status` / `Payment.status` / `SplitBill.status` 用 Prisma enum，DB 层强制（spec §4.1 schema 示例用的是 `String`）

批 2 完成后建一个 commit `docs(phase-5): reconcile spec with plan-stage enhancements` 把上述改动补回 spec。

---

## 批 1：Phase A-D 任务清单

### Phase A：Stage -1 备份 EC2 演示数据

| Task | 内容 | 阻塞关系 |
|---|---|---|
| 1a | SSH + pg_dump 4 张表 | 先 |
| 1b | scp 回本地 + 完整性验证 | 在 1a 后 |
| 1c | 本地 dry-run restore | 在 1b 后，**必须在 Phase B 开始前完成** |

### Phase B：Stage 0 基础设施

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

### Phase C：Stage 1 测试 DB

| Task | 内容 |
|---|---|
| 11 | 写 `docker-compose.test.yml` |
| 12 | 写 `vitest.config.ts` + `setup.ts` |
| 13 | 写 `fixtures.ts` |
| 14 | 写 `rls-coverage.test.ts` + `tenant-isolation.test.ts` |
| 15 | 写 `module-registry.test.ts` |

### Phase D：Stage 2 Repository 层

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

---

## Phase A：Stage -1 备份 EC2 演示数据

### Task 1a：SSH + pg_dump 4 张表

**Files:**
- Create: `archive/legacy-demo-data/.gitkeep`（保留目录，不 commit dump）
- Create: `.gitignore` 追加 `archive/legacy-demo-data/*.sql.gz`

**前置检查**：
- 你有 EC2 的 SSH 访问（`ssh ec2-user@<host>` 能登）
- 本地有 `scp` 和 `gunzip` 命令

- [ ] **Step 1：创建本地归档目录 + gitignore**

```bash
mkdir -p archive/legacy-demo-data
touch archive/legacy-demo-data/.gitkeep

# .gitignore 里加一行
echo 'archive/legacy-demo-data/*.sql.gz' >> .gitignore
echo 'archive/legacy-demo-data/*.json' >> .gitignore
```

- [ ] **Step 2：SSH 上 EC2 确认 docker postgres container 名**

```bash
ssh ec2-user@<your-ec2-host>
docker ps --format "{{.Names}}\t{{.Image}}" | grep -i postgres
```

预期输出（container 名可能不同）：
```
qr-order-postgres-1    postgres:16
```

**记下 container 名**（后续命令用）。如果没有 postgres container，说明 EC2 现状不符合前置假设，停下来跟用户确认。

- [ ] **Step 3：在 EC2 上 pg_dump 4 张表**

```bash
# 仍在 EC2 上
CONTAINER=qr-order-postgres-1   # 换成你刚记下的名字
TS=$(date -u +%Y%m%d-%H%M%S)
docker exec $CONTAINER pg_dump \
  -U postgres \
  -t stores -t categories -t menu_items -t tables \
  --data-only \
  qr_order \
  | gzip > /tmp/legacy-demo-$TS.sql.gz

ls -lh /tmp/legacy-demo-$TS.sql.gz
```

预期输出：
```
-rw-rw-r-- 1 ec2-user ec2-user 1234 Apr 17 10:23 /tmp/legacy-demo-20260417-102334.sql.gz
```

**文件大小应 >0**（真实数据即使少也不会是 0）。若 0 字节说明 pg_dump 失败或表为空——贴输出让用户判断继续与否。

- [ ] **Step 4：在 EC2 上额外导出 JSON 格式（供 import-legacy-json.ts 用）**

```bash
# 仍在 EC2 上，同一时间戳
for t in stores categories menu_items tables; do
  docker exec $CONTAINER psql -U postgres -d qr_order -t -c \
    "SELECT json_agg(row_to_json(${t}.*)) FROM ${t}" \
    > /tmp/legacy-${t}-$TS.json
  echo "---- ${t} ----"
  head -c 200 /tmp/legacy-${t}-$TS.json
  echo
done
```

预期输出（前 200 字节示例）：
```
---- stores ----
[{"id":"abc-123","name":"Demo Restaurant","description":null,"opening_hours":null,...}]

---- categories ----
[{"id":"cat-1","store_id":"abc-123","name":"Drinks","sort_order":0,...}]
```

空表会显示 `null`，非空显示 JSON 数组。记下这 5 个文件的时间戳。

- [ ] **Step 5：commit 目录占位**

```bash
# 回到本地项目根目录
cd "$(git rev-parse --show-toplevel)"
git add archive/legacy-demo-data/.gitkeep .gitignore
git commit -m "chore(phase-5): create archive dir for legacy demo data

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 1b：scp 回本地 + 完整性验证

**Files:** 无代码文件改动，只搬运数据

**前置**：Task 1a 完成，EC2 `/tmp/legacy-*-$TS.*` 文件已生成。

- [ ] **Step 1：scp 5 个文件回本地**

```bash
# 从本地执行（不在 EC2 上）
cd "$(git rev-parse --show-toplevel)"
TS=<从 Task 1a Step 3 记下的时间戳>

scp ec2-user@<host>:/tmp/legacy-demo-$TS.sql.gz archive/legacy-demo-data/
for t in stores categories menu_items tables; do
  scp ec2-user@<host>:/tmp/legacy-${t}-$TS.json archive/legacy-demo-data/
done

ls -lh archive/legacy-demo-data/
```

预期输出：
```
-rw-r--r-- 1 user staff 1234 Apr 17 10:30 legacy-demo-20260417-102334.sql.gz
-rw-r--r-- 1 user staff  856 Apr 17 10:30 legacy-stores-20260417-102334.json
-rw-r--r-- 1 user staff  412 Apr 17 10:30 legacy-categories-20260417-102334.json
-rw-r--r-- 1 user staff 4621 Apr 17 10:30 legacy-menu_items-20260417-102334.json
-rw-r--r-- 1 user staff  789 Apr 17 10:30 legacy-tables-20260417-102334.json
```

**所有文件大小 >0**。其中 `menu_items` 应该最大（有几十道菜）。若某个文件 0 字节，scp 有问题，停下重跑。

- [ ] **Step 2：验证 gzip 完整性**

```bash
gunzip -t archive/legacy-demo-data/legacy-demo-$TS.sql.gz
echo "exit code: $?"
```

预期：
```
exit code: 0
```

非 0 = dump 文件损坏，scp 重来。

- [ ] **Step 3：验证 JSON 结构**

```bash
for f in archive/legacy-demo-data/legacy-*.json; do
  echo "=== $f ==="
  # 如果是 null（空表），应该正好是 "null\n"
  # 如果非空，应该是 JSON 数组
  python3 -c "
import json, sys
with open('$f') as fp:
    data = json.load(fp)
if data is None:
    print('empty table (null)')
else:
    print(f'records: {len(data)}')
    if data:
        print(f'sample keys: {list(data[0].keys())[:5]}')
"
done
```

预期（示例）：
```
=== archive/legacy-demo-data/legacy-stores-20260417-102334.json ===
records: 1
sample keys: ['id', 'name', 'description', 'opening_hours', 'announcement']

=== archive/legacy-demo-data/legacy-menu_items-20260417-102334.json ===
records: 42
sample keys: ['id', 'store_id', 'category_id', 'name', 'description']
```

记录每张表的 record 数——Task 1c dry-run 完要核对。若 `stores` records=0，说明 EC2 上没演示店铺，跟用户确认是否符合预期。

- [ ] **Step 4：commit JSON 文件（sql.gz 被 gitignore 挡住）**

```bash
git add archive/legacy-demo-data/*.json
git status  # 确认 .sql.gz 没被 add
git commit -m "chore(phase-5): archive legacy demo data JSON from EC2

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 1c：本地 dry-run restore（阻塞 Phase B）

**目的**：在动 Phase B schema 前，确认 legacy dump 的列名/类型与新 schema 兼容。发现不兼容现在调 `import-legacy-json.ts` 转换逻辑比 Phase H 晚发现好。

**Files:** 无代码文件改动（只是验证）

**前置**：Task 1b 完成；本地 docker 已起（或可以起）一个空 postgres 16 container。

- [ ] **Step 1：起一个临时 postgres 容器（不用项目的 compose）**

```bash
docker run -d --name postgres-dryrun \
  -e POSTGRES_DB=qr_order_dryrun \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=dryrun \
  -p 15432:5432 \
  postgres:16

sleep 5
docker exec postgres-dryrun pg_isready -U postgres
```

预期：
```
/var/run/postgresql:5432 - accepting connections
```

- [ ] **Step 2：把 .sql.gz dump restore 到空 DB**

```bash
TS=<从 Task 1a Step 3 的时间戳>
gunzip -c archive/legacy-demo-data/legacy-demo-$TS.sql.gz \
  | docker exec -i postgres-dryrun psql -U postgres -d qr_order_dryrun 2>&1 \
  | tee /tmp/dryrun-restore.log
```

**预期情况**：会报错，因为 dump 是 `--data-only` 模式，表还不存在。这是正常的——我们只是验证 **INSERT 语句的列名/类型** 能不能被一个模拟的目标 schema 接受。

- [ ] **Step 3：分析错误模式**

```bash
# 查看 restore 报的错
grep -E "ERROR|FATAL" /tmp/dryrun-restore.log | head -20
```

**预期错误模式**：
- `relation "stores" does not exist` —— 正常，表没建（我们还没跑 Phase B migration）
- `column "xxx" of relation "stores" does not exist` —— **关键！** 这类错误才是真正的"列名漂移"

如果只看到第一种错误（表不存在），dump 跟新 schema 的**列名兼容**（或至少没显式冲突，因为表都没建）。

如果看到第二种错误，或者 dump 里的列在我们新 schema §4.1 里查不到，记下清单，Phase H 改 `import-legacy-json.ts` 时处理映射。

- [ ] **Step 4：手工过一遍关键字段**

```bash
# 从 EC2 dump 里提取表结构信息（CREATE TABLE 段落如果有的话）
zcat archive/legacy-demo-data/legacy-demo-$TS.sql.gz | grep -E "^(COPY|INSERT)" | head -20
```

预期：每行类似
```
COPY public.stores (id, name, description, opening_hours, announcement, logo, created_at, updated_at) FROM stdin;
COPY public.menu_items (id, store_id, category_id, name, description, image_url, price, ...) FROM stdin;
```

**对照新 schema §4.1 的字段清单**，逐列核对。重点关注：
- `stores.tip_base`：新 schema 有这个字段，legacy 可能没有 → import 时给默认 `'pretax'`
- `menu_items.is_staff_only`：legacy 可能叫 `staff_only` 或缺失 → import 映射
- `tables.qr_code`：legacy 字段可能叫 `qr_token` 或 `code` → 映射
- `categories.sort_order`：legacy 可能叫 `order` → 映射

把发现的差异记到 `archive/legacy-demo-data/schema-drift.md`（一个非 commit 的笔记）。

- [ ] **Step 5：清理临时容器**

```bash
docker stop postgres-dryrun
docker rm postgres-dryrun
```

- [ ] **Step 6：写 dry-run 结果笔记并 commit**

```bash
cat > archive/legacy-demo-data/schema-drift.md <<'EOF'
# Legacy demo dump → 新 schema 字段差异

时间戳：<TS>
Dump 文件：legacy-demo-<TS>.sql.gz

## 发现的字段差异（需要 import-legacy-json.ts 映射）

| 表 | Legacy 字段 | 新字段 | 处理 |
|---|---|---|---|
| stores | （无 tip_base） | tip_base | 默认 'pretax' |
| menu_items | ??? | is_staff_only | ??? |
| tables | qr_code / qr_token? | qr_code | 记下实际值 |
| categories | ??? | sort_order | ??? |

（实际填入 Step 4 发现的内容）

## 结论

- [ ] 所有差异可通过 import-legacy-json.ts 的映射逻辑解决
- [ ] 无不可恢复的数据类型不兼容

Phase H 实施 import-legacy-json.ts 时必须读本文档。
EOF

git add archive/legacy-demo-data/schema-drift.md
git commit -m "docs(phase-5): record legacy dump schema drift findings

Co-Authored-By: Claude <noreply@anthropic.com>"
```

**Phase A 完成。**Phase B 可开工。

---

## Phase B：Stage 0 基础设施

### Task 2：写完整 `prisma/schema.prisma`

**Files:**
- Modify: `server/prisma/schema.prisma`（当前只有 Store + StoreUser，全部重写）

**前置**：Phase A 完成。

- [ ] **Step 1：备份现有 schema（不是 git，是物理备份）**

```bash
cp server/prisma/schema.prisma server/prisma/schema.prisma.pre-phase5
```

防止 Step 2 覆盖后 git 之前的版本看不到。

- [ ] **Step 2：整个重写 `server/prisma/schema.prisma`**

完整内容（直接写进去）：

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// ========== Enums（DB 层强制状态机，和 shared/types.ts 判别联合一一对应） ==========

enum OrderStatus {
  draft
  pending
  preparing
  served
  voided
}

enum SessionStatus {
  open
  closed
}

enum PaymentStatus {
  pending
  confirmed
  refunded
}

enum SplitBillStatus {
  active
  paid
}

// ========== 租户 & 权限 ==========

model Store {
  id            String         @id @default(uuid())
  name          String
  description   String?
  openingHours  String?        @map("opening_hours")
  announcement  String?
  logo          String?
  tipBase       String         @default("pretax")
  createdAt     DateTime       @default(now()) @map("created_at")
  updatedAt     DateTime       @updatedAt      @map("updated_at")

  moduleLicense ModuleLicense?
  staff         Staff[]
  roles         Role[]
  tables        Table[]
  categories    Category[]
  menuItems     MenuItem[]
  sessions      Session[]
  orders        Order[]
  payments      Payment[]
  splitBills    SplitBill[]
  coupons       Coupon[]
  waitlist      WaitlistEntry[]
  timeEntries   TimeEntry[]
  printers      Printer[]

  @@map("stores")
}

model PlatformAdmin {
  id           String    @id @default(uuid())
  email        String    @unique
  passwordHash String    @map("password_hash")
  role         String
  isActive     Boolean   @default(true) @map("is_active")
  lastLoginAt  DateTime? @map("last_login_at")
  createdAt    DateTime  @default(now()) @map("created_at")

  @@map("platform_admins")
}

model ModuleLicense {
  id        String   @id @default(uuid())
  storeId   String   @unique @map("store_id")
  store     Store    @relation(fields: [storeId], references: [id], onDelete: Cascade)
  modules   String[]
  grantedAt DateTime @map("granted_at")
  grantedBy String   @map("granted_by")
  note      String?

  @@map("module_licenses")
}

model Role {
  id          String   @id @default(uuid())
  storeId     String   @map("store_id")
  store       Store    @relation(fields: [storeId], references: [id], onDelete: Cascade)
  name        String
  permissions String[]
  isSystem    Boolean  @default(false) @map("is_system")
  createdAt   DateTime @default(now()) @map("created_at")

  staff       Staff[]

  @@unique([storeId, name])
  @@map("roles")
}

model Staff {
  id           String   @id @default(uuid())
  storeId      String   @map("store_id")
  store        Store    @relation(fields: [storeId], references: [id], onDelete: Cascade)
  username     String
  passwordHash String   @map("password_hash")
  roleId       String?  @map("role_id")
  role         Role?    @relation(fields: [roleId], references: [id], onDelete: SetNull)
  clockPin     String?  @map("clock_pin")
  displayName  String?  @map("display_name")
  createdAt    DateTime @default(now()) @map("created_at")

  timeEntries  TimeEntry[]

  @@unique([storeId, username])
  @@map("staff")
}

// ========== 店铺配置 ==========

model Table {
  id                String   @id @default(uuid())
  storeId           String   @map("store_id")
  store             Store    @relation(fields: [storeId], references: [id], onDelete: Cascade)
  label             String
  qrCode            String   @unique @map("qr_code")
  capacity          Int?
  currentSessionId  String?  @map("current_session_id")
  createdAt         DateTime @default(now()) @map("created_at")

  sessions          Session[]
  orders            Order[]

  @@index([storeId])
  @@map("tables")
}

model Category {
  id         String     @id @default(uuid())
  storeId    String     @map("store_id")
  store      Store      @relation(fields: [storeId], references: [id], onDelete: Cascade)
  name       String
  sortOrder  Int        @default(0) @map("sort_order")
  isActive   Boolean    @default(true) @map("is_active")
  createdAt  DateTime   @default(now()) @map("created_at")

  menuItems  MenuItem[]

  @@index([storeId])
  @@map("categories")
}

model MenuItem {
  id           String              @id @default(uuid())
  storeId      String              @map("store_id")
  store        Store               @relation(fields: [storeId], references: [id], onDelete: Cascade)
  categoryId   String              @map("category_id")
  category     Category            @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  name         String
  description  String?
  imageUrl     String?             @map("image_url")
  price        Int
  isAvailable  Boolean             @default(true)  @map("is_available")
  isStaffOnly  Boolean             @default(false) @map("is_staff_only")
  sortOrder    Int                 @default(0)     @map("sort_order")
  createdAt    DateTime            @default(now()) @map("created_at")
  updatedAt    DateTime            @updatedAt      @map("updated_at")

  options      MenuItemOption[]

  @@index([storeId, categoryId])
  @@map("menu_items")
}

model MenuItemOption {
  id          String   @id @default(uuid())
  storeId     String   @map("store_id")
  menuItemId  String   @map("menu_item_id")
  menuItem    MenuItem @relation(fields: [menuItemId], references: [id], onDelete: Cascade)
  groupName   String   @map("group_name")
  name        String
  priceAdjust Int      @default(0) @map("price_adjust")
  isDefault   Boolean  @default(false) @map("is_default")
  sortOrder   Int      @default(0) @map("sort_order")

  @@index([menuItemId])
  @@map("menu_item_options")
}

// ========== 业务核心（B2） ==========

model Session {
  id              String        @id @default(uuid())
  storeId         String        @map("store_id")
  store           Store         @relation(fields: [storeId], references: [id], onDelete: Cascade)
  tableId         String        @map("table_id")
  table           Table         @relation(fields: [tableId], references: [id], onDelete: Restrict)
  status          SessionStatus
  settlementMode  String        @default("unset") @map("settlement_mode")
  couponCode      String?   @map("coupon_code")
  couponType      String?   @map("coupon_type")
  couponValue     Int?      @map("coupon_value")
  couponAppliedAt DateTime? @map("coupon_applied_at")
  closedAt        DateTime? @map("closed_at")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt      @map("updated_at")

  orders          Order[]
  payments        Payment[]
  splitBills      SplitBill[]

  @@index([storeId, status])
  @@index([tableId])
  @@map("sessions")
}

model Order {
  id                  String       @id @default(uuid())
  storeId             String       @map("store_id")
  store               Store        @relation(fields: [storeId], references: [id], onDelete: Cascade)
  tableId             String       @map("table_id")
  table               Table        @relation(fields: [tableId], references: [id], onDelete: Restrict)
  sessionId           String?      @map("session_id")
  session             Session?     @relation(fields: [sessionId], references: [id], onDelete: SetNull)
  status              OrderStatus
  deviceId            String?      @map("device_id")
  version             Int       @default(0)
  lastCartActivityAt  DateTime? @map("last_cart_activity_at")
  createdAt           DateTime  @default(now()) @map("created_at")
  updatedAt           DateTime  @updatedAt      @map("updated_at")

  items               OrderItem[]

  @@index([storeId, status])
  @@index([sessionId])
  @@index([storeId, createdAt])
  @@map("orders")
}

model OrderItem {
  id         String   @id @default(uuid())
  storeId    String   @map("store_id")
  orderId    String   @map("order_id")
  order      Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  menuItemId String   @map("menu_item_id")
  itemKey    String   @map("item_key")
  name       String
  unitPrice  Int      @map("unit_price")
  quantity   Int
  note       String?

  options    OrderItemOption[]
  paymentItems PaymentItem[]
  splitBillItems SplitBillItem[]

  @@index([orderId])
  @@index([menuItemId])
  @@index([itemKey])
  @@map("order_items")
}

model OrderItemOption {
  id           String    @id @default(uuid())
  storeId      String    @map("store_id")
  orderItemId  String    @map("order_item_id")
  orderItem    OrderItem @relation(fields: [orderItemId], references: [id], onDelete: Cascade)
  groupName    String    @map("group_name")
  name         String
  priceAdjust  Int       @default(0) @map("price_adjust")

  @@map("order_item_options")
}

// ========== 支付 ==========

model Payment {
  id                    String        @id @default(uuid())
  storeId               String        @map("store_id")
  store                 Store         @relation(fields: [storeId], references: [id], onDelete: Cascade)
  sessionId             String        @map("session_id")
  session               Session       @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  method                String
  amount                Int
  tipAmount             Int           @default(0) @map("tip_amount")
  taxAmount             Int           @default(0) @map("tax_amount")
  stripePaymentIntentId String?       @map("stripe_payment_intent_id")
  status                PaymentStatus
  createdAt             DateTime      @default(now()) @map("created_at")

  items                 PaymentItem[]

  @@index([storeId, createdAt])
  @@index([sessionId])
  @@index([stripePaymentIntentId])
  @@map("payments")
}

model PaymentItem {
  id          String     @id @default(uuid())
  storeId     String     @map("store_id")
  paymentId   String     @map("payment_id")
  payment     Payment    @relation(fields: [paymentId], references: [id], onDelete: Cascade)
  orderItemId String     @map("order_item_id")
  orderItem   OrderItem  @relation(fields: [orderItemId], references: [id], onDelete: Restrict)
  itemKey     String     @map("item_key")

  @@index([itemKey])
  @@index([paymentId])
  @@map("payment_items")
}

// ========== 分账 ==========

model SplitBill {
  id                    String          @id @default(uuid())
  storeId               String          @map("store_id")
  store                 Store           @relation(fields: [storeId], references: [id], onDelete: Cascade)
  sessionId             String          @map("session_id")
  session               Session         @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  type                  String
  percent               Int?
  subtotal              Int
  tax                   Int
  tip                   Int             @default(0)
  amount                Int
  status                SplitBillStatus
  stripePaymentIntentId String?         @map("stripe_payment_intent_id")
  createdAt             DateTime        @default(now()) @map("created_at")

  items SplitBillItem[]

  @@index([sessionId, status])
  @@map("split_bills")
}

model SplitBillItem {
  id           String     @id @default(uuid())
  storeId      String     @map("store_id")
  splitBillId  String     @map("split_bill_id")
  splitBill    SplitBill  @relation(fields: [splitBillId], references: [id], onDelete: Cascade)
  orderItemId  String     @map("order_item_id")
  orderItem    OrderItem  @relation(fields: [orderItemId], references: [id], onDelete: Restrict)
  itemKey      String     @map("item_key")
  quantity     Int        @default(1)

  @@index([splitBillId])
  @@index([itemKey])
  @@map("split_bill_items")
}

// ========== 外围 ==========

model Coupon {
  id             String    @id @default(uuid())
  storeId        String    @map("store_id")
  store          Store     @relation(fields: [storeId], references: [id], onDelete: Cascade)
  code           String
  discountType   String    @map("discount_type")
  discountValue  Int       @map("discount_value")
  maxUses        Int?      @map("max_uses")
  currentUses    Int       @default(0) @map("current_uses")
  expiresAt      DateTime? @map("expires_at")
  isActive       Boolean   @default(true) @map("is_active")
  createdAt      DateTime  @default(now()) @map("created_at")

  @@unique([storeId, code])
  @@index([storeId, isActive])
  @@map("coupons")
}

model WaitlistEntry {
  id         String    @id @default(uuid())
  storeId    String    @map("store_id")
  store      Store     @relation(fields: [storeId], references: [id], onDelete: Cascade)
  name       String
  phone      String
  partySize  Int       @map("party_size")
  status     String
  notifiedAt DateTime? @map("notified_at")
  createdAt  DateTime  @default(now()) @map("created_at")

  @@index([storeId, status])
  @@map("waitlist_entries")
}

model TimeEntry {
  id          String    @id @default(uuid())
  storeId     String    @map("store_id")
  store       Store     @relation(fields: [storeId], references: [id], onDelete: Cascade)
  staffId     String    @map("staff_id")
  staff       Staff     @relation(fields: [staffId], references: [id], onDelete: Cascade)
  clockInAt   DateTime  @map("clock_in_at")
  clockOutAt  DateTime? @map("clock_out_at")

  @@index([storeId, staffId])
  @@map("time_entries")
}

model Printer {
  id        String   @id @default(uuid())
  storeId   String   @map("store_id")
  store     Store    @relation(fields: [storeId], references: [id], onDelete: Cascade)
  name      String
  type      String
  host      String?
  port      Int?
  isEnabled Boolean  @default(true) @map("is_enabled")
  createdAt DateTime @default(now()) @map("created_at")

  @@index([storeId])
  @@map("printers")
}
```

- [ ] **Step 3：格式化 + 验证 schema 语法**

```bash
cd server
pnpm prisma format
pnpm prisma validate
```

预期：
```
Environment variables loaded from .env
The schema at prisma/schema.prisma is valid 🚀
```

如果 validate 报错，读错误消息改 schema。常见问题：
- relation back-reference 缺 → 每个 `@relation` 另一端必须有对应 model 的反向字段
- `@@index` 语法错误 → 字段名写错

- [ ] **Step 4：commit schema**

```bash
# 先确认 .pre-phase5 备份不被 commit
echo "server/prisma/schema.prisma.pre-phase5" >> .gitignore

git add server/prisma/schema.prisma .gitignore
git commit -m "feat(phase-5): rewrite prisma schema for 15 entities + B2

- 15 main tables + 6 junction tables
- All junction tables include store_id for RLS
- Order model includes device_id + version for B2 optimistic lock
- PlatformAdmin separate from Staff for three-tier permission model
- Prisma enums (OrderStatus, SessionStatus, PaymentStatus, SplitBillStatus)
  enforce state machines at DB level, mirror shared/types.ts discriminants

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3：生成 init migration

**Files:**
- Create: `server/prisma/migrations/20260417000001_init/migration.sql`（Prisma 自动生成）

**前置**：Task 2 完成。**需要一个本地 postgres**（Task 10 的 docker-compose 还没写，用临时容器）。

- [ ] **Step 1：起临时 postgres 用于 migration 生成**

```bash
docker run -d --name postgres-migration-gen \
  -e POSTGRES_DB=qr_order \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=tempgen \
  -p 15432:5432 \
  postgres:16

sleep 5
```

- [ ] **Step 2：设置临时 DATABASE_URL**

```bash
cd server
export DATABASE_URL="postgresql://postgres:tempgen@localhost:15432/qr_order"
echo $DATABASE_URL
```

**不要写进 .env**——这是临时的。

- [ ] **Step 3：生成 migration**

```bash
pnpm prisma migrate dev --name init --create-only
```

`--create-only` 只生成 SQL 不执行。预期输出：
```
Prisma Migrate created the following migration from new schema changes:
migrations/
  └─ 20260417000001_init/
    └─ migration.sql

You can now edit it and apply it by running prisma migrate deploy.
```

如果时间戳不是 `20260417000001`（Prisma 用当前时间），**手动重命名目录**到 `20260417000001_init`，保证 spec 中的命名一致性。

```bash
# 如果 Prisma 用了不同时间戳（例如 20260417_102334_init）
cd server/prisma/migrations
mv <prisma-generated-name> 20260417000001_init
ls -la
```

- [ ] **Step 4：审核生成的 SQL**

```bash
cat server/prisma/migrations/20260417000001_init/migration.sql | head -60
```

预期开头类似：
```sql
-- CreateTable
CREATE TABLE "stores" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    ...
    CONSTRAINT "stores_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "platform_admins" (
    ...
```

检查：
- 21 张表（15 主 + 6 子）全部 CREATE
- 所有 `@@index` 生成了 CREATE INDEX
- 所有 `@@unique` 生成了 CREATE UNIQUE INDEX
- 所有外键生成了 ALTER TABLE ADD CONSTRAINT

- [ ] **Step 5：清理临时容器（migration 已经生成到文件）**

```bash
docker stop postgres-migration-gen
docker rm postgres-migration-gen
unset DATABASE_URL
```

- [ ] **Step 6：commit migration**

```bash
git add server/prisma/migrations/20260417000001_init/
git commit -m "feat(phase-5): generate init migration for all entities

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4：手写 rls_and_roles migration

**Files:**
- Create: `server/prisma/migrations/20260417000002_rls_and_roles/migration.sql`

**前置**：Task 3 完成。

- [ ] **Step 1：创建目录**

```bash
mkdir -p server/prisma/migrations/20260417000002_rls_and_roles
```

- [ ] **Step 2：写完整 SQL**

```bash
cat > server/prisma/migrations/20260417000002_rls_and_roles/migration.sql <<'EOF'
-- ========== DB Roles (idempotent) ==========
DO $$ BEGIN
  CREATE ROLE app_user LOGIN PASSWORD 'placeholder_set_by_env';
EXCEPTION WHEN duplicate_object THEN RAISE NOTICE 'app_user exists'; END $$;

DO $$ BEGIN
  CREATE ROLE platform_admin LOGIN PASSWORD 'placeholder_set_by_env' BYPASSRLS;
EXCEPTION WHEN duplicate_object THEN RAISE NOTICE 'platform_admin exists'; END $$;

DO $$ BEGIN
  CREATE ROLE system_worker LOGIN PASSWORD 'placeholder_set_by_env' BYPASSRLS;
EXCEPTION WHEN duplicate_object THEN RAISE NOTICE 'system_worker exists'; END $$;

GRANT platform_admin TO app_user;

GRANT CONNECT ON DATABASE qr_order TO app_user, platform_admin, system_worker;
GRANT USAGE ON SCHEMA public TO app_user, platform_admin, system_worker;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user, platform_admin, system_worker;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_user, platform_admin, system_worker;

-- 未来新建的表也自动 GRANT
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user, platform_admin, system_worker;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE ON SEQUENCES TO app_user, platform_admin, system_worker;

-- ========== RLS on store_id tables (strict mode, no fallback) ==========
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT table_name FROM information_schema.columns
           WHERE column_name = 'store_id' AND table_schema = 'public'
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format($p$
      CREATE POLICY tenant_isolation ON %I
      USING (store_id = current_setting('app.current_store_id')::uuid)
      WITH CHECK (store_id = current_setting('app.current_store_id')::uuid)
    $p$, t);
  END LOOP;
END $$;

-- ========== Partial unique: one draft per (session, device) ==========
CREATE UNIQUE INDEX one_draft_per_device
  ON orders (session_id, device_id)
  WHERE status = 'draft';
EOF
```

**关键点**：
- `current_setting('app.current_store_id')` **无 `, true` 参数**（严格模式，missing 时抛错而非返回 NULL，D33）
- `USING` 控制 SELECT/UPDATE/DELETE，`WITH CHECK` 控制 INSERT/UPDATE 新值——两个都加
- partial unique index 只约束 `status='draft'` 的行

> **⚠️ 此 task 的 `WITH CHECK` 是 plan 阶段引入的补强防御**——spec §4.5 / §5.4 的 RLS policy 示例只提了 `USING`。设计意图上和 `USING` 成对出现才能防住"漏写 store_id 的 insert"，plan 里直接加上。批 2 完成后统一回填 spec（见文档开头"Plan 阶段对 spec 的补强项"）。

- [ ] **Step 3：commit**

```bash
git add server/prisma/migrations/20260417000002_rls_and_roles/
git commit -m "feat(phase-5): add RLS policies + DB roles + partial draft unique

- Three DB roles: app_user (RLS-bound), platform_admin (BYPASSRLS), system_worker (BYPASSRLS)
- RLS strict mode: current_setting without fallback throws on missing context
- USING + WITH CHECK cover SELECT/UPDATE/DELETE/INSERT
- Partial unique (session_id, device_id) WHERE status='draft'

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5：手写 seed_platform_admin migration

**Files:**
- Create: `server/prisma/migrations/20260417000003_seed_platform_admin/migration.sql`

**前置**：Task 4 完成。

**设计决策**：首个 super-admin 通过 migration 插入（不通过 seed.ts），原因是 seed.ts 可以被重跑，而这条记录应该只在 fresh install 时创建。migration 天然只跑一次。

- [ ] **Step 1：创建目录 + 写 SQL**

```bash
mkdir -p server/prisma/migrations/20260417000003_seed_platform_admin

cat > server/prisma/migrations/20260417000003_seed_platform_admin/migration.sql <<'EOF'
-- Seed the initial super-admin PlatformAdmin.
-- Password hash is a placeholder (bcrypt of 'changeme' with cost 10).
-- Operator MUST reset this password immediately after first deploy:
--   psql> UPDATE platform_admins SET password_hash = '<new bcrypt hash>' WHERE email = 'admin@saas.local';
--
-- Why in migration (not seed.ts): this record should only exist on fresh install.
-- seed.ts can be re-run (upsert), but we don't want seed.ts to know production admin credentials.

INSERT INTO platform_admins (id, email, password_hash, role, is_active, created_at)
VALUES (
  gen_random_uuid(),
  'admin@saas.local',
  -- bcrypt hash of 'changeme', cost 10. REPLACE IMMEDIATELY.
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
  'super-admin',
  true,
  now()
)
ON CONFLICT (email) DO NOTHING;
EOF
```

**注意**：这个 bcrypt hash 是 `'changeme'` 的标准示例 hash（cost=10），安全但显然应该立即改掉。用户在部署后第一次登录就应该改。

- [ ] **Step 2：commit**

```bash
git add server/prisma/migrations/20260417000003_seed_platform_admin/
git commit -m "feat(phase-5): seed initial super-admin via migration

Password is 'changeme' (placeholder). Operator MUST reset after first deploy.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 6：写 `repositories/prisma-client.ts`

**Files:**
- Create: `server/src/repositories/prisma-client.ts`

**前置**：Task 5 完成。

- [ ] **Step 1：写完整文件**

```bash
cat > server/src/repositories/prisma-client.ts <<'EOF'
import { PrismaClient, Prisma } from '@prisma/client'

/**
 * Primary Prisma client — connects as app_user (RLS-bound).
 * Every request MUST wrap DB work in withTenantContext (or withPlatformContext/withSystemContext).
 * Bare `prisma.order.findMany()` from a request handler will throw
 * "unrecognized configuration parameter app.current_store_id" because RLS policy runs first.
 */
export const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
})

/**
 * System worker Prisma client — connects as system_worker (BYPASSRLS).
 * For cron jobs, webhook retry queues, cross-tenant cleanup tasks.
 * Uses separate connection pool — won't interfere with app_user capacity.
 */
export const systemPrisma = new PrismaClient({
  datasources: { db: { url: process.env.SYSTEM_DATABASE_URL } },
})

export type Db = PrismaClient | Prisma.TransactionClient

/**
 * UUID validation — prevents SQL injection via SET LOCAL.
 */
function assertUuid(value: string): void {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(value)) {
    throw new Error(`Invalid UUID passed to tenant context: ${value}`)
  }
}

/**
 * Open a transaction with RLS tenant context set.
 * All DB operations inside fn see only rows matching storeId.
 * INSERT rows must have matching store_id or WITH CHECK rejects.
 *
 * Defense-in-depth:
 *   1. assertUuid rejects malformed input at app layer
 *   2. set_config() with parameterized $executeRaw — Prisma escapes the value
 *      so no SQL injection even if assertUuid were bypassed
 *
 * set_config(name, value, is_local=true) is equivalent to SET LOCAL and resets
 * at tx commit/rollback. RLS policies cast current_setting(...) ::uuid at query time.
 *
 * @param storeId - tenant UUID (validated + parameterized)
 * @param fn - callback receiving transaction client
 */
export async function withTenantContext<T>(
  storeId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  assertUuid(storeId)
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_store_id', ${storeId}, true)`
    return fn(tx)
  })
}

/**
 * Open a transaction with platform_admin role (BYPASSRLS).
 * For platform API routes where the caller is a PlatformAdmin, not a tenant.
 * SET LOCAL ROLE resets on tx commit/rollback — safe for connection pool reuse.
 */
export async function withPlatformContext<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL ROLE platform_admin`)
    return fn(tx)
  })
}

/**
 * Transaction for system tasks (cron, webhook retry).
 * Uses systemPrisma which connects as system_worker (BYPASSRLS).
 */
export async function withSystemContext<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return systemPrisma.$transaction(async (tx) => fn(tx))
}
EOF
```

- [ ] **Step 2：tsc 编译验证**

```bash
cd server
./node_modules/.bin/tsc --noEmit 2>&1 | head -20
```

预期：无新增错误（可能有现有 JsonStore 相关的错误，不算"新增"）。

- [ ] **Step 3：commit**

```bash
git add server/src/repositories/prisma-client.ts
git commit -m "feat(phase-5): add prisma client singleton with tenant/platform/system wrappers

- withTenantContext opens tx + SET LOCAL app.current_store_id (single tx boundary)
- withPlatformContext opens tx + SET LOCAL ROLE platform_admin
- withSystemContext uses systemPrisma (separate connection pool as system_worker)
- assertUuid prevents SQL injection via tenant context

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 7：写 `shared/types.ts` 判别联合

**Files:**
- Modify: `shared/types.ts`（现有文件追加，不破坏已有类型）

**前置**：Task 6 完成。

- [ ] **Step 1：读现有 shared/types.ts 前 50 行**

```bash
head -50 shared/types.ts
```

记下里面已有的 `Order` / `OrderStatus` 定义（如果有）。

- [ ] **Step 2：在 shared/types.ts 末尾追加 B2 判别联合**

如果现有 `OrderStatus` 定义不包含 `'draft'`，先**修改**：

```ts
// 原来如果是
export type OrderStatus = 'pending' | 'preparing' | 'served' | ...

// 改成
export type OrderStatus = 'draft' | 'pending' | 'preparing' | 'served' | 'voided'
```

然后在文件末尾（或适当的位置）追加：

```ts
// ========== B2: Draft/Submitted 判别联合 ==========
// 设计原因：Cart 并入 Order 后，draft 状态的 order 不应流入 FIFO / summary / settlement。
// 类型判别让编译器在函数签名层阻止 draft 混入。
// Repository 层的 findSubmitted 默认排除 draft，findDraft 是显式 opt-in。
// 详见 docs/superpowers/specs/2026-04-17-phase5-postgres-migration-design.md §5.2

export type DraftOrder = Order & { status: 'draft' }
export type SubmittedOrder = Order & { status: Exclude<OrderStatus, 'draft'> }

export function isDraft(o: Order): o is DraftOrder {
  return o.status === 'draft'
}

export function isSubmitted(o: Order): o is SubmittedOrder {
  return o.status !== 'draft'
}

/**
 * Active order filter — used in kitchen/KDS views.
 * Excludes both draft (not submitted yet) and voided/closed states.
 */
export function isActiveOrder(o: Order): boolean {
  return o.status === 'pending' || o.status === 'preparing'
}
```

- [ ] **Step 3：验证 shared 编译**

```bash
cd shared
./node_modules/.bin/tsc --noEmit 2>&1 | head
cd ..
```

预期：无错误。

- [ ] **Step 4：client 和 server 的 tsc——收集 switch 漏 case 清单给 Phase G**

```bash
cd server && ./node_modules/.bin/tsc --noEmit 2>&1 | tee /tmp/tsc-server.log | head; cd ..
cd client && ./node_modules/.bin/tsc -b 2>&1 | tee /tmp/tsc-client.log | head; cd ..
```

**本 task 的 commit 规则**：
- Phase B 阶段 client 出现新 `OrderStatus` case 不全的编译错误是**允许的**——B2 代码还没写（Phase G Task 34 的职责），client 的 switch 必然还没加 `case 'draft'` 分支
- **不允许**的：因为本次改动引入的非 OrderStatus 相关错误（比如把 `OrderStatus` 类型名改错了）

- [ ] **Step 5：扫 client 所有 OrderStatus switch，写入 TODO 清单供 Phase G Task 34 消费**

```bash
# 扫 client 代码里所有 OrderStatus 相关 switch 语句
mkdir -p docs/superpowers/work-logs
cat > docs/superpowers/work-logs/2026-04-17-phase5-client-orderstatus-todos.md <<'HEADER'
# Phase 5 — Client OrderStatus draft case handoff to Phase G Task 34

Phase B Task 7 expanded `OrderStatus` to include `'draft'`. The following client
sites have switch statements / conditional branches on OrderStatus and must be
updated in Phase G Task 34 (session-cart B2 rewrite) to handle `'draft'` explicitly.

**Action for Task 34**: each entry below → decide whether draft should be shown,
hidden, or filtered. Cart-facing UI should show drafts; kitchen/KDS/admin views
should hide drafts (use `isActiveOrder` or `isSubmitted` helper).

## Sites found

HEADER

# Grep 所有 OrderStatus switch
grep -rn "OrderStatus\|order\.status\|\.status ===" client/src --include="*.ts" --include="*.tsx" \
  | grep -iE "switch|case|===|!==" \
  | head -100 >> docs/superpowers/work-logs/2026-04-17-phase5-client-orderstatus-todos.md || true

# 也加上 server 端的 switch（Phase G 需要）
echo -e "\n## Server-side switches (also for Task 34)\n" \
  >> docs/superpowers/work-logs/2026-04-17-phase5-client-orderstatus-todos.md
grep -rn "order\.status\|\.status ===" server/src --include="*.ts" \
  | grep -iE "switch|case|===|!==" \
  | head -100 >> docs/superpowers/work-logs/2026-04-17-phase5-client-orderstatus-todos.md || true

wc -l docs/superpowers/work-logs/2026-04-17-phase5-client-orderstatus-todos.md
```

预期：work-log 文件有几十行，记录每个 switch site 的 `file:line` + 原始代码片段。Phase G Task 34 开工时先读这个文件。

- [ ] **Step 6：commit**

```bash
git add shared/types.ts docs/superpowers/work-logs/2026-04-17-phase5-client-orderstatus-todos.md
git commit -m "feat(phase-5): add DraftOrder/SubmittedOrder discriminants for B2

OrderStatus now includes 'draft' (cart = orders WHERE status='draft' after B2).
isDraft/isSubmitted/isActiveOrder helpers make the distinction explicit in call sites.
Settlement/FIFO/summary functions should accept SubmittedOrder[] to compile-time
reject drafts.

Client sites with OrderStatus switches logged to work-logs/ for Phase G Task 34.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 8：写 `middleware/tenant-aware.ts` 装饰器

**Files:**
- Create: `server/src/middleware/tenant-aware.ts`

**前置**：Task 7 完成。

- [ ] **Step 1：写完整文件**

```bash
mkdir -p server/src/middleware

cat > server/src/middleware/tenant-aware.ts <<'EOF'
import type { Request, Response, NextFunction, RequestHandler } from 'express'
import type { Prisma } from '@prisma/client'
import { withTenantContext, withPlatformContext } from '../repositories/prisma-client.js'

/**
 * Augment Express Response.locals to carry the transaction client
 * inside a tenant-scoped request.
 */
declare module 'express-serve-static-core' {
  interface Locals {
    tx?: Prisma.TransactionClient
    storeId?: string
    platformAdminId?: string
  }
}

export type TenantAwareHandler = (req: Request, res: Response) => Promise<void>

/**
 * Wrap an async route handler so it runs inside withTenantContext.
 * - Reads storeId from req.params.storeId (required — route pattern must include :storeId)
 * - Opens tx + sets RLS store context
 * - Exposes tx on res.locals.tx for handler + repos to use
 * - Any exception propagates to Express error middleware
 *
 * Usage:
 *   router.get('/orders', tenantAwareRoute(async (req, res) => {
 *     const orders = await orderRepo.findSubmitted({ storeId: res.locals.storeId }, res.locals.tx)
 *     res.json(orders)
 *   }))
 */
export function tenantAwareRoute(handler: TenantAwareHandler): RequestHandler {
  return async (req, res, next) => {
    const storeId = req.params.storeId
    if (!storeId) {
      res.status(400).json({ error: 'storeId missing from route' })
      return
    }
    try {
      await withTenantContext(storeId, async (tx) => {
        res.locals.tx = tx
        res.locals.storeId = storeId
        await handler(req, res)
      })
    } catch (err) {
      next(err)
    }
  }
}

/**
 * Wrap a platform-admin route handler so it runs inside withPlatformContext
 * (SET LOCAL ROLE platform_admin, BYPASSRLS).
 *
 * The route middleware chain must have already verified PlatformAdmin JWT
 * and set res.locals.platformAdminId before this handler runs.
 */
export function platformAwareRoute(handler: TenantAwareHandler): RequestHandler {
  return async (req, res, next) => {
    if (!res.locals.platformAdminId) {
      res.status(403).json({ error: 'platform admin auth required' })
      return
    }
    try {
      await withPlatformContext(async (tx) => {
        res.locals.tx = tx
        await handler(req, res)
      })
    } catch (err) {
      next(err)
    }
  }
}
EOF
```

- [ ] **Step 2：tsc 验证**

```bash
cd server
./node_modules/.bin/tsc --noEmit 2>&1 | grep -E "tenant-aware|prisma-client" | head
```

预期：和这两个文件相关的错误 0。

- [ ] **Step 3：commit**

```bash
git add server/src/middleware/tenant-aware.ts
git commit -m "feat(phase-5): add tenantAwareRoute + platformAwareRoute decorators

- tenantAwareRoute extracts storeId from route params, opens withTenantContext,
  exposes tx via res.locals for handler + repos to consume
- platformAwareRoute assumes platform JWT middleware already ran, opens
  withPlatformContext (SET LOCAL ROLE platform_admin, BYPASSRLS)
- Response.locals typed to carry tx/storeId/platformAdminId

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 9a：seed.ts — platform admin + demo store + ModuleLicense

**Files:**
- Create: `server/prisma/seed.ts`
- Create: `server/prisma/seed-data/store.ts`

**前置**：Task 8 完成。

**本 task 只做前 3 步**（super admin 已经由 migration 插入，seed 这里是 idempotent update；demo store；ModuleLicense）。后 3 步（roles / owner staff / menu / tables）在 Task 9b。

- [ ] **Step 1：创建 seed-data 目录 + demo store 常量**

```bash
mkdir -p server/prisma/seed-data

cat > server/prisma/seed-data/store.ts <<'EOF'
export const DEMO_STORE = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'Demo Restaurant',
  description: 'Seeded demo store for development',
  tipBase: 'pretax' as const,
} as const

export const DEMO_PLATFORM_ADMIN_EMAIL = 'admin@saas.local'

export const SEEDER_GRANTED_BY = 'system-seed'
EOF
```

- [ ] **Step 2：写 seed.ts 入口（只跑前 3 步）**

```bash
cat > server/prisma/seed.ts <<'EOF'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { DEMO_STORE, DEMO_PLATFORM_ADMIN_EMAIL, SEEDER_GRANTED_BY } from './seed-data/store.js'

// MODULES lives in shared workspace. For seed we just hard-list keys to avoid
// pulling the whole modules.ts into Prisma's seed context (which uses tsx).
// If you add a new module, update this list AND shared/modules.ts.
const ALL_MODULES = [
  'core',
  'analytics',
  'coupons',
  'waitlist',
  'printer',
  'staff-management',
]

const prisma = new PrismaClient()

async function main() {
  console.log('[seed] Starting…')

  // ---- Step 1: Reset super-admin password (idempotent) ----
  // The admin row is inserted by migration 20260417000003_seed_platform_admin.
  // Here we ensure the password is synced to DEMO_PLATFORM_ADMIN_PASSWORD env,
  // if set. Otherwise leave the migration's 'changeme' placeholder.
  const adminPassword = process.env.DEMO_PLATFORM_ADMIN_PASSWORD
  if (adminPassword) {
    // Upsert (not update) — if migration 20260417000003 rolled back or was
    // manually cleared, update would throw "Record not found". Seed must be
    // runnable against any DB state.
    const hash = await bcrypt.hash(adminPassword, 10)
    await prisma.platformAdmin.upsert({
      where: { email: DEMO_PLATFORM_ADMIN_EMAIL },
      create: {
        email: DEMO_PLATFORM_ADMIN_EMAIL,
        passwordHash: hash,
        role: 'super-admin',
        isActive: true,
      },
      update: { passwordHash: hash },
    })
    console.log('[seed] Super-admin password reset from DEMO_PLATFORM_ADMIN_PASSWORD env')
  } else {
    console.log('[seed] Super-admin password left as migration default ("changeme") — change immediately')
  }

  // ---- Step 2: Demo store (upsert) ----
  const demoStore = await prisma.store.upsert({
    where: { id: DEMO_STORE.id },
    create: {
      id: DEMO_STORE.id,
      name: DEMO_STORE.name,
      description: DEMO_STORE.description,
      tipBase: DEMO_STORE.tipBase,
    },
    update: {
      name: DEMO_STORE.name,
      description: DEMO_STORE.description,
    },
  })
  console.log(`[seed] Demo store: ${demoStore.id}`)

  // ---- Step 3: Module license ----
  // Dev: grant all modules for full feature testing.
  // Prod: only 'core' (new stores in prod default to core per D19).
  const modules = process.env.NODE_ENV === 'production' ? ['core'] : ALL_MODULES
  await prisma.moduleLicense.upsert({
    where: { storeId: demoStore.id },
    create: {
      storeId: demoStore.id,
      modules,
      grantedAt: new Date(),
      grantedBy: SEEDER_GRANTED_BY,
    },
    update: {
      modules,
    },
  })
  console.log(`[seed] Module license: ${modules.join(', ')}`)

  console.log('[seed] Phase 9a complete — roles/staff/menu/tables pending (Task 9b)')
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error('[seed] FAILED:', e)
    prisma.$disconnect()
    process.exit(1)
  })
EOF
```

- [ ] **Step 3：更新 `server/package.json` 加 prisma.seed 配置**

检查 `server/package.json` 是否有 `"prisma": { "seed": "..." }` 配置：

```bash
grep -A 2 '"prisma"' server/package.json
```

如果没有，加入：

```json
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  },
```

（放在 `"devDependencies"` 之前）。

- [ ] **Step 4：跑 seed 验证前 3 步**

前置：需要一个本地 postgres，和 migrations 已应用。如果 docker-compose 还没写（Task 10 才写），用临时容器：

```bash
docker run -d --name postgres-seed-test \
  -e POSTGRES_DB=qr_order \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=test \
  -p 15432:5432 \
  postgres:16

sleep 5

cd server
export DATABASE_URL="postgresql://postgres:test@localhost:15432/qr_order"
pnpm prisma migrate deploy
pnpm prisma db seed
```

预期输出：
```
Applying migration `20260417000001_init`
Applying migration `20260417000002_rls_and_roles`
Applying migration `20260417000003_seed_platform_admin`

All migrations have been successfully applied.

[seed] Starting…
[seed] Super-admin password left as migration default ("changeme") — change immediately
[seed] Demo store: 00000000-0000-0000-0000-000000000001
[seed] Module license: core, analytics, coupons, waitlist, printer, staff-management
[seed] Phase 9a complete — roles/staff/menu/tables pending (Task 9b)
```

- [ ] **Step 5：psql 验收 3 条记录**

```bash
docker exec postgres-seed-test psql -U postgres -d qr_order -c \
  "SELECT email, role FROM platform_admins"
# 预期：1 行 admin@saas.local / super-admin

docker exec postgres-seed-test psql -U postgres -d qr_order -c \
  "SELECT id, name FROM stores"
# 预期：1 行 demo store

docker exec postgres-seed-test psql -U postgres -d qr_order -c \
  "SELECT store_id, array_length(modules, 1) AS module_count FROM module_licenses"
# 预期：1 行 demo-store / 6 (dev) 或 1 (prod)
```

- [ ] **Step 6：保留容器给 Task 9b 复用**

**不要**清理 `postgres-seed-test` 容器——Task 9b 会继续用它验证后续 seed 步骤，避免重复启动/migrate。

最终清理由 Task 10 负责：Task 10 写完 `docker-compose.yml` 后，停掉 `postgres-seed-test` 并切换到 compose 管理的 `postgres` 服务。在这之前，`DATABASE_URL` 保持指向 `localhost:15432`。

```bash
# 确认容器还活着（下个 task 要用）
docker ps --format "{{.Names}}\t{{.Status}}" | grep postgres-seed-test
# 预期：postgres-seed-test    Up X seconds

# DATABASE_URL 保持 export，不要 unset
echo $DATABASE_URL
# 预期：postgresql://postgres:test@localhost:15432/qr_order
```

- [ ] **Step 7：commit**

```bash
git add server/prisma/seed.ts server/prisma/seed-data/store.ts server/package.json
git commit -m "feat(phase-5): seed platform admin + demo store + module license

Step 1-3 of seed flow (roles/staff/menu/tables come in Task 9b).
Super-admin password resets from DEMO_PLATFORM_ADMIN_PASSWORD env if set.
Demo store module license: all modules in dev, only core in prod.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 9b：seed.ts — system roles + owner staff + menu + tables

**Files:**
- Modify: `server/prisma/seed.ts`（追加 step 4-6）
- Create: `server/prisma/seed-data/menu.ts`
- Create: `server/prisma/seed-data/tables.ts`
- Create: `server/src/lib/ensure-system-roles.ts`（可共享到 Phase E 的 role service）

**前置**：Task 9a 完成。

- [ ] **Step 1：写 ensure-system-roles helper**

这个 helper 在 seed 和 Phase E 的 role service 里都会用。

```bash
mkdir -p server/src/lib

cat > server/src/lib/ensure-system-roles.ts <<'EOF'
import type { Prisma } from '@prisma/client'

export const SYSTEM_ROLE_TEMPLATES = {
  owner: {
    // Owner gets every permission that exists in MODULES (subject to licensing).
    // We use a wildcard sentinel — at query time, effectivePerms = all permissions
    // intersected with store's licensed modules.
    permissions: ['*'] as const,
  },
  manager: {
    permissions: [
      'orders:read', 'orders:write',
      'menu:read', 'menu:write',
      'staff:read', 'staff:write',
      'clock:read', 'clock:write',
      'coupons:read', 'coupons:write',
      'analytics:read',
      'waitlist:read', 'waitlist:write',
      'printer:read',
    ] as const,
  },
  staff: {
    permissions: [
      'orders:read', 'orders:write',
      'menu:read',
      'clock:read', 'clock:write',
      'waitlist:read', 'waitlist:write',
    ] as const,
  },
} as const

export type SystemRoleName = keyof typeof SYSTEM_ROLE_TEMPLATES

type Db = Prisma.TransactionClient | {
  role: { upsert: (args: Prisma.RoleUpsertArgs) => unknown }
}

/**
 * Idempotent: creates or updates the three system roles for a store.
 * Called from seed.ts and from createStore (platform admin action).
 */
export async function ensureSystemRoles(db: Db, storeId: string): Promise<void> {
  for (const [name, template] of Object.entries(SYSTEM_ROLE_TEMPLATES)) {
    await db.role.upsert({
      where: { storeId_name: { storeId, name } },
      create: {
        storeId,
        name,
        permissions: [...template.permissions],
        isSystem: true,
      },
      update: {
        // Keep permissions synced with latest template (D20 intent).
        // Admin-created roles are not touched (isSystem: false).
        permissions: [...template.permissions],
        isSystem: true,
      },
    })
  }
}
EOF
```

- [ ] **Step 2：写 menu seed data**

```bash
cat > server/prisma/seed-data/menu.ts <<'EOF'
// Demo menu data for the seeded store.
// Prices in cents. Update here when changing default seed menu.

export const DEMO_CATEGORIES = [
  { id: '00000000-0000-0000-0000-000000000c01', name: 'Drinks',     sortOrder: 0 },
  { id: '00000000-0000-0000-0000-000000000c02', name: 'Appetizers', sortOrder: 1 },
  { id: '00000000-0000-0000-0000-000000000c03', name: 'Mains',      sortOrder: 2 },
  { id: '00000000-0000-0000-0000-000000000c04', name: 'Desserts',   sortOrder: 3 },
] as const

export const DEMO_MENU_ITEMS = [
  // Drinks
  { id: '00000000-0000-0000-0000-000000000m01', categoryId: '00000000-0000-0000-0000-000000000c01', name: 'Coke',         price: 300,  sortOrder: 0 },
  { id: '00000000-0000-0000-0000-000000000m02', categoryId: '00000000-0000-0000-0000-000000000c01', name: 'Sprite',       price: 300,  sortOrder: 1 },
  { id: '00000000-0000-0000-0000-000000000m03', categoryId: '00000000-0000-0000-0000-000000000c01', name: 'Iced Tea',     price: 350,  sortOrder: 2 },
  // Appetizers
  { id: '00000000-0000-0000-0000-000000000m04', categoryId: '00000000-0000-0000-0000-000000000c02', name: 'Spring Rolls', price: 650,  sortOrder: 0 },
  { id: '00000000-0000-0000-0000-000000000m05', categoryId: '00000000-0000-0000-0000-000000000c02', name: 'Edamame',      price: 500,  sortOrder: 1 },
  // Mains
  { id: '00000000-0000-0000-0000-000000000m06', categoryId: '00000000-0000-0000-0000-000000000c03', name: 'Kung Pao Chicken', price: 1580, sortOrder: 0 },
  { id: '00000000-0000-0000-0000-000000000m07', categoryId: '00000000-0000-0000-0000-000000000c03', name: 'Beef Noodles',     price: 1480, sortOrder: 1 },
  { id: '00000000-0000-0000-0000-000000000m08', categoryId: '00000000-0000-0000-0000-000000000c03', name: 'Veggie Fried Rice', price: 1080, sortOrder: 2 },
  // Desserts
  { id: '00000000-0000-0000-0000-000000000m09', categoryId: '00000000-0000-0000-0000-000000000c04', name: 'Mango Pudding', price: 650, sortOrder: 0 },
] as const

export const DEMO_MENU_OPTIONS = [
  // Coke: ice / no ice
  { id: '00000000-0000-0000-0000-000000000o01', menuItemId: '00000000-0000-0000-0000-000000000m01', groupName: 'Ice',  name: 'Regular ice', priceAdjust: 0, isDefault: true,  sortOrder: 0 },
  { id: '00000000-0000-0000-0000-000000000o02', menuItemId: '00000000-0000-0000-0000-000000000m01', groupName: 'Ice',  name: 'No ice',      priceAdjust: 0, isDefault: false, sortOrder: 1 },
  // Kung Pao: spice
  { id: '00000000-0000-0000-0000-000000000o03', menuItemId: '00000000-0000-0000-0000-000000000m06', groupName: 'Spice', name: 'Mild',   priceAdjust: 0,   isDefault: true,  sortOrder: 0 },
  { id: '00000000-0000-0000-0000-000000000o04', menuItemId: '00000000-0000-0000-0000-000000000m06', groupName: 'Spice', name: 'Medium', priceAdjust: 0,   isDefault: false, sortOrder: 1 },
  { id: '00000000-0000-0000-0000-000000000o05', menuItemId: '00000000-0000-0000-0000-000000000m06', groupName: 'Spice', name: 'Hot',    priceAdjust: 0,   isDefault: false, sortOrder: 2 },
  { id: '00000000-0000-0000-0000-000000000o06', menuItemId: '00000000-0000-0000-0000-000000000m06', groupName: 'Extra', name: 'Extra peanuts', priceAdjust: 100, isDefault: false, sortOrder: 3 },
] as const
EOF
```

- [ ] **Step 3：写 tables seed data**

```bash
cat > server/prisma/seed-data/tables.ts <<'EOF'
// Demo tables A01 - A10.
// qrCode is the URL-safe slug rendered in QR codes — must be globally unique.

export const DEMO_TABLES = Array.from({ length: 10 }, (_, i) => {
  const n = i + 1
  const label = `A${n.toString().padStart(2, '0')}`  // A01, A02, …
  return {
    id: `00000000-0000-0000-0000-0000000t${n.toString().padStart(4, '0')}`,
    label,
    qrCode: `demo-${label.toLowerCase()}`,
    capacity: 4,
  }
})
EOF
```

- [ ] **Step 4：在 seed.ts 追加 step 4-6**

Edit the file:

```bash
# 把 Task 9a 写的 seed.ts 末尾的 console.log + main().then 替换
```

在 `console.log('[seed] Phase 9a complete — roles/staff/menu/tables pending (Task 9b)')` 这行**之前**插入 step 4-6：

```ts
  // ---- Step 4: System roles ----
  const { ensureSystemRoles } = await import('../src/lib/ensure-system-roles.js')
  await ensureSystemRoles(prisma, demoStore.id)
  console.log('[seed] System roles (owner/manager/staff) ensured')

  // ---- Step 5: Owner staff account ----
  const ownerRole = await prisma.role.findFirst({
    where: { storeId: demoStore.id, name: 'owner' },
  })
  if (!ownerRole) throw new Error('owner role not found after ensureSystemRoles')
  const ownerPassword = process.env.DEMO_OWNER_PASSWORD ?? 'changeme'
  const ownerHash = await bcrypt.hash(ownerPassword, 10)
  await prisma.staff.upsert({
    where: { storeId_username: { storeId: demoStore.id, username: 'owner@demo.local' } },
    create: {
      storeId: demoStore.id,
      username: 'owner@demo.local',
      passwordHash: ownerHash,
      roleId: ownerRole.id,
      displayName: 'Demo Owner',
    },
    update: { passwordHash: ownerHash, roleId: ownerRole.id },
  })
  console.log(`[seed] Owner staff: owner@demo.local (password: ${process.env.DEMO_OWNER_PASSWORD ? '<env>' : 'changeme'})`)

  // ---- Step 6: Menu + tables ----
  const { DEMO_CATEGORIES, DEMO_MENU_ITEMS, DEMO_MENU_OPTIONS } = await import('./seed-data/menu.js')
  const { DEMO_TABLES } = await import('./seed-data/tables.js')

  for (const cat of DEMO_CATEGORIES) {
    await prisma.category.upsert({
      where: { id: cat.id },
      create: { id: cat.id, storeId: demoStore.id, name: cat.name, sortOrder: cat.sortOrder },
      update: { name: cat.name, sortOrder: cat.sortOrder },
    })
  }
  console.log(`[seed] Categories: ${DEMO_CATEGORIES.length}`)

  for (const item of DEMO_MENU_ITEMS) {
    await prisma.menuItem.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        storeId: demoStore.id,
        categoryId: item.categoryId,
        name: item.name,
        price: item.price,
        sortOrder: item.sortOrder,
      },
      update: { name: item.name, price: item.price, sortOrder: item.sortOrder },
    })
  }
  console.log(`[seed] Menu items: ${DEMO_MENU_ITEMS.length}`)

  for (const opt of DEMO_MENU_OPTIONS) {
    await prisma.menuItemOption.upsert({
      where: { id: opt.id },
      create: {
        id: opt.id,
        storeId: demoStore.id,
        menuItemId: opt.menuItemId,
        groupName: opt.groupName,
        name: opt.name,
        priceAdjust: opt.priceAdjust,
        isDefault: opt.isDefault,
        sortOrder: opt.sortOrder,
      },
      update: {
        priceAdjust: opt.priceAdjust,
        isDefault: opt.isDefault,
      },
    })
  }
  console.log(`[seed] Menu options: ${DEMO_MENU_OPTIONS.length}`)

  for (const t of DEMO_TABLES) {
    await prisma.table.upsert({
      where: { id: t.id },
      create: {
        id: t.id,
        storeId: demoStore.id,
        label: t.label,
        qrCode: t.qrCode,
        capacity: t.capacity,
      },
      update: { label: t.label, capacity: t.capacity },
    })
  }
  console.log(`[seed] Tables: ${DEMO_TABLES.length}`)
```

然后替换末尾的 `console.log` 行：

```ts
  console.log('[seed] Complete ✓')
```

- [ ] **Step 5：跑 seed 验证（复用 Task 9a 留下的容器）**

前置：Task 9a Step 6 的 `postgres-seed-test` 容器还在跑，migrations 已 apply，`DATABASE_URL` 仍指向 localhost:15432。

```bash
# 确认容器和 DATABASE_URL 可用
docker ps --format "{{.Names}}" | grep postgres-seed-test
echo $DATABASE_URL

cd server
pnpm prisma db seed
```

预期输出：
```
[seed] Starting…
[seed] Super-admin password left as migration default ("changeme") — change immediately
[seed] Demo store: 00000000-0000-0000-0000-000000000001
[seed] Module license: core, analytics, coupons, waitlist, printer, staff-management
[seed] System roles (owner/manager/staff) ensured
[seed] Owner staff: owner@demo.local (password: changeme)
[seed] Categories: 4
[seed] Menu items: 9
[seed] Menu options: 6
[seed] Tables: 10
[seed] Complete ✓
```

- [ ] **Step 6：psql 完整验收**

```bash
docker exec postgres-seed-test psql -U postgres -d qr_order -c \
  "SELECT COUNT(*) FROM roles WHERE store_id='00000000-0000-0000-0000-000000000001'"
# 预期：3

docker exec postgres-seed-test psql -U postgres -d qr_order -c \
  "SELECT username, display_name FROM staff WHERE store_id='00000000-0000-0000-0000-000000000001'"
# 预期：1 行 owner@demo.local / Demo Owner

docker exec postgres-seed-test psql -U postgres -d qr_order -c \
  "SELECT COUNT(*) FROM menu_items WHERE store_id='00000000-0000-0000-0000-000000000001'"
# 预期：9

docker exec postgres-seed-test psql -U postgres -d qr_order -c \
  "SELECT COUNT(*) FROM tables WHERE store_id='00000000-0000-0000-0000-000000000001'"
# 预期：10

# 幂等性验证 —— 再跑一次不应该失败或重复
pnpm prisma db seed
```

第二次跑 seed 应该一样输出，**不报 unique violation**。

- [ ] **Step 7：bcrypt 验证 owner 密码能对上**

```bash
docker exec postgres-seed-test psql -U postgres -d qr_order -c \
  "SELECT password_hash FROM staff WHERE username='owner@demo.local'" -t \
  | head -1 | tr -d ' ' > /tmp/owner-hash.txt

cat /tmp/owner-hash.txt

# 在 Node 里验证
cd server
node -e "
const bcrypt = require('bcryptjs')
const hash = require('fs').readFileSync('/tmp/owner-hash.txt', 'utf-8').trim()
console.log('match changeme:', bcrypt.compareSync('changeme', hash))
"
```

预期：`match changeme: true`

- [ ] **Step 8：保留容器给 Task 10 切换**

**不要**清理 `postgres-seed-test`。Task 10 的 `docker-compose.yml` 要建立正式的 postgres 服务，届时 Task 10 第一步就是停掉这个临时容器、切到 compose 管理的容器。在这之前保持 `DATABASE_URL` 指向 localhost:15432。

```bash
# 确认容器仍在
docker ps --format "{{.Names}}\t{{.Status}}" | grep postgres-seed-test
# DATABASE_URL 保持不 unset
echo $DATABASE_URL
```

- [ ] **Step 9：commit**

```bash
git add server/prisma/seed.ts \
        server/prisma/seed-data/menu.ts \
        server/prisma/seed-data/tables.ts \
        server/src/lib/ensure-system-roles.ts
git commit -m "feat(phase-5): seed system roles + owner + menu + tables

- ensureSystemRoles helper (shared with Phase E role service)
- Demo menu: 4 categories / 9 items / 6 options
- Demo tables: A01-A10
- Owner staff: owner@demo.local (password from DEMO_OWNER_PASSWORD env or 'changeme')
- Seed is idempotent — safe to re-run

Acceptance: owner@demo.local can be used to log in after Phase E staff auth migrates.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

**暂停**——等你 feedback 再续写 Task 10 + Phase C + D。

# Phase 5: PostgreSQL 迁移 + Cart/Order 合并（B2）— 设计文档

**Date**: 2026-04-17
**Status**: Approved for writing-plans
**Scope**: 数据层从 JsonStore 全量迁移至 PostgreSQL（Prisma）+ Cart 并入 Order（`status='draft'`）+ 多租户 RLS + Platform Admin 体系 + 自托管部署

---

## 0. Executive Summary

将 `server/data/*.json` + 同步 `JsonStore` 替换为 PostgreSQL + Prisma。一次性切换，无双写过渡期。同步完成三项附带目标：

1. **Cart 并入 Order**（B2）—— 消除 `session.pendingCart` 与订单结构重复，顺带修复 Pay-first 流购物车丢失 bug
2. **RLS 多租户强制** —— DB 层挡住跨租户数据泄漏（修复 CLAUDE.md 标记的 P0 安全问题）
3. **Platform Admin 体系** —— SaaS 三层权限（Platform → Store Owner → Staff）完整落地

**不包含**：报表/账单 UI（Phase 3）、托管数据库（EC2 自托管足够 MVP）、CI/CD pipeline（手动 SSH 部署）、渐进式灰度（一次性切）。

**风险最高的改动**：Stage 3c 第 3 步 session-cart.ts B2 重写。加硬性手动 checkpoint。

---

## 1. 决策登记表（Decisions Registry）

| # | 决策 | 选择 | 备注 |
|---|---|---|---|
| D1 | 切换策略 | 一次性切换（one-shot） | 开发阶段无真实数据 |
| D2 | ORM | Prisma | schema 文件已在仓库 |
| D3 | 多租户模型 | 共享 schema + `store_id` + **Postgres RLS** | 云端统一存储，DB 层强制隔离 |
| D4 | 嵌套数据处理 | 全关系化（B 方案） | JSONB 仅用于真·无查询需求字段 |
| D5 | Cart/Order 模型 | **B2 + 工程化防御** | cart = `orders.status='draft'` |
| D6 | 附带修复 | Pay-first 购物车丢失 bug | B2 天然解决 |
| D7 | 乐观锁位置 | `orders.version`（每 draft 行） | 从 `session.cartVersion` 迁移 |
| D8 | 部署环境 | EC2 + Docker Compose 自托管 | MVP 成本优先，显式接受代价 |
| D9 | 报表/账单 UI | 不在 Phase 5 | Phase 3 UI 阶段做，Schema 提前铺索引 |
| D10 | Prisma 命名 | snake_case DB / camelCase client / @map 桥接 | |
| D11 | 主键 | UUID 字符串 | 与当前 JsonStore id 一致 |
| D12 | 金额 | `Int` 分 | CLAUDE.md 铁律 |
| D13 | 时间戳 | `timestamptz` UTC | 前端转本地 |
| D14 | PlatformAdmin 实体 | 独立表（与 Staff 彻底分离） | 安全隔离 |
| D15 | ModuleLicense 关系 | 1:1 with Store | 每店一条 |
| D16 | 权限校验 | Service 层 + JWT 签发二次交集 | 不做 DB CHECK constraint |
| D17 | Platform API 路由 | `/api/platform/*` 独立前缀 + 独立中间件 | |
| D18 | 权限/模块模型 | 纯字符串 + 单一注册中心 `shared/modules.ts` | 加新权限零 DB migration |
| D19 | 新店铺默认 | 仅授予 `core` 模块 | SaaS 主动决策其他模块 |
| D20 | CI 防过时 | 扫代码中 `requirePermission` 校验注册一致性 | |
| D21 | 中间件装饰器 | `tenantAwareRoute` 消除 boilerplate | |
| D22 | RLS 覆盖测试 | `rls-coverage.test.ts` 自动遍历 store_id 表 | |
| D23 | 类型判别联合 | `DraftOrder` / `SubmittedOrder` 编译期防混用 | |
| D24 | Repository 默认排除 draft | `orderRepo.findSubmitted` 默认、`findDraft` 显式 | |
| D25 | 请求-事务绑定 | "一请求一 DB 事务"，`withTenantContext` 唯一 tx 边界 | |
| D26 | Repo 方法签名 | `db: Db = prisma` 统一接受 tx | 读写统一接受 `PrismaClient` 或 `TransactionClient` |
| D27 | SSE emit 时机 | 仅在 tx commit 后 | polling 兜底 |
| D28 | 服务端重试 | 无（前端 + Stripe 各自负责） | |
| D29 | 外部 API 与事务 | 外部调用在 tx 前/后，用幂等键防重 | |
| D30 | Draft Order 归属 | 每 `(session_id, device_id)` 一个 | partial unique index 强制 |
| D31 | DB Roles | `app_user`（受 RLS）/ `platform_admin`（BYPASSRLS）/ `system_worker`（后台任务，BYPASSRLS） | 三 role 分离 |
| D32 | Migration 编排 | 3 个独立命名目录：init + rls_and_roles + seed_platform_admin | |
| D33 | RLS 严格模式 | `current_setting('app.current_store_id')` 无 fallback，missing 时抛错 | |
| D34 | Junction 表 store_id | 所有子表冗余 `store_id` 列 | 不用 EXISTS 子查询 |
| D35 | Seed 方式 | 代码化 `seed.ts` + `seed-data/*.ts` 常量 | 不读 JSON |
| D36 | JSON 导入脚本 | 保留但不接入启动 | 应急工具 |
| D37 | 测试 DB | 独立容器 + tmpfs + `TRUNCATE CASCADE` | |
| D38 | 密码管理 | AWS SSM Parameter Store + EC2 IAM role | 生产 `.env` 禁用 |
| D39 | 备份策略 | 每天 `pg_dump` + S3 Standard-IA + lifecycle Glacier | 对齐 UTC 09:00，`pg_restore --list` 验证 |
| D40 | 部署流程 | SSH 手动 `git pull + build + up` | 部署前打 git tag |
| D41 | Compose 分层 | 基础设施层（postgres + nginx）+ 应用层（server + client + backup） | 部署只重启应用层 |
| D42 | Postgres 调优 | `shared_buffers=256MB` / `work_mem=4MB` / `max_connections=50` | t4g.small 必做 |
| D43 | Stage 3a | 串行 A → B → C，不开 worktree | |
| D44 | Stage 3b | platform admin 独立 agent 并行 | 零冲突 |
| D45 | Stage 3c | 主 agent 独占串行 | session+order+payment+settlement+split 耦合密集 |
| D46 | Stage 6 | 部署 → SSH 验证 → 文档（串行） | 文档反映真实行为 |
| D47 | Stage -1 | 备份 EC2 当前演示数据（stores/categories/menu_items/tables） | 新环境用 import-legacy-json.ts 恢复 |
| D48 | Stage 5 | JsonStore 软删除到 `_archive/*.bak`，EC2 稳定 7 天后物理删 | |
| D49 | Stage 7 e2e | 环境守卫（拒绝 prod DATABASE_URL），永不对 prod 跑 | |
| D50 | B2 Checkpoint | Stage 3c 第 3 步后硬性暂停，用户手动验证 7 个场景（a-g 独立 pass/fail） | |
| D51 | 测试断言迁移 | `docs/superpowers/work-logs/` 下维护老测试 → 新测试映射表，"弱化"条目必须写 Why | |
| D52 | 读写参数策略 | 写操作 repo 方法的 `db` 参数**必填**，读操作可保留默认值 | 防止写操作漏传 tx 破坏原子性；读操作漏传仅降级到非 tx 隔离，影响小 |
| D53 | Repository 层形态 | 11 个语义化 repo 文件（一 entity 一文件，含该 entity 的业务方法），**不做通用 CRUD 适配器**。old `stores.ts` Phase D 不动，Phase E/F/G 逐域替换 import，Phase I 删除 | 生产代码 grep 显示 JsonStore 被同步链/非空断言/`session.orderIds` 专属字段深度嵌入——"生成通用适配器 + 加 await" 跑不起来，每个 call site 都要语义重写，不如直接去语义化 repo |
| D54 | Phase D 切换层面 | **一次性切换是 storage 层（JSON → Postgres），业务层是渐进迁移**。Phase D 新增 Prisma repo 就位、`stores.ts` / JsonStore 不动、**应用照常启动**。Phase E/F/G 才逐域替换业务代码 import | 纠正 spec §9.5 原验收（"tsc -b 通过 + 基本登录跑通"）的空想——storage/业务层混为一谈。D54 把两层分开 |
| D55 | 多步写操作参数窄化（D26 精化） | 方法内有 ≥2 次 DB round-trip 且依赖前后一致性的写操作，`db` 参数类型窄化为 `Prisma.TransactionClient`（不是 `Db` 联合）。单步写（`createDraftOrder` 嵌套 create、`updateStatus`）不受约束 | D26 说"读写统一接受 PrismaClient 或 TransactionClient"，D55 对**多步写**进一步收紧——否则乐观锁 WHERE 检查 + 后续 write 跨独立 connection 会破坏原子性保证。编译期强制 caller 必须 withTenantContext |
| D56 | itemKey 模型重构 — DB FK + API 薄兼容层 | **DB 层**：PaymentItem / SplitBillItem 用 `(orderItemId FK, quantity)`，彻底删 itemKey 字符串列。**Service/Repository 层**：纯 FK 模型。**Controller 边界**：1cm 薄转换层集中在 `server/src/lib/legacy-itemkey.ts`（`parseItemKey` / `formatItemKey`）。Phase G 废弃 5 处散落 `.split(':')`，前端 API 契约不变 | 2026-04-17 Phase D 段 2a grep 发现 spec §4.1 原 itemKey 设计（"稳定 UUID，跨选项变更保持"）与现有 legacy 代码事实不符——实际 legacy 是派生字符串 `orderId:idx:qty`，5 处代码重复 `.split(':')`。B 方案 FK 化 + API 层保字符串兼容，兼顾事实 + Phase 5 scope 控制（D47 兜底，legacy 59 条 Payment 数据不迁移）|
| D57 | OrderItem.position 稳定 idx 契约 | OrderItem 新增 `position Int` 列 + `@@unique([orderId, position])`；position 由 caller 在嵌套 create 时显式填充（0-indexed）；`replaceDraftItems` 重排时重新分配 `0..N-1`。所有 repo `include: { items: { orderBy: { position: 'asc' }}}`。替代原本（错误设计的）`itemKey` UUID 列。**迁移语义**：Phase 5 实施尚未到 Task 3，plan 文档里 init migration SQL 直接并入此改动，不走增量 migration；Task 3 实施后若 init migration 已应用到任何环境，后续任何 OrderItem/PaymentItem schema 改动必须走增量 migration（规则 1） | grep 证据：legacy 代码 `order.items[idx]` 在 FIFO 归因 / split 冲突检测 / pay-by-item 是稳定契约（session-state.ts:107、split-bill.service.ts:55、settlement/rules.ts:57）。Prisma 嵌套 create 不保证返回顺序——position 列显式锚定 |

---

## 2. 当前现状（Baseline）

**源于 2026-04-17 对 EC2 的确认**：

- EC2 已经跑 Docker Compose（无架构大翻新）
- 没有真实餐厅入驻（演示/测试阶段）
- 现有 `server/data/*.json` 16 个文件 ~5000 行，~249 处 JsonStore 调用分布 30+ 文件
- 现有 `server/prisma/schema.prisma` 仅定义过时的 Store + StoreUser（本次推翻重写）
- 死代码：`bills.json`、`splits.json` 无引用，Phase 5 不迁移，Stage 5 归档

---

## 3. Schema 总览

### 命名约定

| 层 | 风格 |
|---|---|
| DB 表名 | `snake_case` 复数（`order_items`） |
| DB 列名 | `snake_case`（`store_id`、`created_at`） |
| Prisma model | `PascalCase` 单数（`OrderItem`） |
| Prisma 字段 | `camelCase`（`storeId`、`createdAt`） |

用 Prisma `@map` / `@@map` 桥接两边。

### 主键与外键

- 主键：UUID 字符串（`@default(uuid())`）
- 外键：`onDelete: Cascade` 或 `Restrict`，按语义
- 业务表必带 `store_id` 外键 + 索引
- 子/关联表也带冗余 `store_id` 列（D34）

### 时间戳 / 金额

- `created_at` / `updated_at`：标配
- `timestamptz` UTC 存储（D13）
- 金额 `Int` 存分（D12）

### 主表清单（15 张主表 + 6-8 张子表）

```
[租户 & 权限]     stores, staff, roles, module_licenses, platform_admins
[店铺配置]       tables, categories, menu_items, menu_item_options
[业务核心]       sessions, orders, order_items, order_item_options
[支付]          payments, payment_items
[分账]          split_bills, split_bill_items
[外围]          coupons, waitlist, time_entries, printers
```

### 废弃

- `bills.json`、`splits.json` 不迁移（dead code）

### 本节决策点（§3）

- D10 命名约定
- D11 UUID 主键
- D12 金额 Int
- D13 时间戳 timestamptz

---

## 4. Schema 详细 + 权限模型

### 4.1 完整 Prisma Schema 骨架

```prisma
// ========== 租户 & 权限 ==========

model Store {
  id            String          @id @default(uuid())
  name          String
  description   String?
  openingHours  String?         @map("opening_hours")
  announcement  String?
  logo          String?
  tipBase       String          @default("pretax")  // 'pretax' | 'posttax'
  createdAt     DateTime        @default(now())     @map("created_at")
  updatedAt     DateTime        @updatedAt          @map("updated_at")
  
  moduleLicense ModuleLicense?
  tables        Table[]
  // ... 其他反向关联
  
  @@map("stores")
}

model PlatformAdmin {
  id           String    @id @default(uuid())
  email        String    @unique
  passwordHash String    @map("password_hash")
  role         String    // 'super-admin' | 'support' | 'billing-ops'
  isActive     Boolean   @default(true) @map("is_active")
  lastLoginAt  DateTime? @map("last_login_at")
  createdAt    DateTime  @default(now()) @map("created_at")
  
  @@map("platform_admins")
}

model ModuleLicense {
  id        String   @id @default(uuid())
  storeId   String   @unique @map("store_id")
  store     Store    @relation(fields: [storeId], references: [id], onDelete: Cascade)
  modules   String[] // ['core', 'analytics', ...]
  grantedAt DateTime @map("granted_at")
  grantedBy String   @map("granted_by")  // platformAdminId（审计）
  note      String?
  
  @@map("module_licenses")
}

model Role {
  id          String   @id @default(uuid())
  storeId     String   @map("store_id")
  name        String
  permissions String[] // 必须是该 store.licensedPermissions 子集（service 层校验）
  isSystem    Boolean  @default(false) @map("is_system")
  createdAt   DateTime @default(now()) @map("created_at")
  
  @@unique([storeId, name])
  @@map("roles")
}

model Staff {
  id           String    @id @default(uuid())
  storeId      String    @map("store_id")
  username     String
  passwordHash String    @map("password_hash")
  roleId       String?   @map("role_id")
  clockPin     String?   @map("clock_pin")
  displayName  String?   @map("display_name")
  createdAt    DateTime  @default(now()) @map("created_at")
  
  @@unique([storeId, username])
  @@map("staff")
}

// ========== 店铺配置 ==========

model Table {
  id                String   @id @default(uuid())
  storeId           String   @map("store_id")
  label             String
  qrCode            String   @unique @map("qr_code")
  capacity          Int?
  currentSessionId  String?  @map("current_session_id")
  createdAt         DateTime @default(now()) @map("created_at")
  
  @@map("tables")
}

model Category {
  id        String   @id @default(uuid())
  storeId   String   @map("store_id")
  name      String
  sortOrder Int      @default(0) @map("sort_order")
  isActive  Boolean  @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at")
  
  @@map("categories")
}

model MenuItem {
  id          String              @id @default(uuid())
  storeId     String              @map("store_id")
  categoryId  String              @map("category_id")
  name        String
  description String?
  imageUrl    String?             @map("image_url")
  price       Int                 // cents
  isAvailable Boolean  @default(true)  @map("is_available")
  isStaffOnly Boolean  @default(false) @map("is_staff_only")
  sortOrder   Int      @default(0)      @map("sort_order")
  createdAt   DateTime @default(now())  @map("created_at")
  updatedAt   DateTime @updatedAt       @map("updated_at")
  
  options     MenuItemOption[]
  
  @@index([storeId, categoryId])
  @@map("menu_items")
}

model MenuItemOption {
  id          String   @id @default(uuid())
  storeId     String   @map("store_id")  // 冗余，RLS 用
  menuItemId  String   @map("menu_item_id")
  menuItem    MenuItem @relation(fields: [menuItemId], references: [id], onDelete: Cascade)
  groupName   String   @map("group_name")
  name        String
  priceAdjust Int      @default(0) @map("price_adjust")
  isDefault   Boolean  @default(false) @map("is_default")
  sortOrder   Int      @default(0) @map("sort_order")
  
  @@map("menu_item_options")
}

// ========== 业务核心（B2） ==========

model Session {
  id              String    @id @default(uuid())
  storeId         String    @map("store_id")
  tableId         String    @map("table_id")
  status          String    // 'open' | 'closed'
  settlementMode  String    @default("unset") @map("settlement_mode")
  // 优惠券快照（展平，不用 JSONB）
  couponCode      String?   @map("coupon_code")
  couponType      String?   @map("coupon_type")
  couponValue     Int?      @map("coupon_value")
  couponAppliedAt DateTime? @map("coupon_applied_at")
  
  closedAt        DateTime? @map("closed_at")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  
  @@index([storeId, status])
  @@index([tableId])
  @@map("sessions")
}

model Order {
  id                  String    @id @default(uuid())
  storeId             String    @map("store_id")
  tableId             String    @map("table_id")
  sessionId           String?   @map("session_id")
  status              String    // 'draft' | 'pending' | 'preparing' | 'served' | 'voided'
  deviceId            String?   @map("device_id")  // draft 时每设备一个
  version             Int       @default(0)        // 乐观锁
  lastCartActivityAt  DateTime? @map("last_cart_activity_at")
  createdAt           DateTime  @default(now()) @map("created_at")
  updatedAt           DateTime  @updatedAt      @map("updated_at")
  
  items OrderItem[]
  
  @@index([storeId, status])
  @@index([sessionId])
  @@index([storeId, createdAt])
  // partial unique: 一 session + 一 device 最多一个 draft（在 rls_and_roles SQL 建）
  @@map("orders")
}

model OrderItem {
  id         String   @id @default(uuid())
  storeId    String   @map("store_id")  // 冗余
  orderId    String   @map("order_id")
  order      Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  menuItemId String   @map("menu_item_id")
  position   Int                          // D57：稳定 idx 契约，caller 填 0-indexed
  name       String
  unitPrice  Int      @map("unit_price")
  quantity   Int
  note       String?

  options        OrderItemOption[]
  paymentItems   PaymentItem[]
  splitBillItems SplitBillItem[]

  @@unique([orderId, position])
  @@index([orderId])
  @@index([menuItemId])
  @@map("order_items")
}

model OrderItemOption {
  id           String    @id @default(uuid())
  storeId      String    @map("store_id")  // 冗余
  orderItemId  String    @map("order_item_id")
  orderItem    OrderItem @relation(fields: [orderItemId], references: [id], onDelete: Cascade)
  groupName    String    @map("group_name")
  name         String
  priceAdjust  Int       @default(0) @map("price_adjust")
  
  @@map("order_item_options")
}

// ========== 支付 ==========

model Payment {
  id                    String    @id @default(uuid())
  storeId               String    @map("store_id")
  sessionId             String    @map("session_id")
  method                String    // 'stripe' | 'cash'
  amount                Int       // cents (not including tip)
  tipAmount             Int       @default(0) @map("tip_amount")
  taxAmount             Int       @default(0) @map("tax_amount")
  stripePaymentIntentId String?   @map("stripe_payment_intent_id")
  status                String    // 'pending' | 'confirmed' | 'refunded'
  createdAt             DateTime  @default(now()) @map("created_at")
  
  items PaymentItem[]
  
  @@index([storeId, createdAt])
  @@index([sessionId])
  @@map("payments")
}

model PaymentItem {
  id           String     @id @default(uuid())
  storeId      String     @map("store_id")  // 冗余
  paymentId    String     @map("payment_id")
  payment      Payment    @relation(fields: [paymentId], references: [id], onDelete: Cascade)
  orderItemId  String     @map("order_item_id")
  orderItem    OrderItem  @relation(fields: [orderItemId], references: [id], onDelete: Restrict)
  paidQuantity Int        @map("paid_quantity")

  @@index([paymentId])
  @@index([orderItemId])
  @@map("payment_items")
}

// ========== 分账 ==========

model SplitBill {
  id                    String    @id @default(uuid())
  storeId               String    @map("store_id")
  sessionId             String    @map("session_id")
  type                  String    // 'by-item' | 'by-percent'
  percent               Int?      // only for by-percent
  subtotal              Int
  tax                   Int
  tip                   Int       @default(0)
  amount                Int       // total
  status                String    // 'active' | 'paid'
  stripePaymentIntentId String?   @map("stripe_payment_intent_id")
  createdAt             DateTime  @default(now()) @map("created_at")
  
  items SplitBillItem[]
  
  @@map("split_bills")
}

model SplitBillItem {
  id           String     @id @default(uuid())
  storeId      String     @map("store_id")  // 冗余
  splitBillId  String     @map("split_bill_id")
  splitBill    SplitBill  @relation(fields: [splitBillId], references: [id], onDelete: Cascade)
  orderItemId  String     @map("order_item_id")
  orderItem    OrderItem  @relation(fields: [orderItemId], references: [id], onDelete: Restrict)
  quantity     Int        @default(1)

  @@index([splitBillId])
  @@index([orderItemId])
  @@map("split_bill_items")
}

// ========== §4.1 事实勘误（2026-04-17） ==========

// ⚠️ 事实勘误（Phase D 段 2a 期间发现）
//
// 本 §4.1 早前版本的 OrderItem.itemKey / PaymentItem.itemKey / SplitBillItem.itemKey
// 列基于**错误事实假设**——假设 legacy 系统 itemKey 是"每个 order_item 创建时分配的
// 稳定 UUID"。实际 grep 显示 legacy itemKey 是派生字符串 "orderId:idx:qty"
// （见 server/src/lib/session-state.ts:121、server/src/controllers/split-bill.service.ts:47、
// 5 处散落 .split(':')），由 FIFO 归因/前端 UI 动态生成，从不持久化为列。
//
// D56 把 DB 层升级为 (orderItemId FK + quantity) 规范化模型；D57 加 OrderItem.position
// 列锚定 idx 契约；Controller 边界保留 legacy 字符串格式作 API 兼容层
// （见 server/src/lib/legacy-itemkey.ts）。
//
// 流程教训：详见 docs/superpowers/plans/2026-04-17-phase5-postgres-migration/00-index.md
// 规则 7（evidence-first for "现有行为" 断言）。

// ========== 外围 ==========

model Coupon {
  id             String    @id @default(uuid())
  storeId        String    @map("store_id")
  code           String
  discountType   String    @map("discount_type")  // 'percent' | 'fixed' | 'manual'
  discountValue  Int       @map("discount_value")
  maxUses        Int?      @map("max_uses")
  currentUses    Int       @default(0) @map("current_uses")
  expiresAt      DateTime? @map("expires_at")
  isActive       Boolean   @default(true) @map("is_active")
  createdAt      DateTime  @default(now()) @map("created_at")
  
  @@unique([storeId, code])
  @@map("coupons")
}

model WaitlistEntry {
  id         String    @id @default(uuid())
  storeId    String    @map("store_id")
  name       String
  phone      String
  partySize  Int       @map("party_size")
  status     String    // 'waiting' | 'notified' | 'seated' | 'abandoned'
  notifiedAt DateTime? @map("notified_at")
  createdAt  DateTime  @default(now()) @map("created_at")
  
  @@index([storeId, status])
  @@map("waitlist_entries")
}

model TimeEntry {
  id          String    @id @default(uuid())
  storeId     String    @map("store_id")
  staffId     String    @map("staff_id")
  clockInAt   DateTime  @map("clock_in_at")
  clockOutAt  DateTime? @map("clock_out_at")
  
  @@map("time_entries")
}

model Printer {
  id        String   @id @default(uuid())
  storeId   String   @map("store_id")
  name      String
  type      String   // 'kitchen' | 'receipt'
  host      String?
  port      Int?
  isEnabled Boolean  @default(true) @map("is_enabled")
  createdAt DateTime @default(now()) @map("created_at")
  
  @@map("printers")
}
```

### 4.2 三层权限模型

```
Tier 1: Platform（SaaS 运营方）
  └─ 拥有全部权限（隐式）
  └─ 授予/回收 ModuleLicense.modules
  └─ 实体：PlatformAdmin
  
  ↓ 通过 ModuleLicense 向下授权
  
Tier 2: Store Owner（店主）
  └─ 权限上限 = store.licensedPermissions（由 ModuleLicense 展开）
  └─ 可创建员工、创建角色、分配权限（只能从上限选）
  └─ 实体：Staff with system role 'owner'
  
  ↓ 通过 Role 向下授权
  
Tier 3: Staff（员工）
  └─ 权限 = role.permissions
  └─ 必须 ⊆ store.licensedPermissions
```

### 4.3 运行时三处守门

1. **API 中间件** —— `requirePlatformAdmin()` 保 `/api/platform/*`，`requirePermission(perm)` 保店铺路由
2. **授予时校验** —— `createRole` / `updateRole` 调用 `resolveLicensedPermissions(storeId)` 交集校验
3. **JWT 签发兜底** —— 登录时 `effectivePerms = role.permissions ∩ store.licensedPermissions`，过期模块权限自动失效

### 4.4 扩展性设计

**单一注册中心** `shared/modules.ts`：

```ts
export const MODULES = {
  core:              { name: 'Core POS',   permissions: ['orders:read', 'orders:write', 'menu:read', ...] },
  analytics:         { name: 'Analytics',  permissions: ['analytics:read'] },
  coupons:           { name: 'Coupons',    permissions: ['coupons:read', 'coupons:write'] },
  waitlist:          { name: 'Waitlist',   permissions: ['waitlist:read', 'waitlist:write'] },
  printer:           { name: 'Printer',    permissions: ['printer:read', 'printer:write'] },
  'staff-management':{ name: 'Staff',      permissions: ['staff:read', 'staff:write', 'clock:read', 'clock:write'] },
  // 未来加模块：加一行即可
} as const

export const ALL_PERMISSIONS = Object.values(MODULES).flatMap(m => m.permissions)
```

**加新权限/模块流程**：

- 场景 A（已有模块加权限）：改 `shared/modules.ts` + 路由加 `requirePermission` + 更新 `ensureSystemRoles`
- 场景 B（新模块）：改 `shared/modules.ts` + 写路由/控制器/前端 + 决定新店默认/现有店铺不自动授予
- 场景 C（新 PlatformAdmin 权限）：`PLATFORM_PERMISSIONS` 常量扩展

**防过时测试**：`__tests__/module-registry.test.ts` 扫 `requirePermission('xxx')` 调用点，校验都在 `ALL_PERMISSIONS` 里。

### 4.5 RLS 策略草图

```sql
-- 应用到所有带 store_id 列的表
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON orders
  USING (store_id = current_setting('app.current_store_id')::uuid);
  -- 注意：无 `, true` fallback，missing 时抛错（D33）
```

### 本节决策点（§4）

- D14 PlatformAdmin 独立表
- D15 ModuleLicense 1:1
- D16 权限校验在 service 层 + JWT 交集
- D17 `/api/platform/*` 独立前缀
- D18 模块/权限字符串化 + 单一注册中心
- D19 新店默认只授 `core`
- D20 CI 幽灵权限测试
- D33 RLS 严格模式
- D34 Junction 表 store_id 冗余

---

## 5. Repository 层 + 类型判别

### 5.1 目录结构

```
server/src/repositories/
├── prisma-client.ts       # 单例 + withTenantContext / withPlatformContext / withSystemContext
├── types.ts               # DraftOrder / SubmittedOrder 判别联合
├── orders.ts              # findSubmitted（默认）+ findDraft（显式）+ submitDraft + upsertDraft
├── sessions.ts
├── payments.ts
├── split-bills.ts
├── menu.ts
├── staff.ts
├── roles.ts               # 含 resolveLicensedPermissions helper
├── coupons.ts
├── waitlist.ts
└── platform-admin.ts      # 独立
```

### 5.2 类型判别联合（B2 核心防御）

```ts
// shared/types.ts
export type OrderStatus = 'draft' | 'pending' | 'preparing' | 'served' | 'voided'
export type DraftOrder = Order & { status: 'draft' }
export type SubmittedOrder = Order & { status: Exclude<OrderStatus, 'draft'> }

export const isDraft = (o: Order): o is DraftOrder => o.status === 'draft'
export const isSubmitted = (o: Order): o is SubmittedOrder => o.status !== 'draft'
```

Settlement / FIFO / summary 函数签名改为吃 `SubmittedOrder[]`，编译期拒绝 draft 流入。

### 5.3 Repository 默认排除 draft

```ts
// repositories/orders.ts
type Db = PrismaClient | Prisma.TransactionClient

export const orderRepo = {
  // 95% 场景默认走这个
  findSubmitted: (where: ..., db: Db = prisma) =>
    db.order.findMany({
      where: { ...where, status: { not: 'draft' } },
      include: { items: { include: { options: true } } },
    }) as Promise<SubmittedOrder[]>,
  
  findDraft: (sessionId: string, deviceId?: string, db: Db = prisma) =>
    db.order.findFirst({
      where: { sessionId, status: 'draft', ...(deviceId && { deviceId }) },
      include: { items: { include: { options: true } } },
    }) as Promise<DraftOrder | null>,
  
  submitDraft: (orderId: string, expectedVersion: number, db: Db = prisma) =>
    db.order.update({
      where: { id: orderId, version: expectedVersion, status: 'draft' },
      data: { status: 'pending', version: { increment: 1 } },
    }),
  
  createDraftOrder: (input, db: Db = prisma) => { /* Prisma nested create */ },
  findById: (id: string, db: Db = prisma) => db.order.findUnique({ where: { id } }),
}
```

**Stage 0 规约补充**（D52）：写操作方法（如 `submitDraft`、`createDraftOrder`）的 `db` 参数改为**必填**，读操作保留默认值。

### 5.4 RLS 上下文 wrapper

```ts
// repositories/prisma-client.ts
export const prisma = new PrismaClient()

export async function withTenantContext<T>(storeId: string, fn: (tx) => Promise<T>): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL app.current_store_id = '${escapeUuid(storeId)}'`)
    return fn(tx)
  })
}

export async function withPlatformContext<T>(fn: (tx) => Promise<T>): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL ROLE platform_admin`)
    return fn(tx)
  })
}

// 后台任务用独立连接池 + 独立 DATABASE_URL
export const systemPrisma = new PrismaClient({
  datasources: { db: { url: process.env.SYSTEM_DATABASE_URL }}
})
export async function withSystemContext<T>(fn: (tx) => Promise<T>): Promise<T> {
  return systemPrisma.$transaction(async (tx) => fn(tx))
}
```

### 5.5 中间件装饰器（消除 boilerplate）

```ts
// middleware/tenant-aware.ts
export const tenantAwareRoute = (handler) => async (req, res, next) => {
  try {
    await withTenantContext(req.params.storeId, async (tx) => {
      res.locals.tx = tx
      await handler(req, res)
    })
  } catch (err) { next(err) }
}

// 使用
router.get('/orders', tenantAwareRoute(async (req, res) => {
  const orders = await orderRepo.findSubmitted({ storeId: req.params.storeId }, res.locals.tx)
  res.json(orders)
}))
```

### 5.6 CI 防裸 prisma 调用（规约，Stage 0 实施）

```bash
# 扫所有 routes/controllers（排除 repositories/ 和 __tests__/）
grep -rn "prisma\.\(order\|payment\|session\|splitBill\)\.\(create\|update\|delete\|upsert\)" \
  server/src/routes server/src/controllers
# 应为空
```

写进 CI pipeline 或 pre-commit hook。

### 本节决策点（§5）

- D21 `tenantAwareRoute` 装饰器
- D23 类型判别联合
- D24 Repository 默认排除 draft
- D26 Repo 签名 `db: Db = prisma`
- D52 读写参数策略（写必填、读默认）
- D22 RLS 覆盖测试

---

## 6. 事务边界

### 6.1 核心规则

**一请求一 DB 事务**（D25）。`withTenantContext` 是唯一 tx 边界。外部 API（Stripe）在 tx 前/后。

### 6.2 必须原子化的操作

| 操作 | 原子步骤 | 失败处理 |
|---|---|---|
| Webhook 确认支付 | 1. 创建 Payment 2. 创建 PaymentItem `(paymentId, orderItemId, paidQuantity)` 3. 失效冲突 splits（判定：SplitBillItem `(orderItemId, quantity)` 与 paid 总量重叠）4. 重算 settlementMode | 全回滚 → Stripe 重试 |
| Cart submit（B2） | UPDATE `status='draft' AND version=?` → `pending`，version+1 | affected=0 → 409 |
| 创建 Split | 1. 校验无重叠 2. 创建 split_bill + items 3. 更新 mode | 冲突抛错回滚 |
| Close Session | session.status='closed' + table.current_session_id=null | 两表同步 |
| Reopen Session | 反向 | 同上 |
| Start Session | 查是否有 active → 创建 → 设 table.current_session_id | 防并发 |
| 分配角色 | 1. 读 ModuleLicense 2. 校验 ⊆ licensed 3. staff.role_id=? | 校验失败回滚 |
| Platform 授予/回收模块 | 更新 ModuleLicense + 写 audit log | 原子 |

### 6.3 外部 API 三种模式

**模式 1（外部在前）**：
```ts
const pi = await stripe.paymentIntents.create({...}, { idempotencyKey: `session-${id}-${v}` })
await withTenantContext(storeId, async (tx) => {
  await paymentRepo.createPending({ stripeId: pi.id }, tx)
})
```

**模式 2（外部在后）**：
```ts
await withTenantContext(storeId, async (tx) => {
  await orderRepo.submitDraft(id, v, tx)
})
emit(storeId, 'order:created', ...)      // tx 外
printerService.printOrder(order)         // 异步
```

**模式 3（Webhook 无外部调用）**：全部 DB 操作在一个 `withTenantContext` 里，emit 在 tx 外。

### 6.4 SSE Emit 铁律（D27）

```ts
// ✅ 正确：tx commit 后再 emit
const summary = await withTenantContext(storeId, async (tx) => {
  await paymentRepo.create({ sessionId, amount, tipAmount }, tx)
  await markItemsPaid(sessionId, itemKeys, tx)
  return await sessionRepo.getSummary(sessionId, tx)   // 事务内读到的最新状态
})
emit(storeId, 'session:summary', summary)              // tx 已 commit，其他连接能读到

// ❌ 错误：tx 内 emit（关键点：payload 来自 tx 内查询）
await withTenantContext(storeId, async (tx) => {
  await paymentRepo.create({ sessionId, amount, tipAmount }, tx)
  await markItemsPaid(sessionId, itemKeys, tx)
  const summary = await sessionRepo.getSummary(sessionId, tx)
  emit(storeId, 'session:summary', summary)            // ❌ tx 还没 commit
  // 客户端立即收到事件 → 发起新 fetch → 新连接在 READ COMMITTED 隔离级下
  //   看不到本 tx 未 commit 的写入 → 拿到旧 summary → UI 和事件数据不一致
  // 更糟：若本 tx 最终回滚（余下代码抛错），客户端已被告知"支付成功"
  //   → 显示已付清，DB 里 payment 不存在 → 状态彻底分裂
})
```

tx 失败 → 不 emit。客户端 10-30s polling 自愈。

### 6.5 乐观锁（D30）

```
// Order 行
{ id, status: 'draft', version: 3, items: [...], deviceId: 'A' }

// 设备 A 加菜
UPDATE orders SET version=4 WHERE id=? AND version=3 AND status='draft'
// affected=0 → 抛 409 → 前端拉最新 + 重试
```

Partial unique index 强制 `(session_id, device_id)` 在 `status='draft'` 时唯一。

### 6.6 DB Roles（D31）

| Role | BYPASSRLS | 用途 | 连接 |
|---|---|---|---|
| `app_user` | ❌ | HTTP 请求 | 默认 `DATABASE_URL` |
| `platform_admin` | ✅ | PlatformAdmin API | `SET LOCAL ROLE` 切换 |
| `system_worker` | ✅ | 定时任务、webhook 重试（**Phase 5 范围内 role 已创建但暂无代码使用，预留给 Phase 3 孤儿 draft 清理 + webhook 失败重试队列**） | 独立 `SYSTEM_DATABASE_URL` 连接池 |

### 本节决策点（§6）

- D25 一请求一 DB 事务
- D26 Repo 方法签名
- D27 SSE emit 仅在 commit 后
- D28 服务端不重试
- D29 外部 API 三模式
- D30 乐观锁到 order.version
- D31 三 DB role 分离

---

## 7. Migration + Seed 脚本

### 7.1 产出物

```
server/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   │   ├── 20260417000001_init/migration.sql                    # Prisma 自动生成
│   │   ├── 20260417000002_rls_and_roles/migration.sql           # 手写
│   │   └── 20260417000003_seed_platform_admin/migration.sql     # 手写
│   ├── seed.ts
│   └── seed-data/*.ts
├── scripts/
│   ├── import-legacy-json.ts
│   ├── reset-dev.sh
│   ├── post-migrate.sh
│   ├── fetch-secrets.sh
│   └── backup-loop.sh
├── docker-compose.yml
├── docker-compose.prod.yml
└── docker-compose.test.yml
```

### 7.2 `rls_and_roles/migration.sql` 关键内容

```sql
-- ========== DB Roles（幂等化，D32 微调） ==========
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

-- ========== RLS on store_id tables ==========
DO $$ DECLARE t text;
BEGIN
  FOR t IN SELECT table_name FROM information_schema.columns
           WHERE column_name = 'store_id' AND table_schema = 'public'
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format($p$
      CREATE POLICY tenant_isolation ON %I
      USING (store_id = current_setting('app.current_store_id')::uuid)
    $p$, t);
  END LOOP;
END $$;

-- ========== Partial unique: 一 draft per (session, device) ==========
CREATE UNIQUE INDEX one_draft_per_device
  ON orders (session_id, device_id)
  WHERE status = 'draft';

-- ========== 额外索引 ==========
CREATE INDEX idx_orders_store_created ON orders (store_id, created_at);
CREATE INDEX idx_payments_store_created ON payments (store_id, created_at);
CREATE INDEX idx_order_items_menu_item ON order_items (menu_item_id);
```

`scripts/post-migrate.sh` 用 `ALTER ROLE` + env 覆盖 placeholder 密码。

### 7.3 Seed（代码化，D35）

```ts
// prisma/seed.ts
import { MODULES } from '@qr-order/shared/modules'

async function main() {
  // 1. 首个 super-admin（幂等）
  await prisma.platformAdmin.upsert({
    where: { email: 'admin@saas.local' },
    create: { email: 'admin@saas.local', passwordHash: hash('changeme'), role: 'super-admin' },
    update: {},
  })
  
  // 2. Demo store
  const demoStore = await prisma.store.upsert({
    where: { id: 'demo-store-uuid' },
    create: { id: 'demo-store-uuid', name: 'Demo Restaurant' },
    update: {},
  })
  
  // 3. Demo 模块许可（dev 全模块，prod 仅 core）
  await prisma.moduleLicense.upsert({
    where: { storeId: demoStore.id },
    create: {
      storeId: demoStore.id,
      modules: process.env.NODE_ENV === 'production' ? ['core'] : Object.keys(MODULES),
      grantedAt: new Date(),
      grantedBy: 'system-seed',
    },
    update: {},
  })
  
  // 4. 系统角色（owner / manager / staff 模板）
  await ensureSystemRoles(demoStore.id)

  // 5. Owner staff 账号（"能登录演示账号"验收的依据）
  const ownerRole = await prisma.role.findFirst({
    where: { storeId: demoStore.id, name: 'owner' },
  })
  await prisma.staff.upsert({
    where: { storeId_username: { storeId: demoStore.id, username: 'owner@demo.local' }},
    create: {
      storeId: demoStore.id,
      username: 'owner@demo.local',
      passwordHash: hash(process.env.DEMO_OWNER_PASSWORD ?? 'changeme'),
      roleId: ownerRole!.id,
      displayName: 'Demo Owner',
    },
    update: {},
  })

  // 6. 默认菜单 + 默认桌号 A01-A10 ...
}
```

### 7.4 JSON 导入脚本（D36，应急）

```bash
# 默认不跑；手动用于恢复 legacy demo 数据
pnpm tsx server/scripts/import-legacy-json.ts \
  --source archive/legacy-demo-data \
  --only stores,categories,menu,tables
# --only 参数映射（脚本内部声明并在 --help 输出）：
#   stores     → stores 表
#   categories → categories 表
#   menu       → menu_items + menu_item_options 两张表（简称方便输入）
#   tables     → tables 表
# 不导入 sessions/orders/payments/split_bills（业务流水废）
```

### 7.5 测试 DB（D37）

```yaml
# docker-compose.test.yml
services:
  postgres-test:
    image: postgres:16
    environment:
      POSTGRES_DB: qr_order_test
      POSTGRES_PASSWORD: test
    ports: ["5433:5432"]
    tmpfs: /var/lib/postgresql/data
```

测试 setup：`beforeEach` `TRUNCATE ... RESTART IDENTITY CASCADE`。

Fixtures：`seedMinimalStore` / `seedStoreWithMenu` / `seedFullTenant`。

### 本节决策点（§7）

- D32 Migration 编排（3 独立目录）
- D33 RLS 严格模式
- D34 Junction 表 store_id
- D35 代码化 Seed
- D36 JSON 导入脚本保留但不接入
- D37 测试 DB 独立容器 + tmpfs

---

## 8. 部署 + 备份

### 8.1 Compose 分层（D41）

**基础设施层**（长期在线）：`postgres`、`nginx`
**应用层**（频繁更新）：`server`、`client`、`backup`

部署只重启应用层：
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --no-deps --force-recreate server client
```

### 8.2 环境变量（D38）

**开发**：`.env.local`（gitignored）
**生产**：AWS SSM Parameter Store → `fetch-secrets.sh` → `/etc/qr-order/env` → systemd EnvironmentFile

EC2 IAM Role 权限：`ssm:GetParameters` + `s3:PutObject`。

**SSM 存储的 secrets**：
- `APP_USER_PASSWORD`
- `PLATFORM_ADMIN_PASSWORD`
- `SYSTEM_WORKER_PASSWORD`
- `POSTGRES_SUPERUSER_PASSWORD`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `JWT_SECRET`

S3 图片上传优先走 EC2 IAM role，不挂 AK/SK。

### 8.3 Nginx（保留 SSE）

```nginx
location /api {
    proxy_pass http://server_backend;
    proxy_http_version 1.1;
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 1800s;
    chunked_transfer_encoding on;
}

location = /api/webhook/stripe {
    proxy_pass http://server_backend;
    proxy_buffering off;
    proxy_request_buffering off;  # 保留 raw body 供签名验证
}
```

### 8.4 备份（D39）

**调度**：每天对齐 UTC 09:00（美中部凌晨 3-4 点）。不用 `while sleep`，用 alpine `crond` 或精确计算下一个 09:00。

**流程**：
1. `pg_dump --format=custom --compress=9` 到本地 `/backups/`
2. `pg_restore --list` 验证非空/非损坏（失败报警）
3. `aws s3 cp ... --storage-class STANDARD_IA`
4. 本地保留 7 天，S3 lifecycle 30→90→90+ 转 Glacier

**恢复流程**（文档化不自动化）：
```bash
aws s3 cp s3://... ./restore.dump.gz
docker compose down
docker compose up -d postgres
docker exec postgres dropdb -U postgres qr_order && createdb
docker exec -T postgres pg_restore -U postgres -d qr_order < restore.dump.gz
# pg_dump 不含 RLS/roles，必须重跑 migration
docker compose run --rm server pnpm prisma migrate deploy
docker compose up -d
```

### 8.5 部署流程（D40）

**铁律**（即使手动）：
1. 部署前 `ssh ec2 'cd /opt/qr-order && git status'` 确认无本地修改
2. `git tag deploy-$(date +%Y%m%d-%H%M%S) && git push --tags`
3. 部署
4. 回滚：`git checkout <prev-tag> && up --build`

### 8.6 资源估算 + 调优（D42）

**EC2 t4g.small**（2 vCPU / 2GB，$12/月）+ 20GB EBS ≈ **$16/月**

**postgresql.conf**（t4g.small 必改）：
```
shared_buffers=256MB
work_mem=4MB
effective_cache_size=512MB
max_connections=50
```

**关闭 swap**（宁 OOM 重启不要 swap 雪崩）。

**CloudWatch alarm**：内存 >85% / 磁盘 >80% / postgres 重启次数 >0。

### 8.7 RDS 对比（显式记录，D8）

| 维度 | 本地 Docker Postgres | RDS db.t4g.micro |
|---|---|---|
| 成本 | $0（含在 EC2） | ~$15/月 |
| 备份 | 自写脚本 + S3 | 自动每日快照 + PITR |
| 升级 | 手动 stop/upgrade/restart | 控制台一键 |
| EC2 挂了 | DB 共命运 | DB 不受影响 |

**选本地理由**：MVP 阶段、无真实流量、成本敏感、EC2 已投入。
**升级触发条件**：首个真实餐厅入驻 + Stripe 月 GMV > 某阈值 → 迁 RDS。

### 本节决策点（§8）

- D8 自托管 vs RDS（显式记录代价）
- D38 AWS SSM 密码管理
- D39 每日 pg_dump + S3 lifecycle
- D40 SSH 手动部署 + git tag
- D41 Compose 分层
- D42 Postgres 调优

---

## 9. 执行顺序 + 并行化

### 9.1 阶段依赖图

```
Stage -1: 备份 EC2 演示数据（D47）
  │
Stage 0: 基础设施（串行，主 agent）
  │
Stage 1: 测试 DB 配置（串行）
  │
Stage 2: Repository 层（串行 choke point）
  │
  ├─ Stage 3a: 外围域（D43 串行：A → B → C，不开 worktree）
  └─ Stage 3b: Platform admin（D44 独立 agent，和 3a 并行）
  │
Stage 3c: 核心业务链（D45 主 agent 独占严格串行）
  │  [含 B2 Checkpoint，D50]
  │
Stage 4: 集成测试修复（串行，含断言映射表 D51）
  │
Stage 5: 清理（软删除到 _archive，D48）
  │
Stage 6: 部署 → 文档（D46 串行）
  │
Stage 7: e2e 验收脚本（环境守卫 D49）
```

### 9.2 Stage -1：备份 EC2 演示数据

```bash
ssh ec2 'docker exec qr-order-postgres pg_dump \
  -t stores -t categories -t menu_items -t tables qr_order' \
  | gzip > /tmp/legacy-demo.sql.gz
scp ec2:/tmp/legacy-demo.sql.gz archive/legacy-demo-data/

# 或转 JSON（用于 import-legacy-json.ts）
ssh ec2 'docker exec qr-order-postgres psql qr_order \
  -c "COPY (SELECT row_to_json(s) FROM stores s) TO STDOUT"' \
  > archive/legacy-demo-data/stores.json
# 同理 categories / menu_items / tables
```

### 9.3 Stage 0：基础设施

**产出**：完整 schema + 3 个 migration 目录 + prisma-client.ts + types.ts + tenant-aware.ts + seed.ts + seed-data/ + compose 更新 + ESLint `no-floating-promises`

**验收**：`prisma migrate dev` + `prisma db seed` 成功；psql 验证 3 个 role 存在、RLS policies 在位、partial unique 索引建成；Prisma schema 已建但**未被业务代码引用**，应用照常用 JsonStore 启动以验证 Prisma 改动不破坏现有功能

### 9.4 Stage 1：测试 DB

**产出**：docker-compose.test.yml + vitest setup + `fixtures.ts` + `rls-coverage.test.ts` + `module-registry.test.ts` + `tenant-isolation.test.ts`

**验收**：`pnpm test` 跑通基础 fixture + RLS 覆盖测试

### 9.5 Stage 2：Repository 层

**定位**（D54）：一次性切换是 **storage 层**（JSON → Postgres），业务层是**渐进迁移**。Stage 2 只让 Prisma repository 就位，**不动任何业务代码 / 路由 / 控制器**。应用在 Stage 2 结束时**照常用 JsonStore 启动**。业务代码迁到 Prisma 是 Stage 3a/3b/3c 的事，逐域进行。

**产出**（D53）：11 个语义化 repository 文件——每个 entity 一个文件，含该 entity 的业务方法（`findSubmitted` / `findDraft` / `submitDraft` / `findBySessionId` / `resolveLicensedPermissions` 等）：

```
server/src/repositories/
├── store.ts             (Store entity)
├── orders.ts            (B2 核心，含 findSubmitted / findDraft / submitDraft)
├── sessions.ts
├── payments.ts
├── split-bills.ts
├── menu.ts              (含 categories / menuItems / menuItemOptions)
├── staff.ts
├── roles.ts             (含 resolveLicensedPermissions helper)
├── coupons.ts
├── waitlist.ts
└── platform-admin.ts    (PlatformAdmin + ModuleLicense)
```

**不做的事**：
- 不重写 `stores.ts`（JsonStore singleton 保留，逐域迁移 import 在 Stage 3a/3b/3c）
- 不做通用 CRUD 适配器（生产 grep 证据：call site 同步链 + 非空断言 + `session.orderIds` 专属字段，"加 await 就能跑"是空想）
- 不删 `json-store.ts`（Phase 5 Stage 5 清理阶段才归档）

**验收**（D54，覆盖原"tsc -b 通过 + 登录跑通"的空想）：

1. **每个 Task（16-26）独立 verify**：本 task 新写的 repo 文件单独 tsc 过；不跑应用启动
2. **整体 tsc**：Stage 2 全部完成后，server `tsc -b` **依然干净**（stores.ts 未动 → 无新错误）
3. **应用冒烟（D54.3 执行位置）**：Stage 2 所有 task 完成后做**一次**完整冒烟——JsonStore 启动 + 演示账号登录跑通。**不必每个 repo task 都跑一次冒烟**（避免 11 次重复浪费）
4. **应用全功能迁到 Prisma** 是 Stage 3c 结束的验收点，不是 Stage 2 的

### 9.6 Stage 3a：外围域（串行 A → B → C）

> **⚠️ 2026-04-17 Phase E plan 事实修正**（规则 7 应用）
>
> 本小节原始文件列表凭印象写作，Phase E plan 段 3a/3b/3c grep 验证后发现
> 3 项事实错误。下方列表为**修正后**版本——原错误全部记录在本小节
> "Phase E plan 修正记录" 子小节，保留 spec 演进的审计痕迹。
>
> 每个文件的 **Modify / Create** 标注也一并加入——原 spec 未区分导致
> Phase E 实施 agent 可能误以为所有 test 文件已存在。

**Agent A（menu + category）** 独占：
```
Modify: server/src/routes/menu.routes.ts
Modify: server/src/controllers/menu.service.ts    (含 category + menuItem 两套 CRUD)
Create: server/src/__tests__/menu.test.ts         (Phase E 新建)
```

**Agent B（staff 体系）** 独占：
```
Modify: server/src/routes/staff.routes.ts
Modify: server/src/routes/role.routes.ts
Modify: server/src/routes/clock.routes.ts
Modify: server/src/routes/waitlist.routes.ts
Modify: server/src/controllers/staff.service.ts
Modify: server/src/controllers/role.service.ts
Modify: server/src/controllers/clock.service.ts
Modify: server/src/controllers/waitlist.service.ts
Create: server/src/__tests__/staff.test.ts        (Phase E 新建，含 clock 业务 case)
Create: server/src/__tests__/roles.test.ts        (Phase E 新建)
Create: server/src/__tests__/waitlist.test.ts     (Phase E 新增，原 spec 未列)
```

**Agent C（coupon + analytics + printer）** 独占：
```
Modify: server/src/routes/coupon.routes.ts
Modify: server/src/routes/analytics.routes.ts
Modify: server/src/routes/printer.routes.ts
Modify: server/src/controllers/coupon.service.ts
Modify: server/src/controllers/analytics.service.ts
Modify: server/src/controllers/printer.service.ts
Create: server/src/__tests__/coupons.test.ts      (Phase E 新建)
```

**每个 agent 的动作**：删 JsonStore 调用、async 化、包 `tenantAwareRoute`、emit 移 tx 外 (用 `res.locals.afterCommit` 钩子——见 §5.4 / Task 8 补丁)、写 RLS-aware 业务语义测试

#### Phase E plan 修正记录（2026-04-17）

| # | 原 spec 声明（错误） | 实际状态（grep 验证） | 修正 |
|---|---|---|---|
| 1 | `server/src/routes/category.routes.ts` 归 Agent A | ❌ 文件**不存在**——category 路由合并在 `menu.routes.ts` 内 | 从 Agent A 列表删除 |
| 2 | `server/src/__tests__/menu.test.ts` 隐含已存在 | ❌ 文件不存在——`__tests__/` 实际仅含 `module-permissions.test.ts / settlement-gateway.test.ts / split-billing-integration.test.ts` | 明标 `Create` |
| 3 | Agent B `{staff,roles}.test.ts` 只列两个 | Phase E 新策略（每域 3-5 业务 case + 1 RLS smoke）需要 `waitlist.test.ts` 独立文件 | 新增 `waitlist.test.ts` |
| 4 | Agent C `coupons.test.ts` 隐含已存在 | ❌ 文件不存在 | 明标 `Create` |
| 5 | 无 `category.service.ts` 明示（模糊） | category CRUD 在 `menu.service.ts` 内，非独立 service 文件 | 在 Agent A `menu.service.ts` 后加注释说明 |

**历史模式**：本修正是 Phase 5 项目内第 2 次 spec 事实错误（第 1 次是 §4.1
`OrderItem.itemKey` 设计基于错误事实假设，见 D56/D57 修正 commit `4fdd6b6c`）。
两次模式一致——spec 写作时未 grep 现存代码/文件结构就落笔。规则 7（evidence-
first for "existing behavior" claims）的直接应用场景：spec 编写者自身也
必须遵守，不仅 plan/task 阶段。

### 9.7 Stage 3b：Platform admin（D44 并行）

**Agent D** 独占（全新文件，零冲突）：
```
server/src/routes/platform.routes.ts
server/src/controllers/platform-admin.service.ts
server/src/controllers/platform-store.service.ts
server/src/middleware/platform-auth.ts
server/src/__tests__/platform.test.ts
```

实现：PlatformAdmin 登录、店铺列表、授予/回收 modules、impersonate、审计日志。

### 9.8 Stage 3c：核心业务链（严格串行）

主 agent 独占，不开 worktree。子任务顺序：

```
1. session-crud.ts 迁移
2. order.service.ts → orderRepo.findSubmitted
3. session-cart.ts → B2 重写（pendingCart → draft order）
   ├─ cart.routes.ts + useCartSync 前端 hook 调整
   ├─ SSE cart:updated 事件载体改为 draft order 快照
   ├─ 乐观锁从 session.cartVersion 搬到 order.version
   └─ 完成后自动跑该域测试 + tsc -b

>>> 🛑 MANUAL CHECKPOINT (D50) <<<

主 agent 停下，通知用户手动验证 7 个场景（a-g 独立 pass/fail，不要等全跑完才反馈）：
  a. 顾客扫码进桌 → 加 3 道菜 → 购物车数据落在 draft order
  b. 关页面重开 → 购物车菜品还在（从 draft order 恢复）
  c. 换设备扫同一桌 → 不看到 A 设备的购物车（deviceId 隔离）
  d. Pay-first 付款：点先付 → Stripe 取消 → 回菜单购物车菜还在（B2 修复的 bug）
  e. 多设备同时加菜到各自购物车 → 都能独立提交成独立 order
  f. 提交后的 order 在 kitchen 视图可见
  g. 提交后的 draft 行消失（允许同一 deviceId 重新加菜建新 draft）

执行规则：
  - a-g 按顺序独立验证，每条单独报 passed/failed
  - 不要等全跑完一起反馈（后面失败会被前面副作用淹没）
  - 用户回复"checkpoint passed"才继续后续步骤
  - 任意一条 failed → 主 agent 修复该条 → 重跑
  - 该 commit 打 tag `phase5-b2-checkpoint` 作为已知稳定回滚点

4. payment.service.ts → paymentRepo + PaymentItem 关联
5. settlement/gateway.ts → 包 withTenantContext
6. settlement/actions/*.ts → async 化
7. split-bill.service.ts → splitBillRepo + SplitBillItem
8. split-bill-invalidation.ts → async，emit 移 tx 外
9. webhook routes → async，操作全部包在一个 tx
10. session-payment.ts + session-settlement.ts → 收尾
```

### 9.9 Stage 4：集成测试修复 + 断言映射表（D51）

**断言映射表**：`docs/superpowers/work-logs/2026-04-17-phase5-test-migration-map.md`

每个老测试断言 → 新测试断言的映射，标注"等价 / 加强 / 弱化"。"弱化"必须写 Why（如"Phase 4 SSOT 删除字段，改为派生验证等价覆盖"）。没 Why 的弱化禁止合并。

**两层保护**：
- Git tag `pre-phase5-tests-baseline` 打在 Stage 4 开始前
- 物理保留 `server/_archive/tests-2026-04/*.test.ts.bak`（统一到 `server/_archive/` 根目录）

**验收**：`pnpm test` 全绿 + 映射表 review 通过

### 9.10 Stage 5：清理（软删除 D48）

```bash
# 统一归档到 server/_archive/ 一个根目录，子目录按类型分
mkdir -p server/_archive/{repositories,tests-2026-04,data-2026-04}
mv server/src/repositories/json-store.ts server/_archive/repositories/json-store.ts.bak
mv server/data/* server/_archive/data-2026-04/ && rmdir server/data
# 老集成测试在 Stage 4 时也 mv 到 server/_archive/tests-2026-04/
```

`server/tsconfig.json` 加 `"exclude": ["_archive/**"]`。`.bak` 后缀挡 ts/Prisma 扫描。

**审计**（`_archive/` 不在 `src/` 下，grep `server/src` 天然不扫）：
```bash
grep -rn "JsonStore" server/src       # 应为空
grep -rn "pendingCart" server/src     # 应为空
grep -rn "session.cartVersion\|session.totalPaid" server/src  # 应为空
grep -rn "server/data/" server/src    # 应为空
```

**EC2 稳定运行 7 天后**单独 commit `rm -rf server/_archive/`，独立回滚点。

### 9.11 Stage 6：部署（F） → 文档（E）

**Agent F（部署）** 独占：
```
docker-compose.prod.yml
scripts/{post-migrate,fetch-secrets,backup-loop,reset-dev}.sh
nginx.conf
```

部署步骤（人工）：
1. SSM 写入 secrets
2. EC2 IAM role 加 `ssm:GetParameters` + `s3:PutObject`
3. SSH 上 EC2，**按场景选命令**：

   **首次部署（Stage 6 实施时，清库重建）**：
   ```bash
   cd /opt/qr-order
   git fetch && git checkout main
   sudo systemctl stop qr-order
   docker compose -f docker-compose.yml -f docker-compose.prod.yml down -v   # 删旧 volume
   docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
   sudo systemctl start qr-order
   ```

   **日常更新部署**（对应 D41 分层，基础设施不停）：
   ```bash
   cd /opt/qr-order
   git fetch && git checkout <target-tag>
   docker compose -f docker-compose.yml -f docker-compose.prod.yml build server client
   docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --no-deps --force-recreate server client
   # postgres 和 nginx 不重启，停机窗口 10-30 秒
   ```

   > ⚠️ **`down -v` 仅用于首次部署或确认清库场景，日常部署绝对禁止**——它会删除 postgres volume，造成数据丢失。

4. 首次启动 migrate deploy + seed 自动跑
5. 手动测试：域名登录、Stripe webhook

**Agent F 验证通过后再派 Agent E**。

**Agent E（文档）** 独占：
```
docs/architecture/permissions.md
docs/architecture/multi-tenant.md
docs/development/adding-entity.md
server/src/repositories/orders.ts  [顶部 ADR 注释]
```

文档反映真实跑通的行为（不是预想）。

### 9.12 Stage 7：e2e 验收脚本（D49）

**与 9.8 checkpoint 的关系**：两者互不替代，覆盖时机和范围不同。

| 机制 | 时机 | 范围 | 形式 |
|---|---|---|---|
| 9.8 Checkpoint | Stage 3c 中段（B2 重写后） | 专注 B2 场景：draft order + cart UX + 乐观锁 | 手动 UI 验证 a-g 7 条，独立 pass/fail |
| 9.12 e2e | Phase 5 **完整验收**（Stage 7） | 全链路：B2 + RLS + 支付 + split + platform admin + webhook | 脚本化自动跑 |

Checkpoint 通过后继续开发后续子任务；Phase 5 全部完成后跑 e2e 作为最终验收门。

`server/scripts/e2e-phase5.sh`：

```bash
#!/bin/bash
set -e

# ============ 环境守卫（fail-closed 白名单） ============
if [[ -z "$DATABASE_URL" ]]; then echo "ERROR: DATABASE_URL not set"; exit 1; fi
if [[ "$NODE_ENV" == "production" ]]; then
  echo "FATAL: NODE_ENV=production, e2e refuses to run"; exit 1
fi
# 白名单：DATABASE_URL 必须命中才允许（无黑名单，hostname 改了不会漏）
if [[ "$DATABASE_URL" != *"localhost"* ]] && \
   [[ "$DATABASE_URL" != *"127.0.0.1"* ]] && \
   [[ "$DATABASE_URL" != *"postgres-test"* ]] && \
   [[ "$DATABASE_URL" != *"staging"* ]]; then
  echo "FATAL: e2e only runs against localhost/127.0.0.1/postgres-test/staging"
  echo "       got: $DATABASE_URL"
  exit 1
fi
# ============

./scripts/reset-dev.sh

# 场景：
# 1. 创建 session + 加菜 → draft order 存在
# 2. 提交 cart → status draft→pending + version+1
# 3. Pay-first 流：PI 取消 → draft 仍存在
# 4. 支付成功 webhook → order confirmed + payment + PaymentItem
# 5. Split by-item → 支付 → 冲突 split 自动失效
# 6. Close session → table 释放
# 7. RLS 防御：裸 token 请求 → 403
# 8. Platform admin → 授予模块 → 员工可见
```

**文档警告**：永远不对 prod 跑。环境守卫是第一道防线，**纪律是最后一道**。

### 9.13 并行风险防控

每个 worktree 合并前主 agent 跑：

```bash
# 1. 确认改动范围符合声明
git diff main...<branch> --name-only | sort > changed.txt
diff changed.txt declared-files.txt     # 应为空

# 2. 检查主线冲突
git log main --since="<worktree 起点>" --name-only | sort -u > main-changes.txt
comm -12 changed.txt main-changes.txt   # 交集应为空

# 3. rebase 而非 merge
cd <worktree> && git fetch origin main && git rebase origin/main
# 冲突 → 主 agent 手动解决
```

**绝对禁止**：两个 agent 同时改 `shared/types.ts`、`repositories/stores.ts`、`docker-compose.yml`。这三个由主 agent 在 Stage 0 / 2 / 6 串行处理后锁定。

### 本节决策点（§9）

- D43 Stage 3a 串行
- D44 Stage 3b 并行
- D45 Stage 3c 主 agent 独占串行
- D46 Stage 6 部署→文档串行
- D47 Stage -1 备份演示数据
- D48 软删除 + 7 天后物删
- D49 e2e 环境守卫
- D50 B2 Checkpoint（a-g 独立验证）
- D51 断言映射表 + work-logs 位置

---

## 10. 附录

### 10.1 Phase 5 完成定义

1. 所有 Stage 0-7 产出物就位
2. `pnpm test` 全绿（含新增 RLS 覆盖、幽灵权限、RLS 异常、断言映射表）
3. Stage 7 e2e 脚本在本地 docker compose 全绿
4. EC2 部署成功，手动验证演示账号能登录 + Stripe webhook 通
5. 4 份架构文档 + ADR 注释就位
6. 死代码 grep 审计全部返空
7. 断言映射表由用户 review 通过

### 10.2 成本预算

- EC2 t4g.small：$12/月
- EBS 20GB：$2/月
- S3 备份：<$1/月
- 数据传输：<$1/月
- **总：~$16/月**

### 10.3 升级触发点

- 首个真实餐厅入驻 → 评估 RDS 迁移
- Stripe 月 GMV > $X → 评估 RDS 迁移 + CloudWatch 增强
- 内存 >85% 持续 5 分钟 → t4g.medium 升级
- 真实流量 SSE 连接数 > N → 重新评估单点部署

### 10.4 Backlog（Phase 5 不做，延后）

- **deviceId 生成策略**：服务端首次访问生成，HTTP-only cookie 或返回存 localStorage。清缓存后换 deviceId 的孤儿 draft 处理（UI 提示恢复或丢弃）。Phase 3 UI 阶段处理
- **孤儿 draft 定时清理**：15 分钟无活动 archive 或 voided。走 `system_worker` role。Phase 3 或独立 phase
- **备份深度验证**：`pg_restore --list` 仅验结构合法，不验数据完整性。补充机制：(a) 每周把最新 dump 在独立测试容器 `pg_restore` + 跑 sanity check 查询（`SELECT COUNT(*) FROM orders WHERE created_at > now() - interval '7 days'` 之类），(b) dump 文件大小环比检测（<上次 50% 或 >上次 200% 报警）。选任一即可，Phase 5 内只做文件存在性 + pg_restore --list
- **Twilio SMS**（waitlist 通知）
- **ESC/POS printer driver**（硬件到货后）

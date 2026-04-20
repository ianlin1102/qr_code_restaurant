# Phase 5 Plan — Phase B：Stage 0 基础设施

> **如何使用本文件**
>
> - 全局规则（增量 migration、SSE emit 时机、repo 签名、commit 粒度、agent 独占、验证铁律）见 [`00-index.md`](./00-index.md#全局规则所有-task-遵守)
> - Plan 阶段对 spec 的补强项（Task 2/4/6 引入）见 [`00-index.md`](./00-index.md#plan-阶段对-spec-的补强项批-2-写完前回填-spec)
> - 本 phase 前置：[`phase-a-backup.md`](./phase-a-backup.md) Task 1c 完成（dry-run 通过）
> - 本 phase 输出：完整 Prisma schema / 3 个 migrations / prisma-client wrapper / shared/types.ts 判别联合 / tenant-aware 装饰器 / seed.ts / docker-compose postgres / ESLint no-floating-promises
> - 验收标志：Prisma 基础设施就位，**应用仍然用 JsonStore 启动不受影响**（业务代码切换在 Phase D）
> - 下一个 phase：[`phase-c-test-db.md`](./phase-c-test-db.md)

## Task 列表

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
| 10 | 更新 `docker-compose.yml` + 开启 `no-floating-promises` + 清理临时容器 |

---

## Phase B：Stage 0 基础设施

### Task 2：写完整 `prisma/schema.prisma`

> **Phase F 回填（2026-04-17，DP-PF-4 决议 A）**：本 Task schema 含 `PlatformAuditLog` 模型（见 lines ~129 附近）。实施时需同步在 `Store` 模型加反向关系字段 `platformAuditLogs PlatformAuditLog[]`（Prisma 双向关系要求）。**RLS 处理**：Task 4 RLS migration 写作时明示不为 `platform_audit_log` 加 policy（platform-scope audit 跨租户；platform_admin BYPASSRLS 直读）。

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
  id             String         @id @default(uuid())
  name           String
  nameEn         String?        @map("name_en")
  description    String?
  descriptionEn  String?        @map("description_en")
  openingHours   String?        @map("opening_hours")
  announcement   String?
  announcementEn String?        @map("announcement_en")
  logo           String?
  tipBase        String         @default("pretax")
  taxRate        Float?         @map("tax_rate")             // e.g. 8.875 means 8.875%
  serviceFeeRate Float?         @map("service_fee_rate")     // e.g. 15 means 15%
  autoAcceptOrders Boolean      @default(false) @map("auto_accept_orders")
  maxTables      Int?           @map("max_tables")           // 租户自设上限,平台不强制(M3/D69)
  paymentMode    String?        @map("payment_mode")         // 'pay-first' | 'pay-later'
  createdAt      DateTime       @default(now()) @map("created_at")
  updatedAt      DateTime       @updatedAt      @map("updated_at")

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

  auditLogs    PlatformAuditLog[]  // Phase F 回填：审计日志反向关系（DP-PF-4）

  @@map("platform_admins")
}

/// Phase F 回填（2026-04-17，DP-PF-4 决议 A）：
/// 平台管理员操作审计日志。跨租户——不启用 RLS policy（platform_admin BYPASSRLS）。
/// Phase B Task 4 (RLS + roles migration) 必须显式**不**为此表加 RLS policy；
/// 注释说明：`-- platform_audit_log intentionally no RLS: platform-scope audit`
///
/// 由 Task 31 platform-store.service.ts 写入（每个敏感操作：login / grant / revoke /
/// impersonate / admin 管理）。由 GET /api/platform/audit 读取（需
/// platform:audit:read permission，DP-PF-2）。
model PlatformAuditLog {
  id            String        @id @default(uuid())
  adminId       String        @map("admin_id")
  admin         PlatformAdmin @relation(fields: [adminId], references: [id], onDelete: Restrict)
  action        String        // 'login' / 'modules:grant' / 'modules:revoke' / 'impersonate' / ...
  targetStoreId String?       @map("target_store_id")
  targetStore   Store?        @relation(fields: [targetStoreId], references: [id], onDelete: SetNull)
  payload       Json          // action-specific detail (granted modules, impersonated session id, etc.)
  ipAddress     String?       @map("ip_address")
  userAgent     String?       @map("user_agent")
  createdAt     DateTime      @default(now()) @map("created_at")

  @@index([adminId, createdAt])
  @@index([targetStoreId, createdAt])
  @@index([action])
  @@map("platform_audit_log")
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
  nameEn      String?  @map("name_en")
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
  // Q2=b: Staff.role FK 切换(legacy `role: String` 已在 plan schema 早期去除)。
  // 本次修订将 `roleId` 设 NOT NULL + onDelete Restrict,配合实施期数据清理
  // (见 Task 2 Step 2.5)。Grep evidence f180204b §2.5:5 处代码 `roleId?`
  // signature 需 Phase B 后期(Task 7 shared/types)同步去 ?。
  roleId       String   @map("role_id")
  role         Role     @relation(fields: [roleId], references: [id], onDelete: Restrict)
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
  // Mode C δ 桶 1(rename label→name 对齐 JSON + types.ts,补 5 字段)
  name              String                                        // was `label`(legacy drift)
  nameEn            String?  @map("name_en")                      // i18n C3 延伸
  number            Int                                           // display number(e.g. 1, 2, 3)
  enabled           Boolean  @default(true)
  status            String   @default("idle")                     // 'idle' | 'occupied' | 'cleaning' | 'bill-requested'
  qrCode            String   @unique @map("qr_code")
  capacity          Int?
  currentSessionId  String?  @map("current_session_id")
  waiterCalledAt    DateTime? @map("waiter_called_at")            // customer Call Waiter,admin ack 时 clear
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
  nameEn     String?    @map("name_en")
  quickTags  String[]   @default([]) @map("quick_tags")    // Mode C δ 桶 1: postgres 原生数组
  sortOrder  Int        @default(0) @map("sort_order")
  isActive   Boolean    @default(true) @map("is_active")
  createdAt  DateTime   @default(now()) @map("created_at")

  menuItems  MenuItem[]

  @@index([storeId])
  @@map("categories")
}

model MenuItem {
  id            String              @id @default(uuid())
  storeId       String              @map("store_id")
  store         Store               @relation(fields: [storeId], references: [id], onDelete: Cascade)
  categoryId    String              @map("category_id")
  category      Category            @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  name          String
  nameEn        String?             @map("name_en")
  description   String?
  descriptionEn String?             @map("description_en")
  imageUrl      String?             @map("image_url")
  price         Int
  originalPrice Int?                @map("original_price")   // Mode C δ 桶 1: 降价前原价,可选
  isAvailable   Boolean             @default(true)  @map("is_available")
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
  nameEn      String?  @map("name_en")
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
  // Mode C δ 桶 1 + D68: Order snapshot 哲学。tableName/tableNameEn 下单时冻结,
  // 历史订单不受 Table.name 后续改动影响(e.g. 桌子改名不破坏订单历史显示)
  tableName           String       @map("table_name")
  tableNameEn         String?      @map("table_name_en")
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
  position   Int                          // D57: caller 填 0-indexed，@@unique 保证稳定 idx 契约
  name       String
  nameEn     String?  @map("name_en")     // i18n: denormalize from MenuItem.nameEn at order time
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
  storeId      String    @map("store_id")
  orderItemId  String    @map("order_item_id")
  orderItem    OrderItem @relation(fields: [orderItemId], references: [id], onDelete: Cascade)
  groupName    String    @map("group_name")
  groupNameEn  String?   @map("group_name_en")   // i18n: maps to legacy optionNameEn
  name         String
  nameEn       String?   @map("name_en")         // i18n: maps to legacy choiceNameEn
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
  // G7-5 / D62: webhook idempotency guard — unique on nullable column.
  // Postgres default NULL-distinct semantics: multiple NULL rows allowed,
  // non-NULL values must be unique. Behaviorally equivalent to partial
  // unique `WHERE stripe_payment_intent_id IS NOT NULL` that handoff §D62
  // originally specified. Prisma 6 schema DSL does not support partial
  // unique constraints; postgres default NULL-distinct is the native path.
  @@unique([stripePaymentIntentId], map: "payment_stripe_intent_unique")
  @@map("payments")
}

model PaymentItem {
  id           String     @id @default(uuid())
  storeId      String     @map("store_id")
  paymentId    String     @map("payment_id")
  payment      Payment    @relation(fields: [paymentId], references: [id], onDelete: Cascade)
  orderItemId  String     @map("order_item_id")
  orderItem    OrderItem  @relation(fields: [orderItemId], references: [id], onDelete: Restrict)
  paidQuantity Int        @map("paid_quantity")  // D56: 替代 itemKey 字符串的 qty 部分

  @@index([paymentId])
  @@index([orderItemId])
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
  quantity     Int        @default(1)  // D56: 无 itemKey 字符串，此列即分配数量

  @@index([splitBillId])
  @@index([orderItemId])
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
  minOrderAmount Int?      @map("min_order_amount")    // Mode C δ 桶 1: M4 PASS grep f180204b
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

- [ ] **Step 2.5:staff.json store-demo-002 全删(Q2=b 实施期前置,衍生 2 = γ alignment)**

> **Plan 修订 #2 引入 + 衍生 2 = γ narrow**:本 sub-step 配合 Staff.roleId NOT NULL 设计。grep evidence `f180204b` §2-3 显示 staff.json 3 records 需清理。**衍生 2 = γ 决议**(Ian 批):`store-demo-002` 整体数据 Phase I 重建,backfill record 1 是浪费工作 → 本 sub-step narrow 为"删 store-demo-002 全部 staff records"(record 1 + record 2 同批删),无需 migrate。

```bash
# Record 1: admin/store-demo-002/role=owner/roleId=null → 删除(Phase I 重建)
# Record 2: ian/store-demo-002/role=staff/roleId=null → 删除(dirty, 与 record 1 同批)
# Record 3: ian/store-demo-001/role=waiter/roleId=已填 → 保留不变
```

**精确数据清理脚本**(Task 2 实施期跑,不在 plan 修订 commit):

```bash
# Step A: 删除 store-demo-002 全部 staff records(record 1 + record 2 同批)
jq '[.[] | select(.storeId != "store-demo-002")]' server/data/staff.json > /tmp/staff-cleaned.json
mv /tmp/staff-cleaned.json server/data/staff.json

# Step B: verify store-demo-002 清空 + 剩余仅 record 3
jq 'map(select(.storeId == "store-demo-002")) | length' server/data/staff.json
# 期望输出:0
jq '[.[] | {id, username, storeId, role, roleId}]' server/data/staff.json
# 期望:仅 1 record = ian/store-demo-001/waiter(record 3,roleId 已填)
```

**中间状态**:`store-demo-002` 暂无 staff,Phase I 起草时新建 task 重建(衍生 2 = γ delegate)。record 3 在 `store-demo-001`,不受影响,不阻塞其他 store 的测试。

**衍生 2 = γ delegate**:`store-demo-002` 其他 JSON 数据(categories / menu-items / tables / coupons / orders / sessions / payments / split-bills)本 sub-step **不清理**,Phase I 统一处理(新 task:store-demo-002 全 store JSON 清理 + seed.ts 重建依赖)。

**D71 标注**(历史候选,γ 决议后固化):衍生 2 = γ 是 D71 "Seed-as-SSOT" 的实施路径之一(仅清 staff.store-demo-002,其他 JSON Phase I)。D71 spec 升格保留 Phase H Task 45。

**Task 7 shared/types.ts 同步**:Staff.roleId NOT NULL 需连锁改 5 处 `roleId?` signature(grep `f180204b` §2-3):
- `shared/types.ts:62` `roleId?: string` → `roleId: string`
- `server/src/controllers/staff.service.ts:13, 58` 接口 + `matchingRole?.id` 处理
- `server/src/controllers/auth.service.ts:32` `as string | undefined` → `as string`
- `server/src/repositories/stores.ts:14` JsonStore 类型
- `server/src/middleware/permission.middleware.ts:19` 读取

以上 Task 7 改动**不在本 Task 2 plan 修订范围**,Phase B Task 7 实施时同步。

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
- G7-5 / D62 webhook idempotency: Payment.stripePaymentIntentId @@unique
  (postgres NULL-distinct gives partial-unique behavior natively)
- i18n fields (11 *En fields across Store/Category/MenuItem/MenuItemOption
  /OrderItem/OrderItemOption/Role) preserved per Phase B pre-grep evidence
  4f6517e1 (grep: 5/5 fields are live, not dead)
- Mode C δ resolution 桶 1 (16 fields): Table rename label→name + 5 new
  (nameEn/number/enabled/status/waiterCalledAt); Store +5 (taxRate/
   serviceFeeRate/autoAcceptOrders/maxTables/paymentMode); Order +2
  (tableName/tableNameEn per D68 snapshot); Coupon +1 (minOrderAmount
   per M4 PASS); MenuItem +1 (originalPrice); Category +1 (quickTags)
- Staff.roleId NOT NULL + onDelete Restrict (Q2=b landing);
  Task 2 Step 2.5 清理 staff.json dirty record 2 + migrate record 1
- D67-D70 候选标注 inline (Phase H Task 45 升格 spec)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

> **Plan 修订追加（2026-04-19）**：本 Task 2 在 Phase B 前置 grep `4f6517e1` 基础上加入 2 项 Ian 批准的决议：
>
> **G7-5 落地(α Path)**：`Payment.stripePaymentIntentId` 用 `@@unique` 替代原 `@@index`。Prisma 6 DSL 不支持 partial `@@unique`,改用 postgres 默认 NULL-distinct 语义(多 NULL 允许,非 NULL 唯一)—— 语义等价于 handoff §D62 原指定的 `WHERE stripe_payment_intent_id IS NOT NULL` partial。
>
> **i18n *En 字段(11 个)**：C3 grep 证据(`4f6517e1` §Step 1-3)显示 5/5 *En 字段全活字段(`nameEn` r44/w111 含 60 seed / `descriptionEn` r6/w19 / `announcementEn` r16/w8 / `optionNameEn` r2/w5 / `choiceNameEn` r9/w5)+ `client/src/lib/i18n-utils.ts` `localized()`/`localizedDesc()`/`optionLabel()` 切换核心。故 α 保留全部。字段落位:Store×3 / Category×1 / MenuItem×2 / MenuItemOption×1 / OrderItem×1 / OrderItemOption×2 / Role×1 = 11。
>
> **规则 7.2 `[NEEDS IAN CONFIRMATION]`**:MenuItemOption 仅 `nameEn`(无 `groupNameEn`),但 OrderItemOption 有 `groupNameEn` + `nameEn`。Logic 上 OrderItemOption 的 `groupNameEn` 需来自 MenuItemOption 源数据 —— 若 MenuItemOption 无 `groupNameEn`,则 OrderItemOption.groupNameEn denormalize 无源。是否给 MenuItemOption 也加 `groupNameEn`(变 12 字段)?本次 plan 修订按 Ian 11 字段版本落地,不自行扩充。

> **Plan 修订追加 #2(2026-04-19,Mode C δ resolution)**:基于 Phase B Task 2 M4 + Q2 grep(commit `f180204b`)+ Ian chat instance δ 分桶决议,本 Task 2 schema 补入 Mode C 桶 1 共 **16 字段**:
>
> | Entity | 新增字段(数)| 依据 |
> |---|---|---|
> | **Table** | rename `label→name`, +`nameEn`, +`number`, +`enabled`, +`status`, +`waiterCalledAt` (6) | JSON/types.ts ground truth + C3 i18n 延伸 |
> | **Store** | +`taxRate`, +`serviceFeeRate`, +`autoAcceptOrders`, +`maxTables`, +`paymentMode` (5) | JSON 4 record 全用 + types.ts 定义 |
> | **Order** | +`tableName`, +`tableNameEn` (2) | D68 Order snapshot 哲学 |
> | **Coupon** | +`minOrderAmount` (1) | M4 PASS(grep f180204b §2-3)|
> | **MenuItem** | +`originalPrice` (1) | types.ts 有,降价前原价 |
> | **Category** | +`quickTags` (1) | JSON/types.ts 有,UI 快速标签 |
>
> **Staff.role Q2=b 落地**(grep f180204b §2-3):
> - Legacy `role: String` 已在 plan 早期去除(无需改动)
> - `roleId` 由 `String?` + `onDelete: SetNull` → `String`(NOT NULL)+ `onDelete: Restrict`
> - **CC 倾向选 NOT NULL**(非 nullable)理由:(1)Q2=b 核心意图是切 FK,保 nullable 就没切完;(2)代码 blast radius ~5 处 `roleId?` signature,Phase B Task 7 同步去 ?;(3)record 1 一次性 migrate 是单次成本,保留 nullable 是持续维护成本
> - **Task 2 Step 2.5 sub-step**(见下方):实施期清理 staff.json dirty records
>
> **D67-D71 候选 inline 标注**(不进 spec,Phase H Task 45 升格):
> - **D67**:反向 drift 处理原则 —— types.ts 有 JSON 无时,以 types.ts 为准补进 schema(M1)
> - **D68**:Order snapshot 哲学 —— tableName/tableNameEn 下单时冻结,历史订单不受后续桌名改动影响(M2)
> - **D69**:maxTables 留 Store 级,租户自设上限,平台不强制限额(M3)
> - **D70**:Coupon schema 完整补入,业务启用独立决策(M4)
> - **D71 候选**:Seed-as-SSOT(Ian 待议:删除 store-demo-002 全部 JSON 数据,seed.ts 作为 demo 数据唯一真相源)—— 本次不决议,留 Phase B 实施后期

> **桶 2/3/4 显式 delegate**(避免 scope creep):
> - **桶 2**(Floor plan 6 字段 `x / y / width / height / shape / zone`)→ **Phase I/J 补**,本 Task 2 不含
> - **桶 3**(Deprecated 3 字段:`Table.currentBillId` / `Table.currentOrderId` / `Table.paymentMode`)→ **不补**,Store 级 paymentMode 已够
> - **桶 4**(次要扩展 6 字段:`Waitlist.estimatedWait/notifiedAt` / `Printer.address` 拆分 / `MenuItem.dietary/isRecommended/quickTags` / `Category.hideQuickTags`)→ **Phase H/I 补**

---

### Task 3：生成 extend_schema 增量 migration（β Path）

> **Plan 修订(2026-04-19,Ian calibration)**:本 Task 从原"生成 init migration"改为"生成 extend_schema 增量 migration"。原因:本地 DB 已应用 `20260309182624_init`(Phase 5 前,含 Store + StoreUser),规则 1 增量 migration 铁律禁止改已发布 migration。Task 2 重写 schema 后,`prisma migrate dev` 自动生成从 applied state → new schema 的 diff migration,内容是 ALTER TABLE stores(+columns)+ DROP TABLE store_users + CREATE TABLE for ~20 new tables(categories / menu_items / sessions / orders / payments / split_bills / staff / roles / platform_admins / ...)。

**Files:**
- Create: `server/prisma/migrations/20260417000001_extend_schema/migration.sql`（Prisma 自动生成增量 diff）

**前置**:Task 2 完成。**需要本地 postgres + 已应用 `20260309182624_init`**(Phase 5 前本地已跑过;若干净环境,先 `prisma migrate deploy` 应用旧 init 建立 baseline)。

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

- [ ] **Step 3：生成增量 migration**

```bash
pnpm prisma migrate dev --name extend_schema --create-only
```

`--create-only` 只生成 SQL 不执行。Prisma 从 applied state(旧 init Store+StoreUser)diff 到 new schema(21 models),产出 ALTER/DROP/CREATE 混合 SQL。预期输出：
```
Prisma Migrate created the following migration from new schema changes:
migrations/
  └─ 20260417000001_extend_schema/
    └─ migration.sql

You can now edit it and apply it by running prisma migrate deploy.
```

如果时间戳不是 `20260417000001`（Prisma 用当前时间），**手动重命名目录**到 `20260417000001_extend_schema`，保证 spec 中的命名一致性(与 Task 4 `20260417000002_rls_and_roles` + Task 5 `20260417000003_seed_platform_admin` 连续编号)。

```bash
# 如果 Prisma 用了不同时间戳（例如 20260417_102334_extend_schema）
cd server/prisma/migrations
mv <prisma-generated-name> 20260417000001_extend_schema
ls -la
# 预期：20260309182624_init/ + 20260417000001_extend_schema/ 两个目录
```

- [ ] **Step 4：审核生成的增量 SQL**

```bash
cat server/prisma/migrations/20260417000001_extend_schema/migration.sql | head -100
```

预期开头类似(β 增量混合 SQL)：
```sql
-- AlterTable (existing stores gets new columns)
ALTER TABLE "stores" ADD COLUMN "name_en" TEXT;
ALTER TABLE "stores" ADD COLUMN "description_en" TEXT;
ALTER TABLE "stores" ADD COLUMN "announcement_en" TEXT;
ALTER TABLE "stores" ADD COLUMN "tip_base" TEXT NOT NULL DEFAULT 'pretax';
...

-- DropTable (old StoreUser replaced by Staff)
DROP TABLE "StoreUser";

-- CreateTable (new entities)
CREATE TABLE "platform_admins" (...);
CREATE TABLE "platform_audit_log" (...);
CREATE TABLE "module_licenses" (...);
CREATE TABLE "categories" (...);
CREATE TABLE "menu_items" (...);
...
```

检查(β 增量特定):
- `stores` 表有 ALTER TABLE ADD COLUMN(i18n + tipBase 新字段)
- `StoreUser` 表 DROP(被 Staff 替代)
- ~20 张新表 CREATE(21 model - Store 已存在 = 20 新表)
- 所有 `@@index` 生成 CREATE INDEX
- 所有 `@@unique` 生成 CREATE UNIQUE INDEX(含 G7-5 `payment_stripe_intent_unique`)
- 所有 `@@id` / FK 生成 PRIMARY KEY / ADD CONSTRAINT
- 4 enum 生成 `CREATE TYPE "OrderStatus" AS ENUM (...)` 等

- [ ] **Step 5：清理临时容器（migration 已经生成到文件）**

```bash
docker stop postgres-migration-gen
docker rm postgres-migration-gen
unset DATABASE_URL
```

- [ ] **Step 6：commit migration**

```bash
git add server/prisma/migrations/20260417000001_extend_schema/
git commit -m "feat(phase-5): generate extend_schema incremental migration

β 增量 path: 在旧 20260309182624_init (Store + StoreUser) 基础上扩展到
完整 21 model schema (15 主表 + 6 子表 + 4 status enum)。
规则 1 增量铁律:不改已发布 init,新增 migration 推进 schema。

Contains (Prisma-generated diff):
- ALTER TABLE stores: i18n + tipBase + updatedAt columns
- DROP TABLE StoreUser (replaced by Staff)
- CREATE TABLE for 20 new entities
- CREATE TYPE for 4 status enums
- Indexes: all @@index + @@unique from schema

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
    // Style parity with withTenantContext: use tagged template (no string concat).
    // Role name is a static identifier, not user input — Prisma treats it as SQL.
    await tx.$executeRaw`SET LOCAL ROLE platform_admin`
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

#### Phase E 事后补丁（2026-04-17）：`afterCommit` 机制

Phase E plan 段 3a 决策点 D（Agent A）+ 段 3b 决策点 H（Agent B）**同一问题**：
SSE `emit(...)` 必须在 `withTenantContext` 返回之后才发（**规则 2**），
不能在 handler 跑 repo 调用的 tx 内。若无机制，Agent B `waitlist.service.ts`
的 4 处 emit 挪到 route 层后仍会落在 tx 内——违规。

**决议**（两个决策点共用依赖）：`tenantAwareRoute` / `platformAwareRoute`
都提供 `res.locals.afterCommit(hook)` 注册函数——handler 登记的 hook 在 tx
**成功 commit 之后**依次触发。若 tx 抛 → hook 永不触发（正确：事件和数据
应该原子一致）。若 hook 本身抛 → log 但不阻断 response（tx 已 commit, 事件
丢失是可接受的降级）。

**使用模式**（Phase E Agent B waitlist 样板）：

```ts
router.post('/stores/:storeId/waitlist', tenantAwareRoute(async (req, res) => {
  const entry = await addEntry(res.locals.storeId!, req.body, res.locals.tx!)
  // emit 登记: tx commit 后触发，不在 tx 内
  res.locals.afterCommit!(() => emit({ type: 'store:waitlist', storeId: res.locals.storeId! }))
  res.json(entry)
}))
```

- [ ] **Step 1：写完整文件**

```bash
mkdir -p server/src/middleware

cat > server/src/middleware/tenant-aware.ts <<'EOF'
import type { Request, Response, NextFunction, RequestHandler } from 'express'
import type { Prisma } from '@prisma/client'
import { withTenantContext, withPlatformContext } from '../repositories/prisma-client.js'
import logger from '../lib/logger.js'

/**
 * Augment Express Response.locals to carry the transaction client
 * inside a tenant-scoped request.
 */
declare module 'express-serve-static-core' {
  interface Locals {
    tx?: Prisma.TransactionClient
    storeId?: string
    platformAdminId?: string
    /**
     * Register a callback to fire AFTER the request's tenant/platform tx
     * commits successfully. Rule 2 enforcement path for SSE emit and
     * similar post-commit side effects.
     *
     * Semantics:
     *   - tx throws → hooks NEVER fire (correct: rollback = no events)
     *   - hook throws → logged, other hooks still fire, response not broken
     *   - hooks fire in registration order (FIFO)
     *
     * Undefined outside a tenant/platformAwareRoute scope.
     */
    afterCommit?: (hook: () => void | Promise<void>) => void
  }
}

export type TenantAwareHandler = (req: Request, res: Response) => Promise<void>

/**
 * Wrap an async route handler so it runs inside withTenantContext.
 * - Reads storeId from req.params.storeId (required — route pattern must include :storeId)
 * - Opens tx + sets RLS store context
 * - Exposes tx on res.locals.tx for handler + repos to use
 * - Exposes afterCommit(hook) on res.locals for rule-2-compliant emits
 * - Any exception propagates to Express error middleware (tx auto-rollback)
 *
 * Usage:
 *   router.get('/orders', tenantAwareRoute(async (req, res) => {
 *     const orders = await orderRepo.findSubmitted({ storeId: res.locals.storeId }, res.locals.tx)
 *     res.json(orders)
 *   }))
 *
 *   // With SSE emit (rule 2):
 *   router.post('/orders', tenantAwareRoute(async (req, res) => {
 *     const order = await orderRepo.createDraftOrder(..., res.locals.tx)
 *     res.locals.afterCommit!(() => emit({ type: 'order:created', storeId, orderId: order.id }))
 *     res.json(order)
 *   }))
 */
export function tenantAwareRoute(handler: TenantAwareHandler): RequestHandler {
  return async (req, res, next) => {
    const storeId = req.params.storeId
    if (!storeId) {
      res.status(400).json({ error: 'storeId missing from route' })
      return
    }
    const hooks: Array<() => void | Promise<void>> = []
    try {
      await withTenantContext(storeId, async (tx) => {
        res.locals.tx = tx
        res.locals.storeId = storeId
        res.locals.afterCommit = (hook) => { hooks.push(hook) }
        await handler(req, res)
      })
      // tx committed — fire hooks in registration order.
      // Errors here are logged, not propagated: the response is already
      // sent / sending, and the tx is durable. Event loss is degrade-only.
      for (const hook of hooks) {
        try {
          await hook()
        } catch (err) {
          logger.error({ err }, 'afterCommit hook failed (tx already committed)')
        }
      }
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
 *
 * Same afterCommit semantics as tenantAwareRoute.
 */
export function platformAwareRoute(handler: TenantAwareHandler): RequestHandler {
  return async (req, res, next) => {
    if (!res.locals.platformAdminId) {
      res.status(403).json({ error: 'platform admin auth required' })
      return
    }
    const hooks: Array<() => void | Promise<void>> = []
    try {
      await withPlatformContext(async (tx) => {
        res.locals.tx = tx
        res.locals.afterCommit = (hook) => { hooks.push(hook) }
        await handler(req, res)
      })
      for (const hook of hooks) {
        try {
          await hook()
        } catch (err) {
          logger.error({ err }, 'afterCommit hook failed (platform tx already committed)')
        }
      }
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
- Response.locals typed to carry tx/storeId/platformAdminId/afterCommit
- afterCommit(hook) registers rule-2-compliant post-commit callbacks:
  SSE emit and similar side effects fire AFTER tx commits, never inside.
  tx rollback → hooks never fire (event/data atomicity). hook throws →
  logged but does not break response.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 9a：seed.ts — platform admin + demo store + ModuleLicense

**Files:**
- Create: `server/prisma/seed.ts`
- Create: `server/prisma/seed-data/store.ts`

**前置**：Task 8 完成。

**本 task 只做前 3 步**（super admin 已经由 migration 插入，seed 这里是 idempotent update；demo store；ModuleLicense）。后 3 步（roles / owner staff / menu / tables）在 Task 9b。

> **Plan 修订(2026-04-19,Ian calibration)**:本 Task 9a/9b **新 seed 从零写**(非 patch 旧 seed),但必须**参考旧 `server/prisma/seed.ts`(1879 bytes,Phase 5 前遗留)的测试数据内容** —— 有价值部分(菜品 / 账号 / 桌号 demo 数据)迁移到新 seed,确保开发/演示连续性。不复用旧 seed 代码结构(JsonStore 时代,与 Prisma seed 语义不兼容)。
>
> **旧 `seed.ts` 归档**:不在本 plan 处理,Phase I 清理阶段归档到 `_archive/`(详 spec §9.10)。Task 9a 实施时备份 `cp server/prisma/seed.ts server/prisma/seed.ts.pre-phase5` 即可,Phase I 统一归档。

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

### Task 10：更新 `docker-compose.yml` + 开启 `no-floating-promises` + 清理临时容器

**Files:**
- Modify: `docker-compose.yml`（加 postgres + backup 占位，或新建）
- Modify: `.env.example`（加 DATABASE_URL / SYSTEM_DATABASE_URL 模板）
- Modify: `server/.eslintrc.cjs` 或 `server/eslint.config.mjs`（加 `no-floating-promises`）
- Modify: `server/package.json`（确保 `test:db` 等 script 就位）

**前置**：Task 9b 完成；`postgres-seed-test` 临时容器还在跑。

- [ ] **Step 1：停掉 Task 9a/9b 留下的临时容器**

```bash
docker stop postgres-seed-test 2>/dev/null && docker rm postgres-seed-test 2>/dev/null
docker ps -a --format "{{.Names}}" | grep postgres  # 应该没有输出
unset DATABASE_URL
```

- [ ] **Step 2：读现有 `docker-compose.yml` 评估改动范围**

```bash
cd "$(git rev-parse --show-toplevel)"
cat docker-compose.yml 2>/dev/null || echo "NO FILE"
```

三种可能：
- **没有 compose 文件** → 创建新的
- **有 compose 但无 postgres** → 加 postgres service
- **有 postgres** → 检查 image 版本、volume 挂载、env 变量，按下面的 template 对齐

- [ ] **Step 3：写/更新 `docker-compose.yml`**

如果现有文件已有 server/client 服务，保留；只加 postgres 块。如果从零开始：

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: qr-order-postgres
    environment:
      POSTGRES_DB: qr_order
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_SUPERUSER_PASSWORD:-devonly}
    ports:
      - "5432:5432"
    volumes:
      - pg_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "postgres", "-d", "qr_order"]
      interval: 5s
      timeout: 3s
      retries: 10

  # server 和 client 保持你现有的定义（如已有）
  # Phase G/J 会加 backup 服务到 docker-compose.prod.yml

volumes:
  pg_data:
```

**关键点**：
- `ports: "5432:5432"`——开发环境暴露；**生产 override 时不暴露**（Phase J Task 48 处理）
- `POSTGRES_PASSWORD` 走 env 变量，有 fallback 'devonly' 纯粹开发方便
- `container_name: qr-order-postgres` 固定——后续 Task 从 EC2 诊断 + 脚本都会引用这个名字

- [ ] **Step 4：写 `.env.example` 模板**

```bash
cat > .env.example <<'EOF'
# ---- Postgres ----
# 应用连接用 app_user（RLS-bound）
DATABASE_URL=postgresql://app_user:devonly@localhost:5432/qr_order
# 后台任务用 system_worker（BYPASSRLS）
SYSTEM_DATABASE_URL=postgresql://system_worker:devonly@localhost:5432/qr_order
# superuser，仅用于 migration（docker-compose 内部，非应用）
POSTGRES_SUPERUSER_PASSWORD=devonly
# migration 跑完后用来 ALTER ROLE 设置实际密码
APP_USER_PASSWORD=devonly
PLATFORM_ADMIN_PASSWORD=devonly
SYSTEM_WORKER_PASSWORD=devonly

# ---- Seed ----
DEMO_PLATFORM_ADMIN_PASSWORD=changeme
DEMO_OWNER_PASSWORD=changeme

# ---- Stripe / JWT / etc（保持现有值） ----
# STRIPE_SECRET_KEY=...
# STRIPE_WEBHOOK_SECRET=...
# JWT_SECRET=...
EOF
```

如果现有 `.env.example` 已有 Stripe/JWT 段落，保留那些、前面加上述 Postgres 块。

**注意**：现在 migration 里 DB roles 用 `'placeholder_set_by_env'` 密码（Task 4 写的），Task 10 还不切到实际密码——Phase J Task 48 的 `post-migrate.sh` 才做 `ALTER ROLE`。开发环境先用 superuser 跑 seed。

- [ ] **Step 5：开启 ESLint `no-floating-promises`**

```bash
ls server/.eslintrc* server/eslint.config.* 2>/dev/null
```

根据现有文件格式选一个：

**A. 如果是 `.eslintrc.cjs` / `.eslintrc.json`**：

```js
// server/.eslintrc.cjs（在 rules 里加）
rules: {
  '@typescript-eslint/no-floating-promises': 'error',
  // ... 其他现有规则
}
```

**B. 如果是 `eslint.config.mjs`（flat config）**：

```js
// server/eslint.config.mjs
export default [
  // ... 现有配置
  {
    files: ['src/**/*.ts'],
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
    },
  },
]
```

**C. 如果 server 没有 ESLint 配置**：先装依赖：

```bash
cd server
pnpm add -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
# 再建 .eslintrc.cjs
```

- [ ] **Step 6：扫现有代码报告 floating promise 数量**

```bash
cd server
pnpm eslint 'src/**/*.ts' --rule '{"@typescript-eslint/no-floating-promises":"error"}' 2>&1 | tail -20
```

预期：JsonStore 全同步，**应该 0 个** floating promise 错误。有的话记下文件 + 行号，在 Phase G async 化时一起修。不阻塞本 task。

- [ ] **Step 7：起新的 compose postgres 服务验证通路**

```bash
cd "$(git rev-parse --show-toplevel)"
docker compose up -d postgres
docker compose ps
```

预期：
```
NAME                  IMAGE                 STATUS
qr-order-postgres     postgres:16-alpine    Up X seconds (healthy)
```

- [ ] **Step 8：migrate deploy + seed 验证新容器**

```bash
cd server
export DATABASE_URL="postgresql://postgres:devonly@localhost:5432/qr_order"
pnpm prisma migrate deploy
pnpm prisma db seed
```

预期：3 个 migration 全部应用 + seed 10 个步骤全通，和 Task 9b Step 5 输出一致。

- [ ] **Step 9：验证 JsonStore 应用仍可启动（Phase B 完成标志）**

```bash
# 回原 DATABASE_URL 或 unset，让 server 用 JsonStore
unset DATABASE_URL

cd server
pnpm dev &
SERVER_PID=$!
sleep 3
curl -s http://localhost:3001/api/health || echo "health check failed"
kill $SERVER_PID 2>/dev/null
```

预期：curl 拿到 OK（或你现有的 health 响应）。**Prisma 已就位但业务代码还没引用——应用照常启动**。这是 Phase B 的验收标志（spec §9.3 / D46）。

- [ ] **Step 10：commit**

```bash
cd "$(git rev-parse --show-toplevel)"
git add docker-compose.yml .env.example server/.eslintrc.cjs server/eslint.config.mjs 2>/dev/null
git add server/package.json 2>/dev/null
git commit -m "feat(phase-5): docker-compose postgres + eslint no-floating-promises

- postgres 16-alpine service with named volume pg_data
- .env.example documents DATABASE_URL / SYSTEM_DATABASE_URL / seed creds
- @typescript-eslint/no-floating-promises enabled (Phase G async refactor guard)
- withPlatformContext style unified with withTenantContext (tagged template)

Phase B acceptance: Prisma infrastructure ready, JsonStore still powers runtime.
Business code swap comes in Phase D.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

**Phase B 完成。**Phase C 可开工。


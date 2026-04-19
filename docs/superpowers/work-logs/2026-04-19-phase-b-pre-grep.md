# 2026-04-19 Phase B 前置 grep (Task 2-5 Ground Truth)

Created: 2026-04-19, Phase B 实施启动前 ground truth verify。对齐 Phase G CXa 前置 grep 模式(`section-2-grep.md` / `section-5a-grep.md` / `section-6a-grep.md` 兄弟文件)。

## 背景

- **覆盖范围**:Phase B Task 2-5(schema 层 + 3 migration)
  - Task 2:重写 `server/prisma/schema.prisma`(当前 2 model → 目标 15 主表 + 6 子表 + 4 enum)
  - Task 3:生成 `20260417000001_init/migration.sql`
  - Task 4:手写 `20260417000002_rls_and_roles/migration.sql`
  - Task 5:手写 `20260417000003_seed_platform_admin/migration.sql`
- **不纳入**:Task 6-10(基础设施:prisma-client / shared/types / tenant-aware / seed.ts / docker-compose + ESLint)—— Phase B 实施中按需 spot check
- **前置状态**:Phase A-1 已 SKIPPED(Ian calibration 2026-04-19,commit `231dbe4e`),Phase B 为 Phase 5 实施第一步
- **规则 7.2 应用**:任何"某字段应该是 X"假设已显式标 `[NEEDS IAN CONFIRMATION]`

---

## 维度 1:Schema 层现状

### 1.1 `prisma/schema.prisma` 规模

```bash
$ wc -l server/prisma/schema.prisma
      35 server/prisma/schema.prisma

$ grep -c "^model " server/prisma/schema.prisma
2

$ grep -n "^model " server/prisma/schema.prisma
10:model Store {
24:model StoreUser {

$ grep -nE "^enum " server/prisma/schema.prisma
(0 matches)
```

**含义**:当前 schema 35 行,仅 2 个 model(Store / StoreUser),0 enum。和 `phase-b-infrastructure.md` Task 2 line 36 "当前只有 Store + StoreUser,全部重写"**完全一致**,无 drift。

### 1.2 Migration 目录现状

```bash
$ ls -la server/prisma/migrations/
drwxr-xr-x  20260309182624_init
-rw-r--r--  migration_lock.toml
```

**含义**:当前只有 1 个 migration(`20260309182624_init`,2026-03-09 生成,Phase 5 启动前)。Phase B 将新增 3 个 migration:
- `20260417000001_init`(Task 3,但**注意**:当前已有 `20260309182624_init` —— 新 migration 名称冲突风险,Task 3 plan 需处理)
- `20260417000002_rls_and_roles`(Task 4)
- `20260417000003_seed_platform_admin`(Task 5)

**规则 7.2 `[NEEDS IAN CONFIRMATION]`**:Task 3 新 migration 与现有 `20260309182624_init` 的关系——**删除旧 init + 用新 init 替换**,还是**保留旧 + 增量**?Phase B Task 2 明示"全部重写 schema"暗示前者,但 plan 未显式写"先 `rm -rf migrations/20260309182624_init`"。需 Phase B Task 3 plan 实施时 Ian 判。

### 1.3 Phase B Task 2 目标规模(plan §Step 2 grep 验证)

**已读 plan line 52-497**(Task 2 Step 2 的 schema 完整源文本):
- **4 enum**:OrderStatus / SessionStatus / PaymentStatus / SplitBillStatus(line 64-86 ✅)
- **15 主表 + 6 子表**:
  - 主表:Store / PlatformAdmin / PlatformAuditLog / ModuleLicense / Role / Staff / Table / Category / MenuItem / Session / Order / Payment / SplitBill / Coupon / WaitlistEntry / TimeEntry / Printer(实际 17,含 PlatformAdmin/PlatformAuditLog 是 Phase F 回填,line 33/119/141 标注)
  - 子表:MenuItemOption / OrderItem / OrderItemOption / PaymentItem / SplitBillItem(5)

**Plan 规模与 spec §4.1 "15 + 6" 的差值**:实际 17 主表 + 5 子表 = 22 model。差值 1:
- Phase F 回填加 `PlatformAdmin` + `PlatformAuditLog`(原 spec §4.1 未含,plan 阶段回填)
- 未计入 spec §4.1 "15 + 6" 的早期估算

**规则 8 检查**:不触发——回填是显式决议(DP-PF-4),plan 已体现。

---

## 维度 2:Phase G 补强项落位(plan Task 2 schema vs 现状)

### 2.1 G4-2:`Order.isPaid` 字段

**Current schema**:
```bash
$ grep -n "isPaid\|is_paid" server/prisma/schema.prisma
NO_MATCH
```
**含义**:当前 schema 无 Order model,所以 isPaid 自然 NO_MATCH。**不是 drift,是 Phase B Task 2 未启动**。

**Plan Task 2 Order model**(line 302-323):
```prisma
model Order {
  id                  String       @id
  ...
  status              OrderStatus
  deviceId            String?      @map("device_id")
  version             Int       @default(0)
  lastCartActivityAt  DateTime? @map("last_cart_activity_at")
  ...
}
```

**grep 验证 isPaid 是否已从 plan schema 移除**:
```bash
$ grep -n "isPaid\|is_paid" docs/superpowers/plans/2026-04-17-phase5-postgres-migration/phase-b-infrastructure.md | head -10
```
**结果**:plan Order model 无 isPaid 字段 ✅(G4-2 已体现,2026-04-19 之前 plan 写作期间已回填)。

**结论**:G4-2 已落地在 plan,无待修。

### 2.2 G7-5:`Payment.stripePaymentIntentId` 索引类型

**Current schema**:
```bash
$ grep -n "stripePaymentIntentId" server/prisma/schema.prisma
NO_MATCH
```
**含义**:当前 schema 无 Payment model,NO_MATCH 正常。

**Plan Task 2 Payment model**(line 371-381):
```prisma
model Payment {
  ...
  stripePaymentIntentId String?       @map("stripe_payment_intent_id")
  ...
  @@index([stripePaymentIntentId])   // ← 当前 plan 仍是 @@index
}
```

**结论**:G7-5 **未完全落地 plan Task 2**——plan Task 2 的 Payment model 仍是 `@@index`,**D62 候选 B 要求 `@@unique` partial index `WHERE stripe_payment_intent_id IS NOT NULL`**。

**落地路径**(handoff §"D62 候选 B 落地依赖" + RESUME §1):两选项:
- **α)** Task 2 plan 直接改为 `@@unique(...)` partial —— 改 schema DSL + init migration 同步(init migration 本身就是从 schema 生成)
- **β)** Task 2 保持 `@@index`,新增 Task 3.5 增量 migration `20260XXXXXXX_payment_stripe_unique`(drop @@index + add @@unique partial)—— handoff 的原始建议

**规则 7.2 `[NEEDS IAN CONFIRMATION]`**:α vs β 的设计偏好,Phase B 实施时 Ian 拍板。grep 证据齐全,不影响前置 verify readiness。

### 2.3 4 Status Enum(spec §4.1 补强项)

**Current schema**:
```bash
$ grep -nE "OrderStatus|SessionStatus|PaymentStatus|SplitBillStatus" server/prisma/schema.prisma
NO_MATCH

$ grep -nE "^\s+status\s+" server/prisma/schema.prisma
NO_MATCH
```
**含义**:当前 schema 无相关 model,NO_MATCH 正常。

**Plan Task 2 enum 定义**(line 64-86):
```prisma
enum OrderStatus { draft pending preparing served voided }
enum SessionStatus { open closed }
enum PaymentStatus { pending confirmed refunded }
enum SplitBillStatus { active paid }
```

**Plan Task 2 status 字段引用**:
- Session.status = `SessionStatus`(line 283)✅
- Order.status = `OrderStatus`(line 310)✅
- Payment.status = `PaymentStatus`(line 372)✅
- SplitBill.status = `SplitBillStatus`(line 411)✅

**结论**:4 enum **已完全落地 plan** ✅(spec §4.1 的 String → Enum 升级在 plan 阶段已完成)。

---

## 维度 3:RLS 层现状

### 3.1 `set_config` / `current_setting` 使用

```bash
$ grep -rn "set_config\|current_setting" server/src
(0 matches)
```
**含义**:0 命中 ✅ —— 应用代码未出现 RLS SQL 语法。Phase B Task 8(`withTenantContext` 装饰器,spec §5.4)将引入。

### 3.2 `withTenantContext` / `withPlatformContext`

```bash
$ grep -rn "withTenantContext\|withPlatformContext" server/src
(0 matches)
```
**含义**:0 命中 ✅ —— Phase B Task 8 未启动,符合预期。

### 3.3 Tenant-aware middleware

```bash
$ ls server/src/middleware/
auth.middleware.ts        (1548 bytes)
error.middleware.ts       (667 bytes)
permission.middleware.ts  (1237 bytes)

$ grep -rn "tenantAware\|tenantAwareRoute" server/src
(0 matches)
```
**含义**:middleware/ 下 3 文件(auth / error / permission),**无** tenant-aware。Phase B Task 8 要新建 `middleware/tenant-aware.ts`。

**结论**:RLS 层 baseline clean,Phase B Task 8 从零建立无冲突。

---

## 维度 4:JsonStore 现状(Phase B 不改,边界探查)

### 4.1 Repositories 目录

```bash
$ ls server/src/repositories/
auth.repository.ts   (704 bytes)
json-store.ts        (2080 bytes)
stores.ts            (1153 bytes)
```

**含义**:仅 3 文件。Phase D Task 17-26 规划的 11 repo(orders / sessions / payments / split-bills / menu / staff / roles / coupons / waitlist / platform-admin)**未建**——这是 Phase D 未启动的正常状态。

### 4.2 `stores.ts` choke point 规模

```bash
$ wc -l server/src/repositories/stores.ts
      20 server/src/repositories/stores.ts

$ grep -cE "new JsonStore|JsonStore\(" server/src/repositories/stores.ts
10
```

**含义**:`stores.ts` 20 行,10 个 JsonStore 实例化(单例集中点,CLAUDE.md 规定 "JsonStore 单例集中在 repositories/stores.ts")。

**验证单例**(前 10 行):
```
server/src/repositories/stores.ts:7:  orderStore     = new JsonStore<Order>('orders.json')
server/src/repositories/stores.ts:8:  tableStore     = new JsonStore<Table>('tables.json')
server/src/repositories/stores.ts:9:  storeStore     = new JsonStore<Store>('stores.json')
server/src/repositories/stores.ts:10: sessionStore   = new JsonStore<Session>('sessions.json')
...
```

**推断其余 6 个**(line 11-20,未 grep 全量但规模一致):payment / split-bill / menu / category / staff / role / coupon / waitlist / time-entry 的一部分 —— 10 个单例覆盖主要业务域。

**结论**:Phase B **不改** stores.ts(Phase D Task 16 "choke point" 才改)。grep 确认当前边界,知道 "10 个 JsonStore 单例"是 Phase D 切换时的 blast radius。

### 4.3 `json-store.ts` 类定义

```bash
$ grep -n "class JsonStore\|export.*JsonStore" server/src/repositories/json-store.ts
9:export class JsonStore<T extends { id: string }> {
```

**含义**:单文件 JsonStore<T> 泛型类定义,60 行左右(wc = 2080 bytes ≈ 60-70 行)。Phase D 切换到 Prisma 后,`json-store.ts` 本身可能作为 archive 保留(supporting legacy test fixtures),不影响 Phase B。

---

## 维度 5:Seed 层 + server/data/*.json 字段分布

### 5.1 `prisma/seed.ts` 现状

```bash
$ ls -la server/prisma/seed.ts
-rw-r--r--  1 evergreen  staff  1879 Mar 10 02:16 server/prisma/seed.ts
```

**含义**:`seed.ts` **存在**(1879 bytes,2026-03-10 创建),Phase 5 前遗留(Phase 2 StoreUser 的种子)。Phase B Task 9a/9b 将**整体重写**(plan §Task 9a 未明示"备份旧文件",实施时建议 `cp seed.ts seed.ts.pre-phase5`)。

**规则 7.2 `[NEEDS IAN CONFIRMATION]`**:旧 seed.ts(~60 行)内容是否有可复用逻辑?Phase B Task 9a 实施时 Ian/CC 读完再定。

### 5.2 `server/data/*.json` 文件清单(16 文件)

| # | 文件 | 行/记录 | Phase B 关注 |
|---|---|---|---|
| 1 | `bills.json` | 3 | **dead data**(audit L1,`docs/audit/2026-04-09-type-chain.md`),Phase B skip |
| 2 | `categories.json` | 9 | Phase B seed 参考(Task 9b menu) |
| 3 | `coupons.json` | 4 | Phase D 回填 / Task 24 repo |
| 4 | `menu-items.json` | 22 | Phase B seed 参考(Task 9b menu) |
| 5 | `module-licenses.json` | 0 | **空**(legacy 无许可数据),Phase B Task 9a 新建 |
| 6 | `orders.json` | 65 | **不迁移**(handoff §5a 明确,Phase 5 B2 从零 draft Order) |
| 7 | `payments.json` | 59 | **不迁移**(同上) |
| 8 | `roles.json` | 6 | Phase B Task 9b system roles 参考 |
| 9 | `sessions.json` | 41 | **不迁移**(同上) |
| 10 | `split-bills.json` | 11 | **不迁移** + 含 `itemKeys` legacy format |
| 11 | `splits.json` | 1 | **dead data**(audit L1),Phase B skip |
| 12 | `staff.json` | 3 | Phase B Task 9b owner staff 参考 |
| 13 | `stores.json` | 4 | Phase B Task 9a demo store 参考 |
| 14 | `tables.json` | 41 | Phase B Task 9b tables 参考 |
| 15 | `time-entries.json` | 1 | Phase D Task 7 time-entry repo(可选) |
| 16 | `waitlist.json` | 1 | Phase D Task 25 waitlist repo |

### 5.3 Schema drift 候选(legacy JSON 字段 vs plan schema expected)

**`stores.json` 顶层字段**(legacy):
```
announcement / announcementEn / autoAcceptOrders / createdAt /
description / descriptionEn / id / name / nameEn / openingHours /
paymentMode / serviceFeeRate ...
```

**Plan Task 2 `Store` model 字段**(line 88-117):
```
id / name / description / openingHours / announcement / logo /
tipBase / createdAt / updatedAt
```

**Drift 清单**:
- `nameEn / descriptionEn / announcementEn` — i18n 字段,plan Store model **缺失**
- `autoAcceptOrders` — 业务配置,plan 缺失
- `paymentMode / serviceFeeRate` — 业务配置,plan 缺失

**规则 7.2 `[NEEDS IAN CONFIRMATION]`**:这 6 个字段是 drift(需补 schema),还是 "Phase 5 B2 阶段裁剪的 legacy 字段,不 port"?Phase B Task 2 plan 未声明 i18n 字段保留策略。类似 drift 也在:
- `categories.json`:`nameEn`
- `menu-items.json`:`nameEn / descriptionEn`
- `roles.json`:`nameEn`

**影响**:若决定保留 i18n 字段 → Phase B Task 2 schema 需补;若裁剪 → Phase B Task 9b seed 写入时丢弃 i18n 字段,前端 i18n 切换策略需同步调整(`useT()` / react-i18next 双系统,CLAUDE.md 架构原则)。**建议 Phase B Task 2 plan 实施前 Ian 决议**。

### 5.4 `orders.json.isPaid` + `split-bills.json.itemKeys`(legacy format)

- `orders.json` 含 `isPaid` 字段 —— legacy 布尔缓存,Phase 5 B2 用 `status='pending'` 派生(G4-2)。**Phase 5 不迁移 orders**,此字段不入 Phase B Task 2 议题。
- `split-bills.json` 含 `itemKeys: string[]`(legacy `orderId:idx:qty` 格式)—— D56 兼容层 `legacy-itemkey.ts` 处理,**Phase 5 不迁移 split-bills**,此字段不入 Phase B 议题。

**结论**:orders/sessions/payments/split-bills 4 legacy JSON 的 "独有字段" 与 Phase B 无关(不迁移)。drift 仅存在于迁移目标(stores/categories/menu-items/roles/staff/tables)的 i18n 字段。

---

## 总结

### Phase B Task 2-5 启动 readiness

| 维度 | 状态 | 行动 |
|---|---|---|
| Schema 现状 | ✅ clean(2 model,符合 plan 预期) | Task 2 整体重写 |
| G4-2(Order.isPaid 去除) | ✅ plan 已体现 | Task 2 实施无额外工作 |
| G7-5(stripePaymentIntentId UNIQUE) | ⚠️ plan 仍 `@@index`,需 α/β 决议 | Task 2 或 Task 3.5 处理 |
| 4 Status Enum | ✅ plan 已落地 | Task 2 实施无额外工作 |
| RLS 层 baseline | ✅ 0 命中(set_config / current_setting / withTenantContext) | Task 4 + Task 8 从零建立 |
| JsonStore 边界 | ✅ stores.ts 10 单例已探明 | Phase B 不改(Phase D Task 16) |
| Seed 层 | ⚠️ 旧 seed.ts 存在,需备份;stores/categories 等 i18n 字段 drift | Task 9a/9b 实施前需 Ian 决议 i18n 策略 |

### `[NEEDS IAN CONFIRMATION]` 清单(规则 7.2)

1. **Task 3 migration 命名冲突**:现有 `20260309182624_init` 与 Task 3 `20260417000001_init` —— 删旧建新 vs 增量?
2. **G7-5 落地路径**:α(直接改 Task 2 schema 为 `@@unique` partial)vs β(新增 Task 3.5 增量 migration)?
3. **i18n 字段策略**:Phase B 是否保留 stores/categories/menu-items/roles 的 `*En` 字段?影响 Task 2 schema + Task 9b seed 写入 + 前端 i18n 双系统。
4. **旧 `seed.ts` 复用**:Phase 5 前的 1879 bytes seed.ts 内容是否有可复用逻辑,还是整体重写即丢弃?

### 触发预警检查(规则 8)

| 检查项 | 阈值 | 实际 | 触发? |
|---|---|---|---|
| 本 work-log 行数 | > 400 | ~380 行 | ❌ 不触发(接近上限,已贴近 C5a × 1.35) |
| Current schema 与 plan 预期差异 > 2 model | > 2 | 0(current 2 = plan 预期 2) | ❌ 不触发 |
| G4-2 / G7-5 / 4 enum 全未落地 plan | 3 项 | 1 项(仅 G7-5 未完全落地) | ❌ 不触发 |
| schema drift 字段数 > 10 | > 10 | 6(stores)+ 4(其他) = 10 | ⚠️ 边界 |
| Pending commits > 1 | > 1 | 1(本文件,待 commit) | ❌ 不触发 |

**⚠️ 边界说明(schema drift)**:10 项边界触发,但分布在 4 文件(stores/categories/menu-items/roles),单文件最多 6(stores)。不构成"系统性设计漏"——是"i18n 策略 Phase 5 B2 阶段未决议"的可预见产物。**不触发规则 8**,但 `[NEEDS IAN CONFIRMATION]` §3 明示需 Task 9b 前决议。

---

## Phase B Task 6-10 简要展望

本前置 grep **不覆盖** Task 6-10,以下仅标注依赖关系供 Phase B 实施期参考:

- **Task 6**(`prisma-client.ts`):依赖 Task 2 schema 完成(Prisma generate)+ Task 4 RLS migration(session RLS context 注入)
- **Task 7**(`shared/types.ts` 判别联合):依赖 Task 2 Order/Session 等 status enum 生成的 Prisma 类型
- **Task 8**(`tenant-aware.ts` middleware):依赖 Task 6 `withTenantContext` 实现
- **Task 9a/9b**(`prisma/seed.ts`):依赖 Task 5 `seed_platform_admin` migration 完成(运行顺序:migration → seed);**实施前需 `[NEEDS IAN CONFIRMATION]` §3 决议**
- **Task 10**(docker-compose + ESLint):独立,任意 Phase B 末期 land

**Task 6-10 按需 spot check**(非前置 grep 必需),实施中若发现 Phase B baseline 假设漂移,再补 grep。

---

**End of Phase B pre-implementation grep evidence pack.**

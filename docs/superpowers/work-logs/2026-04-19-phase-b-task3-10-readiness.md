# 2026-04-19 Phase B Task 3-10 Verify Readiness (L2 速读)

Created: 2026-04-19, Phase B Task 2 plan 修订完结后(commit `52903d31`),对下游 Task 3-10 做 L2 速读,识别 Task 2 修订(16 字段 + Staff.roleId NOT NULL + Table `label→name` + D71 候选)的破坏性影响,避免 Mode C 级延迟发现。

**Scope**:L2 速读(不深入),10 分钟预算,目的是 **verify 优先级排序**(L1 / L2 / L3 / skip),非 plan 修订。

---

## 1. Task 3-10 plan 现状

### 1.1 各 Task 位置 + 篇幅

```
Task  起始行  预计篇幅(行)
 3     666     ~124   (生成 extend_schema 增量 migration, 9153f076 修订过)
 4     790     ~87    (手写 rls_and_roles migration)
 5     877     ~52    (手写 seed_platform_admin migration)
 6     929     ~124   (prisma-client.ts + withTenantContext)
 7    1053     ~132   (shared/types.ts 判别联合)
 8    1185     ~776   (middleware/tenant-aware.ts + afterCommit)
 9a/b  未 grep —     (seed.ts, 9153f076 修订过加 reference)
10    1961     ~207   (docker-compose + ESLint)
总:   2168 - 666 = 1502 行(Task 3-10 合计)
```

**观察**:
- Task 8 极大(~776 行,E Phase 回填 afterCommit 机制)—— 本次 L2 速读只需检查 G7-4 / G7-6 接口是否已 inline
- Task 3 已被 9153f076 部分修订(β 增量 path),但仍缺 **16 字段 ALTER/RENAME 具体 SQL 预期** 和 **Staff.roleId 从 `?` → NOT NULL 的 data cleanup 顺序依赖**

### 1.2 9153f076 commit stat

```
1 file changed, 108 insertions(+), 50 deletions(-)
```

9153f076 只触动 Task 2 / 3 / 9 三段。**Task 4 / 5 / 6 / 7 / 8 / 10 原封未动**。

---

## 2. Task 2 修订对下游 Task 的影响触点表

| Task | Plan 现状 | Task 2 修订影响 | Verify 建议 | 失败成本 |
|---|---|---|---|---|
| **3** Migration | 9153f076 改过(β extend_schema),Step 4 审核清单写 "ALTER stores + DROP StoreUser + CREATE 20 新表",但 **未具体列 16 字段 ALTER + Staff FK 转换 + Table label→name RENAME** | 🔴 **高影响**:Prisma `migrate dev --create-only` 生成的 SQL 需要手工审核 `ALTER TABLE stores ADD COLUMN tax_rate` 等 5 列 + `ALTER TABLE tables RENAME COLUMN label TO name` + 5 tables 列 + `ALTER TABLE staff ALTER COLUMN role_id SET NOT NULL` + onDelete 约束变更。**顺序依赖**:Step 2.5 数据清理 **必须早于** Task 3 migrate(NOT NULL 约束要求 staff roleId 全填) | **L1** | **高**(schema drift → DB,rollback 贵) |
| **4** RLS migration | 独立手写 SQL,含 `tenant_isolation` policy + `one_draft_per_device` partial unique | 🟢 **低影响**:16 字段都在已有表(stores/tables/orders/coupons/menu_items/categories)或 Order 内,**不新建 store_id 表** → RLS policy 自动覆盖(基于 information_schema.columns WHERE column_name='store_id')。**新字段不引入 RLS drift** | **skip / L3** | 低 |
| **5** Seed platform admin migration | 独立 INSERT SQL(`platform_admins`)+ bcrypt placeholder | ⚪ **零影响**:与 Task 2 schema 无关,platform_admins 表不含 16 字段 | **skip** | 零 |
| **6** prisma-client.ts | `withTenantContext` / `withPlatformContext` / `withSystemContext` + assertUuid + `Db` type export | 🟢 **低影响**:Task 2 schema 通过 Prisma 自动生成 `@prisma/client` 类型,`Db` export 不变。**G7-4 `withTenantContextAndHooks` 不在 Task 6**(应在 Task 8 middleware 层,复核)| **skip / L3** | 低 |
| **7** shared/types.ts | 判别联合 `DraftOrder` / `SubmittedOrder` + `isDraft` / `isSubmitted` helpers,未修订过 | 🔴 **高影响**:**Task 2 新增 16 字段需同步到 shared/types.ts** 的 Store/Table/Order/Coupon/MenuItem/Category interfaces;**Staff 的 `role: string` legacy 字段需 remove**(对齐 plan schema),`roleId?` 改 `roleId: string`(NOT NULL)。当前 Task 7 plan **完全未 inline Task 2 修订影响**。`shared/types.ts` 现状已有 11 i18n 字段 + 部分 Mode C 字段(taxRate / autoAcceptOrders 已有,grep f180204b §5.3 证实)—— **需细分哪些已存在 / 哪些要加** | **L1** | **高**(编译器错 → Phase D/E/G 连锁 type error) |
| **8** tenant-aware middleware | `tenantAwareRoute` / `platformAwareRoute` + afterCommit 机制。篇幅 ~776 行(含 afterCommit 大段 Phase E 回填) | 🟡 **中影响**:**G7-4 `withTenantContextAndHooks(storeId, async (tx, registerAfterCommit) => ...)` 是否已在 Task 8 plan?**(handoff §D62 Task 41 webhook 依赖)需 grep 确认。**G7-6 `paymentRepo.attachItems` 不在 Task 8**(是 Phase D repo 层回填) | **L2**(grep G7-4 + verify afterCommit 机制满足 webhook 需求) | 中(G7-4 缺 → Phase G Task 41 webhook 实施阻塞)|
| **9a/b** seed.ts | 9153f076 修订过(加 "参考旧 seed.ts 测试数据" + D71 归档 reference)。**未改 demo store 重建范围**(seed 写 `store-demo-001`,不涉及 `store-demo-002`)| 🟢 **低影响**:衍生 2 = γ 决议 `store-demo-002` 整体 Phase I 重建,**Phase B Task 9a/9b 不负责**。Step 2.5 staff cleanup 仅影响 `store-demo-002`,seed.ts 建 `store-demo-001` 数据路径独立 | **L3**(仅 verify seed 不误写 store-demo-002)| 低 |
| **10** docker-compose + ESLint | docker-compose postgres 服务 + `no-floating-promises` ESLint rule + 清理临时容器 | ⚪ **零影响**:基础设施 task,与 Task 2 schema 无关 | **skip** | 零 |

---

## 3. Verify 优先级 + 规则 8 发现

### 3.1 推荐 verify 优先级排序(按失败成本 × 不确定性)

| 序 | Task | 优先级 | 建议 | 理由 |
|---|---|---|---|---|
| 1 | **Task 3** | 🔴 最高 L1 | 细读 Step 3-4(migration 生成 + 审核 SQL 期望清单)+ 加 Step 3.5 "Step 2.5 必须早于 migrate apply" 顺序约束 | Task 2 修订 3 类 SQL 变更(16 ALTER / 1 RENAME / 1 NOT NULL alter 约束)需 plan 层声明,否则实施时手工审核漏项 |
| 2 | **Task 7** | 🔴 高 L1 | 细读现有 plan + 对 shared/types.ts 做 diff grep 确定需加字段 + 加 Staff.role 移除段 | Task 7 plan 完全未 inline Task 2 修订影响,编译链路覆盖 Phase D/E/F/G |
| 3 | **Task 8** | 🟡 中 L2 | grep `withTenantContextAndHooks` / `afterCommit` 在 Task 8 plan 中的 inline 程度 + 判断是否满足 Phase G Task 41 webhook 需求 | G7-4 必需级(Phase G Task 41 webhook 依赖),若 Task 8 plan 已含则 skip,否则需回填 |
| 4 | **Task 9a/9b** | 🟢 低 L3 | 速查 seed.ts plan 是否不误写 `store-demo-002`(衍生 2 = γ Phase I 独占)| 快速 verify,低概率漂移 |
| 5 | **Task 4** | 🟢 低 L3 | 快速 verify 新字段不需 RLS 特殊处理(Order.tableName 是 Order 表现有列,RLS policy 自动) | 低风险 |
| 6-8 | Task 5 / 6 / 10 | ⚪ skip | 独立基础设施,与 Task 2 修订无依赖 | 零影响 |

### 3.2 规则 8 单独汇报(阶段 A 发现)

**发现 1 · Task 7 plan 严重 outdated**:
- Task 7 plan(`line 1053-1185`,~132 行)**完全未反映 Task 2 修订**
- shared/types.ts 新增 11 i18n + 16 Mode C δ 字段的同步逻辑 0 inline
- Staff.role 移除 + roleId NOT NULL 的 types.ts 对应改动 0 inline
- **影响**:Phase B Task 7 实施时会手工推断哪些字段要加/删,漏项概率高
- **建议**:进 L1 verify 时,plan 级修订 Task 7 加"16 字段同步清单"+ Staff legacy field 移除段

**发现 2 · Task 3 Step 4 审核清单颗粒度不足**:
- 当前 Step 4 审核 SQL 只写 "ALTER TABLE stores ADD COLUMN..."(generic)
- 未列:Table `label→name` RENAME(破坏性,审核重点)+ Staff roleId NOT NULL 约束变更 + 16 字段具体 column list
- **影响**:migration SQL 生成后审核漏项,可能 apply 前无法捕捉 drift
- **建议**:进 L1 verify 时,plan 级修订 Task 3 Step 4 加具体审核 checklist

**发现 3 · Task 3 顺序依赖缺失**:
- Task 3 Step 前置未提 "Step 2.5 必须先跑"(staff.json 清理)
- 实际顺序:Task 2 写 schema → **Task 2 Step 2.5 清 staff.json** → Task 3 `prisma migrate dev --create-only` → Task 3 Step 4 审核 → Task 3 deploy
- **影响**:若按 Task 编号顺序跑 2 → 3 → ...,Step 2.5 被跳过,Task 3 apply 时 NOT NULL 约束破坏
- **建议**:Task 3 顶部前置加 "Step 2.5 必须完成"

**以上 3 发现不触发规则 8 暂停**(阶段 A scope 就是识别这类 mismatch,非超 scope)。

### 3.3 Task 5 / Task 10 "可信赖直接进实施" 判断

| Task | Confirm 直接进实施? | 理由 |
|---|---|---|
| **Task 5** seed_platform_admin | ✅ **可信赖** | 独立 INSERT SQL + bcrypt placeholder,与 Task 2 schema 无依赖(platform_admins 表不含 16 字段 / Staff 变更)|
| **Task 10** docker-compose + ESLint | ✅ **可信赖** | docker-compose postgres 服务(Task 4 依赖)+ ESLint `no-floating-promises`(Phase E 依赖)—— 两者与 Task 2 schema 正交 |

**Task 6** prisma-client.ts 也接近可信赖,但有次要 risk(Prisma generate 类型产出 + `Db` type export)—— L3 快速 verify 即可。

---

## 4. 总结

**主线结论**:Task 2 修订对下游 **2 个 Task 重度影响**(Task 3 migration SQL + Task 7 types.ts)、**1 个 Task 中度影响**(Task 8 G7-4 verify)、**5 个 Task 低/零影响**(Task 4/5/6/9/10)。

**verify 执行建议(给 Ian 决议)**:
- **先 L1 Task 3 + Task 7**(阻塞实施的两大触点)
- **后 L2 Task 8**(G7-4 verify,与 Phase G Task 41 强相关)
- **Task 4/9 L3 快速**,Task 5/6/10 skip

**阶段 A 耗时**:约 8 分钟,未超 10 分钟预算 ✅。

**规则 8**:3 发现(Task 7 outdated / Task 3 审核不足 / Task 3 顺序依赖缺失)均是"阶段 A scope 内识别 mismatch",不暂停汇报,列入 §3.2 供 Ian 决议 L1 verify 是否触发对应 plan 级修订。

---

**End of Task 3-10 verify readiness.**

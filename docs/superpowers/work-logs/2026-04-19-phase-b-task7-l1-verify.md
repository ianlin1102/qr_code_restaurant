# 2026-04-19 Phase B Task 7 L1 Verify — shared/types.ts 同步深度审

Created: 2026-04-19,Phase B Task 2/3 β refinement(`f3db34e8`)完结后,对 Task 7 shared/types.ts 同步做 L1 深度审核。Task 7 plan 写于 Phase G 之前,未吸收 Mode C δ 桶 1 16 字段 / Staff.role 移除 / D67-D71 候选。

---

## 1. 现状速读(阶段 A)

### 1.1 `shared/types.ts` 规模 + export 结构

```bash
$ wc -l shared/types.ts
370 lines

$ grep -nE "^export " shared/types.ts | wc -l
34 exports
```

34 exports:20 interfaces + 6 types + 7 consts/functions + 1 pick。已有 i18n / drift 字段分布见 §1.3。

### 1.2 Task 7 plan 段落(line 1085-1213,128 行)

Plan scope **极狭窄**:
- **Step 1**:`head -50 types.ts` 看 Order/OrderStatus
- **Step 2**:**仅改 OrderStatus**(加 'draft'/'voided')+ 末尾追加 DraftOrder/SubmittedOrder/isDraft/isSubmitted/isActiveOrder
- **Step 3-4**:tsc 验证 + client switch 收集
- **Step 5**:写 OrderStatus TODO work-log 给 Phase G Task 34
- **Step 6**:commit

**完全不涉及**:16 字段同步 / Staff.role 移除 / Staff.roleId NOT NULL / D67-D71 概念。

### 1.3 Task 2 桶 1 16 字段 × types.ts 现状对照

| Task 2 field | types.ts line | 判定 |
|---|---|---|
| Store.nameEn | 5 | ✅ 已在 |
| Store.descriptionEn | 8 | ✅ 已在 |
| Store.announcementEn | 11 | ✅ 已在 |
| Store.taxRate | 17 | ✅ 已在 |
| Store.serviceFeeRate | 18 | ✅ 已在 |
| Store.autoAcceptOrders | 13 | ✅ 已在 |
| Store.maxTables | 15 | ✅ 已在 |
| Store.paymentMode | 16 | ✅ 已在 |
| Category.nameEn | 87 | ✅ 已在 |
| Category.quickTags | 90 | ✅ 已在 |
| MenuItem.nameEn | 114 | ✅ 已在 |
| MenuItem.descriptionEn | 116 | ✅ 已在 |
| MenuItem.originalPrice | 118 | ✅ 已在 |
| Table.name | 134 | ✅ 已在 |
| Table.nameEn | 135 | ✅ 已在 |
| Table.number | 136 | ✅ 已在 |
| Table.enabled | 137 | ✅ 已在 |
| Table.status | 138(union)| ✅ 已在 |
| Table.waiterCalledAt | 150 | ✅ 已在 |
| Order.tableName | 201 | ✅ 已在 |
| **Order.tableNameEn** | **无** | ❌ **需补**(D68 snapshot 延伸) |
| Coupon.minOrderAmount | 301 | ✅ 已在 |

**15/16 桶 1 字段已在 types.ts,仅 1 需补**(`Order.tableNameEn`)。Ian 上轮 L2 速读结论 "Task 7 plan outdated,16 字段 0 inline" 部分正确(plan 无 inline)但**应用面偏差**:**实际 types.ts 领先 Task 2 schema**,types.ts 是 M1/D67 反向 drift 的 source,Task 7 补的是 delta,非 bulk sync。

### 1.4 OrderStatus 映射冲突(Mode C 级发现)

| 来源 | OrderStatus 值 |
|---|---|
| **types.ts:179**(现状)| `'pending' \| 'confirmed' \| 'preparing' \| 'served' \| 'paid' \| 'closed'`(6 值)|
| **Task 2 plan enum**(line 64-70)| `draft \| pending \| preparing \| served \| voided`(5 值)|
| **重叠** | `pending` / `preparing` / `served`(3)|
| **schema 新增** | `draft` / `voided`(2)|
| **types.ts 独有** | `confirmed` / `paid` / `closed`(3)—— **schema 不含,如何映射?** |

**Task 7 Step 2** 指令 "改成 draft/pending/preparing/served/voided" —— **删 3 旧值,加 2 新值**。但 types.ts 有下游消费者(Server controllers + client render),删除这 3 值是**破坏性变更**。需 Phase G Task 34 配合映射,不是 Task 7 独立可决。

### 1.5 Staff.role blast radius(精确 10 处 server 引用)

```
server/src/middleware/permission.middleware.ts:20   req.user.role
server/src/middleware/auth.middleware.ts:48         roles.includes(req.user.role)
server/src/controllers/auth.service.ts:33, 38, 45, 53  (resolvePermissions / JWT / log)
server/src/controllers/staff.service.ts:22, 109, 110    (staff list + owner 保护逻辑)
server/src/controllers/analytics.service.ts:111     (analytics export)
```

**10 处 server** + 估 client 若干(admin UI 角色显示)+ shared/types.ts 本身 5 处(StoreUser.role + JwtPayload.role + AuthUser.role + LoginResponse 派生)≈ **~20 处全项目 blast**。

---

## 2. Task 7 plan 完整内容(line 1085-1213)

Summary 见 §1.2。Plan 6 Step 全部聚焦 **OrderStatus 'draft' B2 判别联合**,无一字涉及 Mode C 或 Staff.role 迁移。

---

## 3. 8 维度 verify 表

| # | 维度 | Task 7 plan 现状 | Gap 严重性 | 修订建议 |
|---|---|---|---|---|
| **1** | 字段集完整性(16 + Staff.role 移除) | Plan 仅 OrderStatus,无字段同步清单 | 🔴 **高** | 加 Step 1.5 Mode C δ 对齐:补 `Order.tableNameEn` + 改 `StoreUser` |
| **2** | 类型精度(Int/String/nullable 对齐) | 无涉及 | 🟡 **中** | 加 Step 1.6 类型精度 check:Table.status union vs schema 注释枚举值一致性 |
| **3** | Enum vs literal(OrderStatus 映射) | Step 2 指令删 3 值加 2 值,无映射策略 | 🔴 **高** | Phase G Task 34 决议 `confirmed/paid/closed` → `?` 映射,**Task 7 暂不删旧值,只加 `draft/voided`**(保留兼容,Phase G 再收窄)|
| **4** | 关联类型(Staff FK → RoleDefinition) | 无涉及 StoreUser 改动 | 🔴 **高** | 加 Step 1.7 StoreUser 改写:移除 `role: string` + `roleId?` → `roleId: string` + 可选 `role?: RoleDefinition` denormalized |
| **5** | 反向 drift(D67/M1, types.ts 领先) | 无涉及 | 🟢 **无** | D67/M1 已在 Task 2 schema 吸收,types.ts 已有字段保留不动(Phase H/I 桶 4 source)|
| **6** | i18n 命名一致性(nameEn/tableNameEn) | 无涉及 | 🟢 **无** | 新增 Order.tableNameEn 符合 `<field>En` 模式,无风险 |
| **7** | Staff.role 删除 blast radius | Step 4 泛化 tsc 检查,无具体清单 | 🟡 **中** | 加 Step 4.5:grep `\.role\b` server/src + client/src,写 TODO work-log 给 Phase E/G(类 OrderStatus TODO 模板) |
| **8** | 序列化兼容(`@qr-order/shared` import) | 无涉及 | 🟢 **无** | types.ts 位置不动,monorepo workspace 导入路径不变 |

---

## 4. 规则 8 触发项(超 scope 发现,独立汇报)

### 发现 1 · OrderStatus 映射冲突(🔴 高,Mode C 级新发现)

**问题**:
- types.ts 6 值:`pending / confirmed / preparing / served / paid / closed`
- Task 2 schema 5 值:`draft / pending / preparing / served / voided`
- **3 旧值无对应映射**:`confirmed` / `paid` / `closed`

**影响链路**:
- Server 侧:`order.service` / `kitchen/KDS render` / `OrderCard` 等任何 switch case on status
- Client 侧:status badge / 订单卡片 / 管理端订单列表过滤
- Settlement:`isPaid` 字段同时存在(Order.isPaid = true 等价于 status='paid')—— Task 2 修订已移除 Order.isPaid(G4-2)+ schema enum 无 'paid' → **状态机二元化**(legacy 是 status='paid' + isPaid=true 两路表达)

**选项**(CC 不自决,规则 7.2):
- α)Task 7 保留 types.ts 6 值 + **加** draft/voided = 8 值(向后兼容过渡)。Phase G Task 34 处理收窄
- β)Task 7 types.ts 改为 schema 5 值,全项目 switch site 同步改(Task 7 blast radius 倍增)
- γ)delegate 全部给 Phase G Task 34(Task 7 留 OrderStatus 现状不动,Phase G 改写时一次性映射)

**建议 Ian 决议**:**α 最低破坏**(Task 7 只加不删,Phase G Task 34 有时间收窄)。γ 次之(Task 7 scope 干净,但 Phase B 后 status union 过期风险)。β 不推荐(破坏性 blast radius 超 Task 7 边界)。

### 发现 2 · StoreUser 改写连锁 JwtPayload / AuthUser(🔴 高)

**问题**:
- types.ts StoreUser.role(line 61, required string)
- types.ts JwtPayload.role(line 273, required string)—— JWT token 中 role 字段
- types.ts AuthUser.role(line 281, required string)—— 前端 auth 状态

**如果 Task 7 移除 StoreUser.role + Staff.roleId NOT NULL**,**JwtPayload.role / AuthUser.role 怎么办**?
- α)同步移除(破坏:老 JWT token 需 rotate / client auth store 需 migration)
- β)保留 JwtPayload.role / AuthUser.role 为 denormalized cache(role.name from RoleDefinition)
- γ)JwtPayload.role 改为 `role: RoleDefinition`(内嵌完整 role 对象)

**建议 Ian 决议**:**β**(最小破坏,denormalized cache 惯例,role.name copy from RoleDefinition.name)。但需 Phase G auth 改造时连锁验证。

### 发现 3 · types.ts 有但 Task 2 schema 无的字段(桶 4 延后,非新 drift)

Category:`hideQuickTags`(line 91);MenuItem:`dietary` / `isRecommended` / `quickTags`;等 —— 已在桶 4 delegate Phase H/I,**non-breaking**,types.ts **不动即可**。CC flag 仅为 verify 清单。

---

## 5. Task 7 plan 修订建议(优先级排序)

| 序 | 修订点 | 优先级 | Task 7 plan 新增 Step | 影响实施质量 |
|---|---|---|---|---|
| 1 | **OrderStatus 映射策略决议**(发现 1)| 🔴 最高 | Step 1.8 新增(α/β/γ 决议 + 映射表)| 不决议会破坏 Phase G Task 34 编译 |
| 2 | **StoreUser 改写连锁 JWT payload**(发现 2)| 🔴 高 | Step 1.7 新增(StoreUser/JwtPayload/AuthUser 同步)| 不决议会破坏 auth 流程 |
| 3 | **Order.tableNameEn 新增**(唯一真 missing)| 🟡 中 | Step 1.5 新增(types.ts 补 Order.tableNameEn)| 少量 plan,D68 snapshot 延伸 |
| 4 | **Table.status union vs schema 注释对齐**(精度)| 🟡 中 | Step 1.6 新增 | 长期一致性 |
| 5 | **Staff.role blast radius 清单**(中)| 🟡 中 | Step 4.5 新增(类 OrderStatus TODO 模板)| 给 Phase E/G 参考清单 |

**建议 Ian 决议**:
- 修订 1 + 2 必须 Ian 决议选项后 CC 才能起草 Step 内容
- 修订 3 + 4 + 5 CC 可直接起草

---

## 6. Ian 决议候选(基于本次 gap 严重度)

| 序 | 路径 | 内容 | 预期 commit |
|---|---|---|---|
| **α** | 决议 OrderStatus(发现 1) + StoreUser/JWT(发现 2) + CC 合并修订 5 项 | 1-2 轮决议 + 单 commit plan 修订 | plan: Phase B Task 7 Mode C alignment + OrderStatus/JWT resolutions |
| **β** | 仅决议发现 1 + 2,修订 3/4/5 延后(OrderStatus + JWT 是阻塞,其他 Phase B 实施期再处理) | 小 commit,unblock Task 7 实施 | plan: Phase B Task 7 OrderStatus + JWT resolutions only |
| **γ** | delegate 全部给 Phase G Task 34(Task 7 仅保留原 OrderStatus 'draft' 加入,**不改 StoreUser**) | 0 commit,Task 7 实施时保守路径 | 无新 commit,Task 2 Step 2.5 narrative 已吸收 StoreUser roleId 语义 |
| **δ** | Ian 决议这批 gap 放 Phase H Task 44(全量 recompile)处理 | 无 Task 7 修订,Phase B Task 7 实施极简 | 无新 commit |

**CC 执行倾向**:**β**(发现 1 + 2 是 Phase B 阻塞项,修订 3/4/5 可 Phase B 实施期手工处理)。γ / δ 有 Phase G 连锁风险,α 过早决议非阻塞项。但 Ian 有 domain knowledge 判 α 值得。

---

**End of Task 7 L1 verify.**

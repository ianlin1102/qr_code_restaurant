# 2026-04-19 Phase B Task 2 — Staff.role FK Q2=b Verify

Created: 2026-04-19, Phase B Task 2 plan 修订前置 grep 之二。验证 Q2=b(Staff.role 切 RoleDefinition FK)实施可行性 — **数据干净度**判定是否触发 b1/b2/b3 子选项。

## 1. Q2=b 定义 + 验证目标

**Q2 = b**:Staff.role 这次就切 RoleDefinition FK(移除 legacy `role: string`,保留 `roleId` FK)。

**数据干净度判定**:
- **干净**(所有 role 字符串可干净映射到 roleId FK)→ Q2=b 直接执行
- **dirty**(role 有自由文本 / null / 无法映射)→ 暂停汇报 Ian,拍 b1/b2/b3:
  - **b1**:切 FK + 写数据迁移脚本(Task 2 复杂度增加)
  - **b2**:切 FK + 无法映射的留 NULL,Phase H 修复
  - **b3**:退回桶 4,后期再切(不在 Phase B 做)

## 2. Grep 证据(规则 7 应用)

### 2.1 shared/types.ts StoreUser 当前签名

```ts
// shared/types.ts:56-65
export interface StoreUser {
  id: string
  storeId: string
  username: string
  password: string
  role: string              // legacy field, kept for backward compat
  roleId?: string           // new: references RoleDefinition.id
  clockPin?: string
  createdAt: string
}
```

**当前双字段并存**:`role: string`(required, legacy)+ `roleId?: string`(optional, FK)。Q2=b 目标:移除 `role` + 必填 `roleId`。

### 2.2 Staff.json 完整数据(3 条)

```bash
$ jq '.' server/data/staff.json
```

| # | id | storeId | username | role | roleId | clockPin |
|---|---|---|---|---|---|---|
| 1 | `staff-owner-001` | store-demo-002 | admin | `owner` | **null** | - |
| 2 | `8bec0727-...` | store-demo-002 | ian | `staff` | **null** | - |
| 3 | `38c21f57-...` | store-demo-001 | ian | `waiter` | `store-demo-001-role-waiter` | 1102 |

### 2.3 Roles.json 映射目标(6 条)

```bash
$ jq '.[] | {storeId, name, id}' server/data/roles.json
```

**2 store × 3 system roles = 6 record**:

| storeId | name | id | permissions |
|---|---|---|---|
| store-demo-001 | owner | `store-demo-001-role-owner` | 18 perms |
| store-demo-001 | manager | `store-demo-001-role-manager` | 17 perms |
| store-demo-001 | waiter | `store-demo-001-role-waiter` | 7 perms |
| store-demo-002 | owner | `store-demo-002-role-owner` | 18 perms |
| store-demo-002 | manager | `store-demo-002-role-manager` | 17 perms |
| store-demo-002 | waiter | `store-demo-002-role-waiter` | 7 perms |

**注意**:**roles.json 里 0 个 `name="staff"` 记录** — staff.json record 2 的 `role="staff"` 无映射目标。

### 2.4 Staff → Role 映射 attempt

| # | staff record | role str | 对应 role FK 候选 | 映射状态 |
|---|---|---|---|---|
| 1 | admin/store-demo-002 | `owner` | `store-demo-002-role-owner` | ⚠️ **可映射** 但 roleId 当前 `null` — 迁移需填 |
| 2 | ian/store-demo-002 | `staff` | **❌ 无对应**(roles.json 无 `staff` name) | 🔴 **dirty** — 规则 8 触发 |
| 3 | ian/store-demo-001 | `waiter` | `store-demo-001-role-waiter` | ✅ **已 FK** |

**Dirty 汇总**:
- 2/3 record 需数据迁移(record 1 填 roleId / record 2 无映射)
- 1/3 record 干净已 FK(record 3)

### 2.5 代码侧使用 `.role` 字段的位置

```bash
$ grep -n "\.role\b" server/src
```

**8 处使用**(筛选出的关键):

| 文件:line | 用法 | 影响 |
|---|---|---|
| `auth.service.ts:33` | `resolvePermissions(storeId, userRoleId, user.role)` | 双字段 fallback(legacy) |
| `auth.service.ts:38` | `role: user.role as string, // backward compat` | JWT payload legacy field |
| `auth.service.ts:45` | `logger.info({ role: user.role }, 'login')` | 日志 |
| `auth.service.ts:53` | `role: user.role` | 登录响应 payload |
| `staff.service.ts:22` | `role: u.role` | staff 列表响应 |
| `staff.service.ts:109` | `all.filter(u => u.role === 'owner')` | **owner 数量校验**(删除最后 owner 保护) |
| `staff.service.ts:110` | `target.role === 'owner'` | 同上 |
| `analytics.service.ts:111` | `role: s.role` | analytics export |
| `middleware/auth.middleware.ts:48` | `if (!roles.includes(req.user.role))` | **requireRole legacy middleware** |
| `middleware/permission.middleware.ts:20` | `req.user.role` | Permission resolve fallback |

**切 FK 连锁改动 blast radius**:
- auth.service.ts 4 处
- staff.service.ts 3 处(含 owner 保护核心逻辑)
- middleware 2 处(requireRole legacy)
- analytics 1 处(非关键)

### 2.6 `resolvePermissions` helper(role.service.ts:129-)

```ts
// role.service.ts:132-138
roleId?: string,
role?: string,  // fallback
...
if (roleId) {
  const role = roleStore.getById(roleId)  // FK path
  ...
}
// 若无 roleId,fallback 到 role 字符串 + hardcoded mapping
```

**双路径 resolve**:FK(优先)→ legacy string(fallback)。切 FK 后 legacy string 路径可删。

## 3. Dirty 数据判定 → 规则 8 触发

**判定**:🔴 **Dirty 数据** — staff.json record 2(`ian/staff`)的 `role="staff"` 无 roles.json 对应。

**规则 8 触发,暂停汇报 Ian**,请求 Q2=b 的 sub-option 拍板:

### 3.1 b1 Sub-option 详解:切 FK + 数据迁移脚本

- **Task 2 复杂度增加**:schema 移除 `role: string` → 必须同时 migration 填 roleId
- **record 1 (admin/owner/null)**:填 `store-demo-002-role-owner` → 直接映射
- **record 2 (ian/staff/null)**:需 **heuristic** 决定映射——3 种选法:
  - (i)最小权限映射到 `waiter`(7 perms)
  - (ii)创建 `staff` role in roles.json(`store-demo-002-role-staff`)+ 映射
  - (iii)Ian 手动填 roleId
- **record 3**:已 FK,无操作
- **成本**:Phase B Task 2 migration 需嵌入 UPDATE staff SET roleId=... 逻辑,或独立 seed 脚本

### 3.2 b2 Sub-option 详解:切 FK + NULL + Phase H 修复

- **Task 2 schema**:`staff.roleId String?`(仍 optional,和 shared/types.ts 一致)
- **移除 `role: string` 字段**,无映射的 record 2 roleId=NULL
- **runtime 行为**:record 2 resolve permissions 时 fallback 到空权限 → **登录可能失败**(需验证 auth.service `resolvePermissions(undefined, undefined)` 行为)
- **Phase H Task 修复**:补 record 2 的 roleId(通过 UI 或 migration)
- **风险**:Phase B 实施后 ian@store-demo-002 登录破坏,直到 Phase H 修

### 3.3 b3 Sub-option 详解:退回桶 4,Phase B 不切

- **Phase B Task 2 schema**:保留 `role: string` + `roleId: String?`(和 shared/types.ts 一致)
- **schema 与 types.ts 1:1 对齐**,无数据迁移
- **Phase I/J** 真正切 FK(数据先清理 + RoleDefinition 完整,再切)
- **成本**:Phase B 桶 1 字段数 -1(Staff.role 从桶 1 移到桶 4)→ 桶 1 覆盖 15 字段(非 16)

## 4. 规则 8 检查

| 检查项 | 阈值 | 实际 | 触发? |
|---|---|---|---|
| Staff.role 数据 dirty | 任一 record 无映射 | record 2(`staff`)无映射 | ✅ **触发** |
| 本 work-log 行数 | > 200 软上限 | ~190 | ❌ 不触发 |
| 超 Q2 scope 的发现 | 例如 RoleDefinition 本身数据 dirty | roles.json 6 record 全齐 | ❌ 不触发 |

## 5. 建议(规则 7 反向,CC 可给执行倾向)

CC 倾向:**b2**。理由:
1. record 2 是真实使用账号(ian/store-demo-002)但**极少量数据**(仅 1 account)—— NULL 后手工补 or UI 创建新 role 成本低
2. b1 的 heuristic 决策(staff → waiter?staff → 新建 role?)**是设计偏好**,CC 不擅自推断。Ian 决议成本 ≥ b2 的 phase H 手工修复
3. b3 保留 legacy `role: string` 字段**污染 new schema**,与桶 δ 策略的"MVP 必需"定位矛盾(Staff.role FK 本来就是 RBAC 现代化的一部分)

但这是**执行倾向非设计偏好**,Ian 如果判 b1/b3 CC 遵从。

## 6. 对 Phase B Task 2 plan 修订影响(悬挂)

**不进 Step 4 plan 修订** — 等 Ian 拍 b1/b2/b3:
- b1 → plan 修订含数据迁移 seed 脚本(额外 ~30 行)
- b2 → plan 修订 schema 移除 `role`,实施期容忍 runtime NULL 风险
- b3 → plan 修订保留 legacy `role` + `roleId?`,桶 1 从 16 减至 15 字段

---

**End of Q2=b Staff.role dirty data pause.**

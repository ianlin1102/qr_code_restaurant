# Phase 5 Plan — Phase F Stage 3b：Platform Admin（Agent D 并行，零冲突）

> **如何使用本文件**
>
> - 全局规则见 [`00-index.md`](./00-index.md#全局规则所有-task-遵守)
> - 执行方式（spec D44）：**独立 agent 并行** —— 和 Phase E（Stage 3a）同时跑不冲突（全新文件 zero-overlap）
> - 本文件含 **Task 30**（platform admin 核心）+ **Task 31**（platform-store 管理）
> - 前置：Phase D 实施完成（特别是 Task 26 `platform-admin.ts` repo）+ Phase B Task 6 `withPlatformContext` + Task 8 `tenantAwareRoute`/`platformAwareRoute`（含 afterCommit 补丁）

## Pending commits 清单（规则 8.1 主动防御）

本文件顶部清单是规则 8.1（commit `28b1874e`）的第一次主动应用——记录本 session Phase F 计划 commit 的产出，避免"等批次统一落"时靠记忆漏项。

Phase F 收尾批次（**2026-04-17 Ian 决议 6 commit**，规则 8.1 实时打勾）：

- [x] C1：**Phase B Task 2 回填 `PlatformAuditLog` schema + migration**（F-2）— commit `4813750d`
- [x] C2：**Phase D Task 26 补丁 `platformAdminRepo.updateLastLoginAt`**（F-1）— commit `753d29c2`
- [x] C3：**Phase D 新增 `platformAuditLogRepo`**（F-3）— commit `58fa4759`
- [ ] C4：**本文件 `phase-f-platform-admin.md`**（含 6 DP 决议 resolution + pending 3/6 打勾）
- [ ] C5：**`00-index.md` Phase F 行更新**（指向本文件）
- [ ] C6：**`RESUME.md` 同步**（当前位置 + Phase F commit hash 时间线）

**规则 8.1 在本批次的形态**：清单在 C4 commit 时反映 "C1/C2/C3 已 landed" 状态 snapshot，C5/C6 不再 edit 本文件（reader git log 可追溯：commit 4 时 3 钩、RESUME commit 6 描述全部 6 commit 完成）。

---

## Spec §9.7 事实核查（规则 7）

**Agent D 独占文件存在性**（grep 验证 2026-04-17）：

| spec 声明 | 实际 | 处理 |
|---|---|---|
| `server/src/routes/platform.routes.ts` | ❌ 不存在（zero-conflict ✅） | 新建 |
| `server/src/controllers/platform-admin.service.ts` | ❌ 不存在 | 新建 |
| `server/src/controllers/platform-store.service.ts` | ❌ 不存在 | 新建 |
| `server/src/middleware/platform-auth.ts` | ❌ 不存在 | 新建（命名微调——见决策点 DP-PF-0） |
| `server/src/__tests__/platform.test.ts` | ❌ 不存在 | 新建 |

**Phase F 是 Phase 5 项目第一个 spec §9.x 文件列表完全准确的 plan 阶段**——全新文件 zero-overlap，对比 Agent A（1 项文件不存在）/ Agent B（2 test 不存在）/ Agent C（1 test 不存在）都有事实修正。spec §9.7 无需回填。

### 决策点 DP-PF-0：middleware 命名

spec §9.7 命名 `platform-auth.ts`，但现有 middleware 目录所有文件都带 `.middleware.ts` 后缀（`auth.middleware.ts` / `error.middleware.ts` / `permission.middleware.ts`）。**一致性建议**：命名为 `platform-auth.middleware.ts`——留决策给实施期。若选 spec 命名，本 task 的 grep ground truth 命令要调整。

---

## 设计前提（grep-anchored，规则 7）

### 现有 auth 模式（`auth.middleware.ts` + `auth.service.ts`）

- **JWT shape**（`auth.service.ts:43`）：`jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY })`——payload 含 `{ id, storeId, role, permissions? }`
- **Tenant 隔离校验**（`auth.middleware.ts:26`）：`if (req.params.storeId && payload.storeId !== req.params.storeId)`——**platform route 没 `:storeId` 参数自动跳过此 check**
- **但 payload shape 不符**：PlatformAdmin JWT 不该有 storeId 字段；`requireAuth` 若放行 platform token 会导致 `req.user.storeId === undefined` 被 tenant-scoped 代码误读为 bug。**结论：platform route 必须走独立 middleware**（不复用 `requireAuth`）
- **bcrypt 模式**：`auth.service.ts:25 bcrypt.compare(password, user.password)`（cost factor 来自 `staff.service.ts:56 bcrypt.hash(password, 10)`）——platform 登录按同模式
- **CLAUDE.md 底线**："不用旧 `requireRole()`"——platform 侧也必须 permission-based（DP-PF-2 展开）

### PlatformAdmin Prisma 模型（spec §3 line 174-184，Phase B Task 2 待实施）

```prisma
model PlatformAdmin {
  id           String    @id @default(uuid())
  email        String    @unique
  passwordHash String    @map("password_hash")
  role         String    // 'super-admin' | 'support' | 'billing-ops'
  isActive     Boolean   @default(true) @map("is_active")
  lastLoginAt  DateTime? @map("last_login_at")
  createdAt    DateTime  @default(now()) @map("created_at")
}
```

- 3 种 role 的**权限差异 spec 未展开**——DP-PF-2 定义
- `isActive=false` 应该拒绝登录（spec 未明示但语义清楚）
- `lastLoginAt` 登录成功时更新——副作用

### PlatformAuditLog spec 未定义

spec §9.7 line 1270 "审计日志" 仅一词，**无 Prisma 模型定义**。DP-PF-4 决议该模型形态。

---

## ✅ 决议汇总（2026-04-17 Ian 全部拍板）

为便于实施 agent 快速对齐，6 DP 决议结果先于讨论过程展示。详细 rationale 见下方各 DP 小节。

| # | 决策点 | 决议 | 关键实施要求 |
|---|---|---|---|
| DP-PF-0 | middleware 命名 | **`platform-auth.middleware.ts`** | 对齐现有 `*.middleware.ts` 约定 |
| DP-PF-1 | Platform JWT 判别 | **方案 B**：共享 secret + payload `kind: 'platform' \| 'tenant'` 字段 | Grace period 30 天（旧 token 无 kind 默认 'tenant'），30 天后 `verifyToken` 强制要求 kind；**跨 agent 边界改 `auth.middleware.ts` + `verifyToken` + `shared/types.ts`，实施期 Ian 亲自批** |
| DP-PF-2 | Platform 分权 | **方案 C**：`PLATFORM_PERMISSIONS` 常量 + `requirePlatformPermission(perm)` | 初版粒度见 DP-PF-2 body |
| DP-PF-3 | Impersonate | **方案 A**：BYPASSRLS + 专门 impersonate UI | 3 条理由见 DP-PF-3 body；frontend handoff：impersonation banner + exit button + 所有 cross-tenant 响应显式标注 `storeId` |
| DP-PF-4 | Audit log 实体 | **方案 A**：新增 `PlatformAuditLog` Prisma 模型 | schema 草稿见 DP-PF-4 body；**不启用 RLS policy**（platform admin BYPASSRLS，audit 跨租户）；已 land commit `4813750d` |
| DP-PF-5 | cross-tenant response 标注 | **方案 A**：`X-Platform-Scope: cross-tenant` header + response 含 `targetStoreId` | 具体细节实施期定 |

**跨 agent 边界警告**（DP-PF-1）：方案 B 修改共享 `auth.middleware.ts` + `verifyToken` + `shared/types.ts` 的 `JwtPayload` 类型。严格违反规则 5（agent 文件独占边界）。**实施期 agent 必须在动手前停下汇报 Ian 亲批**，不自行扩散。

---

## 关键决策点（贴给用户 L2 review）

### DP-PF-1：Platform JWT 识别机制

platform admin token 和 staff token **必须在 JWT 层可区分**——否则 platform token 放进 `/api/stores/:storeId/*` 可能绕过 tenant check（`auth.middleware.ts:26` 的 `payload.storeId && ...` 短路）。

**选项**：
- **A**：独立 JWT secret (`JWT_SECRET` vs `PLATFORM_JWT_SECRET`)——密钥管理复杂，但**密码学层隔离最强**
- **B**：共享 secret + payload `kind: 'platform' | 'tenant'` 字段——运营简单，middleware 根据 `kind` 分派
- **C**：共享 secret + payload issuer 字段 (`iss: 'platform'`)——JWT RFC 标准字段，对称性好

**建议**：**B**（payload `kind` 字段）。理由：`JWT_SECRET` 轮换少而珍贵，多一个 secret 等于多一个轮换负担；`kind` 字段在 decode 后显式 branch，middleware 判断简单。

**✅ [2026-04-17 Ian 决议：方案 B]**——grace period **30 天**：

- **0-30 天**（Phase 5 发布起）：decode 缺 `kind` 字段 → 默认视为 `'tenant'`（向后兼容旧 token）；新签发 token 必带 `kind`
- **30 天后**：`verifyToken` 强制要求 payload 含 `kind`，缺失则 401——迁移窗口关闭

实施：`shared/types.ts` 的 `JwtPayload` 类型改判别联合：

```ts
export type JwtPayload =
  | { kind: 'tenant'; id: string; storeId: string; role: string; permissions: Permission[] }
  | { kind: 'platform'; id: string; platformRole: 'super-admin' | 'support' | 'billing-ops' }
```

**⚠️ 跨 agent 边界（规则 5 严重违反）**：方案 B 修改共享 `auth.middleware.ts` + `auth.service.ts` 的 `verifyToken` + `shared/types.ts`——这些不属 Agent D 独占。实施期 Agent D 到这里必须**停下汇报 Ian 亲批**，本 DP 的"用户决议"仅授权设计决策，跨边界实施每次要二次批。

### DP-PF-2：Platform 分权模型

3 种 platform role 能做什么？

**选项**：
- **A**：binary `requirePlatformAuth` gate + service 层内部按 role if/else——灵活但分散在业务代码里，审计困难
- **B**：`requirePlatformRole('super-admin')` decorator（legacy `requireRole` 同模式）——违 CLAUDE.md "不用 requireRole"
- **C**：定义 `PLATFORM_PERMISSIONS` 常量（对齐店铺侧 RBAC 心智模型）——spec line 554 暗示这个方向

**✅ [2026-04-17 Ian 决议：方案 C]**——初版 PLATFORM_PERMISSIONS 常量（实施期可微调但不偏离方向）：

```ts
export type PlatformPermission =
  | 'stores:read' | 'stores:write'
  | 'modules:grant' | 'modules:revoke'
  | 'impersonate'
  | 'audit:read'
  | 'platform:billing'

export const PLATFORM_PERMISSIONS: Record<PlatformRole, PlatformPermission[]> = {
  'super-admin': ['stores:read', 'stores:write', 'modules:grant', 'modules:revoke',
                  'impersonate', 'audit:read', 'platform:billing'],
  'support':     ['stores:read', 'impersonate', 'audit:read'],
  'billing-ops': ['stores:read', 'platform:billing', 'audit:read'],
}
```

**初版粒度特点**：
- `super-admin` 全权（唯一拥有 stores:write / modules:grant / modules:revoke / platform:billing 全集的 role）
- `support` 不碰 billing、不改 modules——客服定位，只读 + impersonate 排障
- `billing-ops` 不 impersonate、不改 modules——结算定位，只读业务数据 + 专职 billing
- **3 role 都有 audit:read**——任意 platform admin 都能审视自己和他人的操作轨迹（透明审计）

middleware 命名 `requirePlatformPermission(perm)`——对齐店铺侧 `requirePermission` 语义。PLATFORM_PERMISSIONS 常量归属：建议 `shared/platform-permissions.ts`（和 `shared/modules.ts` 并列的 peer module）。

### DP-PF-3：Impersonate 机制（**用户明确留白**）

Platform admin 代某店铺 owner 调试/处理支持工单时，SQL 层怎么跑？

**选项**：
- **A（显式 BYPASSRLS）**：全程 `withPlatformContext`，SQL 看到所有 store 数据；上层 UI 过滤 display storeId。**审计**记录"platform admin X 在 2026-04-17 T 查询了 store Y 的 session Z"。安全语义清楚（每次读都是 platform 权限），但**丢失"我代表 store owner"的身份语义**——代店长下 test order 要额外显式。
- **B（假装 store owner）**：platform admin 点 "impersonate <storeId>" → 后端发放**临时 JWT**（kind=tenant, storeId=targetStoreId, 短 TTL 如 15 min, 额外 `impersonatedBy: platformAdminId` 字段）→ 后续请求走正常 `withTenantContext`。**用户体验**和真实 owner 一致，**审计**靠 JWT 里的 `impersonatedBy` 字段 + 登陆时的 impersonate audit log。但**RLS 绕过隐蔽**——平时查 log 看到的是 owner 行为，要回溯 JWT 才知道是 platform。

**取舍表**：

| 维度 | A（BYPASSRLS 显式） | B（假装 owner） |
|---|---|---|
| 安全 | ✅ 显式，每查都是 platform 权限 | ⚠️ 隐蔽——运营上难以区分"真实 owner vs impersonate" |
| 审计 | ✅ 直接 | ⚠️ 需跨 JWT + log 关联 |
| UX | ⚠️ 要为 impersonate 专门设计 UI | ✅ 和真 owner 体验一致 |
| 代码量 | 简单（加 `withPlatformContext` + audit 即可） | 中（临时 JWT 签发 + impersonatedBy 字段 + 时间短 TTL 过期） |
| 防"误操作代店长发单"| ✅ 必须显式切 tenant context（如提供专用 `withTargetStoreContext` helper） | ⚠️ 默认就能做——需要 UI 层"二次确认"防误 |

**✅ [2026-04-17 Ian 决议：方案 A（BYPASSRLS + 专门 impersonate UI）]**

**3 条理由**（plan 正式记录，让实施 agent 看到理由而非光看结论）：

1. **审计边界清晰**——DB 层能区分"platform 操作" vs "owner 操作"（action 字段 'impersonate' + targetStoreId vs owner 真实 staff token 的 operation）。取证能力明确，合规更强。方案 B 靠 JWT `impersonatedBy` 字段事后关联，取证路径长且易漏（JWT 过期后回溯困难）。

2. **"UX 无感"是反模式**——Stripe Dashboard / Intercom / 其他成熟 SaaS 的 impersonation 都用**醒目 banner** 让操作者主动感知"我不是真用户"。"无感"诱导 platform admin 做本不该做的操作（误发真实邀请、误改用户偏好）。主动感知是安全特性不是 UX 缺陷。

3. **实施复杂度反转**——方案 B 表面简单（"发个临时 token"），但完整审计系统（JWT `impersonatedBy` → 查 log → 关联操作 → 生成 audit trail）比方案 A 的 UI（banner + exit button）复杂得多。方案 B 的审计 = 隐式，方案 A 的审计 = 显式。

**实施 surface（Phase F）**：
- `POST /api/platform/stores/:storeId/impersonate`——返回 impersonation session 信息（storeId / admin context），写入 PlatformAuditLog（action='impersonate', targetStoreId, payload={reason?}）
- 不发放临时 staff JWT——后续所有查询走 platform API（platform admin 继续用 platform token + `withPlatformContext`）
- `POST /api/platform/stores/:storeId/impersonate/exit`——记录 impersonation 结束（payload={duration_seconds}）

**Frontend handoff（Phase G 前端迁移 / 或独立 Phase）**：
- **Impersonation banner** 在顶部（醒目色，不能被关闭）——显示"You are viewing store X as platform admin"
- **Exit button** 直接可达，点击走 `/impersonate/exit` endpoint
- **所有 cross-tenant 响应显式标注 `storeId`**（DP-PF-5 实现细节）——UI 组件可据此显示"当前在 store X context"提示
- Banner 不存在时不应该能触发 impersonate API——client-side 状态机保证

### DP-PF-4：Audit log 实体

spec §9.7 一词 "审计日志"，无 schema。

**选项**：
- **A**：新增 Prisma 模型 `PlatformAuditLog`（id / platformAdminId / action / targetStoreId? / metadata:Json / createdAt）——可查询、可追溯，**但 Phase B Task 2 schema 必须回填**（规则 1：新增 migration `20260418000002_add_platform_audit_log/migration.sql`）
- **B**：复用 `logger`（pino）写入 JSON log file——零 schema 成本，**但**运维查询困难（grep log file），合规审计场景弱
- **C**：混合——敏感操作（grant/revoke/impersonate）进 DB `PlatformAuditLog`；辅助操作进 pino log

**✅ [2026-04-17 Ian 决议：方案 A（新增 `PlatformAuditLog` Prisma 模型）]**——已 land commit `4813750d`（Phase B Task 2 回填）。

schema 草稿（commit `4813750d` 实际 landed 版）：

```prisma
model PlatformAuditLog {
  id            String        @id @default(uuid())
  adminId       String        @map("admin_id")
  admin         PlatformAdmin @relation(fields: [adminId], references: [id], onDelete: Restrict)
  action        String        // 'login' / 'modules:grant' / 'modules:revoke' / 'impersonate' / ...
  targetStoreId String?       @map("target_store_id")
  targetStore   Store?        @relation(fields: [targetStoreId], references: [id], onDelete: SetNull)
  payload       Json
  ipAddress     String?       @map("ip_address")
  userAgent     String?       @map("user_agent")
  createdAt     DateTime      @default(now()) @map("created_at")

  @@index([adminId, createdAt])
  @@index([targetStoreId, createdAt])
  @@index([action])
  @@map("platform_audit_log")
}
```

**关键设计点**：
- **不启用 RLS policy**（platform admin BYPASSRLS，审计跨租户）——Phase B Task 4 RLS migration 必须显式说明 `platform_audit_log` 表无 RLS
- `onDelete: Restrict`（admin 侧）——审计记录不随 admin 删除消失
- `onDelete: SetNull`（store 侧）——store 删了审计仍保留，targetStoreId 设空避免悬挂 FK
- 3 个 index 覆盖预期查询：某 admin 全部操作 / 某 store 被操作 / 某类 action

Repo 实现（`platformAuditLogRepo`）也已 land：commit `58fa4759`（Phase D 附录）——append-only 语义（无 update / delete 方法，合规要求审计不可改）。

### DP-PF-5：cross-tenant API 响应的 storeId 语义

现有 staff API 的响应隐式是"当前 tenant 的数据"（JWT storeId scope）。platform API 列所有 store 时响应必须含 `storeId` 字段——**client 需要明确标注**哪些 API endpoint 返回 cross-tenant 数据，避免前端误用 tenant-scoped 组件渲染 cross-tenant 响应。

**实施**：platform API response schema 所有 entity 显式含 `storeId` 字段 + response header 加 `X-Platform-Scope: cross-tenant`。

**✅ [2026-04-17 Ian 决议：方案 A]**——Header 值定为 `cross-tenant`（用于 platform admin 跨租户查询场景）。Response 显式含 `targetStoreId`（不是隐式的"当前 tenant"语义）。具体 schema 细节（每个 platform endpoint 返回的 entity shape）实施期定。

---

## Task 30：platform admin 核心（login + middleware + routes）

**Files (Create)**：
- `server/src/controllers/platform-admin.service.ts`
- `server/src/middleware/platform-auth.middleware.ts`（命名对齐现有，见 DP-PF-0）
- `server/src/routes/platform.routes.ts`（only auth/me endpoints；store 相关 endpoints 在 Task 31 里注册到同一 router）

**前置**：Phase D Task 26 `platform-admin.ts` repo 实施完成 + Phase B `withPlatformContext` 可用。

**规则 2 合规前置**：若本 task 触发任何事件（例如"platform admin 登录" SSE 广播），必须用 `res.locals.afterCommit`（commit `2f51b8cb` 补丁机制）。本 task 预计**无 emit**——platform 事件通常走 DB audit log，不走 SSE。

### 子任务 30.1：`platform-admin.service.ts`——login + JWT + verify

核心方法：

```ts
export async function loginPlatformAdmin(
  email: string,
  password: string
): Promise<{ token: string; admin: PlatformAdmin } | { error: 'INVALID' | 'INACTIVE' }> {
  // 1. findAdminByEmail via platformAdminRepo (withPlatformContext 下)
  // 2. bcrypt.compare(password, admin.passwordHash)
  // 3. if !admin.isActive → 'INACTIVE'
  // 4. platformAdminRepo.updateLastLoginAt(admin.id, new Date(), tx)
  //    ⚠️ 回填 Phase D Task 26: platformAdminRepo 缺 updateLastLoginAt
  //    ——加入 Phase F 收尾的 Phase D 二次回填清单
  // 5. jwt.sign({ kind: 'platform', id, platformRole }, JWT_SECRET, ...)
  // 6. platformAuditLog.record('login', admin.id, null, null, tx)
  //    ⚠️ 依赖 DP-PF-4 决议
}

export async function verifyPlatformToken(token: string): Promise<PlatformJwtPayload | null> {
  // jwt.verify + 校验 payload.kind === 'platform'
}
```

**规则 3**：loginPlatformAdmin 多步（read admin + update lastLogin + insert audit）——**`tx: TransactionClient` 必填**（D55）。

**L1 要点**（rolePerms 的 platform 等价）：登录成功时 return 的 `admin` 对象**不要**包含 passwordHash——service 层 `omit`。

### 子任务 30.2：`platform-auth.middleware.ts`

```ts
export async function requirePlatformAuth(req, res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing token' })
  const payload = await verifyPlatformToken(header.slice(7))
  if (!payload) return res.status(401).json({ error: 'Invalid token' })
  if (payload.kind !== 'platform') return res.status(403).json({ error: 'Not a platform token' })
  res.locals.platformAdminId = payload.id
  res.locals.platformRole = payload.platformRole
  next()
}

export function requirePlatformPermission(perm: PlatformPermission) {
  return (req, res, next) => {
    const role = res.locals.platformRole
    if (!role || !PLATFORM_ROLE_PERMISSIONS[role]?.includes(perm)) {
      return res.status(403).json({ error: 'Insufficient platform permission' })
    }
    next()
  }
}
```

**关键**：
- 和 `auth.middleware.ts` 独立，不复用 `requireAuth`（语义分派 clean）
- 设置 `res.locals.platformAdminId`——符合 Phase B Task 8 `Locals` 类型（commit `2f51b8cb` 已定义）
- `requirePlatformPermission` 的实现依赖 DP-PF-2 决议

### 子任务 30.3：`platform.routes.ts`——仅 auth/me endpoint

```ts
const router = Router()

router.post('/login', async (req, res) => { ... loginPlatformAdmin ... })

router.get('/me', requirePlatformAuth, platformAwareRoute(async (req, res) => {
  // 返回当前 platform admin profile（对齐 staff /auth/me 语义）
}))

export default router
```

Store 相关 endpoints（`/stores` / `/stores/:id/modules` / 等）在 Task 31 注册进同一 router——不拆第二 router。

### 测试覆盖底线（并入 platform.test.ts，和 Task 31 共用）

- 登录成功 → 返回 token 且 `kind: 'platform'`
- 登录失败（密码错）→ 401 + `INVALID`
- 登录失败（isActive=false）→ 403 + `INACTIVE`
- 带 staff token 调 `/api/platform/me` → 403（`kind !== 'platform'`）
- `requirePlatformPermission` 按 role 正确拒绝/放行（DP-PF-2 决议后写具体 case）

---

## Task 31：`platform-store.service.ts`（列店铺 / 授予-回收 modules / impersonate / 审计）

**Files (Create)**：
- `server/src/controllers/platform-store.service.ts`
- （扩展）`server/src/routes/platform.routes.ts` 新增 store 相关 endpoints

**前置**：Task 30 完成 + DP-PF-3（impersonate 机制）+ DP-PF-4（audit log）有决议。

### 核心方法

```ts
export async function listAllStores(tx: Prisma.TransactionClient): Promise<StoreSummary[]> {
  // platformAdminRepo.listAllStores(tx)
  // 返回 { id, name, createdAt, moduleLicense: { modules, grantedAt } }
}

export async function grantStoreModules(
  storeId: string,
  modules: ModuleId[],
  platformAdminId: string,
  tx: Prisma.TransactionClient
): Promise<ModuleLicense> {
  // 1. platformAdminRepo.grantModules(storeId, modules, platformAdminId, tx)
  // 2. platformAuditLog.record('modules:grant', platformAdminId, storeId, { modules }, tx)
  // 3. 重算所有 store role 的 permission mask?
  //    ——新 modules 中移除某项会让现有 role.permissions 含"已撤销权限"
  //    ——但 roleRepo.resolveLicensedPermissions 在读时做 intersect，自动失效
  //    ——结论：不需要重算，intersect 动态生效。记入 commit message。
}

export async function revokeStoreModules(
  storeId: string,
  removeList: ModuleId[],
  platformAdminId: string,
  tx: Prisma.TransactionClient
): Promise<ModuleLicense> {
  // platformAdminRepo.revokeModules (会 silent-preserve 'core')
  // + audit log
}

// DP-PF-3 留决议后实施 ——
export async function impersonateStore(
  storeId: string,
  platformAdminId: string,
  tx: Prisma.TransactionClient
): Promise</* depends on DP-PF-3 */> { ... }

// DP-PF-4 决议后实施 ——
export async function listAuditLog(
  filter: { platformAdminId?: string; targetStoreId?: string; from?: Date; to?: Date },
  tx: Prisma.TransactionClient
): Promise<PlatformAuditLog[]> { ... }
```

### Routes 新增

```ts
// 在 platform.routes.ts 里：
router.get('/stores', requirePlatformAuth, requirePlatformPermission('platform:stores:read'),
  platformAwareRoute(async (req, res) => { ... listAllStores ... }))

router.post('/stores/:storeId/modules/grant',
  requirePlatformAuth, requirePlatformPermission('platform:modules:grant'),
  platformAwareRoute(async (req, res) => { ... grantStoreModules ... }))

router.post('/stores/:storeId/modules/revoke',
  requirePlatformAuth, requirePlatformPermission('platform:modules:revoke'),
  platformAwareRoute(async (req, res) => { ... revokeStoreModules ... }))

// DP-PF-3 决议后：
router.post('/stores/:storeId/impersonate', ...)

router.get('/audit',
  requirePlatformAuth, requirePlatformPermission('platform:audit:read'),
  platformAwareRoute(async (req, res) => { ... listAuditLog ... }))
```

### 测试覆盖（业务语义，对齐 Phase E 策略）

5-6 case + 1 cross-tenant smoke（并入 platform.test.ts）：

1. `listAllStores` 在 BYPASSRLS 下返回多租户数据（tenant A context 下只能返回 1 行；`withPlatformContext` 下返回全部）
2. `grantStoreModules` 写 audit log entry（'modules:grant' action + 正确 platformAdminId + targetStoreId）
3. `revokeStoreModules` 触碰 'core' 时 silently preserve（验证 DP `platformAdminRepo.revokeModules` 行为）
4. impersonate（DP-PF-3 决议后具体化）
5. `requirePlatformPermission` 按 role 拒绝未授权调用（例：'billing-ops' role 调 `/stores/:id/impersonate` 被 403）
6. audit log 按 filter 过滤正确（时间范围 / platformAdminId / targetStoreId）

### Phase F 事后回填清单（全部已 land，2026-04-17）

和 Phase E plan 发现的 5 项同模式——本 Phase F plan 发现以下 Phase D/B 回填需求**均已在 Phase F 收尾批次前 3 commit landed**：

| # | 内容 | 归属 | 状态 | Commit |
|---|---|---|---|---|
| F-1 | `platformAdminRepo.updateLastLoginAt(id, at, tx)` | Phase D Task 26 inline 回填 | ✅ landed | `753d29c2` |
| F-2 | `PlatformAuditLog` Prisma 模型 + 不启 RLS note | Phase B Task 2 schema inline 回填 | ✅ landed | `4813750d` |
| F-3 | `platformAuditLogRepo` 新文件（`server/src/repositories/platform-audit-log.ts`）| Phase D 附录（part2 末尾）| ✅ landed | `58fa4759` |

**处理策略**（实际执行）：Phase F 收尾批次的前 3 commit = 回填；后 3 commit = Phase F plan 本身 + index + RESUME。总 6 commit 保持粒度清晰（每个补丁独立 commit，便于回滚）。

---

## Verify + commit

### Step 1：文件存在性复核（规则 7）

```bash
# 全部预期 0（Phase F 新建前）
for f in platform.routes.ts platform-admin.service.ts platform-store.service.ts \
         platform-auth.middleware.ts platform.test.ts; do
  find server/src -name "$f" | wc -l
done
```

### Step 2：写文件——按 Task 30 → Task 31 顺序 实施 agent 各子任务

### Step 3：tsc 整体不破

```bash
cd server && ./node_modules/.bin/tsc --noEmit 2>&1 | grep -cE "error TS"
# 预期：和 Phase E Agent C 完成时一致（新增 0）
```

### Step 4：测试跑通

```bash
cd server && pnpm vitest platform 2>&1 | tail -30
# 预期：6-7 case 全绿
```

### Step 5：commit（plan 本身——实施 agent 跑完后的 commit；本文件描述的是 plan 写作阶段的 commit，见本 plan "Pending commits 清单"）

plan 写作阶段的 commit 策略在本文件顶部 Pending 清单：C1 本文件 / C2 00-index / C3 RESUME——3 个独立 commit。

---

## 风险点

1. ~~DP-PF-3（impersonate）未决议前，Task 31 的 `impersonateStore` 实现挂起~~——✅ **2026-04-17 已决议方案 A**。实施参考 DP-PF-3 body 的 surface。
2. ~~DP-PF-4（audit log 实体）决议 A 触发 Phase B Task 2 schema 回填~~——✅ **已 land commit `4813750d`**。Phase B Task 2 实施时 schema 已含 PlatformAuditLog + 不启 RLS note。Task 4 RLS migration 实施者**必须显式不为 platform_audit_log 加 RLS policy**（规则 1 风险点）。
3. ~~`platformAdminRepo.updateLastLoginAt` 不存在~~——✅ **已 land commit `753d29c2`**。
4. **JWT payload 判别联合 (`kind: 'platform' \| 'tenant'`) 影响现有 staff 代码**——`shared/types.ts` 的 `JwtPayload` 类型改动会让所有消费 payload 的代码 tsc。grace period 策略（DP-PF-1 30 天）必须同步到现有 `auth.middleware.ts:requireAuth` 和 `auth.service.ts:verifyToken`。**跨 Agent D 独占边界被击穿**——实施期必须按规则 5 停下汇报 Ian 亲批（决议文件里的 DP-PF-1 仅授权设计决策，不是 blanket approval 跨边界代码实施）。
5. **impersonate 方案 A 的 UI 实施需要独立 frontend handoff**——banner + exit button + cross-tenant storeId 显示不在 Phase F 范围（Phase F 只做 backend）。Phase G / 或后续 frontend phase 接手。
6. **`platformAuditLogRepo` append-only 语义**（commit `58fa4759` 无 update/delete 方法）——若将来合规要求"审计保留期 N 天后自动清理"，需要**新增独立清理 task**（不能 update 方法伪装成 "delete old rows"，破坏 append-only 承诺）。Phase G 以外的事，但标注以防遗忘。

## 下一步

Task 30 + Task 31 plan 完成，等用户 L2 review 关键决策点。review 通过 → 落 3 个 plan commit（C1/C2/C3）→ Phase F plan 完成。

Phase G（Stage 3c，核心业务链 + B2 checkpoint）留给下个 session——需要完整注意力，本 session 不碰。

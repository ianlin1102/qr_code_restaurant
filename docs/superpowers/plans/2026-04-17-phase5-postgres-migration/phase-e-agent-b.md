# Phase 5 Plan — Phase E Stage 3a：Agent B（staff / role / clock / waitlist 域迁移）

> **如何使用本文件**
>
> - 全局规则见 [`00-index.md`](./00-index.md#全局规则所有-task-遵守)
> - 前置：Phase D 实施完成 + `phase-e-agent-a.md`（Task 27）完成
> - 执行方式（spec D43 / §9.6）：**串行**——本任务在 Task 27 commit 后启动
> - 本文件只含 **Task 28**（Agent B 工作包，4 个子域）
> - 姐妹文件：[`phase-e-agent-a.md`](./phase-e-agent-a.md) / [`phase-e-agent-c.md`](./phase-e-agent-c.md)

## Spec §9.6 事实核查（规则 7）

**Agent B 独占文件存在性**（grep 验证 2026-04-17）：

| spec 声明 | 实际 | 处理 |
|---|---|---|
| `server/src/routes/staff.routes.ts` | ✅ 68 行 | 修改 |
| `server/src/routes/role.routes.ts` | ✅ 41 行 | 修改 |
| `server/src/routes/clock.routes.ts` | ✅ 38 行 | 修改 |
| `server/src/routes/waitlist.routes.ts` | ✅ 57 行 | 修改 |
| `server/src/controllers/staff.service.ts` | ✅ 117 行 | 修改 |
| `server/src/controllers/role.service.ts` | ✅ 160 行 | 修改 |
| `server/src/controllers/clock.service.ts` | ✅ 72 行 | 修改 |
| `server/src/controllers/waitlist.service.ts` | ✅ 81 行 | 修改 |
| `server/src/__tests__/staff.test.ts` | ❌ 不存在 | 新建 |
| `server/src/__tests__/roles.test.ts` | ❌ 不存在 | 新建 |

比 Agent A 干净——8/10 真实存在，test 文件新建符合 spec §9.6:1231 "写 RLS-aware 测试" 的语义。

### 测试文件结构微调（本 plan 新增）

spec §9.6 只列了 `staff.test.ts` + `roles.test.ts`，未提 clock/waitlist。按用户段 3a review 给出的测试策略（**每域 3-5 业务 case + 1 RLS smoke**），本 task 新建三个文件：

- `server/src/__tests__/staff.test.ts` —— staff + clock 合并（打卡是 staff 行为）
- `server/src/__tests__/roles.test.ts` —— role 独立（权限模型自成体系）
- `server/src/__tests__/waitlist.test.ts` —— waitlist 独立（新增，spec 未列）

spec 回填条目追加：**spec §9.6 Agent B 测试文件列表补 `waitlist.test.ts`**（一并放批 2 末尾的 spec reconciliation commit）。

## Phase D 设计遗漏：TimeEntry repo（规则 7 追加发现）

`clock.service.ts` 用 `timeEntryStore`（line 2 import）进行 TimeEntry CRUD，但 Phase D 11 个 repo 列表里**没有 TimeEntry 对应 repo**（00-index.md line 183-193 清单核查）。

**决策**（与决策点 A 同模式）：**Phase D Task 22 `staff.ts` repo 扩展 TimeEntry 方法**（不新增独立 task）。理由：TimeEntry 紧耦合 Staff（userId FK + clockPin 打卡），单独 repo overkill；`staffRepo` 增 3-4 个方法即可。

**回填补丁**（和决策点 A 的 `listCategories` 并入 Phase E plan 收尾批次）：

```ts
// Phase D Task 22 staff.ts 补：
staffRepo.findActiveTimeEntry: (userId: string, db?: Db) => Promise<TimeEntry | null>
staffRepo.createTimeEntry: (data: { userId, storeId, clockIn }, db: Db) => Promise<TimeEntry>
staffRepo.closeTimeEntry: (entryId: string, clockOut: Date, db: Db) => Promise<TimeEntry>
staffRepo.listTimeEntries: (storeId: string, filter?: { userId?, from?, to? }, db?: Db) => Promise<TimeEntry[]>
```

补丁 commit message 明示"Phase E Agent B 事后发现 Task 22 staffRepo 缺 TimeEntry 方法——事后补充"（git blame 可追溯）。本 task 实施**依赖该补丁 commit 已 land**。

---

## Task 28：Agent B — staff / role / clock / waitlist 完整迁移

**Files（10 个文件）**：
- Modify: `server/src/controllers/{staff,role,clock,waitlist}.service.ts`
- Modify: `server/src/routes/{staff,role,clock,waitlist}.routes.ts`
- Create: `server/src/__tests__/{staff,roles,waitlist}.test.ts`

**前置**：
- Task 27（Agent A）完成并 merge
- Phase D Task 22 `staffRepo` TimeEntry 扩展补丁 commit 已 land（上方 Phase D 遗漏节）
- Phase D Task 23 `roleRepo` 实施完成（含 `ensureSystemRoles` + `resolveLicensedPermissions`）
- Phase D Task 25 `waitlistRepo` 实施完成

### grep ground truth（规则 7 嵌入）

**2026-04-17 基线**（实施时重跑，偏差即报停）：

```bash
# 4 个域 JsonStore 调用点
grep -cE "staffStore|roleStore|timeEntryStore|waitlistStore" \
  server/src/controllers/{staff,role,clock,waitlist}.service.ts
# 预期分别：15 / 18 / 5 / 10（合计 48）

# waitlist emit 数（规则 2 核心）
grep -cE "^\s*emit\(" server/src/controllers/waitlist.service.ts
# 预期：4（lines 36/50/63/79）

# staff.service.ts 的 dynamic roleStore import（反模式）
grep -nE "import.*roleStore" server/src/controllers/staff.service.ts
# 预期：line 48 dynamic import — 迁移时改为 static import roleRepo
```

**Task 完成 5 道门**：
1. `grep -cE "staffStore|roleStore|timeEntryStore|waitlistStore" server/src/controllers/{staff,role,clock,waitlist}.service.ts` = **0**（所有 4 个域合计）
2. `grep -c "new JsonStore" server/src/controllers/{staff,role,clock,waitlist}.service.ts` = **0**
3. `grep -cE "^\s*emit\(" server/src/controllers/waitlist.service.ts` = **0**（全部移到 route 层 tx 外）
4. 3 个新 test 文件存在且 `pnpm test staff roles waitlist` 绿
5. `server/src/controllers/staff.service.ts` 无 dynamic import（line 48 模式消除）

---

### 子任务 28.1：staff.service.ts 迁移（15 调用 + dynamic import 修复）

**调用映射表**（参照 Phase D Task 22 `staffRepo`）：

| legacy | 替换为 |
|---|---|
| `staffStore.getByField('storeId', storeId)` | `staffRepo.listAll(tx)` |
| `staffStore.getById(userId)` | `staffRepo.findById(userId, tx)` |
| `staffStore.getByField('storeId', storeId).find(u => u.username === username)` | `staffRepo.findByUsername(username, tx)` |
| `staffStore.create(record)` | `staffRepo.create({ ...record }, tx)` |
| `staffStore.update(userId, { clockPin })` | `staffRepo.setClockPin(userId, clockPin, tx)` |
| `staffStore.update(userId, { role })` | `staffRepo.updateRole(userId, roleId, tx)` ⚠️ 注意参数语义从 `role` (string) → `roleId` (FK)——见决策点 E |
| `staffStore.delete(userId)` | 需要 `staffRepo.delete(userId, tx)`——Phase D Task 22 plan **未列**，Phase E 补丁一并加（见下方） |

**决策点 E（重要）**：legacy `changeRole(userId, role)` 接收 `role: string`（line 83-94），调的是 `staffStore.update(userId, { role })`。但 Prisma schema 的 Staff 有 `roleId: string` FK（Phase D Task 22 写入 `setPassword` 等方法用的是 roleId）。

两种处理：
- **A**：Service 层把 role name 通过 `roleRepo.findByName(storeId, role)` 解析成 roleId，再调 `staffRepo.updateRole(userId, roleId, tx)`——保持 client API 兼容
- **B**：改 client API contract，前端传 roleId——但违反 "client 不动是底线"

**选 A**。需要 Phase D Task 23 `roleRepo` 补一个 `findByName(storeId, name, db?)` 方法（和 TimeEntry 同批补丁）。

**决策点 F**：`staffRepo.delete` 方法 Phase D Task 22 plan 里**不存在**。Phase D 补丁追加：

```ts
staffRepo.delete: (staffId: string, db: Db) => Promise<Staff>
```

（同批补丁里）

**dynamic import 修复**（line 48-49）：
```diff
- const { roleStore } = await import('../repositories/stores.js')
- const matchingRole = roleStore.getByField('storeId', storeId)
-   .find(r => r.name === record.role)
+ import { roleRepo } from '../repositories/roles.js'  // 顶部 static
+ // ...
+ const matchingRole = await roleRepo.findByName(storeId, record.role, tx)
```

Dynamic import 原因大概是循环依赖——迁移后 `roleRepo` 不依赖 `staffRepo`，循环消失，static 可以。实施时若仍循环，grep 定位环后决定（可能是 test utility 导致）。

**Service 签名变化**：同 Agent A 模式——全部加 `tx: Prisma.TransactionClient = prisma` 参数，签名除此之外不变。

---

### 子任务 28.2：role.service.ts 迁移（18 调用，Phase D Task 23 完备对齐）

**最容易的一个子任务**——Phase D Task 23 `roleRepo` 设计时就对齐 legacy `role.service.ts`（见 `phase-d-repositories-part2.md` Task 23 "Mirrors legacy role.service.ts:..." 注释）。

**完整映射**：

| legacy | 替换为 |
|---|---|
| `roleStore.getByField('storeId', storeId)` | `roleRepo.findByStoreId(storeId, tx)` |
| `roleStore.getById(roleId)` | `roleRepo.findById(roleId, tx)` |
| `roleStore.create({...})` + `roleStore.getByField(...find(r => r.name === 'owner')` | `roleRepo.ensureSystemRoles(storeId, tx)`（一次调用替代 legacy lines 33-75 全部） |
| `roleStore.update(ownerRole.id, { permissions: ALL_PERMISSIONS })` | 由 `ensureSystemRoles` 内部处理 |
| `roleStore.update(roleId, updates)` | `roleRepo.update(roleId, updates, tx)` |
| `roleStore.delete(roleId)` | `roleRepo.delete(roleId, tx)` |
| `resolvePermissions(storeId, roleId, legacyRole)` 整个函数体（lines 130-159） | 调 `roleRepo.resolveLicensedPermissions({ storeId, roleId, legacyRole }, tx)` |

**关键简化**：legacy `ensureSystemRoles` 函数体约 40 行的显式 system role 检查 + 创建 + owner sync——**全部**替换为 `await roleRepo.ensureSystemRoles(storeId, tx)` 单行。legacy 的 `ALL_PERMISSIONS` / `MANAGER_PERMISSIONS` / `WAITER_PERMISSIONS` 常量可以从 `role.service.ts` 删除（已在 `roleRepo` 内封装）。

**Service 函数签名**：
```diff
- export function resolvePermissions(storeId, roleId?, legacyRole?): Permission[]
+ export async function resolvePermissions(
+   storeId: string,
+   roleId: string | null | undefined,
+   legacyRole: string | null | undefined,
+   tx: Prisma.TransactionClient = prisma
+ ): Promise<Permission[]>
```

Service 层 `resolvePermissions` 薄包装 `roleRepo.resolveLicensedPermissions`——为啥不直接让 caller 用 repo？答：**JWT middleware 等 call site 太多，改起来外溢**（Phase F 的 staff-auth 迁移里再集中替换）。Phase E 保守只改 service 内部。

---

### 子任务 28.3：clock.service.ts 迁移（5 调用 + TimeEntry 依赖补丁）

**前置**：Phase D Task 22 `staffRepo` TimeEntry 扩展补丁 commit 已 land。

**调用映射**：

| legacy | 替换为 |
|---|---|
| `staffStore.getById(user.id)` + PIN 验证 | `staffRepo.findById(user.id, tx)` 然后服务层比对 clockPin（**见决策点 G**） |
| `timeEntryStore.getByField('userId', user.id).find(e => !e.clockOut)` | `staffRepo.findActiveTimeEntry(userId, tx)` |
| `timeEntryStore.create(entry)` | `staffRepo.createTimeEntry({ userId, storeId, clockIn }, tx)` |
| `timeEntryStore.update(result.currentEntry.id, { clockOut, duration })` | `staffRepo.closeTimeEntry(entryId, clockOut, tx)`——`duration` 在 repo 内部计算（或服务层计算后传） |
| `timeEntryStore.getByField('storeId', storeId)` + filter | `staffRepo.listTimeEntries(storeId, filter, tx)` |

**决策点 G（安全向）**：legacy `verifyPin` 按明文 PIN 比对（`clockPin === pin`）。Phase 5 Prisma schema 里 `clockPin` 字段是否明文？
- 若仍明文（迁移保留行为）：直接字符串比对
- 若 schema 改了 bcrypt：`await bcrypt.compare(pin, staff.clockPinHash)`

实施期查 Phase B Task 2 schema.prisma 的 Staff.clockPin 字段注释。**不凭印象**——同决策点 B 的 grep schema 原则。

**duration 归属**：
- 选项 1：repo 方法 `closeTimeEntry` 内部算（Date 差值转分钟）
- 选项 2：service 层算后传入
- **建议选项 1**——业务不变量（duration = clockOut - clockIn）在 repo 保证，消除漂移

---

### 子任务 28.4：waitlist.service.ts 迁移（10 调用 + **4 处 emit 规则 2 严格处理**）

**最关键的规则 2 合规子任务**——legacy service 函数内同时做 DB 写 + emit：

```typescript
// legacy waitlist.service.ts:34-37
const created = waitlistStore.create(entry)
emit({ type: 'store:waitlist', storeId })  // ← 在同步调用序列内；迁移后将在 tx 内
return created
```

**迁移策略**：Service 函数**只返回数据，不 emit**。Emit 由 route 层（`tenantAwareRoute` 装饰器的 post-tx hook 或 handler 手动）在 `withTenantContext` **返回后**发。

**映射**：

| legacy | 替换为 |
|---|---|
| `waitlistStore.getByField('storeId', storeId).filter(e => e.status === 'waiting').sort(...)` | `waitlistRepo.listWaiting(storeId, tx)` |
| `waitlistStore.create(entry)` + `emit(...)` | Service: `waitlistRepo.add({...}, tx)`，**不 emit**；Route 层在 tx 返回后 emit |
| `waitlistStore.getById(entryId)` | `waitlistRepo.findById(entryId, tx)` |
| `waitlistStore.update(entryId, updates)` + `emit(...)` | Service: `waitlistRepo.updateEntry(entryId, updates, tx)`；Route emit |
| `waitlistStore.delete(entryId)` + `emit(...)` | Service: `waitlistRepo.remove(entryId, tx)`；Route emit |
| `waitlistStore.update(entryId, { status: 'seated' })` + `emit(...)` | Service: `waitlistRepo.markSeated(entryId, tx)`；Route emit |

**Service 签名变更**：

```diff
- export function addEntry(storeId, data): WaitlistEntry {
-   // ... waitlistStore.create(entry)
-   emit({ type: 'store:waitlist', storeId })
-   return created
- }
+ export async function addEntry(
+   storeId: string,
+   data: { name: string; partySize: number; phone?: string },
+   tx: Prisma.TransactionClient = prisma
+ ): Promise<WaitlistEntry> {
+   const waitingAhead = (await waitlistRepo.listWaiting(storeId, tx)).length
+   const estimatedWait = waitingAhead * 15
+   return waitlistRepo.add({ storeId, ...data, estimatedWait }, tx)
+ }
```

**Route 层**（`waitlist.routes.ts`）示例：

```typescript
router.post('/stores/:storeId/waitlist', tenantAwareRoute(async (req, res, tx) => {
  const { storeId } = req.params
  const entry = await addEntry(storeId, req.body, tx)
  // ⚠️ emit 在这里也还在 tx 内！—— 取决于 tenantAwareRoute 实现
  // 若 tenantAwareRoute 用 $transaction 包裹整个 handler，emit 应在 handler 返回 *之后*
  // 方案 A：route 返回一个 { data, events: [...] } 结构，装饰器外层接管 emit
  // 方案 B：tenantAwareRoute 暴露 `afterCommit(cb)` 注册回调
  res.json(entry)
  // afterCommit 处理：emit({ type: 'store:waitlist', storeId })
}))
```

**决策点 H**：`tenantAwareRoute` 的 emit 挂载方式——方案 A（返回 events 数组）或方案 B（afterCommit 回调）。**Phase B Task 8** 写 `tenantAwareRoute` 时决定；Phase E Agent A 的决策点 D 已经提到同一问题。**若 Task 8 时未定，Agent B 实施前和 A 一起先确定**——两个 agent 的迁移依赖一致的 emit 机制。

---

### 测试（用户段 3a review 的新策略：每域 3-5 业务 case + 1 RLS smoke）

#### `__tests__/staff.test.ts`（staff + clock 合并）

5 个业务 case + 1 smoke：

1. **findByUsername** case-sensitivity 行为（legacy 未定义——测试锚定当前实际行为）
2. **clockPin 冲突检测**（addStaff 拒绝重复 PIN；legacy staff.service.ts:44 验证）
3. **changeRole**: role name → roleId 查找成功 + 找不到时的错误
4. **clockIn when already active**：已有未 clockOut 的 TimeEntry 时 clockIn 应拒绝（business rule from clock.service.ts）
5. **clockOut computes duration**：duration = clockOut - clockIn 分钟数正确
6. **RLS smoke**：tenant A `listAll(tx_A)` 不含 tenant B 的 staff

#### `__tests__/roles.test.ts`

4 个业务 case + 1 smoke：

1. **ensureSystemRoles idempotency**：重复调用不产生重复行
2. **owner auto-sync**：调用 ensureSystemRoles 后 owner.permissions 等于 ALL_PERMISSIONS（mirror 规则 legacy:72-74）
3. **resolveLicensedPermissions 模块掩码**：store 许可=['core'] 时，manager 原本 permissions 中的 `coupons:read` 被过滤掉
4. **delete system role 被拒**：caller-layer check（service 函数抛错，repo 不抛——测 service 不测 repo）
5. **RLS smoke**：tenant A 的 owner 角色对 tenant B context 不可见

#### `__tests__/waitlist.test.ts`

4 个业务 case + 1 smoke：

1. **FIFO 顺序**：listWaiting 按 createdAt 升序
2. **estimatedWait 计算**：addEntry 时等于 `queueLength × 15`
3. **seat 状态机**：cancelled / seated 状态的 entry 再次 markSeated 报错（service 层校验 legacy:75-77）
4. **emit 在 tx 返回后触发**：用 vitest spy 验证 `emit` 调用顺序在 `waitlistRepo.add` 完成**之后**——规则 2 回归测试
5. **RLS smoke**：tenant A listWaiting 不含 tenant B entries

---

### Step 1：读现状 + 验证 grep 基线

```bash
# 验证 4 个域的 grep 数字与本文档匹配（2026-04-17 基线：15/18/5/10）
for f in staff role clock waitlist; do
  echo "=== $f.service.ts ==="
  grep -cE "staffStore|roleStore|timeEntryStore|waitlistStore" server/src/controllers/$f.service.ts
done
# 若数字不匹配 → 暂停汇报，不自行调整
```

### Step 2：依次迁移 4 个子域

按顺序做，**每个子域一个 commit**（可选策略——也可以整个 Agent B 一个 commit，见下方 commit 策略）。

顺序：**role → staff → clock → waitlist**

理由：
- role 最简单（Task 23 完备对齐），先 warm up
- staff 中等复杂度，依赖 role.updateRole 的 roleId 语义（决策点 E）
- clock 依赖 staff 的 TimeEntry 补丁
- waitlist 最后（规则 2 的 emit 挪位单独聚焦）

### Step 3：Routes 层装饰器统一包装

`{staff,role,clock,waitlist}.routes.ts` 的每个 handler 包 `tenantAwareRoute`。格式见 Agent A 段 3a 的 Step 5 diff。

### Step 4：建 3 个 test 文件

照上方业务语义清单写。每文件控制 200 行内——super-thin 的业务 case，不重写 repo 层 RLS 测试（Phase C 已覆盖）。

### Step 5：verify

```bash
# 5 道门
# 1. JsonStore 调用全清
grep -cE "staffStore|roleStore|timeEntryStore|waitlistStore" \
  server/src/controllers/{staff,role,clock,waitlist}.service.ts
# 预期：0

# 2. new JsonStore 消失
grep -c "new JsonStore" server/src/controllers/{staff,role,clock,waitlist}.service.ts
# 预期：0

# 3. service 层无 emit
grep -cE "^\s*emit\(" server/src/controllers/waitlist.service.ts
# 预期：0（全部移到 routes 层）

# 4. 3 个 test 文件存在 + 通过
ls server/src/__tests__/{staff,roles,waitlist}.test.ts
cd server && pnpm vitest staff roles waitlist 2>&1 | tail -30

# 5. tsc 无新增错误
cd server && ./node_modules/.bin/tsc --noEmit 2>&1 | grep -cE "error TS"
# 预期：和 Agent A 完成时数字一致
```

### Step 6：commit 策略

**选项 A（4 个子 commit）**：每个子域独立 commit。粒度细，回滚容易，但 Agent B 的 4 个域天然一起迁（route 装饰器 / test 共用基础设施），强行拆 commit 会让中间状态 tsc 不绿（service signature 改了 async 但 routes 还没包）。**不推荐**。

**选项 B（1 个大 commit）**：整个 Agent B 一次 commit。对齐 Agent A 的粒度（Agent A 也是一个 commit）。中间状态不暴露。**推荐**。

按选项 B：

```bash
cd "$(git rev-parse --show-toplevel)"
git add server/src/controllers/{staff,role,clock,waitlist}.service.ts \
        server/src/routes/{staff,role,clock,waitlist}.routes.ts \
        server/src/__tests__/{staff,roles,waitlist}.test.ts
git commit -m "feat(phase-5): phase E Agent B — migrate staff/role/clock/waitlist to Prisma

Phase E Stage 3a Agent B (Task 28): 4-domain migration covering 48 JsonStore
call sites in one coordinated commit (per Agent A single-commit convention).

Per-domain migration:
- staff.service.ts (15 sites → 0): staffStore → staffRepo; dynamic roleStore
  import replaced with static roleRepo import; changeRole resolves role name
  to roleId via roleRepo.findByName (decision point E).
- role.service.ts (18 sites → 0): roleStore → roleRepo; ensureSystemRoles
  delegated to roleRepo (40-line legacy body → 1 line); resolvePermissions
  → roleRepo.resolveLicensedPermissions.
- clock.service.ts (5 sites → 0): timeEntryStore → staffRepo.*TimeEntry
  methods (Phase D Task 22 补丁). duration computed in repo.
- waitlist.service.ts (10 sites → 0, emit 4 → 0): waitlistStore → waitlistRepo;
  SSE emit moved to route layer post-tx (rule 2 compliance).

Routes: all handlers wrapped in tenantAwareRoute; emit via decorator's
afterCommit hook (decision point H — resolved with Agent A consistency).

New tests (3 files, business-semantics focused per user directive):
- staff.test.ts: findByUsername / clockPin uniqueness / role assignment /
  clockIn-while-active rejection / clockOut duration (+1 RLS smoke)
- roles.test.ts: ensureSystemRoles idempotency / owner auto-sync /
  resolveLicensedPermissions module masking / system role delete rejection
  (+1 RLS smoke)
- waitlist.test.ts: FIFO / estimatedWait calc / seat state machine /
  emit-after-tx ordering (+1 RLS smoke)

spec §9.6 补丁追踪：waitlist.test.ts 新增（spec 未列）,  两项 Phase D 回填
依赖 (staffRepo TimeEntry 方法 + roleRepo.findByName + staffRepo.delete)
一并在本 commit 之前 land.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Agent B 完成后状态

- staff / role / clock / waitlist 4 个域完全走 Prisma
- `roleStore` / `staffStore` / `timeEntryStore` / `waitlistStore` 在 `server/src/controllers/` 下引用为 0（`server/src/repositories/stores.ts` 仍保留声明——Stage 5 清理期统一删）
- 3 个 test 文件建立业务语义测试样板，Agent C 照此模式写（每域 3-5 case）
- 规则 2 在 waitlist 域完整兑现（4 处 emit 全移 tx 外）

## 风险点

1. **TimeEntry Phase D 补丁必须先 land**——clock.service.ts 迁移若没有 `staffRepo.*TimeEntry` 方法会卡住。Step 1 第一件事：`grep -E "createTimeEntry|findActiveTimeEntry" server/src/repositories/staff.ts`，返回匹配才继续。
2. **决策点 E 的 roleId 解析**：`changeRole` 调用点若在 client 端还传 role name string（不是 roleId），server 静默查找 + 赋值；但 client 期待的 response 结构可能需包含 role name + roleId 两个字段（兼容 legacy）。response 形状变更会破 client——实施期 smoke test 时确认。
3. **决策点 H 的 emit 机制**：如果 `tenantAwareRoute`（Phase B Task 8）没实现 afterCommit hook，Agent B 的 waitlist emit 将仍在 tx 内——违反规则 2。Agent B 实施前必须确认 Task 8 状态；如缺失，先补 Task 8 再做 Agent B。
4. **test 文件与 Phase C fixtures 依赖**：3 个新 test 用 `setupTwoTenants()` / `cleanup()`（Phase C Task 13 写的 `fixtures.ts`）。若 fixtures 尚未提供 staff/role/waitlist 预置数据，Agent B test 要自己 seed——可能要 extend fixtures.ts，跨 agent 边界。规则 5 敏感：若改 fixtures.ts，汇报后做。

## 下一步

Task 28 完成后停下，等用户 review。无破防则进 Agent C（Task 29，见 [`phase-e-agent-c.md`](./phase-e-agent-c.md)）。

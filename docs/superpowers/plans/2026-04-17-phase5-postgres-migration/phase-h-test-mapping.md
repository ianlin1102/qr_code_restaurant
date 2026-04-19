# Phase 5 Plan — Phase H 段 1:测试映射表结构 + D51 判定原则(Task 43)

> **如何使用本文件**
>
> - 全局规则见 [`00-index.md`](./00-index.md#全局规则所有-task-遵守)
> - 前置:Phase G 全 plan 完成(`059c7613` 收尾) + Phase G 实施未启动(本 task 仅 plan,实施期串行在 Phase G 完成后)
> - 参考:
>   - spec `docs/superpowers/specs/2026-04-17-phase5-postgres-migration-design.md` §9.9 Stage 4 + D50/D51
>   - Phase H ground truth(2026-04-19 Ian 调查):4 文件 / 1361 行 / 211 cases / JsonStore 测试中 0 直接耦合
>   - 段 3 plan `phase-g-b2-checkpoint.md`(D50 7 场景模板,Phase H 实施期参考)
> - spec 锚点:§9.9 Stage 4(集成测试修复 + 断言映射表)

---

## 范围声明

- **本 task 范围(Task 43)**:
  - 建立映射表 work-log 文件:`docs/superpowers/work-logs/2026-04-17-phase5-test-migration-map.md`(spec §9.9 已指定路径)
  - 4 测试文件前置 domain 分类(基于 35 top-level describe blocks grep)
  - D51 等价/加强/弱化判定原则 + Why 门槛 plan 内定义
- **不在本 task 范围**(Task 44+ 后续):
  - 实际填写每个 describe block 的等价/加强/弱化判定(Task 44 起逐文件填表)
  - 写新测试代码(Task 45+ 实施)
  - 老测试 archive(`server/_archive/tests-2026-04/` mv,Phase H 实施期)
  - Git tag `pre-phase5-tests-baseline`(Phase H 实施 Stage 4 起点)

---

## 规则 7 段 1 task 43 强化条款

1. **每处"测试行为"断言必须 grep / 读文件 verify**——本 plan 4 文件 35 describe 数据 100% 来自 2026-04-19 grep
2. **D50/D51 引用必须锚 spec 原文行号**——D50 spec line 76 / D51 spec line 77 / §9.9 spec line 1312-1331
3. **Phase H ground truth 数据必须复用 2026-04-19 调查**——不重复 grep,直接引用 Ian 提供的数字

违反本条款的写作 → 停下自查修正,不 push。

## Pending commits 清单(规则 8.1)

- [x] Phase G 收尾:`059c7613`
- [ ] **Task 43 plan:本文件**

---

## Task 43:映射表结构 + D51 判定原则

**Files (本 task 范围)**:
- Create: `docs/superpowers/plans/2026-04-17-phase5-postgres-migration/phase-h-test-mapping.md`(本文件)
- 后续 Task 44+ Create: `docs/superpowers/work-logs/2026-04-17-phase5-test-migration-map.md`(映射表 work-log,Task 44 实际建立)

**前置**:
- Phase G plan 全部完成(`059c7613`)
- Phase H ground truth 完成(2026-04-19 Ian 调查)

### Task 完成 3 道门

1. 本 plan 文件已 commit + push
2. §2 映射表结构设计 review 通过(Ian)
3. §4 D51 判定原则 review 通过(Ian)

---

### 1. Phase H 定义(spec §9.9 + D50/D51 摘要)

**spec §9.9 Stage 4 摘要**(line 1312-1331):
- 名称:集成测试修复 + 断言映射表(D51)
- 文件路径:`docs/superpowers/work-logs/2026-04-17-phase5-test-migration-map.md`
- Git tag `pre-phase5-tests-baseline` 打在 Stage 4 开始前
- 老集成测试 mv 到 `server/_archive/tests-2026-04/`

**D50 决策锚**(spec line 76):
> B2 Checkpoint:Stage 3c 第 3 步后硬性暂停,用户手动验证 7 个场景(a-g 独立 pass/fail)

**与 Phase H 关系**:D50 在 Phase G 段 3 实施(Task 35 plan `phase-g-b2-checkpoint.md`),**Phase H 在 D50 通过后启动**(B2 行为已稳定才迁移测试)。

**D51 决策锚**(spec line 77):
> 测试断言迁移:`docs/superpowers/work-logs/` 下维护老测试 → 新测试映射表,"弱化"条目必须写 Why

**与本 task 关系**:本 task 落地 D51 的"映射表结构 + 弱化 Why 门槛"机制,Task 44+ 按此结构填表。

---

### 2. 映射表 work-log 结构设计

**文件路径**(spec §9.9 已指定):`docs/superpowers/work-logs/2026-04-17-phase5-test-migration-map.md`

**顶层结构**(Markdown):

```markdown
# Phase 5 Test Migration Map (D51 落地)

Created: <实施期日期>
Source: 4 files / 1361 lines / 211 cases (2026-04-19 ground truth)
Target: 新测试结构(Phase C tenant-isolation + Phase H 业务测试 split)

## 全局统计

- 老测试总数:211 cases
- 等价迁移:N cases
- 加强迁移:N cases(覆盖 B2 新场景)
- 弱化迁移:N cases(必须写 Why,见各 §)
- 删除:N cases(实施 detail 不再适用)

## §1 module-permissions.test.ts(权限域,3 describe / 12 cases)

| 老 describe.it 路径 | 判定 | 新位置 | Why(弱化必填) |
|---|---|---|---|
| `getStoreModulePermissions > <case>` | 等价 | ... | — |
| ... | ... | ... | ... |

## §2 settlement-gateway.test.ts(settlement 域,8 describe / 40 cases)

(同结构表)

## §3 split-billing-integration.test.ts(billing 域,10 describe / 45 cases)

(同结构表)

## §4 sanitize.test.ts(输入校验工具,14 describe / 114 cases)

(同结构表)

## §5 删除条目汇总(可选独立小节)

需要审计的"删除"条目集中列出,便于 Ian review。

## §6 弱化条目 Why 汇总(必需独立小节)

所有"弱化"条目的 Why 集中可读,便于一次审计是否合理。
```

**字段定义**:
- **老 describe.it 路径**:`<top-level describe name> > <inner describe / it name>`,精确到单个 case(避免 ambiguity)
- **判定**:`等价` / `加强` / `弱化` / `删除`(4 选 1,见 §4 D51 判定原则)
- **新位置**:目标测试文件 + describe / it 路径,或"待写"(Task 45+ 实施期填)
- **Why(弱化必填)**:弱化条目的理由,门槛见 §4

---

### 3. 4 文件前置 domain 分类

(数据源:2026-04-19 grep,top-level describe blocks)

| 文件 | 行数 | top-level describe 数 | 总 cases | Domain |
|---|---|---|---|---|
| `module-permissions.test.ts` | 106 | **3** | 12 | 权限模块(`getStoreModulePermissions` / `getStoreModules` / `resolvePermissions`) |
| `settlement-gateway.test.ts` | 402 | **8** | 40 | Settlement gateway 全方位(response 结构 / allowedActions / mode locking / error codes × 2 / split ops / allowedActions transitions / full settlement flow) |
| `split-billing-integration.test.ts` | 477 | **10** | 45 | Billing 集成(session 设置 / payByPercent / payByItems / mode locking / waiter split / eager invalidation / tip B1 / remaining item-based / mixed flow / edge cases) |
| `sanitize.test.ts` | 376 | **14** | 114 | 输入校验工具(8 sanitize 函数 + 6 edge / injection sub-suites) |

**总计**:**35 top-level describe blocks / 211 cases / 1361 行**

**预期 domain → 新测试位置映射**:
- 权限模块 → Phase C `tenant-isolation.test.ts` 扩展 + Phase H 新建 `permissions.test.ts`(可选拆分)
- Settlement gateway → Phase H 新建 `settlement-gateway.test.ts`(C5b1 注释:扩展现有,不新建)+ Phase C RLS smoke
- Billing 集成 → Phase H 新建 `billing-integration.test.ts`(C6b2 §10 测试更新已含 `split-billing-integration.test.ts` 改造)
- 输入校验 → 不变(`sanitize.test.ts` 是纯 lib 测试,与 Phase 5 数据库迁移无关,**默认全 等价**)

---

### 4. D51 等价/加强/弱化判定原则 + Why 门槛

#### 4.1 判定 4 类定义

**等价(equivalent)**:
- 老测试断言新代码下**同语义同验证目标**
- 新代码行为与老代码完全一致(只是 storage 层 JsonStore → Prisma)
- **示例**:`expect(session.totalPaid).toBe(amount)` —— B2 后 totalPaid 是派生值(D63 paidItems 求和),但断言值不变 → 等价

**加强(strengthened)**:
- 新测试覆盖**老测试未覆盖的 B2 新场景**
- 通常因 D58/D59/D60/D61/D62/D63 引入新行为(新 error code / 新字段 / 新 race condition)
- **示例**:webhook D62 重放幂等(老测试无,Task 41 plan §5 测试矩阵 case 4)→ 加强

**弱化(weakened)**:
- 新测试**断言强度低于老测试**
- 通常因 implementation detail 改变,老测试断言不再适用,但语义验证仍需保留
- **必须写 Why**(D51 强制)
- **示例**:老测试断言 `session.pendingCart` 字段值,B2 后字段已删除(改 draft Order),新测试无法直接验证字段——改为间接验证(查 draft order items)→ 弱化,Why = "字段已删除,改为业务行为验证"

**删除(deleted)**:
- 老测试验证**已不再存在的代码路径**
- 通常因 D63 / B2 重构后 implementation 路径消失
- **示例**:老测试 `session.cartVersion` 乐观锁路径,B2 改为 Order.version → 老测试场景无对应新路径,删除

#### 4.2 Why 门槛(弱化条目必填)

**Why 必须包含**:
1. **被弱化的具体断言**(老测试代码片段,1-3 行)
2. **弱化原因**(implementation 路径变化的具体描述,引用 D58-D63 决议或 plan 章节锚点)
3. **新测试的等价验证**(如何用新断言保持语义验证强度,即使 implementation 不同)

**Why 反模式**(自动 review 不通过):
- ❌ "新代码 implementation 不同,断言无法保持"(无具体说明)
- ❌ "测试不重要"(implementation detail 不重要,但语义验证重要)
- ❌ "B2 改了所以弱化"(无具体 plan 章节锚点)

**Why 正例**:
> 老测试断言 `session.pendingCart[0].menuItemId === 'X'`(line 142)。B2 后 `pendingCart` 字段已删除(D58 路径 X,Task 34 plan §3),改为 draft Order。新测试改为 `(await orderRepo.findDrafts(sessionId, tx))[0].items[0].menuItemId === 'X'` —— 业务语义(顾客已加 X 到 cart)等价验证,只是数据存储位置变化。

#### 4.3 判定流程(Task 44+ 实施期填表指引)

每个老 describe.it 走以下流程:

1. **读老测试代码**(2-5 行片段)
2. **判断验证目标**(业务行为 vs implementation detail)
3. **找新代码对应路径**(grep / Phase G plan 章节)
4. **判定 4 类**:
   - 新代码完全保留老语义 + 断言可直接用 → **等价**
   - 新代码引入新场景需要额外验证 → **加强**(可能拆多个新 cases)
   - 老断言 implementation 不可用,但语义验证仍需保留 → **弱化**(写 Why)
   - 老验证路径已消失 → **删除**
5. **填映射表表格**

**Ian review 触发**:**所有"弱化"条目** + **>10% 总比例的"删除"条目** 必须 Ian 拍板(防止过度简化)

---

### 5. Phase D 回填 + Task 44+ 预告

**Phase D 回填**:本 task 0 新增回填(plan 工作,无 repo 方法依赖)

**Task 44+ 预告**:
- **Task 44**:按 §3 表逐文件填映射表 4 个 describe block(从 sanitize.test.ts 开始,默认全等价,工作量小,验证流程)
- **Task 45**:按 §3 表填 module-permissions.test.ts 12 cases
- **Task 46**:按 §3 表填 settlement-gateway.test.ts 40 cases
- **Task 47**:按 §3 表填 split-billing-integration.test.ts 45 cases
- **Task 48**:Ian review 弱化 Why 汇总 + 删除条目审计 + Stage 4 启动 prerequisite(`pre-phase5-tests-baseline` tag + 老测试 archive)

**Phase H 总 task 估算**:Task 43-48 共 6 task(plan 5 + Ian checkpoint 1)

---

### 6. commit(本 plan 落地)

```bash
git add docs/superpowers/plans/2026-04-17-phase5-postgres-migration/phase-h-test-mapping.md
git commit -m "plan(phase-h): task 43 - test mapping work-log structure + D51 judgment principles"
git push origin main
```

**不更新 RESUME / 00-index** —— 等 Phase H 全 task 完成后一次性同步。

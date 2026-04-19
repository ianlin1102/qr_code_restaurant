# Phase 5 Plan — Phase H 段 1:Task 43 映射表结构 + 4 文件前置分类 + D51 判定原则

> **重写说明**(2026-04-19 第二轮):本文件按 Ian 精确指令重写,覆盖 commit `6ab0a4ae` 初版。差异:加 §6 D64+ 候选预警 / §2 粒度选项不给倾向(规则 7 反向应用)/ D51 判定 3 类(等价/加强/弱化)非 4 类 / spec §9.9 原文 quote。

> **如何使用本文件**
>
> - 全局规则见 [`00-index.md`](./00-index.md#全局规则所有-task-遵守)
> - 前置:Phase G plan 全部完成(`059c7613`)
> - 参考:spec `docs/superpowers/specs/2026-04-17-phase5-postgres-migration-design.md` §9.9 + D48/D50/D51 / 2026-04-19 ground truth
> - 规模上限:250 行软上限(规则 8 适用)

## Pending commits 清单(规则 8.1)

- [ ] **Task 43 plan rewrite:本文件**

---

## 1. Phase H 概述

### spec §9.9 Stage 4 原文(line 1312-1322,完整 quote)

> ### 9.9 Stage 4:集成测试修复 + 断言映射表(D51)
>
> **断言映射表**:`docs/superpowers/work-logs/2026-04-17-phase5-test-migration-map.md`
>
> 每个老测试断言 → 新测试断言的映射,标注"等价 / 加强 / 弱化"。"弱化"必须写 Why(如"Phase 4 SSOT 删除字段,改为派生验证等价覆盖")。没 Why 的弱化禁止合并。
>
> **两层保护**:
> - Git tag `pre-phase5-tests-baseline` 打在 Stage 4 开始前
> - 物理保留 `server/_archive/tests-2026-04/*.test.ts.bak`(统一到 `server/_archive/` 根目录)
>
> **验收**:`pnpm test` 全绿 + 映射表 review 通过

### 决策锚

- **D51**(spec line 77,本 phase 核心):测试断言迁移映射表,"弱化"条目必须写 Why
- **D50**(spec line 76):B2 Checkpoint,Stage 3c 第 3 步后硬性暂停,7 场景 a-g 独立 pass/fail —— Phase G 段 3 plan `phase-g-b2-checkpoint.md` 已规划,**未执行**(Phase G 实施未启动)
- **D48**(spec line 74):JsonStore 软删除到 `_archive/*.bak`,EC2 稳定 7 天后物理删 —— Phase H 测试归档遵循同规则:`server/_archive/tests-2026-04/*.test.ts.bak`

### Phase H Task 43-45 范围总述

- **Task 43(本)**:映射表 work-log 结构设计 + 4 文件前置分类 + D51 判定原则文档化
- **Task 44**:按映射表结构实际填表(逐文件,实施期与新测试编写并行)
- **Task 45**:Ian review 弱化 Why + Stage 4 verification(`pnpm test` 全绿 + map review 通过)

(Phase H 总 3 task,本 plan 不展开 44/45 细节。)

## 2. 映射表结构设计

### 目标文件

`docs/superpowers/work-logs/2026-04-17-phase5-test-migration-map.md`(spec §9.9 line 1314 已指定)

### ⚠️ 条目粒度选项(规则 7 反向应用,CC 不给倾向)

**选项 A:每断言一行**(粒度细)
- 优点:追溯度高,每 `expect(...)` 单独判定 / 每 Why 单独 review
- 缺点:表格行数多(可能 500+),可读性下降,相关断言分散

**选项 B:每 `it()` block 一 section**(粒度粗)
- 优点:可读性高,语义内聚(一个 it 测一个场景),合并相关断言
- 缺点:细粒度断言判定混在 section level,弱化 Why 可能不精确到具体断言

**选项 C:混合(默认 B,弱化条目升级为 A)**
- 优点:常规情况下可读 + 弱化条目细致追溯
- 缺点:格式不统一,review 需要 context-switch

**CC 数据驱动,不给倾向**:粒度选择属设计偏好,Ian 拍。Task 44 实施期填表前必须先确认选项。

### 字段定义表格(任一粒度通用)

| 字段 | 必填 | 说明 | 示例 |
|---|---|---|---|
| `老测试路径` | ✅ | 文件 + describe 链 + it(粒度按选项)| `settlement-gateway.test.ts > Gateway: response structure > should include allowedActions` |
| `判定` | ✅ | 等价 / 加强 / 弱化 / N/A(已删) | `弱化` |
| `新测试路径` | ✅ | 新测试文件 + describe + it,或"待写" | `settlement-gateway.test.ts > Gateway: response > tx-aware` |
| `Why` | 弱化必填 | 锚 D# 编号 + 一句话(规则 7) | `D63: paidItemIds 删除改 paidItems 派生,断言改业务行为` |
| `备注` | ❌ | 实施期 caller 改造 / 测试 fixture 变化 | `需 G7-7 fixture helper` |

### Work-log 头部 metadata 模板

```markdown
# Phase 5 Test Migration Map (D51)

Created: <Task 44 实施期日期>
Phase linkage: Stage 4 / Phase H
Decision anchor: spec §9.9 + D51

## 使用说明

每个老测试 case 一行(粒度按 [选项 A/B/C 待 Ian 拍]),判定 4 类(等价/加强/弱化/N/A)。
弱化必须写 Why,锚 D# 编号 + 一句话。无 Why 的弱化禁止合并(spec §9.9 强制)。

## D51 linkage

本文件是 D51 落地载体。判定原则见 phase-h-test-mapping.md §4。
```

### 样例行 3 个

```markdown
| `sanitize.test.ts > sanitizeAmount > rejects NaN` | 等价 | 同 | — | 纯 lib,无 DB 迁移影响 |
| `module-permissions.test.ts > getStoreModulePermissions > licensed only` | 加强 | `tenant-isolation.test.ts > permissions > RLS-aware` | — | D5 RLS 加 storeId 校验 |
| `split-billing-integration.test.ts > Session setup > creates with cartVersion=0` | 弱化 | `billing.test.ts > session > creates draft order` | D58: pendingCart 删除改 draft Order, B2 路径 X | session 字段 cartVersion 已删 |
```

## 3. 4 文件前置分类

(数据来源:2026-04-19 ground truth grep + 本 task 前置 view describe 结构)

### 3.1 `module-permissions.test.ts`(106 行 / 12 cases / 3 describes)

- **describes**:`getStoreModulePermissions` / `getStoreModules` / `resolvePermissions with module intersection`
- **预期影响**:加强(权限计算路径加 RLS context + tenantContext wrap),Phase F module 系统可能调整 caller signature
- **B2 字段引用**:0(ground truth)
- **难度**:**小** —— 12 cases 全 unit-level,无跨文件耦合

### 3.2 `settlement-gateway.test.ts`(402 行 / 40 cases / 8 describes)

- **describes**:`response structure` / `allowedActions` / `mode locking` / `error codes` / `split operations` / `error codes (extended)` / `allowedActions transitions` / `full settlement flow`
- **预期影响**:全方位影响——D58 (pendingCart 删除) / D63 (paidItems FK) / Task 37 gateway async + tx + 4 emit afterCommit / Task 38 actions FK signature
- **B2 字段引用**:1(ground truth `session.pendingCart|cartVersion|totalPaid` 唯一命中文件)
- **难度**:**大** —— 40 cases 跨 8 describe,gateway 全方位重构 + B2 字段消除

### 3.3 `split-billing-integration.test.ts`(477 行 / 45 cases / 10 describes)

- **describes**:`Session setup` / `payByPercent` / `payByItems` / `Settlement mode locking` / `Waiter split creation` / `Eager split invalidation` / `Split payment - tip handling (B1)` / `Remaining calculation (item-based)` / `Mixed flow: customer + waiter` / `Edge cases`
- **预期影响**:大幅加强 + 部分弱化——D63 derivePaidState FK / Task 38 split-bill 4 文件 / Task 42 session-payment FK / 9 处 `confirmItemPayment` 调用 (C6b2 §10 + Task 42 §5 已声明 FK 切换)
- **B2 字段引用**:0 直接 grep(but 9 处 itemKey 字符串调用)
- **难度**:**大** —— 45 cases 跨 10 describe,billing 全链 FK 切换 + 测试 fixture 改 FK

### 3.4 `sanitize.test.ts`(376 行 / 114 cases / 14 describes)

- **describes**:14 个(8 sanitize 函数 × edge / injection sub-suites)
- **预期影响**:等价(全)—— 纯 lib 测试,与 DB 迁移无关
- **B2 字段引用**:0
- **难度**:**小** —— 默认全等价,验证流程 task

## 4. D51 判定原则

### 4.1 三类判定 + 示例

**等价(equivalent)**:schema 字段改名 / 类型迁移 / 但行为不变
- **示例**:`session.cartVersion` → `order.version`(D58 路径 X 后,cart 移到 draft Order,version 字段保留同语义)
- 断言强度不变,仅字段名 / 路径变化

**加强(strengthened)**:新增 RLS context / tx 边界 / tenant isolation / FK 约束
- **示例**:加 `withTenantContext` wrap + 验证跨租户拒绝(D5 RLS)
- 新断言增强 implementation guarantee,语义验证不缩减

**弱化(weakened)**:SSOT 派生覆盖,断言粒度降低
- **示例**:`session.totalPaid` 字段删除,改 `derivePaidState(sessionId, tx).totalPaid` 派生(D63)。直接字段断言 → 派生函数调用断言
- 断言强度从"字段直接验证"降为"派生函数返回验证"

### 4.2 Why 门槛(弱化必填)

**Why 必须包含**:
1. **锚 D# 编号**(D58 / D63 等 plan 阶段决议,或 spec D1-D52 历史决议)
2. **一句话解释**(implementation 路径变化的精炼表达,1-2 行)

**反模式**(自动 review fail):
- ❌ 空 Why
- ❌ "大概等价就行"(无 D# 锚点)
- ❌ "B2 改了所以弱化"(事后合理化,不指明具体决议)
- ❌ 多段长 Why 不能精炼(说明判定本身不清晰)

### 4.3 Why 不过线后果

**Task 44 合并 PR 拒绝**(spec §9.9 line 1316 强制:"没 Why 的弱化禁止合并")。

具体执行:
- Task 44 实施期 PR review:Ian + CC 双方对照映射表,弱化条目逐条 verify Why
- 不过线条目 → blocker comment,要求改写 Why 或重新判定 4 类
- 整 PR block 直到所有弱化 Why 过线

## 5. Task 43 完成条件

- [ ] **本 plan 文件 commit**(纯文档,不涉及 tsc/test)
- [ ] 映射表 work-log **文件结构设计**已在本 plan §2 文档化(实际文件待 Task 44 建立)
- [ ] **4 文件前置分类**已在本 plan §3 文档化(基于 ground truth + describe view)
- [ ] **D51 判定原则**已在本 plan §4 文档化(3 类 + Why 门槛 + 反模式)
- [ ] **D64+ 候选预警**已在本 plan §6 登记(实施期 Ian 拍板)

**注意**:本 task 仅 plan,**不建立映射表 work-log 文件**(那是 Task 44 范围)。

## 6. D64+ 候选预警(实施期 Ian 拍板)

plan 阶段已浮现的待决议,Ian 在 Task 44 实施期前拍板:

### D64 候选:映射表条目粒度

- **候选 A**:每断言一行 / **候选 B**:每 it() block 一行 / **候选 C**:混合
- **决议时机**:Task 44 实施前(填表前必须先选定)
- **升格条件**:Ian 选定后,本预警升格为 D64,登记 spec § 1 决策表

### D65 候选:`pre-phase5-tests-baseline` tag 打点时机

- **候选 X**:Phase G 实施**未完成**阶段(plan 完成,新测试未写,Phase G 代码未 land)
  - **trade-off**:tag 早打,baseline 反映 Phase G plan 完成状态;但 B2 行为未实测验证
- **候选 Y**:Phase G 实施**已完成**阶段(B2 checkpoint 7 场景 pass + `phase5-b2-checkpoint` tag 已打)
  - **trade-off**:tag 晚打,baseline 反映 B2 行为已实测稳定;但等 Phase G 实施 land(可能跨多 Usage 窗口)
- **决议时机**:Task 44 实施期 / Phase G 实施完成时

### D66 候选:归档路径子分类

- spec §9.9 line 1320 + §9.10 line 1328 已确立 `server/_archive/tests-2026-04/` 路径 + `.bak` 后缀
- D48 + Phase G session 2 Ian 也确立 `server/_archive/` 根目录 + 子分类
- **可能不需新决议**:已有 D48 + spec §9.10 完整覆盖,Task 44 实施期 verify 即可
- **若有冲突**(归档路径与现有 plan 不一致)→ 升格 D66

(本 plan 不展开 D64-D66 候选的 5 条理由,Ian 实施期拍板时正式登记。)

---

**End of Task 43 plan.**

# Phase 5: PostgreSQL 迁移 + Cart/Order 合并（B2）实施计划 — 索引

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 一次性将 `server/data/*.json` + 同步 `JsonStore` 替换为 PostgreSQL + Prisma；同步完成 Cart 并入 Order（`status='draft'`）、Postgres RLS 多租户隔离、Platform Admin 三层权限体系。

**Architecture:** 共享 schema + `store_id` + Postgres RLS 行级隔离；`withTenantContext` 为唯一事务边界；repository 层默认排除 draft，类型判别联合 `DraftOrder` / `SubmittedOrder` 编译期防混用；EC2 + Docker Compose 自托管，SSM 管密码，每日 pg_dump 备份 S3。

**Tech Stack:** PostgreSQL 16 / Prisma 6 / Express / TypeScript / Vitest / Docker Compose / AWS SSM + S3

**Design doc:** `docs/superpowers/specs/2026-04-17-phase5-postgres-migration-design.md`（D1-D52 决策登记表在 §1）

---

## 如何使用本计划

1. **先读本索引文件** —— 全局规则、补强项追踪、Phase 映射都在这里
2. **按 Phase 顺序进入对应文件**执行 task
3. **每个 phase 文件独立可读** —— 头部引用本索引，task 内部自包含

---

## 全局规则（所有 task 遵守）

### 规则 1：增量 migration 铁律

任何阶段发现 schema 问题的处理路径：

- **失败类型 A（实现 bug）**：原地修业务代码，不动 schema
- **失败类型 B（schema 设计漏）**：新建增量 migration 目录 `prisma/migrations/20260418000001_b2_fix_xxx/migration.sql`，更新 `prisma/schema.prisma`，跑 `prisma migrate dev`
- **绝对禁止**：改已发布的 `20260417000001_init/migration.sql` 或 `20260417000002_rls_and_roles/migration.sql`。已发布 migration 改动会让 `prisma migrate` 状态混乱，团队成员本地 DB 无法同步

本规则适用全部 Phase A-K。

### 规则 2：SSE emit 时机

`emit(...)` 必须在 `withTenantContext` **返回之后**，不能在 tx 内。违反会导致"客户端收到事件 → fetch → 拿到 READ COMMITTED 下未 commit 的旧数据"。

### 规则 3：Repo 方法签名

写操作 repo 方法（`create` / `update` / `delete` / `upsert` / `bump*`）的 `db` 参数**必填**，读操作保留默认值（D52）。

### 规则 4：每 task 完成即 commit

不批量攒 commit。TypeScript/测试通过 → 立即 commit。commit message 按现有约定：`feat(phase-5): ...` / `fix(phase-5): ...` / `chore(phase-5): ...`。

### 规则 5：agent 文件独占边界

每个 agent 只改自己 task 声明的文件。跨 agent 共享文件（`shared/types.ts` / `shared/modules.ts` / `repositories/prisma-client.ts` / `docker-compose.yml`）由主 agent 在 Phase B 串行写定，之后任何 agent 只能读、不能写。

### 规则 6：验证前不得声明完成

`verification-before-completion` 的精神：任何"完成"声明前必须：
- `tsc -b`（server 和 client 各自）无新增错误
- 相关单元测试 `pnpm test <pattern>` 绿
- 贴实际命令输出到 commit 或 review，不靠"应该 ok"

### 规则 7：现有系统行为断言需 grep 证据支撑（evidence-first）

任何对"现有代码/系统如何工作"的断言——无论在 spec 设计讨论、plan 编写、还是 task 实施阶段——必须伴随 grep 或代码引用证据。

**范例**：

- ✅ "legacy itemKey 格式是 `orderId:idx:qty`（`server/src/lib/session-state.ts:121`）"
- ❌ "itemKey 是每个 order_item 创建时分配的稳定 UUID"（凭印象，无证据）

暂时无法 grep 的断言（例如涉及前端交互行为、用户 UX 期望、环境配置）必须显式标注 `[ASSUMPTION, needs verification in Phase X]`，**不得默认成立**。

**历史教训**：2026-04-17 Phase D 段 2a verify 阶段发现 spec §4.1 `OrderItem.itemKey` 设计基于错误事实假设——CC 在 spec 小节 4 Q4 讨论时凭印象回答"itemKey 是稳定 UUID"，未被要求提供 grep 证据就进入 spec。后续 plan Task 2/17/19/20 和 §6.2 Webhook 全部连锁错误，直到 Task 17 verify 阶段才发现。修正成本：spec + plan 两个 commit（`4fdd6b6c` + `976c492b`）和若干小时深度返工。若规则 7 早存在，grep 10 分钟即可拦截。

规则 7 的执行者**包括** CC 本身——CC 在描述现有行为时必须主动贴 grep 证据，不等用户要。

### 规则 8：规则违规的诚实标记（anti post-hoc rationalization）

当某个 task / commit / 文件**触及或越过** plan 里明示的上限或边界（例如：单文件行数软上限、单 task 步数、commit 范围、段内 task 数）时：

**默认动作**：**先暂停汇报给用户，共同决定是否例外**。不要自行判断"反正没出事就继续"。

**禁止行为**：事后合理化（post-hoc rationalization）。典型反模式——

- ❌ "其实现状挺好的，拆分反而割裂叙事"（当你已经写超了才这么说时，这是倒推正当性）
- ❌ "1200 只是软上限，1500 也能读"（规则存在就因为"能读但费力"是渐进衰退）
- ❌ "选项 A 最简所以选 A"（未把"超限有没有造成实际问题"作为判断主线）

**正确推理顺序**：
1. **先停下来汇报超限事实**
2. **再判断超限是否造成实际问题**——卡死？review 疲劳？可读性下降？agent 执行受阻？
3. **如果都没有 → 由用户批准例外**，在就近位置（task 顶部、文件开头）用 markdown 显式声明例外 + 理由 + **破防后的回滚路径**
4. **如果有 → 老实执行回滚/拆分**，不找借口继续

**历史教训**：2026-04-17 Phase D 段 2b 结束时 `phase-d-repositories.md` 从 733 行写到 1523 行（超出 1200 软上限 323 行）。CC 在用户要求下写完 5 task 才检查 wc -l，初次汇报给出三个选项并直接推荐"选项 A（保持现状）"，论证模式是事后合理化。用户识别并修正：先判断超限是否造成实际问题（本次三项都未发生），再决定例外；例外必须显式声明，不能隐式吞下。规则 8 即该次事件的直接产物。

#### 规则 8.1：pending-commits 清单强制外化（主动防御）

**何时触发**：每次偏离原 commit 约定（即使用户同意），或当前 session 存在"写好但未 commit"的文件。

**强制动作**：CC **必须**维护一个显式的 "pending commits" 清单——不允许靠记忆维护。清单形式二选一：

1. **当前 phase 文档顶部** 列 markdown checklist（推荐——和当前工作流合体）：
   ```markdown
   ## Pending commits（本 session 未 commit 的产出）

   - [ ] `phase-e-agent-a.md`（Task 27 plan，349 行）— 等段 3a 结尾 commit
   - [ ] `phase-e-agent-b.md`（Task 28 plan）— 写作中
   ...
   ```
2. **独立文件** `PENDING_COMMITS.md`（当 phase 文档不适合塞状态时 fallback）

每次：
- **新写文件** → 立刻登记到清单
- **commit 落地** → 立刻划掉（`- [x]` 或删除条目）
- **用户给新 commit 批次指令时** → CC 对照清单逐项核对，未划掉的必须包含在该批次或显式延后

**禁止行为**：
- ❌ "等收尾批次统一 commit"但不维护清单——记忆会漏
- ❌ 用户列 commit 批次时，CC 不对照清单就按用户清单执行——用户也会漏，清单是双方共享的 ground truth

**历史教训**：2026-04-17 Phase E 段 3a/3b/3c 写完三个 agent 文件后，CC 每次说"未 commit，等收尾批次统一落"但**没有维护任何清单**。段 3c 结束时用户列"收尾 4 commit + 1 RESUME"指令，CC 没对照清单就照做，落完 5 commit 才在 git status 时发现三个 agent 文件**从未 commit**——仓库处于不自洽状态（00-index.md 链向不存在的文件）。规则 8.1 即该事件的直接产物。事件处理：3 个 agent 文件补 3 个独立 commit（commit 7/8/9），不 amend 已有 5 commit。

**和规则 8 的关系**：规则 8 是"违规时诚实报告"（被动响应），规则 8.1 是"降低违规概率的工作流保护"（主动防御）。两条配对使用——清单漏了依然汇报（规则 8 仍适用），但清单存在大大降低漏的概率。

---

## 批次结构

| 批 | 范围 | Task 数 | 状态 |
|---|---|---|---|
| 批 1 | Phase A-D（Stage -1、0、1、2） | 29 | 写作中 |
| 批 2 | Phase E-K（Stage 3a-7） | ~28 | 批 1 实施完 Phase A-B 后展开 |

**为什么分批**：批 2 的 task 详细度要反映批 1 实施中的真实发现（Prisma 查询语法细节、实际的 tsc 错误模式、seed 失败场景），避免提前固化错误假设。

**Phase 和 Stage 映射**：Phase 是 plan 的执行单位（按 agent 和并行规则切），Stage 是 spec §9 的设计单位（按阶段依赖切）。一对一映射见下方执行顺序表。

---

## Plan 阶段对 spec 的补强项

实施阶段比 spec 设计阶段更贴近代码，难免发现应该加强的防御。分两类：

**已回填 spec**（single commit 已同步）：

- **D53 / D54**（commit `a9d18efc`）：Phase D 从"通用 CRUD 适配器 + 加 await"重新定位为"11 个语义 repo，storage 层一次切、业务层渐进迁"。Spec §9.5 Stage 2 已完整重写

**待批 2 完成后统一回填**：

- **Task 4**：RLS policy 除 `USING` 外加了 `WITH CHECK`（spec §4.5 / §5.4 只提了 `USING`）。`WITH CHECK` 控制 INSERT/UPDATE 新值，防"漏写 store_id 的 insert 被接受"。加强但不冲突
- **Task 6**：`withTenantContext` 用 `set_config()` + 参数化（`$executeRaw` 标签模板），不再字符串拼接。spec §5.4 示例代码用的是 `$executeRawUnsafe`——plan 升级了防御。`withPlatformContext` 同步改用 `tx.$executeRaw\`SET LOCAL ROLE platform_admin\``（style parity）
- **Task 2**：`Order.status` / `Session.status` / `Payment.status` / `SplitBill.status` 用 Prisma enum，DB 层强制（spec §4.1 schema 示例用的是 `String`）
- **D58**：pay-first 流 B2 draft 生命周期**路径 X**（submit 不删 draft，webhook 转 submitted）。Phase G 段 2 新增，5 条决策理由登记在 `phase-g-session-cart-b2.md` §5.2。路径 Y 反论保留登记（超时清理 YAGNI），路径 Z 排除（`findDraft` 传染性复杂度）。spec 回填时进 D1-D57 决策登记表，编号 **D58**。
- **D59**：PaymentIntent.metadata SSOT 模型——metadata 存 `{draftId, version}` pointer 不存 cartData 快照。Phase G 段 4 新增，5 条理由登记 `phase-g-payment-service.md` §6。spec 回填编号 **D59**。
- **D60**：R-X1 金额漂移处理——webhook 时 `expectedVersion` 校验（非 create 时），mismatch → refund + alert + SSE，不重建 PaymentIntent。Phase G 段 4 新增，4 条理由登记 `phase-g-payment-service.md` §6。spec 回填编号 **D60**。
- **D61**：payment 域 legacy itemKey 薄层深度——严格限制 controller 边界（入口 `parseItemKey` / 出口 `formatItemKey`），service 层全 FK 模型（`orderItemId + quantity`），禁 string/FK 混用。Phase G 段 4 新增，3 条理由登记 `phase-g-payment-service.md` §6。spec 回填编号 **D61**。
- **D63**：derivePaidState 签名 FK 化——`{ totalPaid: number, paidItemIds: string[] }` → `{ totalPaid: number, paidItems: { orderItemId: string, paidQty: number }[] }`。Phase G 段 5 新增，5 条决策理由登记 `phase-g-settlement-gateway.md` §5。理由 1 锚 D61（settlement 域延伸）/ 理由 2 锚 handoff §2 闭合 / 理由 3 锚 D56 先例对齐 / 理由 4 legacy-itemkey.ts 模式预防（双字段过渡 = 永久兼容层风险）/ 理由 5 规则 7 应用产物（基于 11 调用点 grep 数据形成）。settlement 域成立性自查全过（C6b2 §6）。spec 回填编号 **D63**。

批 2 完成后建一个 commit `docs(phase-5): reconcile spec with plan-stage enhancements` 把待回填的三条补回 spec。

---

## 执行顺序（Phase → Stage → 文件）

| Phase | Stage | 文件 | Task 数 | 前置 |
|---|---|---|---|---|
| A | -1 | [phase-a-backup.md](./phase-a-backup.md) | 3（1a/1b/1c） | 无 |
| B | 0 | [phase-b-infrastructure.md](./phase-b-infrastructure.md) | 10（Task 2-10） | Phase A 全部完成（1c 必须先跑） |
| C | 1 | [phase-c-test-db.md](./phase-c-test-db.md) | 5（Task 11-15） | Phase B 全部完成 |
| D | 2 | [phase-d-repositories.md](./phase-d-repositories.md)（Task 16-22）+ [phase-d-repositories-part2.md](./phase-d-repositories-part2.md)（Task 23-26） | 11（Task 16-26） | Phase C 全部完成 |
| E | 3a | [phase-e-agent-a.md](./phase-e-agent-a.md)（Task 27, 349 行）+ [phase-e-agent-b.md](./phase-e-agent-b.md)（Task 28, 428 行）+ [phase-e-agent-c.md](./phase-e-agent-c.md)（Task 29, 298 行） | 3（Task 27-29，按 agent 切分，每 agent 一文件） | Phase D |
| F | 3b | [phase-f-platform-admin.md](./phase-f-platform-admin.md)（Task 30-31, 496 行） | 2（Task 30-31, 单文件——全新 agent D 工作包 zero overlap） | Phase D（可和 E 并行） |
| G | 3c | [phase-g-session-order.md](./phase-g-session-order.md)（Task 32-33, 415 行）+ [phase-g-session-cart-b2.md](./phase-g-session-cart-b2.md)（Task 34, 565 行, 含 D58）+ [phase-g-b2-checkpoint.md](./phase-g-b2-checkpoint.md)（Task 35, 478 行）+ [phase-g-payment-service.md](./phase-g-payment-service.md)（Task 36, 435 行, 含 D59/D60/D61）+ [phase-g-settlement-gateway.md](./phase-g-settlement-gateway.md)（Task 37 part 1, 368 行, 含 **D63**）+ [phase-g-settlement-gateway-part2.md](./phase-g-settlement-gateway-part2.md)（Task 37 part 2, 411 行, derivePaidState FK + 11 调用方原子切）+ [phase-g-settlement-actions.md](./phase-g-settlement-actions.md)（Task 38 part 1, 412 行, actions + rules）+ [phase-g-settlement-split-bill.md](./phase-g-settlement-split-bill.md)（Task 38 part 2, 419 行, split-bill 4 文件） | 11（Task 32-42，段 1-3 + 段 4-6 Task 36-38 完成 / **段 5 余 Task 39-42 下 Usage 窗口**） | Phase E/F |
| H | 4 | _（批 2 待写）_ | 3（Task 43-45） | Phase G |
| I | 5 | _（批 2 待写）_ | 2（Task 46-47） | Phase H |
| J | 6 | _（批 2 待写）_ | 5（Task 48-51，含 49a/49b 拆分） | Phase I |
| K | 7 | _（批 2 待写）_ | 1（Task 52） | Phase J |

---

## 批 1 任务清单（供索引参考，详情见对应 phase 文件）

### Phase A：Stage -1 备份 EC2 演示数据 → [phase-a-backup.md](./phase-a-backup.md)

| Task | 内容 | 阻塞关系 |
|---|---|---|
| 1a | SSH + pg_dump 4 张表 | 先 |
| 1b | scp 回本地 + 完整性验证 | 在 1a 后 |
| 1c | 本地 dry-run restore | 在 1b 后，**必须在 Phase B 开始前完成** |

### Phase B：Stage 0 基础设施 → [phase-b-infrastructure.md](./phase-b-infrastructure.md)

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
| 10 | 更新 `docker-compose.yml` + 开启 `no-floating-promises` |

### Phase C：Stage 1 测试 DB → [phase-c-test-db.md](./phase-c-test-db.md)

| Task | 内容 |
|---|---|
| 11 | 写 `docker-compose.test.yml` |
| 12 | 写 `vitest.config.ts` + `setup.ts` |
| 13 | 写 `fixtures.ts` |
| 14 | 写 `rls-coverage.test.ts` + `tenant-isolation.test.ts` |
| 15 | 写 `module-registry.test.ts` |

### Phase G 段 1-3：Stage 3c 核心业务链（本 session 2026-04-17 完成，段 4-5 留下 session）

| Task | 内容 |
|---|---|
| 32 | `session-crud.ts` 迁移（16 JsonStore → 0，0 emit，8 exports async 化）→ [phase-g-session-order.md](./phase-g-session-order.md) |
| 33 | `order.service.ts` 迁移（20 JsonStore → 0 + **11 emit → afterCommit**，5 function return `{data, events[]}` 模式）→ 同上文件 |
| 34 | `session-cart.ts` **B2 重写**（整文件重写，从 `session.pendingCart` → draft Order，含 **D58 路径 X 决议**）→ [phase-g-session-cart-b2.md](./phase-g-session-cart-b2.md) |
| 35 | B2 Manual Checkpoint (D50) **7 场景** a-g 双层结构（intent + concrete steps + failure mode + pass criteria + tag `phase5-b2-checkpoint`）→ [phase-g-b2-checkpoint.md](./phase-g-b2-checkpoint.md) |
| 36 | `payment.service.ts` B2 适配（5 JsonStore → Prisma + metadata 改 `{draftId, version}` pointer + webhook submitDraft 改造 + itemKey controller 边界薄层）+ **D59/D60/D61 决议 inline**（D62 候选 Task 41 handoff）→ [phase-g-payment-service.md](./phase-g-payment-service.md) |
| 37 | `settlement/gateway.ts` B2 适配（C5b 拆分两文件）：part 1 = gateway B2 主体（4 JsonStore + 4 emit afterCommit + splitBillStore 死 import 清理 G5-1）+ **D63 决议**（derivePaidState 签名 FK 化）+ handoff §2 11 处归属表 / part 2 = derivePaidState FK + 11 调用方原子切 + handoff §2 8 消除 → [phase-g-settlement-gateway.md](./phase-g-settlement-gateway.md) + [phase-g-settlement-gateway-part2.md](./phase-g-settlement-gateway-part2.md) |
| 38 | `settlement/actions/*.ts` + split-bill 域 5 文件 B2 重构（C6b 拆分两文件 + C6a 前置 grep）：part 1 = actions 9 文件 signature FK + rules.ts（checkPaymentItems FK + .split(':') 消除 + orderRepo 切换）+ Task 38 ↔ Task 42 耦合声明 / part 2 = split-bill 4 文件深度改造（5 .split(':') 消除 + 28 JsonStore + manual capture metadata 独立 lifecycle 声明） → [phase-g-settlement-actions.md](./phase-g-settlement-actions.md) + [phase-g-settlement-split-bill.md](./phase-g-settlement-split-bill.md) |
| 39-42 | webhook plan / session-payment 收尾 / session-settlement 非 derivePaidState 部分 / 其他 **（下 Usage 窗口写）** |

### Phase D：Stage 2 Repository 层 → [phase-d-repositories.md](./phase-d-repositories.md)（16-22）+ [phase-d-repositories-part2.md](./phase-d-repositories-part2.md)（23-26）

| Task | 内容 |
|---|---|
| 16 | 重写 `repositories/stores.ts`（choke point） |
| 17 | 写 `repositories/orders.ts`（B2 核心） |
| 18 | 写 `repositories/sessions.ts` |
| 19 | 写 `repositories/payments.ts` |
| 20 | 写 `repositories/split-bills.ts` |
| 21 | 写 `repositories/menu.ts` |
| 22 | 写 `repositories/staff.ts` |
| 23 | 写 `repositories/roles.ts` + `resolveLicensedPermissions` helper |
| 24 | 写 `repositories/coupons.ts` |
| 25 | 写 `repositories/waitlist.ts` |
| 26 | 写 `repositories/platform-admin.ts` |

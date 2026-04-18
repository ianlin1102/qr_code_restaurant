# Phase 5 Resume — Context Handoff

Created: 2026-04-17, post-段 2b（new file, no prior version existed — grep-verified）

## 当前位置

**Phase A-F plan 全部就绪 + Phase G 段 1-3 完成 + 段 4 Task 36 完成**（批 2 推进到 Task 36，进度 **3.2/5 段**）：

- Phase E Task 27-29（3 个 agent-level 工作包，`phase-e-agent-{a,b,c}.md`）
- Phase F Task 30-31（platform admin，`phase-f-platform-admin.md`，含 6 DP 决议 inline）
- **Phase G 段 1** Task 32-33（`phase-g-session-order.md`，session-crud + order.service 迁移，含 11 emit → afterCommit）
- **Phase G 段 2** Task 34（`phase-g-session-cart-b2.md`，session-cart B2 重写 + **D58 路径 X 决议（5 条理由）**）
  - C2a 前置 grep 证据（`phase-g-section-2-grep.md`，12 前端 cartVersion 使用点 / 7 pendingCart 点 / 决议冲突零）
- **Phase G 段 3** Task 35（`phase-g-b2-checkpoint.md`，7 场景 a-g 双层结构 intent+concrete+failure+pass+tag）
- **Phase G 段 4 Task 36**（`phase-g-payment-service.md`，payment.service B2 + **D59/D60/D61 决议 inline** + **D62 候选登记 handoff**）
  - C4a 前置 grep 证据（`phase-g-section-4-grep.md`，24+ itemKey 依赖分布 / pi.metadata.cartData 现状 / webhook 职责边界）
- Phase D 累积回填（Phase G session 1 末最终）：
  - **6 项无条件**：G1-1..G1-4（段 1）+ G2-1 + G2-2（段 2）—— G2-3/G2-4 因 D58 选路径 X 取消
  - 段 4 新增 3 项：G4-1（候选，可能已满足）/ G4-2（Phase B schema 调整：Order.isPaid 去除）/ G4-3（实施期对齐 status 参数）
- Phase B Task 2 schema 回填（PlatformAuditLog）+ Task 8 afterCommit 机制
- spec §9.6 事实修正
- 规则 8.1（pending-commits 清单强制外化，主动防御）

Phase G 段 4 余 **Task 37-38**（session-payment / split-bill 的 itemKey → FK 切换，D61 约束：service 层全 FK）+ **段 5 Task 39-42**（webhook plan / session-payment 收尾 / 等）共 6 task 留下个 session。

## 近期关键 commit

**Phase G session 1 commit 链（2026-04-17 至 2026-04-18，段 1-3 + 段 4 Task 36 plan 完成）**：

- `cf0bf43a` — docs: Phase G session 1 progress update (Task 36 complete, D59/D60/D61 decided, D62 handoff) — 本 session 最终收尾 commit（含本 commit 的 amend 修复 RESUME 头部 smart-quotes 残缺）
- `d41ccdc7` — plan: Phase G 段 4 Task 36 payment.service B2 + **D59/D60/D61 决议 inline** + D62 登记 handoff（amend：C4b 原 `b98b34a1` + handoff D62 小节，2 文件一次 amend）
- `38e198b8` — plan: Phase G C4a 前置 grep 证据（385 行，payment 域 24+ itemKey 深度依赖 / pi.metadata.cartData 现状 / webhook 25 行纯转发）
- `857ae1ec` — plan: Phase G 段 3 Task 35 B2 manual checkpoint 7 场景（478 行，每场景 intent+steps+failure+pass+tag）
- `ccf7fce8` — plan: Phase G 段 2 Task 34 session-cart B2 重写 + **D58 路径 X 决议（5 条理由）** + 选项 A 聚合成本拆解（565 行，amend 2 次）
- `257e470f` — plan: Phase G C2a 前置 grep 证据（394 行，12 cartVersion 点 / 7 pendingCart 点 / 决议冲突零）
- `cfee51be` — plan: Phase G 段 1 Task 32-33 session-crud + order.service（415 行，11 emit → afterCommit）

Phase F 收尾批次（**2026-04-17 session 中段 6 commit**，规则 8.1 严格实时打勾）：

- `8cf72249` — plan: 00-index.md Phase F 行指向 phase-f-platform-admin.md
- `03b68194` — plan: Phase F platform admin bodies（Task 30-31, 496 行）+ 6 DP 决议 inline + pending 3/6 snapshot
- `58fa4759` — plan: Phase D 新增 platformAuditLogRepo（F-3，附录独立新 repo 文件）
- `753d29c2` — plan: Phase D Task 26 补丁 platformAdminRepo.updateLastLoginAt（F-1）
- `4813750d` — plan: Phase B Task 2 回填 PlatformAuditLog schema + 不启 RLS note（F-2，DP-PF-4 决议 A）

Phase E 收尾批次（2026-04-17 session 中段 9 commit）：

- `80e6bf47` — plan: Phase E Agent C plan（coupon/analytics/printer, 298 行）
- `52e8f496` — plan: Phase E Agent B plan（staff/role/clock/waitlist, 428 行）
- `006d7397` — plan: Phase E Agent A plan（menu + category, 349 行）
- `28b1874e` — plan: **规则 8.1 补充**（pending-commits 清单强制外化，主动防御）
- `c1b3df9c` — docs: RESUME.md 同步（Phase E plan 完成时 snapshot）
- `6ee9e827` — plan: 00-index.md Phase E 行指向 3 个 agent 文件
- `79616685` — docs: spec §9.6 Agent A/B/C 文件列表事实修正
- `2f51b8cb` — plan: Phase B Task 8 `afterCommit` 机制补丁
- `1d77d3c9` — plan: Phase D 5 项回填补丁（menu/staff/role + printerRepo）

Phase E 三个 agent plan commit（本 session 中段）：

- `a38ae489` — plan: Phase D 段 2c bodies（Task 23-26）+ 文件拆分（phase-d-repositories-part2.md 新建）
- 同 session 后续 3 个 agent plan commits（phase-e-agent-a/b/c.md，未单独 commit——等收尾 reconciliation）

Phase D 历史 commit（段 2a/2b）：

- `272a9e35` — docs: RESUME.md 首建 (context-reset handoff)
- `9b31f525` — plan: 规则 8 + phase-d size exception
- `7422d545` — plan: Phase D 段 2b bodies（Task 18-22）
- `4fdd6b6c` — spec: itemKey 模型修正（D55/D56/D57）+ §4.1 事实勘误
- `976c492b` — plan: Phase D itemKey 修正连锁更新（Task 2/17/19/20 + legacy-itemkey.ts 占位）
- `08726fb6` — plan: 规则 7（evidence-first）

## 下一步

**Phase G 段 4 余 Task 37-38 + 段 5 Task 39-42**（session-payment / split-bill 的 itemKey → FK 切换 + webhook plan + 收尾）共 6 task **留下个 session**。

**Task 37-38 执行前提**（基于本 session D61 决议）：
- D61 强制 service 层全 FK 模型（`orderItemId + quantity`），不允许 string/FK 混用
- Task 36 落地 controller 边界薄层（`parseItemKey` 入口 / `formatItemKey` 出口）
- Task 37 `session-payment.ts addPayment` 签名改 FK（12 处 itemKey 依赖点全部重构）
- Task 38 `split-bill-payment.service.ts` attribution helper 改 FK（6 处）
- **Task 37-38 耦合度高**，不适合切半任务——独立 session 专注推

**D58/D59/D60/D61 Ian 决议锚点**（本 session 内完成，下 session 实施时必读）：
- **D58 路径 X**（段 2 plan §5.2，5 条理由）：pay-first submit 不删 draft，webhook 转 submitted
- **D59 PaymentIntent.metadata = pointer**（段 4 plan §6）：metadata 存 `{draftId, version}`，不存 cartData
- **D60 R-X1 webhook 校验 + refund**（段 4 plan §6）：mismatch → `OPTIMISTIC_LOCK_CONFLICT` → refund + alert，不重建 PaymentIntent
- **D61 payment 域 itemKey 薄层**（段 4 plan §6）：controller 边界严格，service 层全 FK
- **D62 候选**（Task 41 时决议）：webhook 幂等，Ian 倾向 B（`stripe_payment_intent_id UNIQUE`），登记在 `phase-g-handoff.md` 新小节

**实施阶段**：从 **Phase A-1（EC2 演示数据备份）** 开始，按 `phase-a-backup.md` 执行。**Phase A-1 必须在 Phase B 动手前完成**（00-index.md 主表已标注）——无回滚点不可动 schema。

**Phase D 回填候选清单**（Phase G 实施期前置，下 session 实施阶段集中 land）：
- **无条件 6 项**：G1-1 `createSubmitted` / G1-2 `updateTableId` / G1-3 `voidOrderItem` / G1-4 `countByStore` / G2-1 `findDraftsBySession` / G2-2 `deleteDraftsBySession`
- **段 4 新增 3 项**：G4-1（`paymentRepo.create method` 参数候选，可能已满足）/ G4-2（`Order.isPaid` 字段去除，**触发 Phase B schema 调整**）/ G4-3（`paymentRepo.create status` 参数 Task 36 实施期对齐）
- ~~G2-3 / G2-4~~（D58 路径 Y/Z 取消）

**B2 checkpoint tag（Phase G 实施完成的稳定回滚点）**：段 3 plan `phase-g-b2-checkpoint.md` 末尾已写完整 tag 操作步骤——7 场景全 pass 后 `git tag -a phase5-b2-checkpoint` + push origin + verify。Phase G 段 4-5 实施前若有破坏性操作可 `git reset --hard phase5-b2-checkpoint` 退回 B2 完成状态。

**Phase F 实施依赖**（当 Phase A-F 实施推进到 Phase F 时必读）：
- DP-PF-1 跨 Agent D 边界改共享 `auth.middleware.ts` + `verifyToken` + `shared/types.ts`——**实施期必须 Ian 亲批**（不是 blanket approval）
- DP-PF-4 / F-2 的 Phase B Task 4 RLS migration **必须显式不为 `platform_audit_log` 加 RLS**
- DP-PF-3 方案 A 的 frontend handoff（banner + exit button + storeId 标注）——Phase F 只做 backend，frontend 另分 phase

## 对 3d 决议的认知更新（本 session 修正）

**背景**：上 session Phase G 段 3 讨论 handoff §5d 时，基于"~50 行 shim"估计给 `legacy-itemkey.ts` 的 exit condition 注释。本 session C4a grep 发现真实体量**远大于该估计**。

**修正要点**（下 session 读 handoff §5d / Task 36 实施 legacy-itemkey.ts 时带此视角）：

- **真实分布**：`legacy-itemkey.ts` 的消费面不是"几处 shim 调用"，而是 **4 文件 24 处深度依赖**：
  - `session-payment.ts` **12 处**（最深，`addPayment`/`confirmItemPayment` 整个模块围绕 itemKeys 做 attribution）
  - `split-bill-payment.service.ts` **6 处**（`splitAttribution` helper + addPayment 调用链）
  - `payment.service.ts` **4 处**（`CheckoutRequest.itemKeys` + PaymentIntent metadata + webhook parse）
  - `payment.routes.ts` **2 处**（route body 解构 + 转发）
- **退场规模修正**：从"删除一个文件的随手工作" → **独立 phase 级重构**
- **Task 36 C4b §5.3 已写修正版注释文本**（Phase G 实施 Task 36 时顶部字面照抄，替换 handoff §5d 原 exit condition）
- **D61 覆盖的 4 文件 = 这 4 个消费点**：Task 36 处理 payment.service + payment.routes（入口薄层 + metadata 字段改 pointer）；Task 37-38 下 session 处理 session-payment + split-bill-payment（service 层 FK 切换）

## 工具陷阱经验（下 session Claude 读起点）

**Smart quotes Edit 失败模式**（本 session 2026-04-18 首发）：

- **症状**：Edit 工具 old_string 匹配"看似正确但字节不同"的文本——视觉接近但 Unicode 不同
  - Chinese smart quotes：`"..."`（U+201C / U+201D）
  - ASCII straight quotes：`"..."`（U+0022）
  - Full-width vs half-width：`，`（U+FF0C）vs `,`（U+002C）；`：` vs `:`；`（）` vs `()`
- **失败触发**：用户消息 / Write 工具 / Claude 自己写 new_string 时默认字符可能被 Markdown 渲染/转码切换成另一种；Edit 时从 Read 看似一致但精确字节不同
- **正确路径**（本 session 验证成功）：
  1. 小 Edit / 短 anchor 先试一次
  2. 若 2 次 old_string mismatch，**立刻切 Python**：
     ```python
     with open(path, 'r') as f: lines = f.readlines()
     assert lines[N].startswith('unique_prefix'), 'guard: line changed'
     new_lines = lines[:N] + [new_content] + lines[M:]
     with open(path, 'w') as f: f.writelines(new_lines)
     ```
  3. assert guard 保证行号未被其他修改污染
  4. Python 读写字节精确，smart quotes / 全半角 / zero-width 字符都不干扰
- **何时直接走 Python**：
  - 文件含大量中文（标点、引号混用）
  - 替换范围跨 > 10 行
  - old_string 含 embedded code blocks（`` ` `` 字符）
- **下 session 应用场景**：Task 37/38 实施时改 4 个 payment 文件的 itemKey 替换（24 处改动，标点字符高密度）——默认走 Python 路径

## Self-review checklist（CC 交付前自己答完）

- 规则 2：repo 层无 `emit(` 调用？emit 通过 `res.locals.afterCommit` 在 tx commit 后发？
- 规则 3：写操作参数类型是 `Db` 还是窄化为 `Prisma.TransactionClient`？多步写必须窄化。
- 规则 7：任何 "existing behavior" 声明带 grep 证据？
- 规则 8：本次产出有任何超限/越界？如有必须明示。
- D23：返回类型用 DraftXxx / SubmittedXxx narrow？（适用于 Order 相关）
- D24：findSubmitted 默认排除 draft？（适用于 Order 相关）
- D55：多步写签名是 TransactionClient 不是 Db？
- D56：Payment/SplitBill 用 FK 模型不是字符串 itemKey？
- D57：OrderItem 相关代码用 position 列 + @@unique 约束？

## 用户协作规则

- 用户说"继续"时显式问状态 A（休息过了）/ B（想用完当前 session）/ C（新 session 刚开始）
- 疲劳信号：用户主语从"我觉得..."变成"按你的意思"、或只说"确认" → 主动建议暂停
- 每个 Max 周期结束自然暂停，不追赶 task 数量进度
- 用户是业余时间做这个项目，没有 deadline，**可持续 > 速度**

## 绝对不能做

- 在没用户明确批准的情况下实施 Task
- 合并跨层 commit（spec 决策 / plan 计划 / 代码实施 三层分开）
- 对 factual claim 不贴 grep 证据就进 spec 或 plan（规则 7）
- 违规时自行合理化"反正没出事"（规则 8）——先暂停汇报
- 把用户的错误记忆当事实（grep 验证后拒绝背书，像本文件创建时 CC 做的那样）

## 重启后读的文件顺序

1. `RESUME.md`（本文件）—— 项目当前状态
2. `00-index.md` —— 全局规则 1-8 + **规则 8.1**（pending 清单强制）+ Phase 主表
3. `phase-d-repositories.md` —— Phase D 段 2a/2b（Task 16-22）+ **Phase E 回填附录（printerRepo）**
4. `phase-d-repositories-part2.md` —— Phase D 段 2c（Task 23-26，含 Phase E 事后回填 `findByName`）+ **Phase F 回填附录（`platformAuditLogRepo`）**
5. `phase-e-agent-a.md` / `phase-e-agent-b.md` / `phase-e-agent-c.md` —— Phase E 三个 agent 工作包
6. **`phase-f-platform-admin.md`** —— Phase F 两个 task（Task 30-31）+ 6 DP 决议 inline + frontend handoff（banner UI）
7. `phase-b-infrastructure.md`（Task 2 PlatformAuditLog schema + Task 8 afterCommit 机制）—— Phase E/F 共用依赖
8. **`phase-g-session-order.md`** —— Phase G 段 1 Task 32-33（session-crud + order.service, 11 emit → afterCommit）
9. **`phase-g-session-cart-b2.md`** —— Phase G 段 2 Task 34（B2 重写 + D58 路径 X 5 条理由 + 选项 A 聚合成本 A.1-A.4）
10. **`phase-g-b2-checkpoint.md`** —— Phase G 段 3 Task 35（7 场景 a-g 双层结构 + tag 操作）
11. **`phase-g-section-2-grep.md`** work-log —— Phase G 段 2 C2a 前置 grep 证据（12 cartVersion 点 / 7 pendingCart 点 / 决议一致性核查）
12. **`phase-g-payment-service.md`** —— Phase G 段 4 Task 36（payment.service B2 + D59/D60/D61 决议 inline + D62 pointer to handoff）
13. **`phase-g-section-4-grep.md`** work-log —— Phase G 段 4 C4a 前置 grep 证据（payment 域 24 itemKey 分布 / metadata SSOT 分析 / webhook 职责边界）
14. **`phase-g-handoff.md`** work-log —— Phase G 启动输入（§5 4 条决议 + Task 35 模板 + §6 fetch API grep + **§7 D62 候选 webhook 幂等**）

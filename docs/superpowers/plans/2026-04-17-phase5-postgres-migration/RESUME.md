# Phase 5 Resume — Context Handoff

Created: 2026-04-17, post-段 2b（new file, no prior version existed — grep-verified）
Updated: 2026-04-19, post-Task 38 完成（Phase G 3.6/5 段）

## 当前位置

**Phase A-F plan 全部就绪 + Phase G 段 1-3 完成 + 段 4 全部完成（Task 36-38）+ 段 5 余 Task 39-42 留下窗口**（批 2 推进到 Task 38，进度 **3.6/5 段**）：

- Phase E Task 27-29（3 个 agent-level 工作包，`phase-e-agent-{a,b,c}.md`）
- Phase F Task 30-31（platform admin，`phase-f-platform-admin.md`，含 6 DP 决议 inline）
- **Phase G 段 1** Task 32-33（`phase-g-session-order.md`，session-crud + order.service 迁移，含 11 emit → afterCommit）
- **Phase G 段 2** Task 34（`phase-g-session-cart-b2.md`，session-cart B2 重写 + **D58 路径 X 决议（5 条理由）**）
- **Phase G 段 3** Task 35（`phase-g-b2-checkpoint.md`，7 场景 a-g 双层结构 intent+concrete+failure+pass+tag）
- **Phase G 段 4 Task 36**（`phase-g-payment-service.md`，payment.service B2 + **D59/D60/D61 决议 inline** + **D62 候选登记 handoff**）
- **Phase G 段 5 Task 37**（C5b 拆分两文件）：
  - `phase-g-settlement-gateway.md`（C5b1，gateway.ts B2 主体 + **D63 决议**：derivePaidState 签名 FK 化 + handoff §2 11 处归属表）
  - `phase-g-settlement-gateway-part2.md`（C5b2，derivePaidState FK + 11 调用方原子切 + handoff §2 8 消除）
- **Phase G 段 6 Task 38**（C6b 拆分两文件，C6a 前置 grep）：
  - `phase-g-settlement-actions.md`（C6b1，actions 9 文件 signature FK + rules.ts 改造 + Task 38 ↔ Task 42 耦合声明）
  - `phase-g-settlement-split-bill.md`（C6b2，split-bill 4 文件 B2 重构 + 5 .split(':') 消除 + 28 JsonStore + manual capture metadata 独立 lifecycle 声明）
- Phase D 累积回填（**14 项**）：
  - 无条件 6 项：G1-1..G1-4（段 1）+ G2-1 + G2-2（段 2）—— G2-3/G2-4 因 D58 选路径 X 取消
  - 段 4 新增 3 项：G4-1（候选可能已满足）/ G4-2（Phase B schema 调整：Order.isPaid 去除）/ G4-3（实施期对齐 status 参数）
  - **段 5 新增 2 项**：G5-1（splitBillStore 死 import，gateway.ts:8）/ G5-2（paymentRepo.derivePaidQuantityByOrderItem 候选已满足）
  - **段 6 新增 3 项**：G6-1（orderRepo.findOrderItem 候选）/ G6-2（splitBillRepo.create FK 模型候选已满足）/ G6-3（splitBillRepo.findBySessionId 候选已满足）
- Phase B Task 2 schema 回填（PlatformAuditLog）+ Task 8 afterCommit 机制
- spec §9.6 事实修正
- 规则 8.1（pending-commits 清单强制外化，主动防御）

Phase G **余 Task 39-42**（段 5 webhook plan / session-payment 收尾 / session-settlement 非 derivePaidState 部分 / 其他）共 4 task **留下个 Usage 窗口**。

## 近期关键 commit

**Phase G session 2 commit 链（2026-04-18 至 2026-04-19，段 5 Task 37 + 段 6 Task 38 + 收尾）**：

- `<本收尾 SHA>` — docs: Phase G Task 37-38 complete (sections 5-6, D63 decided)
- `be1681a6` — plan: Phase G C6b2 Task 38 part 2 split-bill B2 refactor（419 行，4 文件 + 28 JsonStore + 5 .split(':') 消除 + manual capture lifecycle 独立声明）
- `e52342f5` — plan: Phase G C6b1 Task 38 part 1 settlement actions signature + rules（412 行，9 actions + rules.ts，含 C6a 7→6 actions 数据修正声明 + Task 38 ↔ Task 42 耦合声明）
- `70a2eaee` — plan: Phase G C6a Task 38 前置 grep（307 行，14 文件 / itemKey 29 处 / JsonStore 29 处 / handoff §2 5 处对齐）
- `f38c7a0f` — plan: Phase G C5b2 Task 37 part 2 derivePaidState FK + 11 调用方原子切（411 行，含**规则 8 例外声明** 394 行超 300 阈值 + Ian 批准书面化）
- `97361fc8` — plan: Phase G C5b1 Task 37 part 1 settlement gateway B2 + **D63 决议** + handoff §2 补登记（368 行，5 条理由 settlement 域成立性自查）
- `69203a8c` — plan: Phase G C5a Task 37 前置 grep（284 行，gateway.ts 137 行 / 4 JsonStore / 4 emit / 0 显式 itemKey + 1 隐式）

**Phase G session 1 commit 链（2026-04-17 至 2026-04-18，段 1-3 + 段 4 Task 36 plan 完成）**：

- `cf0bf43a` — docs: Phase G session 1 progress update (Task 36 complete, D59/D60/D61 decided, D62 handoff)
- `d41ccdc7` — plan: Phase G 段 4 Task 36 payment.service B2 + **D59/D60/D61 决议 inline** + D62 登记 handoff
- `38e198b8` — plan: Phase G C4a 前置 grep 证据（385 行）
- `857ae1ec` — plan: Phase G 段 3 Task 35 B2 manual checkpoint 7 场景（478 行）
- `ccf7fce8` — plan: Phase G 段 2 Task 34 session-cart B2 重写 + **D58 路径 X 决议（5 条理由）**（565 行）
- `257e470f` — plan: Phase G C2a 前置 grep 证据（394 行）
- `cfee51be` — plan: Phase G 段 1 Task 32-33 session-crud + order.service（415 行，11 emit → afterCommit）

**Phase F 收尾批次 + Phase E 收尾批次 + Phase D 历史 commit**：见 git log，本文件不再展开。

## 下一步

**Phase G 段 5 余 Task 39-42**（webhook plan / session-payment 收尾 / session-settlement 非 derivePaidState 部分 + 其他）共 4 task **留下个 Usage 窗口**。

**段 5 起点信息**（下窗口启动时直接消费）：
- Task 39 webhook plan：依赖 D62 候选（webhook 幂等，Ian 倾向 B = `stripe_payment_intent_id UNIQUE`）正式决议
- Task 41 webhook 实施细节：参考 C5b1/C5b2/C6b2 内的 `[Task 41 webhook plan 时 final verify]` 标记点（webhook afterCommit 形态 + manual capture metadata 是否需 D59 协调）
- Task 42 session-payment + session-settlement 收尾：**范围已收窄**（C5b1 §7 声明），derivePaidState 相关改造已在 Task 37 C5b2 完成，Task 42 仅处理 session-settlement.ts 非 derivePaidState 部分 + session-payment.ts 全部
- **C6b1 + C6b2 + Task 42 三方原子 commit 要求**（C6b2 §4）：减少 typecheck unstable + shim 债务

**D58/D59/D60/D61/D63 Ian 决议锚点**（实施期必读）：
- **D58 路径 X**（段 2 plan §5.2，5 条理由）：pay-first submit 不删 draft，webhook 转 submitted
- **D59 PaymentIntent.metadata = pointer**（段 4 plan §6）：metadata 存 `{draftId, version}`，不存 cartData
- **D60 R-X1 webhook 校验 + refund**（段 4 plan §6）：mismatch → `OPTIMISTIC_LOCK_CONFLICT` → refund + alert
- **D61 payment 域 itemKey 薄层**（段 4 plan §6）：controller 边界严格，service 层全 FK
- **D62 候选**（Task 41 时决议）：webhook 幂等，Ian 倾向 B（`stripe_payment_intent_id UNIQUE`），登记 `phase-g-handoff.md` 末尾
- **D63 derivePaidState FK 签名**（段 5 plan `phase-g-settlement-gateway.md` §5，5 条理由）：`{ totalPaid, paidItemIds: string[] }` → `{ totalPaid, paidItems: { orderItemId, paidQty }[] }`，settlement 域成立性自查全过（C6b2 §6）

**实施阶段**：从 **Phase A-1（EC2 演示数据备份）** 开始，按 `phase-a-backup.md` 执行。**Phase A-1 必须在 Phase B 动手前完成**——无回滚点不可动 schema。

**Phase D 回填候选清单**（Phase G 实施期前置，下 session 实施阶段集中 land）：14 项详见上方"当前位置"。

**Task 38 ↔ Task 42 deploy 协调要求**（C6b1 §4.1）：
6 actions（add-payment / cash-payment / close-session / pay-items / pay-percent / reopen-session）依赖 session.service 函数 signature。Task 42 改 signature → actions 需同轮 deploy。

**B2 checkpoint tag**：段 3 plan `phase-g-b2-checkpoint.md` 末尾完整 tag 操作步骤。Phase G 段 4-6 实施前若有破坏性操作可 `git reset --hard phase5-b2-checkpoint` 退回。

**Phase F 实施依赖**（推进到 Phase F 时必读）：
- DP-PF-1 跨 Agent D 边界改共享 `auth.middleware.ts` 等 —— 实施期必须 Ian 亲批
- DP-PF-4 / F-2 的 Phase B Task 4 RLS migration **必须显式不为 `platform_audit_log` 加 RLS**
- DP-PF-3 方案 A 的 frontend handoff —— Phase F 只做 backend

## 对 3d 决议的认知更新（Phase G session 1 修正）

**真实分布**：`legacy-itemkey.ts` 的消费面 **4 文件 24 处深度依赖**：
- `session-payment.ts` **12 处**（最深）
- `split-bill-payment.service.ts` **6 处**
- `payment.service.ts` **4 处**（**Task 36 已处理**）
- `payment.routes.ts` **2 处**（**Task 36 已处理**）

**Task 37（settlement gateway / derivePaidState）+ Task 38（actions / split-bill）实质已完成 4 文件 24 处中的 service 层 FK 化**——legacy-itemkey.ts 的退场范围在 Task 39-42 收尾后可重新评估。

## 工具陷阱经验（Phase G session 跨窗口学习）

**Smart quotes Edit 失败模式**（保留）：
- 失败触发：用户消息 / Write 工具 / Markdown 渲染时字符切换
- 正确路径：小 Edit 试一次 → 2 次 mismatch 切 Python readlines + 行号切片 + assert guard
- 何时直接走 Python：文件含大量中文 / 跨 > 10 行 / old_string 含 embedded code blocks

**规则 7 反向应用**（Phase G session 2 学习）：
- 不是所有问题都需要 CC 给倾向。**grep 事实 → CC 给；设计偏好 → Ian 给**。
- 拆分策略 / 决议优先级 / 风险权衡 = 设计偏好领域，CC 主动不给倾向（C5b GO 时事件）

**规则 8 例外书面化机制**（Phase G session 2 学习）：
- 例外不是"允许违规"，是"把违规实情和原因书面化，保留决策可追溯"
- 默认选项是"ask Ian whether to accept as-is or shrink"而不是"倾向 shrink"
- 实质性越界（C5b2 31% / Phase D 段 2b 27%）开例外声明 vs 正常波动（C6b1 3%）不开

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
- **D63**：derivePaidState 返回 `{ totalPaid, paidItems: FK[] }` 不是 `{ totalPaid, paidItemIds: string[] }`？（适用于 settlement/lib 域）

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
- 把用户的错误记忆当事实（grep 验证后拒绝背书）

## 重启后读的文件顺序

1. `RESUME.md`（本文件）—— 项目当前状态
2. `00-index.md` —— 全局规则 1-8 + **规则 8.1**（pending 清单强制）+ Phase 主表
3. `phase-d-repositories.md` —— Phase D 段 2a/2b（Task 16-22）+ Phase E 回填附录
4. `phase-d-repositories-part2.md` —— Phase D 段 2c（Task 23-26）+ Phase F 回填附录
5. `phase-e-agent-a.md` / `phase-e-agent-b.md` / `phase-e-agent-c.md` —— Phase E 三个 agent 工作包
6. `phase-f-platform-admin.md` —— Phase F 两个 task + 6 DP 决议 inline + frontend handoff
7. `phase-b-infrastructure.md`（Task 2 PlatformAuditLog schema + Task 8 afterCommit 机制）
8. `phase-g-session-order.md` —— Phase G 段 1 Task 32-33
9. `phase-g-session-cart-b2.md` —— Phase G 段 2 Task 34（D58 路径 X 5 条理由）
10. `phase-g-b2-checkpoint.md` —— Phase G 段 3 Task 35（7 场景 + tag 操作）
11. `phase-g-section-2-grep.md` work-log —— C2a 前置 grep 证据
12. `phase-g-payment-service.md` —— Phase G 段 4 Task 36（D59/D60/D61）
13. `phase-g-section-4-grep.md` work-log —— C4a 前置 grep 证据
14. `phase-g-handoff.md` work-log —— Phase G 启动输入（§5 4 决议 + Task 35 模板 + §6 grep + §7 D62 候选）
15. **`phase-g-section-5a-grep.md`** work-log —— Phase G 段 5 C5a 前置 grep（gateway.ts 137 行）
16. **`phase-g-settlement-gateway.md`** —— Phase G 段 5 Task 37 part 1（C5b1，gateway B2 主体 + **D63 决议** + handoff §2 补登记）
17. **`phase-g-settlement-gateway-part2.md`** —— Phase G 段 5 Task 37 part 2（C5b2，derivePaidState FK + 11 调用方原子切 + handoff §2 8 消除 + 规则 8 例外声明）
18. **`phase-g-section-6a-grep.md`** work-log —— Phase G 段 6 C6a 前置 grep（14 文件 / 29 itemKey / 29 JsonStore，含 7→6 actions 误统计）
19. **`phase-g-settlement-actions.md`** —— Phase G 段 6 Task 38 part 1（C6b1，actions 9 文件 + rules.ts + Task 38 ↔ Task 42 耦合声明 + C6a 数据修正登记）
20. **`phase-g-settlement-split-bill.md`** —— Phase G 段 6 Task 38 part 2（C6b2，split-bill 4 文件 B2 + 5 .split(':') 消除 + 28 JsonStore + manual capture lifecycle 独立声明）

# Phase 5 Resume — Context Handoff

Created: 2026-04-17, post-段 2b（new file, no prior version existed — grep-verified）

## 当前位置

**Phase E plan 完成**（批 2 第一弹）——Task 27/28/29 三个 agent-level 工作包 + 5 项 Phase D 回填补丁 + Phase B Task 8 `afterCommit` 机制补丁 + spec §9.6 事实修正全部落地。

Phase A-E plan 全部就绪，可启动实施或继续写 Phase F/G plan。

## 近期关键 commit

Phase E 收尾批次（2026-04-17 本 session 末尾 5 commit）：

- `6ee9e827` — plan: 00-index.md Phase E 行指向 3 个 agent 文件
- `79616685` — docs: spec §9.6 Agent A/B/C 文件列表事实修正（Phase E plan 发现 5 项错误/模糊）
- `2f51b8cb` — plan: Phase B Task 8 `afterCommit` 机制补丁（Agent A 决策点 D + Agent B 决策点 H 共用依赖）
- `1d77d3c9` — plan: Phase D 5 项回填补丁（menuRepo.listCategories / staffRepo.delete + 4 TimeEntry 方法 / roleRepo.findByName / printerRepo 新文件）

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

## 下一步 review 分级

**Phase F**（Stage 3b，platform admin 新建域）+ **Phase G**（Stage 3c，核心业务链含 B2 checkpoint）plan 写作。

- **Phase F**（2 task，Task 30-31）：全新文件 zero conflict，机械度高。按 Phase E 同样 agent-file 粒度 → 单 `phase-f-platform-admin.md` 一文件即可。可 L2 spot check。
- **Phase G**（11 task，Task 32-42，含 B2 checkpoint D50）：**整个项目最高风险区**——session-crud / order.service / **session-cart B2 重写** / payment / settlement gateway / split-bill / webhook / legacy-itemkey.ts 薄层全在此。B2 checkpoint 7 场景手动验证停点。需完整注意力——建议 Phase G 独占一个 session，不混写。

**策略建议**（下个 session 开始时让用户拍板）：

- 选项 A：先写 Phase F（轻量，~300-400 行），再开新 session 单独写 Phase G
- 选项 B：直接进 Phase A-D 实施，Phase F/G plan 后面再补
- 选项 C：Phase F plan + Phase A-D 实施同步推进

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
2. `00-index.md` —— 全局规则 1-8 + Phase 主表
3. `phase-d-repositories.md` —— Phase D 段 2a/2b（Task 16-22）+ **Phase E 回填附录（printerRepo）**
4. `phase-d-repositories-part2.md` —— Phase D 段 2c（Task 23-26，含 Phase E 事后回填 `findByName`）
5. `phase-e-agent-a.md` / `phase-e-agent-b.md` / `phase-e-agent-c.md` —— **Phase E 三个 agent 工作包**
6. `phase-b-infrastructure.md`（Task 8 小节）—— **afterCommit 机制补丁**（Phase E 决策点 D/H 共用依赖）
7. （按需）`phase-g-handoff.md` work-log —— 积攒的 Phase G 交接项

# Phase 5 Resume — Context Handoff

Created: 2026-04-17, post-段 2b（new file, no prior version existed — grep-verified）

## 当前位置

Phase D 段 2b 完成（Task 16-22）。下一步：段 2c（Task 23-26：roles / coupons / waitlist / platform-admin）。

## 近期关键 commit

- `4fdd6b6c` — spec: itemKey 模型修正（D55/D56/D57）+ §4.1 事实勘误 + §6.2 webhook 表格修正
- `976c492b` — plan: Phase D 各 task 反映 itemKey 修正（Task 2/17/19/20 + legacy-itemkey.ts 占位 + Phase G handoff）
- `08726fb6` — plan: 规则 7（evidence-first for "existing behavior" claims）
- `7422d545` — plan: 段 2b 落 Task 18-22（sessions / payments / split-bills / menu / staff）
- `9b31f525` — plan: 规则 8（transparent boundary breach）+ phase-d size exception（1523 行超 1200 软上限的明示例外）

## 下一步 review 分级

段 2c 四个 task 的 review 等级：

- **L1 细 verify（贴代码）**：Task 23 `roles.ts` 的 `resolveLicensedPermissions` helper——权限校验核心
- **L2 spot check（贴关键片段）**：Task 23 其他部分 / Task 26 platform-admin（bypass RLS 语义独特）
- **汇报摘要即可**：Task 24 coupons / Task 25 waitlist（CRUD 主力）

## Self-review checklist（CC 交付前自己答完）

- 规则 2：repo 层无 `emit(` 调用？
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
2. `00-index.md` —— 全局规则 1-8
3. `phase-d-repositories.md` —— 段 2c 的 task 列表和前置上下文
4. （按需）`phase-g-handoff.md` work-log —— 积攒的 Phase G 交接项

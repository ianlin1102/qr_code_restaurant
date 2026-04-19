# Phase 5 Resume — Context Handoff

Created: 2026-04-17, post-段 2b（new file, no prior version existed — grep-verified）
Updated: 2026-04-19, **Phase G plan 5/5 段全部完成**（Task 32-42 写作完毕,实施未启动）

## 当前位置

**Phase A-F plan 全部就绪 + Phase G plan 5/5 段全部完成**(批 2 写作完毕,实施阶段未启动):

- Phase E Task 27-29(3 个 agent-level 工作包,`phase-e-agent-{a,b,c}.md`)
- Phase F Task 30-31(platform admin,`phase-f-platform-admin.md`,含 6 DP 决议 inline)
- **Phase G 段 1** Task 32-33(`phase-g-session-order.md`,session-crud + order.service 迁移,含 11 emit → afterCommit)
- **Phase G 段 2** Task 34(`phase-g-session-cart-b2.md`,session-cart B2 重写 + **D58 路径 X 决议(5 条理由)**)
- **Phase G 段 3** Task 35(`phase-g-b2-checkpoint.md`,7 场景 a-g 双层结构 intent+concrete+failure+pass+tag)
- **Phase G 段 4 Task 36**(`phase-g-payment-service.md`,payment.service B2 + **D59/D60/D61 决议 inline** + D62 候选登记 handoff)
- **Phase G 段 5 Task 37**(C5b 拆分两文件):
  - `phase-g-settlement-gateway.md`(C5b1,gateway.ts B2 主体 + **D63 决议**)
  - `phase-g-settlement-gateway-part2.md`(C5b2,derivePaidState FK + 11 调用方原子切)
- **Phase G 段 5 Task 38**(C6b 拆分两文件,C6a 前置 grep):
  - `phase-g-settlement-actions.md`(C6b1,actions 9 文件 signature FK + rules.ts)
  - `phase-g-settlement-split-bill.md`(C6b2,split-bill 4 文件 B2 重构 + 5 .split(':') 消除)
- **Phase G 段 5 Task 39**(合并,Task 40 悬空):`phase-g-split-bill-routes.md`(routes 层 + handoff §2 最终 verify)
- **Phase G 段 5 Task 41**(`phase-g-webhook.md`,webhook B2 + **D62 决议**正式拍板候选 B + 5 verify markers 落实)
- **Phase G 段 5 Task 42**(`phase-g-session-payment-settlement.md`,session-payment + session-settlement B2 + C5b2 范围整合 + Task 38 ↔ 42 三方原子)

**Phase G 段 5 task 编号最终**:**3 task = 39 / 41 / 42**(Task 40 悬空,B.2 编号处理,锚点 scope-check work-log `20e69b30`)

- Phase D 累积回填(**20 项**):
  - 无条件 6 项:G1-1..G1-4(段 1)+ G2-1 + G2-2(段 2)
  - 段 4 新增 3 项:G4-1 / G4-2(Phase B schema 调整:Order.isPaid 去除)/ G4-3
  - 段 5 新增 2 项:G5-1(splitBillStore 死 import)/ G5-2(paymentRepo.derivePaidQuantityByOrderItem 候选已满足)
  - 段 6 新增 3 项:G6-1 / G6-2 / G6-3
  - 段 5 task 39 新增 1 项:G7-1(parseItemKey 已 handoff §1 设计,Task 36 实施期创建)
  - 段 5 task 41 新增 4 项:G7-2 / G7-3 / **G7-4 必需级**(`withTenantContextAndHooks` helper)/ G7-5(Phase B schema migration `@@index → @@unique` partial index)
  - 段 5 task 42 新增 2 项:**G7-6 必需级**(`paymentRepo.attachItems(paymentId, items, tx)` for confirmItemPayment FK)/ G7-7 候选(测试 fixture helper)
- Phase B Task 2 schema 回填(PlatformAuditLog)+ Task 8 afterCommit 机制
- spec §9.6 事实修正
- 规则 8.1(pending-commits 清单强制外化,主动防御)

**Phase G plan 写作完毕,后续是实施阶段**(本对话范围之外)。

## 近期关键 commit

**Phase G session 3 commit 链(2026-04-19,段 5 收尾)**:

- `<本收尾 SHA>` — docs: Phase G plan complete (5/5 segments, Task 39/41/42, D62/D63 formalized)
- `2ce408c5` — plan: Phase G Task 42 session-payment + session-settlement B2(491 行,confirmItemPayment 保留+FK+测试同步,三方原子声明)
- `6513f80b` — plan: Phase G Task 41 webhook B2 + **D62 决议**(候选 B 正式)+ 5 verify markers 落实(505 行)
- `bc8fcca3` — plan: Phase G Task 39 合并(Task 40 悬空)split-bill routes B2 适配(372 行)
- `cf035125` — plan: handoff D62 候选 B 落地依赖追加(Phase B schema migration 设计)
- `20e69b30` — plan: Phase G 段 5 范围校对(Task 39/40/41/42 剩余工作 grep,B 选项数据基础)

**Phase G session 2 commit 链(2026-04-18 至 2026-04-19,段 5 Task 37 + 段 6 Task 38 + 收尾)**:

- `f03487a4` — docs: Phase G Task 37-38 complete (sections 5-6, D63 decided)
- `be1681a6` — plan: Phase G C6b2 Task 38 part 2 split-bill B2 refactor(419 行)
- `e52342f5` — plan: Phase G C6b1 Task 38 part 1 settlement actions signature + rules(412 行)
- `70a2eaee` — plan: Phase G C6a Task 38 前置 grep(307 行)
- `f38c7a0f` — plan: Phase G C5b2 Task 37 part 2 derivePaidState FK(411 行,规则 8 例外书面化)
- `97361fc8` — plan: Phase G C5b1 Task 37 part 1 + **D63 决议**(368 行)
- `69203a8c` — plan: Phase G C5a Task 37 前置 grep(284 行)

**Phase G session 1 commit 链(2026-04-17 至 2026-04-18,段 1-3 + Task 36)**:见 git log,本文件不再展开。

## 下一步:Phase G 实施阶段起点

**Phase G plan 写作完毕**。下一阶段 = 实施(代码改动 + 测试 + commit + push)。本节是实施期入口,**优先级从高到低**。

### 1. 三方原子 commit 协调清单(实施期第一条)

**强制要求**(C6b1 + C6b2 + Task 42 三方 caller signature 对齐,见 C6b2 §4 + Task 42 §4):

C6b1 (actions paymentItems FK signature) + C6b2 (split-bill 域 service paymentItems FK) + Task 42 (session-payment / session-settlement signature FK) **必须同一 implementation commit land**。否则 typecheck unstable(actions 调 split-bill / session.service 函数 signature mismatch)。

**Task 39 routes 跟进**:三方 land 后,routes 改造可独立 land。
**Task 41 webhook 独立**:无 itemKey signature 依赖,任意时机 land(D62 schema migration + helper 自足)。

### 2. Phase A-1 EC2 备份(必须首项)

- 按 `phase-a-backup.md` 执行 1a/1b/1c
- **必须在 Phase B 动手前完成**——无回滚点不可动 schema

### 3. Phase B 基础设施 + schema migration

- Phase B Task 2-10(详见 `phase-b-infrastructure.md`)
- **D62 候选 B 落地依赖**:Phase B Task 2 schema 增量 migration `2026XXXXXXXX_payment_stripe_unique`(`@@index → @@unique` partial index `WHERE stripePaymentIntentId IS NOT NULL`)—— 详 handoff §"D62 候选 B 落地依赖" + Task 41 plan §3
- **Order.isPaid 字段去除**(G4-2,Phase B Task 2 schema 调整)

### 4. Phase D 回填 20 项(Phase G 实施期前置,集中 land)

**必需级(必须建立)**:
- **G7-4** `withTenantContextAndHooks(storeId, async (tx, registerAfterCommit) => {...})` helper —— Task 41 webhook 依赖(`withTenantContext` 当前 signature 不接 hook 注册接口)
- **G7-6** `paymentRepo.attachItems(paymentId, paymentItems, tx)` —— Task 42 confirmItemPayment FK 切换依赖
- **G4-2** `Order.isPaid` 去除 + Phase B schema 调整 + B2 后由 `status='pending'` 派生

**候选级(实施期 verify 是否已满足)**:
- 无条件 6 项 + 段 4/5/6 候选(详上方"当前位置"清单)

### 5. D58/D59/D60/D61/D62/D63 Ian 决议锚点(实施期必读)

- **D58 路径 X**(段 2 plan §5.2,5 条理由):pay-first submit 不删 draft,webhook 转 submitted
- **D59 PaymentIntent.metadata = pointer**(段 4 plan §6):metadata 存 `{draftId, version}`,不存 cartData
- **D60 R-X1 webhook 校验 + refund**(段 4 plan §6):mismatch → `OPTIMISTIC_LOCK_CONFLICT` → refund + alert
- **D61 payment 域 itemKey 薄层**(段 4 plan §6):controller 边界严格,service 层全 FK
- **D62 webhook 幂等**(Task 41 plan §3,5 条理由,**正式决议候选 B**):`Payment.stripePaymentIntentId UNIQUE` + DB 层冲突幂等
- **D63 derivePaidState FK 签名**(Task 37 part 1 §5,5 条理由):`{ totalPaid, paidItemIds: string[] }` → `{ totalPaid, paidItems: { orderItemId, paidQty }[] }`

### 6. Task 38 ↔ Task 42 deploy 协调要求

6 actions(add-payment / cash-payment / close-session / pay-items / pay-percent / reopen-session)依赖 session.service 函数 signature。Task 42 改 signature → actions 同轮 deploy(原子 commit)。详 C6b1 §4.1。

### 7. B2 checkpoint tag

段 3 plan `phase-g-b2-checkpoint.md` 末尾 tag 操作步骤。Phase G 实施完成后 7 场景全 pass 打 `phase5-b2-checkpoint`。破坏性操作前可 `git reset --hard phase5-b2-checkpoint` 退回。

### 8. Phase F 实施依赖

- DP-PF-1 跨 Agent D 边界改共享 `auth.middleware.ts` —— 实施期必须 Ian 亲批
- DP-PF-4 / F-2 的 Phase B Task 4 RLS migration 必须显式不为 `platform_audit_log` 加 RLS
- DP-PF-3 方案 A 的 frontend handoff —— Phase F 只做 backend

## 对 3d 决议的认知更新(Phase G session 1 修正,保留供实施期参考)

`legacy-itemkey.ts` 真实分布 **4 文件 24 处深度依赖**(`session-payment.ts` 12 / `split-bill-payment.service.ts` 6 / `payment.service.ts` 4 / `payment.routes.ts` 2)。

Task 36(payment.service + payment.routes)+ Task 37(settlement gateway + derivePaidState)+ Task 38(actions + split-bill)+ Task 42(session-payment + session-settlement)实质完成 4 文件 24 处中的 service 层 FK 化。`legacy-itemkey.ts` 的退场范围在 Phase G 实施完成 + 后续 cleanup phase 评估。

## 工具陷阱经验(跨窗口学习)

**Smart quotes Edit 失败模式**:小 Edit 试一次 → 2 次 mismatch 切 Python readlines + 行号切片 + assert guard。文件含大量中文 / 跨 > 10 行 / old_string 含 embedded code blocks → 直接 Python。

**规则 7 反向应用**(Phase G session 2):grep 事实 → CC 给倾向;设计偏好 → Ian 给。拆分策略 / 决议优先级 / 风险权衡 = 设计偏好,CC 主动不给倾向。

**规则 8 例外书面化机制**(Phase G session 2):例外不是允许违规,是把违规实情书面化。默认是 ask Ian accept as-is vs shrink。实质性越界(C5b2 31% / Phase D 段 2b 27%)开例外声明,正常波动(C6b1 3% / Task 41 1%)不开。

**Task 编号悬空诚实标记**(Phase G session 3,B.2 处理):Task 39+40 合并到 Task 39,Task 40 悬空。编号跳跃(39 → 41)比假装连续更诚实,锚点指向 scope-check work-log `20e69b30`。

## Self-review checklist(CC 交付前自己答完)

- 规则 2:repo 层无 `emit(` 调用?emit 通过 `res.locals.afterCommit` 在 tx commit 后发?
- 规则 3:写操作参数类型是 `Db` 还是窄化为 `Prisma.TransactionClient`?多步写必须窄化。
- 规则 7:任何 "existing behavior" 声明带 grep 证据?
- 规则 8:本次产出有任何超限/越界?如有必须明示。
- D23:返回类型用 DraftXxx / SubmittedXxx narrow?(适用于 Order 相关)
- D24:findSubmitted 默认排除 draft?(适用于 Order 相关)
- D55:多步写签名是 TransactionClient 不是 Db?
- D56:Payment/SplitBill 用 FK 模型不是字符串 itemKey?
- D57:OrderItem 相关代码用 position 列 + @@unique 约束?
- **D62**:webhook handler 入口 `paymentRepo.findByStripeId` 幂等检查 + P2002 catch?(适用于 webhook 域)
- **D63**:derivePaidState 返回 `{ totalPaid, paidItems: FK[] }` 不是 `{ totalPaid, paidItemIds: string[] }`?(适用于 settlement/lib 域)

## 用户协作规则

- 用户说"继续"时显式问状态 A(休息过了)/ B(想用完当前 session)/ C(新 session 刚开始)
- 疲劳信号:用户主语从"我觉得..."变成"按你的意思"、或只说"确认" → 主动建议暂停
- 每个 Max 周期结束自然暂停,不追赶 task 数量进度
- 用户是业余时间做这个项目,没有 deadline,**可持续 > 速度**

## 绝对不能做

- 在没用户明确批准的情况下实施 Task
- 合并跨层 commit(spec 决策 / plan 计划 / 代码实施 三层分开)
- 对 factual claim 不贴 grep 证据就进 spec 或 plan(规则 7)
- 违规时自行合理化"反正没出事"(规则 8)——先暂停汇报
- 把用户的错误记忆当事实(grep 验证后拒绝背书)

## 重启后读的文件顺序

1. `RESUME.md`(本文件)—— 项目当前状态
2. `00-index.md` —— 全局规则 1-8 + 规则 8.1 + Phase 主表
3. `phase-d-repositories.md` —— Phase D 段 2a/2b(Task 16-22)+ Phase E 回填附录
4. `phase-d-repositories-part2.md` —— Phase D 段 2c(Task 23-26)+ Phase F 回填附录
5. `phase-e-agent-a.md` / `phase-e-agent-b.md` / `phase-e-agent-c.md` —— Phase E 三个 agent 工作包
6. `phase-f-platform-admin.md` —— Phase F 两个 task + 6 DP 决议 inline + frontend handoff
7. `phase-b-infrastructure.md`(Task 2 PlatformAuditLog + Task 8 afterCommit + line 1043+ tenantAwareRoute / platformAwareRoute)
8. `phase-g-session-order.md` —— Phase G 段 1 Task 32-33
9. `phase-g-session-cart-b2.md` —— Phase G 段 2 Task 34(D58 路径 X)
10. `phase-g-b2-checkpoint.md` —— Phase G 段 3 Task 35(7 场景 + tag)
11. `phase-g-payment-service.md` —— Phase G 段 4 Task 36(D59/D60/D61)
12. `phase-g-handoff.md` work-log —— Phase G 启动输入(§5 4 决议 + Task 35 模板 + §6 grep + §7 D62 候选 + 2026-04-19 D62 落地依赖追加)
13. `phase-g-settlement-gateway.md` —— Phase G 段 5 Task 37 part 1(C5b1,**D63 决议**)
14. `phase-g-settlement-gateway-part2.md` —— Phase G 段 5 Task 37 part 2(C5b2,derivePaidState FK)
15. `phase-g-settlement-actions.md` —— Phase G 段 5 Task 38 part 1(C6b1,actions + rules)
16. `phase-g-settlement-split-bill.md` —— Phase G 段 5 Task 38 part 2(C6b2,split-bill 4 文件)
17. **`phase-g-split-bill-routes.md`** —— Phase G 段 5 Task 39(合并,Task 40 悬空,routes 层)
18. **`phase-g-webhook.md`** —— Phase G 段 5 Task 41(webhook B2 + **D62 决议**)
19. **`phase-g-session-payment-settlement.md`** —— Phase G 段 5 Task 42(段 5 末尾 + 三方原子 commit 协调声明)
20. work-logs(C5a / C6a / C2a / C4a / segment-5-scope-check):前置 grep 证据,实施期复核用

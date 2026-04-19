# Phase G 三方原子 commit SOP

> **文档定位**:这是 SOP(操作手册),不是 plan
> **读者**:Phase G 实施期的 CC(或 Ian 手动执行)
> **使用方式**:照执行,不再 consolidate;实施期遇到 SOP 未覆盖的边界 → 规则 8 汇报
> **关联文档**:
> - `RESUME.md` §"下一步:Phase G 实施阶段起点" §1(三方原子 commit 协调清单)
> - `phase-g-settlement-actions.md` §4.1 / `phase-g-settlement-split-bill.md` §4 / `phase-g-session-payment-settlement.md` §4(三方协调声明三处)
> - `phase-g-webhook.md` §3(Task 41 独立性)/ `phase-g-split-bill-routes.md` §2(Task 39 跟进)

**核心约束**:`C6b1`(actions FK)+ `C6b2`(split-bill FK)+ `Task 42`(session-payment/settlement FK)**必须同一 implementation commit land**。否则 typecheck unstable(actions 调 split-bill / session.service 函数 signature mismatch)。

---

## 1. 文档定位

(见上方 quote 块。)

---

## 2. 预备阶段前置检查清单

**必须先完成,否则不能启动三方 staging**:

- [ ] **Phase A-1** EC2 备份完成(1a/1b/1c,见 `phase-a-backup.md`)
- [ ] **Phase B schema** 完成,含:
  - [ ] **G4-2**:`Order.isPaid` 字段去除(Phase B Task 2 schema 调整)
  - [ ] **G7-5**:`Payment.stripePaymentIntentId` 从 `@@index` 改 `@@unique` partial index `WHERE stripePaymentIntentId IS NOT NULL`(D62 候选 B 落地依赖,见 handoff §"D62 候选 B 落地依赖")
- [ ] **Phase D 必需级回填**完成:
  - [ ] **G7-4**:`withTenantContextAndHooks(storeId, async (tx, registerAfterCommit) => {...})` helper(Phase B Task 8 扩展,Task 41 webhook 依赖)
  - [ ] **G7-6**:`paymentRepo.attachItems(paymentId, paymentItems, tx)`(Task 42 confirmItemPayment FK 切换依赖)
- [ ] **Phase G 段 3** B2 Checkpoint 7 场景全 pass + tag `phase5-b2-checkpoint` 已打
- [ ] **Task 36**(`payment.service.ts` B2)已 land(早于三方,independent commit)
- [ ] **Task 37 part 1 + part 2**(`settlement/gateway.ts` B2 + `derivePaidState` FK + 11 调用方原子切)已 land(早于三方,Task 42 caller 依赖 derivePaidState FK signature)

**失败处理**:任何前置项未完成 → **不启动三方 staging**,先完成前置。

---

## 3. Staging 顺序 + Verify 命令

### Stage 1:三方各自本地实施

**推荐顺序**(规则 7 反向:CC 列顺序不给硬推荐,Ian 实施期可调):

1. **C6b1** actions(9 文件 signature FK + rules.ts)—— 改动较小,被调方先就位
2. **C6b2** split-bill(4 文件 service FK + 28 JsonStore + 5 .split(':') 消除)—— signature 传染中游
3. **Task 42** session-payment / session-settlement(13 + 10 JsonStore + itemKey FK + C5b2 scope 整合)—— caller 收尾

### Stage 2:三方代码全 staged 后基本 verify

```bash
cd server
pnpm tsc -b                   # 全项目 typecheck,期望 0 新增 error
pnpm test                     # 全测试,基线对比(Phase H 修复前部分红预期内)
```

**0 新增 error 才算通过**——若有 new error,跳 §5 Case A。

### Stage 3:grep 证据命令(实施期 CC 填具体 pattern)

**目标 1:`.split(':')` 在 service 域 0 残留**

```bash
grep -rn "split(':')" server/src/settlement server/src/lib/session-state.ts \
  server/src/controllers/{session-settlement,session-payment,split-bill-invalidation}.ts
# 期望:0 命中(C6b2/Task 42 完成后)
```

**目标 2:`paidItemIds` string[] 签名残留 0**

```bash
grep -rn "paidItemIds" server/src/
# 期望:0 命中(D63 落地后,全消费方切 paidItems FK)
```

**目标 3:legacy itemKey signature 仅在 controller 边界**

```bash
grep -nE "itemKeys?\s*:\s*string\[\]" server/src/controllers/*.ts \
  server/src/settlement/**/*.ts server/src/lib/session-state.ts
# 期望:0 命中 service 层(D61 落地);controller 边界保留 parseItemKey 入口
```

**目标 4:Task 38 ↔ Task 42 6 actions caller signature 对齐**

```bash
grep -nE "addPayment|recordCashPayment|payByItems|payByPercent" server/src/settlement/actions/*.ts
# 验证 6 actions 调用 paymentItems FK signature(C6b1 §2 + Task 42 §2 一致)
```

---

## 4. Commit message 模板

**对齐 Phase G precedent**(`git log --grep='phase-g'` 学到的风格):
- subject 前缀 `feat(phase-5):` (本 commit 是 implementation,不是 plan)
- body 用 bullet list(或 1./2./3.)列 coverage,按 Phase G precedent 自选
- footer `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`

**模板**:

```
feat(phase-5): atomic three-party B2 commit (C6b1 + C6b2 + Task 42)

三方对象:
- C6b1: settlement actions 9 files + rules.ts signature FK
  (paymentItems: { orderItemId, quantity }[] 替换 itemKeys: string[])
- C6b2: split-bill 4 files B2 refactor + .split(':') 5 处消除
  (split-bill.service / split-bill-invalidation / split-bill-summary
   / split-bill-payment.service)
- Task 42: session-payment + session-settlement B2
  (13 + 10 JsonStore -> Prisma async + tx + C5b2 scope 整合)

协调原因:6 actions 依赖 session.service signatures
(addPayment / recordCashPayment / closeSession / payByItems /
 payByPercent / reopenSession),独立 land 破坏 typecheck

Phase G tasks: 38 part1 + 38 part2 + 42
Decisions: D56 D58 D61 D63
Plan refs: phase-g-settlement-actions.md / phase-g-settlement-split-bill.md
           / phase-g-session-payment-settlement.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

(措辞自选,骨架必含:三方对象 / 协调原因 / Phase G tasks / Decisions / footer。)

---

## 5. Failure rollback 策略

### Case A:Stage 2 typecheck 失败

**处理流程**:
1. **不 commit**,grep 定位新 error 来源
2. **判断分类**:
   - **Scope miss**(漏改某文件)→ 补改落入对应 task,重新 verify
   - **Signature 对齐错误**(三方各自理解不一致)→ 回 Phase G plan cross-reference,修正后重新 verify
3. **触发规则 8**:scope miss 跨出 Phase G plan 声明范围(plan 内未提及的文件需要改造)→ **暂停汇报**,不自行扩散

### Case B:Stage 2 `pnpm test` 新红

**对比预期红 list**(Phase H Task 44 baseline):
- **预期红**(B2/FK/schema 改动自然不兼容的老断言)→ 记入 Phase H Task 44 baseline,Task 44 按 D51 判定等价/加强/弱化处理
- **非预期红**(regression / scope miss / signature 错误)→ 按 Case A 处理
- **baseline 来源**:本次 Phase G 实施期跑出的红 list 即 Phase H Task 44 baseline(baseline 在 Phase G 实施期建立,非 Phase H 实施期)

### Case C:Commit 已 land 后发现 issue

**不 revert**(破坏 commit history),**新 commit fix 补丁**:
```
feat(phase-5): fix three-party land issue - <one-line desc>

补丁 commit <three-party SHA>: <issue description>
```
**例外**:仅安全问题(凭据泄漏)/ 数据破坏路径 才 revert。

### Case D:跨 session 中断(实施半途)

**本地 staging 未 commit**(临时分支 + WIP commit + push,git 标准路径):
```bash
git checkout -b work-in-progress/phase-g-three-way
git add -A && git commit -m "WIP: phase-g three-way staging"
git push origin work-in-progress/phase-g-three-way
```

**下 session 恢复**:
```bash
git fetch origin work-in-progress/phase-g-three-way
git checkout work-in-progress/phase-g-three-way
git reset HEAD~1                                                # 撤销 WIP commit, 恢复 staging
```

**⚠️ 关键**:若必须跨 session,**MUST 先 push 到远端 work-in-progress 分支**——不允许仅靠 local stash 跨 session(stash 丢失风险)。一次 session 完成 staging 是首选,跨 session 必须远端备份。

---

## 6. Task 41 webhook + Task 39 routes 独立性

### Task 41 webhook(独立 task)

- **无 signature 依赖三方**(D62 候选 B 自足)
- **Land 时机**:三方前 / 中 / 后任意
- **前置**:G7-4 `withTenantContextAndHooks` helper + G7-5 schema unique
- **独立 verify**:webhook 5 测试 case 全绿(`__tests__/webhook.test.ts`,Task 41 §5)+ D62 P2002 catch 覆盖

### Task 39 split-bill routes(三方后 follow-up)

- **依赖 C6b2** split-bill service signature(三方一部分)
- **Land 时机**:三方完成后(routes 调用 service signature 已稳定)
- **单独 commit**,无需和三方原子
- **commit message**:`feat(phase-5): Task 39 - split-bill routes B2 follow-up to three-party`

---

## 7. 执行 checklist 汇总

(供实施期 CC 快速对照,Phase G 实施期分段)

- [ ] **Stage 0** 前置(§2 清单全绿)
- [ ] **Stage 1** Task 36 land(早于三方)
- [ ] **Stage 2** Task 37 part 1 + part 2 land(早于三方)
- [ ] **Stage 3** 三方 staging(§3 Stage 1 顺序,可调)
- [ ] **Stage 4** 三方 verify(§3 Stage 2 + Stage 3 命令全绿)
- [ ] **Stage 5** 三方原子 commit(§4 message 模板)
- [ ] **Stage 6** Task 39 routes follow-up(三方后)
- [ ] **Stage 7** Task 41 webhook(独立时机,前置 G7-4 + G7-5)

---

**End of Phase G atomic commit SOP.**

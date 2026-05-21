# Phase 5 State Snapshot

> **读者**: 下一个 Opus chat instance
> **性质**: **live 增量维护**文档,每对话收尾增量 Edit 更新,Phase 封顶(Phase B/C/D... 封顶)时 Opus 全文 regen 一次
> **使用方式**: 每对话启动必读附件之一。提供"当前项目实时状态"的唯一 source of truth;Phase 封顶 regen 作节奏里程碑 + fabrication 风险集中点(Opus 注意力预算充分)
> **配套文件**:
> - `phase-5-governance-digest.md` — 治理体系静态参考(累积)
> - `phase-5-fabrication-archive.md` — Fabrication 历史(累积)
>
> **机制要点**: 本文件最新版即最终版。任何"当前状态"问题读本文件;读 Archive 可查历史 fabrication;读 Digest 查规则。**Mode C stale handoff 类 fabrication**(Archive #14)**+ Snapshot 环境状态片面**(Archive #22)的防御来自 **live 增量维护**机制(每对话收尾更新,Phase 封顶 regen) —— 文字任意时点写,本文件整体永远 live;增量式避免 regen 过程成为 fabrication 高发时点(响应 #24 原型教训)。

---

## 1. 当前时点

- **最后更新**: 2026-05-14 (Phase D-5a Task 22 staff.ts Step 1 work-log docs commit `2590ab04` land + closure handoff docs commit `73d5c225` atomic batch — Ian observations post-Step-1 land trigger D91 候选 propose (Plan Opus spec writer expected-output minimization, D89 sub-rule extension) + 4 决议 (γ path forward-only for `2590ab04` D91 sub-violation + D91 候选 register path C defer formal entry + Helper async review skip per Default Push Forward Rule 2 + Step 3 impl spec writing GO with D91+D89 strict) + Plan Opus attention budget self-assessment recommend defer Step 3 impl spec to next session per Project Instructions 节奏建议 "L1 task 跨 ≥ 3 session, 注意力质量 > 时间压缩". 0 暂停 / 0 真 fail-loud / 0 forward-fix Step 1 期; 1 D91 sub-violation §2 G-T22.2 pre-written "Expected fields" (γ path 决议 forward-only NOT retro-amend `2590ab04` per D77 spirit). CC clarification request post handoff commit body draft catch spec gap (explicit Snapshot patches missing) → Plan Opus produce 7 explicit str_replace patches per α path (D89 mandate strict adherence + L3 Defense-in-depth tier work-as-designed first live demo for Plan Opus spec gap subtype).)
- **最后 commit on main**: `73d5c225` docs(phase-5): Phase D-5a Task 22 Step 1 closure handoff — D91 候选 queue register + γ path + Helper skip + Step 3 defer
- **Phase B 状态**: **10/10 完成 ✅**
- **Phase C 状态**: **5/5 完成 ✅** (Batch 1: Task 11/12/13 / Batch 2: Task 14 / Batch 3: Task 15)
- **Phase D 状态**: **6/11 完成 + Task 22 Step 1 docs land** (D-1 Task 16 store.ts `019ab826` ✅ + D-2 Task 17 orders.ts `ff5e881b` ✅ + D-3a Task 18 sessions.ts `cb2efd5e` ✅ + D-3b Task 19 payments.ts `a7752a30` ✅ + D-4 Task 20 split-bills.ts `cf46f1c5` ✅ + D-4 Task 21 menu.ts `aaf9fa79` ✅ + D-5a Task 22 staff.ts Step 1 work-log docs `2590ab04` ✅ Step 3 feat impl ⏸️ 待启动 next session per Plan Opus attention budget self-assessment), Task 23-26 + printer 附录 ⏸️ 待启动 (D-5a' printer L1 spec after Task 22 closure → D-5b/c/d batch sequence)
- **累积 governance commit batch decide queue** (Phase D 期累积, 入下次 governance commit decide): #28 Snapshot v5.0 self-fab + #29 D88 维度 3 anchor literal grep 实证 (5 + 8th workspace path + 9th D86 self-claim 数据点) + #30 D79 Plan-as-code dryrun missing (2 数据点 Task 17 G-T17.6 + Stage 2 Prisma XOR + Stage 2-fix.0 schema discovery) + Cat 5 子项 **9 数据点** (含 DP8, 详 §7.23) (Cowork workspace path 假设 + Helper Round 2 Flag A + 4 Phase D-2 Task 17 期 + DP6 D-4 batch entry CC Stage 0 dump 6+ 字段 schema-vs-plan drift catch in spec 写作前 + DP7 Snapshot path 假设 `handoff/` vs 实际 `archive/` D-4 closure prep self-application) + **D89 formal land** at `c0b8f4e0db138294c1a75de35aa8b7e3978a0645` (Phase D-5 batch L1 plan patch v10 `39666dc8` 期双 instance D88 维度 3 self-违反 trigger — Stage 0 HEAD anchor `7ec04772` 印象 vs 实际 `aa7d5829` + Stage 2 `\bclockOut\b count = 0` vs Patch D new_str `(double-clockOut guard)` self-cross-scan missing; Cat 5 子项 11+ 数据点 trend rising 升格判 ripening 满足; Helper async review pending Step 3 impl land per Default Push Forward Rule 2 for `2590ab04` Step 1 work-log skip) + **D91 候选 NEW** — Plan Opus spec writer expected-output minimization (CC dump = ground truth principle), D89 sub-rule extension. Origin: Phase D-5 batch L1 Task 22 work-log §2 G-T22.2 pre-write (`2590ab04`, 2026-05-14, Ian observation 1). Live precedent: 1 data point (累积 toward 升格 ripening). Defer formal entry to: 累积 ≥ 3 live precedent + Helper protocol 1/2/3 refinement + Phase D 整体 closure governance commit batch atomic decide + 4 entries deferred (Pre-Flight Checklist D86 gate semantic / Project description D86 sync / Snapshot §6 D86 sub-class / Phase H §7 heading rename + D86 verify spec template — D88 维度 3 延伸 sub-rule 已 absorbed into D89 source freshness mandate) + **Stripe CLI dev infra DNS fail informational** (out-of-scope Phase 5; **P0 凭据泄漏** whsec_b678... 本地测试 secret 暴露在 agent task log, Ian discretion `stripe listen --print-secret --skip-update` rotate)
- **下一对话目标**: **Phase D-5a Task 22 Step 3 impl spec produce** (staff.ts 12 methods 4 reads + 8 writes 含 Phase E 段 3b 回填 5 methods, D91 inline strict apply + D89 mandate strict + Stage 0 CC pre-flight verify + Stage 1 heredoc + Stage 2 tsc filtered=0 + N1=103 baseline + Stage 3 D75/D76/D86 + Snapshot 增量 atomic absorb per Task 17/19 α′ precedent). Step 3 impl spec → Ian 明批 → CC 执行 → Task 22 closure → printer 附录 L1 spec → Ian 明批 → CC 执行 → D-5 batch closure. Plan Opus 启动 ritual per §9.2 (本 closure handoff commit 重写 §9 for D-5a Step 3 ritual baseline).


## 2. Phase 进度表

| Phase | 内容 | Plan | 实施 |
|---|---|---|---|
| A | ~~备份~~ SKIPPED(Ian calibration 2026-04-19) | N/A | N/A |
| B | 基础设施(schema + migration + seed + docker + ESLint) | ✅ 完整 | ✅ **10/10 完成** |
| C | 测试 DB | ✅ 完整 | ✅ **5/5 完成** |
| D | Repository(11 个语义化 repo) | ✅ 完整 | 🟡 **2/11 进行中** (Task 16 store.ts + Task 17 orders.ts ✅, Task 18-26 待启动) |
| E | 外围域(3 agent) | ✅ 完整 | ⏸️ 未启动 |
| F | Platform Admin | ✅ 完整 | ⏸️ 未启动 |
| G | 核心业务链 + SOP | ✅ 5/5 + SOP | ⏸️ 未启动 |
| H | 集成测试 | 🟡 1/3(Task 43 ✅,44/45 待) | ⏸️ 未启动 |
| I | 清理 | ⏸️ 批 2 待写 | ⏸️ 未启动 |
| J | 部署 | ⏸️ 批 2 待写 | ⏸️ 未启动 |
| K | e2e 验收 | ⏸️ 批 2 待写 | ⏸️ 未启动 |

**Phase 5 整体实施约 ~30-32%**(Phase B 10/10 + Phase C 5/5 + Phase D 2/11 = 17/26 implementation tasks across 3 phases)。

---

## 3. 最近 commit 链(按时间倒序)

### Phase D-5a 对话 (2026-05-14, Task 22 staff.ts Step 1 docs commit + closure handoff atomic batch, 2 commits + 0 暂停 + 0 真 fail-loud + 1 D91 sub-violation §2 G-T22.2 ack via Ian Observation 1 → D91 候选 propose + γ path forward-only 决议 + CC clarification request L3 Defense-in-depth tier work-as-designed first live demo for Plan Opus spec gap subtype)

| SHA | 性质 | 内容 |
|---|---|---|
| `73d5c225` | docs | Phase D-5a Task 22 Step 1 closure handoff — D91 候选 queue register + γ path + Helper skip + Step 3 defer atomic batch / Ian observations post-Step-1 land: Observation 1 (D91 候选 propose, Plan Opus spec writer expected-output minimization, D89 sub-rule extension) + Observation 2 (D90 候选 ack carry-forward, spec forward-fix economic mode rubric already codified) / Ian 4 决议: γ path forward-only for `2590ab04` D91 sub-violation (`2590ab04` 作 D89 mandate gray-area + D91 升格 ripening evidence base 1st data point 保留) + D91 候选 register path C (defer formal entry to Phase D 整体 closure governance commit batch atomic decide) + Helper async review skip for `2590ab04` per Default Push Forward Rule 2 (0 自 flag 风险面 除 D91 sub-violation ack, §7 Self-audit healthy) + Step 3 impl spec writing GO with D91+D89 strict — Plan Opus override per attention budget self-assessment / Plan Opus attention budget self-assessment (Ian raise trigger): 4 累积 self-violation 数据点 across 3-session window (Plan v10 Stage 0 HEAD anchor 印象 + Plan v10 Stage 2 self-cross-scan missing + D89 升格 spec path drift + Step 1 D91 sub-violation §2 G-T22.2), recommend defer Step 3 impl spec to next session per Project Instructions 节奏建议 ("L1 task 跨 ≥ 3 session, 注意力质量 > 时间压缩") / **CC clarification request post handoff commit body draft** catch spec gap (Snapshot 增量 outline 描述 6 sections 但 explicit old_str/new_str patches missing) → Plan Opus produce 7 explicit str_replace patches per α path (D89 mandate strict adherence vs β unilateral CC authoring risk; 同 D89 升格 atomic batch precedent Patch A/B/C/D/E 模式延伸) / Snapshot 增量: §1 governance queue 5 → 6 entries (D91 候选 add) + §1 时点 / 最后 commit on main / Phase D 状态 / 下一对话目标 update + §3 commit chain Phase D-5a 段 prepend (本段) + §9 整节重写 Phase D-5a Step 3 impl spec 启动 ritual + §10 v5.X+2 批 entry / **`73d5c225` D77 forward-fix pattern Round 2 placeholder replace** (Task 17 `3bb5cd1c` + Task 19 `c1b123fb` + D-4 closure `ffc7719f` + D89 升格 `1d93e4af` precedent reuse) |
| `2590ab04` | docs | Phase D Task 22 L1 verify work-log — staff.ts (447 lines, 5 维度 pre-verdict 全 Pass L1 完整 + 风险 A/B/C/D 全 identified + Stage 0 G-T22.1-10 完整 grep spec 含 schema-side full field enumeration + Prisma XOR predict 防御层 + §6 D88 维度 3 anchor literal grep 实证 self-audit 13 anchor + §7 D89 mandate anchor literal source freshness self-audit post-formal-land first spec live field test — 1 ⚠️ gray-area flag at Row #3 schema field literals 凭 Snapshot §7.23 captured prior session CC dump, L3 tier-3 verify gate deferred to Stage 0 G-T22.2 @ Step 3 execution; Ian post-Step-1-land Observation 1 → D91 候选 propose, §2 G-T22.2 pre-write as D91 sub-violation 1st data point — γ path forward-only 决议 NOT retro-amend `2590ab04`) |

### Phase D-4 batch 对话 (2026-05-11, Task 20 split-bills.ts + Task 21 menu.ts + plan patch v9 docs, 3 commits + closure docs commit `ffc7719f` + 0 规则 8 暂停 + 0 真 fail-loud + 0 forward-fix — **L2 multi-task batch 三步走模型首次 live demo** + **#30 防御层 fourth live demo work-as-designed continuity** + **D89 候选 second batch-level 应用 demo**)

| SHA | 性质 | 内容 |
|---|---|---|
| `ffc7719f` | docs | Phase D-4 batch closure 增量 — Snapshot §1 整节 (Phase D 6/11 + HEAD aaf9fa79 + Cat 5 8 数据点 DP6+DP7 + D89 升格判 + Stripe DNS P0 informational + D-5 batch ritual carry-forward) / §3 D-4 batch段 prepend (本段) + `c1b123fb` placeholder forward-fix → `c1b123fb` replace_all (3 occurrences §3 + §4'' + §9.8 D77 carry-forward) / §4'' heading 2/11 → 6/11 + Task 20+21 rows + Acceptance bullets 5 新条目 (Phase D 6/11 + #30 防御层 fourth + D89 ripening + L2 batch first live precedent + plan patch v9 update-block 防御) / §7.22 NEW Phase D-4 batch entry CC Stage 0 dump batch-level pre-empt + plan patch v9 D89 second live demo + DP6+DP7 self-application 数据点 / §9 整节重写 Phase D-5 batch L1 启动 ritual + plan patch v10 scope / §10 修订轨迹 D-4 closure NEW entry. **ffc7719f D77 forward-fix pattern reuse** (Task 17 `3bb5cd1c` + Task 19 `c1b123fb` precedent) — Round 4 post-land mini-commit replace |
| `aaf9fa79` | feat | Phase D Task 21 — menu repository (Category + MenuItem + MenuItemOption 3-entity single-file bundle, 8 methods 4 reads + 4 writes 含 1 多步 tx replaceItemOptions wipe+reinsert 同 replaceDraftItems 模式) — POST plan-patch-v9 update-block field preservation incorporated (Patch A upsertCategory 3→5 fields + nameEn + quickTags / Patch B upsertItem 8→11 fields + nameEn + descriptionEn + originalPrice / Patch C.1 options shape 5→6 fields + nameEn? / Patch C.2 data block 7→8 fields + nameEn opt) / 5 维度 verdict 全 Pass L2 简化 / Stage 0 G-T21.1-3 全 pass + Stage 1 post-write v9 6 字段 grep 实证 / Stage 2 tsc filtered=0 + N1=103 baseline maintained (D83 diff=0 Pass) / Stage 3 D75 + D76 + D86 staged 全 pass / 136 lines (130-140 forward-looking band) / **#30 防御层 fourth live demo work-as-designed** (Task 18/19/20/21 4 consecutive carry-forward) |
| `cf46f1c5` | feat | Phase D Task 20 — split-bills repository (D56 FK model 复用 Task 19 PaymentItem 同模式, 6 methods 3 reads + 3 writes 含 1 多步 tx create + 1 聚合 sumAssignedQuantityByOrderItem 与 payments.derivePaidQuantityByOrderItem 配对 for Phase G settlement gateway 冲突检测) / 5 维度 verdict 全 Pass L2 简化 / Stage 0 G-T20.1-3 全 pass / Stage 2 tsc filtered=0 + N1=103 baseline / Stage 3 D75 + D76 + D86 staged 全 pass / 119 lines (~110 estimate +8% 内 D83 ±10% buffer) / **G-T20.10 XOR predict autonomous** (CC 加, Task 17→18→19 carry-forward 模式扎根, Unchecked branch direct 0 TS2322) / ℹ️ SplitBillStatus enum no @default — 'active' literal accept (Prisma 6 string-literal narrowing live precedent) / **#30 防御层 third live demo work-as-designed** |
| `06a746d7` | docs | Phase D plan patch v9 — Task 21 menu.ts upsert update-block field preservation (semantic data-loss bug 修复 — schema nameEn / quickTags / descriptionEn / originalPrice / nameEn[MenuItemOption] 漏 update-block + replaceItemOptions input shape + data block, caller intent 静默忽略 if existing rows upsert update branch) — 4 hunks 12+/1- (Patch A upsertCategory single-line 3 → multi-line 5 fields / Patch B upsertItem 8→11 fields / Patch C.1 options shape 5→6 fields + nameEn? / Patch C.2 data block 7→8 fields + nameEn opt) / Stage 0 G-PV9.1-6 + Stage 2 V1-V5 全 pass / **D89 候选 second batch-level 应用 demo first** — CC Stage 0 dump batch-level pre-empt 6+ 字段 drift in Round 2 spec 写作前 (vs Task 17 第 6+7 数据点重发模式), Phase D-4 batch L2 multi-task 三步走模型支撑 + 节省 ≥ 2-3 turn round-trip cost |

### Phase D-3b 对话 (2026-04-26, Task 19 payments.ts impl, 4 commits + 1 规则 8 暂停 G-T19.6 α 决议 resolved + 1 informational G-T19.10 XOR predict 假 alarm + Cat 5 子项 5 数据点 trend rising + #30 防御层 second live demo + Default Push Forward Rule 1+2+4 全 live precedent 首次)

| SHA | 性质 | 内容 |
|---|---|---|
| `c1b123fb` | docs | Phase D Task 19 closure round 2 micro-adjust — replace ad7a5152 with actual SHA `ad7a5152` (D77 forward-fix pattern, Task 17 round 2 `3bb5cd1c` precedent reuse) |
| `ad7a5152` | docs | Phase D Task 19 closure α′ atomic absorb — Task 18 deferred Snapshot 增量 catch-up + Task 19 closure 增量 单 commit / work-log §4/§5/§6/§10 Final verdict + Snapshot 增量 §1/§3/§4''/§7.20 NEW/§8/§9 整节重写 Task 20-22 D-4 batch L2 multi-task 启动指引 / G-T19.6 α 决议 spec literal forward-only filtered semantics Task 20+ + G-T19.10 XOR predict 假 alarm 防御层 predict 模型 nuance refinement informational + Helper R3 minor flag 1+2+3 carry-forward + Cat 5 子项 5 数据点 trend rising D89 候选 强化 |
| `a7752a30` | feat | Phase D Task 19 — payments repository (D56 in payment scope 首落 + Stripe 真钱 idempotent contract, 7 methods 5 reads + 2 multi-step writes) — D55 + D56 in payment scope (PaymentItem 全 FK + paidQuantity, 0 itemKey 字符串, Task 17 D56 设计 cross-repo first live demo work-as-designed) + D56 核心 (derivePaidQuantityByOrderItem Map<orderItemId, paidQty> 替 legacy paidItemIds 字符串集合) + Stripe webhook idempotent (line 1031 guard) / 5 维度 verdict 全 Pass / 1 规则 8 暂停 G-T19.6 α 决议 resolved + 1 informational G-T19.10 XOR predict 假 alarm + Cat 5 子项 第 3 数据点 (working tree vs project knowledge file 混淆) |
| `80660214` | docs | Phase D Task 19 L1 verify work-log — payments.ts (471 lines, 5 维度 pre-verdict + 风险 A/B/C/D + Stage 0 G-T19.1-10 完整 grep spec + #30 防御层 second live demo carry-forward Task 18 work-as-designed) |

### Phase D-3a 对话 (2026-04-26, Task 18 sessions.ts impl, 2 commits + 0 规则 8 暂停 + 0 真 fail-loud + 1 微 drift informational + #30 防御层 first live demo work-as-designed) [deferred Snapshot 增量 catch-up @ `ad7a5152` α′ path]

| SHA | 性质 | 内容 |
|---|---|---|
| `cb2efd5e` | feat | Phase D Task 18 — sessions repository (业务 source of truth + 双向 update tx, 8 methods, 3 reads + 5 writes) — D55 (3 multi-step tx 编译期强制) + D13-adjacent (coupon snapshot flatten 4 字段) + 双向 FK 一致性 (Session.tableId ↔ Table.currentSessionId 同 tx) / 5 维度 verdict 全 Pass / Stage 0-4 全 pass 0 暂停 / **#30 防御层 first live demo work-as-designed** — G-T18.4 schema enumeration + G-T18.10 Prisma XOR predict 双 pre-empt + 0 真 fail-loud (vs Task 17 第 6+7 数据点需 forward-fix) + 1 微 drift informational only (settlementMode `String @default("unset")` NOT `String?`) |
| `6102725f` | docs | Phase D Batch 3 Task 18 L1 verify work-log — sessions.ts (5 维度 pre-verdict + 风险 A/B/C/D + Stage 0 G-T18.1-10 完整 grep spec 含 schema-side full field enumeration + Prisma XOR predict 防御层) |

### Phase D-2 对话 (2026-04-26, Task 17 orders.ts impl, 3 commits + 4 规则 8 暂停 resolved (G-T17.6 path literal pnpm hoist α + Stage 1 D56 grep doc-comment-excluding α + Stage 2 TS2322 Prisma XOR α + Stage 2-fix.0 schema field discovery α-extended) + 0 critical fabrication 逃逸 + 7 数据点 #29/#30 候选累积)

| SHA | 性质 | 内容 |
|---|---|---|
| `ff5e881b` | feat | Phase D Task 17 — orders repository B2 core (10 methods, 5 reads + 5 writes) — D55+D56+D57+D68 首落 + D23/D24/D30 应用 / α + α-extended forward-fix (Order Checked relation connect + tableName/tableNameEn snapshot + OrderItem RLS-denormalized raw + menuItemId raw NO @relation) / 5 维度 verdict 全 Pass / Self-flag 段 7 数据点累积 |
| `3bb5cd1c` | docs | Phase D Task 17 work-log round 2 micro-adjust — Flag A (§10 第 3 条 forward-looking ack) + Flag B (§5 row 2 split reads/writes single-step) D77 forward-fix 模板 (不 amend pushed commit) |
| `7dc63fd3` | docs | Phase D Task 17 L1 verify work-log — orders.ts B2 核心 (348 lines initial, 5 维度 pre-verdict + 风险 A/B/C/D + Stage 0 G-T17.1-9 完整 grep spec + §6 D88 维度 3 anchor literal grep 实证 self-audit 10 anchor 全 ✅) |

### Phase D-1 对话 (2026-04-22 ~ 2026-04-26, Task 16 store.ts impl, 2 commits + 治理 v5.0 + Time Machine env gap §7.15 DP3 Prisma Client generate 修复)

| SHA | 性质 | 内容 |
|---|---|---|
| `019ab826` | feat | Phase D Task 16 — store.ts (Phase D 第 1 个 repo, withSystemContext 4 wrapper validate) + Snapshot v5.0 self-fab DP1+2+3 修正同 commit body land (22 model + 4 wrapper + SHA cite) + DP4 env-state observation ack + 4 处 Plan Opus 印象产出数据点 (Risk C moduleResolution / Stage 0.5b grep / Stage 0.7 BASELINE_TSC env transient / 后续 G-T17.6 同模式) |
| `f500067c` | docs | Phase D Batch 1 Task 16 L1 verify work-log (含 Stage 0 G-D16.1-5 grep fact base + 5 维度 + Risk A/B/C/D, Snapshot v5.0 self-fab §7.18 DP1+2+3+4 触发链) |

### 治理 commit (2026-04-26)

| SHA | 性质 | 内容 |
|---|---|---|
| `851505d9` | docs | governance v5.0 — Phase B/C 双里程碑封顶 (Snapshot v5.0 + Digest v5 + Archive v5 三件 docs commit, D88 候选登记 + #27 双数据点 + Phase D 启动指引 ritual) |

### Phase C Batch 3 对话 (2026-04-21, 3 commits + 2 规则 8 暂停 resolved (D + α 接受 spec 内部不一致 forward-fix) + 2 规则 8 暂停 resolved (Time Machine env gap: Docker daemon + node_modules) + 0 critical fabrication 逃逸)

| SHA | 性质 | 内容 |
|---|---|---|
| `035cdee2` | feat | Phase C Batch 3 Task 15 — `module-registry.test.ts` ghost permission guard (46 lines, plan v8 heredoc 逐字), 2/2 tests pass 1.00s, 风险 A/B/C/D 全关闭 (regex 覆盖 production 唯一 API / 0 ghost permission / Permission type cast pass / `@qr-order/shared/modules` workspace alias 解析 pass) |
| `aea392ff` | docs | Phase C Batch 3 Task 15 L1 verify work-log (250 lines, Stage 0 G-T15.1-4 grep fact base + 5 维度 pre-verdict + 风险 A/B/C/D + Archive #25 same-pattern 第 3 数据点登记 + D81 landscape 4 surface 扩展) |
| `00558997` | docs | Phase C Batch 3 plan patch v8 — Task 15 heredoc naming drift fix (9 patches, MODULES → MODULE_REGISTRY + ALL_PERMISSIONS → ALL_MODULE_PERMISSIONS, plan §4.4 aspirational naming 与实际 code drift 对齐, Archive #25 same-pattern 第 3 数据点 trigger) |

### Phase C Batch 2 对话 (2026-04-21, 6 commits + 3 规则 8 暂停 resolved + 0 critical fabrication 逃逸)

| SHA | 性质 | 内容 |
|---|---|---|
| `308f7d54` | feat | Phase C Batch 2 Task 14 impl — RLS coverage (2 tests) + tenant isolation (4 tests) + dual-URL + adminDb TRUNCATE + L1 5 维度 all runtime Pass (6/6 pass, 1.19s) |
| `f49139a0` | docs | plan patch v7 — setup.ts beforeEach TRUNCATE adminDb (D85 家族 drift #3 forward-fix, app_user lacks TRUNCATE privilege) |
| `0a4696eb` | docs | plan patch v6 — Task 14 tenant-isolation tableName 补齐 (D85 家族 drift #2 forward-fix, Phase B Order schema tableName required) |
| `efa3d2e9` | docs | Task 14 L1 verify work-log 新建 + Snapshot §10 同步 (5 维度 verdict 表 + γ 方案事实依据 + 治理事件登记回顾) |
| `0da7456a` | docs | governance v4.4 — D85 + D86 登记 + Archive #26 追加 (同对话规则循环子类, D86 语言层自违反首次登记) |
| `ca863caa` | docs | plan patch v5 — dual-URL model for L1 最严 RLS (Task 14 L1 review catch testDb=postgres superuser BYPASSRLS 盲点) |

### Phase C Batch 1 对话(2026-04-21,8 commit + 3 规则 8 暂停 resolved)

| SHA | 性质 | 内容 |
|---|---|---|
| `43ff7850` | docs | Phase C Batch 1 收尾(Archive #25 + D84 候选 + Pre-Flight §7 扩展 + Snapshot A 路径切换 + Snapshot 增量) |
| `57894f8f` | feat | Task 13 impl(integration/fixtures.ts + fixtures.test.ts,platform_admin context BYPASSRLS seed + 3 tests passed) |
| `0b070a92` | fix | DB name cross-phase align(docker-compose.test.yml + package.json qr_order_test → qr_order,#25 root cause fix,D77 forward-fix 不 amend) |
| `61f8964e` | docs | Phase C plan patch v4(DB name align + Cross-Phase Invariant 注释) |
| `ffcc7cdc` | docs | Phase C plan patch v3(fixtures.test.ts table.label → table.name,Mode C δ 桶 1 read-side spill-over) |
| `a55da4ae` | feat | Task 12 impl(vitest.config + integration/setup.ts + global-setup.ts + γ3c 目录隔离 + testDb null-guard defense-in-depth) |
| `e13f7f37` | docs | Phase C plan patch v2(vitest 4 adapt: singleFork → maxWorkers:1 + isolate:false) |
| `f538941b` | feat | Task 11 impl(docker-compose.test.yml + package.json test:db:* scripts + γ3c CLI 分流) |

### Phase B Task 10 对话(2026-04-20 晚 / 2026-04-21 凌晨,2 commit)

| SHA | 性质 | 内容 |
|---|---|---|
| `55fff0da` | feat | Task 10 impl(Phase B 封顶)—— .env.example + server/eslint.config.mjs + RESUME 工具陷阱追加 + Phase B acceptance(/api/health 200 + 空库 migrate/seed 复现全通)。α.3 保留 qr-order-pg compose 不动 + γ.2' 重建 postgres-seed-test 空容器验收 + β.2 host curl 验收 |

### Phase B Task 9b 对话(2026-04-20 日间,2 commit)

| SHA | 性质 | 内容 |
|---|---|---|
| `714d61b1` | feat | Task 9b impl(seed.ts step 4-6 + ensure-system-roles helper + seed-data/menu+tables)—— Stage 0 发现 Table schema `label→name` rename + required `number` drift,α.1 plan patch + β.2 static imports 与 Task 9a 对齐 + bcrypt 密码 roundtrip verified |
| `d11205cf` | docs | Handoff 3-file 结构(governance / state / fabrication)整合 v1/v2/v3 |

### Phase B Task 8-9a 对话(2026-04-20 早,v3 对话 6 commit)

见 git log(v2 对话 8 commit + v1 对话更早)。本 Snapshot 不展开,可 `git log --oneline | head -40` 回溯。Task 9a `f06f333d` / Task 9a Patch 6 `1187b50f` / Task 8 `820389a9` / Task 8 Patch 5 `b8ef8fd4`.

### 更早(Phase B Task 4-7 / 启动期)

见 git log。Task 7 `39d297a7` / Task 7 β refinement `60fdcfe0` / Task 6 `49a53a3a` + `fff4f27f` / Task 5 `ad27caba` / Task 4 `2effedb5` + `bb1428ac` / Task 3 `9153f076` / Task 2 `75fd9084`.

---

## 4. Phase B 完成总览(全 10 task)

| Task | SHA 链 | 核心产出 |
|---|---|---|
| 2 | `75fd9084` + 更早 | schema.prisma 完整 + Mode C δ 桶 1 RESOLVED(16 MVP 必需字段) |
| 3 | `9153f076` 系 | 20260417000001_extend_schema 增量 migration |
| 4 | `bb1428ac` + `2effedb5` | rls_and_roles migration(β 双侧 ::text cast)|
| 5 | `ad27caba` | seed_platform_admin migration(SQL 极简)|
| 6 | `fff4f27f` + `49a53a3a` | prisma-client.ts(withTenantContext + β refinement)|
| 7 | `39d297a7` + `60fdcfe0` | shared/types.ts(OrderStatus 6→5 + 判别联合)|
| 8 | `9531f364` + `b8ef8fd4` + `820389a9` | tenant-aware.ts + G7-4 helper(Patch 5 Express 5 types)|
| 9a | `d9a21d66` + `1187b50f` + `f06f333d` | seed.ts platform admin + demo store + ModuleLicense |
| 9b | `714d61b1` | seed.ts roles + owner + menu + tables |
| 10 | `55fff0da` | .env.example + ESLint + Phase B acceptance |

**Acceptance 证据**(spec §9.3 / D46):

- ✅ Prisma 基建完备: 4 migration + schema 新增表 + seed 幂等
- ✅ Phase B chain 可复现: 空 postgres → migrate → seed 完整通过(`55fff0da` Stage 8 证明)
- ✅ JsonStore runtime 不受影响: `qr-order-server` 仍在 `/api/health` 200(Prisma 未被引用)
- ✅ 业务 code 未切 Prisma: 留给 Phase D
- ✅ ESLint no-floating-promises 生效 + baseline 0: Phase G async 重构有防御

---

## 4'. Phase C 完成总览(全 5 task)

| Task | SHA 链 | 核心产出 |
|---|---|---|
| 11 | `f538941b` + fix `0b070a92` + plan v3/v4 `ffcc7cdc`/`61f8964e` | docker-compose.test.yml + test:db:* scripts + γ3c CLI 分流 + DB name `qr_order` cross-phase align (#25 forward-fix) |
| 12 | `a55da4ae` + plan v2 `e13f7f37` | vitest.config.integration.ts + integration/setup.ts + global-setup.ts + γ3c 目录隔离 + testDb null-guard defense-in-depth + vitest 4 maxWorkers:1 + isolate:false adapt |
| 13 | `57894f8f` | integration/fixtures.ts + fixtures.test.ts + platform_admin context BYPASSRLS seed + 3 tests passed |
| 14 | `308f7d54` + plan v5/v6/v7 `ca863caa`/`0a4696eb`/`f49139a0` + work-log `efa3d2e9` + governance v4.4 `0da7456a` | rls-coverage.test.ts (2 tests) + tenant-isolation.test.ts (4 tests) + dual-URL identity model (TEST_ADMIN_DATABASE_URL = postgres superuser / TEST_DATABASE_URL = app_user / DATABASE_URL = postgres double-guard) + adminDb beforeEach TRUNCATE + global-setup.ts ALTER ROLE app_user password via WHATWG URL parser + L1 5 维度 all Pass runtime (6/6 tests, 1.19s) |
| 15 | `035cdee2` + plan v8 `00558997` + work-log `aea392ff` | module-registry.test.ts ghost permission guard (2 tests) + plan v8 heredoc naming drift fix MODULE_REGISTRY + ALL_MODULE_PERMISSIONS + Archive #25 same-pattern 第 3 数据点 reconcile + D81 landscape 4 surface 扩展登记 + 2/2 tests pass 1.00s |

**Acceptance 证据**:

- ✅ 测试 DB 基建完备: `qr-order-postgres-test:5433` + tmpfs + γ3c CLI 分流 + 4 migrations apply (init / extend_schema / rls_and_roles / seed_platform_admin)
- ✅ Dual-URL 测试身份模型 live: postgres superuser (admin / migrate + ALTER ROLE / TRUNCATE) + app_user (RLS subject runtime)
- ✅ RLS coverage + tenant isolation: 6/6 tests verify 每 store_id 表有 RLS enabled + tenant_isolation policy + WITH CHECK 完整 + 跨租户 SELECT 隔离 + WITH CHECK INSERT mismatch 拒绝
- ✅ Ghost permission guard: code → registry 单向 guard, 11 route files × 100+ requirePermission literals all ∈ ALL_MODULE_PERMISSIONS (14 permissions × 6 modules)
- ✅ L1 最严 review 节奏验证: Task 14 (`efa3d2e9`) + Task 15 (`aea392ff`) work-log → Ian 明批 → CC 三步走 live precedent

---

## 4''. Phase D 完成总览(进行中 6/11)

| Task | SHA 链 | 核心产出 |
|---|---|---|
| 16 | `019ab826` + work-log `f500067c` | store.ts (Phase D 第 1 个 repo, withSystemContext 4 wrapper validate / Snapshot v5.0 self-fab DP1+2+3 修正 land + DP4 env-state ack / 4 处 Plan Opus 印象产出数据点 trigger #29 候选 累积起步) |
| 17 | `ff5e881b` + work-log `7dc63fd3` + round 2 forward-fix `3bb5cd1c` | orders.ts B2 核心 (10 methods 5 reads + 5 writes / D55+D56+D57+**D68** 首落 + D23/D24/D30 应用 / α + α-extended forward-fix 4 fail-loud resolved: G-T17.6 path literal pnpm hoist functional verify + Stage 1 D56 grep doc-comment-excluding regex + Stage 2 TS2322 Prisma Create vs UncheckedCreate XOR Order Checked relation connect + Stage 2-fix.0 schema field discovery tableName/menuItemId raw / 5 维度 verdict 全 Pass / 7 数据点 #29 (5 D88 维度 3) + #30 (2 D79) 候选累积) |

| 18 | `cb2efd5e` + work-log `6102725f` [deferred Snapshot 增量 catch-up @ `ad7a5152` α′ path] | sessions.ts 业务 source of truth + 双向 update tx (8 methods 3 reads + 5 writes / D55 (3 multi-step tx) + D13-adjacent (coupon snapshot flatten 4 字段) + 双向 FK 一致性 (Session.tableId ↔ Table.currentSessionId 同 tx) / 5 维度 verdict 全 Pass / Stage 0-4 全 pass 0 暂停 / **#30 防御层 first live demo work-as-designed** — G-T18.4 schema enumeration + G-T18.10 Prisma XOR predict 双 pre-empt + 0 真 fail-loud + 1 微 drift informational only (settlementMode `String @default("unset")` NOT `String?`)) |
| 19 | `a7752a30` + work-log `80660214` + closure docs sync `ad7a5152` (α′ atomic absorb T18 deferred 增量 + T19 增量) | payments.ts D56 in payment scope 首落 + Stripe 真钱 idempotent (7 methods 5 reads + 2 multi-step writes / D55 + D56 in payment scope (PaymentItem 全 FK + paidQuantity, 0 itemKey 字符串 — Task 17 D56 设计 cross-repo first live demo work-as-designed) + D56 核心 derivePaidQuantityByOrderItem (Map<orderItemId, paidQty> 替 legacy paidItemIds 字符串集合, Phase G settlement gateway contract land) + Stripe webhook idempotent contract (line 1031 guard) / 5 维度 verdict 全 Pass / 1 规则 8 暂停 G-T19.6 spec literal α 决议 resolved (filtered semantics forward-only Task 20+, D77 不 retro-amend) + 1 informational G-T19.10 XOR predict 假 alarm (Prisma 6 Unchecked branch 直接命中 raw FK form, 防御层 over-cautious 数据点 NOT fabrication archive) + Cat 5 子项 5 数据点 trend rising (DP3+DP4+DP5 NEW, D89 候选 强化 per Helper R3 minor flag 2) + **#30 防御层 second live demo** — G-T19.4 schema enumeration Branch 1 命中 + G-T19.10 informational refinement + Default Push Forward Rule 1+2+4 全 live precedent 首次) |
| 20 | `cf46f1c5` | split-bills.ts D56 FK model 复用 Task 19 同模式 (6 methods 3 reads + 3 writes 含 1 多步 tx create + 1 聚合 sumAssignedQuantityByOrderItem / D56 FK + quantity 复用 PaymentItem 同模式 / 5 维度 verdict 全 Pass L2 简化 / Stage 0 G-T20.1-3 + Stage 2 tsc filtered=0 + N1=103 baseline / 119 lines / **G-T20.10 XOR predict autonomous** (CC 加, Task 17→18→19 carry-forward 模式扎根) / SplitBillStatus enum 'active' literal accept (Prisma 6 string-literal narrowing live precedent) / **#30 防御层 third live demo work-as-designed** / 0 真 fail-loud) |
| 21 | `aaf9fa79` + plan patch v9 `06a746d7` | menu.ts Category + MenuItem + MenuItemOption 3-entity bundle (8 methods 4 reads + 4 writes 含 1 多步 tx replaceItemOptions wipe+reinsert 同 replaceDraftItems 模式 / POST plan-patch-v9 update-block field preservation incorporated 4 hunks (Patch A 5 fields + Patch B 11 fields + Patch C.1 6 fields options shape + Patch C.2 8 fields data block) / 5 维度 verdict 全 Pass L2 简化 / Stage 0 G-T21.1-3 + Stage 1 post-write v9 6 字段 grep 实证 + Stage 2 tsc filtered=0 + N1=103 baseline / 136 lines / **#30 防御层 fourth live demo work-as-designed** (Task 18/19/20/21 4 consecutive carry-forward) + **D89 候选升格条件 ripening** — 4 live demos + Cat 5 trend 8 数据点 + plan patch v9 batch-level 应用 demo / 0 真 fail-loud) |
**Acceptance 证据** (Phase D 进行中):

- ✅ Phase D-1 + D-2 + D-3a + D-3b batch land: Task 16 store.ts + Task 17 orders.ts + Task 18 sessions.ts + Task 19 payments.ts 入 git, push aligned origin/main (D76)
- ✅ Phase G Task 33+ session-cart B2 重写 foundation contract land: Task 17 orders.ts 10 methods + Task 18 sessions.ts 8 methods + Task 19 payments.ts 7 methods Phase G 直接消费
- ✅ L1 最严 review 节奏稳定: Task 16 + Task 17 + Task 18 + Task 19 work-log → Ian 明批 → CC 四步走 四数据点继 Phase C Task 14/15 模型
- ✅ D77 forward-fix 模板 live precedent: Task 17 round 2 `3bb5cd1c` + Task 19 round 2 `c1b123fb` 不 amend pushed commit
- ✅ Task 17 4 处 fail-loud 全 α/α-extended 决议 forward-fix land + 0 critical fabrication 逃逸
- ✅ **Task 18 #30 防御层 first live demo work-as-designed**: G-T18.4 schema enumeration + G-T18.10 Prisma XOR predict 双 pre-empt 0 真 fail-loud
- ✅ **Task 19 #30 防御层 second live demo + α 决议 resolution model land**: G-T19.4 schema enumeration Branch 1 命中 + G-T19.6 spec literal definition-incompatible α 决议 turn resolution (filtered semantics forward-only) + G-T19.10 XOR predict 假 alarm informational (防御层 predict 模型 nuance refinement: data block mixed-style trigger 替 schema @relation 双形)
- ✅ **Stripe 真钱 idempotent contract live**: line 1031 idempotent guard + Phase G Task 35/36 settlement gateway / webhook handler 直接消费 paymentRepo (Phase G migration scope)
- ✅ **D56 核心 contract land**: derivePaidQuantityByOrderItem Map<orderItemId, paidQty> 替 legacy paidItemIds 字符串集合 — Phase G settlement gateway 由本 task land contract
- ✅ **Default Push Forward Rule 1+2+4 全 live precedent 首次** (Phase D-3b Task 19, per Helper R3 minor flag 3): Rule 1 (CC 0 暂停 → Plan Opus 直进 closure) + Rule 2 (Helper review skip per 0 自 flag 风险面 + Plan Opus 新 instance re-grep 等价 cross-instance verify) + Rule 4 (G-T19.6 α 决议 idempotent 安全 + root cause file-agnostic env semantics nail down + Helper skip)
- 🟡 17 处 Plan Opus 印象产出数据点 累积 (Phase D-1 期 4 + Phase D-2 期 5 + Phase D-3a 期 0 + Phase D-3b 期 8) → #29 (D88 维度 3 anchor literal, 9 sub-instance unchanged) + #30 (D79 Plan-as-code dryrun missing, 3 sub-instance — DP6/DP7/DP10 NEW; Task 18/19 防御层 live demos) + Cat 5 子项 (5 数据点 — DP1 Cowork workspace + DP2 Helper Flag A 误归 + DP3 NEW working tree vs project knowledge file + DP4 NEW path 凭印象 cross-system + DP5 NEW project knowledge content vs repo state; trend rising → **D89 候选 强化** per Helper R3 minor flag 2 carry-forward) → β 双 entry 路径 入下次 governance commit 节奏点 decide
- 🟡 8 governance queue entries (Pre-Flight Checklist D86 gate semantic / Project description D86 sync / Snapshot §6 D86 sub-class / Phase H §7 heading rename + D86 verify spec template / D88 维度 3 延伸 sub-rule self-state assertion / NEW 6th — Task 20+ Stage 0 G-Tn.6 spec literal filtered semantics standardize / NEW 7th — Pre-Flight Checklist v2 candidate XOR predict trigger refinement explicit anchor "data block mixed @relation connect + raw FK" 替 "schema @relation 双形" per Helper R3 minor flag 1 / NEW 8th — Plan Opus 跨 system / path / content-state assumption 必先 CC dump 实证, /mnt/project 是 input reference 不是 working tree state 权威 per Cat 5 第 4+5 数据点) → 入下次 governance commit 节奏点 atomic decide
- ✅ **Phase D 6/11 land milestone (D-4 batch closure)** — Task 20 split-bills + Task 21 menu + plan patch v9 (3 commits + closure docs `ffc7719f`) L2 multi-task batch 三步走模型 (spec → Ian 明批 → CC execute) **首次 live demo**, 0 规则 8 暂停 / 0 真 fail-loud / 0 forward-fix 跨 batch
- ✅ **#30 防御层 fourth live demo work-as-designed continuity** — Task 18 first / Task 19 second / Task 20 third / Task 21 fourth, 4 consecutive carry-forward 全 schema-side full field enumeration grep + Prisma XOR predict + Unchecked branch direct pre-empt
- ✅ **D89 候选升格条件 ripening** — 4 live demos + Cat 5 trend 8 数据点 (含 DP6 NEW D-4 batch entry CC dump batch-level pre-empt + DP7 NEW Snapshot path 假设 self-application 本对话 first internalized) + plan patch v9 batch-level 应用 demo first (vs Task 17 单 task 重发模式)
- ✅ **L2 → L1 升级 trigger Helper review fired** — Task 22 + printer 附录 拆 D-5 batch, β-modified path 决议 strict adherence ("L2 batch 内任一 task L1 升级 → 拆分独立 batch") first live demo
- 🟡 **plan patch v9 update-block field preservation** Task 21 heredoc post-v9 incorporated 4 hunks — 防 caller intent 静默忽略 in upsert update branch on existing rows (Category/MenuItem nameEn + descriptionEn + originalPrice + quickTags + MenuItemOption nameEn 字段保留)

---

## 5. Mode C 状态(δ 分桶 matrix,live)

**决议**: Ian 在 Phase B Task 2 对话选 δ(分类处理)。Phase B Task 9a/9b/10 + Phase C Task 11-15 全程 verify 桶 2/4 无阻塞。

| 桶 | 字段数 | 内容 | 状态 |
|---|---|---|---|
| 1 | 16 | MVP 必需字段(Table rename+5 / Store+5 / Order+2 / Coupon+1 / MenuItem+1 / Category+1) | ✅ **RESOLVED** in `75fd9084`(Task 2 impl scope 扩展) |
| 2 | 6 | Floor plan(`x / y / width / height / shape / zone`) | 🔵 **delegated Phase I/J** |
| 3 | 3 | Deprecated(`Table.currentBillId / Table.currentOrderId / Table.paymentMode`) | ⚫ **不补**(Store 级 paymentMode 已够) |
| 4 | 6 | 次要扩展(`Waitlist.estimatedWait/notifiedAt / Printer.address / MenuItem.dietary/isRecommended/quickTags / Category.hideQuickTags`) | 🔵 **delegated Phase H/I** |

---

## 6. D 候选累积清单(Phase H Task 45 升格队列)

**累积 19 项**,按来源分段:

### v1 既有(7 项)

- **D67** 反向 drift 处理(types.ts > JSON)
- **D68** Order snapshot 哲学
- **D69** maxTables 留 Store 级
- **D70** Coupon schema 完整补入
- **D71** Seed-as-SSOT
- **D72** OrderStatus 派生状态前端展示
- **D73** JWT 不向后兼容部署纪律

### v2 新增(4 项)

- **D74** Plan 行数预算 + 实时预警 + **双向校准**(原桶 ×0.8 简单 / ×1.25 复杂 + 新桶 ×1.07 patch spec inline code heredoc + 新桶候选 ×1.5-1.8 work-log w/ grep embed)
- **D75** 数据 guard(`[ -s file ]` 后置)(live 应用 15+ task 0 fail)
- **D76** Commit 后强制 push + verify origin SHA(live 应用 15+ task 0 fail,CC memory 已落)
- **D77** Task 4 注释 E 事实修正 + β 决议理由更新

### v3 新增(5 项)

- **D78** Patch spec range mandatory grep-verify terminus(live 应用 5+ 次)
- **D79** Plan-as-code dryrun 前置(新依赖/framework module/type 系统 feature 引入时)
- **D80** @types/express v5 vs express v4 版本 skew
- **D81** Seed hardcode vs source SSOT drift 防御模式(α/β/γ)—— **Phase C Batch 3 期 landscape 扩展为 4 surface naming inconsistency** (shared/modules.ts MODULE_REGISTRY / seed.ts ALL_MODULES / fixtures.ts MODULES_FULL / spec §4.4 aspirational MODULES), 原单对 drift 升级为多 surface inconsistency family
- **D82** Schema-write tasks must enforce `prisma generate` step

### Task 9b 对话新增(1 项)

- **D83** Plan 绝对数字基准改用相对约束

### Phase C Batch 1 对话新增(1 项)

- **D84** Cross-Phase Invariants handoff 第四份文件(候选)
  - 触发: Fabrication #25(Task 11 plan `qr_order_test` 与 Phase B migration `qr_order` 跨 phase literal drift)
  - 收录范围: 硬 invariant only (DB name / role name / GUC / migration SQL literal); convention 类 drift 归 Pre-Flight Checklist 新条款

### Phase C Batch 2 plan patch v5 `ca863caa` 后续新增(2 项)

- **D85** 同 plan 跨 Task 基础假定 consistency check(候选)
  - 触发: Phase C Batch 2 Task 14 L1 review catch Task 11/12 vs Task 14 testDb 身份 assumption drift, `ca863caa` dual-URL forward-fix 修复

- **D86** Spec async-executable 原则(候选)
  - 触发: Ian 2026-04-21 meta observation
  - 落地: 所有 CC 执行消息最前必含 Stage 0 pre-check + Language-layer enforcement (禁 session-relative 指示词)
  - 首次登记自违反: `ca863caa` commit body 含 session-relative 措辞 → Archive #26 (D77 不 amend, Digest 正式登记 body 应用修正语言)

### Phase C Batch 3 对话新增(1 项)

- **D88** Plan Opus spec value-density self-audit + anchor literal grep 实证(候选)
  - 触发: Helper Opus 2026-04-21 raise (在外部 chat instance value-density 评估表) + Plan Opus 2026-04-21 Phase C Batch 3 closure 期 evaluate 后修正版含 sub-rule 4 维度 + Plan Opus 2026-04-21 Phase C Batch 3 期 2 次 spec 内部不一致 fabrication (Stage 0 setup.ts last anchor f49139a0 vs 实际 308f7d54 / Post-write wc -l verify range 38±2 vs 实际 plan v8 = 46 lines)
  - 原则: Plan Opus 产 spec 前 4 维度 self-audit:
    1. **Verification**: spec 含 verify (grep / tsc / runtime / D75 / D86 scan) 吗? 0 verify → 重新评估是否需 CC 路径
    2. **Judgement**: spec 含 fail-loud branch (规则 8 暂停触发条件) 吗? 0 branch → 内容机械度高, CC 路径冗余
    3. **Anchor literal grep 实证**: spec 含 anchor literal (SHA / line number / wc -l count / file path) 吗? **若有**, 必先 grep 实证后再写 spec, 不凭对 plan / commit 内容的高层印象映射
    4. **Path-of-least-defense**: 维度 1+2+3 全 0 → 模式 A (机械落盘), Ian 手动路径或 helper-direct-write (MCP 配后) 可用; **保留** D75 + wc + D86 三项 post-write verify (Ian 跑 3 行 bash command 等价, 不丢 verification 层)
  - 与 Helper raise 框架修正点: 不消除 CC 模式 A 的 verification 层 / 不主张 CC "co-thinker" 化 (保持 fail-loud 机械执行 = defense-in-depth 第 3 层) / 模式 A 节省 ≈ CC instance 启停 latency + Plan Opus → CC spec 中转 token, 不节省 LLM 调用本身 / 加入维度 3 anchor literal grep 实证 (核心治理意义 > value-density 优化)
  - 与既有规则家族关系:
    - **D74 数量估算治理** (产物行数估自己) vs **D88 维度 3** (anchor literal 引用 plan/commit 内容时的 grep 实证): 两者都属"期望数量"类规则家族, D88 子类专攻 anchor literal 子类
    - **Pre-Flight Checklist §7 第 5 行 cross-phase literal coupling** (spec 涉跨 phase artifact 时 grep 实证) vs **D88 维度 3** (spec 涉 commit/file anchor 时 grep 实证): 同 evidence-first 原则, D88 扩展到 anchor literal 子类
    - **Helper raise value-density 框架** (4 模式 A/B/C/D): D88 维度 1+2+4 内化此分级思想, 但路径 (Ian 手动 / helper-direct-write) 保留 verification 层
  - 升格时机: Phase H Task 45

### Phase D-5 batch L1 D89 升格 atomic batch (1 项 formal land, 2026-05-12)

- **D89** Plan Opus spec writer anchor literal source freshness mandate — **formal land at `c0b8f4e0db138294c1a75de35aa8b7e3978a0645`** (governance-digest §6 D89 entry + §10 v6 批 + Snapshot §1 queue update + §6 本 sub-section + §10 v5.X+1 批 atomic docs commit)
  - 触发: Phase D-5 batch L1 plan patch v10 `39666dc8` 期双 instance D88 维度 3 self-违反 (Stage 0 HEAD anchor `7ec04772` 凭 Ian 启动消息 + Snapshot §1 半 stale 印象 → 实际 `aa7d5829` / Stage 2 `\bclockOut\b count = 0` expectation vs Patch D new_str docstring `(double-clockOut guard)` literal self-cross-scan missing) + Phase D 期 5+ batch-level live demos 累积 + Cat 5 子项 11+ 数据点 trend rising 升格判 ripening 满足
  - 全文: 见 `phase-5-governance-digest.md` §6 D89 entry
  - Helper review trigger: Step 1 commit land 后 → Ian 转 Helper Opus instance review → Helper return clean OR Plan Opus α/β/γ 决议 ack flags
  - Project knowledge re-upload mandate: Helper review return clean + Plan Opus closure ack 后, Ian 必 Desktop App → Phase 5 Project → Knowledge section 删 stale governance-digest.md + state-snapshot.md, upload latest from repo (post-D89 land commit state). 下次 Plan Opus chat 启动 → 读 fresh Project knowledge → 自动 ack D89 formal entry → apply mandate inline at Task 22 work-log spec writing.

**全文**: 见 `phase-5-governance-digest.md` §6。

---

## 7. Pending drifts(本对话未修,转下对话或 Phase H Task 45)

**Phase 封顶 v5.0 regen reconcile**: 7.9 / 7.10 / 7.11 / 7.12 由 Phase B/C 完成节点机制清理 (内化已 land 状态), Snapshot 不再单独登记。新增 Phase C Batch 2/3 期 7.13 / 7.14 / 7.15。

### 7.1 Line 17 Phase B batch summary 表 Task 3 subject drift

- **位置**: `phase-b-infrastructure.md` line 17
- **当前**: `| 3 | 生成 20260417000001_init/migration.sql |`
- **正确**: `| 3 | 生成 20260417000001_extend_schema/migration.sql |`(Task 3 β 增量路径)
- **处理**: Phase H Task 45 spec reconcile
- **外化锚**: `1187b50f` commit body

### 7.2 `seed.ts.pre-phase5` backup untracked

- **位置**: `server/prisma/seed.ts.pre-phase5`(64 行,Task 9a Stage 2 备份)
- **处理**: Phase I `_archive/` 归档
- **外化锚**: `f06f333d` commit body

### 7.3 Task 6 plan 缺 `pnpm prisma generate` step(D82 触发事件)

- **位置**: `phase-b-infrastructure.md` Task 6 段
- **处理**: Phase H Task 45 reconcile
- **外化锚**: `f06f333d` commit body

### 7.4 `stores.tipBase` 无 `@map("tip_base")`(顺手项)

- **位置**: `schema.prisma` stores.tipBase 字段
- **处理**: Phase H/I 任何 touch schema.prisma 的 task 顺手补
- **当前**: Task 10 / Phase C Task 11-15 也未 touch schema.prisma,持续传递

### 7.5 Task 4 注释 E storeId 格式 "cuid" 错误(D77 触发事件)

- **位置**: `2effedb5` migration.sql 注释 E
- **处理**: Phase H Task 45 spec reconcile
- **不能 amend**: 已 push

### 7.6 phase-b-infrastructure.md Task 9b plan heredoc label/number 未同步 Mode C δ 桶 1(#20 触发事件)

- **位置**: `phase-b-infrastructure.md` Task 9b 段 line ~2085(`seed-data/tables.ts` heredoc)+ Stage 4 table upsert 段
- **问题**: plan heredoc 用 `label` 字段(schema 已 rename 为 `name`)+ 漏 `number` required 字段
- **Task 9b 实际执行**: CC 已在 `714d61b1` 用 α.1 修订路径 land 正确 schema,plan 本身未 patch
- **处理**: Phase H Task 45 reconcile 时统一同步 Task 9b plan heredoc 与 Mode C δ 桶 1 schema
- **外化锚**: `714d61b1` commit body + Archive #20

### 7.7 Task 10 docker-compose.yml 与现有 dev stack drift

- **背景**: Task 10 plan 设计时未考虑现有 `docker-compose.yml`(4-service stack 已 Up 长期, daily dev 使用)
- **差异**: container_name (`qr-order-pg` vs plan `qr-order-postgres`) / password (hardcoded `qrorder123` vs plan `${POSTGRES_SUPERUSER_PASSWORD:-devonly}` fallback) / user (`qrorder` vs plan `postgres` superuser 模式) / sibling services (adminer/server/nginx) plan 未涵盖
- **Task 10 决议**: α.3 保留现状 compose 不动, `.env.example` 按 plan template 写作为 aspirational 文档
- **处理**: Phase H Task 45 reconcile —— 统一 compose naming + creds 策略 + `.env.example` vs 实际 compose env 一致性决定
- **外化锚**: `55fff0da` commit body(explicit drift section)

### 7.8 qr-order-pg 容器内遗留测试数据(legacy schema, Phase 5 前)

- **位置**: `qr-order-pg` PostgreSQL 容器 + `pg_data` volume
- **内容**: `stores` 表 2 行(store-demo-001 示例餐厅 / store-demo-002 火锅世界)+ `store_users` 表 6 行(每 store 3 个用户 admin/staff1/staff2,bcrypt 密码)
- **Schema**: Task 2/3 expansion 前老 schema(`store_users` 用 text `role` 列,非新 Staff+Role FK 模型)
- **Ian confirmed**: 测试残留, 无业务价值
- **处理**: Phase H/I/J 清理时一起 reconcile (`docker compose down postgres + volume rm` + 用 qr-order-pg 跑 Phase 5 schema 的决策时机)
- **外化锚**: Task 10 Stage 8 用新 `postgres-seed-test` 跑验收, qr-order-pg 未 touch

### 7.13 phase-c-test-db.md spec §4.4 aspirational naming Phase H Task 45 reconcile

- **位置**: `phase-c-test-db.md` §4.4 段 (设计阶段定 `MODULES` + `ALL_PERMISSIONS` 作 shared/modules.ts export 名)
- **问题**: 实际 code (Phase B `310f43ff` 期 land) 用 `MODULE_REGISTRY` + `ALL_MODULE_PERMISSIONS` (5 exports / 6 modules / 14 permissions). spec §4.4 文字未同步更新, plan v8 `00558997` 仅 fix Task 15 heredoc, §4.4 spec 文字 drift 持存
- **处理**: Phase H Task 45 reconcile 时统一 spec §4.4 文字与实际 code naming 对齐 (或反向决议升级实际 code 为 `MODULES` / `ALL_PERMISSIONS`, 由 reconcile 期判)
- **触发链**: Archive #25 same-pattern 第 3 数据点 (Plan Opus 写 plan v8 前 spec §4.4 凭印象 naming, 未 grep 实际 code) → CC L1 work-log Stage 0 G-T15.1 grep 实证 → plan v8 Task 15 heredoc forward-fix
- **外化锚**: `00558997` commit body + Archive #25 第 3 数据点 + Task 15 L1 work-log `aea392ff`

### 7.14 D81 candidate landscape 4 surface naming inconsistency

- **位置**: 4 处 module-related naming surface 并存:
  - `shared/modules.ts` `MODULE_REGISTRY` (canonical, Phase B `310f43ff`)
  - `server/prisma/seed.ts:11` `ALL_MODULES` (Task 9a `f06f333d` hardcoded 6 module IDs, D81 候选原触发)
  - `server/src/__tests__/integration/fixtures.ts:416` `MODULES_FULL` (Task 13 `57894f8f` hardcoded 6 module IDs, 顺序与 canonical 略异但 set 等价)
  - `phase-c-test-db.md` §4.4 aspirational `MODULES` (drift 项, 见 7.13)
- **问题**: D81 候选原 scope = seed hardcode vs source SSOT 单对 drift, Phase C Batch 3 G-T15.4 fact base 揭示扩展为多 surface naming inconsistency family
- **处理**: Phase H Task 45 reconcile 时同时处理 4 surface (非单对). D81 α/β/γ 三路径 (runtime assertion / build-time check / comment reminder, 当前 γ 最弱防御) 决议范围扩展
- **外化锚**: `aea392ff` work-log §5.2 D81 landscape 4 surface 登记 + `035cdee2` commit body Governance 段

### 7.15 Time Machine restore env gap pattern (Phase C Batch 3 期登记)

- **位置**: 协作环境基础设施层 (Mac dev environment + Docker Desktop + node_modules)
- **背景**: Mac 砖机 (Logic Gate 故障, 2026-04-22 OS update 后) → Time Machine 4/4 备份还原 → Phase 5 协作链路重启
- **3 数据点**:
  - 数据点 1: Docker Desktop daemon 未自启 (socket `/Users/.../docker.sock` 不存在), 容器 image 需 rebuild — Phase C Batch 3 Task 15 启动期 CC Stage 0 docker ps fail-loud 拦截
  - 数据点 2: `server/node_modules/.bin/vitest` 缺失 (Time Machine 备份 node_modules 不完整, pnpm install 未跑过) — Phase C Batch 3 Task 15 test run 期 fail-loud `sh: vitest: command not found` 拦截
  - 数据点 3: Prisma Client generated types 缺失 (`server/node_modules/.prisma/` 不存在, `pnpm prisma generate` 未跑过) — Phase D Task 16 启动期 CC Stage 4.1 fail-loud (TS2305 ModuleLicense + TS2353 tipBase / moduleLicense 字段缺失, 4 store.ts own errors) → α 接受 `cd server && pnpm prisma generate` (75ms) → 重跑 Stage 4.1 store.ts 0 own error + Stage 4.2 baseline 123 → 103 (-20 transitive errors, BASELINE_TSC §8 cite 验证准确, env transient drift 非 cite stale, 见 §7.18 数据点 4)
- **处置**: 3 数据点均 Ian 一手 + α 接受路径处置 (`open -a Docker` + `docker compose build` / `pnpm install --frozen-lockfile` / `pnpm prisma generate`), spec 内 Risk E 子类已预置处置路径
- **观察**: Snapshot §8 "Daily dev stack 5 容器 Up 长期" 在 Time Machine 还原后失效, 整体 env restore 工作量比 Snapshot §8 假设大
- **处理**: Phase H Task 45 候选条款 "Backup restore protocol" 教训内化, 不新升格 D 候选; Snapshot §8 候选 sub-clause "post-restore env gap risk acknowledgment" 列出环境层 gap checklist (Docker daemon 自启 + container image rebuild + node_modules 完整性 + `.env` 文件存在 + DB volume 持久化 + tooling CLI install)
- **外化锚**: `035cdee2` commit body Governance 段 Time Machine env gap observation + Phase H Task 45 reconcile queue + Phase D Task 16 commit body 数据点 3 追加

### 7.16 phase-d-repositories.md §746 "段 2a 完成" stale marker

- **位置**: docs/superpowers/plans/2026-04-17-phase5-postgres-migration/phase-d-repositories.md line 746-749
- **内容**: "段 2 段 2a 完成. Task 16 (store.ts) + Task 17 (orders.ts) verify 通过 (对话中, 2026-04-17). Nit: replaceDraftItems 顺序插入循环已加 createMany 限制说明注释."
- **问题**: 2026-04-17 Plan 撰写期旧 attempt 残留 marker (Phase A skip + Phase B/C 重排前的旧叙事). 实际 HEAD 851505d9 时点 store.ts / orders.ts 不存在, git log 空 — Phase 5 main lineage 实际未实施.
- **附属违反**: line 748 含 D86 禁词 "对话中" (session-relative 措辞)
- **处理**: Phase H Task 45 reconcile, Plan §746-749 整段删除或改写为 "Phase D 启动期重新实施" marker
- **外化锚**: Phase D Task 16 启动 Stage 0 G-D16.5 grep 实证 (HEAD 851505d9, store.ts/orders.ts 不存在 + git log 空) + Plan line 748 D86 violation

### 7.17 PlatformAuditLog Task 26 归属决议待办

- **位置**: phase-d-repositories.md §85-88 Task 26 方法清单 + schema.prisma model PlatformAuditLog
- **问题**: Phase D plan §88 Task 26 方法清单写 "PlatformAdmin + ModuleLicense (这个走 withPlatformContext, bypass RLS)", 未提 PlatformAuditLog. 22 model 全清单 Stage 0 G-D16.4 实证 PlatformAuditLog 存在 (含 adminId / action / targetStoreId / payload / ipAddress / userAgent + 3 @@index), 归属 Task 26 (含在 platform-admin.ts) vs 单独 audit-log.ts 待决议.
- **处理**: Task 26 batch (D-5) 启动期 Plan Opus + Ian 决议. 必要时 plan §88 patch 增量补 PlatformAuditLog 方法.
- **外化锚**: Phase D Task 16 启动 Stage 0 G-D16.4 grep 22 model 全清单 + Task 16 work-log §1 G-T16.3 + §3 风险 A 关联 + Stage 0.3c PlatformAuditLog 字段 grep 实证

### 7.18 Snapshot v5.0 self-fabrication 多数据点 + env-state observation (Archive #28 候选)

- **位置**: Snapshot v5.0 §8 文件状态表 + §9.3 Phase B carry-forward + §9.5 G-D16.2 / G-D16.4 启发, 共 4+ literal occurrence (本批 D-1 Stage 5.2-5.5 一并修)
- **数据点 1** (count drift): 两处 "21 model (16 主表 + 6 子表)" literal (§8 line 408 + §9.5 G-D16.4), Stage 0 G-D16.4 实证为 22 model (16 主表 + 6 子表, +PlatformAuditLog as 16th 主表). root cause: Plan Opus 凭 Phase B Task 2 期记忆产出 enumerable count, 未 grep schema.prisma 实证.
- **数据点 2** (wrapper count drift): §9.5 G-D16.2 fact base 写 "3 wrapper (withTenantContext / withPlatformContext / withTenantContextAndHooks)", Stage 0 G-D16.2 实证为 4 wrapper (漏 `withSystemContext`). root cause: Plan Opus 凭 Phase B Task 6 期记忆产出, 未 cat prisma-client.ts 实证.
- **数据点 3** (SHA cite drift): §9.5 G-D16.2 cite "Phase B `49a53a3a` + `60fdcfe0` baseline" 引用错误. Stage 0.4 实证: prisma-client.ts git log 显示 `820389a9` (Task 8 G7-4 helper) + `49a53a3a` (Task 6 init), 不含 `60fdcfe0`. `60fdcfe0` 实际是 Task 7 shared/types.ts (DraftOrder/SubmittedOrder + OrderStatus 5 + StoreUser/JWT). root cause: Plan Opus 凭对 Phase B Task 6/7 期 commit chain 印象映射 SHA, 未 git log 实证.
- **数据点 4** (env-state observation, **NOT cite self-stale**): Snapshot §8 cite "tsc baseline 103 errors" 经 Stage 0.7 pre-generate 测得 123 (drift +20). Stage 4.2 post-generate (运行 `pnpm prisma generate` 后) 测得 103 (= cite 准确). 结论: `103` 数字本身不是 self-stale, drift 来源 = Time Machine restore 后 Prisma Client 未 generate (env transient drift, 见 §7.15 数据点 3). 录本 DP 用于区分 "cite 真 stale" (DP1+2+3 印象产出类) vs "env 异常导致 cite 似 stale" (本 DP), 防御层不同.
- **谁拦**: CC fail-loud Stage 0/4 grep + Helper Opus cross-instance review 2026-04-26 第 2 turn 同模式 anchor literal 印象映射 flag (defense-in-depth 第 6 层 retrospective fabrication 暴露 working-as-designed)
- **处理**: §8 + §9.5 G-D16.2/4 21 → 22 model + 3 → 4 wrapper + SHA cite forward-fix, 本批 D-1 commit 一并 update. Archive #28 候选 (Category 1 子类 "Phase 封顶 regen 期 enumerable count + SHA cite 印象产出") 下次 governance commit 节奏点 land. DP4 单独标记为 env-state observation, 不入 Archive #28 主体 (不算 fabrication)
- **防御候选** (下窗口 D88 正式登记时考虑): (1) Type β-adjacent 主子规则 "信任 prior Plan instance produced artifact literal 不 grep 实证" (覆盖 SHA / count / 任意 enumerable literal 引用) — 与 D88 维度 3 同构. (2) DP4 区分子规则 "env-state 异常导致 cite 似 stale 不入 self-fabrication 范畴, 必须 post-recovery state 验证才判 cite 真 stale" — 防止 false positive Archive 登记.
- **外化锚**: 851505d9 governance v5.0 commit body (fabrication 源 DP1+2+3) + Phase D Task 16 启动 Stage 0 G-D16.2/4 + Stage 0.4 git log + Stage 4.1/4.2 tsc + Helper 2026-04-26 cross-instance review 第 2 turn flag

### 7.19 Plan Opus spec writer 凭印象产出 数据点累积 (Phase D 期 #29 + #30 候选)

- **位置**: Phase D Task 16-17 commits (`019ab826` + `ff5e881b`) Self-flag 段 + work-log §10 累积清单
- **#29 候选 (D88 维度 3 anchor literal / verify literal grep 实证, 5 数据点 — Phase C closure + Phase D 累积)**:
  1. Task 15 setup.ts last commit (Archive #27): `f49139a0` docs-only vs `308f7d54` feat code
  2. Task 15 wc -l 38±2 (Archive #27): vs 46 heredoc 实际
  3. Task 16 Risk C moduleResolution: NodeNext/Node16 vs bundler
  4. Task 17 G-T17.6 path literal: server/node_modules/.prisma/... vs pnpm hoist node_modules/.pnpm/.../
  5. Task 17 Stage 1 D56 grep: `grep -c "itemKey"` = 0 vs 3 (doc comment) — spec 与 spec 自身产出 heredoc body 不自洽
- **#30 候选 (D79 候选 Plan-as-code dryrun missing — framework type system feature + schema field discovery, 2 数据点 Phase D 期)**:
  6. Task 17 Stage 2 TS2322 (createDraftOrder + replaceDraftItems Prisma Create vs UncheckedCreate XOR semantics 推断 fail): Plan Opus 凭旧 idiom 印象, 未 dryrun verify XOR
  7. Task 17 Step 2-fix.0 schema field discovery: Order.tableName String required (D68 snapshot 哲学) heredoc 漏写 + OrderItem.menuItemId raw NO @relation spec 误提 menuItem connect — Plan Opus 凭 "标准结构" 印象, 未 cat schema.prisma full enumeration
- **Cat 5 协作心智模型混淆 子项候选 (2 数据点 Phase D 期)**:
  - Cowork workspace path 假设 (Plan Opus forward-fix template 假设 Cowork workspace = Ian Mac repo, 实际独立 system, 与 Archive #22/#25 同质)
  - Helper Round 2 Flag A 误归 §6 forward-looking 措辞冗余 (work-log §10 第 3 条 ack §5 + §6 都 forward-looking, 实际 §6 anchor writer 期已 grep 实证 ✅, 不属 forward-looking 范畴; closure 期 work-log §6 closure ack 段已澄清)
- **D88 维度 3 延伸 sub-rule 候选** (下次 governance commit decide): "spec writer 写 plan heredoc 含跨 model nested create / required field 时, 必先 cat schema.prisma 全 model field enumeration + @relation status 实证, 不凭对 schema 字段印象产出 heredoc body"
- **plan §Task 17 heredoc patch v9 候选** (下次 governance commit decide): createDraftOrder input 加 tableName + tableNameEn / data block Order layer Checked relation connect + tableName/tableNameEn 写入 + OrderItem keep menuItemId raw 注释 NO @relation / replaceDraftItems order connect + menuItemId raw + storeId raw 注释; Phase D Task 18+ 推广 (Task 18+ work-log Stage 0 增 schema-side full field enumeration grep 防 #30 D79 候选 重发)
- **谁拦**: CC fail-loud × 4 (G-T17.6 + Stage 1 D56 + Stage 2 TS2322 + Stage 2-fix.0 schema discovery) + Plan Opus α/α-extended 决议 + Ian 明批 (defense-in-depth 第 3 + 第 4 层兜 spec 层失守) + Helper minor flag (D68 source verify confirmed pre-existing, ignore)
- **处理**: 当前 forward-fix 仅 land 在 orders.ts 文件层 (`ff5e881b`). #29 + #30 + Cat 5 子项 formal entry + D88 维度 3 延伸 sub-rule 升格判 + plan §Task 17 patch v9 land — 全入下次 governance commit 节奏点 Ian 明批 batch decide (Exception Trigger 3 治理结构变更)
- **外化锚**: `ff5e881b` commit body Self-flag 段 7 数据点累积 + work-log `7dc63fd3` §10 累积清单 + round 2 forward-fix `3bb5cd1c` Flag A/B + Phase D Task 17 closure 期 §5 双表 audit trail (Pre-verdict 9 row writer 期 + Final verdict 10 row 实证期)

### 7.20 G-T19.6 spec literal definition-incompatible (Phase D Task 19 期登记)

- **位置**: docs/superpowers/work-logs/2026-04-26-phase-d-task-19-payments-l1-verify.md §2 G-T19.6 (work-log SHA `80660214` land), Phase D Task 17 work-log `7dc63fd3` G-T17.6 + Task 18 work-log `6102725f` G-T18.6 同模式 long-standing semantics gap (CC Phase D-3b symmetric probe orders.ts 实证 file-agnostic, 无 regression)
- **内容**: spec literal `tsc --noEmit src/file.ts | grep -cE "error TS"` 期望 = 0, 实际 raw=4 environmental noise file-agnostic (3× TS18028 @prisma/client/runtime/library.d.ts + 1× TS2403 @types/google-apps-script). Bare tsc invocation 默认 ES3 compiler options, 与 Prisma 6 library.d.ts ES2015+ private identifier 冲突. CC orders.ts (Task 17 已 land) 同 4 raw symmetric probe → 实证 file-agnostic env noise NOT regression
- **Root cause** (DP10 #30 D79 候选 sub-instance 第 3 数据点): Plan Opus spec writer 假设 single-file tsc 继承项 tsconfig.json target options (ES2020+), 实际 bare 命令默认 options (ES3) — 同 family as DP6 + DP7
- **Plan Opus α 决议**: spec literal 修订 forward-only filtered semantics Task 20+ standardize: `tsc --noEmit src/file.ts 2>&1 | grep -E "^src/" | grep -cE "error TS[0-9]+:" || echo "0"`. Task 17 (`7dc63fd3`) / Task 18 (`6102725f`) / Task 19 (`80660214`) 已 land work-log 不 retro-amend per D77.
- **处理**: Plan Opus Task 20+ work-log spec output 应用 filtered semantics. 8 governance queue 第 6+7+8 entries NEW 入下次 governance commit batch atomic decide
- **外化锚**: `a7752a30` commit body G-T19.6 段 + `ad7a5152` Phase D Task 19 closure docs sync (本 commit) + Phase D Task 19 work-log `80660214` §2 raw spec literal preserved

### 7.21 Snapshot α′ atomic absorb T18 deferred 增量 + T19 增量 (Phase D-3b closure 期登记)

- **位置**: docs/superpowers/archive/phase-5-state-snapshot.md §1 / §3 / §4'' / §7.20 / §8 / §9 — `ad7a5152` (α′ path)
- **背景**: Task 18 closure docs sync 从未独立 commit (live 增量维护 philosophy 设计 deferred 入 next closure absorb), Phase D-3b §F Stage 1 first attempt 假设 file 已含 T18 增量 → CC fail-loud 拦截 (Snapshot 实际 Task 17 closure state HEAD ff5e881b)
- **Cat 5 子项 第 3+4+5 NEW 数据点 root cause**: Plan Opus 假设 /mnt/project project knowledge file = working tree state 权威 — 实际 project knowledge 是 prior Plan Opus instance draft 不一定 commit 入 repo. Cat 5 trend rising 5 数据点 强化 D89 候选 ("Plan Opus external system topology / file-system / artifact source / content-state assumption 必先 grep 实证 / CC 一手 dump verify, /mnt/project 是 input reference 不是 working tree state 权威") per Helper R3 minor flag 2
- **Plan Opus α′ 决议**: single bundled closure docs sync absorbs T18 deferred 增量 + T19 增量 atomic, region-based Python edits (anchor on heading + SHA + section boundary, 不依赖 OLD byte-content). γ-style `ad7a5152` marker + α-path 双 commit per Task 17 round 2 `3bb5cd1c` precedent
- **处理**: 8 governance queue 第 8 entry NEW (Plan Opus 跨 system / path / state assumption 必先 CC dump 实证) 入下次 governance commit batch atomic decide
- **外化锚**: `ad7a5152` 本 commit body Self-flag 段 + Phase D-3b 对话 §F Stage 1 fail-loud + CC dump output (lines 14-22 §1 / line 47 §3 D-2 / lines 137-153 §4'' / line 214 §8 HEAD / line 218 §9) + Plan Opus α′ corrected single-bundle

### 7.22 Phase D-4 batch entry CC Stage 0 dump batch-level pre-empt + plan patch v9 D89 候选 second live demo (2026-05-11)

- **触发**: Phase D-4 batch L2 multi-task 启动 ritual Stage 0 + CC dump §Task 20+21+22 plan + schema fields (D89 候选 first batch-level 应用 — Plan Opus 跨 system / path / artifact 假设必先 CC dump 实证) → CC 实证 catch 3 task 异质 drift 量:
  - **Task 20 split-bills**: schema 全对齐 plan heredoc, FK 双形 + Unchecked branch direct + D56 model 完整, **0 修复** (Task 19 PaymentItem 同模式复用一致性验证)
  - **Task 21 menu**: type 对齐 + **semantic update-path 缺字段保留** — Category 缺 nameEn + quickTags / MenuItem 缺 nameEn + descriptionEn + originalPrice / MenuItemOption input shape 缺 nameEn?, **需 plan patch v9 修复** (4 hunks 12+/1-, semantic data-loss bug 防御)
  - **Task 22 staff**: **3 处 major drift** — roleId NOT NULL (TS2322 predict) + TimeEntry 字段 4 处 mismatch (userId→staffId/clockIn→clockInAt/clockOut→clockOutAt/duration NOT 存在) + 决策点 G "duration in repo persistent column" 错位 (schema 无 duration 列) → 重定义为 "duration in repo's RETURN shape" compute on-the-fly + Printer model 名称 + 字段 + @@unique 缺, **升 L1 拆 D-5 batch** (plan patch v10 future)

- **D89 候选 second batch-level 应用 demo first** — 6+ 字段 drift catch in spec 写作前 (vs Task 17 第 6+7 数据点 fail-loud forward-fix 重发模式, vs Task 18 #30 防御层 first live demo 单 task pre-empt). **Batch-level pre-empt 节省**: 3 task × 2-3 turn forward-fix round-trip ≈ 6-9 turns 总省, 移给 spec 写作前 1 turn CC dump cost. **Plan Opus 路径选择** (3 options α / β-modified / γ) **Ian 明批 β-modified path** (Task 20+21 D-4 L2 batch / Task 22+printer 拆 D-5 L1 batch) — 节奏建议 strict adherence first live demo.

- **DP7 path 假设 self-application** — Plan Opus D-4 closure prep Round 1 pre-dump 假设 Snapshot path = `docs/handoff/phase-5-state-snapshot.md`, CC dump 实证 = `./docs/superpowers/archive/phase-5-state-snapshot.md`. **D89 候选 self-application first** — Plan Opus 引用 file path 凭 project_knowledge 索引印象 (索引 stale 或 path 假设凭 default 命名空间), CC dump catch 路径 drift. 内化原则: 所有 path 引用 spec 写作前必 grep 实证, 不凭 project_knowledge 索引快照 (索引可能 stale OR Plan Opus 凭 default 命名空间映射, 与 #14 Mode C stale handoff 同构 + #22 Snapshot 环境状态片面 同构).

- **谁拦**: CC Stage 0 dump batch-level catch (3 task × multi-field) — **D89 防御层 batch-level 升级版** (#30 防御层 task-level 之上). Plan Opus 路径选择 → Ian 明批 → plan patch v9 land → Task 20+21 L2 batch 三步走 0 真 fail-loud / 0 暂停 / 0 forward-fix. **Defense-in-depth**: CC dump (第 1 层) → Plan Opus α/β/γ 决议 (第 2 层) → Ian 明批 (第 3 层) → CC fail-loud (第 4 层兜底, 未触发).

- **处理**:
  - Plan patch v9 `06a746d7` 4 hunks land Task 21 update-block 字段保留 (本 batch land)
  - Task 22 + printer 附录 升 L1 拆 D-5 batch — plan patch v10 future (Task 22 roleId required + TimeEntry 字段 rename + 决策点 G refresh schema-migration-avoiding + Printer model rename + findFirst)
  - **D89 升格判** 入下次 governance commit batch atomic decide (4 live demos Task 18/19/20/21 + Cat 5 trend 8 数据点 含 DP6+DP7 + plan patch v9 batch-level 应用 demo + Type β 子类附加数据点 — 升格条件 ripening)

- **外化锚**: `06a746d7` plan patch v9 commit body 4 hunks detail / `cf46f1c5` Task 20 commit body G-T20.10 XOR predict + #30 防御层 third live demo / `aaf9fa79` Task 21 commit body #30 防御层 fourth live demo + post-v9 patches incorporated detail / `ffc7719f` 本 closure commit body §7.22 元层 ack + 路径修正 DP7 self-application 数据点 / 本 §7.22 entry 元层

### 7.23 Phase D-5 batch entry pre-flight CC dump 应用 + DP8 formal entry (D89 候选 third batch-level live demo, 2026-05-11)

- **触发**: Phase D-4 batch closure 后 Ian 主动 raise "content > date" 原则 — April-era plan files (`phase-d-repositories.md` Task 22 段 + Phase E 回填附录 5 printer 段 + `phase-d-repositories-part2.md` Task 23-26) 可能与现行 schema drift (7+ 个月 sync gap + Ian 暂离 Project 期间 schema 增量演化). Plan Opus pro-active D-5 batch entry pre-empt CC dump (**D89 候选 batch-level 应用模式 third live demo** — Phase D-4 entry first / D-5 entry pre-flight second / 本 sweep third + Phase D 期 first proactive Ian-suggested cross-task scope sweep).

- **CC dump scope** (5 段, comprehensive sweep):
  - §A: `phase-d-repositories.md` Task 22 staff.ts plan段
  - §B: `phase-d-repositories.md` Phase E 回填附录 5 printer plan段
  - §C: `schema.prisma` Staff + TimeEntry + Role + Printer 全字段 enum
  - §D: `phase-d-repositories-part2.md` Task 23-26 plan段 light scan
  - §E: `schema.prisma` Coupon + Waitlist + PlatformAuditLog + PlatformAdmin 全字段 enum

- **D-5 batch immediate drift catalog** (Task 22 + 附录 5, **10 patches for plan patch v10**, Snapshot §9.1 carry-forward 已部分覆盖, 本 entry 补充 NEW 细节):

  **Task 22 staff.ts (5 patches)**:
  1. `roleId?: string` create sig + `roleId: data.roleId ?? null` → required `roleId: string` (no `?? null` fallback) — TS2322 risk if not fixed
  2. `findActiveTimeEntry(userId, ...)` + `where: { userId, clockOut: null }` → rename param + field `userId` → `staffId` (schema `staffId String @map("staff_id")`)
  3. `clockIn` / `clockOut` 全场 → `clockInAt` / `clockOutAt` (schema `clockInAt DateTime` / `clockOutAt DateTime?`); **word-boundary sed risky** (`clockIn` 子串 `clockInAt`), 用 `\bclockIn\b` ERE regex 或 manual Edit
  4. `duration: null` writes in `createTimeEntry` + `duration: durationMin` in `closeTimeEntry` → remove writes (schema 无 duration 列)
  5. 决策点 G: "duration computed in repo (business invariant)" → refresh "duration in RETURN shape" compute on-the-fly via `clockOutAt.getTime() - clockInAt.getTime()` mapper (listTimeEntries 返回 shape derived field, NOT persisted column)

  **附录 5 printer.ts (5 patches, **NEW 细节超 D-4 batch entry catch**)**:
  6. `model PrinterConfig` references + type imports + `db.printerConfig` accessor → rename throughout to `Printer` / `db.printer` (schema `model Printer / @@map("printers")`)
  7. Fields rename: `ipAddress` → `host` / `enabled` → `isEnabled` / `paperWidth` 字段全删 / **ADD `type: string` required (NEW NOT 在 D-4 batch entry catalog — schema `type String` required no default, caller 必传, 同 PlatformAdmin.role pattern)**
  8. `findByStoreId` 用 `findUnique({where: {storeId}})` → 改 `findFirst({where: {storeId}})` (schema 只 `@@index([storeId])` NOT `@@unique`)
  9. `upsertConfig` 用 `upsert({where: {storeId}, ...})` → 改 manual `findFirst` + `create` OR `update` 分支 (schema-migration-avoiding D89 self-application). **NEW: 改 multi-step → `db: Db` 签名必改 `tx: Prisma.TransactionClient` per D55 多步 tx 编译期强制** (D-4 batch entry 未抓此 implication)
  10. Defaults: keep `name: 'Default Printer'` default / drop `paperWidth: 80` default

- **Future batches drift findings** (Task 23-26 D-5b/c/d, **4 patches for plan patches v11/v12, NEW 全新 from light scan**):

  **Task 24 coupons.ts (1 patch)**:
  - `findActiveByCode` query `where: { code, active: true }` → schema field `isActive Boolean` (TS2353 if not fixed). Rename `active` → `isActive`

  **Task 25 waitlist.ts (1 patch)**:
  - Plan `add()` 签名含 `estimatedWait: number` 参数, schema `WaitlistEntry` 字段 list 无 `estimatedWait`. **决议: β-path drop `estimatedWait` from `add()` 签名** (schema-migration-avoiding per Mode C δ 桶 4 "次要扩展" 🔵 delegated Phase H/I 已 governed-by-existing — NOT 新 Ian 明批, Exception Trigger 1 NOT 触). Plan commentary line ~645 原 "建议仍为 Int?" 是 April-era suggestion, schema 实际未 follow through, Mode C δ 桶 4 deferral 取代

  **Task 26 platform-admin.ts (2 patches)**:
  - Plan `createAdmin` 签名含 `displayName?: string | null` — schema `PlatformAdmin` 无 `displayName` 字段 (TS2353), drop from signature
  - Schema `PlatformAdmin.role String` 必填 — plan `createAdmin` 不传 `role` (TS2322), 必加入签名 (推荐 caller 必传, 同 Printer.type + Task 22 roleId pattern一致)

  **Task 23 roles.ts cross-task informational (0 patches, verify only)**:
  - Plan imports `Permission` from `@qr-order/shared` — verify `shared/index.ts` exports `Permission` type at Phase G/E 启动期, NOT plan patch scope

- **Schema-migration-avoiding path applied (D89 self-application continuity)**:
  - Task 22 duration: compute on-the-fly in return shape (no schema add) ✅ — 决策点 G refresh
  - Printer @@unique: findFirst + create/update (no schema add) ✅
  - Task 25 estimatedWait: drop from signature (Mode C δ 桶 4 governance) ✅
  - 全 path B 一致, NOT 触 Exception Trigger 1 (schema migration)

- **DP8 formal entry** (D-4 closure Round 3 spec §3 meta-reference `<round 2 SHA>` literal sed double-replace self-referential artifact — Type β 子类 carry-forward, 同质于 §3 line 51 Task 19 round 2 历史 artifact "replace ad7a5152 with actual SHA ad7a5152"):
  - Pattern: Plan Opus 写 spec 描述某 forward-fix 操作时, 描述文本含该操作的字面目标 token, sed 双 replace, 留 awkward 半 redundant 文本
  - Round 4 D77 forward-fix (CLOSURE_SHA_PENDING → ffc7719f) 同 pattern 复现 (e.g. "(D77 forward-fix CLOSURE_SHA_PENDING → 实际 SHA Round 4)" → "(D77 forward-fix ffc7719f → 实际 SHA Round 4)"), 接受 as documentation trace 保留 governance trace 完整性
  - **内化原则**: spec writing 描述 sed/Edit 操作时, 避免在描述文本内 verbatim 引用操作 source/target literal — 或预期 double-replace 接受 artifact

- **D89 候选 third batch-level live demo + DP9 NEW informational subordinate** (Task 23-26 light scan 4 NEW drifts catch — D89 path B forward investment scope 扩展, 相同 root cause family with DP6/7/8 = "Plan April-era assumption vs schema evolution drift"): **NOT 升级 Cat 5 9+1=10 by DP9** (informational subordinate 同 root cause, 不独立 data point). **Cat 5 trend 9 数据点 base 维持** (DP1-DP5 base 5 + DP6+DP7+DP8 = 8... 实际 base count Cowork workspace path + Helper Round 2 + 4 Phase D-2 期 = 6, + DP6+DP7+DP8 = 9), D89 升格条件继续 ripening (3 batch-level live demos accumulated).

- **处理 path**:
  - **本 closure docs commit** 加 §7.23 NEW (governance trace) + §1 Cat 5 trend 8 → 9 (DP8 formal entry)
  - **Plan patch v10 spec 写作 deferred 下次 session** (Phase D-5 batch L1 启动期) — Plan Opus 读 §7.23 + 自身 CC dump literal text 补充后写 v10 spec (Task 22 + 附录 5, 10 patches) → Ian 明批 → CC land → Task 22 L1 work-log. "L1 task 跨 ≥ 3 session, 注意力质量 > 时间压缩" 节奏建议 strict adherence
  - **Plan patches v11/v12 spec 写作 deferred D-5b/c/d batch 启动期** — 各 batch entry pre-empt 应用 (Task 24 / Task 25 / Task 26 patches 各 batch land)

- **外化锚**: `7ec04772` D-4 closure round 2 commit body Cat 5 9 数据点 + DP8 commit body ack / 本 §7.23 entry 元层 ack (DP8 formal entry + Task 22-26 drift catalog) / Snapshot §9.1 plan patch v10 scope carry-forward (本 entry 补充 Printer.type required + upsertConfig db→tx NEW 细节) / 下次 Plan Opus 收 §7.23 + 自身 CC dump literal text 补充后写 plan patch v10/v11/v12 spec

---

## 8. 环境状态(全 stack,响应 #22 + Phase C 完成 + Time Machine restore 后状态)

### Docker 容器全量

| 容器 | image | Port 映射 | 状态 (本 v5.0 regen 时点) | 用途 |
|---|---|---|---|---|
| `qr-order-pg` | postgres:16-alpine | 5432:5432 | Up (Time Machine restore 后 Ian `docker compose up` 重起) | Daily dev stack 主 postgres(legacy schema, 有测试残留数据 §7.8) |
| `qr-order-server` | local build | 3001:3001 | Up | Daily dev server(JsonStore 模式), Phase B Step 9 验收使用 |
| `qr-order-nginx` | nginx | 80:80 | Up | Daily dev reverse proxy |
| `qr-order-adminer` | adminer:latest | 8081:8080 | Up | Daily dev DB GUI |
| `postgres-seed-test` | postgres:16-alpine | 15432:5432 | Up (Task 10 Stage 1 重建 + Time Machine 后 Ian 重起) | **Phase B acceptance 证据** —— 全 Phase B schema(4 migration)+ 完整 seed |
| `qr-order-postgres-test` | postgres:16-alpine | 5433:5432 | Down (Phase C 完成 Step 5 cleanup, `pnpm test:db:up` 重起 / Phase D test 期消费) | Phase C 测试 DB γ3c tmpfs (4 migrations apply + dual-URL identity model + adminDb TRUNCATE) |

**关键**: qr-order-pg / postgres-seed-test / qr-order-postgres-test 三容器并存, 数据彼此隔离(不同 volume + 不同 port + 不同 DB user 配置). Phase D Repository 实施期 Stage 0 verify `qr-order-postgres-test:5433` (`pnpm test:db:up`) 起容器后跑 integration test.

### 文件状态

| 项 | 状态 | 备注 |
|---|---|---|
| `docker-compose.yml` | 保留现状未改(Task 10 α.3) | 4-service 定义(postgres/server/adminer/nginx) |
| `docker-compose.test.yml` | Phase C Task 11 + fix `0b070a92` 落定 | qr-order-postgres-test (postgres:16-alpine + tmpfs + DB name `qr_order` cross-phase align) |
| `.env.example` | Task 10 新建(aspirational) | Phase J Task 48 ALTER ROLE 时实际生效 |
| `server/eslint.config.mjs` | Task 10 新建(ESLint 9 flat) | `@typescript-eslint/no-floating-promises = error` |
| `server/.eslintrc.*` | 不存在 | (Task 10 Branch C 选 flat config) |
| `server/package.json` | Task 10 加 ESLint deps + Task 11 加 test:db:* scripts + Task 14 加 test:db:migrate / test:integration scripts (`f49139a0` v7) | eslint@^9 + @typescript-eslint/parser@^8 + eslint-plugin@^8 + vitest@^4 (lockfile aligned) |
| `server/prisma/seed.ts.pre-phase5` | untracked | Phase I `_archive/` 归档 (§7.2) |
| `server/prisma/seed.ts` | Task 9a + 9b 完整 | platform admin + demo store + ModuleLicense + roles + owner + menu + tables (D81 候选 ALL_MODULES hardcode §7.14 内入 4 surface) |
| `shared/modules.ts` | Phase B 期 `310f43ff` 单一 commit | 52 lines / 5 exports (MODULE_REGISTRY + ALL_MODULE_PERMISSIONS + ModuleId + getModulePermissions) / 6 modules × 14 permissions |
| Prisma Client types | 已最新 | Task 9a Stage 4c regenerate, post-schema |
| tsc baseline | 103 errors(pristine HEAD, v3/v4 drift 修正) | Phase B/C Task 每次 verify "touched files 内 0 new errors" |
| ESLint `no-floating-promises` baseline | 0 errors | Task 10 Stage 6 验证 |
| `server/src/repositories/store.ts` | Phase D Task 16 `019ab826` | Phase D 第 1 个 repo, withSystemContext 4 wrapper validate |
| `server/src/repositories/orders.ts` | Phase D Task 17 `ff5e881b` | B2 核心 repo (10 methods 5 reads + 5 writes, D55+D56+D57+D68 首落 + D23/D24/D30 应用, α + α-extended forward-fix) — Phase G Task 34 session-cart B2 重写 foundation contract |
| `server/src/repositories/sessions.ts` | Phase D Task 18 `cb2efd5e` | 业务 source of truth (8 methods 3 reads + 5 writes, D55 + D13-adjacent + 双向 FK 一致性 Session.tableId ↔ Table.currentSessionId 同 tx) — Phase G Task 33+ session-cart B2 重写 foundation contract + #30 防御层 first live demo work-as-designed |
| `server/src/repositories/payments.ts` | Phase D Task 19 `a7752a30` | D56 in payment scope 首落 + Stripe 真钱 idempotent (7 methods 5 reads + 2 multi-step writes, D55 + D56 + D56 核心 derivePaidQuantityByOrderItem Map aggregate + Stripe webhook idempotent contract line 1031) — Phase G Task 35/36 settlement gateway / webhook handler 直接消费 + #30 防御层 second live demo + Cat 5 子项 5 数据点 trend rising |
| HEAD == origin/main | ✅ `ad7a5152` | Phase D-3b Task 19 closure α′ atomic absorb — payments.ts D56 in payment scope 首落 + Stripe 真钱 idempotent + Task 18 deferred Snapshot 增量 catch-up. Snapshot §8 HEAD SHA 每对话收尾增量 Edit 同步 (§7.9 pattern Phase 封顶 regen reconcile 已内化机制, 不再单独登记)。 |

### Shell / OS 环境状态 (post-Time Machine restore)

- **DATABASE_URL / TEST_DATABASE_URL / TEST_ADMIN_DATABASE_URL**: 未持久 export 到 Ian 的 shell(Bash 工具 session 独立), 下对话需 re-export. Phase C Task 14 dual-URL pattern (`TEST_ADMIN_DATABASE_URL` 后台用 / `TEST_DATABASE_URL` runtime 身份)
- **Docker Desktop**: Running (Time Machine 还原后 Ian 一手 `open -a Docker` + `docker compose build` 重起, §7.15 数据点 1)
- **server/node_modules**: 完整 (Time Machine 还原后 Ian 一手 `pnpm install --frozen-lockfile` 修复 vitest binary, §7.15 数据点 2). `vitest@4.1.2 darwin-arm64 node-v24.6.0` lockfile aligned
- **Mac 硬件**: 运行中 (Logic Gate 故障已通过 Time Machine 还原修复)
- **`@types/bcryptjs`**: 不需要(bcryptjs v3+ bundled types, Task 9a Stage 0.3 check 已删除)
- **`pre-phase-5-demo` branch**: 存在 origin (从 `bed2b504` Phase B Task 2 改动前最后纯 docs commit checkout), 本地无 tracking. Demo Planner handoff (`emergency-demo-planner-handoff.md`) 已产出, demo session 启动 ritual 待 Ian 触发 (与 Phase 5 main scope 完全隔离)

---

## 9. 下一对话第一件事 (Phase D-5a Task 22 Step 3 impl spec produce)

### 9.1 Phase D-5a Step 3 impl spec 启动 scope

**Phase D-5a 进度**: Task 22 staff.ts Step 1 work-log docs commit `2590ab04` ✅ + closure handoff `73d5c225` ✅. Step 3 feat impl 待启动 next session.

**Phase D = 11 个语义化 Repository 重构** (`phase-d-repositories.md` Task 16-22 + `phase-d-repositories-part2.md` Task 23-26 + Phase E 回填附录 5 printer.ts). 进行中 6/11 land + Task 22 Step 1 docs land: Task 16-21 ✅ + Task 22 staff.ts Step 1 work-log docs `2590ab04` ✅ (Step 3 feat impl pending).

**Phase D-5a Step 3 启动 trigger** (post Phase D-5a Step 1 closure handoff `73d5c225`):

- Step 1 work-log `2590ab04` 含 12 methods Staff + TimeEntry coverage (4 reads + 8 writes 含 Phase E 段 3b 回填 5 methods) + 5 维度 pre-verdict 全 Pass + 风险 A/B/C/D + Stage 0 G-T22.1-10 grep set + §6 D88 维度 3 self-audit 13 anchor + §7 D89 mandate self-audit (1 ⚠️ gray-area flag at schema field literals — L3 tier-3 verify gate deferred to Stage 0 G-T22.2 @ Step 3 execution)
- D91 候选 propose (Ian Observation 1 post-Step-1-land trigger) — Plan Opus spec writer expected-output minimization principle, D89 sub-rule extension. `2590ab04` §2 G-T22.2 pre-write 作 1st live precedent data point (γ path 决议 forward-only, NOT retro-amend per D77 spirit)
- Ian 4 决议 ack (γ path + D91 候选 register C + Helper skip + Step 3 GO)
- Plan Opus attention budget self-assessment recommend defer Step 3 impl spec to next session per Project Instructions "L1 task 跨 ≥ 3 session, 注意力质量 > 时间压缩" → closure handoff `73d5c225` land 后 Step 3 next session (attention fresh baseline)

**Step 3 impl spec scope** (next session Plan Opus produce):

- Stage 0 CC pre-flight verify (D89 + D91 strict apply): HEAD verify post-`73d5c225` + schema Staff/Role/TimeEntry 全字段 CC dump (G-T22.2 carry-forward, L3 tier-3 verify gate fulfillment) + plan v10 file anchor (Task 22 段 line 1442-1622) + tsc baseline N1=103 + Prisma client types
- Stage 1 heredoc write `server/src/repositories/staff.ts` (~135 lines per plan v10 heredoc post-land)
- Stage 2 tsc filtered=0 + N1=103 baseline maintain (D83 diff=0)
- Stage 3 D75 + D76 + D86 staged
- Stage 4 Snapshot 增量 atomic absorb (Task 17/19 α′ precedent): §1 / §3 commit chain / §4'' Phase D 7/11 + §9 整节重写 D-5a' printer 附录 启动 ritual + §10 v5.X+3 批
- Ian 明批 → CC 执行 → Task 22 closure → printer 附录 L1 spec → CC 执行 → D-5 batch closure

### 9.2 启动 ritual (Phase D-5a Step 3)

1. **读** (按顺序):
   - 本 Snapshot live 增量, HEAD post-`73d5c225` (Phase D-5a Step 1 closure handoff)
   - `phase-5-fabrication-archive.md` (27 条 land + #28/#29/#30/Cat 5 9 数据点 + D89 formal land baseline + D91 候选 1 数据点 — 全入下次 governance commit batch atomic decide)
   - `phase-5-governance-digest.md` (含 D89 formal entry §6 + Pre-Flight Checklist §7; D91 候选 not yet formal, queue in Snapshot §1)
   - `phase-d-repositories.md` (Task 22 staff.ts 段 line 1442-1622 + Phase E 回填附录 5 printer.ts 段 post plan-patch-v10 land)
   - Phase D-5a Step 1 work-log `docs/superpowers/work-logs/2026-05-14-phase-d-task-22-staff-l1-verify.md` (447 lines) + closure handoff commit body `73d5c225`

2. **CoT 输出** Phase D-5a Step 3 scope 理解 + Phase B+C+D 1-6 + Task 22 Step 1 carry-forward ack + **D89 mandate inline strict apply** 内化 (post-formal-land second spec apply) + **D91 candidate inline strict apply** 内化 (NO pre-written "Expected fields" / "Expected output" for CC-dump-derived content; defer expected output decision to consume-dump step)

3. **Stage 0 CC pre-flight verify** (D89 + D91 strict): 本 turn 起 CC bash dump (Condition A satisfaction) — HEAD + git log + schema Staff/Role/TimeEntry + plan v10 Task 22 段 line range + tsc baseline. Plan Opus consume dump → judge alignment with plan v10 heredoc. NO pre-write "Expected" in Step 3 impl spec; spec instructs CC dump + report.

4. **Step 3 impl spec produce → Ian 明批 → CC 执行**: Stage 0 CC pre-flight + Stage 1 heredoc + Stage 2 tsc + Stage 3 D75/D76/D86 + Stage 4 Snapshot 增量 atomic absorb single commit. 不直接起 CC 执行消息 在 Step 3 启动期; Ian 明批 spec GO 后才进入 CC 执行消息.

5. **Helper async review trigger** (post-Step-3-impl-land — Helper attention focus 集中 to Step 3 high-value 12 methods review): Step 1 work-log Helper skip 决议 carry-forward. Step 3 impl land 后 Ian Desktop App copy fresh state → Helper Opus review → return flags → Plan Opus α/β/γ 决议 (Patch B 模式 if flags trigger spec amendment per D90 候选 Mode 1 + Helper protocol 1/2/3).

6. **printer 附录 L1 spec** (post-Task-22 closure): 附录-direct 创建 (NOT Phase D numbered task), 同 D-5 batch. Schema mismatch 决策点 (a) 加 @@unique migration vs (b) findFirst plan-level fix — plan patch v10 已选 (b) schema-migration-avoiding. L1 spec full 5 维度 + Stage 0 G-printer.1-N + Helper cross-instance review.

### 9.3 不变项 carry-forward (Phase D 1-6 + Task 22 Step 1 累积)

- D75 数据 guard (`[ -s file ]` 后置) — 6 task + Step 1 docs land 0 fail
- D76 push + origin SHA verify — 6 task + Step 1 docs land 0 fail
- D77 forward-fix 模板 (不 amend pushed commit) — Task 17 `3bb5cd1c` + Task 19 `c1b123fb` + D-4 closure `ffc7719f` + D89 升格 `1d93e4af` + closure handoff `73d5c225` Round 2 placeholder replace reuse
- D88 维度 3 anchor literal grep 实证 — Phase D-2 起 5+ live applications + Step 1 work-log §6 13 anchor self-audit
- **D89 mandate inline strict apply** (post-formal-land first spec live field test 1 data point Step 1 work-log; Step 3 = 2nd) — Condition A 本 turn CC dump OR Condition B 本 chat self-produce; neither → 必先 query CC dump 后再产 spec
- **D91 candidate inline strict apply NEW** — NO pre-written "Expected" for CC-dump-derived content; defer expected output decision to consume-dump step (Step 1 §2 G-T22.2 sub-violation lessons-learned baseline)
- D86 language-layer self-check — 6 task + Step 1 docs land 0 violation
- 规则 8 暂停 — Phase D 累积 0 critical fabrication 逃逸
- D55 / D56 / D57 / D68 D 决议遵守 — Phase D 6 repo + Task 22 期 (D55 closeTimeEntry read-guard NOT trigger 一致 Snapshot §7.23 reasoning) 全应用
- 规则 3 写 db 必填 / 读默认 prisma — Phase D 6 repo + Task 22 期 全应用
- 4 件 handoff 文件 live 增量, Phase 封顶 regen (Phase D 封顶 = Task 26 + printer 完成时 regen)

### 9.4 关键 grep 清单 (Phase D-5a Step 3 启动期)

Step 1 work-log §2 G-T22.1-10 grep set carry-forward (CC pre-flight 执行期实证):

**G-T22.1**: plan v10 file anchor verify Task 22 段 line 1442-1622 + 附录 5 line 1659-1745

**G-T22.2**: schema Staff + Role + TimeEntry 全字段 enumeration (D89 mandate L3 tier-3 verify gate 履行, fresh from CC dump NOT §7.23 captured — D91 strict: NO pre-write expected, CC dump report → Plan Opus consume)

**G-T22.3**: HEAD verify post-`73d5c225` + commit chain Phase D-5a 段 verify

**G-T22.5**: tsc baseline N1=103 maintained (D83 diff=0)

**G-T22.10**: Prisma XOR predict (Stage 2 tsc filtered=0, carry-forward Task 17-21)

### 9.5 不启动原则 (Phase D-5a Step 3 期)

1. 读完 ritual (9.2) → CoT 输出 Phase D-5a Step 3 scope 理解 + Phase D 1-6 + Task 22 Step 1 carry-forward ack
2. Stage 0 CC pre-flight verify (D89 + D91 strict): 本 turn 起 CC dump (Condition A satisfaction)
3. Plan Opus consume CC dump output → judge alignment, decide patch necessity (plan v10 heredoc 是 ground truth source, Plan Opus reference NOT invent)
4. Step 3 impl spec produce: Stage 0-4 single commit → Ian 明批 → CC 执行
5. **不直接起 CC 执行消息** 在 Phase D-5a Step 3 启动期; Ian 明批 Step 3 spec GO 后才进入 CC 执行消息

### 9.6 Phase D-5a Step 1 closure handoff 记录 (供 Phase D-5a Step 3 Plan Opus 理解协作节奏)

Phase D-5a Step 1 (Task 22 staff.ts L1 verify work-log docs commit + Ian 4 决议 + closure handoff `73d5c225`):

- 2 commits: Step 1 work-log docs `2590ab04` + closure handoff `73d5c225` (+ D77 forward-fix Round 2 placeholder replace mini-commit)
- 0 规则 8 暂停 / 0 真 fail-loud / 1 D91 sub-violation Step 1 work-log §2 G-T22.2 ack via Ian Observation 1
- Ian observations + 4 决议: D91 候选 propose + γ path forward-only for `2590ab04` + D91 候选 register C path + Helper skip per Default Push Forward Rule 2 + Step 3 defer per Plan Opus attention budget self-assessment
- 2 CC clarification request (L3 Defense-in-depth tier work-as-designed): #1 handoff commit body spec gap (explicit Snapshot patches missing) → Plan Opus α path explicit patches; #2 Patch C1 heading-only vs commit body "§9 整节重写" inconsistency → Plan Opus produce complete §9 content, single atomic Round 1, §9 整节 str_replace CC-sourced old_str

**Fabrication 拦截统计 (Phase D-5a Step 1 累积)**:

- Ian 一手 (raise): 1 次 (Ian Observation 1 D91 候选 propose)
- CC grep / tsc / runtime fail-loud: 0 次 (Step 1 期 0 真 fail-loud)
- CC clarification request: 2 次 (#1 handoff commit body spec gap + #2 commit body "整节重写" vs Patch C1 inconsistency — L3 Defense-in-depth tier work-as-designed for Plan Opus spec gap subtype 2 consecutive live demos)
- Plan Opus 自审: 0 次 (Step 1 work-log §2 G-T22.2 D91 sub-violation 由 Ian 拦, NOT Plan Opus 自审)
- Helper Opus 跨 chat raise: 0 次 (Helper review skip for `2590ab04` per Default Push Forward Rule 2)

**协作节奏观察**:

- **D89 mandate inline self-application first post-formal-land spec live field test** (with 1 gray-area sub-violation) — Step 1 work-log §7 Self-audit 13 anchor 9/10 ✅ + 1 ⚠️ gray-area (schema field literals 凭 §7.23 captured). Ian Observation 1 deepen gray-area → D91 候选 propose.
- **CC clarification request 2 consecutive L3 Defense-in-depth catches** — #1 spec gap (explicit patches missing) + #2 commit body factual integrity (整节重写 vs heading-only). CC role "执行 spec / 绝不 unilateral" hold the line work-as-designed. Plan Opus α path 2 次 produce explicit content per D89 升格 atomic batch precedent extended.
- **Plan Opus attention budget self-assessment honest call** — defer Step 3 to next session 是 Project Instructions 节奏建议 strict adherence. Plan Opus self-blind 时 Ian raise + CC clarification + 自评估 triple safeguard.


## 10. 当前修订轨迹

- **2026-04-20 首版**: Task 8 impl + Task 9a 完整。
- **2026-04-21 v2 regen** (Phase B Task 10 完成后): Phase B 10/10 收尾里程碑.
- **2026-04-21 A 路径切换 + Phase C Batch 1 收尾增量 Edit**: 顶部声明从"覆盖式,每对话全文重写"改为"live 增量维护,Phase 封顶 regen". 理由: regen 过程本身是 fabrication 高发时点(#24 原型教训),增量式对齐 Archive/Digest 三文件机制一致性.
- **2026-04-21 D2 下对话启动指引补丁**: §9 整节重写 Phase C Batch 2 启动指引 (Task 14 only, L1 最严单独跑).
- **2026-04-21 v4.4 批 (Phase C Batch 2 plan patch v5 `ca863caa` 后续治理更新)**: §6 D85 + D86 / 同期 Digest §6 新增 D85 + D86 / Archive #26 追加 (D86 语言层自违反首次登记).
- **2026-04-21 Task 14 L1 verify work-log 产出 (`efa3d2e9`)**.
- **2026-04-21 v4.5 批 (Phase C Batch 2 Task 14 closure, `308f7d54` feat commit 后)**: §1 时点 / §2 Phase C 行 / §3 Batch 2 段 / §8 HEAD SHA / §9 整节重写 Phase C Batch 3 (Task 15) 启动指引.
- **2026-04-21 v5.0 全文 regen (Phase B 10/10 + Phase C 5/5 双封顶里程碑节奏点, 本 commit)**:
  - 顶部声明保留 (live 增量 + Phase 封顶 regen 哲学)
  - §1 时点更新 / HEAD `035cdee2` / Phase C 5/5 完成 / 下一对话目标 Phase D 启动
  - §2 Phase C 行状态 → 完成 / Phase D → 待启动 (下对话第一目标)
  - §3 commit 链追加 Phase C Batch 3 段 3 commits (`035cdee2` + `aea392ff` + `00558997`) + 保留 Batch 1/2 段 + Phase B 段
  - §4 Phase B 完成总览保留 + 新加 §4' Phase C 完成总览节 (5 task SHA 链 + Acceptance 证据 + L1 最严 review 节奏 live precedent)
  - §5 Mode C 状态保留 (Phase C 全程 verify 桶 2/4 无阻塞)
  - §6 D 候选 18 → 19 (加 D88 候选: Plan Opus spec value-density self-audit + anchor literal grep 实证 4 维度, Helper raise 修正版 + 本对话 2 次同模式 fabrication 触发)
  - §7 pending drifts reconcile (清 7.9-7.12 已内化项, 加 7.13-7.15 Phase C Batch 2/3 期登记: phase-c-test-db.md spec §4.4 aspirational naming reconcile / D81 landscape 4 surface / Time Machine restore env gap 2 数据点)
  - §8 全 stack 重新 audit + HEAD `035cdee2` + qr-order-postgres-test Phase C 完成 down 状态 + Time Machine restore 后状态 + `pre-phase-5-demo` branch origin 存在 (本地无 tracking, demo 与 Phase 5 main 隔离)
  - §9 整节重写 Phase D Repository 启动指引 (Task 16 第一个 task / Stage 0 carry-forward Phase B+C 完整 / 关键 grep G-D16.1-4 / 不启动原则 + L1/L2/L3 review 级别 batch 切分启发)
  - §10 本条目 + Phase C 封顶 closure 记录 §9.7
  - 触发事件: Phase C Batch 3 Task 15 (`035cdee2`) feat commit land + 5/5 tasks Phase C 封顶 + 本对话 governance 增量 (2 处 Plan Opus spec 内部不一致 forward-fix + D88 候选修正版 + Time Machine env gap 2 数据点 + Archive #25 third data point + D81 landscape 4 surface 扩展)
  - 同期 Archive §3.5 v5 批追加 #27 (Plan Opus spec 内部不一致同模式 2 数据点) / 总 25 → 26 (#26 D86 语言层自违反 + #27 Plan Opus spec writer anchor literal 凭印象 双数据点合并独立编号) wait, 26 → 27, count update
  - 同期 Digest §6 新增 D88 候选 + §10 v5.0 修订条目 (与 Snapshot v5.0 同节奏点合并产出 Phase D 启动前)
  - **本对话窗口 β 路径**: Snapshot v5.0 + Archive #27 本窗口产出. Digest D88 + Phase D 启动指引 ritual 下窗口 (新 Plan Opus chat instance) 产, 与 Phase D Task 16 启动期合并.

---

- **2026-05-11 v5.X 批 (Phase D-4 batch closure — Task 20 split-bills + Task 21 menu + plan patch v9, `ffc7719f` closure docs commit)**:
  - §1 时点 / HEAD aaf9fa79 / Phase D 6/11 / 累积 governance queue update (D89 升格判 + Cat 5 trend 8 数据点 含 DP6+DP7 + Stripe DNS P0 凭据泄漏 informational)
  - §3 commit 链 Phase D-4 batch段 prepend (3 commits + closure commit, L2 multi-task batch 三步走模型首次 live demo + #30 防御层 fourth live demo + D89 候选 second batch-level 应用 demo) + `c1b123fb` placeholder 3 occurrences forward-fix → `c1b123fb` replace_all (D77 carry-forward from Task 19 round 2)
  - §4'' Phase D 完成总览 heading 2/11 → 6/11 + Task 20 row (`cf46f1c5`) + Task 21 row (`aaf9fa79` + plan patch v9 `06a746d7`) + Acceptance bullets 5 新条目 (Phase D 6/11 land + #30 防御层 fourth live demo + D89 ripening + L2 batch first live precedent + plan patch v9 update-block 防御)
  - §7.22 NEW Phase D-4 batch entry CC Stage 0 dump batch-level pre-empt + plan patch v9 D89 候选 second live demo first + DP7 path 假设 self-application
  - §9 整节重写 Phase D-5 batch L1 启动 ritual (Task 22 staff.ts + printer 附录 + plan patch v10 first, 决策点 G refresh "duration in RETURN shape" schema-migration-avoiding)
  - §10 本条目
  - **触发事件**: Phase D-4 batch closure (3 commits + 0 暂停 / 0 真 fail-loud / 0 forward-fix) + D-4 batch entry CC dump pre-empt + plan patch v9 land + Task 20+21 L2 batch 串行 + L2 → L1 升级 trigger fired (Task 22 + printer 拆 D-5 batch) + DP7 path 假设 self-application
  - **同期 Archive 候选累积**: #28/#29/#30/Cat 5 8 数据点含 DP6+DP7 + D89 升格判 — 全入下次 governance commit batch atomic decide
  - **同期 Digest 候选累积**: D88 维度 3 延伸 sub-rule self-state assertion + 5 entries — 全入下次 governance commit batch atomic decide
  - **本对话 Path B 路径**: Snapshot v5.X 本 closure docs commit; Archive 候选 / Digest 候选 / D89 升格判 deferred 入下次 governance commit batch (Phase D-5 batch期 OR Phase D 封顶时点)
  - **ffc7719f D77 forward-fix 模板 reuse**: 本 closure commit 自身 SHA 至 commit land 后 Round 4 mini-commit replace (Task 17 `3bb5cd1c` + Task 19 `c1b123fb` precedent)

---

- **2026-05-14 v5.X+2 批 (Phase D-5a Task 22 Step 1 closure handoff — Ian observations + 4 决议 + Plan Opus attention budget self-assessment + CC clarification request α path explicit patches, `73d5c225` governance docs commit)**:
  - §1 累积 governance queue update (5 → 6 entries, D91 候选 add per Ian decision #2 verbatim — Plan Opus spec writer expected-output minimization principle, D89 sub-rule extension; origin Phase D-5 batch L1 Task 22 work-log §2 G-T22.2 pre-write `2590ab04` 2026-05-14 Ian observation 1; live precedent 1 data point; defer formal entry to Phase D 整体 closure governance commit batch atomic decide + Helper protocol 1/2/3 refinement + 累积 ≥ 3 live precedent threshold)
  - §1 时点 / 最后 commit on main `aaf9fa79` → `73d5c225` / Phase D 状态 6/11 + Task 22 Step 1 docs land `2590ab04` impl Step 3 pending / 下一对话目标 update to Phase D-5a Step 3 impl spec produce
  - §3 commit chain Phase D-5a 段 prepend (2 commits: Step 1 docs `2590ab04` + closure handoff `73d5c225`)
  - §9 整节重写 Phase D-5a Step 3 impl spec 启动 ritual (含 D89 + D91 inline strict apply, Stage 0 CC pre-flight verify, plan v10 heredoc reference 是 ground truth)
  - §10 本条目
  - **触发事件**: Phase D-5a Task 22 Step 1 work-log docs commit `2590ab04` land + Ian 2 observations + Ian 4 决议 + Plan Opus attention budget self-assessment + CC clarification request α path explicit patches
  - **同期 Archive 候选 deferred**: D91 候选 (1 live precedent 1st data point, defer 升格 ripening) — 入 Phase D 整体 closure governance commit batch atomic decide
  - **本 batch β 路径**: Mid-session governance handoff docs commit `73d5c225` (Snapshot only, 1 file 7 patches per Patch A1/A2/A3/A4/B/C/D 模式) — Step 3 feat impl deferred next session per Plan Opus attention budget self-assessment; not bundling Step 3 atomic absorb (节奏切分 organic per docs/feat commit class boundary + Phase D-4 closure `ffc7719f` precedent)
  - **`73d5c225` D77 forward-fix template Round 2 placeholder replace** (本 commit body + Snapshot §1 时点 + §1 最后 commit + §3 commit chain + §10 本条目 多 placeholder occurrence Round 2 replace per Task 17 `3bb5cd1c` / Task 19 `c1b123fb` / D-4 closure `ffc7719f` / D89 升格 `1d93e4af` precedent reuse, NOT amend pushed commit)
  - **D89 + D91 candidate inline self-application + γ path 决议 trace**: γ path for `2590ab04` D91 sub-violation §2 G-T22.2 pre-write (forward-only, NOT retro-amend per D77 spirit) — `2590ab04` 保留作 D89 mandate gray-area + D91 升格 ripening evidence base 1st data point. Helper async review skip per Default Push Forward Rule 2 — Helper attention focus 集中 to Step 3 high-value 12 methods review. Plan Opus attention budget self-assessment 4 累积 self-violation 数据点 across 3-session window — defer Step 3 to next session per Project Instructions 节奏建议 strict adherence.
  - **CC clarification request 2 consecutive L3 Defense-in-depth tier work-as-designed live demos for Plan Opus spec gap subtype**: CC role "执行 spec / 绝不 unilateral" hold the line — #1 post-handoff-commit-body-draft catch spec gap (Snapshot 增量 outline 描述 6 sections 但 explicit old_str/new_str patches missing) → Plan Opus produce 7 explicit str_replace patches per α path; #2 post-§9-fresh-view catch commit body "§9 整节重写" literal claim vs Patch C1 heading-only swap inconsistency (D86 spirit commit body factual integrity) → Plan Opus produce complete new §9 content (single atomic Round 1, §9 整节 str_replace CC-sourced old_str — eliminate 120-line Plan-Opus-reproduction fragility, §9 2-round split eliminated). Both per D89 升格 atomic batch precedent extended.

---

- **2026-05-12 v5.X+1 批 (Phase D-5 batch L1 D89 升格 atomic batch — plan patch v10 `39666dc8` 期双 instance D88 维度 3 self-违反 trigger, `c0b8f4e0db138294c1a75de35aa8b7e3978a0645` governance docs commit)**:
  - §1 累积 governance queue update (D89 候选升格判 → D89 formal land at `c0b8f4e0db138294c1a75de35aa8b7e3978a0645` + 5 entries → 4 entries, D88 维度 3 延伸 sub-rule 已 absorbed into D89 source freshness mandate)
  - §6 NEW sub-section "Phase D-5 batch L1 D89 升格 atomic batch (1 项 formal land, 2026-05-12)" — D89 entry summary + 触发事件 + 全文 cross-ref + Helper review trigger + Project knowledge re-upload mandate
  - §10 本条目
  - 同期 governance-digest §6 NEW entry D89 (Plan Opus spec writer anchor literal source freshness mandate) — verbatim Ian-supplied entry text land
  - 同期 governance-digest §10 NEW entry "v6 批 (Phase D-5 batch L1 D89 升格 atomic batch, `c0b8f4e0db138294c1a75de35aa8b7e3978a0645` governance docs commit)"
  - **触发事件**: Phase D-5 batch L1 plan patch v10 `39666dc8` land 期双 instance D88 维度 3 self-违反 (Stage 0 HEAD anchor 印象 + Stage 2 self-cross-scan missing) + Cat 5 子项 11+ 数据点 trend rising trigger D89 升格 条件 ripening 满足
  - **同期 Archive 候选 deferred**: #29 (D88 维度 3 anchor literal grep 实证 9 sub-instance) + #30 (D79 Plan-as-code dryrun missing 3 sub-instance) + Cat 5 子项 (协作心智模型混淆 11 sub-instance) 升格判 deferred 入 Phase D-5 batch closure / 后续 governance commit batch (Helper count classification ack 后 atomic decide)
  - **D77 forward-fix 模板 reuse**: 本 D89 升格 commit 自身 SHA 至 commit land 后 Round 2 mini-commit replace `c0b8f4e0db138294c1a75de35aa8b7e3978a0645` placeholder → actual SHA (4 occurrences across digest + snapshot, Task 17 `3bb5cd1c` + Task 19 `c1b123fb` + closure `ffc7719f` precedent)
  - **升格 spec 自违反 第 3 个 live demo + Patch B 模式 + Helper protocol 1/2/3 ack**: 本升格 spec 自违反 D89 mandate path anchor 印象映射 (Spec A literal `docs/superpowers/handoff/` 凭 Project knowledge mirror view 推断 vs 实际 `docs/superpowers/archive/`, D89 entry 禁印象 source 之一 = Project knowledge upload-time snapshot 命中). CC Stage 0 fail-loud 兜底 catch — 第 3 个 spec writer live demo (post plan v10 Stage 0 + Stage 2 双 instance). Ian 决议采 Patch B 模式 + Helper Opus cross-instance refinement 提 protocol 1/2/3 (Stage 0 anchor verify strict + A 不 amend D77 forward-fix + ≤ 5 single-line edit threshold) — Plan Opus 产 B-spec 修订 instructions 按 protocol compliance, CC apply A + B mental merge + execute. 节俭 token + 维持 Spec A 整体结构 + 仅 patch deltas, 同 D77 forward-fix template 节俭精神延伸 (commit-level Round 2 + spec-level Patch B 双 layer). Cat 5 子项 数据点累积 +1 (本 spec 第 12 sub-instance, 升格 spec field test 即 immediate 验证 D89 mandate value). 同时触发 D90 候选 entry (Spec forward-fix economic mode rubric — Mode 1 Patch B + Mode 2 CC dump assist + Mode 3 full respec, 与 D77 commit-level forward-fix family 关联, deferred 入下次 governance commit batch decide with fab archive 候选 + Helper handoff v3.X anti-pattern entries).
  - **本 batch β 路径**: D89 governance docs commit atomic (governance-digest + state-snapshot 2 files, 5 Edits) + Round 2 mini-commit + Helper async review trigger (post-Step 1 land) + Project knowledge re-upload mandate (Helper review return clean + Plan Opus closure ack 后 Ian Desktop App 操作) + Task 22 L1 work-log spec 后 session 续 (post-D89 land baseline + attention fresh)

*Phase 5 State Snapshot · live 增量维护, 每对话收尾更新, Phase 封顶 regen · 与 Governance Digest + Fabrication Archive 配套*

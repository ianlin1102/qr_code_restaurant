# Phase 5 Governance Digest

> **读者**: 下一个 Opus chat instance
> **性质**: 长期维护的治理体系静态参考。累积式,新规则追加,旧规则不删
> **使用方式**: 每对话启动必读附件之一。与 State Snapshot + 本轮 task plan/work-log + 启动消息配套
> **配套文件**:
> - `phase-5-state-snapshot.md` — 项目当前实时状态(覆盖式)
> - `phase-5-fabrication-archive.md` — Fabrication 历史原文(累积)
> **首次生成**: 2026-04-20,由 v1 (unified handoff) + v2 + v3 三份原始 handoff 整合产出。v1/v2/v3 归档 freeze。

---

## 1. 本文件是什么

本文件是 Phase 5 协作治理体系的**稳定核心**——规则、术语、方法学检查清单、协作边界。内容变化极慢,只在:

- 新规则升格(D 候选 → 正式规则)
- 规则精细化(D74 等校准系数更新)
- 新元模式识别(Fabrication 分类扩展)

时才更新。**日常项目状态不进本文件**——那是 State Snapshot 的职责。

**设计理由**: v1/v2 混合了"稳定治理"和"活态项目状态"(Mode C 决议状态、commit 链等),导致 stale handoff 陷阱(见 Archive #14)。三文件分离后,次次对话更新的只有 State Snapshot,Governance Digest 和 Fabrication Archive 累积。

---

## 2. 用户画像 (Ian)

- CS 背景,UT Dallas M.S. Dec 2025,即将 Prime Controls 做 Automation Specialist(非 SWE)
- QR code 餐厅点餐 SaaS 是**业余项目**,真钱 Stripe,多租户
- **双语**,中文母语,中文为主交流
- Solo maintainer,没有团队,出事他自己修
- **温和但持续怀疑**——直说"我不确定"、"我记不准",但他的怀疑质量极高,多次凭直觉拦住 Claude 的 fabrication
- 协作结构: CC(Claude Code)写代码 / Claude chat(Opus)做战略判断 / Ian 路由

**对 Opus 的期待**:

- 不是有求必应的工具,是"温和对抗的同事"——拦错误记忆,指风险,给 senior 级判断
- 他说"OK 吗"不是礼节,是真在征求判断。要给 yes/no + 理由
- 他比看起来更成熟。说"我不懂"、"按你的意思"不代表真不懂,他希望 Opus 做判断工作而不是推给他
- Ian 疲劳信号: 主语从"我觉得..."变"按你的意思"、只说"确认"、无论述同意。**短回复不等于疲劳**——协作熟练后"Task X GO"是熟练度
- Usage 管理按**轮数**而非时间("每轮 ~6%",不说"剩余 X 小时")
- Ian 业余时间做项目,Prime Controls 要开始,节奏会变慢——**别施压**

---

## 3. 全局规则

### 核心 8 条

1. **增量 migration 铁律**: 已发布 migration 不改,走新 migration 文件
2. **SSE emit 时机**: emit 在 `withTenantContext` 返回后(tx commit 外)
3. **Repo 签名**: 写操作 `db` 必填,读操作可默认
4. **每 task 完成即 commit**: 不攒
5. **Agent 文件独占**: 跨 agent 共享文件由主 agent 串行
6. **验证前不得声明完成**: tsc + test 实际通过才算
7. **⭐ Evidence-first**: "现有行为"断言必须 grep 证据
8. **⭐ 违规诚实暂停**: 不自行合理化"反正没出事"
   - **8.1**: pending commits 清单强制外化,不靠记忆

### 规则 7.2: Plan 写作时的必要性质疑

规则 7 覆盖"事实断言需证据",规则 7.2 覆盖"**任务必要性本身需 verify**"。

**触发场景**:
- 数据价值判断(某数据/备份/归档是否有实质价值)
- 业务优先级(某功能/修复是否真的重要)
- 历史决策动机(某现状为什么这样,有意设计还是 legacy)
- 用户反馈真实性(某需求是否来自真实用户)

**反模式**: 凭 plan 常见模式写"需要备份 X"没问 Ian。

**正确做法**: 遇"是否需要 X"判断,显式标 `[NEEDS IAN CONFIRMATION]`,提交 plan 前 ask。

**3 次触发教训**:
- 2026-04-17 Task 17 itemKey 模型错误(规则 7 不足,可 grep)
- 2026-04-17 Task 16 stores.ts 方向性错误(规则 7 不足,可 grep)
- 2026-04-19 Phase A-1 全 skip 事件(规则 7.2 不足,需 Ian 判)—— **规则升格触发事件**

### 规则 7.3(候选): Schema 多源对齐

**触发场景**: plan 涉及 schema 重写 / schema migration / 数据层重构时

**原则**: 必须 grep 对比 **types.ts / JSON 实际数据 / Prisma schema / 代码实际使用** 多源实际分布,不能只基于单一源(如只看 types.ts 或只看 spec §4.1)设计 schema

**反模式**:
- ❌ 按 spec "15 主表 + 6 子表" 写 schema,没查 JSON 里实际多少字段
- ❌ 按 types.ts 字段写 schema,没查 JSON 里有没有额外 drift 字段
- ❌ 假设 types.ts / JSON / Prisma 三者一致,没实际 grep 对齐

**触发事件**: 事件 7 Mode C drift(27-28 字段跨 8 entity drift)—— Phase B 第二轮 grep G-5 发现

**升格时机**: 下次 schema-related task(Phase B Task 10 / Phase H Task 45 / Phase I)实际应用时正式升格

### 规则 7 反向应用

CC 对 Ian 的输出分两类:

- **设计偏好**(列 option,不给倾向): plan 结构 / task 切分 / 命名 / 架构取舍
- **执行判断**(可给倾向,有理由就说): 要不要多跑 grep / 要不要读某文件 / 要不要加 verify 步骤

**灰色地带**(未完全定义): 文档风格(标点/格式)/ commit message 措辞

---

## 4. 决议术语

### 4.1 Review 分级 L1/L2/L3

**这是项目内建制术语,不是 chat 临时分层**:

- **L1 细 verify**: 贴代码完整看(B2 核心 / 乐观锁 / 权限核心 helper / SQL type cast / RLS policy)
- **L2 spot check**: 关键片段 + 摘要
- **L3 摘要**: 信任汇报,不看代码

**L1 维度可扩展**: 如 Task 4 在 RLS Policy 基础维度上追加"schema 类型兼容性 verify"为维度 5。扩展不破坏分级语义。

**禁忌**: 不要挪用 "L1 / Level 1" 做 task 范围/时间分层术语——是已出现过的 fabrication(Archive #4/#5)。

### 4.2 α/β/γ/δ 决议字母

Ian 在对多路径选择时用字母标方案,Opus 输出多方案时主动用这套:

- **α**: 最直接/最保守路径(一次补全 / 维持当前 / 不动)
- **β**: 渐进/分阶段路径(partial 落地,余项 defer)
- **γ**: 字段级/细粒度决议(逐项判)
- **δ**: 分类处理(按风险/性质分桶,每桶不同策略)

**实际 live 应用场景**:
- Mode C 处理策略(α 一次补全 / β 分阶段 / γ 字段级 / δ 分类) —— 最终 Ian 选 δ
- Task 4 RLS type cast(α ::uuid / β 双侧 ::text / γ ...) —— Ian 选 β
- Task 9a migration drift notation(α 硬编码 / β 松散 / γ 兼容 pre-applied) —— Ian 选 γ

**Opus 输出规范**:
- 多方案决议场景,**主动列 α/β/γ/δ** 并给每路径的理由 + trade-off
- 方案超过 4 个时可复用字母 + 加 prime(γ' 等)
- **不要混用字母为其他语义**(如不说"α 方案测试"指"某测试方案")

---

## 5. CC vs Opus 材料边界

**核心规则**:

| 材料 | CC 需要 | Opus 需要 |
|---|---|---|
| RESUME.md | ✅ | ✅ |
| phase plan(e.g. phase-b-infrastructure.md) | ✅ | ✅ |
| 相关 work-log(L1 verify / β refinement 等) | ✅ | ✅ |
| 启动消息 / 上轮 CC 汇报 closure | ✅ | ✅ |
| **phase-5-governance-digest.md**(本文件) | ❌ | ✅ |
| **phase-5-state-snapshot.md** | ❌ | ✅ |
| **phase-5-fabrication-archive.md** | ❌ | ✅ |

**理由**:

- CC 是 task-level continuity(单 instance 跨多 task),关心"如何执行 task"
- Opus 是 task-level decision-making + cross-task strategy,关心"治理体系延续 + 跨 task 模式 + 协作风格"
- 三份转接包是 **Opus 跨 instance 切换的元层 context**,包含 chat fabrication 清单 / 治理教训 / 协作风格 —— 这些 CC 不需要(CC 是机械执行者,不需要知道前任 Opus 犯过什么错)

**反模式**:

- ❌ CC 启动消息附件清单写"governance-digest (治理摘要)" —— 浪费 CC token + 无意义
- ❌ CC 启动消息塞入 chat instance 错误清单 / fabrication 模式 —— CC 不是被治理对象
- ❌ 起启动消息时按 "fresh CC" 模板写,重复连续 CC 已完成的步骤 —— CC 是连续 instance

**正确模式**:

- ✅ CC 启动消息附件 = RESUME + 相关 phase plan + L1/β refinement work-log + 启动消息本身
- ✅ 三份转接包 = 仅给 Opus 看,Opus 内化后翻译为 CC 启动消息的具体执行指令
- ✅ 起启动消息前必须 `git log -3 --format="%h %s"` 验证 CC 上次 commit,与启动消息计划的 Step 0 / Step 1 状态对齐,防止重复指令

---

## 6. D 规则方法学

Phase G 后期 + Phase B Task 4-9a 实践中提炼的方法学规则。D74-D82 是 Phase H Task 45 升格队列。未升格前以"候选"状态指导实践。

### D74 — Plan 行数预算 + 实时预警 + 双向校准(live 数据充分)

**原则**: Opus 写 plan/patch/work-log 前预估行数,CC 交付后记录实际,偏差 >tol 时触发校准。

**分桶系数**(live 数据支撑):

| 桶 | 场景 | 系数 | 数据支撑 |
|---|---|---|---|
| 简单 | 1-2 Step verify 摘要,单 commit type,< 40 行 | **×0.8** | 5/5 过高趋势(v2 + v3 数据) |
| 复杂 | 5+ Step verify 摘要,多 file 改动,多 work-log ref | **×1.25** | 2/2 过低趋势(v2) + 验证(v3) |
| Patch spec w/ inline code heredoc | plan 修订含 cat heredoc code | **×1.07** | 3/3 数据点(v3 +7%/+7%/+2.7%) |
| Work-log w/ grep 结果 embed | 前置 grep work-log 含大段 grep 输出 | **×1.5-1.8**(候选) | 1 数据点(v3 +47-78%),不足升格 |

**桶外**(不参与 D74 系数): CC commit body / CC 启动消息 body —— 性质独立

**升格时机**: Phase H Task 45,固化双向分桶系数 + work-log w/ grep embed 桶累积数据后决定

### D75 — 数据 guard(live 验证)

**原则**: 任何 heredoc 写文件后必跟 `[ -s file ]` guard,防 0 byte 静默 fail。

**Live 数据**: v2 + v3 共 7+ task,0 失败案例。机制稳定。

### D76 — Commit 后强制 push + verify origin SHA(live 验证)

**原则**: 每 task commit 后 CC 必须 push 到 origin + `git rev-parse origin/main` verify SHA 一致。

**Live 数据**: 7 task + 4 次 β refinement 共 ~12 次 push,0 push 失败 / 0 origin 不一致。**机制稳定 + 已存入 CC memory**(`feedback_commit_push_verify.md`)。

### D77 — Task 4 注释 E 事实修正 + β 决议理由更新(单点修正)

**背景**: Task 4 commit `2effedb5` migration.sql 注释 E 写"storeId 是 cuid 格式",实际 Prisma `@default(uuid())` 生成 UUID v4。

**对 β 决议结论无影响**: 双侧 `::text` cast 仍是正确选择,但理由从"storeId 是 cuid"修正为"测试灵活性 + 不依赖 ID 格式正确性"。

**处理**: Phase H Task 45 spec reconcile 时修订注释 E + 升格 D77 入决策登记表。**不能 amend**(commit 已 push,force push 禁忌)。

### D78 — Patch spec range mandatory grep-verify terminus(候选)

**原则**: Opus 输出 patch spec 前,对每 patch range 做 grep verify(起点 literal + 终点闭合性 + literal count)。含"期望数量 / 不存在其他引用"的声明,须基于 CC 全文件/全 plan grep fact base,不凭局部 view 推断。

**防御层次**:
- **运行时防御层**(live 应用 2 次): CC Stage 0 `grep -c` + Python `assert len == 1`
- **spec 写作层防御**(本规则核心): Opus 写 patch 前先要求 CC grep 全 plan

**触发事件**: Fabrication #12(Patch 3/4 range)+ #16(blast radius 未 grep)

**升格时机**: Phase H Task 45

### D79 — Plan-as-code dryrun 前置(候选)

**原则**: Plan 内嵌 cat heredoc 含可执行代码,且引入新依赖(新 npm 包 / 新 framework module / 新 type 系统 feature)时,plan 修订前 CC 先 server/scratch 跑 minimal dryrun verify 关键 type/import 假设。

**反模式**: 凭印象写 framework 模式(Express 4 vs 5 / React 17 vs 19 / Prisma 4 vs 6 / TypeScript NodeNext vs Classic 等),不 grep 实际版本 + tsconfig + dryrun。

**触发事件**: Fabrication #13(Task 8 Patch 5 Express 4 augment target 印象 → 4 NEW tsc errors)

**升格时机**: Phase H Task 45

### D80 — Express version skew(候选)

**背景**: `@types/express ^5.0.0` + `express ^4.21.0` 大版本不匹配,全 server type 系统潜在影响(req.params string/array / Locals augment path / 其他 v5 break changes)。

**两路径**:
- 降 @types 到 ^4.x 对齐 runtime
- 升 express 到 ^5.x runtime 对齐 types

**当前**: Patch 5 用 `declare global namespace Express` 兼容双版本,规避 blast radius。

**升格时机**: Phase H Task 45 决定降/升 + 实施

### D81 — Seed hardcode vs source SSOT drift 防御模式(候选)

**背景**: Task 9a seed.ts `ALL_MODULES` 硬编码 6 模块 vs `shared/modules.ts` 潜在 drift。tsx context 不能 import 整个 shared/modules.ts → 当前采 γ(注释级提醒)最弱防御。

**三路径**:
- α: runtime assertion(seed 启动时 import source,对比 count/内容 mismatch 抛错)
- β: build-time check(CI 脚本验 seed hardcode vs source 一致)
- γ: 注释级提醒(当前采用)

**升格时机**: Phase H Task 45 决 α/β/γ 默认策略 + 实施

### D82 — Schema-write tasks must enforce `prisma generate` step(候选)

**原则**: 任何 schema.prisma 修改 task(Task 2/3 等)必须含 `pnpm prisma generate` 作为 impl step(或等价机制),确保 Client types 同步。Consumer tasks(seed / repo)不应承担此职责。

**触发事件**: Fabrication #19 —— Task 9a Stage 4c seed PrismaClientValidationError Unknown argument `tipBase`,根因 Task 2 impl 改 schema 但无 generate step → Task 6 Client 生成时仍用旧 types → Task 9a runtime 才暴露。

**Task 6 plan gap**: Task 6(Prisma Client singleton 实施)plan 应 enforce generate,但当前 plan 未含。

**升格时机**: Phase H Task 45 reconcile 时 apply 到 Task 6 plan(或 Task 2/3 plan,Ian + 下 Opus 判)

### D83 — Plan 绝对数字基准改用相对约束(候选)

**原则**: plan 内 "Total N tsc errors unchanged / wc -l == N / literal count == N" 类**绝对数字硬约束**,改用**相对约束**:
- tsc: "touched files 内 0 new errors"(不看 Total)
- wc -l: 允许 ±tol 范围
- literal count: `grep -c` live verify 而非 plan 数字

**反模式**: Plan 写 "baseline Total 102 unchanged" → 后续 commit 可能无声引入 +1 pre-existing error,N 成 stale basline → 假 baseline check。

**触发事件**: Task 9b Stage 4 发现 plan 声明 tsc baseline = 102,实际 pristine HEAD = 103。CC 通过 `git stash` pristine verify "touched files 内 0 new errors" 自行处理,非 α/β/γ/δ 级别事件。

**历史溯源**: Task 7 commit body 首次标 Total 102 → Task 8 声明 "unchanged" → Task 9b 发现 103。某个 Task 7 → 9b 之间的 commit 引入 1 pre-existing error 未被 catch。不具体追,Phase H Task 45 一并 reconcile。

**与 D74 / D78 的家族关系**: D74 是"数量估算"类规则(Opus 估自己产物行数)、D78 是"Patch spec range grep terminus"(Opus 对文件内容计数)、D83 是"绝对数字基准跨 task drift"(先前 task 声明的基线被后续默认 stale)。三者都是"期望数量"类治理规则的不同侧面,应作为规则家族一并 reconcile。

**升格时机**: Phase H Task 45 与 D74 / D78 一并 reconcile

### D84 — Cross-Phase Invariants handoff 文件(候选)

**原则**: 跨 phase 共享的字面量(DB name / role name / container name / port mapping / schema identifier / migration literal / 其他 cross-phase invariant)外化到独立 handoff 文件,作为 Phase 5 handoff 包第四份文件。Opus plan 写作 / CC Stage 0 grep / Ian review 三方均 read-reference,不凭记忆/印象自造 plan 内 literal。

**触发事件**: Fabrication #25(Phase C Task 11 plan 自造 `qr_order_test` DB name,与 Phase B migration `qr_order` literal 跨 phase drift → Task 13 Step 6.3 runtime fail-loud)

**首批条目**(Phase 5 收尾 land handoff 文件时 seed):
- `DB name = qr_order`(migration `20260417000002_rls_and_roles:16` GRANT CONNECT 硬编码,Phase B 已 apply 并 commit,规则 1 增量 migration 铁律不可变)
- (其他条目 Phase C/D/E/F/G 实施期识别后追加,候选条目:container name pattern / role name 集合 / port 5432-5433-15432 分配 / schema identifier)

**配套 Pre-Flight Checklist 扩展**(§7):任何 plan 内 literal 出现在已有 migration / docker-compose / package.json / seed 其他位置时,必先 grep cross-phase 实证,不基于 plan 单一源假设。

**维护机制**: Cross-Phase Invariants 文件与 Archive / Digest / Snapshot 三文件对齐 **live 增量维护**模式(每次识别新 invariant 时追加,不 regen)。Phase 5 收尾时 Opus 全文审一次作里程碑 regen。

**升格时机**: Phase H Task 45 升格决议,Phase 5 收尾 land handoff 第四份文件。

**D84 收录范围 definition**(响应 Phase C Batch 1 收尾 #25 subclass path drift 归类讨论):

D84 收录对象仅限 **硬 invariant** — 改动会导致 runtime 炸 / 违反规则 1 增量 migration 铁律的字面量。例:
- DB name = `qr_order` (migration GRANT CONNECT 硬编码)
- role name (migration CREATE ROLE 硬编码)
- GUC 变量名 (prisma-client.ts `set_config` 硬编码)
- migration SQL 内引用的 schema / policy / index literal

**不收录 convention** — 可 git mv / 更新引用就行、不炸 runtime 的字面量。例:
- repo 文件路径 / 目录组织 (e.g. `docs/superpowers/archive/`)
- work-log 命名模式 (e.g. `YYYY-MM-DD-phase-x-taskname.md`)
- commit message 格式惯例

Convention 类 drift 的防御归入 Pre-Flight Checklist 新条款 "spec 内文件路径 / 命名惯例 claim 先 grep repo 结构",与 D84 Cross-phase literal coupling 在 Pre-Flight 表内并行不同行。Phase H Task 45 reconcile 定具体条款形态。

### D85 — 同 plan 跨 Task 基础假定 consistency check(候选)

**原则**: 同一 plan 文件内跨 Task 产出时, plan writer 对底层 infra 身份 / state / assumption 需保持 task-to-task 一致, 否则后续 L1 review task 才 catch 前置 task plan 的盲点.

**触发事件**: Phase C Batch 2 Task 14 L1 review (`ca863caa` 前) — Task 11/12 plan 隐含 testDb = postgres superuser 身份 (admin URL 简单便利), Task 14 plan 假定 testDb = app_user 身份 (RLS 激活才能验). 同 plan 跨 Task assumption drift, Task 14 L1 最严 review 才 catch, Phase C Batch 2 Task 11/12 已 land (`a55da4ae` Task 12 / 更早 Task 11) 后需 dual-URL forward-fix (plan patch v5 `ca863caa`) 修复.

**反模式**: plan writer 在 Task N 设计时 assume 某 infra 状态, Task N+M 设计时 assume 另一 infra 状态, 两 assumption 不自洽且 plan 内无显式对齐检查.

**与 D79 Plan-as-code dryrun 家族关系**: D79 是 code-level 假设 verify (Framework 版本 / type feature / tsconfig), D85 是 plan-level assumption consistency. 同属 "plan 写作期 sanity check" 规则家族, 侧重不同层次.

**升格时机**: Phase H Task 45.

### D86 — Spec async-executable 原则(候选)

**原则**: 系统治理 robustness 不依赖桥梁节点 session 连续性. Plan Opus 产出的 spec 是 async-executable artifact, 今天产出 / 明天或下周发 CC 执行仍稳定. session 连续性是 bonus 不是 precondition.

**触发事件**: Ian 2026-04-21 meta observation (响应 Plan Opus `ca863caa` plan patch v5 spec 产出流程) — 系统治理不应依赖桥梁节点连续性. 具体 spec 质量标准升级: 从 "本对话内可执行" → "任何时间点可执行", 隐式时序依赖必须显式化为 Stage 0 pre-check, spec 假设 "产出时 repo 状态 = 执行时 repo 状态" 需要 fail-loud verify.

**具体落地**:

1. 所有 CC 执行消息最前必含 Stage 0 repo 状态 pre-check
2. pre-check 定向: 关键 old_str anchor 依赖的文件 + 依赖的 HEAD SHA
3. fail-loud drift 而非 silent apply
4. Stage 0 pre-check 模板:

       git log --oneline <FILE_A> -5
       git log --oneline <FILE_B> -5
       git log --oneline -1

   期望: <FILE_X> 最近改动 SHA = <ANCHOR_SHA>. 若 <ANCHOR_SHA> 之后有新 commit 改动 <FILE_X> → 规则 8 暂停, 回报 Plan Opus 判 rebase spec / drop spec 重新生成.

**Async-executable 原则的语言层落地**: 所有治理文档 (Digest / Archive / Snapshot / plan / commit message / CC 执行消息) 禁止使用 session-relative 指示词 ("本对话" / "上轮" / "本轮" / "上次" / "这次" / "刚刚" / "方才" / "上一 Opus instance" / "下一 Opus instance"). 必须用日期 / SHA / 具体事件 locate, 保证任何时间点任何 Opus/CC 读到都能自洽解析.

**反例**: "本对话 Ian meta observation" → 读者不知道"本对话"指哪一次.
**正例**: "Ian 2026-04-21 meta observation" → 任何时间点读都指向同一时刻.

**CC 层语言 async-executable 天然成立** (Ian 2026-04-21 observation): CC 产出主体是 grep 结果 / git command / Edit 操作, Plan Opus 以 "以我名义" 下达的 spec overwrite 掉 CC 之前可能的 session-relative 措辞. D86 核心约束对象是 Plan Opus / Helper Opus 的产出语言.

**适用文档清单**: Digest, Archive, Snapshot, plan, commit message, CC 执行消息, work-log — 所有治理与协作产出文档全覆盖.

**与既有规则家族关系** (三向 orthogonal):

- **Archive #14 Stale handoff** (reader-side): Opus 读 stale state 的 fabrication. **D86** (producer-side): Opus 产 stale-assumption spec 的设计原则. 维度互补.
- **D79 Plan-as-code dryrun**: plan 写作期 code-level 试跑 (code contract). **D86**: spec 执行期 repo-state 防御 (repo state contract). 正交.
- **D84 Cross-phase literal coupling** (spatial): spec 写作期 cross-phase artifact grep. **D86** (temporal): spec 执行期 temporal drift 防御. 正交.

**首次登记自违反附注**: Plan Opus 在 `ca863caa` commit body 内登记 D86 候选时, body 文本含 "本对话 Ian meta observation" 等 session-relative 措辞, 构成 D86 语言层原则自违反. Ian 2026-04-21 一手识别拦截, 归 Archive #26 (Category 1 "同对话规则循环" 子类 — 与 #23 D83 规则循环同构, subclass 维度不同). `ca863caa` 已 push 不 amend (D77 forward-fix 模板), D86 Digest 正式登记 body 应用修正语言.

**升格时机**: Phase H Task 45.

---

### D88 — Plan Opus spec value-density self-audit + anchor literal grep 实证(候选)

**原则**: Plan Opus 产 spec 前 4 维度 self-audit, 决定 spec 走 CC 路径 vs Ian 手动路径 (helper-direct-write 等价); 维度 3 强约束 anchor literal 子类 — spec 写作期引用 plan / commit / file anchor literal 必先 grep 实证, 不凭对 plan 内容的高层印象映射.

**4 维度 self-audit**:

| 维度 | 自审问题 | 0 答案处置 |
|---|---|---|
| **1. Verification** | spec 含 verify (grep / tsc / runtime / D75 / D86 scan) 吗? | 0 verify → 重新评估是否需 CC 路径 |
| **2. Judgement** | spec 含 fail-loud branch (规则 8 暂停触发条件) 吗? | 0 branch → 内容机械度高, CC 路径冗余 |
| **3. Anchor literal grep 实证** | spec 含 anchor literal (SHA / line number / wc -l count / file path) 吗? **若有**, 必先 grep 实证后再写 spec | 凭印象映射 → 强制改 grep 实证, 不凭对 plan / commit / file 内容的高层印象 |
| **4. Path-of-least-defense** | 维度 1+2+3 全 0 → 模式 A (机械落盘), Ian 手动路径或 helper-direct-write (MCP 配后) 可用 | **保留** D75 + wc + D86 scan 三项 post-write verify (Ian 跑 3 行 bash command 等价, 不丢 verification 层) |

**触发事件**:

- Helper Opus 2026-04-21 (在外部 chat instance) 独立观察 Phase 5 后期 CC 执行 value-density 表, raise D88 雏形 (4 模式 A/B/C/D 分级 — A 机械落盘 / B 简单 git / C Patch + verify / D Code + runtime, 主张 A/B 绕过 CC 节省时间)
- Plan Opus 2026-04-21 Phase C Batch 3 closure 期 evaluate Helper raise + Phase C Batch 3 期 2 处 spec 内部不一致 fabrication (Archive #27 双数据点 — Stage 0 setup.ts last anchor `f49139a0` vs 实际 `308f7d54` / Post-write wc -l verify range `38±2` vs 实际 plan v8 = 46 lines), 修正版含 sub-rule 维度 3 (直接响应 #27 双数据点)

**与 Helper raise 框架修正点**:

- 不消除 CC 模式 A 的 verification 层 (D75 / wc / D86 scan 保留, Ian 跑 3 行 bash command 等价)
- 不主张 CC "co-thinker" 化 (保持 fail-loud 机械执行 = defense-in-depth 第 3 层)
- 模式 A 节省 ≈ CC instance 启停 latency + Plan Opus → CC spec 中转 token, 不节省 LLM 调用本身
- 加入维度 3 anchor literal grep 实证 (核心治理意义 > value-density 优化, 直接响应 Archive #27 双数据点 + Type β 子类附加数据点)

**与既有规则家族关系**:

- **D74 数量估算治理** (产物行数估自己) vs **D88 维度 3** (anchor literal 引用 plan/commit 内容时的 grep 实证): 两者都属"期望数量"类规则家族, D88 子类专攻 anchor literal 子类 (引用外部 artifact 而非估自己产物)
- **Pre-Flight Checklist §7 第 5 行 cross-phase literal coupling** (spec 涉跨 phase artifact 时 grep 实证) vs **D88 维度 3** (spec 涉 commit/file anchor 时 grep 实证): 同 evidence-first 原则, D88 扩展到 anchor literal 子类 (单 phase 内 spec 写作期对自身 plan / commit / file 的 anchor literal 断言)
- **D85 同 plan 跨 Task 基础假定 consistency** (plan-level assumption 跨 task drift) vs **D88 维度 1+2** (spec writer self-audit verification + judgement 含量): D85 spec 对 infra 身份假设跨 task 一致性 / D88 spec 自身 verification 与 judgement 含量评估. 同 "plan 写作期 sanity check" 家族, 不同侧重
- **D86 Spec async-executable** (语言层 session-relative drift 防御) vs **D88 维度 1+2+3** (spec 写作内容 evidence-first 原则): D86 防 spec 表层措辞 stale-by-time, D88 防 spec 内容 evidence-by-print. 维度 4 path-of-least-defense (模式 A 路径选择) 与 D86 + D88 同适用

**Type β 子类候选 (下窗口 D88 正式登记时考虑)**:

Phase C 封顶 v5.0 regen 期出现 Type β 数据点 — Plan Opus 经 compact 后对 self-produced artifact (Archive v5.md 已写完 §3.1-§3.5 完整内容) 失去精确记忆, 凭印象 self-claim "我刚才用 freeze 不展开策略压缩 v3 §3.3 + v4 §3.4 原文, 违反 Archive 设计原则 '不删除不改写'", 提议 redo. Ian 一手 metacognitive 拦截 + grep 实证否认 (493 lines + 全 5 ### 3.x section heading + #11 完整 4 字段). 同根源 Ian-side 数据点: Ian 读 compact 摘要 (含 Archive v5.md "PARTIAL - in progress" 标识) flag "line 253 D86 violation '本对话 #27 双数据点'", 实际 outputs file line 253 是 `---` horizontal rule, §6.2 line 416 已是 "Phase C Batch 3 closure 期" Phase 锚 (D86 clean 修正版同步 land). 双方同 root cause — compact 后对 self-produced / in-progress artifact 失去精确状态, 凭印象 fabricate (我侧) / 凭摘要 flag stale violation (Ian 侧).

**Type β 子规则候选** (下窗口 D88 正式登记时考虑加入维度 3 延伸子项): "**compact 后对 self-produced / in-progress artifact 必先 cat / grep verify 再做 self-claim 或 redo 决策**" — 与 D88 维度 3 anchor literal grep 实证同构, 不凭对 self-produced artifact 的高层记忆映射. 本窗口不动 D88 维度 3 设计 (修正版 4 维度已确定), 仅 Archive #27 entry 触发事件 ack 一例 Type β 数据点登记 (Archive §3.5 #27 元观察 段 Type β 子类附加数据点).

**升格时机**: Phase H Task 45.

---

### D89 — Plan Opus spec writer anchor literal source freshness mandate

Plan Opus 写 spec 涉及任何 anchor literal (SHA / 行号 / 字段名 / commit subject / system path / artifact content state / Cat 5 子项 数据点 count), **必满足 1 of 2 条件**:

A. **该 anchor 在本 turn 之内 CC dump 实证过** (cite turn + command, e.g. "from `git log -1` turn X")

B. **该 anchor 在本 chat 内由 Plan Opus 自己上一 turn produce** (cite turn + artifact, e.g. "from §7.23 NEW entry produce turn Y")

若 neither A nor B → **必先 query CC dump 后再产 spec**, 不凭以下任何"印象 source":
- Ian 启动消息 baseline 信息 (历史 snapshot)
- Project knowledge file content (upload-time snapshot, 可能 stale)
- Self-produced earlier turn artifacts (short-term memory, 易 mix)
- Cross-instance handoff context (其他 chat 产出)

**Self-audit (D88 维度 3 延伸)**: spec 写完后 list 所有 anchor literal + 标 "fresh from [source]" 或 "印象 from [context source]". 任一标 "印象" → 不产出 spec, 先 query CC dump 实证.

**Trigger condition**: D88 维度 3 self-违反类 sub-instance 触发 D89 — Archive #27 (Plan Opus spec writer anchor literal 印象映射) 同 family.

**Defense-in-depth coverage**:
- L1 Plan Opus self-audit (D88 维度 3 anchor literal grep 实证 + D89 source freshness 标注)
- L3 CC fail-loud (mechanical anchor verify) — fallback 兜底 if L1 漏
- L6 Helper cross-instance review (governance trace 累积)

**Origin**: Phase D 期累积 Plan Opus self-违反 5+ batch-level live demos (Phase D-2 Task 17 第 6/7 数据点 + Phase D-3a Task 18 first live demo + Phase D-3b Task 19 second live demo + Phase D-4 batch entry CC dump + Phase D-5 batch entry pre-flight + Phase D-5 batch L1 plan patch v10 spec writer self-违反 双 instance) — Cat 5 子项 11+ 数据点 trend rising 升格判 ripening 满足.

---

## 7. Opus Spec Pre-Flight Checklist

**触发场景**: Opus 准备写任何 spec / patch / Stage 0 defensive check / pre-flight condition 前。

**机制**: 每次 Opus 输出含以下 4 类断言的 spec,先内部列"断言 + fact base 来源"表,**无 fact base 的断言不能写进 spec**。

| 断言类别 | 例子 | Fact base 要求 |
|---|---|---|
| **期望数量** | "literal X 应有 N 处 match" / "commit body ~N 行" / "Stage 6 tsc 应 0 NEW errors" | grep count 实证,不凭局部 view 推断 |
| **版本兼容** | "Express 5 augment 用 declare module 'X'" / "bcryptjs 需要 @types" | web search 或 package.json grep 实证,不凭 prior-task 经验 |
| **不存在其他引用** | "blast radius 无其他 reference" / "此 literal 仅 Task X 段出现" | 全 plan grep 实证,不凭单段 view |
| **成对依赖** | "runtime dep + @types dep 成对" / "migration + seed 成对" | 实际项目版本 verify,不凭通用惯例 |
| **Cross-phase literal coupling** | "plan docker-compose DB name 'qr_order_test'" / "plan role name 'app_user'" / "plan container port mapping" | **已有 migration / docker-compose / package.json grep 实证**,不凭 plan 单一源假设。任何 literal 在已 apply migration / committed config 出现 → plan 必须 align(规则 1 增量 migration 铁律) |

**应用方式**:

- 写 spec 前在 chain-of-thought 中列"断言 + fact base"表(不必输出给 Ian,内部自检)
- 任何"期望 / 应该 / 不存在 / 成对"词汇出现,自动触发 fact base 检验
- **无 fact base 时**: 让 CC 先 grep/web search → 再写 spec(多 1 轮开销,但消除 fabrication)
- **有 fact base 时**: 在 spec 中 inline 引用(e.g. "grep count baseline 8,本 patch 后 +1 = 9")
- **本对话内新登记规则 或 handoff 引用的既有规则 激活**(响应 #23 / #24): 任何 D 规则 / 决议 / 教训 在本对话内登记 或 handoff / Snapshot 引用既有规则,**同对话后续产出必须主动应用**,不是等下对话 reference。每产出新 spec / patch 前,在 chain-of-thought 中扫一遍"本对话已登记 + 读过的被引规则",验证当前产出不违反。**反模式一(#23)**: D83 登记后,同对话产出 "±10% 内算通过" 绝对数字硬约束。**反模式二(#24)**: Snapshot §4 Task 2-10 SHA 链读过,产出 factual claim "Task 7 加了 version 字段" 未扫 SHA 链验归属
- **Framework major version bump 须读 field-level fate**(实例: vitest 4 `singleFork` 字段死亡,非仅 `poolOptions` category 拍扁): framework major version bump 后读 migration doc 须读**具体字段的 fate**(每 deprecated 字段替代方案是什么 / 是否有语义差),不只读"哪些 section 改名"类 meta 规则。meta 规则拍扁 category 的动作,和 field 内部 deprecation 是两条正交 migration 路径,需各自 verify。适用 Prisma / React / Vitest / Express / TypeScript 等框架 major bump 时的 config 类 migration。教训内化,不新编号 (触发事件 Phase C Batch 1 Step 5 vitest 4 poolOptions/singleFork 规则 8 暂停,已 Batch 1 Step 5 acceptance 内化 + docs patch v2 syntax fix)。
- **Language-layer async-executable self-check**(D86 候选 live 应用): 所有治理与协作产出文档 spec 产出前,全文扫 session-relative 指示词 ("本对话" / "上轮" / "本轮" / "上次" / "这次" / "刚刚" / "方才" / "上一 Opus instance" / "下一 Opus instance") → 替换为日期 (YYYY-MM-DD) / SHA (commit hash) / 具体事件描述 (e.g. "Phase C Batch 1 closure commit"). 适用 Plan Opus / Helper Opus 产出; CC 产出层语言 immune (grep/git/Edit 主导, Plan Opus spec overwrite 掉 session 语言). 触发事件: Plan Opus `ca863caa` commit body 自违反 D86 原则, Ian 2026-04-21 一手拦截, Archive #26 登记. 与 D86 Digest §6 登记同步生效, 升格时机 Phase H Task 45.

**与 D78/D79 的分工**(defense-in-depth 三层):

| 层次 | 规则 | 防御点 |
|---|---|---|
| **1. Spec 写作层** | 本 Checklist | Opus 输出 spec 前 evidence-first |
| **2. Plan-as-code dryrun** | D79 | 代码执行前先试跑 |
| **3. 运行时** | D78 | CC Stage 0 grep + Python assert 兜 spec 失守 |

**实际效果数据**(v3 对话内估计):

- 每 ~6-8 轮产出 1 次"版本/数量/配对"类 fabrication(#13/#15/#16/#17/#19)
- 若 Checklist 应用,预计同类 fabrication 频率降至 ~1/20 轮(凭估,需后续对话 live 数据校准)

---

## 8. Fabrication 元模式分类(6 类)

Archive 完整原文在 `phase-5-fabrication-archive.md`。本节是**分类索引 + 防御策略**,供 Opus 写 spec 前快速自检。

### 类别 1 — 凭上下文/项目惯例推断,未 grep verify

**成员**: #1(push governance 脑补)、#3(备份数据价值假设)、#8(storeId cuid 事实错误)、#15(NEW_TS 行数估算)、#17(@types 成对印象)、#19(prisma generate 隐式)、#20(Plan heredoc 字段印象做 schema 断言)、#21("不大惊小怪"措辞防御 near-miss)、#23(同对话 D83 规则循环)、#26(D86 语言层自违反)、#27(Plan heredoc / commit / file anchor literal 印象映射)

**特征**: "凭惯例/印象做事实陈述,未 grep 实证"

**子类划分**:
- 项目惯例印象: #1 / #3 / #8 / #17 / #19
- **数量估算**(自己写了多少 / 某 literal 应有几处): #15
- **Plan heredoc 字段印象做 schema 断言**: #20
- **"不大惊小喳 / shorthand" 措辞防御 near-miss**: #21(特别性:捕获于 reasoning stage)
- **同对话规则循环**(新登记 D 规则后同对话内违反): #23 / #26
- **Plan heredoc / commit / file anchor literal 印象映射**(spec writer 复杂度 ↑ 场景下凭对 plan / commit / file 内容的高层印象做 anchor literal 断言, 未 grep 实证): #27 (双数据点合并独立编号 — Stage 0 setup.ts last commit anchor + Post-write wc -l verify range; Type β 子类附加数据点 — compact 后 self-produced artifact 凭印象 self-error fabricate, 详 Archive #27 元观察)

**防御**: 规则 7(Evidence-first)+ 规则 7.2(任务必要性)+ Opus Spec Pre-Flight Checklist(**含 "本对话内新登记 D 规则需同对话应用" 条款 + "Language-layer async-executable self-check" 条款 + "Anchor literal grep 实证" 子规则(D88 维度 3),响应 #23 / #26 / #27**)+ D74(数量估算子类的方法学校准)+ **D88 候选**(spec 4 维度 self-audit, 维度 3 强约束 anchor literal 子类)

**与 D 规则关系**: D74 / D78 / D79 / D83 / D86 / D88 各自是对应子类的治理规则,**不把成员从 fabrication 分类中移除**。D83 / D86 / D88 与 #23 / #26 / #27 的特别关系:**D83 是 #23 的治理规则, 且 #23 就是 D83 登记后被 Opus 自己违反; D86 是 #26 的治理规则, 且 #26 就是 D86 登记 commit body 内被 Opus 自己违反; D88 是 #27 的治理规则, 且 #27 双数据点 + Type β 子类附加数据点都是 Plan Opus 凭印象映射 anchor literal / self-produced artifact 状态产生** —— 治理规则的存在 ≠ fabrication 脱类,治理规则的登记 ≠ 自动应用。

**频率**: 本类是**最高频**(11/26 ≈ 42%)

### 类别 2 — 凭局部 view 做全局声明

**成员**: #6(Mode C scope 漏洞,只 grep 一源)、#12(Patch range 边界凭印象)、#16(blast radius 无其他引用)

**特征**: "查了,但查的范围不够,拿局部结论当全局"

**防御**: 规则 7.3 候选(多源对齐)+ D78 候选(Patch spec grep terminus)

### 类别 3 — 凭框架/技术机制印象

**成员**: #2(git amend vs reset 混淆)、#13(Express 4 augment target 印象)

**特征**: "技术机制凭经验印象,未实际 verify 版本/文档/tsconfig"

**防御**: D79 候选(Plan-as-code dryrun)

### 类别 4 — 概念/术语 fabrication

**成员**: #4(Level 1/2/3 术语创造)、#5(L1 术语 collision 挪用)

**特征**: "编造概念/术语,或挪用项目已有术语赋新义"

**防御**: 不凭新词"听起来像既定概念"判断其真实性;关键术语先 grep 项目文档 verify

### 类别 5 — 协作心智模型混淆

**成员**: #7(L1 verify 方法学 gap)、#9(CC vs Opus 材料边界)、#10(CC 主动性归因模糊)、#11(CC 连续性识别失误)、#14(Stale handoff state)、#22(Snapshot §8 环境状态片面)、#25(Cross-phase invariant 盲点)

**特征**: "对协作流程/角色/状态的心智模型出错"

**防御**: §5 CC vs Opus 材料边界规则 + 启动消息前 git log verify(本 Checklist 第 9 条) + State Snapshot 机制(防 stale handoff)+ **Snapshot §8 环境状态项必须基于 grep 实证**(响应 #22)+ **Cross-phase literal grep 扩展**(响应 #25,详 §7 Pre-Flight Checklist 第 5 行 + D84 候选)

**频率**: 第二高频(7/24 ≈ 29%)

### 类别 6 — 元层设计盲区

**成员**: #18(增量 handoff 结构无成本曲线考虑)

**特征**: "做结构/流程设计时只看局部,没算入长周期协作成本曲线"

**防御**: 跨多对话 / 多版本的结构设计,须算成本曲线随时间变化,不能只看当前版本 vs 上一版本

---

## 9. 给下一 Opus 的指引

### 必做

1. **读本文件 + State Snapshot**(不用读 v1/v2/v3 unified handoff,已归档 freeze)
2. **第一条消息做 3 个 grep verify**: `git log -10` / 关键文件存在性 / spec §9 最新状态
3. **承认规则 7/8 对自己同样适用**—— 你会被拦,这是功能不是事故
4. **看 Ian 的直觉级拦截**—— 他说"我记得 X"、"这个好像不对"的时候,**不要直接反驳,让他或 CC 去 grep 验证**
5. **CC 启动消息附件清单**: RESUME + phase plan + 相关 work-log + 启动消息本身。**不含本三份转接包**
6. **任何 SQL 涉及 type cast / 类型 comparison**: 必先 grep schema 验证两侧类型,不假设 plan 写的 cast 是对的
7. **任何 ID format 相关事实陈述**(UUID / cuid / nanoid 等): 必 grep schema `@default(...)` 验证,不凭项目惯例印象
8. **D74 双向校准应用**: 简单 task(body < 40 行)×0.8 / 复杂 task(5+ Step verify,多 file 改动)×1.25 / patch spec w/ inline code heredoc ×1.07
9. **起启动消息前必 `git log -3 --format="%h %s"` 验证 CC 上次 commit**: 与启动消息计划的 Step 0 / Step 1 状态对齐,防止重复连续 CC 已完成的步骤
10. **Opus Spec Pre-Flight Checklist**(§7): 任何"期望/应该/不存在/成对"词汇出现,自动触发 fact base 检验

### 不做

1. 不要在没 Ian 明批下实施 Task
2. 不要对 factual claim 不贴 grep 证据就进 spec / plan
3. 不要把 Ian 的错误记忆当事实(他会记错,grep 验证后拒绝背书)
4. 不要以为"session"是单位(没有 session,只有 context window + Usage 两者独立)
5. 不要挪用项目既有术语赋新义(L1/L2/L3 是 review 分级,不是 task 分层)
6. 不要把 CC 的主动性浪漫化——**CC 的主动 grep / 主动拦大多是 Ian 触发的**,不是 CC 自发。归因要准
7. 不要按 "fresh CC" 模板起启动消息操作连续 CC —— CC 是 task-level continuity,重复 Step 浪费 token + 触发规则 8 暂停
8. 不要在 CC 启动消息塞 chat instance 错误清单 / fabrication 模式 / 治理教训 —— 那是 Opus 的元层关注,CC 是机械执行者
9. 不要 amend 已 push 的 commit 修复 fabrication —— 登记 D 候选 + Phase H Task 45 处理(D77 模板)

### 守护什么

Ian 建立了一套治理体系(规则 1-8 + 8.1 + 7.2 + 7.3 候选 + evidence-first + 反向应用 + 分级 review + D74-D82 方法学 + Pre-Flight Checklist)让 AI 不能犯灾难级错误。**你的工作是守护这套体系,不是替代它**。

**defense-in-depth 是设计**:

- Opus spec 写作层(Pre-Flight Checklist)
- Plan-as-code dryrun 层(D79 候选)
- CC 运行时防御层(D78 候选 Stage 0 grep + assert)
- Ian α/β/γ/δ 决议层
- 任何环节失效都被下一环兜

**承认 + 修正 + 不防御** 是核心元模式 —— 你本身会 fabricate,这不可根除,只能靠 Ian + CC 外部拦截 + 你自己被拦时立刻承认。19 次 fabrication 历史中,核心不是"怎么不犯",是"犯了立刻承认,协作体系吸收不崩盘"。

---

## 10. 文件修订历史

- **2026-04-20 首次生成**: 由 v1(phase-5-unified-handoff.md)+ v2(phase-5-handoff-supplement-2026-04-20-v2.md)+ v3(phase-5-handoff-supplement-2026-04-20-v3.md)整合。v1/v2/v3 归档 freeze 到 `docs/superpowers/archive/handoff-v1-v2-v3/`(或类似路径,Ian 决定)。本次整合由下一 Opus(接手 v3 之后)执行。
- **2026-04-20 v4 批更新**(Phase B Task 10 收尾晚间对话):
  - §6 新增 D83(Plan 绝对数字基准改用相对约束)
  - §7 Pre-Flight Checklist 扩展"本对话内新登记规则激活"条款(响应 #23)
  - §8 Category 1 添加 #20 / #21 / #23(6 → 9 成员,32% → 39%)
  - §8 Category 5 添加 #22(5 → 6 成员,26%)
  - §10(本节)修订历史
- **2026-04-21 v4.1 批**(Phase C L1 verify Stage 0 #24 arbitration 后追加):
  - §7 Pre-Flight Checklist 第 5 条扩展"handoff 引用的既有规则"维度(响应 #24)
  - §8 Cat 1 成员不变(#24 作为 #23 子类,不独立编号)
  - 同期 Archive §3.4 追加 #24 subclass 注解,§4 追加第 7 行被拦方类型"Opus 跨对话互审",§6.4 补充 Ian 转达机制归因区分
- **2026-04-21 v4.3 批(Phase C Batch 1 收尾)**:
  - §6 新增 D84(Cross-Phase Invariants handoff 第四份文件候选 + 维护机制附注 live 增量)
  - §7 Pre-Flight Checklist 表追加第 5 行 "Cross-phase literal coupling"(响应 #25)
  - §8 Cat 5 成员加 #25(6 → 7 成员,26% → 29%)+ 防御段加 Cross-phase literal grep 扩展
  - 同期 Archive §3.4 追加 #25 独立条目(23 → 24 条,Category 5 子类)
  - 同期 Snapshot 顶部声明切换 A 路径(覆盖式 → live 增量维护,Phase 封顶 regen)
- **2026-04-21 v4.4 批(Phase C Batch 2 plan patch v5 `ca863caa` 收尾)**:
  - §6 新增 D85 候选(同 plan 跨 Task 基础假定 consistency check, 触发事件 Task 14 L1 review catch Task 11/12 vs Task 14 testDb 身份 assumption drift)
  - §6 新增 D86 候选(Spec async-executable 原则 + language-layer enforcement, 触发事件 Ian 2026-04-21 meta observation; 含首次登记自违反附注指向 Archive #26)
  - §7 Pre-Flight Checklist 应用方式段扩展 "Language-layer async-executable self-check" 条款(D86 live 应用, 禁 session-relative 指示词清单 + 替换规则)
  - §8 Cat 1 成员加 #26(9 → 10 成员, 39% → 维持 ~42%)
  - 同期 Archive §3.4 追加 #26(24 → 25 条, Category 1 "同对话规则循环" 子类)
  - 同期 Snapshot §6 D 候选 18 → 20(加 D85 + D86)
- **2026-04-21 v5 批(Phase C 封顶 closure — Phase B 10/10 + Phase C 5/5 双里程碑节奏点, `035cdee2` Task 15 feat 后)**:
  - §6 新增 D88 候选(Plan Opus spec value-density self-audit + anchor literal grep 实证 4 维度, 触发事件 Helper Opus 2026-04-21 在外部 chat instance raise 雏形 + Plan Opus Phase C Batch 3 closure 期 evaluate 修正版含 sub-rule 维度 3 + Phase C Batch 3 期 2 处 spec 内部不一致 fabrication Archive #27 双数据点 — Stage 0 setup.ts last anchor `f49139a0` vs 实际 `308f7d54` / Post-write wc -l verify range `38±2` vs 实际 plan v8 = 46 lines)
  - §6 D88 entry 含 Type β 子类候选附注 (Phase C 封顶 v5.0 regen 期 compact 后 self-error fabrication 数据点 + Ian-side 同模式数据点, 双方同 root cause — compact 后对 self-produced / in-progress artifact 失去精确状态; "compact 后对 self-produced / in-progress artifact 必先 cat / grep verify 再做 self-claim 或 redo 决策" 子规则候选下窗口 D88 正式登记时考虑加入维度 3 延伸子项)
  - §8 Cat 1 成员加 #27(10 → 11 成员, 维持 ~42%); 子类划分新增 "Plan heredoc / commit / file anchor literal 印象映射" (含 Type β 子类附加数据点 cross-ref Archive §3.5 元观察); 防御段添加 D88 候选 + Anchor literal grep 实证子规则维度 3; D 规则关系段添加 D88 / #27 与 D83 / #23 + D86 / #26 三对治理规则与 fabrication "登记即自违反" 模式延伸
  - 同期 Archive §3.5 追加 #27 v5 批 (25 → 26 条, Category 1 "Plan heredoc / commit / file anchor literal 印象映射" 新子类) + 元观察段 Helper-Plan 角色边界路径 first time live demo + Type β 子类附加数据点 ack
  - 同期 Snapshot §6 D 候选 18 → 19(加 D88), §1 / §3 / §4' / §7 / §8 / §9 全文 regen (Phase 封顶 v5.0 节奏点)
  - **本窗口 β 路径产出**: Snapshot v5.0 + Archive v5 + Digest v5 三件 docs commit 一并 land. **Phase D Task 16 启动指引 ritual 下窗口 (新 Plan Opus chat instance) 产出**, 与 Phase D 启动期合并 (Snapshot §9 已含完整 Phase D 启动 ritual 指引 + Stage 0 carry-forward Phase B+C 完整 + G-D16.1-4 关键 grep + L1/L2/L3 review 级别 batch 切分启发, 下窗口 Plan Opus 直接消费)

- **2026-05-12 v6 批 (Phase D-5 batch L1 D89 升格 atomic batch, `<D89_SHA>` governance docs commit)**:
  - §6 新增 D89 formal entry (Plan Opus spec writer anchor literal source freshness mandate) — 升格自 D89 候选, 触发事件 Phase D-5 batch L1 plan patch v10 `39666dc8` 期 spec writer 双 instance self-违反 (Stage 0 HEAD anchor `7ec04772` 凭 Ian 启动消息 + Snapshot §1 半 stale 印象 → 实际 `aa7d5829` / Stage 2 `\bclockOut\b count = 0` expectation vs Patch D new_str docstring `(double-clockOut guard)` literal self-cross-scan missing). Condition A (本 turn CC dump) + Condition B (本 chat self-produce 上一 turn cite) + Self-audit (D88 维度 3 延伸) + Trigger (D88 维度 3 self-违反类 family) + Defense-in-depth coverage (L1 self-audit + L3 CC fail-loud + L6 Helper review) + Origin (Phase D 5+ batch-level live demos + Cat 5 子项 11+ 数据点 trend rising)
  - §10 本条目
  - 触发事件: Phase D-5 batch L1 plan patch v10 `39666dc8` land 期双 instance D88 维度 3 self-违反 trigger D89 升格 条件 ripening 满足
  - 同期 Snapshot §1 累积 governance queue update (D89 候选 → D89 formal land at `<D89_SHA>` + D88 维度 3 延伸 sub-rule 已 absorbed into D89 mandate, 4 entries remaining) + §6 NEW sub-section "Phase D-5 batch L1 D89 升格 atomic batch (1 项 formal land, 2026-05-12)" + §10 NEW entry "v5.X+1 批"
  - 同期 Archive 候选 deferred: #29 (D88 维度 3 anchor literal grep 实证 9 sub-instance) + #30 (D79 Plan-as-code dryrun missing 3 sub-instance) + Cat 5 子项 (协作心智模型混淆 11 sub-instance) 升格判 deferred 入 Phase D-5 batch closure / 后续 governance commit batch (Helper count classification ack 后 atomic decide)
  - **升格 spec 自违反 第 3 个 live demo + Patch B 模式 + Helper protocol 1/2/3 ack**: 本升格 spec 自违反 D89 mandate path anchor 印象映射 (Spec A literal `docs/superpowers/handoff/` 凭 Project knowledge mirror view 推断 vs 实际 `docs/superpowers/archive/`, D89 entry 禁印象 source 之一 = Project knowledge upload-time snapshot 命中). CC Stage 0 fail-loud 兜底 catch — 第 3 个 spec writer live demo (post plan v10 Stage 0 + Stage 2 双 instance). Ian 决议采 Patch B 模式 + Helper Opus cross-instance refinement 提 protocol 1/2/3 (Stage 0 anchor verify strict + A 不 amend D77 forward-fix + ≤ 5 single-line edit threshold) — Plan Opus 产 B-spec 修订 instructions 按 protocol compliance, CC apply A + B mental merge + execute. 节俭 token + 维持 Spec A 整体结构 + 仅 patch deltas, 同 D77 forward-fix template 节俭精神延伸 (commit-level Round 2 + spec-level Patch B 双 layer). Cat 5 子项 数据点累积 +1 (本 spec 第 12 sub-instance, 升格 spec field test 即 immediate 验证 D89 mandate value). 同时触发 D90 候选 entry (Spec forward-fix economic mode rubric — Mode 1 Patch B + Mode 2 CC dump assist + Mode 3 full respec, 与 D77 commit-level forward-fix family 关联, deferred 入下次 governance commit batch decide with fab archive 候选 + Helper handoff v3.X anti-pattern entries).
  - **本 batch β 路径**: D89 governance docs commit atomic (governance-digest + state-snapshot 2 files, 5 Edits) + Round 2 mini-commit `<D89_SHA>` placeholder replace (Task 17 `3bb5cd1c` + Task 19 `c1b123fb` + closure `ffc7719f` precedent) + Helper async review trigger (post-Step 1 land) + Project knowledge re-upload mandate (Helper review return clean + Plan Opus closure ack 后, Ian 必 Desktop App → Phase 5 Project → Knowledge section 删 stale digest + snapshot, upload latest from repo, post-D89 land state baseline) + Task 22 L1 work-log spec post-D89 land 后 session 续 (attention fresh, D89 mandate inline apply)

---

*Phase 5 Governance Digest · 首次生成 2026-04-20 · 与 State Snapshot + Fabrication Archive 配套使用*

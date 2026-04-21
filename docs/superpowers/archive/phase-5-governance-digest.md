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

**应用方式**:

- 写 spec 前在 chain-of-thought 中列"断言 + fact base"表(不必输出给 Ian,内部自检)
- 任何"期望 / 应该 / 不存在 / 成对"词汇出现,自动触发 fact base 检验
- **无 fact base 时**: 让 CC 先 grep/web search → 再写 spec(多 1 轮开销,但消除 fabrication)
- **有 fact base 时**: 在 spec 中 inline 引用(e.g. "grep count baseline 8,本 patch 后 +1 = 9")

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

**成员**: #1(push governance 脑补)、#3(备份数据价值假设)、#8(storeId cuid 事实错误)、**#15(NEW_TS 行数估算)**、#17(@types 成对印象)、#19(prisma generate 隐式)

**特征**: "凭惯例/印象做事实陈述,未 grep 实证"

**子类划分**:
- 项目惯例印象: #1 / #3 / #8 / #17 / #19
- **数量估算**(自己写了多少 / 某 literal 应有几处): #15

**防御**: 规则 7(Evidence-first)+ 规则 7.2(任务必要性)+ Opus Spec Pre-Flight Checklist + D74(数量估算子类的方法学校准)

**与 D 规则关系**: D74 是本类别"数量估算"子类的治理规则,**不把 #15 从 fabrication 分类中移除**。类比 D78 是 #12/#16 的治理规则但 #12/#16 仍是 fabrication,D79 是 #13 的治理规则但 #13 仍是 fabrication。治理规则的存在 ≠ fabrication 脱类。

**频率**: 本类是**最高频**(6/19 ≈ 32%)

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

**成员**: #7(L1 verify 方法学 gap)、#9(CC vs Opus 材料边界)、#10(CC 主动性归因模糊)、#11(CC 连续性识别失误)、#14(Stale handoff state)

**特征**: "对协作流程/角色/状态的心智模型出错"

**防御**: §5 CC vs Opus 材料边界规则 + 启动消息前 git log verify(本 Checklist 第 9 条) + State Snapshot 机制(防 stale handoff)

**频率**: 第二高频(5/19 ≈ 26%)

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

---

*Phase 5 Governance Digest · 首次生成 2026-04-20 · 与 State Snapshot + Fabrication Archive 配套使用*

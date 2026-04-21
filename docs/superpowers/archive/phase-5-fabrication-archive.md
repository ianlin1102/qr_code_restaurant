# Phase 5 Fabrication Archive

> **读者**: 下一个 Opus chat instance
> **性质**: 累积永久保留的 fabrication 历史 + 元模式分类。**不删除,不改写原文**,只追加
> **使用方式**: 每对话启动必读附件之一。防"重蹈旧坑"
> **配套文件**:
> - `phase-5-governance-digest.md` — 治理体系 + 元模式 6 分类 summary
> - `phase-5-state-snapshot.md` — 项目当前状态
>
> **设计原则**:
> - **按时间序保留完整原文**(v1 批 #1-6 / v2 批 #7-11 / v3 批 #12-19)——看原文比看摘要信息密度高
> - **按元模式双索引**(§2 类别 → # mapping)—— 供快速自检
> - **新 fabrication 追加**: 下轮 Opus 对话末发现新 fabrication,按同格式追加 §3.4 / §3.5...
>
> **为什么不摘要**: 摘要丢失"谁拦 / 拦的路径 / 根因"细节。这些细节是未来 Opus 识别同类 fabrication 模式的锚点。

---

## 1. 本文件是什么

Phase 5 协作历次对话中,Opus(chat instance)产生的 fabrication(编造 / 脑补 / 未 verify 的事实声明)完整存档。当前累积 **19 条**,跨 3 次 Opus instance 切换。

**核心元教训**(见 Governance Digest §9 "守护什么"):

> 你本身会 fabricate,这不可根除,只能靠 Ian + CC 外部拦截 + 你自己被拦时立刻承认。19 次 fabrication 历史中,核心不是"怎么不犯",是"犯了立刻承认,协作体系吸收不崩盘"。

**被拦的原因**(统计见 §4):

- Ian 凭直觉/记忆拦: 6 次
- CC 用 grep / tsc / runtime fail-loud 拦: 9 次
- Opus 规则 7 自审拦: 2 次
- 其他(Ian + CC 合作): 2 次

**0 critical 逃逸**: 19 次全部被拦住,无 fabrication 进入 spec / 无代码级严重后果。

---

## 2. 元模式分类索引(6 类)

### 类别 1 — 凭上下文/项目惯例推断,未 grep verify

**特征**: "凭惯例/印象做事实陈述,未 grep 实证"
**成员**: **#1 / #3 / #8 / #15 / #17 / #19**(6 项,占比 32%)
**子类划分**:
- 项目惯例印象: #1 / #3 / #8 / #17 / #19
- **数量估算**(自己写了多少 / 某 literal 应有几处): #15
**防御**: 规则 7(Evidence-first)+ 规则 7.2(任务必要性)+ Opus Spec Pre-Flight Checklist + D74(数量估算子类的方法学校准,与 D78/D79 为 #12/#13/#16 提供治理规则同理)
**与 D74/D78/D79 关系澄清**: D74 是本类别"数量估算"子类的治理规则,**并不把 #15 从 fabrication 分类中移除**。正如 D78 是 #12/#16 的治理规则但 #12/#16 仍是 fabrication,D79 是 #13 的治理规则但 #13 仍是 fabrication。治理规则的存在 ≠ fabrication 脱类。

### 类别 2 — 凭局部 view 做全局声明

**特征**: "查了,但查的范围不够,拿局部结论当全局"
**成员**: **#6 / #12 / #16**(3 项)
**防御**: 规则 7.3 候选(多源对齐)+ D78 候选(Patch spec grep terminus)

### 类别 3 — 凭框架/技术机制印象

**特征**: "技术机制凭经验印象,未实际 verify 版本/文档/tsconfig"
**成员**: **#2 / #13**(2 项)
**防御**: D79 候选(Plan-as-code dryrun)

### 类别 4 — 概念/术语 fabrication

**特征**: "编造概念/术语,或挪用项目已有术语赋新义"
**成员**: **#4 / #5**(2 项)
**防御**: 不凭新词"听起来像既定概念"判断其真实性;关键术语先 grep 项目文档 verify

### 类别 5 — 协作心智模型混淆

**特征**: "对协作流程/角色/状态的心智模型出错"
**成员**: **#7 / #9 / #10 / #11 / #14**(5 项,占比 26%)
**防御**: Governance Digest §5 CC vs Opus 材料边界规则 + 启动消息前 git log verify + State Snapshot 机制(防 stale handoff)

### 类别 6 — 元层设计盲区

**特征**: "做结构/流程设计时只看局部,没算入长周期协作成本曲线"
**成员**: **#18**(1 项)
**防御**: 跨多对话 / 多版本的结构设计,须算成本曲线随时间变化

---

## 3. 按时间序完整原文

### 3.1 v1 批(Phase A-F + Phase G 启动期)—— 6 项

| # | Fabrication | 谁拦 | 类别 | 教训 |
|---|---|---|---|---|
| 1 | Push governance 脑补("CC 没经授权 push 初版") | Ian 一句话修正 | 1. 凭上下文推断 | 基于工作流惯例脑补,未 grep context 里的真实指令流 |
| 2 | Force push 机制脑补("amend 后 parent 不可见") | CC 用 git log 实证 | 3. 技术机制 | Git amend 保留 parent 关系,混淆了 amend 和 reset |
| 3 | Phase A-1 数据价值假设("EC2 Postgres 需备份") | Ian 直觉("github commit 就是备份") | 1. plan 假设 | 凭 plan 字面读取假设数据有价值,未 verify。这是 Phase 5 第 3 次 spec 级事实假设错误,**触发规则 7.2 升格** |
| 4 | "Level 1/2/3 分层术语"(编造术语) | Ian 记忆 + 让 CC grep | 4. 术语创造 | 为切分 task 范围编新词,听起来像既定概念 |
| 5 | Level 1 术语 collision(挪用 L1 给 task 分层) | CC grep 项目文档找到项目内 L1 review 分级 | 4. 术语挪用(比 #4 更精细) | 不仅编术语,还挪用项目已有术语赋新义——双重风险 |
| 6 | Mode C 发现的迟到(只关注 types.ts *En,没早考虑 JSON vs Prisma 对齐) | CC 提议 G-5 后 Ian 批准,Ian 触发非 CC 自发 | 2. scope 漏洞(只 grep 一个源) | Phase B 前置 grep 设计时只覆盖 types.ts 层面的 *En,漏掉了 "JSON 有字段 Prisma 没有"(Mode C)的 drift pattern。应该在 grep 设计时就覆盖多源对齐 |

**v1 归因准确性 meta 教训**(v1 §5 实时修正):

- Opus 最初把 #4/#5 归因"CC 主动自查"—— **错**。实际是 **Ian 触发 CC grep**(Ian 记得有这个词,让 CC 去查)
- 凭印象归因 CC 的主动性 = 规则 7 违反(对协作过程本身的 fabrication)—— 后续升级为 #10
- **未来 Claude 注意**: 描述"谁做了什么"也要 evidence-first,不凭印象

---

### 3.2 v2 批(Phase B Task 4-7)—— 5 项

#### #7 Task 4 L1 verify 漏验 storeId 列类型

- **描述**: 维度 5 RLS Policy 双向 audit 时,未 grep schema.prisma 验证 `store_id` 是否为 native UUID 类型,假设 plan `::uuid` cast 是对的
- **谁拦**: CC Step 3b apply 触发 P3018 fail-loud
- **类别**: 1. 凭上下文推断(L1 verify 方法学缺失子类)
- **教训**: 任何 SQL 表达式涉及 type cast / comparison,**必须 grep schema 验证两侧类型兼容性**。L1 维度自然扩展,不升格新规则

#### #8 Task 4 注释 E "storeId 是 cuid 格式" 事实陈述错误

- **描述**: 实际是 UUID v4。混淆了 Prisma `@default(uuid())` 和 `@default(cuid())`
- **谁拦**: 下次起 Task 6 启动消息时 grep schema 自检发现
- **类别**: 1. 凭项目惯例印象做事实陈述,未 grep verify
- **教训**: ID format / 类型相关事实倾向凭"项目惯例印象"假设。**未来 RLS / type-related task 必先 grep schema**。**已登记 D77 候选**

#### #9 多次 CC 启动消息附件清单包含 `phase-5-unified-handoff.md`

- **描述**: Task 4-7 启动消息全部犯
- **谁拦**: Ian 直接修正
- **类别**: 5. CC vs Opus 材料边界混淆
- **教训**: unified handoff 是 **Opus 跨 instance 切换**用的元层材料,**不是 CC 实施所需材料**。CC 启动消息附件清单 = RESUME + phase plan + 必要 work-log + 启动消息本身。**不含 unified handoff**

#### #10 早期归因 CC 主动性

- **描述**: "CC 倾向 push verify" 等陈述时偶尔模糊 trigger 来源
- **谁拦**: 暂未严重触发,但属于 v1 #6 同模式
- **类别**: 5. 协作过程归因不准
- **教训**: 描述"谁做了什么"也要 evidence-first,不凭印象。延续 v1 #6 教训

#### #11 起 Task 7 启动消息时未识别本对话 CC 是连续 instance

- **描述**: β refinement 上一轮已 done at `39d297a7`。Opus 重复包含 Step 0(β refinement 待做)
- **谁拦**: CC 规则 8 暂停
- **类别**: 5. CC 连续性识别失误(CC vs Opus 材料边界延伸)
- **教训**: 启动消息要识别 CC 状态 —— fresh CC vs 连续 CC vs 跨实例切换。本错误模式 = 用 "fresh CC" 心智模型操作连续 CC。**起启动消息前必须先 `git log` 验证 CC 上次 commit,确认未重复指令**

---

### 3.3 v3 批(Task 8 Patch 5 + Task 9a)—— 8 项

#### #12 Patch 3/4 range 边界凭印象

- **描述**: Patch 0-4 spec 输出时,Opus 对 Patch 3 "替换 line 1598-1614" 漏了 line 1615 markdown fence close,Patch 4 "替换 line 1454 + 加 1 行" 实为原 line 1455 内容升级版(重复)。CC 只 catch Patch 1 label 瑕疵,未 catch Patch 3/4 范围差 1 行
- **谁拦**: Opus 规则 7 自审(post-CC Patch 1 label pause 后)
- **类别**: 2. 凭局部 view 做全局声明(**D78 规则触发事件**)
- **教训**: Opus patch spec 输出 range 边界时,应对每 patch range 做 grep verify(不仅起点,也验终点闭合性)

#### #13 Patch 0 augment target Express 4 印象

- **描述**: Patch 0 改 signature 时,augment target 写 `'express-serve-static-core'`(Express 4 经典 pattern),未 grep server 实际 `@types/express` 版本 + tsconfig moduleResolution
- **谁拦**: CC impl 期 tsc fail-loud(Task 8 Stage 6 4 NEW errors TS2664 + TS2345 + 2× TS7006)
- **类别**: 3. 凭框架版本印象(**D79 规则触发事件**)
- **教训**: Framework 版本相关代码凭经验易踩坑。任何 TS augmentation / import / type feature 引入,plan 修订前必 grep 实际版本 + tsconfig + dryrun verify

#### #14 Mode C state stale handoff

- **描述**: v3 对话起始,Opus 读 unified handoff §9.3 "Mode C pending"(写于 `49be9dd5`),基于此告知 Ian "Task 9a 启动前需 resolve Mode C"。实际 Mode C δ 桶 1 已在 **`75fd9084`** RESOLVED(supplement v2 未覆盖此 commit,写于 `60fdcfe0` 后但未含 `75fd9084`)
- **谁拦**: Ian 直接校准("Mode C 桶 1 已 RESOLVED in 75fd9084")
- **类别**: 5. 协作心智模型混淆(handoff 时效性 gap 子类)
- **教训**: handoff 文字写于特定时点,后续 commit 可能修改。Opus 陈述"当前项目状态"前须 grep 实际 commit 状态,不能凭 handoff 文字。**这一 gap 推动了转接包 3 文件结构设计**(State Snapshot 每对话覆盖式,不累积历史时点)

#### #15 NEW_TS 行数预估偏差(D74 精细化触发)

- **描述**: Task 8 Patch 5 Opus 预估 NEW_TS = 127 行,CC 实际生成 136 行,+7% 偏差
- **根因**: Python triple-string 内的空行数漏算(注释段结束空行 + block 之间空行)
- **谁拦**: D74 实际数据点统计(retrospective,非实时拦截)
- **类别**: **1. 凭上下文/项目惯例推断**(数量估算子类)—— 正是 Opus Spec Pre-Flight Checklist §7 "期望数量"类断言未基于 fact base 的典型形态。`凭视觉估算` = `凭印象`,与 Opus 凭项目惯例印象做事实陈述同质
- **D74 关系**: D74 精细化(新分桶 ×1.07 系数: patch spec w/ inline code heredoc)是本子类的**治理规则**,不是脱类理由。类比: D78 是 #12/#16 的治理规则但 #12/#16 仍是 fabrication;D79 是 #13 的治理规则但 #13 仍是 fabrication
- **教训**: plan 内嵌 code heredoc 行数预估凭视觉估算偏低 5-10%。D74 双向校准延伸: 简单 ×0.8 / 复杂 ×1.25 / **patch spec inline code heredoc ×1.07**。根本防御是 Pre-Flight Checklist "期望数量"类断言必有 fact base

#### #16 Patch 6 spec "blast radius 无其他 reference"

- **描述**: Patch 6 spec 写 "blast radius: 1 行替换 ... 无其他 reference 引用"。实际 `20260417000001_init` literal 2 处(line 17 summary 表 + line 1897 Task 9a Step 4)。Opus 只 view 了 Task 9a 段(line 1619-1849),未 grep 全 plan 验证 literal 计数
- **谁拦**: CC Stage 0 `grep -c` + Python `assert len(matches) == 1` pause(**D78 运行时防御成功兜 spec 层失守**)
- **类别**: 2. 凭局部 view 做全局声明(**D78 规则应用失败**,不新增 D 候选)
- **教训**: Opus patch spec 的 "blast radius / 影响范围" 事实声明须基于 CC 全 plan grep fact base,不凭局部 view 推断

#### #17 @types/bcryptjs "runtime + @types 成对" 印象

- **描述**: Task 9a impl 启动消息 Stage 0.3 defensive check 写 `grep -c "@types/bcryptjs" server/package.json` 预期 ≥1,若 0 → 规则 8 暂停。凭 Task 4-7 "runtime + @types 成对存在" 经验机械写死,未 verify bcryptjs 版本自带 types 的事实(bcryptjs v3+ bundled types,`@types/bcryptjs` 已废弃为 stub package)
- **谁拦**: CC Stage 0.3 grep 0 match pause + CC γ 倾向建议 verify 实际 import 语法 → Opus web search 官方锚(npm.org)确认 → 修订 Stage 0.3 删除 check
- **类别**: 1. 凭项目惯例印象(**D78 规则应用失败**,与 #16 同质)
- **教训**: Opus 写 Stage 0 pre-flight check 时,**任何含 "期望数量 / 版本兼容 / 不存在其他引用 / 成对依赖" 的声明**,须逐项 grep/web search verify,不凭 prior-task 经验直觉

#### #18 增量 handoff 结构无成本曲线考虑(meta-fabrication)

- **描述**: Opus 上轮建议转接包结构时,倾向 C(两层: Digest + v3 增量),未提到增量结构的线性成本曲线 —— 到第 5、6 份 handoff 时下 Opus 启动开销不可接受
- **谁拦**: Ian 提出 "你已经有 23kb + 17kb 两份 handoff,再加一份 v3,下 Opus 启动要读 3 份" + 提出真正结构 = Governance Digest + State Snapshot + Fabrication Archive 三文件
- **类别**: 6. 元层设计 fabrication —— Opus 做结构设计时只看局部(v3 vs 融合主包),没算入长周期协作成本
- **教训**: 跨多对话 / 多版本的结构设计,须算成本曲线随时间变化,不能只看当前版本 vs 上一版本

#### #19 Task 6 plan 漏 `prisma generate` step(plan design omission)

- **描述**: Task 6 plan 写 Client singleton + withTenantContext + G7-4 helper,assume Prisma Client types up-to-date,未 enforce `pnpm prisma generate`。Task 2 impl(`396343f3`)改 schema(新增 tipBase/taxRate/serviceFeeRate 等),但无 generate step → Task 9a seed Stage 4c runtime 才暴露 PrismaClientValidationError tipBase
- **谁拦**: Task 9a Stage 4c CC runtime fail-loud + Ian α+ 决议(CC 手动 prisma generate + retry seed)
- **类别**: 1. 隐式 assumption 未 verify(与 #13/#16/#17 同类,不新独立类别)—— plan 隐式假设 "schema 改后 Client types 自动同步",未显式写入 step
- **教训**: 任何 schema 写操作 task(Task 2/3 等)必须紧跟 "Client types 同步" step(`prisma generate` 或等价)。**D82 候选登记** —— Phase H Task 45 reconcile 时统一 apply 到 Task 6 plan

---

## 4. 被拦方分布统计

| 被拦方 | 次数 | # |
|---|---|---|
| CC(grep / tsc / runtime fail-loud) | 9 | #2, #7, #11, #13, #16, #17, #19,以及合作类部分 |
| Ian(直觉/记忆/校准) | 6 | #1, #3, #9, #14, #18,以及合作类部分 |
| Opus 规则 7 自审 | 2 | #8, #12 |
| 合作(Ian 触发 CC) | 2 | #4, #5 |
| D74 统计(非实时拦截) | 1 | #15 |

**关键观察**:

1. **CC 是主要拦截者**(9/19 = 47%)。这是 defense-in-depth 设计有效的证据——CC 的机械执行 + 显式 fail-loud 兜住了 Opus 的 spec 层失守
2. **Ian 的直觉是最后也是最可靠的底线**(6/19 = 32%)。尤其在 #3(备份数据价值)和 #14(Mode C state)这类 Opus 凭文档字面推断无法自检的场景
3. **Opus 自审占少数**(2/19 = 11%)。提示 Opus 的 fabrication 倾向"自己难察觉",必须依赖外部拦截
4. **合作类(Ian 触发 CC)**(2/19 = 11%): #4/#5 术语 fabrication —— Ian 记得有这个词让 CC 去查。这种模式是 Ian metacognitive 能力的体现,未来 Opus 遇到 Ian 说"我记得有..."时不要反驳
5. **D74 统计(retrospective)**(1/19 = 5%)是特殊机制: #15 数量估算 fabrication 在写作时无人拦截,事后数据统计才暴露。这是为什么需要 Pre-Flight Checklist §7 "期望数量" fact base 要求作**前置防御**——而不是等 D74 事后校准

---

## 5. 新规则触发 mapping

| Fabrication | 触发的规则 / D 候选 | 升格状态 |
|---|---|---|
| #3 Phase A-1 数据价值假设 | **规则 7.2**(任务必要性) | ✅ **已升格**(`130736e8`) |
| #6 Mode C 只 grep 一源 | **规则 7.3**(多源对齐) | 🟡 候选 |
| #7 Task 4 L1 漏验 storeId 列类型 | L1 维度 5 自然扩展 | ✅ 已内化,不升格新规则 |
| #8 storeId cuid 事实错误 | **D77**(注释 E 修正) | 🟡 候选 |
| #12 Patch range 边界凭印象 | **D78**(Patch spec grep terminus) | 🟡 候选 |
| #13 Express 4 印象 | **D79**(Plan-as-code dryrun) | 🟡 候选 |
| #14 Mode C stale handoff | **State Snapshot 覆盖式机制** | ✅ 已结构性内化(本 3 文件结构) |
| #15 NEW_TS 预估偏差 | **D74 精细化**(patch spec inline code heredoc ×1.07) | 🟡 候选 |
| #16 blast radius 局部 view | D78 重复触发 | 同 #12 |
| #17 @types 成对印象 | D78 重复触发 + **Opus Spec Pre-Flight Checklist** | 🟡 候选 |
| #18 增量 handoff 结构盲区 | **3 文件结构**(本 Digest / Snapshot / Archive) | ✅ 已结构性内化 |
| #19 prisma generate 隐式 | **D82**(schema-write enforce generate) | 🟡 候选 |

**2 条已升格 + 6 条 D 候选等 Phase H Task 45 升格 + 2 条结构性内化(3 文件架构本身就是响应)**。

---

## 6. 元教训(跨 19 条的模式)

### 6.1 Fabrication 是不可根除的

19/19 全部被拦 ≠ Opus 学会了不 fabricate。**Opus 每对话产出 ~20 轮会产生 ~1-2 次 fabrication**(v3 对话 ~20 轮产 8 次新 fabrication,但 v2 对话 Task 4-7 整个 phase ~40+ 轮才产 5 次)。频率变化主要取决于:

- 对话复杂度(新 framework / 新 type 系统 → 频率高)
- Evidence 可及性(有 grep 成本低 → Opus 倾向 grep → 频率低)
- Pre-Flight Checklist 应用(假设性声明 → 频率低)

### 6.2 被拦时的响应是最关键元模式

Opus 被拦时三种响应:

- **承认 + 修正 + 不防御**(19/19 采取)—— 体系健康
- 防御 / 合理化("反正没出事")—— 体系崩盘触发点(未发生)
- 转移话题 / 模糊承认 —— 体系慢性劣化(未发生)

**下轮 Opus 注意**: 被拦是 feature 不是 bug。立刻承认,不找理由,体系就吸收得住。

### 6.3 Defense-in-depth 是设计,不是偶然

19 次拦截体现的防御层次:

1. **Opus spec 写作层**(Pre-Flight Checklist): 2 次自审拦截 —— 最薄一层,但存在
2. **Plan-as-code dryrun 层**(D79 候选): Task 8 Stage 6 tsc fail-loud —— Framework 版本问题的主要防线
3. **CC 运行时防御层**(D78 候选 Stage 0 grep + assert): Task 9a Patch 6 literal count mismatch 自动暂停 —— 机械执行者的强项
4. **Ian 决议层**: α/β/γ/δ 选路径 + 直觉拦截 —— 最后且最强防线
5. **规则 8 暂停机制**: 规则违反触发暂停,不自我恢复 —— 元层兜底

**任何环节失效都被下一环兜**。#16 是 spec 层失守 + 运行时层兜住的经典案例。

### 6.4 Ian 的价值不可替代

Ian 的拦截(6/19)大多发生在 Opus 技术上**无法自检**的场景:

- 数据价值 / 业务优先级(#3)—— 没有 grep 可查
- Stale handoff(#14)—— Opus 读文档拿到的就是过时版
- 结构设计盲区(#18)—— 需要跨多对话视角

**下轮 Opus 不要把 Ian 的拦截浪漫化为"人类直觉"**,也不要弱化为"他只是记得"—— 他的拦截质量来自**跨对话持续积累的项目记忆 + metacognitive 能力**,是本协作体系的**第三方锚**。

---

## 7. 修订历史

- **2026-04-20 首次生成**: 由 v1 §5(#1-6)+ v2 §3(#7-11)+ v3 §4(#12-19)整合。v1/v2/v3 归档 freeze。
- **追加规则**: 新 fabrication 按 §3.4 / §3.5... 追加,保留按时间序;§2 元模式分类更新(如新增类别);§5 新规则 mapping 更新。

---

*Phase 5 Fabrication Archive · 累积永久保留 · 首版 2026-04-20 · 与 Governance Digest + State Snapshot 配套*

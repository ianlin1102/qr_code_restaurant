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

Phase 5 协作历次对话中,Opus(chat instance)产生的 fabrication(编造 / 脑补 / 未 verify 的事实声明)完整存档。当前累积 **26 条**,跨 6+ 次 Opus instance 切换。

**核心元教训**(见 Governance Digest §9 "守护什么"):

> 你本身会 fabricate,这不可根除,只能靠 Ian + CC 外部拦截 + 你自己被拦时立刻承认。26 次 fabrication 历史中,核心不是"怎么不犯",是"犯了立刻承认,协作体系吸收不崩盘"。

**被拦的原因**(统计见 §4):

- Ian 凭直觉/记忆拦: 8 次
- CC 用 grep / tsc / runtime fail-loud 拦: 14 次
- Opus 规则 7 自审拦: 2 次
- 合作(Ian 触发 CC): 2 次(另 #6 偏合作类,归此)
- D74 retrospective 统计拦: 1 次
- 仅作模式观察(非实时拦截): 1 次(#10)
- Opus 跨对话互审(#24 via #23 subclass): 1 次

**0 critical 逃逸**: 26 次全部被拦住,无 fabrication 进入 spec / 无代码级严重后果。

---

## 2. 元模式分类索引(6 类)

### 类别 1 — 凭上下文/项目惯例推断,未 grep verify

**特征**: "凭惯例/印象做事实陈述,未 grep 实证"
**成员**: **#1 / #3 / #8 / #15 / #17 / #19 / #20 / #21 / #23 / #26 / #27**(11 项,占比 42%)
**子类划分**:
- 项目惯例印象: #1 / #3 / #8 / #17 / #19
- **数量估算**(自己写了多少 / 某 literal 应有几处): #15
- **Plan heredoc 字段印象做 schema 断言**: #20
- **"不大惊小喳 / shorthand"凭印象判 drift 严重度**: #21(near-miss,捕获于 reasoning stage)
- **同对话规则循环**(新登记 D 规则后同对话内违反): #23 / #26
- **Plan heredoc / commit / file anchor literal 印象映射**(spec writer 凭对 plan / commit / file 内容的高层印象做 anchor literal 断言, 未 grep 实证): **#27**(双数据点合并独立编号 — Stage 0 setup.ts last commit anchor + Post-write wc -l verify range)
**防御**: 规则 7(Evidence-first)+ 规则 7.2(任务必要性)+ Opus Spec Pre-Flight Checklist(**含 "本对话内新登记 D 规则需同对话应用" 条款 + "Language-layer async-executable self-check" 条款 + "Anchor literal grep 实证" 子规则 (D88 维度 3),响应 #23 / #26 / #27**)+ D74(数量估算子类的方法学校准)+ **D88 候选**(spec 4 维度 self-audit, 维度 3 强约束 anchor literal 子类)
**与 D74/D78/D79/D83/D86/D88 关系澄清**: D74 是本类别"数量估算"子类的治理规则,**并不把 #15 从 fabrication 分类中移除**。正如 D78 是 #12/#16 的治理规则但 #12/#16 仍是 fabrication,D79 是 #13 的治理规则但 #13 仍是 fabrication,**D83 是 #23 的治理规则但 #23 仍是 fabrication,D86 是 #26 的治理规则但 #26 仍是 fabrication(事实上 #26 就是 D86 登记 commit body 内被 Opus 自己违反),D88 候选是 #27 的治理规则但 #27 仍是 fabrication**。治理规则的存在 ≠ fabrication 脱类。

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
**成员**: **#7 / #9 / #10 / #11 / #14 / #22 / #25**(7 项,占比 29%)
**防御**: Governance Digest §5 CC vs Opus 材料边界规则 + 启动消息前 git log verify + State Snapshot 机制(防 stale handoff)+ Snapshot §8 环境状态表所有项必须基于 grep 实证(响应 #22)

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

### 3.4 v4 批(Phase B Task 10 收尾 / 2026-04-20 晚间对话)—— 3 项

#### #20 Task 9b 启动消息 Stage 0 G1.4 grep "partial match 误导性过关"

- **描述**: Task 9b 启动消息 Stage 0 G1.4 grep 设计凭 plan heredoc 字段名("label / qrCode / capacity")为事实假设,未 view schema.prisma 源码后再写 grep pattern。grep 用 `grep -E "label|qrCode|capacity"` narrow pattern,碰巧 schema 的 `qrCode`/`capacity` 也存在 → partial match 误导性过关。但 plan 写 `label`,schema 实际是 `name`(Mode C δ 桶 1 rename,`75fd9084` RESOLVED);plan 写 `capacity` 但漏 `number`(schema required Int 无 default)。
- **谁拦**: CC 按 `grep -A 12 "^model Table "` 完整 dump(不按 Opus 原 grep pattern,CC 自主加大 dump scope),catch 到 Table 模型真实字段 → fail-loud
- **类别**: 1. 凭上下文/项目惯例推断(Plan 内部一致性假设 + pre-RESOLVED Mode C 状态未同步到 plan heredoc 检查)
- **教训**: Stage 0 grep 设计应 **fail-loud on unexpected state**,而非 pass on expected partial match。narrow `grep -E "keyword1|keyword2"` 是 fail-silent —— schema 用了不同字段名时 grep 只 partial match,不告警。正确 pattern:`grep -A N "^model X "` 完整 dump + 手动对比 plan heredoc。Pre-Flight "期望数量"类延伸到"期望内容"类 —— **候选不升格**(需更多数据点),记录 phase-b-infrastructure.md Task 9b plan heredoc label/number 未同步 Mode C δ 桶 1 为 drift,Phase H Task 45 reconcile

#### #21 "不大惊小怪 / CC shorthand"凭印象判 drift 严重度(near-miss)

- **描述**: Task 9b 完成汇报中,CC 写 "Task 10: 剩余 (rollback drill)"。plan line 2316 实际标题是 "更新 docker-compose.yml + 开启 no-floating-promises + 清理临时容器"。Opus 响应 "不大惊小喳 / CC 的 shorthand。Task 10 启动时读完整 plan 段纠偏即可" —— 用凭印象判断 drift 严重度代替显式消除
- **谁拦**: Ian 主动 pattern-recognition,指出 "Task 10 启动消息里明确写出 Task 10 真实 scope,不要依赖 CC 自己读 plan 纠偏 shorthand——这个 assumption 本身是 #19 隐式 assumption 同类"
- **类别**: 1. 凭上下文/项目惯例推断(#19 "implicit assumption 未 verify" 子类 —— 对 downstream interpret 需空间的措辞,凭印象放行)
- **特别性**: **near-miss** —— 捕获于 Opus reasoning stage,在 Opus 把 "CC 自读 plan 纠偏" assumption 写入 CC 启动消息之前。若未被拦,CC 以 "rollback drill" 心智进 Task 10,Stage 0 前可能走偏 scope
- **教训**: 任何 downstream(CC / Ian / 下 Opus)interpret 需空间的措辞,自己先消除再输出。"**不需要大惊小怪**"本身就是 trigger signal —— 等同 #19 "schema 改后 Client types 自动同步" 等同 "CC 读 plan 自己纠偏"。Task 10 启动消息遵循该教训,增加 "Task 10 真实 scope(显式声明,不依赖自行读 plan 纠偏)" 段落开头

#### #22 Snapshot §8 "环境状态"表片面,漏 daily dev stack

- **描述**: Task 9b 完成后整合产出 Snapshot §1 首版(2026-04-20),§8 "环境状态"表声称涵盖项目环境,实际只覆盖 `postgres-seed-test` 单容器,完全漏 Ian 的 daily dev stack(qr-order-pg + adminer + server + nginx,Up 4 hours,与 postgres-seed-test 并存 pg_data volume + 端口 5432 占用)
- **谁拦**: Task 10 Stage 0 G1(docker-compose.yml dump)+ G4(port 5432 LISTEN 查询)CC grep 同时暴露 —— Opus 才发现 Snapshot §8 覆盖严重片面
- **类别**: 5. 协作心智模型混淆(环境 state 片面取样,同 #14 stale handoff 同构;不同点 —— #14 是 handoff 文字 stale,#22 是 handoff 内容自始片面)
- **教训**: Snapshot §8 "环境状态"表所有项必须基于 grep 实证(`docker ps -a` 全量 / `lsof -iTCP` / `ls compose files` 等),不能凭"上轮对话的活动主题"推断环境单一。Opus 写 Snapshot 时心智模型倾向 focus on 刚完成 task 的环境,须显式 enumerate 全栈。**响应已内化**: 本 Snapshot v2 regen §8 覆盖全 stack

#### #23 CC 封板 commit 指令 Stage A "±10% 内算通过" 硬约束违反 D83(near-miss,同对话规则循环)

- **描述**: Task 10 完成后,Opus 在同一对话内登记 D83 候选(Plan 绝对数字基准改用相对约束),紧接着产出 CC 封板 commit 指令时,Stage A "若 diff 规模大幅偏离预期 → 规则 8 暂停" + "diff stat 数字对齐预期 (±10% 内算通过)" 使用绝对数字硬约束 —— 直接违反刚登记的 D83 原则
- **谁拦**: CC Stage A 执行时 D83 形式防御触发 —— Fabrication Archive +19% / Digest +24%/-60% 超 ±10% 阈值 → 规则 8 暂停。**非 Opus 自审**
- **类别**: 1. 凭上下文/项目惯例推断(本对话延续 Task 9b Stage 9 "SHA 必须一致" / Task 10 Stage 8 "行数对齐" 硬约束习惯,未切换模式应用 D83)
- **特别性**: **同对话内规则登记 → 规则违反** —— D83 登记(CC commit 指令生成前 3 轮)→ D83 违反(CC commit 指令生成当下)。Opus 没在 chain-of-thought 激活"我刚登记的规则"
- **教训**:
  - D 规则登记后 **同对话内自己先应用一次** 作 self-audit。"新登记规则" 应进入当对话后续产出的 Pre-Flight Checklist
  - 数字偏差 verify 用 **定性约束**("实际比预期少,无 addition 超支 / 无 unexpected file 变动" = 放行)而非定量阈值(±N%)
  - D83 本身 reinforce: "touched files 内 0 new errors" = 定性,"wc -l == N ±10%" = 定量,后者是反模式

#### #23 的跨对话延伸变体(#24 实体,G2 arbitration 确认)

- **描述**: 本对话 Opus(Phase C L1 verify instance)反馈 §2 理由 3 implicit framing 将 Order.version 归 Task 7 context,实际 Task 2 `75fd9084` 初始加(D55/D56 B2 乐观锁,migration `20260417000001_extend_schema/migration.sql:198`)。被上对话 Opus(Task 10 收尾 audit handoff 阅读)发现,经 Ian 转达给新对话 Opus,Phase C Stage 0 G2 grep arbitration 确认
- **机制区分**: #23 是"本对话内新登记规则未激活",#24 是"读 handoff 引用的既有规则(Snapshot §4 Task 2-10 SHA 链)未激活"—— 前者规则登记时点在对话内,后者登记时点在上对话;两者 Opus 认知机制同构(读过 ≠ 激活)
- **防御扩展**: Pre-Flight Checklist 第 5 条扩展 —— 本对话内新登记规则 或 handoff / Snapshot 引用的既有规则 需主动激活。任何 factual claim 涉及 "哪个 task 加哪个字段 / 哪个 task 做了什么" 前,CoT 扫 Snapshot §4 SHA 链 + 若 unclear 让 CC grep schema / migration.sql 确证,不凭注意力停留的"活跃主题"推断归属
- **Archive §1 count 不变(23 条)**。#24 作为 #23 同类子类记录,不独立占编号

---

#### #25 Task 11 plan 未 grep already-applied Phase B migration DB-level literal(Cross-phase invariant 盲点首次登记)

- **描述**: Task 11 plan heredoc 自造 docker-compose.test.yml `POSTGRES_DB: qr_order_test` + healthcheck `-d qr_order_test` + package.json `test:integration` URL `qr_order_test`(3 处 plan literal)。Phase B migration `20260417000002_rls_and_roles/migration.sql:16` 硬编码 `GRANT CONNECT ON DATABASE qr_order`(migration-hardcoded DB literal)。两者 cross-phase literal drift,Task 11 plan 阶段未 grep Phase B migration 里的 DB-level literal 做 cross-phase 对齐。
- **谁拦**: Phase C Batch 1 Task 13 Step 6.3 CC runtime fail-loud —— `pnpm test:integration fixtures` 执行 globalSetup migrate 时 Prisma error `database "qr_order" does not exist`(migration SQL 引用 qr_order,test container 里 DB 名是 qr_order_test)。**CC 诊断 arc 干净**,未 rabbit hole env 继承,直接定位根因(line 16 migration literal coupling)。
- **类别**: 5. 协作心智模型混淆(**Cross-phase invariant 盲点**子类 — 不新独立 Category,挂 Category 5 下)
- **与 #23/#24 机制区分**: #23/#24 focus 在"已有规则 / SHA 归属 attention 层"(Opus 对既有文本的注意力分配);#25 focus 在"evidence search scope 层"(Opus 写 plan 时证据搜索范围的 cross-phase 盲点)。前者是读了没激活,后者是没扫到。
- **防御扩展**: 升格候选 **D84**(Cross-Phase Invariants 第四份 handoff 文件)+ Pre-Flight Checklist 扩展。任何 plan 内 literal(DB name / role name / container name / port / schema identifier / migration literal)出现在已有 migration / docker-compose / package.json 其他位置时,必先 grep cross-phase 实证。详 D84 候选 + handoff 文件 Phase 5 收尾 land。
- **教训**: 上下文已登记的规则(规则 1 增量 migration 铁律)+ handoff 引用的既有 commit 链(Phase B Task 4 migration 已 push + literal 已确定)→ 等同"既有规则"层,需主动扫描其字面量对 test plan 形成的 invariant 约束。
- **特别性**: **首次登记 Cross-phase invariant 盲点**。Phase B Task 4 (`2effedb5`) migration 已 apply 并 commit,Phase C Task 11 plan 若在写作时 grep 过 `migrations/*.sql` 的 DATABASE literal,此 drift 不会进 plan。plan 写作层的 grep 盲点先于 Opus 写作层 Pre-Flight Checklist 盲点一步。
- **响应**: Phase 5 handoff 包加第四份文件 "Cross-Phase Invariants"(D84 候选),首批条目:
  - `DB name = qr_order`(migration `20260417000002_rls_and_roles:16` GRANT CONNECT 硬编码,规则 1 增量 migration 铁律不可变)
  - 其他条目 Phase C/D/E/F/G 实施期识别后追加

---

**#25 subclass 注解 (path drift 变体,不独立编号)**

**事件**: 本对话 Phase C Batch 1 收尾多轮 docs commit spec,Plan Opus 多次用 `docs/superpowers/phase5/` 作 handoff 三文件路径,实际是 `docs/superpowers/archive/`。CC Edit 时按实际 grep 定位处理,未触发规则 8 (工具级 mechanical 自主校正,非 α/β/γ/δ 级判断)。

**Opus 行为层同构**: 和 #25 主 body 的 DB name cross-phase drift **完全同构** —— 都是 "Plan Opus 写 spec 前未 grep 外部 artifact 的字面量"。前者未 grep Phase B migration SQL 里的 `qr_order`,后者未 grep repo 实际 docs 目录结构。evidence search scope 层盲点。

**升格层区分**(影响 D84 收录范围,不影响行为层归类):
- **硬 invariant**(DB name / role name / migration literal): 改则 runtime 炸,规则 1 增量 migration 铁律不可变 → 进 D84 handoff 文件
- **convention**(repo 文件路径 / 目录组织): 可以 git mv,改了要更新引用但不炸 → **不进 D84**;更适合 Pre-Flight Checklist 新条款 "spec 内文件路径 claim 先 grep repo 结构" (Phase H Task 45 reconcile 定)

**归类**: 与 #24 作为 #23 的 attention 层跨对话变体以 subclass 注解存在同构 —— **本 path drift 作为 #25 的 evidence search scope 层 convention 变体以 subclass 注解存在,不独立编号**。

**Archive §1 count 不变**(仍 24 条)。累积在此 subclass 下比独立散点编号更易读,防信号稀释。

**教训内化 + 激活**: 本对话末次 CC 补丁 spec 中 dogfood — Edit 目标文件路径必先 grep verify,不凭 Opus 印象。

### Fabrication 元模式分布(本批)

| 模式 | 本批 fabrication |
|---|---|
| 隐式 assumption 未 verify(Plan heredoc / shorthand / 字面文字) | #20(Plan heredoc 字段名)/ #21(CC shorthand interpret) |
| 协作状态片面取样 | #22(环境 state) |
| **同对话规则循环**(登记规则后同对话内违反) | **#23**(D83 登记后立即违反) |

**频率**: 本对话 ~26 轮产 4 次 fabrication,Ian 1 次(#21)+ CC 3 次(#20 / #22 / #23),Opus 自审 0。比 v3 对话(~20 轮产 8)频率低,推测:Pre-Flight Checklist 初步应用 + 本对话复杂度中等。**#23 提示 Pre-Flight Checklist 需扩展条款**:"本对话内新登记的 D 规则 / 决议 / 教训,须在同对话后续产出中主动应用,不是等下对话 reference"。

---

#### #26 D86 语言层自违反 (Plan Opus `ca863caa` commit body 登记即违反)

- **描述**: Plan Opus 在 `ca863caa` (Phase C Batch 2 plan patch v5 commit, 2026-04-21 land) commit body 内登记 D86 候选 (Spec async-executable 原则). Body 文本含 "本对话 Ian meta observation" 等 session-relative 指示词, 直接违反 D86 核心原则 (禁止 session-relative 措辞 — 读者不知道"本对话"指哪一次). 登记 D86 的 commit body 本身不遵守 D86, 构成语言层自违反.
- **谁拦**: Ian 2026-04-21 一手 metacognitive — 读 `ca863caa` commit body 时识别 "本对话" 措辞与 D86 原则冲突.
- **类别**: 1. 凭上下文推断 — "同对话规则循环" 子类 (与 #23 同构, subclass 维度不同; #23 scope = 绝对数字基准约束规则领域 / #26 scope = 语言层 async-executable 规则领域).
- **教训**: D86 登记即自违反 是 D86 本身存在必要性的 live demo — 规则存在的理由是 Plan Opus 会自然产出 session-relative 语言 (LLM 在当前对话 context 下默认用 "本" / "上" / "这" 等指示词), 无 language-layer self-check 条款则 session-relative 语言在治理文档内 silent 蔓延. Ian 2026-04-21 观察 "系统治理不应依赖桥梁节点 session 连续性" 是对此 silent 蔓延的 meta-level 拦截.
- **响应**: D86 Digest §6 正式登记时 body 应用修正语言 (所有陈述用日期 / SHA / 具体事件 locate). Pre-Flight Checklist §7 应用方式段扩展 "Language-layer async-executable self-check" 条款, 要求所有治理与协作产出文档 spec 产出前全文扫 session-relative 指示词 → 替换. 与 D86 Digest 登记同步生效.
- **特别性**: **首次 "治理规则登记即自违反" 的跨规则重现**. #23 是 D83 登记后同对话内违反 (绝对数字基准约束), #26 是 D86 登记 commit body 内违反 (语言层 async-executable). 两例同机制 — Plan Opus 登记规则时 context 内对新规则注意力不足, 导致规则定义段 meta-level 遵守 (登记规则本体正确) 但产出段 live-level 违反 (登记 commit body 本身不符合所登记规则). 归 Category 1 "同对话规则循环" 子类, 与 #23 组对.
- **`ca863caa` 已 push 不 amend**: D77 forward-fix 模板 — 在 D86 Digest 正式登记时 body 应用修正语言, `ca863caa` commit body 历史原样保留作 live demo reference.

---

### 3.5 v5 批(Phase C 封顶 closure — Phase B 10/10 + Phase C 5/5 双里程碑节奏点)—— 1 项

#### #27 Plan Opus spec 内部不一致 (Plan heredoc / commit / file anchor literal 印象映射) — Phase C Batch 3 Task 15 CC 执行消息双数据点

- **描述**: Plan Opus 在 Phase C Batch 3 Task 15 CC 执行消息 spec (产出于 2026-04-21, Ian 明批 "Task 15 GO" 后) 写作时, 未 grep 实证 anchor literal, 凭对 plan / commit 内容的高层印象做 2 处事实断言 — CC fail-loud 拦截后均 Plan Opus α 接受 forward-fix:
  - **数据点 1 — Stage 0 setup.ts last commit anchor**: spec 写 `setup.ts 最近改动 = f49139a0 (v7 adminDb)`. 实际 `git log -3 setup.ts` = `308f7d54` (Task 14 feat code commit). v7 plan patch `f49139a0` 是 docs-only commit (仅改 phase-c-test-db.md +35/-7, 未 touch setup.ts). 语义层 `setup.ts ≡ v7 pattern landed (308f7d54 时同 Task 14 feat code 一并 land)` verified — Plan Opus 误把 plan patch SHA 映射为 file last-commit SHA, 混淆了 plan-patch-SHA (docs commit) 与 file-last-commit-SHA (code commit) 两个范畴.
  - **数据点 2 — Post-write wc -l verify range**: spec 写 `wc -l: 38 ± 2 = [36, 40]`. 实际 plan v8 heredoc body (phase-c-test-db.md lines 801-846 inclusive) = 46 lines. Plan Opus 写 spec 时凭印象, 未 `sed -n '801,846p' | wc -l` 实证. file content 逐字匹配 plan v8 verified (CC self-check 3-backslash-quote regex 命中 + grep count 14 + D86 scan clean + guard pass) — 唯一 drift = Plan Opus spec verify range 数字凭印象, 与 "plan v8 逐字" 指令逻辑不可同时满足.
- **谁拦**: CC fail-loud × 2 (规则 8 暂停 × 2):
  - 数据点 1: Stage 0 anchor verify, `git log setup.ts` 返实际 SHA `308f7d54` 与 spec 期望 `f49139a0` 对比, fail-loud 暂停, 等 Plan Opus 判 α/β/γ.
  - 数据点 2: Post-write verify, `wc -l` 返实际 46 lines 与 spec range `[36, 40]` 对比, fail-loud 暂停, 等 Plan Opus 判 α/β/γ.
  - Ian 转达 Plan Opus → α 接受双数据点 (语义层 verified 等价 spec 实际意图).
- **类别**: 1. 凭上下文/项目惯例推断 — **新子类 "Plan heredoc / commit / file anchor literal 印象映射"** (spec writer 凭对 plan / commit / file 内容的高层印象做 anchor literal 断言, 未 grep 实证). 子类与 #15 数量估算子类相邻但不同 — #15 是估自己产物行数 (Opus 估自己写多少), #27 是引用外部 artifact (plan / commit / file) 的 anchor literal (Opus 引用别人的内容做 anchor 断言).
- **共性 + Pattern**: Plan Opus 在 spec 复杂度 ↑ 场景 (Task 15 CC 执行消息含 8 anchor + 5 failure mode + 7 阶段 Stage 0 / Write / verify / docker / test / cleanup / commit / push) 注意力预算被结构性内容分散, anchor literal 子类未优先 grep 实证. Pre-Flight Checklist 既有条款 ("期望数量需 grep 实证") 主要捕获产物层数量, anchor literal SHA 映射子类 + heredoc 行数子类未在既有 Checklist 显式枚举.
- **教训**: spec writer 引用 plan heredoc 行数 / commit SHA / file last-modified anchor 时, **必先 grep 实证后再写**, 不凭对 plan 内容的高层印象映射. plan patch SHA (docs commit) 与 file last-commit SHA (code commit) 是不同范畴, 不应混用; heredoc 行数应 `sed -n` + `wc -l` 实证, 不应估算.
- **响应**: **D88 候选登记** (Snapshot v5.0 §6 + 同期 Digest §6). D88 4 维度 self-audit 第 3 维度 "Anchor literal grep 实证" 子规则强约束此模式. Phase H Task 45 升格.
- **D77 forward-fix 模板**: spec 已 push 不 amend, Plan Opus α 接受双数据点作 valid (语义层 verified 等价 spec 实际意图), `035cdee2` commit body Governance 段记录"2 处 spec 内部不一致 forward-fix" + Phase H Task 45 Pre-Flight 候选条款 input 登记.
- **特别性 (相对 #23 / #26)**: #23 是 D83 登记后同对话内违反 (绝对数字基准约束领域), #26 是 D86 登记 commit body 内违反 (语言层 async-executable 领域), **#27 是 spec writer 凭印象做 anchor literal 断言 (anchor literal 引用领域) — 与 #23 / #26 同 "凭注意力盲点违反" 机制, 但不同 trigger** (#23/#26 是登记新规则后违反同规则; #27 是 spec 复杂度 ↑ 场景下 anchor literal 子类未触发既有 Pre-Flight 条款). 三者共同提示 Plan Opus 注意力盲点 — Pre-Flight Checklist 防御 ≠ 自动应用, 复杂度 ↑ 场景下注意力分散 → 子类边缘场景失守.
- **元观察 — Helper Opus 跨 chat raise + Plan Opus 修正路径首次试运行**:
  - Helper Opus 在外部 chat instance (与 Phase C Batch 3 closure 同时点) 独立观察 Phase 5 后期 CC 执行 value-density 表, raise D88 雏形 (4 模式 A/B/C/D 分级 — A 机械落盘 / B 简单 git / C Patch + verify / D Code + runtime, 主张 A/B 绕过 CC 节省时间)
  - Plan Opus 在 Phase C Batch 3 closure 期 evaluate Helper raise, 修正版 D88 4 维度 self-audit, 加入维度 3 anchor literal grep 实证 (直接响应 #27 双数据点) — 不消除 CC 模式 A 的 verification 层 (D75 / wc / D86 scan 保留, Ian 跑 3 行 bash command 等价) / 不主张 CC "co-thinker" 化 (保持 fail-loud 机械执行 = defense-in-depth 第 3 层) / 维度 3 核心治理意义 > value-density 优化
  - Helper 与 Plan 角色边界 + 规则进入路径首次 live demo, Phase H Task 45 治理结构化 input

- **Type β 子类附加数据点 (Phase C 封顶 v5.0 regen 期, compact 后 self-error fabrication)**:
  - 事件: Plan Opus 在 Phase C 封顶 v5.0 regen 产 Archive v5 期间, 经 compact 后对 self-produced artifact (Archive v5.md 已写完 §3.1-§3.5 完整内容) 失去精确记忆, 凭印象 self-claim "我刚才用 freeze 不展开策略压缩 v3 §3.3 + v4 §3.4 原文, 违反 Archive 设计原则 '不删除不改写'", 提议 redo Archive v5. Ian 一手 metacognitive 拦截 + grep 实证 (493 lines + 全 5 ### 3.x section heading + #11 完整 4 字段) → fabrication 否认: actual content 完美保留, 我 self-claim 是 Type β fabrication.
  - 同根源 Ian-side 数据点: Ian 读 compact 摘要 (含 Archive v5.md "PARTIAL - in progress" 标识) flag "line 253 D86 violation '本对话 #27 双数据点'", 实际 outputs file line 253 是 `---` horizontal rule, §6.2 line 416 已是 "Phase C Batch 3 closure 期 #27 双数据点" Phase 锚 (我 v5.md redo 时 §6.2 patch 同步 land 修正版). 同模式 — compact 摘要语义梯度副作用对 in-progress artifact 失去精确状态.
  - 共性: **compact 后对 self-produced artifact 失去精确记忆, 凭印象 fabricate self-error** (我这一侧) / **compact 摘要语义梯度对 in-progress artifact 失去精确状态, 凭摘要 flag stale violation** (Ian 这一侧) — 双方同 root cause. 与 #27 主体双数据点 (Plan Opus spec 写作期凭对 plan / commit / file 内容的高层印象做 anchor literal 断言) 共享 "凭印象映射" 机制, 但 trigger 不同 — 主体双数据点是 spec 写作复杂度 ↑ 场景注意力分散, Type β 是 compact 后对 self-produced / in-progress artifact 缺乏精确锚点.
  - 防御候选 (下窗口 D88 正式登记时考虑): "**compact 后对 self-produced / in-progress artifact 必先 cat / grep verify 再做 self-claim 或 redo 决策**" 子规则候选, 与 D88 维度 3 anchor literal grep 实证同构 — 不凭对 self-produced artifact 的高层记忆映射, 必先 grep 实证 actual content 后再判断. **本窗口不动 D88 维度 3 设计 (修正版 4 维度已确定)**, 仅作 Type β 数据点 ack 登记, 下窗口 D88 正式登记时 sub-rule 候选 input.
  - **特别性**: Type β 是 #27 主体双数据点之外的同模式延伸数据点 — 提示 "凭印象映射" 类 fabrication 不限 spec 写作复杂度场景, compact 后 self-produced artifact 场景同样 vulnerable. defense-in-depth 第 6 层 Helper-Plan / 跨对话双向互审在此被 Ian metacognitive 一手拦截激活 — Ian 不仅 metacognitive 路由节点, 也是 self-error fabrication 终极拦截层.

### Fabrication 元模式分布(本批)

| 模式 | 本批 fabrication |
|---|---|
| **Plan heredoc / commit / file anchor literal 印象映射** (spec writer 凭对外部 artifact 的高层印象做 anchor literal 断言) | **#27**(双数据点合并 — setup.ts last commit + wc -l verify range) |
| **跨 chat 元层路径首次试运行** (Helper raise + Plan evaluate / 修正) | **#27 元观察** (非 fabrication, 是治理路径 live demo) |

**频率**: Phase C Batch 3 closure ~22-25 轮产 1 双数据点合并独立编号. 比 Phase C Batch 2 (~40+ 轮产 0 critical) 略高, 主要由 Task 15 CC 执行消息复杂度 (8 anchor + 5 failure mode + 7 阶段) 触发. **#27 提示 Pre-Flight Checklist 既有条款覆盖产物层数量但 anchor literal 引用层未显式枚举** — D88 维度 3 强约束直接响应此盲点.

---

### 3.6 v6 批(Phase D 整体 closure — Phase D 11/11 + 附录 5 ✅ Phase D 完成 milestone 节奏点, `11082a96d052a615172de2e6491f0d5b6e22a9e2` 段 A governance升格 commit, 2026-05-23)—— 4 项 + Cat 5 sub-family integration enumeration + §3.6 附 D91 SV enumeration table

#### #28 Snapshot v5.0 self-fabrication (Phase 封顶 regen 期 enumerable count + SHA cite 印象产出)

- **描述**: Plan Opus 在 Phase 封顶 v5.0 regen 期 (`851505d9` 2026-04-25 governance commit) 凭印象产出 enumerable count + SHA cite, 未 grep schema.prisma / cat prisma-client.ts / git log 实证. Phase D Task 16 启动 Stage 0 (`019ab826` Phase D-1) CC fail-loud 拦截 + Helper Opus cross-instance review 2026-04-26 第 2 turn 同模式 anchor literal 印象映射 flag 累积. 3 fabrication 数据点 (#28-DP1+#28-DP2+#28-DP3) + 1 env-state observation (#28-DP4, NOT-fab 排除):
  - **#28-DP1** (count drift): "21 model (16 主表 + 6 子表)" literal × 2 处 (§8 line 408 + §9.5 G-D16.4), 实证 = 22 model (+PlatformAuditLog as 16th 主表)
  - **#28-DP2** (wrapper count drift): "3 wrapper (withTenantContext / withPlatformContext / withTenantContextAndHooks)" 实证 = 4 wrapper (漏 `withSystemContext`)
  - **#28-DP3** (SHA cite drift): §9.5 G-D16.2 cite "Phase B `49a53a3a` + `60fdcfe0`" 实证 = `820389a9` + `49a53a3a` (`60fdcfe0` 是 Task 7 shared/types.ts 不是 prisma-client.ts)
  - **#28-DP4** (env-state observation, NOT-fab 排除): tsc baseline 103 cite vs Stage 0.7 pre-generate 测得 123 (drift +20). Stage 4.2 post-generate (`pnpm prisma generate`) 测得 103 = cite 准确. Root cause = Time Machine restore 后 Prisma Client 未 generate (env transient drift, see snapshot §7.15 Time Machine env gap pattern 第 3 数据点). NOT cite stale, NOT fabrication
- **谁拦**: CC fail-loud Stage 0/4 grep (Phase D Task 16 期) + Helper Opus cross-instance review 2026-04-26 第 2 turn (defense-in-depth 第 6 层 retrospective fabrication 暴露 working-as-designed)
- **类别**: 1. 凭上下文/项目惯例推断 — **新子类 "Phase 封顶 regen 期 enumerable count + SHA cite 印象产出"** (与 #15 数量估算 / #20 Plan heredoc 字段印象 / #27 spec writer anchor literal 印象映射 相邻子类家族, 共 root cause = Plan Opus 凭印象 vs 实证 grep)
- **响应**: forward-fix land at `019ab826` Phase D Task 16 commit body Self-flag 段 (Snapshot §8 + §9.5 G-D16.2/4 21 → 22 model + 3 → 4 wrapper + SHA cite forward-fix). 防御 = fold 进 SPV-1 (count / SHA cite 必 atomic state-pinned grep)
- **特别性**: 首次"Phase 封顶 regen 期"作为 fabrication trigger context 显式登记. Phase 封顶 regen 本身是 Plan Opus 注意力盲点高发场景 (regen 全文重写, 易凭印象覆盖原文). #28-DP4 区分 env-state observation vs cite self-stale 子规则候选 (post-recovery state verify 才判 cite 真 stale, 防 false positive Archive 登记)
- **外化锚**: `851505d9` (fabrication 源 #28-DP1+#28-DP2+#28-DP3) + `019ab826` Phase D Task 16 commit body Self-flag forward-fix + Phase D Task 16 work-log G-D16.2/4 + Helper 2026-04-26 cross-instance review 第 2 turn flag

#### #29 D88 维度 3 anchor literal grep 实证 (9 sub-instance, pre-`c0b8f4e0` SHA-anchor 边界)

- **描述**: Plan Opus 写 spec / commit body / work-log 引用 plan heredoc / commit / file anchor literal (SHA / 行号 / 字段名 / path / count threshold) 凭印象, 未先 grep / cat / git log 实证. 9 sub-instance 累积 pre-`c0b8f4e0` (D89 formal land at 2026-05-12) 期间
- **边界 ack (SHA-anchor 锁定 per Helper M5 turn-5 修法)**: 全 9 sub-instance pre-`c0b8f4e0`; D91 SV (Task 22-26 post-D91-proposal) / #31 (D89 升格 spec self-violation) 等 post-`c0b8f4e0` 数据点 NOT 入 #29 计数 (避免与 D91 SV table §3.6 附 / #31 sub-instance 双重计数). 边界 SHA = `c0b8f4e0`
- **9 sub-instance** (Task / SHA / 内容 / Era 四列, atomic single-source each):

| # | Task | SHA | 内容 | Era |
|---|---|---|---|---|
| 1 | Task 15 | `035cdee2` (feat) — Archive #27 DP1 | setup.ts last commit `f49139a0` docs-only vs 实际 `308f7d54` feat code | Phase C Batch 3 closure |
| 2 | Task 15 | `035cdee2` (feat) — Archive #27 DP2 | wc -l `38 ± 2` vs 实际 46 heredoc | Phase C Batch 3 closure |
| 3 | Task 16 | `019ab826` | Risk C moduleResolution NodeNext/Node16 vs bundler | Phase D-1 |
| 4 | Task 17 | `ff5e881b` | G-T17.6 path literal `server/node_modules/.prisma/...` vs pnpm hoist `node_modules/.pnpm/.../` | Phase D-2 |
| 5 | Task 17 | `ff5e881b` | Stage 1 D56 grep `grep -c "itemKey" = 0` vs 实际 3 (doc comment) — spec 与自身 heredoc body 不自洽 | Phase D-2 |
| 6 | Task 17 closure | `3bb5cd1c` (round 2) | Workspace folder 双空格 path | Phase D-2 closure |
| 7 | Task 17 closure | `3bb5cd1c` (round 2) | Plan Opus v5.0 `851505d9` commit body self-claim "0 violation" vs 实际 5 处 | Phase D-2 closure |
| 8 | Plan v10 batch | `39666dc8` | Stage 0 HEAD anchor `7ec04772` 凭 Ian 启动消息 baseline + Snapshot §1 半 stale 印象 → 实际 `aa7d5829` | Phase D-5 batch L1 (D89 升格 trigger) |
| 9 | Plan v10 batch | `39666dc8` | Stage 2 `\bclockOut\b count = 0` expectation vs Patch D new_str docstring `(double-clockOut guard)` literal collision self-cross-scan missing | Phase D-5 batch L1 (D89 升格 trigger) |

- **谁拦**: CC fail-loud × 9 (Stage 0 / Stage 2 / Post-write verify; defense-in-depth 第 3 层 mechanical anchor verify)
- **类别**: 1. 凭上下文/项目惯例推断 — **子类 "Plan Opus spec writer anchor literal 印象映射" (D88 维度 3 family)** (与 #15 / #27 / #28 同 root cause family)
- **响应**: D89 formal land at `c0b8f4e0` (2026-05-12) 替代 D88 维度 3 候选 + 强化 anchor literal source freshness mandate. **防御** = fold 进 SPV-1 (count / SHA atomic state-pinned) + SPV-2 (grep pattern verbatim) + SPV-4 (state assertion inline 实证标)
- **特别性**: 9 sub-instance 跨 Phase C Batch 3 closure → Phase D-1/2 → D-5 batch L1 (D89 升格 trigger), trend rising 触发 D89 升格. Post-D89 land 之后的 self-violation 已分类入 D91 SV table 或 #31 (D89 升格 spec self-violation), 不入 #29
- **外化锚**: `ff5e881b` commit body Self-flag #29 base 5 数据点 + `3bb5cd1c` Task 17 round 2 #6/#7 + `39666dc8` plan v10 batch #8/#9 + `c0b8f4e0` D89 升格 commit body "#29 ... 9 sub-instance" ack (atomic SPV-1 cite source per parent spec C_29_count record)

#### #30 D79 Plan-as-code dryrun missing (3 sub-instance, `#30-DPn` namespace 强制)

- **描述**: Plan Opus 写 spec 含跨 model nested create / framework type system feature / tooling environment-dependent semantics 时, 未 dryrun 实证 (实跑 minimal heredoc / web search version doc / cat tsconfig / etc), 凭 prior idiom 印象产出 → CC Stage 2 fail-loud 拦截
- **3 sub-instance** (Task / SHA / 内容, `#30-DPn` namespace per Helper M5 turn-5 修法避 Cat 5 DPn 撞车):

| # | Task | SHA | 内容 |
|---|---|---|---|
| #30-DP6 | Task 17 Stage 2 TS2322 | `ff5e881b` | createDraftOrder + replaceDraftItems Prisma Create vs UncheckedCreate XOR semantics 推断 fail — 凭旧 idiom 印象, 未 dryrun verify XOR semantics |
| #30-DP7 | Task 17 Step 2-fix.0 | `ff5e881b` | schema field discovery missing — Order.tableName String required (D68 snapshot 哲学) heredoc 漏写 + OrderItem.menuItemId raw NO @relation spec 误提议 menuItem connect — 凭"标准结构"印象, 未 cat schema.prisma full enumeration |
| #30-DP10 | Task 19 G-T19.6 | `a7752a30` | spec literal `tsc --noEmit src/file.ts \| grep -cE "error TS"` 期望 = 0, 实际 raw=4 env noise (3× TS18028 @prisma/client/runtime/library.d.ts + 1× TS2403 @types/google-apps-script) — bare tsc invocation 默认 ES3 vs Prisma 6 ES2015+ 冲突. α 决议 forward-only filtered semantics Task 20+ standardize (D77 不 retro-amend Task 17/18/19 已 land work-log) |

- **谁拦**: CC fail-loud × 3 (Stage 2 / Step 2-fix.0 / G-T19.6 spec literal raw vs filtered semantics drift)
- **类别**: 3. 凭框架/技术机制印象 (与 #13 Express 4 augment target 印象 同类)
- **响应**: D79 候选 (Plan-as-code dryrun 前置) Phase H Task 45 升格队列, **防御** = fold 进 SPV-1 (filtered grep semantics 由 SPV-1 atomic state_pinned 测量产出 forces 实测形式) + parent spec governance queue 第 6 条 "Task 20+ G-Tn.6 spec literal filtered semantics standardize" 已 fold 进 SPV-1 (Helper M5 disposition 锁定)
- **特别性**: `#30-DPn` namespace 前缀 (强制 vs Cat 5 DPn 撞车 — `#30-DP6/7/10` 是 D79 dryrun missing data points; `Cat5-DP6/7/10` 是 Cat 5 协作心智模型混淆 data points). 全 namespace prefix 文档全文 verify 强制 per Helper M5 修法
- **外化锚**: `ff5e881b` commit body Self-flag #30 candidate base 2 数据点 + `a7752a30` commit body G-T19.6 段 + `ad7a5152` Phase D-3b closure docs sync §7.20 G-T19.6 spec literal definition-incompatible

#### #31 D89-升格 spec self-violation (规则循环, #23 / #26 sibling)

- **描述**: D89 升格 spec (governance commit `c0b8f4e0` 2026-05-12 Plan Opus 写) 自身违反 D89 mandate 多达 5 distinct instances within single field test. CC defense-in-depth fail-loud 三层兜底 catch, 0 forward propagation — single spec field test 即 catch + validate D89 mandate value 5x
- **类别**: 1. 凭上下文/项目惯例推断 — **子类 "规则循环" (登记规则 commit 内自违反所登记规则)**, 与 #23 (D83 登记后同对话内违反) / #26 (D86 语言层登记 commit body 内自违反) sibling. 三者共同提示 Plan Opus 登记新规则时 context 内对新规则注意力不足, 规则定义段 meta-level 遵守 (登记规则本体正确) 但产出段 live-level 违反 (登记 commit body / 同对话产出 不符合所登记规则)
- **5 sub-instance** verbatim from `c0b8f4e0` commit body Self-flag 段 (Instance 1-5, 四列 — Instance / 兜底层 / 违反 verbatim / SPV mapping):

| Instance | 兜底层 | 违反 (verbatim c0b8f4e0 body) | SPV |
|---|---|---|---|
| I1 | Stage 0 fail-loud (CC ls) | path anchor: `docs/superpowers/handoff/` vs 实际 `docs/superpowers/archive/` — Plan Opus 凭 Project knowledge mirror file content view 推断 directory, D89 entry 禁印象 source 之一 命中 | SPV-4 (path state assertion 必标实证) |
| I2 | Stage 2 fail-loud (CC grep) | new_str self-cross-scan: Stage 2 grep 期望 `D89 候选升格判 count = 0` vs Patch E new_str 内含 transition meta-description ("D89 候选升格判 → D89 formal land at `<D89_SHA>`") literal — Plan Opus 设计 Stage 2 期望时未 cross-scan 自身 new_str body literal collision (同 plan v10 Patch D `(double-clockOut guard)` Stage 2 collision pattern, see #29 sub-instance #9 parallel) | SPV-2 (grep pattern verbatim verify with `expected_match_lines` 字段) |
| I3 | Stage 2 fail-loud (CC grep) | pre-existing + new_str combined: Stage 2 grep 期望 `+ 5 entries count = 0` vs pre-existing snapshot v5.X 批 entry + Patch E new_str transition meta-description — Plan Opus 设计 Stage 2 期望时未 grep 实证 pre-existing snapshot 内容 + 未 cross-scan 自身 new_str body | SPV-2 (grep pattern verbatim verify) |
| I4 | Stage 2 fail-loud (CC grep) | self-design count drift: Stage 2 grep 期望 `<D89_SHA> count = 4` vs 实际 9 (digest 3 + snapshot 6) — Plan Opus 自身 design mental count Patch B 1 + C 1 + D 1 + E 2 = 4, 实际 Patch B 3 + C 1 + D 1 + E 4 = 9. 印象映射 self-count drift, 未 Spec A 写完后 grep self-verify | SPV-1 (atomic single-source citation, 禁合成公式 — mental "B1+C1+D1+E2=4" 即合成公式命中 SPV-1 §3.3 禁令) |
| I5 | Stage 2 ambient | NEW-from-batch = 0 confirmed: Stage 2 D86 0-hit 期望 vs pre-existing digest 含 D86 rule definition + Archive #26 violation registration + D88 entry references (8+ ambient hits). NEW from 本 batch Edits = 0 ✅ (git diff filtered). Plan Opus 设计 D86 0-hit 期望时未 account governance file 天然含 D86 rule meta-content | SPV-2 (grep pattern verbatim + ambient vs new-from-batch 区分) |

- **Root-cause 分组** (verbatim c0b8f4e0 body "Pattern family" 段, NOT 引入 "Type β" framing per Helper M5 turn-7 修法):
  - **{I1} stale-source** — Project knowledge mirror stale source
  - **{I2, I3, I4} self-produce** — self-produce new_str body 内 substring + self-count mental drift
  - **{I5} ambient** — ambient governance content 未 account

- **Cross-reference**:
  - **I2 ↔ #29 sub-instance #9** (verbatim c0b8f4e0 body "同 plan v10 Patch D `(double-clockOut guard)` Stage 2 collision pattern"): distinct event (plan v10 batch 2026-04-30 vs D89 升格 2026-05-12), NOT 并入 #29 计数; same family = self-cross-scan missing collision pattern
  - **I4 cross-ref NOT 加 to Archive #27** (per Helper M9 turn-9 pre-flight 决议): #27 数据点 2 source = external plan v8 heredoc body wc -l vs 实证; #31 I4 source = self-design Spec A patches count mental vs 实证 — distinct source (external vs self-produce), 加 cross-ref 会模糊 distinction. c0b8f4e0 Pattern family 段已自含 root-cause grouping, 不需 cross-ref

- **Meta-point forward-note** (per Helper M5 turn-7 起草指令): D89-升格 spec 自违反 D89 mandate 多达 5 distinct instances within single field test, 但 CC defense-in-depth fail-loud 兜底 0 forward propagation — single spec field test 即 catch + validate D89 mandate value **5x**. 升格 D89 entry strength validation 极强 (per c0b8f4e0 body Meta-irony 段 verbatim). **⚠️ D89 升格本体 = Phase H Task 45 后续 ripening, NOT 本 closure (D89 已 formal at `c0b8f4e0`, 本 #31 entry 只 archive D89 升格 spec 自身 5 sub-instance; "validates D89 mandate value 5x" 是 forward-note 给 Phase H Task 45 / Phase E controller 实施期参考, closure 不据此 promote D89, 不写 D89 升格 entry**)

- **Re-classification trace** (per Helper M5 turn-7 起草指令, 显式写入 closure spec 非 silent):
  - `c0b8f4e0` commit body verbatim: "Cat 5 子项 数据点累积 +5 instances (本 batch Instance 1-5, 升格 spec field test 即 immediate 验证 D89 mandate value, 升格判 ripening 累积进 fab archive 升格 候选 — 下次 governance commit batch atomic decide ..."
  - **本 closure = "下次 governance commit batch"** (Phase D 整体 closure 段 A `11082a96d052a615172de2e6491f0d5b6e22a9e2`, 2026-05-23)
  - **决议**: 5 instance 出 Cat 5 accumulator → 入 #31 (规则循环 子类, 内容属 D88-维度-3 anchor-literal family 非心智模型混淆)
  - **后果**: Cat 5 = 11 (Cat5-DP1..8 + Cat5-DP10..12, Cat5-DP9 informational + 升格规则循环 5 均排除) 因此干净 — see §3.6 附 Cat 5 sub-family integration enumeration table

- **谁拦**: CC defense-in-depth 三层 fail-loud × 5 (Stage 0 ls + Stage 2 grep × 4)
- **响应**: D89 mandate self-validation 5x (Meta-point forward-note), NOT promote D89 (Phase H Task 45 ripening 后续); 5 sub-instance formal archive 入 #31 (规则循环子类), Cat 5 enumeration table 排除 (re-classification trace 显式), SPV-1/2/4 各 instance mapping (上表). 防御 = fold 进 SPV-1/SPV-2/SPV-4 已含 (无新 D rule 候选)
- **特别性**: 第 3 个 "治理规则登记即自违反" 跨规则重现 (sibling = #23 D83 / #26 D86). #31 与 #23/#26 共同提示 Plan Opus 登记新规则时注意力盲点是 long-standing pattern, 三例同机制不同 trigger context. Single spec field test 5 distinct instance accumulation = D89 mandate value 最强 entry strength validation evidence
- **外化锚**: `c0b8f4e0` commit body Self-flag 段 (5 distinct instances verbatim source) + Pattern family 段 (root-cause 3 grouping {I1} stale-source / {I2,I3,I4} self-produce / {I5} ambient) + Meta-irony 段 (validate D89 mandate value 5x) + `11082a96d052a615172de2e6491f0d5b6e22a9e2` 本 closure 段 A re-classification trace

#### §3.6 附 — D91 SV (self-violation) enumeration table (7 sub-instance, support §6 D91 entry SV total / post-proposal counts + parent spec SPV-1 C_D91_SV_total / C_D91_post_proposal)

- **位置**: §6 D91 formal entry 引用 "SV total = 7 / post-proposal = 6", 论据骨头 = post-proposal 6. 本附 table 提供 atomic single-source enumeration cardinality (per Helper M7 turn-7 修法 c+d)
- **7 sub-instance** (SV-N / Task / Round / 谁拦 / 内容 / Forward-fix, 7 atomic single-source rows post-D91-proposal `73d5c225` 2026-05-14 后累积):

| SV-N | Task / Round | 谁拦 | 内容 | Forward-fix |
|---|---|---|---|---|
| SV-1 | Task 22 Step 1 G-T22.2 (`2590ab04` 2026-05-14) | Ian Observation 1 (post-Step-1-land) | pre-write "Expected schema field literals" 未先 CC dump (γ path forward-only — 候选 propose origin 自身, 不计 post-proposal) | γ path forward-only NOT retro-amend `2590ab04` (per D77 spirit; `2590ab04` 保留作 D91 ripening evidence base 1st data point) |
| SV-2 | Task 24 Stage 1.5 `expiresAt: null ≥ 2` 印象 (`83885944` 2026-05-21) | CC Worker fail-loud Stage 1.5 | hardcoded threshold pre-write 印象 vs 实际 heredoc 仅 1 occurrence | α path Stage 1.5 threshold pre-write fix (post-write α 接受 forward-fix) |
| SV-3 | Task 25 Round 1 β-path #2 scope under-extension (`d2792b6d` 2026-05-22) | Helper Flag 1 (cross-instance review) | phone strict 仅 add() 端 drop `?+\|null`, 未扩展 updateEntry 端 (Prisma WaitlistEntryUpdateInput compile-time check 本可 catch) | Patch B Mode 1 absorb (spec 修订 instructions per Helper protocol) |
| SV-4 | Task 25 Round 2 G-T25.12 hardcoded `= 5 expected` (`d2792b6d`) | Ian one-pass (post-Helper-review) | hardcoded count baseline 凭印象 (D83 反模式) | Patch B Mode 1 round 2 absorb |
| SV-5 | Task 25 Round 3 G-T25.6.1 estimatedWait threshold `= 0` (`d2792b6d`) | CC Worker fail-loud Stage 1.5 | missed top NOT-in-scope ack ref (parallel pattern 应用 lag — parallel to G-T25.6.9 notifiedAt = 1 design correctly applied to notifiedAt but missed applying same pattern to estimatedWait same NOT-in-scope comment block) | α path forward-fix gate threshold `= 0` → `= 1` precise + disambiguate location verify |
| SV-6 | v13 Round 4 `^## Task 26:` ASCII vs `## Task 26：` 全角 colon (`e760679b` 2026-05-22) | CC Worker fail-loud Stage 0 | grep pattern ASCII colon vs plan source 实际 full-width colon — pattern matching missed (机械捕获) | Patch B Mode 1 `[:：]` char class fix (Pattern #10 (e) source-assertion anchor literal 子类首次显式) |
| SV-7 | Task 26 Round 5 G-T26.6.6 broad regex JSDoc false positive (`d97ae039` 2026-05-22) | CC Worker honest self-report (initial local adapt) + Helper review SV-7 可见 (eyeball read verbatim 行) | grep pattern breadth 过宽误命中 JSDoc 段 — SPV-2 "可见" NOT "机械捕获" (数量对但 JSDoc 段 vs code 段视觉可辨, Helper review verbatim `expected_match_lines` 字段眼读 catch) | Patch B Mode 1 absorbed (Worker CC discipline progression Round 5 honest self-report → Round 6 proper pause+report+enumerate) |

- **post-D91-proposal subset** (SV-2..SV-7, exclude SV-1 propose origin): **6 atomic single-source rows**. 此 = §6 D91 entry body 论据骨头 "post-proposal violation = 6" 计数 (per Helper M7 turn-7 修法: 6 不能只靠 cite 7, 必须独立 atomic enumeration cardinality)
- **NOT 援引 #29 (9 sub-instance)**: #29 边界 = pre-`c0b8f4e0` D88 维度 3 anchor-literal instances; D91 SV 边界 = post-`c0b8f4e0` Task 22-26 D91 candidate / formal self-violations. Boundary 锁 = `c0b8f4e0` SHA (per Helper M5 turn-7 边界口径修正). 无重叠
- **响应**: Phase D 整体 closure 节奏点 D91 升格 formal at §6 D91 entry, 本附 table support SV total / post-proposal atomic citation. 防御 = SPV-1 atomic single-source measurement + SPV-2 verbatim grep pattern + SPV-4 inline 实证标 全 forces post-D91-formal Plan Opus spec writer evidence-first 纪律
- **外化锚**: 各 SV-N origin SHA commit body Self-flag 段 / work-log §10 累积清单 / `11082a96d052a615172de2e6491f0d5b6e22a9e2` 本 closure 段 A D91 升格 formal entry

#### §3.6 附 — Cat 5 sub-family integration enumeration (11 sub-instance, support §2 Cat 5 + parent spec SPV-1 C_Cat5_total)

- **位置**: Cat 5 = 类别 5 协作心智模型混淆 (per §2 类别 5 — 成员 #7/#9/#10/#11/#14/#22/#25 等). 本附 entry 列入 Cat 5 sub-family (Phase D 期累积 Plan Opus / Helper / Worker CC 外部 system topology / path / content-state assumption sub-instance), 与 §2 Cat 5 成员 fab# 平行 — sub-family = Cat 5 内部 sub-grouping, NOT 独立 Cat 类别
- **11 sub-instance** (Cat5-DPn / Origin SHA / 内容, 11 atomic single-source rows; **Cat5-DP9 informational 排除, 升格规则循环 5 instance 排除 (per #31 re-classification trace)**):

| Cat5-DPn | Origin SHA | 内容 |
|---|---|---|
| Cat5-DP1 | `3bb5cd1c` (Task 17 round 2 closure) | Cowork workspace path 假设 (跨 system topology, snapshot §7.19 数据点 1) |
| Cat5-DP2 | `3bb5cd1c` (Task 17 closure) | Helper Round 2 Flag A 误归 §6 forward-looking 措辞冗余 |
| Cat5-DP3 | `ad7a5152` (Phase D-3b closure) | Plan Opus working tree vs project knowledge file 存在性 混淆 (Phase D-3b Step 1 lead-up, CC Stop fail-loud 拦截 working-as-designed) |
| Cat5-DP4 | `ad7a5152` (Phase D-3b closure) | Plan Opus path 凭印象 cross-system topology (`handoffs/` vs `archive/`, Phase D-3b §F Stage 1) |
| Cat5-DP5 | `ad7a5152` (Phase D-3b closure) | Plan Opus assumed project knowledge file content = current repo state (Phase D-3b §F Stage 1, Task 18 closure 增量 in /mnt/project draft 但 deferred from repo) |
| Cat5-DP6 | `ffc7719f` (Phase D-4 closure) | D-4 batch entry CC dump batch-level pre-empt (6+ 字段 drift 3 task in spec 写作前 catch) |
| Cat5-DP7 | `ffc7719f` (Phase D-4 closure) | D-4 closure Snapshot path 假设 self-application (`docs/handoff/` vs `docs/superpowers/archive/`) |
| Cat5-DP8 | `ffc7719f` (Phase D-4 closure) | D-4 closure Round 3 sed double-replace self-referential artifact + Round 4 D77 forward-fix `CLOSURE_SHA_PENDING` 同 pattern 复现 (接受 as governance trace 保留) |
| Cat5-DP10 | `755b7735` | SYSTEM_DATABASE_URL repo-layer module-load + test infra env script 缺失 — Task 24 Stage 5 fail-loud catch (Cross-Phase env-var coupling) |
| Cat5-DP11 | `8ce5c61a` | vitest 4 filter glob mismatch (`test:integration` script glob 与 vitest 4 新行为不符) — Task 24 Stage 5 fail-loud catch |
| Cat5-DP12 | `c9e14e33` | fixtures.test.ts:17 Phase C Batch 2 dual-URL transition residue — 加 `withTestTenant` RLS context wrap. Task 24 Stage 5 fail-loud catch |

- **Cat5-DP9 informational 排除 ack** (per snapshot §7.23 line 646): Task 23-26 light scan 4 NEW drifts catch — D89 path B forward investment scope 扩展, 相同 root cause family with Cat5-DP6/7/8 = "Plan April-era assumption vs schema evolution drift". **NOT 升级 Cat 5 count by Cat5-DP9** (informational subordinate 同 root cause, 不独立 data point). Cat5-DP8 → Cat5-DP10 编号 gap 是故意的, 表 enumeration 不含 Cat5-DP9 行
- **升格规则循环 5 instance (#31 I1-I5) 排除 ack** (per #31 re-classification trace): c0b8f4e0 commit body 早期 ack "Cat 5 子项 数据点累积 +5 instances" — 本 closure batch atomic re-classify 出 Cat 5 → 入 #31 (规则循环子类, 内容属 D88-维度-3 anchor-literal family 非心智模型混淆)
- **NOT 援引 c0b8f4e0 body "11 sub-instance" 作 cross-source corroboration** (per Helper M5 turn-5 false corroboration danger): c0b8f4e0 commit body 早期 "Cat 5 子项 11 sub-instance" 是 pre-`755b7735` / `8ce5c61a` / `c9e14e33` era 不同构成, 数值与本 closure batch 11 enumeration 巧合, **NOT 印证**. Cat 5 = 11 锁定**仅靠**本表单源 enumeration cardinality (per parent spec SPV-1 C_Cat5_total record)
- **Helper M11 grep detector acked categories** (4 项, per Plan Opus 段 B Round 3 forward-fix 2026-05-25 — 段 B Stage 1 sub-spec design gap reconciled: line 5 verify-keep vs line 26 ≤5 bare DPn 冲突 absorb):
  - **(1) Prefix-led slash-list propagation**: e.g. `Cat5-DP6/DP7/DP8` 后续 `DP7` `DP8` 接受 — qualifier propagates within slash-list semantic (Helper M11 detector regex 不 require explicit prefix per item if leading qualifier 已声明)
  - **(2) Qualifier-prefixed**: e.g. `Archive #27 DP1` / `#27-DP1` / `#29-DP1` — explicit fab# anchor, qualifier 形式可变 (`Archive #N DPm` literal-text form OR `#N-DPn` hyphen-prefix form 均 acked)
  - **(3) OLD_STRING verbatim-match anchor**: Edit tool spec 内 old_str / SPV-2 expected_match_lines / grep command pattern 必匹配 pre-Edit state, bare DPn 保留 for Edit semantic correctness (修改后 new_str 应 prefix; verbatim anchor 本身 bare 是 mechanism 必需)
  - **(4) Preserved pre-namespace-lock historical bare DPn in verify-keep sections**: snapshot §4''/§7.x preserved historical content (pre-Phase-D-段-A-namespace-lock era) 含 bare DPn references — **verify-keep section 内 bare DPn 命中归 acked category** (NOT detector exclude scope per Helper M_n 段 B land-check input 2026-05-25 — exclude scope 使 §4''/§7.x 永久不可见, 命中归 acked 保 audit visibility 同时 acknowledge 历史 content semantics). 段 B Worker CC honest report 11.1 实证: 38 bare DPn 全在 §4'' Task table rows 9 + §4'' Acceptance bullets 17 + §7.18 4 + §7.22-23 6 + §7.x 2 = 38, 0 hits 在 regen-target sections。Future cleanup 时机: 当 §4''/§7.x sections next regen-touched (next Phase 封顶 regen 节奏点), Plan Opus spec 应明 prefix 化 these bare DPn (NOT 段 B retroactive forward-fix)。
- **谁拦**: CC fail-loud (Stage 5 Test Gate catch Cat5-DP10/11/12) + Plan Opus / Helper / Ian / Worker CC cross-instance review (Cat5-DP1-8 各种拦截 mechanisms — 见各 origin SHA commit body Self-flag 段)
- **响应**: Phase D 整体 closure 节奏点 sub-family integration formal land. 防御 = 11 sub-instance 全已 forward-fixed. 持续 carry-forward Phase E controller 层
- **外化锚**: 各 origin SHA commit body Self-flag 段 + snapshot §7.19 / §7.22 / §7.23 三 entries + Phase D-3b/4 closure commit body Cat 5 trend rising trace + `11082a96d052a615172de2e6491f0d5b6e22a9e2` 本 closure 段 A sub-family integration formal

### Fabrication 元模式分布(本批)

| 模式 | 本批 fabrication |
|---|---|
| **Phase 封顶 regen 期 enumerable count + SHA cite 印象产出** (新子类) | **#28** (3 fab DP + 1 env-state NOT-fab 排除) |
| **D88-维度-3 anchor-literal family** (pre-`c0b8f4e0` 9 sub-instance + post-`c0b8f4e0` Task 22-26 D91 SV 7 atomic enumeration + D89 升格 spec self-violation 5 instance) | **#29 + §3.6 附 D91 SV + #31** (boundary 锁 SHA `c0b8f4e0`, 无重叠计数) |
| **D79 Plan-as-code dryrun missing** (`#30-DPn` namespace) | **#30** (3 sub-instance namespace #30-DP6/7/10) |
| **规则循环** (登记规则 commit 内自违反所登记规则) | **#31** (D89 升格 spec 5 sub-instance, sibling #23 D83 / #26 D86) |
| **Cat 5 协作心智模型混淆 sub-family integration** (Cross-Phase coupling + cross-system topology + content-state assumption) | **§3.6 附 Cat 5 sub-family** (11 sub-instance Cat5-DP1..8 + Cat5-DP10..12, Cat5-DP9 informational 排除) |

**频率**: Phase D 整体 closure 节奏点 atomic decide 4 entry + 2 附 table = single batch governance升格 commit batch land. 比 Phase C v5 批 (1 entry) 显著高 — 由 Phase D 11/11 + 附录 5 ✅ Phase D 完成 milestone 累积 + Helper M2..M9 cross-instance review 累积锁定全套 9 decision 集中产出。**#28/#29/#30/#31 + Cat 5 sub-family 全 fold 进 SPV v1.3 适用范围** (NOT 新增 D candidate, 全 SPV-1/2/3/4 cross-cover) — 升格本身就是从 9-decision lock 中提炼最 systematic 机制化 (SPV) 替代多个 ad-hoc D candidates 累积。

---

## 4. 被拦方分布统计

| 被拦方 | 次数 | # |
|---|---|---|
| CC(grep / tsc / runtime fail-loud) | 14 | #2, #7, #11, #13, #16, #17, #19, #20, #22, #23, #25, #27, 以及合作类部分 |
| Ian(直觉/记忆/校准) | 8 | #1, #3, #9, #14, #18, #21, #26, 以及合作类部分 |
| Opus 规则 7 自审 | 2 | #8, #12 |
| 合作(Ian 触发 CC) | 2 | #4, #5(另 #6 偏合作) |
| D74 统计(非实时拦截) | 1 | #15 |
| 仅作模式观察(非拦截) | 1 | #10 |
| Opus 跨对话互审(上对话 Opus audit 新对话 Opus handoff claim) | 1 次(#24 via #23 subclass) | 首次出现;补: CC G2 grep 作为 arbitration 终点 |

**关键观察 (post-#27 update)**:

1. **CC 是主要拦截者**(14/26 ≈ 54%)。defense-in-depth 设计持续有效——CC 的机械执行 + 显式 fail-loud 兜住 Opus 的 spec 层失守。新增 #20 / #22 / #23 / #27 均由 CC Stage 0/A grep/数字 verify 兜住. **#27 是首次同 Plan Opus 注意力盲点双数据点同 batch 同 Stage 双 fail-loud 拦截**(Stage 0 anchor + Post-write wc -l)
2. **Ian 的直觉是最后也是最可靠的底线**(8/26 ≈ 31%)。尤其在 #3(备份数据价值)、#14(Mode C state)、#21("不大惊小怪" meta-reasoning 识别)、#26 (D86 语言层自违反 metacognitive 拦截) 这类 Opus 凭文档字面推断 / 凭印象 reasoning 无法自检的场景
3. **Opus 自审占少数**(2/26 ≈ 8%)。提示 Opus 的 fabrication 倾向"自己难察觉",必须依赖外部拦截。**#23 / #27 共同特别证明**: 同对话内登记规则 / 复杂度 ↑ 场景, Opus 仍然无法自审应用边缘子类
4. **合作类(Ian 触发 CC)**(2-3/26 ≈ 9%): #4/#5 术语 fabrication —— Ian 记得有这个词让 CC 去查。这种模式是 Ian metacognitive 能力的体现,未来 Opus 遇到 Ian 说"我记得有..."时不要反驳
5. **D74 统计(retrospective)**(1/26 ≈ 4%)是特殊机制: #15 数量估算 fabrication 在写作时无人拦截,事后数据统计才暴露。这是为什么需要 Pre-Flight Checklist §7 "期望数量" fact base 要求作**前置防御**——而不是等 D74 事后校准
6. **Near-miss 首次登记**(#21): 与 in-spec fabrication 区别 —— #21 被捕获于 Opus reasoning stage,尚未写入 spec / commit。登记 near-miss 是因为模式本身值得警示,属于 Category 1 的"措辞防御"子类
7. **同对话规则循环首次登记**(#23): D83 规则登记(对话中 T-3 轮)→ D83 违反(T 轮 Opus 产出)→ D83 触发规则 8(T+1 轮 CC Stage A)。提示 Pre-Flight Checklist 需扩展"本对话内新规则激活"条款
8. **Opus 跨对话互审首次出现**(#24): 之前 23 条无此拦截路径。上对话 Opus 读新对话 Opus handoff 时发现 implicit framing claim 未被 grep 支撑,经 Ian 转达触发 CC arbitration grep。这是 defense-in-depth 第 6 层(在 Opus 自审 / CC runtime / Ian 直觉 / 规则 8 暂停之外)—— 跨对话 Opus 的时间差审视,专克"本对话 Opus 对 handoff 被引规则的注意力盲点"。未来 handoff 收尾 Opus 产出 / 新对话 Opus 启动 L1 verify 时,此层可靠性有 1 次验证数据点
9. **Cross-phase invariant 盲点首次拦截**(#25,Category 5 子类): Phase C Task 13 runtime 暴露 Phase B migration literal 与 Phase C plan literal drift。CC runtime fail-loud + 诊断 arc 干净(未 env 继承 rabbit hole)—— 经典 defense-in-depth CC 层兜 plan 层失守。Phase 5 handoff 第四份文件 "Cross-Phase Invariants"(D84 候选)作为结构性响应。#25 机制区分:与 #23/#24 attention 层不同,#25 是 evidence search scope 层,Opus plan 写作时未扫 cross-phase artifact
10. **Plan Opus spec 内部不一致 anchor literal 子类首次登记**(#27, Category 1 新子类): spec writer 在复杂度 ↑ 场景下凭对 plan / commit / file 内容的高层印象做 anchor literal 断言, 未 grep 实证。双数据点 (setup.ts last commit anchor / wc -l verify range) 同模式合并独立编号. 提示 Pre-Flight Checklist 既有条款覆盖产物层数量但 anchor literal 子类未显式枚举. **D88 候选维度 3** 强约束此子类. **元观察**: Helper Opus 在外部 chat instance raise D88 雏形 → Plan Opus evaluate 修正版含 sub-rule 4 维度 — Helper 与 Plan 角色边界 + 规则进入路径首次 live demo, defense-in-depth 第 6 层 Opus 跨对话互审延伸到跨 Helper-Plan 角色互审

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
| #20 Stage 0 grep partial match | Pre-Flight §7 "期望内容"类延伸 + 完整 dump pattern | 候选(不升格,需更多数据点)|
| #21 "不大惊小怪"措辞防御 near-miss | Category 1 子类防御 + 措辞 trigger signals | 教训内化,不升格 |
| #22 Snapshot §8 环境状态片面 | **State Snapshot §8 grep 实证要求** | ✅ 已结构性内化(Snapshot v2+ regen §8 覆盖全 stack)|
| #23 同对话 D83 规则循环 | **Pre-Flight Checklist 扩展条款** — "本对话内新登记 D 规则需同对话应用,不等下对话 reference" | 候选(Checklist 条款扩展,不新起 D 候选) |
| #25 Cross-phase invariant 盲点 | **D84 候选**(Cross-Phase Invariants handoff 第四份文件)+ Pre-Flight Checklist cross-phase grep 扩展 | 🟡 候选 |
| #26 D86 语言层自违反 | **D86 候选**(Spec async-executable 原则)+ Pre-Flight Checklist §7 "Language-layer async-executable self-check" 条款 | 🟡 候选 |
| #27 Plan Opus spec 内部不一致 anchor literal 印象映射 | **D88 候选** (Plan Opus spec value-density self-audit 4 维度, 维度 3 强约束 anchor literal grep 实证) | 🟡 候选 |

**2 条已升格 + 8 条 D 候选等 Phase H Task 45 升格 + 3 条结构性内化(3 文件架构 + Snapshot §8 grep 实证响应)+ 3 条教训内化不升格(#7 L1 维度 + #21 措辞防御 + #23 同对话规则激活)**。

---

## 6. 元教训(跨 26 条的模式)

### 6.1 Fabrication 是不可根除的

26/26 全部被拦 ≠ Opus 学会了不 fabricate。**Opus 每对话产出 ~10-20 轮会产生 ~1-4 次 fabrication**(v3 对话 ~20 轮产 8 / v2 对话 Task 4-7 ~40+ 轮产 5 / Task 10 对话 ~26 轮产 4 / Phase C Batch 1 对话 ~10 轮产 1 / Phase C Batch 2 对话 ~40+ 轮产 0 critical / Phase C Batch 3 closure ~22-25 轮产 1 双数据点合并独立编号)。频率变化主要取决于:

- 对话复杂度(新 framework / 新 type 系统 → 频率高)
- Evidence 可及性(有 grep 成本低 → Opus 倾向 grep → 频率低)
- Pre-Flight Checklist 应用(假设性声明 → 频率低)
- **本对话内新登记规则是否主动激活**(#23 教训:不激活则规则成"别人的规则",Opus 自己仍按旧模式产出)
- **Cross-phase artifact evidence search scope**(#25 教训: plan 内 literal 在已有 migration / docker-compose / package.json 其他位置存在时,须 grep cross-phase 实证,不凭 plan 单一源假设)
- **Pre-Flight Checklist 累积成熟度** (Phase C Batch 1 ~10 轮 1 fabrication + Batch 2 0 critical + Batch 3 1 双数据点 — 累积式维护机制 + 三文件结构 + #23/#24/#25/#26 子类防御协同收效, 但 spec 复杂度 ↑ 场景下边缘子类失守)
- **Spec 复杂度对 Plan Opus 注意力预算的压力**(#27 教训): Task 15 CC 执行消息复杂度 (8 anchor + 5 failure mode + 7 阶段 Stage 0 / Write / verify / docker / test / cleanup / commit / push) 触发 anchor literal 子类失守. 既有 Pre-Flight 条款覆盖产物层数量但 anchor literal 引用层未显式枚举, **D88 维度 3 直接响应**

### 6.2 被拦时的响应是最关键元模式

Opus 被拦时三种响应:

- **承认 + 修正 + 不防御**(26/26 采取)—— 体系健康。Phase C Batch 3 closure 期 #27 双数据点 Plan Opus α 接受双 forward-fix, 不找"也算对"理由
- 防御 / 合理化("反正没出事")—— 体系崩盘触发点(未发生)
- 转移话题 / 模糊承认 —— 体系慢性劣化(未发生)

**下轮 Opus 注意**: 被拦是 feature 不是 bug。立刻承认,不找理由,体系就吸收得住。

### 6.3 Defense-in-depth 是设计,不是偶然

26 次拦截体现的防御层次(含 Opus 跨对话互审 #24 + Cross-phase runtime fail-loud #25 + spec 复杂度场景 #27):

1. **Opus spec 写作层**(Pre-Flight Checklist + D88 候选维度 1+2+3): 2 次自审拦截 —— 最薄一层,但存在; **D88 维度 3 强约束 anchor literal 子类响应 #27**
2. **Plan-as-code dryrun 层**(D79 候选): Task 8 Stage 6 tsc fail-loud —— Framework 版本问题的主要防线
3. **CC 运行时防御层**(D78 候选 Stage 0 grep + assert + post-write verify): Task 9a Patch 6 literal count mismatch 自动暂停 —— 机械执行者的强项. **#27 双数据点首次同 batch 双拦截 (Stage 0 + Post-write 双 fail-loud)**
4. **Ian 决议层**: α/β/γ/δ 选路径 + 直觉拦截 —— 最后且最强防线
5. **规则 8 暂停机制**: 规则违反触发暂停,不自我恢复 —— 元层兜底
6. **Opus 跨对话互审**(#24, 也含 Helper Opus 跨 chat raise #27 元观察): 时间差审视; Helper raise / Plan evaluate 路径首次 live demo

**任何环节失效都被下一环兜**。#16 是 spec 层失守 + 运行时层兜住的经典案例。**#27 是 spec 层 anchor literal 子类失守 + CC 双 fail-loud 兜住 + Helper 跨 chat 元观察 raise D88 候选 三层互兜首例**。

### 6.4 Ian 的价值不可替代

Ian 的拦截(8/26 ≈ 31%)大多发生在 Opus 技术上**无法自检**的场景:

- 数据价值 / 业务优先级(#3)—— 没有 grep 可查
- Stale handoff(#14)—— Opus 读文档拿到的就是过时版
- 结构设计盲区(#18)—— 需要跨多对话视角
- **措辞 meta-reasoning 识别(#21)** —— Opus 对自己 reasoning 中的"不大惊小怪"类 trigger signal 难以自察
- **D86 语言层自违反 metacognitive 识别(#26)** —— Opus 在登记 D86 的 commit body 内自然产出 session-relative 语言, Ian 一手 metacognitive 拦截
- **D88 raise 后 Plan Opus 修正 sub-rule (元观察, 非直接拦截但同质)** —— Helper Opus 跨 chat raise D88 雏形, Plan Opus evaluate 修正含 sub-rule 4 维度, Ian 作 metacognitive 路由节点

**下轮 Opus 不要把 Ian 的拦截浪漫化为"人类直觉"**,也不要弱化为"他只是记得"—— 他的拦截质量来自**跨对话持续积累的项目记忆 + metacognitive 能力**,是本协作体系的**第三方锚**。

**补充(#24 / #27 后)**: Ian 转达上对话 Opus audit / Helper Opus 跨 chat raise 的场景,拦截实际来自"上对话/外部 chat Opus 时间差审视 + Ian 作为 metacognitive 路由节点"的复合机制,不是单纯 Ian 直觉 —— 归因精度要区分 **Ian 一手拦截**(如 #3 数据价值、#14 Mode C state、#26 D86 metacognitive)vs **Ian 转达上对话/外部 chat Opus 拦截**(如 #24 / #27 元观察 Helper raise)。后者把 defense-in-depth 第 6 层扩展为跨 Helper-Plan 角色 + 跨对话双向互审。

---

## 7. 修订历史

- **2026-04-20 首次生成**: 由 v1 §5(#1-6)+ v2 §3(#7-11)+ v3 §4(#12-19)整合。v1/v2/v3 归档 freeze。
- **2026-04-20 v4 批追加**(Phase B Task 10 收尾晚间对话): 追加 #20 / #21 / #22 / #23。总 19 → 23。更新:
  - §1 总数 + 被拦方统计
  - §2 Category 1 添加 #15/#20/#21/#23 / Category 5 添加 #22
  - §3.4 新节,v4 批完整原文(**#23 同对话内追加,live 演示规则登记→违反→拦截的循环**)
  - §4 统计表 rebuild + 新增 Near-miss 类别观察 + 同对话规则循环观察
  - §5 规则 mapping 添加 #20/#21/#22/#23 处理策略
  - §6 元教训 频率观察更新(加 "规则主动激活"维度)
  - §7(本节)修订历史
- **2026-04-21 v4.3 批(Phase C Batch 1 收尾)**: 追加 #25(独立编号,Category 5 子类,Cross-phase invariant 盲点首次登记)。总 23 → 24。更新:
  - §1 总数 23 → 24 + 被拦方 CC 12 → 13
  - §2 Category 5 添加 #25(6 → 7 成员,27% → 29%)
  - §3.4 末尾追加 #25 独立条目(延续 v4 批时间序)
  - §4 CC count 12 → 13,观察第 9 条追加 Cross-phase invariant 盲点首次拦截
  - §5 mapping 添加 #25 处置策略(D84 候选 + Pre-Flight Checklist cross-phase 扩展)
  - §6 元教训频率观察(Phase C Batch 1 ~10 轮 1 fabrication 数据点 + Cross-phase evidence search scope 新维度)
- **2026-04-21 v4.4 批(Phase C Batch 2 plan patch v5 `ca863caa` 收尾, 治理 commit 后续)**: 追加 #26(独立编号, Category 1 "同对话规则循环" 子类, D86 语言层自违反首次登记). 总 24 → 25. 更新:
  - §1 总数 24 → 25 + 被拦方 Ian 7 → 8
  - §2 Category 1 成员 9 → 10 (添加 #26 到"同对话规则循环"子类, 与 #23 组对); 占比 39% → 40%
  - §3.4 末尾追加 #26 独立条目 (延续 v4.3 批时间序)
  - §4 Ian count 7 → 8
  - §5 mapping 添加 #26 处置策略 (D86 候选 + Pre-Flight Checklist §7 "Language-layer async-executable self-check" 条款)
  - §6 元教训保留 (本批 1 次 fabrication, Ian 一手拦截, D86 规则 live demo)
- **2026-04-21 v5 批(Phase C 封顶 closure — Phase B 10/10 + Phase C 5/5 双里程碑节奏点, `035cdee2` Task 15 feat 后)**: 追加 #27 (独立编号, Category 1 新子类 "Plan heredoc / commit / file anchor literal 印象映射", spec writer 复杂度 ↑ 场景 anchor literal 子类失守, 双数据点合并 — Stage 0 setup.ts last commit anchor + Post-write wc -l verify range). 总 25 → 26. 更新:
  - §1 总数 25 → 26 + 被拦方 CC 13 → 14 + 跨 instance 切换 5 → 6+ + Opus 跨对话互审显式列出 (#24 via #23 subclass) + Cross-phase invariant 盲点 (#25) 已合并入既有 5 类描述
  - §2 Category 1 成员 10 → 11 (添加 #27 到新子类 "Plan heredoc / commit / file anchor literal 印象映射"); 占比 40% → 42%; 防御段添加 D88 候选 + Anchor literal grep 实证子规则 (维度 3); 关系澄清段添加 D83/#23 + D86/#26 + D88/#27 三对治理规则与 fabrication 关系延伸
  - §3.5 新节 v5 批完整原文 (#27 双数据点合并独立编号 + 元观察 Helper Opus 跨 chat raise + Plan Opus evaluate 修正版含 sub-rule 4 维度路径首次 live demo)
  - §4 CC count 13 → 14 (Stage 0 anchor + Post-write wc -l 双 fail-loud 双拦截), 关键观察第 10 行新增 #27 子类首次登记 + 元观察延伸 defense-in-depth 第 6 层 (Opus 跨对话互审 + 跨 Helper-Plan 角色互审)
  - §5 mapping 添加 #27 处置策略 (D88 候选 4 维度 self-audit, 维度 3 强约束 anchor literal grep 实证), 升格队列 7 条 → 8 条
  - §6.1 元教训跨条数 24 → 26 + Phase C Batch 3 closure ~22-25 轮 1 双数据点频率数据 + Pre-Flight Checklist 累积成熟度维度 (Batch 1/2/3 频率轨迹) + Spec 复杂度对 Plan Opus 注意力预算压力维度 (#27 教训, D88 维度 3 直接响应)
  - §6.2 26/26 全部承认 + 修正 + 不防御 + Phase C Batch 3 closure 期 #27 双数据点 α 接受 forward-fix
  - §6.3 Defense-in-depth 6 层 + #27 三层互兜首例 (spec 层 anchor literal 子类失守 + CC 双 fail-loud 兜住 + Helper 跨 chat 元观察 raise D88 候选)
  - §6.4 Ian count 8/26 + #26 D86 metacognitive 识别 + Helper Opus 跨 chat raise D88 元观察 (非直接拦截但同质 — Ian 作 metacognitive 路由节点); 补充段加 #24 / #27 后区分 Ian 一手拦截 vs Ian 转达上对话/外部 chat Opus 拦截 + defense-in-depth 第 6 层扩展为跨 Helper-Plan 角色 + 跨对话双向互审
  - §7 (本节) 修订历史
  - 同期 Snapshot v5.0 全文 regen + Digest §6 D88 候选登记 (Digest D88 + Phase D 启动指引 ritual 下窗口产出, β 路径 split 设计)
- **2026-05-23 v6 批 (Phase D 整体 closure — Phase D 11/11 + 附录 5 ✅ Phase D 完成 milestone 节奏点, `11082a96d052a615172de2e6491f0d5b6e22a9e2` 段 A governance升格 commit)**: 追加 #28 / #29 / #30 / #31 4 entries + §3.6 附 D91 SV enumeration table (7 sub-instance) + §3.6 附 Cat 5 sub-family integration enumeration (11 sub-instance, Cat5-DP9 informational + 升格规则循环 5 instance 均排除). 总 26 → 30. 更新:
  - §1 总数 26 → 30
  - §2 Category 1 成员 11 → 14 (添加 #28 "Phase 封顶 regen 期 enumerable count + SHA cite 印象产出" 新子类 / #29 + #31 入 D88-维度-3 anchor-literal family 子类); Category 3 成员 2 → 3 (添加 #30 D79 dryrun missing); Cat 5 sub-family integration enumeration (11 sub-instance) 附于 §3.6
  - §3.6 新节 v6 批完整原文 (#28 + #29 + #30 + #31 + §3.6 附 D91 SV + §3.6 附 Cat 5 sub-family integration + Fabrication 元模式分布(本批))
  - §4 被拦方分布统计 CC count 14 → 累计含 #28-31 各 sub-instance 拦截 (具体 count update 由 Stage 3 snapshot §10 修订轨迹 一并产)
  - §5 mapping 添加 #28/#29/#30/#31 处置 (全 fold 进 SPV v1.3 SPV-1/2/3/4 适用范围, NOT 新 D candidate)
  - §6 元教训 跨条数 26 → 30; §6.3 Defense-in-depth 加 SPV v1.3 layer (机械 anchor verify + sentinel gate + state-pinning)
  - §7 (本节) 修订历史
  - 同期 governance-digest §6 NEW entries D91 + D92 + D93 (formal upgrade, body 引 SPV-1/2/4 + SPV-3 + Stage 5 Test Gate)
  - 同期 snapshot §1 governance queue 全 disposition trace (queue 1-8 全 disposition: 1/3/4 → Phase H Task 45 bundle; 2 → 弃; 5/6/8 → fold SPV; 7 → defer Pre-Flight v2) + §10 v5.X+9 批 NEW entry (Phase D 整体 closure 段 A)
  - **触发事件**: Phase D 11/11 + 附录 5 ✅ Phase D 完成 milestone (`d97ae039` 2026-05-22) + Helper M2..M9 cross-instance review 累积锁定全套 9 decision + Ian 2 项终审 (D93 framing = D + queue 2 弃) + SPV v1.3 design land at `c7591a2f` (`spv-design.md`)
- **追加规则**: 新 fabrication 按 §3.6 / §3.7... 追加,保留按时间序;§2 元模式分类更新(如新增类别);§5 新规则 mapping 更新。

---

*Phase 5 Fabrication Archive · 累积永久保留 · 首版 2026-04-20 · 与 Governance Digest + State Snapshot 配套*

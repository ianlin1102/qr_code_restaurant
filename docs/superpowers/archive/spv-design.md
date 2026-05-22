# SPV (Spec Pre-Commit Verification) — 设计文本

> **性质**: SPV 机制本身的定义文档, NOT 任何执行 spec
> **版本**: v1.3 (2026-05-22, post Helper re-review-2 v1.2 — 2 interaction flag 修订: sentinel content noUnusedLocals 兼容 + __spv__/ gitignore)
> **关系**: 与 governance-digest / state-snapshot / fabrication-archive 同 `docs/superpowers/archive/` 同级
> **产出 turn**: 2026-05-22, baseline HEAD `b2b9d64b9fb2c5fc2a38037bcaa9dcc5bdd1b1b2` (v1.0/v1.1/v1.2/v1.3 同 baseline 未 commit)
> **产出者**: Phase 5 Planner CC instance (read-only plan mode)
> **触发**: Phase D 期 governance lesson 累积 (D91 6 self-violation + D92 Family D NEW + 同 family 早期 SV-1 ancient = 共 8 数据点 family), prose 规则 + Plan Opus 自记得应用 模式失败

---

## 0. 本文件是什么 / 不是什么

**是**: SPV 这套核对清单**机制本身**的设计定义 — 4 条核对项的精确条目 + 每条的机械判定方式 + 三方执行模型 + 自身局限 + 与既有 governance 的关系 + **世界合法变化处理流程**。

**不是**:
- 不是 Phase D 整体 closure governance commit spec
- 不是 D91/D92/D93 升格 spec
- 不是 Stage 0-5 执行 spec
- 不是 Pattern #10 第 6 条延伸
- 不是 Plan Opus 凭"记得应用"的 prose 规则

**触发背景** (内化, NOT 复述):

Phase D 期 Plan Opus 在 D89 (anchor literal source freshness mandate, `c0b8f4e0` formal land 2026-05-12) 之后仍累积 self-violation, 根因高度集中 — Plan Opus 从"印象/理解"产出 spec 内容, 而非从"测量"产出。Pattern #10 (a)-(e) 5-category 是反应式长出来 (每次同类错换个角落补一个 category) — 是症状不是解。

**结论 (Ian + Helper 已定方向)**: 需要一个**机械的 / 外部的 / 三方都能执行的核对清单** — 每份 spec 在 ExitPlanMode 前必须逐条跑过, 核对结果写进 spec 留痕。这就是 SPV。

**v1.3 vs v1.2** (Helper re-review-2 v1.2 — 2 interaction flag, v1.2 新机制 SPV-0b 与 SPV-3 sentinel/placement 互相碰撞 修订, 完整 changelog 见 §7):
- 🟡 **Flag 1** (sentinel "恰好 +1 error" 有 noUnusedLocals 未验证假设): v1.2 sentinel `const _spv3_sentinel: number = ...; export {};` — `_spv3_sentinel` 是声明未用 local; tsconfig 开 `noUnusedLocals: true` → 额外 TS6133 → delta = +2 → MECHANISM_FAILURE 每次, SPV-3 永远过不了 gate。修: sentinel 改 `export const _spv3_sentinel: number = ...;` (export 使变量"被使用", noUnusedLocals 完全不触发, 任何 tsconfig 下 "+1" 都成立)。删 `export {};` 那行。v1.2 锁定 content 同步更新 (v1.3 即版本 bump)
- 🟡 **Flag 2** (`server/src/__spv__/` 没 gitignore → SPV-3 placement 污染 SPV-0b): SPV-3 在 tracked 目录 (`server/src/`) 创建临时 sentinel/placement → `git status --porcelain` 列为 `??` → SPV-0b 判工作树脏 → false ESCALATE; 残留 placement 还可能误 `git add .` commit。修: `server/src/__spv__/` 加入 `.gitignore` (§1 SPV-3 Setup 段 NEW), `git status --porcelain` 永远看不到 → SPV-0b 不被 SPV-3 自己产物干扰; **关键**: gitignore 与 tsconfig include **互不影响** — gitignore `__spv__/` 后 tsconfig `src/**/*.ts` glob 仍编译 __spv__/ 文件, sentinel gate 照常工作 (gitignore = git tracking; tsconfig include = tsc compilation, 两套独立机制)

---

## 1. SPV 的 4 条核对项

### State-pinning 原则 (适用 SPV-1/2/3/4 全部)

任何 citation 命令必须满足以下其一, 才能 cross-time 决定性 re-run:

| 类别 | 推荐形式 (state-pinned, 完全决定性) | 退化形式 (working-tree, 需 baseline-HEAD 守门) |
|---|---|---|
| 文件内容 grep | `git show <SHA>:path \| grep ...` | `grep ... path` (working tree current) |
| 文件行数 / 字段 | `git show <SHA>:path \| wc -l` | `wc -l path` |
| 文件存在性 | `git cat-file -e <SHA>:path` | `ls path` |
| HEAD anchor | spec 顶部 `baseline_sha:` 声明 + `git log <SHA> -1` | `git rev-parse HEAD` (易动) |
| tsc baseline | `cd server && pnpm tsc --noEmit 2>&1` post `git checkout <SHA>` (理论) — **现实采 working-tree + baseline-HEAD 守门** | `pnpm tsc --noEmit` |
| Test count | working-tree only — baseline-HEAD 守门 | `pnpm test:integration` |

**优先级**: state-pinned > working-tree。working-tree 形式只在 state-pinned 不可行时用 (e.g. tsc 运行需 working tree 完整 node_modules, 不只 git blob)。

**baseline-HEAD 守门**: spec 顶部 SPV 段必须声明 `baseline_sha: <40-char SHA>`。Worker CC Stage 0 第一件事:

```bash
declared_baseline="<spec preamble baseline_sha>"
actual_head=$(git rev-parse HEAD)
if [[ "$declared_baseline" != "$actual_head" ]]; then
  # 走"重核对流程" (§2.3), NOT SPV FAIL
  exit_to_re_verification
fi
# baseline 一致 → 继续 SPV re-run
```

---

### SPV-1: 零硬编码可测量值

**消灭的错误类**: Plan Opus 从印象写出"可从代码库测量的值"而非从测量产出。

**消灭的具体 SV**:
- **SV-1** (ancient Task 22 Step 1 `2590ab04` §2 G-T22.2): pre-write "Expected schema field literals" 未先 CC dump (γ path forward-only)
- **SV-2** (Task 24 `83885944a` Stage 1.5): expiresAt threshold pre-write `≥ 2` 印象, 实际 heredoc = 1
- **SV-4** (Task 25 `d2792b6d7` Round 2 G-T25.12): hardcoded `= 5 expected` baseline (D83 反模式)
- **SV-5** (Task 25 `d2792b6d7` Round 3 G-T25.6.1): estimatedWait threshold `= 0` missed top NOT-in-scope ack ref (parallel pattern 应用 lag)

**适用范围**: spec 内**作为行动依据**出现的可测量值 (Stage 0 grep target / Stage 1.5 fail-loud gate threshold / Stage 2 baseline / Stage 5 expected count / heredoc 行号引用), 含:
- count threshold (`= N`, `≥ N`, `≤ N`) 用于 fail-loud 判定
- 行号 (`line N`, `line N-M`) 用于 Edit / sed
- SHA literal (40-char hex 或前缀) 用于 git show / cite
- 字段名 / 函数名 / 类型名 要求 against schema/code
- 文件路径 / 目录路径 用于 grep / Edit / ls
- baseline 数字 (tsc error count, test file count, test case count) 用于 delta 比对

**不适用 (扣除范围)**:
- 治理 entry 编号 (D89/D91/SV-N), 设计期决定的标识符
- Phase / Task 编号 (D-5e / Task 26), 设计期决定的标识符
- 文档章节号 (§1/§7.23), 文档结构标识
- **叙事性总数** (e.g. Background 段 "Phase D 7 lessons" — 由多源汇总产生的叙事性 count, NOT 行动依据) — 见 §3.3 合成值禁令

**合成值禁令** (§3.3 详):

spec 内**作为行动依据**的可测量值必须是**单源单输出 atomic citation**, 禁用合成值 (e.g. "7 lessons = 6 D91 + 1 D92"):

- 若需引用 6 + 1 = 7, 必须 spec 内分开 cite 两个独立 citation, 不写汇总数 7
- 若 7 是叙事性总数 (Background 上下文, 非行动依据), 不属 SPV-1 适用范畴, **但也不能出现在 Stage 0/1.5/2/5 等行动 section**
- 任一 citation 形式为"由多源 / 公式 / 文字推理得出"即 FAIL

**机械判定方式**:

每个适用范围内的 literal 出现在 spec 中, 必须在 spec 顶部 SPV 段含对应 **SPV-1 来源表 fenced YAML 块** (machine-extractable, §2.2):

````
```yaml-spv1
# SPV-1-record
- id: L1
  literal: "= 1"
  location: "§Stage 1.5 G-T24.6 line 245"
  category: count_threshold
  citation_type: state_pinned     # state_pinned | working_tree | self_derived
  command: "git show b2b9d64b:server/src/__spv__/heredoc-task24.ts | grep -c 'expiresAt: null'"
  expected_output: "1"
  actual_output: "1"
  turn: 12
- id: L2
  literal: "= 103"
  location: "§Stage 2 N1 baseline line 312"
  category: tsc_baseline
  citation_type: working_tree
  baseline_sha: b2b9d64b
  command: "cd server && pnpm tsc --noEmit 2>&1 | grep -cE '^.*: error TS'"
  expected_output: "103"
  actual_output: "103"
  turn: 8
- id: L3
  literal: "587a565b"
  location: "§plan patch v14 ref"
  category: sha_literal
  citation_type: state_pinned
  command: "git rev-parse 587a565b^{commit}"
  expected_output: "587a565b5ab680649b0dcddc59a5a6e8994aa0df"
  actual_output: "587a565b5ab680649b0dcddc59a5a6e8994aa0df"
  turn: 3
```
````

**Citation 完整性要求** (每条 record 必含):
1. `id`: 唯一 ID (L1, L2, ...)
2. `literal`: spec 中出现的 literal 文本
3. `location`: spec section + line (用 spec 内当前 line)
4. `category`: 见适用范围列举 (count_threshold / line_number / sha_literal / field_name / file_path / tsc_baseline / test_count)
5. `citation_type`: `state_pinned` | `working_tree` | `self_derived` (来自本 spec Stage 0/1.5 derive)
6. `command`: 完整可执行 shell command (state_pinned 必为 `git show <SHA>:...` / `git rev-parse <SHA>...`; working_tree 必含 `baseline_sha:` 字段)
7. `expected_output`: command 跑后 expected 完整输出
8. `actual_output`: Plan Opus 自跑时实际输出
9. `turn`: Plan Opus 自跑的 turn 号

**禁止的 citation 形式 (= FAIL)**:
- `"based on prior session"` / `"from Snapshot §7.23"` / `"per Project knowledge"` — 历史印象
- `"about 5"` / `"around N"` / `"approximately"` — 不精确
- 无 `command` 字段 / 无 `expected_output` 字段 / 无 `actual_output` 字段
- `citation_type: working_tree` 但无 `baseline_sha:` 字段
- 合成 command (e.g. `command: "(grep X file) + (grep Y file)"` — 公式) — 合成值禁令命中

**判定**:
- **PASS**: 适用范围内 literal 100% 出现在 SPV-1 来源表 fenced YAML + 每条 record 满足完整性要求 + 无禁止形式 + 无合成值
- **FAIL**: 任一未满足

**机械复验脚本** (Worker CC Stage 0 跑, baseline-HEAD 守门通过后):

```bash
# Step 1: yq 抽取 SPV-1 来源表 fenced YAML
spec_file="$1"
yq -r '.[] | "\(.id)|\(.command)|\(.expected_output)"' \
  <(awk '/^```yaml-spv1/,/^```$/' "$spec_file" | sed '1d;$d') |
while IFS='|' read -r id cmd expected; do
  actual=$(eval "$cmd" 2>&1)
  if [[ "$actual" != "$expected" ]]; then
    echo "SPV-1 FAIL: id=$id actual='$actual' expected='$expected'"
    exit 1
  fi
done
echo "SPV-1 PASS"
```

---

### SPV-2: grep pattern 写后必跑

**消灭的错误类**: spec 内用于匹配源码的 grep/sed/regex pattern 凭印象写出, 未实测验证。

**消灭的具体 SV**:
- **SV-6** (v13 Round 4 `e760679b`): `^## Task 26:` ASCII colon vs plan source 实际是 `## Task 26：` full-width colon — pattern matching missed (**机械捕获**)
- **SV-7** (Task 26 Round 5 `d97ae039`): Stage 1.5 G-T26.6.6 broad regex JSDoc false positive (**SPV-2 让其"可见"NOT"机械捕获"** — §6 详)

**适用范围**: spec 内每个用于匹配源码 / 文档 / 任何 file content 的 grep / sed / awk pattern, 含:
- Stage 0 detection grep (`grep -n` / `grep -c`)
- Stage 1.5 fail-loud gate grep
- Plan patch / Edit 工具的 old_str (若含 regex 特殊字符或多行)
- find pattern / sed substitution pattern

**机械判定方式**:

每个 pattern 必须在 spec 中含 **SPV-2 验证记录 fenced YAML 块**:

````
```yaml-spv2
# SPV-2-record
- id: P1
  pattern: "^## Task 26[:：]"     # 完整含特殊字符
  baseline_sha: b2b9d64b           # state-pinning anchor
  command: "git show b2b9d64b:docs/superpowers/plans/2026-04-17-phase5-postgres-migration/phase-d-repositories-part2.md | grep -nE '^## Task 26[:：]'"
  expected_match_count: 1
  expected_match_lines: |
    85:## Task 26：platform-admin.ts
  actual_output: |
    85:## Task 26：platform-admin.ts
  assertion_type: positive          # positive (≥N) | negative (=0) | exact (=N)
  verdict: PASS
  turn: 7
- id: P2
  pattern: "expiresAt: null"
  baseline_sha: b2b9d64b
  command: "git show b2b9d64b:server/src/__spv__/heredoc-task24.ts | grep -nE 'expiresAt: null'"
  expected_match_count: 1
  expected_match_lines: |
    23:  expiresAt: null,
  actual_output: |
    23:  expiresAt: null,
  assertion_type: exact
  verdict: PASS
  turn: 12
```
````

**Record 完整性要求**:
1. `id`: 唯一
2. `pattern`: 完整 pattern, verbatim 含特殊字符 (全角 / char class / anchor / quantifier / escape)
3. `baseline_sha`: state-pinning anchor (必填)
4. `command`: 完整 shell command (推荐 `git show <SHA>:path | grep ...` 形式)
5. `expected_match_count`: 期望匹配数; 若是测量值 → 必 link 到 SPV-1 record id
6. `expected_match_lines`: **verbatim 实际匹配行** (含 line number) — 这是 SPV-2 让 SV-7 "可见" 的核心字段 (即使数量对, Plan Opus / Helper 读 verbatim 行可眼看 false positive)
7. `actual_output`: Plan Opus 自跑实际输出 (含 line number 全文)
8. `assertion_type`: `positive` (≥N) | `negative` (=0) | `exact` (=N)
9. `verdict`: PASS / FAIL
10. `turn`: Plan Opus 自跑 turn 号

**特别要求**:
- 命令必须完整 shell command, 不是 "类似 `grep ...`" prose
- 含全角字符 / char class 的 pattern, command 用 `git show <SHA>:path | grep -E '<pattern>'` 形式跑 (避免 shell 转义吃掉特殊字符)
- Negative assertion (期望 = 0) — `expected_match_lines: ""` + `assertion_type: negative` + 在 spec 段中说明"应 0 因 X"
- `expected_match_lines` 是 SPV-2 的**关键字段** — Plan Opus 自跑必须填实际匹配行, NOT 期望; Helper review 读此字段眼看是否 false positive (SV-7 catch)

**判定**:
- **PASS**: 每个 pattern 都有 record + 跑命令完整 + `actual_output == expected_match_lines` (verbatim 一致) + `actual_output` 行数 == `expected_match_count`
- **FAIL**: 任一未满足; 或 `expected_match_lines` 字段是 prose ("应匹配 X 处") 而非 verbatim

**机械复验脚本**:

```bash
# Step 1: yq 抽取 SPV-2 records
yq -r '.[] | "\(.id)|\(.command)|\(.expected_match_lines)"' \
  <(awk '/^```yaml-spv2/,/^```$/' "$spec_file" | sed '1d;$d') |
while IFS='|' read -r id cmd expected; do
  actual=$(eval "$cmd" 2>&1)
  if [[ "$actual" != "$expected" ]]; then
    echo "SPV-2 FAIL: id=$id (machine catch)"
    exit 1
  fi
done
echo "SPV-2 PASS (machine)"
# Step 2: Helper / Ian 眼看 expected_match_lines 字段, 检查是否 false positive (SV-7 "可见" NOT "机械捕获")
```

---

### SPV-3: heredoc TS 必 project-aware tsc 验证

**消灭的错误类**: spec 内含 heredoc 的 TypeScript 代码, 凭印象写出 type cast / generic narrowing / 字段引用 / import, 未实际 tsc 验证 (尤其 strict-mode 特定错)。

**消灭的具体 SV**:
- **SV-3** (Task 25 Round 1 `d2792b6d7`): β-path #2 scope under-extension — phone strict 仅 add() 端 drop `?+|null`, 未扩展到 updateEntry 端 (Prisma WaitlistEntryUpdateInput compile-time check 本可 catch; **strict-mode null check 触发**)
- **D92 Family A** (Task 23 `6ba08e43` plan patch v11 `538d00e2`): heredoc verbatim mechanical paste embedded `as unknown as Prisma.InputJsonValue` cast × 6 vs schema `Role.permissions String[]` → 6 TS2322
- **D92 Family D** (Task 26 Round 6 `d97ae039` plan patch v14 `587a565b`): heredoc `new Set(...)` 缺 explicit type parameter → TS2345 at `.has` call (**TS 5+ strict narrowing 触发**)

**关键设计 (v1.0 → v1.1 → v1.2 → v1.3 演化)**:

- v1.0 单文件 invocation `tsc --noEmit <file>` → 忽略 tsconfig (target ES3 / strict:false) → SV-3 (null check) + Family D (TS 5+ narrowing) **可能漏过** (strict 才暴露)
- v1.1 改 project-aware: heredoc 抽 `server/src/__spv__/` placement → 整库 `pnpm tsc --noEmit` (NO file arg) → delta vs N1 baseline
- v1.2 关键修补 (Residual 1): v1.1 默认 "__spv__/ 在 tsconfig include 范围"。**若不在 include → 整库 tsc 根本不碰 __spv__/ → delta 永远 0 → SPV-3 永远 PASS** = 空操作, 比 v1.0 还糟。加 **sentinel 自检 gate** — 故意 type error sentinel 验证 delta 确实 +N, 验证 验证器本身在工作。
- **v1.3 修 v1.2 interaction (Flag 1 + 2)**:
  - Flag 1: sentinel content `noUnusedLocals` 兼容 — `export const` 取代 `const + export {}` (export 使变量"被使用", any tsconfig 下 "+1" 都成立)
  - Flag 2: `server/src/__spv__/` 必加 `.gitignore` — 避免 SPV-3 placement (sentinel + heredoc) 污染 SPV-0b 工作树检查 (gitignore 与 tsconfig include 互不影响, 两套独立机制)

**Placement 选择 (v1.3 锁定)**:

| 维度 | 配置 | 理由 |
|---|---|---|
| **路径** | `server/src/__spv__/` | 本目录在现有 `server/tsconfig.json` 的 `include: ["src/**/*.ts"]` glob 覆盖范围内, **不改 tsconfig** (Plan Opus / Worker CC read-only 改不了 tsconfig; sentinel 自检证明覆盖生效) |
| **gitignore** (v1.3 NEW) | `.gitignore` 必含 `server/src/__spv__/` 一行 | SPV-3 临时文件 (sentinel + heredoc placement) 不污染 `git status --porcelain` → SPV-0b (§2.3) 工作树检查不被 SPV-3 自己产物干扰; 残留 placement 不可能误 `git add .` commit |
| **tsc include** (v1.3 显式 ack) | tsconfig `src/**/*.ts` glob 继续覆盖 `__spv__/` 文件 | **gitignore ≠ tsc exclude** — gitignore 管 git tracking, tsconfig include 管 tsc compilation, 两套机制完全独立 (Linux fs 共存); gitignore `__spv__/` 后 tsc 仍编译该目录, sentinel gate 照常工作 |

**Setup 一次性前置 (v1.3 NEW, SPV-3 第一次跑前必做)**:

```bash
# Step 1: 创建 __spv__/ 目录
mkdir -p server/src/__spv__/

# Step 2: 加入 .gitignore (项目根 .gitignore 或 server/.gitignore)
grep -qxF "server/src/__spv__/" .gitignore 2>/dev/null || \
  echo "server/src/__spv__/" >> .gitignore

# Step 3: 验证 gitignore 生效
if git check-ignore -q server/src/__spv__/test-file.ts; then
  echo "Setup PASS: __spv__/ gitignored"
else
  echo "Setup FAIL: __spv__/ NOT gitignored — SPV-3 will pollute SPV-0b"
  exit 1
fi

# Step 4: 验证 tsc include 仍覆盖 (sentinel gate 第一次 run 时即 verify)
# (留给 sentinel gate 验)
```

**Setup commit 一次** (.gitignore 改动需 commit, **与 spv-design.md 同一 commit land**, 在试跑验证之前; NOT 拖到 closure governance batch。机制本身也兜得住: 忘了 setup → sentinel gate Step 0 `SETUP_INCOMPLETE` 阻断, 不 false PASS 不 false FAIL)。

**适用范围**: spec 内每个 heredoc 含 TypeScript code 段:
- repository .ts 文件 heredoc
- integration test .ts 文件 heredoc
- helper / shared module .ts heredoc
- Plan patch new_str 含完整 TS code 段
- shared/types.ts / shared/modules.ts 等共享 .ts heredoc

**不适用 (扣除范围)**:
- 纯 markdown / docs heredoc
- shell / bash heredoc
- SQL / migration .sql heredoc
- JSON / YAML / TOML config heredoc
- TS 内单行 patch (单 token 改, e.g. `active` → `isActive`) — 归 SPV-1 字段名子类

**Sentinel 自检 gate (v1.2 NEW, 修 Residual 1 — 验证 SPV-3 机制本身在工作)**:

每次 SPV-3 跑前 (Plan Opus self-run 第一件事 / Worker CC Stage 0 SPV-3 第一件事), 必先跑 **sentinel 自检 gate** 证明 `server/src/__spv__/` 真在 tsc 编译范围。否则 SPV-3 = 空操作 (delta 永远 0, false PASS, 比 v1.0 还糟)。

**Sentinel 标准定义 (v1.3 锁定 — Flag 1 修订, 修订需 SPV 版本 bump)**:

- **sentinel_path**: `server/src/__spv__/spv3-sentinel.ts`
- **sentinel_content** (verbatim, copy-paste 不改):

  ```typescript
  // SPV-3 sentinel v1.3 — DO NOT EDIT (standardized in SPV-design.md)
  // Purpose: verify server/src/__spv__/ is in tsc compilation scope
  // Expected effect: introduces exactly 1 TS2322 error (compatible with noUnusedLocals)
  // If SPV-3 sentinel gate shows delta != +1 → __spv__/ NOT in tsc scope → SPV-3 机制失效
  export const _spv3_sentinel: number = "type error sentinel";
  ```

- **sentinel_expected_delta**: `+1` (相对 N1 baseline)
- **sentinel_expected_error_pattern**: `TS2322` (Type 'string' is not assignable to type 'number')

**v1.2 → v1.3 sentinel 内容 diff 原因 (Flag 1)**:

| 版本 | content | noUnusedLocals tsconfig 下行为 |
|---|---|---|
| v1.2 | `const _spv3_sentinel: number = "..."; export {};` | `_spv3_sentinel` 是声明未用 local → 若 `noUnusedLocals: true` 触发 TS6133 → delta = +2 → MECHANISM_FAILURE 每次 → SPV-3 永远过不了 gate |
| v1.3 ✅ | `export const _spv3_sentinel: number = "...";` | `export const` 使变量"被外部使用", noUnusedLocals 完全不触发 → 只剩 TS2322 → delta = +1 在任何 tsconfig 下都成立 |

(`_` 前缀对 noUnusedLocals 是否豁免依 TS 版本而定, 不应留 "依 tsconfig 而定" 的不确定性 — sentinel 是 SPV-3 唯一标尺, 必 100% 确定。)

**Sentinel gate 流程** (Plan Opus self-run + Worker CC Stage 0 同, v1.3 加 step 0 gitignore pre-flight):

0. **Pre-flight gitignore check (v1.3 NEW, Flag 2)**: `git check-ignore -q server/src/__spv__/spv3-sentinel.ts` exit 0 → `__spv__/` 已 gitignored, OK; exit 1 → `SETUP_INCOMPLETE` (报 "server/src/__spv__/ 不在 .gitignore — 见 SPV §1 SPV-3 Setup 一次性前置 步骤") → 停止 SPV-3, 走 Setup 流程
1. **Pre-flight tsc baseline**: 跑整库 tsc, record N1_pristine = error count (应 == `baseline_n1` 字段, 与 SPV-1 baseline_n1 一致)
2. **Place sentinel**: 写 sentinel_content 到 sentinel_path (gitignore 已生效 → 不影响 `git status --porcelain`)
3. **Sentinel tsc**: 跑整库 tsc, record N1_with_sentinel
4. **Gate 判定**:
   - `N1_with_sentinel == N1_pristine + 1` 且 tsc output 含 sentinel_expected_error_pattern (TS2322 at sentinel_path) → **gate PASS** (__spv__/ 在 tsc 编译范围生效, SPV-3 机制可信) → 进 actual SPV-3 records
   - `N1_with_sentinel == N1_pristine` (delta = 0) → **gate FAIL: MECHANISM_FAILURE** (__spv__/ NOT in tsc scope, tsconfig include glob 不覆盖) → 停止 SPV-3 (NOT 跑 records, NOT FAIL 也 NOT PASS, 报 "SPV-3 mechanism broken") → 触发治理修订 (tsconfig include glob 加 `src/__spv__/` 或换 placement 路径; tsconfig commit 需 governance)
   - 其他 delta (e.g. +2 / +0 但 unexpected error) → **gate FAIL: ENV_UNEXPECTED** (sentinel content 应 1 TS2322; 若 env 引入额外 error, sentinel 本身被污染 或 v1.3 export const 变更未应用) → 调查 + 治理
5. **Cleanup sentinel**: `rm sentinel_path`, 跑整库 tsc verify back to N1_pristine; verify `git status --porcelain` 无 sentinel 残留 (gitignore 已 verified Step 0, 应永远不出现)
6. **Proceed**: gate PASS → 进 actual SPV-3 records (§下方)

**Sentinel gate spec record** (放 spec SPV-3 段 yaml-spv3 块第一条 record):

```yaml
# SPV-3-sentinel-gate (always first record, before actual heredoc records)
- id: H0_SENTINEL
  type: sentinel_gate
  sentinel_path: "server/src/__spv__/spv3-sentinel.ts"
  sentinel_version: v1.3
  gitignore_check: "git check-ignore -q server/src/__spv__/spv3-sentinel.ts"   # exit 0 = gitignored
  gitignore_verdict: PASS           # PASS = __spv__/ gitignored | SETUP_INCOMPLETE
  baseline_n1: 103                  # 与 SPV-1 baseline_n1 一致
  command: "cd server && pnpm tsc --noEmit 2>&1 | grep -cE '^.*: error TS'"
  expected_n1_with_sentinel: 104    # = N1 + 1
  expected_error_pattern: "src/__spv__/spv3-sentinel.ts.*: error TS2322"
  actual_n1_with_sentinel: 104
  actual_error_pattern_match: true
  gate_verdict: PASS                # PASS | MECHANISM_FAILURE | ENV_UNEXPECTED | SETUP_INCOMPLETE
  turn: <N>
  cleanup: "rm server/src/__spv__/spv3-sentinel.ts; rerun tsc; verify back to N1=103; verify git status --porcelain shows no spv3-sentinel.ts"
```

**判定** (v1.3 加 SETUP_INCOMPLETE 状态):
- **PASS**: sentinel gate `gitignore_verdict: PASS` + `gate_verdict: PASS` + 所有 actual heredoc records 各自 verdict PASS
- **SETUP_INCOMPLETE** (v1.3 NEW): `__spv__/` 不在 `.gitignore` → 报 "Setup 一次性前置 未做" → 阻断 SPV-3 + 跑 Setup 流程 (§1 SPV-3 Placement 选择 Setup 段) → Setup 完成后重跑
- **MECHANISM_FAILURE**: sentinel gate `gate_verdict: MECHANISM_FAILURE` → SPV-3 当场报 "机制失效", NOT PASS, NOT FAIL, 阻断 spec (走治理修订)
- **ENV_UNEXPECTED**: sentinel gate `gate_verdict: ENV_UNEXPECTED` → 调查 (e.g. sentinel content 未应用 v1.3 / env tsconfig 异常) + 治理
- **FAIL**: sentinel gate PASS + actual heredoc record(s) verdict FAIL (delta 不在 whitelist)

**机械判定方式**:

每个 heredoc TS 段必须在 spec 中含 **SPV-3 验证记录 fenced YAML 块**:

````
```yaml-spv3
# SPV-3-record
- id: H1
  target_file: "server/src/repositories/platform-admin.ts"
  placement_path: "server/src/__spv__/spv3-h1-platform-admin.ts"
  extract_method: "spec §Stage 1 lines 766-939 verbatim paste"
  baseline_sha: b2b9d64b
  baseline_n1: 103
  command: "cd server && pnpm tsc --noEmit 2>&1 | grep -cE '^.*: error TS'"
  expected_n2: 103          # = N1 = delta 0
  actual_n2: 103
  delta: 0
  delta_acceptable_env_noise: []    # 此 record 0 noise, list 空
  verdict: PASS
  turn: 15
  cleanup: "rm server/src/__spv__/spv3-h1-platform-admin.ts; rerun tsc; verify back to N1=103"
- id: H2
  target_file: "server/src/repositories/roles.ts"
  placement_path: "server/src/__spv__/spv3-h2-roles.ts"
  extract_method: "spec §Stage 1 part2 lines 106-379 post-v11 strip verbatim"
  baseline_sha: b2b9d64b
  baseline_n1: 103
  command: "cd server && pnpm tsc --noEmit 2>&1 | grep -cE '^.*: error TS'"
  expected_n2: 103
  actual_n2: 103
  delta: 0
  delta_acceptable_env_noise: []
  verdict: PASS
  turn: 16
  cleanup: "rm server/src/__spv__/spv3-h2-roles.ts; rerun tsc; verify back to N1=103"
```
````

**Record 完整性要求**:
1. `id`: 唯一
2. `target_file`: spec 中将要 paste 的 final 路径
3. `placement_path`: 临时 placement (必须在 `server/src/__spv__/` 下, tsconfig include 范围内, NOT `/tmp/`)
4. `extract_method`: 从 spec 哪段 verbatim 抽 (含 line range)
5. `baseline_sha`: SPV-1 baseline_sha 一致
6. `baseline_n1`: N1 = pristine tsc error count (baseline_sha working tree, NOT placement)
7. `command`: 整库 tsc 命令 (NO file 参数)
8. `expected_n2`: 期望 N2 = N1 + Σ(delta_acceptable_env_noise) (通常 = N1, delta 0)
9. `actual_n2`: Plan Opus 自跑实际 N2
10. `delta`: actual_n2 - baseline_n1
11. `delta_acceptable_env_noise`: 预定义封闭清单 (见下)
12. `verdict`: PASS / FAIL
13. `turn`
14. `cleanup`: 跑完删除 placement 文件, verify tsc 回 N1

**Delta 判定**:
- `delta == 0` → PASS
- `delta != 0`:
  - 计算 `noise_delta = Σ(delta_acceptable_env_noise count)`
  - 若 `delta == noise_delta` → PASS (delta 全在封闭清单)
  - 若 `delta != noise_delta` → FAIL (有 placement 引入的 actual error)

**Delta acceptable env noise 预定义封闭清单 (v1.1)**:

```yaml
# 此清单是 SPV v1.1 封闭定义, 修订需 SPV 版本 bump
delta_acceptable_env_noise_whitelist:
  # Phase 5 baseline = 103 pristine errors (env noise + Phase 5 transitive)
  # 因 SPV-3 用 project tsc (target ES2020 strict), Prisma library.d.ts ES3 noise 应消失
  # 若 placement 引入新 noise (非 placement code 逻辑错), 必须在此列出对应 TS code + 文件
  - ts_code: TS18028
    file_pattern: "node_modules/.pnpm/@prisma+client@*/.../library.d.ts"
    reason: "Prisma 6 ES2015 private identifier vs default ES3 — but project target ES2020+ 应消失"
    expected_count: 0
  - ts_code: TS2403
    file_pattern: "@types/google-apps-script"
    reason: "Cross-pkg type collision, pre-existing"
    expected_count: 0
# 不在此清单的 error → SPV-3 FAIL 没商量
```

**特别要求**:
- placement 必须在 `server/src/__spv__/` (创建后加入 tsconfig include 若不已 include)
- 跑完必删除 placement + verify tsc 回 N1 (verify `cleanup` step 在 Worker CC Stage 0 复验时跑)
- 若 heredoc 含 placeholder, spec 必须含"placeholder 用 stand-in literal 跑过的结果", placeholder 形式不跑直接 PASS = FAIL

**判定**:
- **PASS**: 每个 heredoc TS 段有 SPV-3 record + delta == 0 或 delta == noise_delta (noise 全 whitelist)
- **FAIL**: 任一未满足; 或 noise 不在封闭清单; 或 cleanup 未做 (placement 残留)

**机械复验脚本** (v1.3 加 gitignore pre-flight + 更新 sentinel content):

```bash
# Worker CC Stage 0 SPV-3 复验
SENTINEL_PATH="server/src/__spv__/spv3-sentinel.ts"

# Step 0: gitignore pre-flight (v1.3 NEW, Flag 2)
mkdir -p server/src/__spv__/
if ! git check-ignore -q "$SENTINEL_PATH" 2>/dev/null; then
  echo "SPV-3 SETUP_INCOMPLETE: server/src/__spv__/ not gitignored"
  echo "  必做: echo 'server/src/__spv__/' >> .gitignore && git add .gitignore && git commit"
  echo "  见 SPV §1 SPV-3 Placement 选择 Setup 一次性前置 段"
  exit 6
fi
echo "SPV-3 Step 0 PASS (gitignore active)"

# Step 1: 跑 sentinel gate (验证 __spv__/ 真在 tsc scope 内)
N1_PRISTINE=$(cd server && pnpm tsc --noEmit 2>&1 | grep -cE '^.*: error TS')
cat > "$SENTINEL_PATH" <<'EOF'
// SPV-3 sentinel v1.3 — DO NOT EDIT
// Expected: introduces exactly 1 TS2322 error (compatible with noUnusedLocals)
export const _spv3_sentinel: number = "type error sentinel";
EOF
N1_WITH_SENTINEL=$(cd server && pnpm tsc --noEmit 2>&1 | grep -cE '^.*: error TS')
SENTINEL_ERROR_MATCH=$(cd server && pnpm tsc --noEmit 2>&1 | grep -c "src/__spv__/spv3-sentinel.ts.*: error TS2322")
rm "$SENTINEL_PATH"

# v1.3 sanity check: git status 不应看到 sentinel 残留 (gitignore 已 verified Step 0)
if git status --porcelain | grep -q "spv3-sentinel"; then
  echo "SPV-3 ERROR: sentinel 残留出现在 git status (gitignore 未生效?)"
  exit 7
fi

if [[ "$N1_WITH_SENTINEL" -eq "$((N1_PRISTINE + 1))" ]] && [[ "$SENTINEL_ERROR_MATCH" -ge 1 ]]; then
  echo "SPV-3 sentinel gate PASS (__spv__/ in tsc scope)"
elif [[ "$N1_WITH_SENTINEL" -eq "$N1_PRISTINE" ]]; then
  echo "SPV-3 MECHANISM_FAILURE: __spv__/ NOT in tsc scope (delta 0 with sentinel)"
  exit 3   # NOT PASS, NOT FAIL — 阻断 spec, 走治理修订
else
  echo "SPV-3 ENV_UNEXPECTED: sentinel introduced unexpected delta (e.g. v1.3 export const 变更未应用 / noUnusedLocals 异常)"
  exit 4
fi

# Step 2: 跑 actual heredoc records (gate PASS 之后才进)
yq -r '.[] | select(.type != "sentinel_gate") | "\(.id)|\(.placement_path)|\(.extract_method)|\(.expected_n2)"' \
  <(awk '/^```yaml-spv3/,/^```$/' "$spec_file" | sed '1d;$d') |
while IFS='|' read -r id placement extract expected_n2; do
  # 抽 heredoc → placement
  sed -n "$(parse_lines_from_extract_method $extract)p" "$spec_file" > "$placement"
  actual_n2=$(cd server && pnpm tsc --noEmit 2>&1 | grep -cE '^.*: error TS')
  if [[ "$actual_n2" != "$expected_n2" ]]; then
    echo "SPV-3 FAIL: id=$id actual_n2=$actual_n2 expected_n2=$expected_n2"
    rm "$placement"
    exit 1
  fi
  rm "$placement"
  actual_cleanup_n=$(cd server && pnpm tsc --noEmit 2>&1 | grep -cE '^.*: error TS')
  if [[ "$actual_cleanup_n" != "$N1_PRISTINE" ]]; then
    echo "SPV-3 FAIL: cleanup mismatch (placement leak)"
    exit 1
  fi
done
echo "SPV-3 PASS"
```

**Plan Opus self-run 与 Helper review 跑同一段 script** (machine-extractable yaml-spv3 + sentinel gate 强制三方一致)。

---

### SPV-4: spec-依赖 state 必标来源 (scope-narrowed)

**消灭的错误类**: spec 内**作为 spec 行动依据**的 system / 路径 / 文件状态 / 容器状态 / env 状态陈述, 凭印象 (Snapshot prior session capture / project knowledge upload-time mirror / cross-instance handoff) 而非本 turn 实证。

**v1.1 scope 收窄** (vs v1.0): v1.0 写"每一句 system-state 陈述"导致 ritual 稀释。v1.1 限定 SPV-4 适用范围为 **spec 正确性所依赖 / 所作用的 state 陈述**, NOT 每个偶然提及。

**消灭的具体 governance queue 条目**:
- **条目 8** (Snapshot §1 governance queue): "Plan Opus 跨 system / path / content-state assumption 必先 CC dump 实证"

**历史数据点 (作为 SPV-4 设计的证据基础)**:
- Cat 5 子项 DP3 (`ad7a5152` Phase D-3b working tree vs project knowledge file 混淆) — **spec assumed working tree state, 实际 stale** ✓ SPV-4 适用
- Cat 5 子项 DP4 (path 凭印象 cross-system) — **spec referenced path, 假设非实证** ✓ SPV-4 适用
- Cat 5 子项 DP5 (project knowledge content vs repo state) — **spec depended on project knowledge content vs repo state** ✓ SPV-4 适用
- Cat 5 子项 DP7 (D-4 closure `ffc7719f` path 假设 `docs/handoff/...` vs 实际 `docs/superpowers/archive/...`) — **spec 内 path 作为 Edit target, 假设错** ✓ SPV-4 适用
- Cat 5 子项 DP8 (sed double-replace self-referential artifact) — **spec 内 sed 作用 state, 涉及内容假设** ✓ SPV-4 适用

**适用范围** (scope-narrowed):

**[in scope]** spec 内**作为行动依据 / spec 作用对象**的 state 陈述:
- spec Stage 0/1.5/2 跑命令的 target file/path (spec 行动 = grep/cat/Edit 该 path)
- spec 假设的 HEAD / baseline SHA (spec 整体依赖)
- spec 假设的容器状态 / env (spec Stage X 跑测试依赖)
- spec 假设的文件存在 / 字段存在 / 行数 / 内容片段 (spec heredoc / Edit / grep target)
- spec 引用的 prior commit chain (spec 决策依据)

**[out of scope]** (v1.0 错收, v1.1 显式 exclude):
- 治理决策引用 (e.g. "per Helper Flag 2 protocol" / "per Default Push Forward Rule" / "per D77 forward-fix template") — 治理 reference 非 state 陈述
- 抽象 principle 陈述 (e.g. "evidence-first 原则") — 非 state
- 历史叙事 (e.g. "Phase D 期 7 lessons") — 叙事性 summary 非 spec 行动依据
- 偶然提及的 cross-task / cross-instance reference 若 spec 不依赖其 state — 仅 mention 不行动
- 设计期决定的命名 (entry 编号 / Family 字母 / Phase 字母 / Task 编号)

**Rule of thumb**: 该陈述若错, spec 行动是否会 broken?
- **会** → in scope, 必 cite (a)实证 或 (b)假设
- **不会** (只是文字描述/叙事/治理引用) → out of scope, 不强制 cite

**机械判定方式**:

每个 in-scope 陈述必须在原句末尾 inline 含其中之一标记:

**(a) 实证标记**:
```
[实证: turn N, baseline_sha <SHA>, command `<完整命令>` → 输出 `<完整或截取片段>`]
```

**(b) 假设标记**:
```
[假设, 未验证 — Stage 0 G-X.Y 验证]
```

**特别要求**:
- 实证 citation 含 (1) turn 号 (2) baseline_sha (3) 完整可执行命令 (4) 完整或截取输出片段; 四者缺一即不算实证
- 假设标记**必须**配对 spec 内 Stage 0 verification step (引用 G-X.Y 编号), 否则 FAIL
- 不允许 hybrid (e.g. "based on Snapshot §X" — 既不是 (a) 也不是 (b), FAIL)
- Snapshot / Archive / Digest / Project knowledge 引用本身**不构成实证** — 必须 CC 本 turn 重新 `git show <SHA>:path | grep ...` verify
- 跨 system reference (Cowork workspace / /mnt/project / project knowledge upload mirror) **不构成 working tree 权威**

**SPV-4 audit 汇总段 (spec SPV section 内)**:

````
```yaml-spv4
# SPV-4-audit-summary
in_scope_statements_count: 8
evidence_marked_count: 7
assumption_marked_count: 1
out_of_scope_count: 12   # 治理引用 / 叙事 / 抽象 principle, 不强制 cite
assumption_to_stage0_mapping:
  - statement: "spec assumes HEAD == b2b9d64b"
    stage0_step: G-X.0
verdict: PASS
turn: <N>
```
````

**判定**:
- **PASS**: 每个 in-scope 陈述均含 (a) 或 (b) 标记 + (a) 标记的 citation 含四件 + (b) 标记的对应 Stage 0 G-X.Y verification step 在 spec 中存在
- **FAIL**: 任一 in-scope 陈述无标记; 或标记缺件; 或标记是 prose; 或 (b) 假设无对应 Stage 0 step

**机械复验脚本**:

```bash
# Worker CC Stage 0 复验
# Step 1: 从 spec 抽所有 (a) 标记的命令 (regex 抽 `[实证: ... command \`...\` → 输出 \`...\`]`)
# Step 2: 逐条 re-run, 比对输出
# Step 3: 抽所有 (b) 标记 + 对应 Stage 0 G-X.Y, 检查 Stage 0 step 在 spec 中存在
```

---

## 2. SPV 执行模型

### 2.1 三方核对 (NOT Plan Opus 自核对)

| 阶段 | 谁跑 | 跑什么 | 失败处置 |
|---|---|---|---|
| **1. Spec 定稿前** | Plan Opus 自跑 4 条 SPV → 结果写进 spec 顶部 SPV 段 (fenced YAML records) | 4 条逐条 PASS/FAIL + 完整 record blocks + SPV-4 audit summary | 任一 FAIL → 不定稿, 补到 PASS 再 ExitPlanMode |
| **2. Helper review 第一件事** | Helper Opus (cross-instance) | 逐条 audit SPV 段的 fenced YAML records — verify (a) record 完整性 (b) citation 不是 prose (c) SPV-2 `expected_match_lines` verbatim 行眼看 false positive (SV-7 "可见") (d) SPV-3 noise 在封闭清单 | 发现缺件 / hybrid / prose / false positive → Helper return flag, Plan Opus 修 SPV 段后重发 |
| **3. Worker CC Stage 0** | Worker CC | 先跑 **baseline-HEAD 守门** (§1) → 通过则机械复验 SPV-1/2/3/4 引用的命令, 比对输出 + cleanup placement | baseline-HEAD mismatch → 走"重核对流程" (§2.3) NOT FAIL; SPV re-run mismatch → 规则 8 暂停 → Plan Opus α/β/γ |

**关键设计**: 三方跑**同一段 yq + shell command 复验脚本** (机器可直接抽取), 任一方发现某条未满足 → 退回。

**为什么不能只由 Plan Opus 自核对**: 自核对 = 回到"靠记得应用"模式 — Phase D 已多次证明该模式失败。Plan Opus 自跑只是把"如果跑会得到什么"显式化, Helper + Worker CC 的 re-run 才是**实际**核对 (re-run mismatch = Plan Opus 自跑时撒谎或印象 OR 世界合法变化, §2.3 区分二者)。

### 2.2 机器可直接抽取格式 (v1.1 新增, 修中等 6)

v1.0 写"人工/regex 抽取 markdown 表格"不机械。v1.1 改:

**所有 SPV records 用 fenced code block + YAML 格式**:

````
```yaml-spv1
# SPV-1-record
- id: L1
  ...
```

```yaml-spv2
# SPV-2-record
- id: P1
  ...
```

```yaml-spv3
# SPV-3-record
- id: H1
  ...
```

```yaml-spv4
# SPV-4-audit-summary
in_scope_statements_count: N
  ...
```
````

**抽取脚本** (POSIX shell + yq, 可在 Worker CC Stage 0 / Helper review / Plan Opus self-run 都跑):

```bash
spec_file="$1"
extract_yaml_block() {
  local tag="$1"
  awk -v tag="^\`\`\`yaml-${tag}\$" '$0~tag,/^```$/' "$spec_file" | sed '1d;$d'
}

# SPV-1
extract_yaml_block spv1 | yq '.' > /tmp/spv1.yaml
# yq 进一步 query / re-run

# SPV-2
extract_yaml_block spv2 | yq '.' > /tmp/spv2.yaml
# SPV-3
extract_yaml_block spv3 | yq '.' > /tmp/spv3.yaml
# SPV-4
extract_yaml_block spv4 | yq '.' > /tmp/spv4.yaml
```

`yaml-spv1` / `yaml-spv2` / `yaml-spv3` / `yaml-spv4` 是 4 个固定 fence tag, **机器可直接 awk 抽取 + yq 解析** — NO 人工 parsing / 自由 markdown 表。

### 2.3 世界合法变化处理流程 (v1.1 新增 + v1.2 加工作树检查)

**问题**: spec 产出 → 执行之间, 合法 landed v-patch / 新 commit / 工作树 uncommitted edit / 时间过去 → working-tree-based re-run 输出 mismatch。v1.0 把所有 mismatch 当 "Plan Opus 撒谎" → false FAIL → 人学会忽略 SPV FAIL → SPV 三周后死。

**设计原则**: 区分三种 mismatch 来源:

| 来源 | 是 FAIL? |
|---|---|
| Plan Opus 撒谎/印象 (baseline 一致 + 工作树干净 + re-run mismatch) | **是 FAIL** (SPV 设计目标) |
| 世界合法 commit 移动 (baseline ≠ HEAD) | **NOT FAIL → ESCALATE** (重核对流程 α/β/γ) |
| 工作树未提交改动 (baseline == HEAD 但 dirty tree) | **NOT FAIL → ESCALATE** (working_tree citation 不可信, v1.2 新增) |

**SPV-0 守门两件事** (Worker CC Stage 0 第一+第二件事, 在 SPV re-run 之前):

```bash
# Stage 0 SPV-0a: baseline-HEAD 守门
declared_baseline_sha=$(yq -r '.[0].baseline_sha' /tmp/spv1.yaml)
actual_head=$(git rev-parse HEAD)

if [[ "$declared_baseline_sha" == "$actual_head" ]]; then
  echo "SPV-0a PASS (HEAD unchanged)"
  # 继续 SPV-0b
elif git merge-base --is-ancestor "$declared_baseline_sha" "$actual_head"; then
  echo "SPV-0a ESCALATE: baseline moved (legal world change)"
  echo "  declared_baseline: $declared_baseline_sha"
  echo "  actual_head: $actual_head"
  echo "  commits between: $(git log --oneline $declared_baseline_sha..$actual_head)"
  enter_re_verification_flow_committed_change
  exit 0
else
  echo "SPV-0a FAIL: baseline not ancestor of HEAD (unusual git state — rebase / force push / branch switch)"
  exit 2
fi

# Stage 0 SPV-0b: 工作树洁净检查 (v1.2 NEW, 修 Residual 2)
dirty_files=$(git status --porcelain)
if [[ -z "$dirty_files" ]]; then
  echo "SPV-0b PASS (working tree clean)"
  run_spv_re_verification
else
  echo "SPV-0b ESCALATE: working tree dirty (uncommitted changes)"
  echo "  dirty files:"
  echo "$dirty_files"
  enter_re_verification_flow_dirty_tree
  exit 0
fi
```

**重核对流程 — 路径 1: `enter_re_verification_flow_committed_change`** (HEAD 移动, baseline 后有 commits):

1. **CC 报 Plan Opus**: "baseline `<declared>` 后 N commits, files changed: `<list>` (via `git diff --name-only $declared_baseline..HEAD`)"
2. **Plan Opus 评估 (α/β/γ)**:
   - **α (无影响)**: 改动 files 与 spec 依赖无 overlap → Plan Opus bump spec preamble `baseline_sha: <new HEAD>` + 重跑 SPV self-audit (state-pinned citations 不变, working-tree citations 重跑 + 更新 `actual_output`) → spec 微 patch 重发, NOT D77
   - **β (citation level)**: 改动 files 与 SPV citation overlap, spec body actions 不动 → 更新 SPV records `expected_output` + `baseline_sha` + 重跑 → 重发
   - **γ (spec body level)**: 改动 files 与 spec body actions overlap → spec 内容本身需 v-patch → D77 forward-fix template
3. **Plan Opus 选 α/β/γ → Ian 明批 → 新 round SPV-0a/b 守门**

**重核对流程 — 路径 2: `enter_re_verification_flow_dirty_tree`** (HEAD 没动 + 工作树 dirty, v1.2 NEW):

1. **CC 报 Plan Opus**: "工作树脏, dirty files: `<list>` (via `git status --porcelain`)"
2. **state_pinned citations 仍可信** (读 commit blob 不看工作树) — Worker CC 可继续 re-run state_pinned 部分; **working_tree citations 不可信** → 跳过 / 走 ESCALATE
3. **Plan Opus 路径 (Ian 决议)**:
   - **stash 路径**: `git stash` 工作树改动 → 走正常 SPV re-run (干净状态) → re-run 完后 `git stash pop` 恢复
   - **commit 路径**: 工作树改动若是合法 spec-prep work, commit 之 → 进路径 1 (HEAD 移动)
   - **abort 路径**: dirty 改动若是临时 / 误编辑 → `git restore` / `git checkout --` 清掉 → 走正常 re-run
4. **绝不 silent 跑 working_tree re-run**: dirty 状态 working_tree citation re-run mismatch → 误判 "Plan Opus 撒谎" — v1.2 修复就是避免这个 false FAIL

**关键**: 世界合法变化 (路径 1 或 2) → 触发重核对流程, **不直接 FAIL**。SPV-FAIL 仅对应 "Plan Opus 撒谎/印象" (baseline 一致 **且** 工作树干净 **且** re-run mismatch)。

**state_pinned > working_tree 设计倾向 (再次强化, v1.2)**: state_pinned citation (e.g. `git show <SHA>:path | grep`) 读 commit blob, **完全不受工作树脏影响**。SPV-1/2/3/4 citation 能 state_pinned 就 state_pinned, 只在 state_pinned 不可行时退化到 working_tree (+ baseline_sha 字段 + SPV-0b 守门必干净)。

**SPV-3 tsc 工作树依赖说明**: SPV-3 跑整库 tsc 不可避免触工作树 (node_modules + tsconfig + src/**, NOT 只 commit blob). 因此 SPV-3 受 SPV-0b 守门约束 — dirty tree 必走 stash 或 commit 路径才能跑 SPV-3。**Sentinel gate (§1 SPV-3) 与 SPV-0b 是两道独立守门**: SPV-0b 守 "工作树是否可信", sentinel gate 守 "SPV-3 机制是否生效", 两道都通过才 SPV-3 真正 PASS。

**SPV-3 placement vs SPV-0b interaction (v1.3 Flag 2 修)**: SPV-3 必在 `server/src/__spv__/` (tracked 父目录下) 创建临时 sentinel + heredoc placement。若 `__spv__/` 未 gitignored → 临时文件出现在 `git status --porcelain` `??` 列 → SPV-0b 误判工作树脏 → false ESCALATE; 残留 placement 还可能 `git add .` 误 commit。**修法**: `server/src/__spv__/` 加入 `.gitignore` (一次性 Setup, 见 §1 SPV-3 Placement 选择 Setup 段)。**关键**: gitignore 与 tsconfig include 互不影响 — gitignore `__spv__/` 后 tsc 仍编译该目录, sentinel gate 照常工作。**SPV-3 sentinel gate Step 0** (v1.3) 含 `git check-ignore -q` pre-flight 校验, 未 gitignored 直接 `SETUP_INCOMPLETE` 阻断。

### 2.4 Spec 内物理位置

每份 Plan Opus 产 spec **顶部固定 SPV 段** (在 Charter / Background 之后, Stage 0 之前):

```markdown
# <Spec title>

## Charter / Background ...

## SPV (Spec Pre-Commit Verification)

**SPV version**: v1.3
**Spec writer**: Plan Opus, turn <N>
**Self-run at**: turn <N>
**baseline_sha**: <40-char SHA>     # SPV-0 守门 anchor
**baseline_n1**: <pristine tsc N>   # for SPV-3 delta
**Self-run result**: SPV-1 PASS / SPV-2 PASS / SPV-3 PASS / SPV-4 PASS

### SPV-1 来源表

```yaml-spv1
# (records 见 §1 SPV-1 格式)
```

### SPV-2 验证记录

```yaml-spv2
# (records 见 §1 SPV-2 格式)
```

### SPV-3 验证记录

```yaml-spv3
# (records 见 §1 SPV-3 格式)
```

### SPV-4 audit summary

```yaml-spv4
# (summary 见 §1 SPV-4 格式; inline 标记本身在 spec 全文)
```

---

## Stage 0 ...
```

### 2.5 Tooling 依赖 (v1.2 NEW, 修 Minor)

**问题**: v1.1 re-run 脚本全用 `yq` (YAML 解析), `yq` 非标准 POSIX 工具, Worker CC / Helper review / Plan Opus 环境若未预装 → 三方机械复验 **跑不起来**, SPV 沦为口头规则。

**v1.2 设计**: 复验脚本依赖 yq, **首次跑前必 `command -v yq` 确认**, 不可用则按 fallback 路径处理。

**首次检查 (任一方跑 SPV re-run 前)**:

```bash
if ! command -v yq >/dev/null 2>&1; then
  echo "SPV tooling: yq not available"
  echo "  推荐安装: brew install yq (macOS) / apt install yq (Debian/Ubuntu) / 见 https://github.com/mikefarah/yq"
  echo "  或使用 awk-only fallback (见 SPV-design §2.5 fallback section)"
  exit 5
fi
echo "SPV tooling: yq available ($(yq --version))"
```

**Awk-only fallback** (yq 不可用时, 解析 yaml-spv1/2/3/4 fenced block 用 awk + sed 提取):

```bash
# Awk-only SPV-1 record 提取 (key=value 顺序解析, 简化版)
extract_yaml_block() {
  local tag="$1"
  awk -v tag="^\`\`\`yaml-${tag}\$" '$0~tag,/^```$/' "$spec_file" | sed '1d;$d'
}

# 简化解析: 假设每条 record 以 "- id:" 开头, 字段顺序固定 (id / command / expected_output / ...)
extract_yaml_block spv1 | awk '
  /^- id:/ { if (id) print id "|" cmd "|" expected; id=$2; cmd=""; expected="" }
  /^  command:/ { sub(/^  command: */, ""); gsub(/^"|"$/, ""); cmd=$0 }
  /^  expected_output:/ { sub(/^  expected_output: */, ""); gsub(/^"|"$/, ""); expected=$0 }
  END { if (id) print id "|" cmd "|" expected }
' | while IFS='|' read -r id cmd expected; do
  actual=$(eval "$cmd" 2>&1)
  if [[ "$actual" != "$expected" ]]; then
    echo "SPV-1 FAIL (awk-only): id=$id"
    exit 1
  fi
done
```

**Fallback 限制**:
- Awk-only 解析假设 YAML field 顺序固定 + 无嵌套 + 无 multiline value (e.g. `expected_match_lines: |` 多行不支持)
- SPV-2 `expected_match_lines: |` 多行字段 + SPV-3 `cleanup` 多行字段 → awk-only fallback **不完整**, 仍需 yq
- **推荐: 三方环境统一安装 yq**, fallback 仅作 emergency 备用

**SPV-design 版本与 yq 版本兼容**:
- v1.2 测试 against yq v4.x (mikefarah/yq Go 实现)
- yq v3.x (Python 实现) 语法不同, **不兼容**, 必须 yq v4.x

**首次跑 SPV 的环境验证 checklist**:
```bash
command -v git    # required
command -v yq     # required (推荐 v4.x)
command -v awk    # required (POSIX)
command -v sed    # required (POSIX)
command -v grep   # required (POSIX)
command -v pnpm   # required (for SPV-3 tsc)
```

---

## 3. SPV 自身的局限声明

### 3.1 SPV 是封闭 4 条 — NOT Pattern #10 式无限 category

- 4 条 SPV 是设计期决定的**封闭集**, 不能在产 spec 时临时加第 5 条 (那样 SPV 退化成 Pattern #10 反应式 category 模式)
- 若 Phase E/F/G/H 期发现 SPV 漏了一类错 → 触发 **SPV 自身版本修订** (e.g. v1.3 → v2.0), 含明确 changelog + 新 SPV 条目编号 (SPV-5...) + 适用范围 + 触发 fabrication data point + 修订决议 governance commit
- SPV 版本号在 spec 顶部 SPV 段必须显式声明 (`SPV version: v1.3`), 不允许 silent 升级
- SPV 版本之间不向后兼容意味"用 v1.x spec 的复验脚本"和"用 v2.x spec 的复验脚本"是不同 artifact

### 3.2 SPV 明确不负责的范围

SPV 挡的是: 可机械核对的"印象错" (count / pattern / cast / state)。

SPV 挡不住的 (defense-in-depth 其他层继续兜):

| 类型 | 例 | 负责层 |
|---|---|---|
| **业务逻辑错** | D55 多步 tx 该不该触 / D56 FK 模型对不对 / repo signature 是否符合 Phase G 消费需求 | Helper 语义 review + Worker CC Stage 5 test + Ian α/β/γ 决议 |
| **Schema-vs-business-intent 错配** | schema `quantity Int @default(1)` vs business 想要 `quantity > 0 enforced` | schema design 阶段 Ian + Helper 决议 |
| **Cross-task 接口不一致** | Task 17 orders.ts 输出 type vs Task 18 sessions.ts 输入 type drift | Helper cross-task review + Phase 封顶 regen audit |
| **Test coverage 充分性** | Stage 5 23 cases 是否覆盖 RLS / atomic / concurrent | Ian + Helper test design |
| **Performance / scalability** | 某 query N+1 / 锁竞争 | code review + 实际运行 profiling |
| **Security review** | platform_admins NO RLS 设计是否安全 / Stripe webhook 签名验证 | security review (v15 candidate 即此类) |
| **Plan source 本身错** | plan v10 写错业务规则 | plan source review (Helper + Ian) |
| **Heredoc semantic correctness** | tsc PASS 但 runtime 错 (e.g. SQL injection / 错的 query) | Stage 5 integration test |
| **SV-7 类 false positive 内容错** | grep 匹配数对但匹配的是 JSDoc 段不是 code 段 | SPV-2 让其"可见" (verbatim `expected_match_lines` 字段 + Helper 眼读) NOT "机械捕获"; 见 §6 SV-7 行 |

**明确**: SPV 不是万能。SPV 只是 spec writing 的**机械印象错过滤器**, NOT spec correctness oracle。通过 SPV 的 spec 仍可能错 — 后续 defense-in-depth 层 (Helper 语义 review + Stage 5 test + Ian 决议 + Worker CC runtime fail-loud) 继续兜底。

### 3.3 合成值禁令 (v1.1 新增, 修中等 4)

**原则**: spec 内**作为行动依据**的可测量值必须是**单源单输出 atomic citation**, 禁用合成值。

**正例**:
- `"= 1"` (Stage 1.5 expiresAt threshold) ← citation: `git show A:path | grep -c "expiresAt: null"` → `1` ✓ atomic
- `"= 103"` (Stage 2 N1 baseline) ← citation: `cd server && pnpm tsc --noEmit 2>&1 | grep -cE "..."` → `103` ✓ atomic
- 若需 6 + 1 = 7, spec 内分开 cite 两次, NOT 写 "7"

**反例 (FAIL)**:
- `"7 lessons"` ← citation: "6 D91 SV + 1 D92 Family D" — 合成值, 跨源汇总
- `"22 model (16 主表 + 6 子表)"` ← 若 spec 行动依据需 22, 分开 cite 16 + 6
- 任何 citation 含 `+` / `-` / `×` / 文字推理 → FAIL

**叙事性总数边界**:
- Background / Charter 段叙事性总数 (e.g. "Phase D 累积 governance lesson") — **不属 SPV-1 适用** (扣除范围)
- 但**不能出现在 Stage 0/1.5/2/5 等 action section** — 若出现就必须分开 cite (按可测量值 atomic 规则)
- Stage X 内 `"N total"` 类总数 → 必须分开 cite + 合计在 spec body 文字描述 (NOT 在 SPV-1 record 内 citation)

**实践建议**: spec writer 写 Stage X heredoc / threshold 前, 问自己 "这个数字是 spec 行动依据吗?" — 是 → 必 atomic citation; 否 (Background 叙事) → 不属 SPV-1 范畴 (可仍标 (a) 实证 if relevant SPV-4 适用)。

### 3.4 SPV 不消除既有 defense-in-depth 层

SPV 是 **新增防御层**, 不替代既有任一层。

| 既有层 | 是否被 SPV 替代 | 原因 |
|---|---|---|
| L1 Plan Opus self-audit (D88 维度 1+2+3) | 不替代 | SPV 是 self-audit 的机械化具体形式, 不是不再做 self-audit |
| L3 Worker CC fail-loud (tsc / runtime) | 不替代 | SPV-3 跑的是 placement heredoc 的 project tsc, 实施期 Stage 2 整库 tsc 仍跑; runtime fail-loud 仍是兜底 |
| L6 Helper cross-instance review | 不替代 | Helper 仍做语义 review; SPV 段是 Helper review 第一件事但不是唯一件事 |
| Ian 决议层 | 不替代 | Ian α/β/γ 仍是最终决议 |
| 规则 8 暂停机制 | 不替代 | 规则 8 仍是 Worker CC 遇 SPV re-run mismatch / Stage 0/2 fail 时触发 |
| D77 forward-fix template | 不替代 | SPV-0 守门 escalate γ path 仍走 D77 |

SPV 是把 L1 Plan Opus self-audit 层从 prose 规则升级为**机械核对清单 + 三方共同 re-run + 世界合法变化 escalate**。

---

## 4. SPV 与现有 governance 的关系

### 4.1 SPV-1/2/4 = D91 候选的结构化形态

**D91 候选** (Plan Opus spec writer expected-output minimization principle, D89 sub-rule extension) propose 自 Phase D-5a Task 22 Step 1 `73d5c225` (2026-05-14)。

**升格路径**: 后续 Phase D 整体 closure batch 升格 D91 时, **升格的产物就是 SPV-1/2/4**:
- D91 候选 → governance-digest §6 formal entry, entry body = "see spv-design.md SPV-1/2/4"
- Pattern #10 (a)-(e) 5-category 内化到 SPV-1/SPV-2 适用范围, NOT 单独 formal entry
- 升格后 Plan Opus 产 spec 不再"记得 D91", 而是"产 spec 时必跑 SPV"

**本 turn 不做**: 不做 D91 升格本身。本 turn 只产 SPV 设计 v1.3。

### 4.2 SPV-3 = D92 候选的结构化形态

**D92 候选** propose 自 Phase D-5b Task 23 plan patch v11 `538d00e2` (2026-05-21)。Family A/B/C/D 是反应式 categorization, 同 Pattern #10 模式。

**升格路径**:
- D92 候选 → governance-digest §6 formal entry, entry body = "see spv-design.md SPV-3"
- Family A/B/C/D 不再单独 enumerate — 全是 "heredoc TS 凭印象写未 project tsc 验证" 不同 surface, SPV-3 统一覆盖
- 升格后 Family E 出现也无须新 entry, 直接由 SPV-3 兜住

**本 turn 不做**: 不做 D92 升格本身。

### 4.3 D89 (已 land at `c0b8f4e0`) 与 SPV 的关系

**D89** (anchor literal source freshness mandate) formal land at `c0b8f4e0` (2026-05-12)。

**SPV 是 D89 mandate 的可执行化** — D89 抽象 mandate 拆成 4 条机械可核对项:

| D89 概念 | SPV 对应 |
|---|---|
| Anchor literal source freshness | SPV-1 (可测量值的 fresh 验证, citation 必含 state-pinning + 4 完整字段) |
| D89 sub-rule: anchor literal grep 实证 | SPV-2 (grep pattern 必跑过 + verbatim 行) |
| (D89 entry 原文未覆盖此 surface) | SPV-3 (heredoc TS 必 project tsc 验证, 是 D89 evidence-first family 的扩展) |
| Cross-instance / cross-system assumption (governance queue 8) | SPV-4 (spec-依赖 state 必标来源) |

**关键**:
- **D89 不动**, 仍是 formal mandate at `c0b8f4e0`
- SPV 是 D89 之下的 **execution layer** — D89 entry 升格后会引用 SPV
- SPV 不取代 D89 entry, SPV-design.md 与 D89 entry 并存

### 4.4 与 D77 forward-fix template 的关系

SPV 命中 FAIL 时:
- **定稿前 FAIL** (Plan Opus 自跑): 不定稿, 修补到 PASS 再 ExitPlanMode → 无需 forward-fix
- **Helper review FAIL** (post-spec-produce / pre-execute): Plan Opus 修 SPV 段后重发 → 无需 forward-fix
- **SPV-0 ESCALATE** (世界合法变化): 走重核对流程 (§2.3 α/β/γ), γ path 才进 D77 forward-fix
- **SPV re-run mismatch (baseline 一致)** (post-ExitPlanMode 执行中 Worker CC Stage 0): 规则 8 暂停 → Plan Opus α/β/γ → 若 spec 已 push 不 amend → D77 forward-fix template

SPV 本身不替代 D77, 是减少 D77 trigger 频率的前置防御 + escalate 路径区分。

---

## 5. SPV 自身的 SPV self-audit (本设计文本经得起核对)

本 SPV 设计文本本身可被 SPV 自核对。

### SPV-1 self-audit (本文档内的可测量值, 作为行动依据)

本文档是**机制定义文本**, 非 Stage 0/1.5/2/5 action spec。文档内出现的 literal 大部分是叙事 / 引用 / 例子, **非 spec 行动依据** → 不属 SPV-1 适用范畴 (§3.3 叙事性总数边界 + §1 SPV-1 适用范围)。

例外: 本文档 § header 声明的 baseline_sha (`b2b9d64b9fb2c5fc2a38037bcaa9dcc5bdd1b1b2`) 是本设计 v1.0/v1.1/v1.2/v1.3 共同 land 时点的 working-tree anchor (4 版同 baseline 未 commit) — 这是文档自身 state 而非行动依据, 仍 cite for transparency:

```yaml-spv1
# SPV-1-record (本设计文本)
- id: L_baseline
  literal: "b2b9d64b9fb2c5fc2a38037bcaa9dcc5bdd1b1b2"
  location: "§header baseline HEAD"
  category: sha_literal
  citation_type: state_pinned
  command: "git rev-parse b2b9d64b9fb2c5fc2a38037bcaa9dcc5bdd1b1b2^{commit}"
  expected_output: "b2b9d64b9fb2c5fc2a38037bcaa9dcc5bdd1b1b2"
  actual_output: "b2b9d64b9fb2c5fc2a38037bcaa9dcc5bdd1b1b2"
  turn: <本 turn>
- id: L_c0b8f4e0
  literal: "c0b8f4e0"
  location: "§0 / §4.3 D89 formal land 引用"
  category: sha_literal
  citation_type: state_pinned
  command: "git rev-parse c0b8f4e0^{commit}"
  expected_output: "c0b8f4e0db138294c1a75de35aa8b7e3978a0645"
  actual_output: "c0b8f4e0db138294c1a75de35aa8b7e3978a0645"
  turn: <本 turn>
```

其他文档内 literal (e.g. `587a565b` / `83885944a` / `Task 22 Step 1 2590ab04` / `Phase D 11/11` / `Pattern #10 5-category` / `governance queue 条目 8` / `Cat 5 子项 DP3-DP8`) — 全是治理引用 / 叙事 / 设计期编号, 不属 SPV-1 适用范畴 (§3.3 扣除范围 + §1 SPV-1 适用范围限定 "spec 行动依据")。

**合成值检查**: 本文档 §header 提及 "D91 6 self-violation + D92 Family D NEW + 同 family 早期 SV-1 ancient = 共 8 数据点 family" — 该陈述是**叙事性 summary**, 非 spec 行动依据, 不属 SPV-1 适用; 但根据 §3.3 实践建议 "叙事段允许出现, 不强制 atomic", 仍标识为 **non-action narrative**, 未来若需在 spec 行动 section 引用则必 atomic 分开。

**Self-run verdict**: PASS (action-依据 literal 0 处缺 citation, 叙事 literal 不属适用范畴)

### SPV-2 self-audit (本文档内的 grep pattern)

本文档不含任何用于匹配源码的 grep/sed pattern (本文档是 SPV **设计文本**, 含的 grep 例子是机制定义内的 record 格式示例, 非本文档自身执行依据)。SPV-2 适用范围: N/A (vacuously)。

**Self-run verdict**: PASS (vacuously)

### SPV-3 self-audit (本文档内的 heredoc TS)

本文档不含任何 heredoc TypeScript code (heredoc 块全是 SPV 段示例 markdown / shell snippets / SPV-2/3 验证记录块格式说明, NOT 可执行 TS)。SPV-3 适用范围: N/A (vacuously)。

**Self-run verdict**: PASS (vacuously)

### SPV-4 self-audit (本文档内的 in-scope state 陈述)

本文档是机制定义文本, **不是 spec, 无 spec action**, 故 SPV-4 的"spec 行动依据 state" 概念在本文档内仅适用于:
- 本文档自身 land 路径 (`docs/superpowers/archive/spv-design.md`) — 文档自身存在性
- D89 formal land 状态 (`c0b8f4e0`) — 设计依据
- 本 turn HEAD (`b2b9d64b...`) — 设计 baseline

```yaml-spv4
# SPV-4-audit-summary (本设计文本)
in_scope_statements_count: 3
evidence_marked_count: 3
assumption_marked_count: 0
out_of_scope_count: ~30   # 治理引用 / 叙事 / 抽象 principle / 设计期编号, 不强制 cite per §3.3
assumption_to_stage0_mapping: []
verdict: PASS
turn: <本 turn>
```

In-scope 陈述 inline 标记:

| Statement | 标记 |
|---|---|
| "SPV-design.md land at docs/superpowers/archive/" | [实证: turn <本>, baseline_sha b2b9d64b, command `git cat-file -e b2b9d64b:docs/superpowers/archive/README.md && ls docs/superpowers/archive/` → 输出 `README.md / phase-5-fabrication-archive.md / phase-5-governance-digest.md / phase-5-state-snapshot.md / spv-design.md (本文件 land 后)`] |
| "D89 formal land at c0b8f4e0" | [实证: turn <本>, baseline_sha b2b9d64b, command `git show c0b8f4e0 --stat \| head -5` → 输出 `commit c0b8f4e0db138294c1a75de35aa8b7e3978a0645 ... governance docs commit`] |
| "本 turn baseline HEAD = b2b9d64b" | [实证: turn <本>, baseline_sha b2b9d64b, command `git rev-parse HEAD` → 输出 `b2b9d64b9fb2c5fc2a38037bcaa9dcc5bdd1b1b2`] |

其他 ~30 陈述 (Phase D 状态 / governance queue 条目 / Cat 5 子项 / Pattern #10 5-category / D92 Family A/B/C/D / 治理决策引用 "per Helper Flag" / 抽象 principle "evidence-first") 全是**治理引用 / 叙事 / 抽象 principle / 设计期编号** — 不属 SPV-4 scope (§1 SPV-4 out of scope 列表), 不强制 cite。

**Self-run verdict**: PASS

---

## 6. 试跑覆盖 audit (Phase D 7 SV 是否全被 SPV 覆盖)

**机械捕获 (re-run mismatch 直接 FAIL)** vs **"可见" (verbatim 字段让 Helper / Ian 眼读 catch, NOT 数量比对)** 区分:

| SV / Family | 描述 | 由哪条 SPV 覆盖 | 捕获方式 |
|---|---|---|---|
| **SV-1** (Task 22 Step 1 §2 G-T22.2) | pre-write "Expected schema field literals" 未 CC dump | SPV-1 + SPV-4 | **机械**: SPV-1 要求 "字段名" 类 literal 必含 schema grep citation; SPV-4 要求 "schema 字段存在性" in-scope (spec 行动依据 schema 字段) 含实证标记 |
| **SV-2** (Task 24 expiresAt threshold ≥ 2 印象) | hardcoded count threshold | SPV-1 | **机械**: SPV-1 要求 count threshold record citation, `git show <SHA>:heredoc-file \| grep -c "expiresAt: null"` 实测 = 1 vs 期望 ≥ 2 立即 mismatch |
| **SV-3** (Task 25 Round 1 β-path #2 scope under-extension) | heredoc TS phone strict 仅 add() 端 drop, missed updateEntry 端 | SPV-3 | **机械**: SPV-3 project-aware tsc 跑 placement heredoc, Prisma WaitlistEntryUpdateInput.phone null rejection 在 strict mode 触发 TS error → delta > 0 → FAIL |
| **SV-4** (Task 25 Round 2 G-T25.12 hardcoded = 5) | hardcoded count baseline | SPV-1 | **机械**: SPV-1 要求 baseline 数字必含 source citation, `= 5` 凭印象 → 无 source citation → FAIL |
| **SV-5** (Task 25 Round 3 G-T25.6.1 threshold = 0 missed) | threshold value 写 without measurement against heredoc 实际 occurrences | SPV-1 | **机械**: SPV-1 要求 threshold 必含 `grep -c` against heredoc citation, 0 vs 1 立即 mismatch |
| **SV-6** (v13 Round 4 `^## Task 26:` ASCII vs `## Task 26：` 全角) | grep pattern character mismatch (ASCII colon vs full-width) | SPV-2 | **机械**: SPV-2 要求 pattern 必跑过 against actual target, ASCII pattern 跑 full-width source → `expected_match_count = 0` vs Plan Opus 期望 = 1 → mismatch FAIL |
| **SV-7** (Task 26 Round 5 broad regex JSDoc false positive) | grep pattern breadth 过宽误命中 JSDoc 段 | SPV-2 | **"可见" NOT "机械捕获"** — SPV-2 数量匹配可凑巧对 (e.g. 期望 3 = 实际 3, 但实际是 JSDoc 3 段而非 code 3 段). SPV-2 `expected_match_lines` 字段强制 Plan Opus / Helper 眼读 verbatim 行 — JSDoc 行 vs code 行的差异**视觉可见**, Helper review 第一件事 audit 时 catch. NOT 跑命令自动 FAIL, NOT 假装 SPV-2 100% 机械抓 SV-7 (诚实改 vs v1.0) |
| **D92 Family A** (Task 23 InputJsonValue cast × 6) | heredoc TS embedded cast vs schema 不需 cast (TS2322 × 6) | SPV-3 | **机械**: SPV-3 project tsc catch 6 TS2322 errors → delta = 6 → FAIL (6 不在 env noise 封闭清单) |
| **D92 Family D** (Task 26 Set narrowing) | heredoc TS `new Set(...)` missing type param (TS2345 at .has) | SPV-3 | **机械**: SPV-3 project tsc strict + TS 5+ narrowing catch TS2345 → delta = 1 → FAIL |
| **Governance queue 8** (cross-system / path / content-state assumption) | path 假设 / Snapshot 引用 / Project knowledge mirror 当 working tree 权威 | SPV-4 | **机械** (scope-narrowed v1.1): SPV-4 要求 spec-依赖 state (path / file 存在性 / content) 必含 (a) 实证或 (b) 假设标记; Snapshot 引用 NOT 构成实证 (必须 `git show <SHA>:path` re-verify) |

**覆盖率**:
- **机械捕获**: SV-1, SV-2, SV-3, SV-4, SV-5, SV-6, D92 Family A, D92 Family D, governance queue 8 = 9/10
- **"可见" (Helper / Ian 眼读)**: SV-7 = 1/10
- **完全未捕获**: 0/10

**诚实 ack**: SPV-2 对 SV-7 不是机械捕获, 是 "可见" — Plan Opus 自跑可能凑巧 PASS (数量对), 但 `expected_match_lines` 字段是**强制人读的 verbatim 行**, Helper review 第一件事 audit 时眼读 (JSDoc 段 vs code 段视觉可辨), 第三方实际 catch. 该机制 fall back 到 Helper 角色, NOT 假装 SPV 全机械.

---

## 7. 修订历史

### v1.3 (2026-05-22, Helper re-review-2 v1.2 — 2 interaction flag 修订)

post-v1.2 Helper re-review-2 verdict: 2 residual gap + minor 全修对 (v1.2), 架构稳, 无 regression。但 v1.2 新增的 SPV-0b 与 SPV-3 sentinel/placement 两机制互相碰撞 — 2 interaction bug, 必修 → v1.3:

- 🟡 **Flag 1 — sentinel "恰好 +1 error" 有 noUnusedLocals 未验证假设**:
  - 问题: v1.2 sentinel `const _spv3_sentinel: number = "..."; export {};` — `_spv3_sentinel` 是声明未用 local; 若 tsconfig `noUnusedLocals: true` → 额外 TS6133 → delta = +2 → MECHANISM_FAILURE 每次 → SPV-3 永远过不了 gate。`_` 前缀豁免 noUnusedLocals 依 TS 版本而定, sentinel 唯一标尺不能有"依 tsconfig 而定"的不确定性
  - 修: §1 SPV-3 sentinel content 改 `export const _spv3_sentinel: number = "type error sentinel";` (无 `export {};` 那行) — `export const` 使变量"被外部使用", noUnusedLocals 完全不触发, 只剩 TS2322, 任何 tsconfig 下 "+1" 都成立
  - sentinel_version: v1.2 → v1.3 (锁定 content 同步更新, v1.3 即 SPV 版本 bump)
  - §1 SPV-3 复验脚本 heredoc 同步更新
- 🟡 **Flag 2 — `server/src/__spv__/` 未 gitignore → SPV-3 placement 污染 SPV-0b**:
  - 问题: SPV-3 创建临时 sentinel + heredoc placement 在 `server/src/__spv__/` (tracked 父目录 `server/src/` 下) → 临时文件是 untracked → `git status --porcelain` 列 `??` → SPV-0b 判工作树脏 → false ESCALATE; 残留 placement 还可能 `git add .` 误 commit
  - 修: §1 SPV-3 Placement 选择 加 **Setup 一次性前置** 段 (`server/src/__spv__/` 必加 `.gitignore`) + sentinel gate **Step 0 gitignore pre-flight** (`git check-ignore -q` 校验, 未 gitignored → `SETUP_INCOMPLETE` 阻断)
  - 关键澄清 (v1.3 doc): **gitignore ≠ tsc exclude** — gitignore 管 git tracking, tsconfig include 管 tsc compilation, 两套机制完全独立; gitignore `__spv__/` 后 tsc 仍编译该目录, sentinel gate 照常工作
  - §1 SPV-3 Placement 选择 表格化 (路径 / gitignore / tsc include 三维度独立 ack)
  - §2.3 SPV-0b 末段加 SPV-3 placement vs SPV-0b interaction 修说明
  - 加 `SETUP_INCOMPLETE` 状态 (sentinel gate 第 5 种 verdict; PASS / SETUP_INCOMPLETE / MECHANISM_FAILURE / ENV_UNEXPECTED / FAIL)

**v1.3 性质 ack**: 两 flag 是 v1.2 新机制 (SPV-0b + SPV-3 sentinel/placement) 之间的对齐, **非架构改动** — 4 条 SPV 核心定义 / 三方核对 / state-pinning / 世界合法变化流程 / 合成值禁令 / env noise 封闭清单 / fenced YAML / SV-7 "可见" 全 invariant 保持, 无 regression。

### v1.2 (2026-05-22, Helper re-review v1.1 — 2 residual gap + 1 minor 修订)

post-v1.1 Helper re-review verdict: 2 严重缺陷已修对 (v1.1 方向正确), 但严重 2 修复引入 2 residual gap (必须堵) + 1 minor (yq 依赖):

- 🔴 **Residual 1 — SPV-3 依赖 __spv__/ 在 tsconfig include, 不在 = false PASS**:
  - 问题: 整库 `tsc --noEmit` 只编 tsconfig include 范围内 files。`server/src/__spv__/` 不在 include → 整库 tsc 不碰 → delta 永远 0 → SPV-3 永远 PASS = 空操作 (Family A/D 全静默放过, 比 v1.0 还糟)
  - 修: §1 SPV-3 加 **sentinel 自检 gate** (v1.2 NEW) — 故意有 TS2322 error 的 sentinel `server/src/__spv__/spv3-sentinel.ts` 放进 __spv__/, 跑 tsc 验证 delta == +1; delta 没动 = __spv__/ NOT in tsc scope = SPV-3 当场判 **MECHANISM_FAILURE** (NOT PASS NOT FAIL, 阻断 spec, 走治理修订)
  - Placement 路径锁定 `server/src/__spv__/` (现有 `src/**` glob 覆盖, NOT 改 tsconfig; tsconfig 需 commit + governance Plan Opus / Worker CC 读-only 改不了)
  - 验证验证器本身在工作 — 每次 SPV-3 跑前必先跑 sentinel gate
  - §1 SPV-3 机械复验脚本 加 sentinel gate pre-flight step
- 🔴 **Residual 2 — baseline-HEAD 守门只看 HEAD 不看工作树脏**:
  - 问题: §2.3 SPV-0 守门只 `git rev-parse HEAD`。工作树可 HEAD==baseline 但有未提交改动 → working_tree citation re-run 看到未提交改动 → 输出 mismatch → 误判 "Plan Opus 撒谎" FAIL (正是严重 1 想消灭的 false FAIL, 换了来源)
  - 修: §2.3 加 **SPV-0b 工作树洁净检查** — `git status --porcelain` empty 才正常 re-run; 工作树脏 → ESCALATE (路径 2: `enter_re_verification_flow_dirty_tree`) → stash / commit / abort 三选项, NOT 直接 FAIL
  - state_pinned citation (`git show <SHA>:path`) 读 commit blob 不受工作树脏影响 — 再次强化 "state_pinned > working_tree" 设计倾向 (§2.3 末段)
  - SPV-3 tsc 工作树依赖说明: SPV-3 跑整库 tsc 不可避免触工作树, SPV-3 受 SPV-0b 约束; sentinel gate 与 SPV-0b 是两道独立守门, 全 PASS 才 SPV-3 真正 PASS
- 🟡 **Minor — SPV 硬依赖 yq, 复验脚本跑不起来**:
  - 问题: v1.1 re-run 脚本全用 `yq`, 非 POSIX 预装; 三方环境未预装 → 机械复验跑不起来, SPV 沦口头规则
  - 修: §2.5 NEW **Tooling 依赖** — `command -v yq` 首次检查 + awk-only fallback (有限制: SPV-2 `expected_match_lines: |` 多行 / SPV-3 多行字段 awk-only 不完整, 推荐三方统一安装 yq v4.x)
  - 首次跑 SPV 环境验证 checklist (git / yq / awk / sed / grep / pnpm)

### v1.1 (2026-05-22, Helper review 7 缺陷修订)

post-v1.0 Helper review verdict: 架构 ✅ approve / 执行机制层 7 缺陷 (2 严重) — 全收修订:

- 🔴 **严重 1 — re-run 决定性时间漏洞**:
  - 新增 §1 **State-pinning 原则** (适用 SPV-1/2/3/4)
  - 新增 §2.3 **世界合法变化处理流程 (重核对流程 α/β/γ)**
  - 新增 §2.1 / §2.4 **baseline-HEAD 守门** (Worker CC Stage 0 第一件事)
  - citation 命令推荐 `git show <SHA>:path | grep ...` (state_pinned), working_tree 必含 `baseline_sha:`
- 🔴 **严重 2 — SPV-3 tsc 调用技术错**:
  - 完全重写 §1 SPV-3 — heredoc 抽到 `server/src/__spv__/` placement → 整库 `pnpm tsc --noEmit` (NO file arg, project-aware) → delta vs N1 baseline
  - 加 `cleanup` step (跑完删 placement + verify tsc 回 N1)
  - 复用 Stage 2 既有 N1 baseline 机制
- 🟡 **中等 3 — SPV-4 scope 太宽**:
  - §1 SPV-4 改 "spec 行动依据 / 作用对象 state" 收窄
  - 显式 exclude 治理决策引用 / 抽象 principle / 历史叙事 / 设计期编号
  - Rule of thumb: "陈述若错, spec 行动是否会 broken" 判 in/out scope
- 🟡 **中等 4 — SPV-1 处理不了合成值**:
  - 新增 §3.3 **合成值禁令** (atomic citation 单源单输出)
  - 叙事性总数边界 (Background 段允许出现, 不强制 atomic; 但禁出现在 Stage 0/1.5/2/5)
  - §5 self-audit 同步修订 (移除 "7 lessons" fudge, 改标 non-action narrative)
- 🟡 **中等 5 — SPV-3 "acceptable env noise" 判断漏洞**:
  - §1 SPV-3 改 **预定义封闭清单** (具体 TS code + 文件 + reason)
  - 不在清单 → FAIL 没商量
  - 清单修订需 SPV 版本 bump (不允许 silent 加)
- 🟡 **中等 6 — re-run 抽取 hand-waved**:
  - 新增 §2.2 **机器可直接抽取格式** (fenced code block + YAML, tag = `yaml-spv1/2/3/4`)
  - 提供 awk / yq 抽取脚本
  - SPV records 全改 YAML 结构化, NOT 自由 markdown 表格
- 🟡 **中等 7 — §6 对 SV-7 覆盖声明夸大**:
  - §6 SV-7 行改 **"可见" NOT "机械捕获"** (诚实)
  - SPV-2 record 加 `expected_match_lines: verbatim 行` 字段强制人读
  - §3.2 SPV 不负责范围加 "SV-7 类 false positive" 行 (诚实 ack 由 Helper 眼读 fall back)

### v1.0 (2026-05-22, 首版)

Phase D-5e Task 26 land + Phase D 11/11 + 附录 5 ✅ 完成 milestone 后, Ian + Helper 已定方向"机械的 / 外部的 / 三方核对清单 替 prose 规则"。Planner CC instance 产出。

触发证据: Phase D 整体 closure governance commit batch 待决清单 dump report (a) 段 D91 self-violations + (b) 段 D92 Family D NEW + (d) 段 Cat 5 子项 DP10/11/12 + (e) 段 Pattern #10 5-category 现状。

### 修订原则

任何 SPV 条目增删改 → 显式版本号 bump + changelog + 触发 fabrication data point / Helper review verdict + governance commit batch。**不允许 silent 增删**。`delta_acceptable_env_noise_whitelist` 修订同样需 SPV 版本 bump。

---

## 8. 下一步 (NOT 本 turn 做)

1. **本 turn**: 产出 SPV v1.3 修订 (Helper re-review-2 v1.2 反馈 2 interaction flag 全收 — sentinel `export const` 化 + __spv__/ gitignore + doc 说明 gitignore ≠ tsc exclude) → overwrite `docs/superpowers/archive/spv-design.md` (v1.2 → v1.3 targeted Edits)
2. **Ian 明批 v1.3 后**: paste 给 Helper re-review-3
   - Helper re-review-3 重点:
     - **Flag 1 修复 (sentinel export const)** — 新 sentinel content 是否真在任何 tsconfig (含 `noUnusedLocals: true`) 下都 delta = +1 仅 TS2322; v1.2 vs v1.3 diff 原因 ack 表清晰
     - **Flag 2 修复 (__spv__/ gitignore)** — Setup 一次性前置段是否完备 + sentinel gate Step 0 gitignore pre-flight 是否堵住 SETUP_INCOMPLETE 路径; gitignore ≠ tsc exclude 澄清是否到位 (两套机制独立, gitignore `__spv__/` 后 tsc 仍编译该目录)
     - v1.0 → v1.1 → v1.2 全 changelog 是否仍稳 (无 regression)
     - SPV 整体仍覆盖 Phase D 7 SV + D92 Family A/D + governance queue 8 (§6 audit 仍 hold)
     - SPV 自身 v1.3 无印象成分 (§5 self-audit 应用 v1.3 收紧规则)
     - SPV-0b 与 SPV-3 sentinel/placement 两 v1.2 新机制 v1.3 后对齐, 无 routine false ESCALATE
3. **Helper return clean 后**: SPV v1.3 立住, 进入试跑验证阶段 (next session)
   - 试跑前 Setup 一次性前置: `server/src/__spv__/` 加入 `.gitignore`, **与 spv-design.md 同一 commit land** (NOT 拖到 closure governance batch; 机制 Step 0 SETUP_INCOMPLETE 兜底, 忘了 setup 也不会 false PASS)
4. **试跑验证后**: 进入 Phase D 整体 closure governance commit batch atomic decide — D91/D92/D93 升格 entry body 引用 SPV / Cat 5 子项整合 / Pattern #10 处置 / Family A/B/C/D 处置 / Snapshot regen / Archive 候选 land 等, **全是 closure 本体 NOT 本 turn 范围**

---

*Phase 5 SPV (Spec Pre-Commit Verification) Design v1.3 · 2026-05-22 · 与 Governance Digest + State Snapshot + Fabrication Archive 配套*

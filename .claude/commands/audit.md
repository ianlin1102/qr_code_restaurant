解析参数 `$ARGUMENTS`：
- 如果为空或 "all"：运行全部 9 个 Loop（1-9）
- 如果是逗号分隔的数字（如 "1,3,5"）：只运行指定的 Loop
- 如果是单个数字（如 "2"）：只运行该 Loop
- 如果是预设组合名：
  - "structure" = Loop 1, 3, 4（改结构后）
  - "feature" = Loop 2, 6（加功能后）
  - "deploy" = Loop 2, 5, 7（部署前）
  - "weekly" = Loop 1, 5, 8（每周维护）
  - "sync" = Loop 1, 8（结构快照 + 更新 CLAUDE.md）
  - "language" = Loop 9（i18n 国际化审计）

---

用 Agent tool 并行派发选中的 Loop。每个 Agent 是独立的 subagent，可以同时运行。

**关键规则：**
1. 所有选中的 Loop 必须在同一条消息中用多个 Agent tool call 并行派发
2. 每个 Agent 使用 `run_in_background: true` 在后台运行
3. 每个 Agent 的 name 格式为 `audit-loop-N`
4. 先创建 `docs/audit/` 目录（如果不存在）
5. 日期格式统一用当前日期 YYYY-MM-DD

---

以下是每个 Loop 的完整 Agent prompt。将选中的 Loop 对应的 prompt 作为 Agent 的 prompt 参数：

## Loop 1: Structure Documentation

```
你是项目结构文档生成器。

目标：为项目生成结构快照文档。

执行步骤：
1. 扫描整个项目目录，排除：bee/、node_modules/、.git/、dist/、build/

2. 在 docs/project-structure/ 下创建文件夹，格式：YYYY-MM-DD-HH-CST/（用当前 CST 时间）

3. 生成以下 JSON 文件：

data-flow.json
- 列出每条 API 路由（method + path）
- 每条路由的 request body shape（field name + type）
- 每条路由的 response shape（field name + type）

entity-schema.json
- 列出 shared/types.ts 里所有主要类型
- 每个类型的所有 field、type、是否 optional

component-tree.json
- 列出所有 React 组件文件路径（client/src/ 下的 .tsx）
- 每个组件接收的 props（name + type）
- 每个组件内部调用了哪些子组件

api-contracts.json
- 前端 services/api.ts 里每一个 API 调用的 URL
- 对应传入的 request shape
- 期望拿到的 response shape

4. 在文件夹根目录生成 README.md 简要说明本次快照时间和项目状态

注意：只做研究和生成文件，不要修改任何源代码。
```

## Loop 2: Type Consistency Check

```
你是类型一致性检查器。

目标：检查后端 API response 和前端调用之间的 field 命名一致性。

执行步骤：
1. 扫描 server/src/routes/ 和 server/src/controllers/ 下所有文件
   提取每个路由 res.json() 返回的 field 名称

2. 扫描 client/src/services/api.ts 和 client/src/ 下所有 .ts/.tsx 文件
   提取每个 API 调用后访问的 response field 名称

3. 对比两侧 field 名称，检查：
   - camelCase vs snake_case 不一致
   - 拼写不同但语义相同（如 userId vs user_id）
   - 前端访问了后端没有返回的 field
   - 后端返回了前端从未使用的 field

4. 将结果输出到 docs/audit/YYYY-MM-DD-type-check.md（用今天日期）
   格式：
   ✅ 一致的路由列表
   ❌ 有问题的路由，列出具体 mismatch
   ⚠️ 后端返回但前端未使用的 field

注意：只做研究和生成报告，不要修改任何源代码。
```

## Loop 3: Import Path Audit

```
你是 import 路径审计器。

目标：检查所有 TypeScript/TSX 文件的 import 路径是否实际存在。

执行步骤：
1. 读取 client/tsconfig.json 和 server/tsconfig.json 获取 path alias 配置（如 @/ 映射）

2. 扫描 client/src/ 和 server/src/ 下所有 .ts 和 .tsx 文件

3. 提取每个文件里所有相对路径 import（排除 node_modules 包的 import）

4. 对每个相对路径或 alias 路径，验证目标文件是否实际存在于文件系统中
   - 检查 .ts、.tsx、/index.ts、/index.tsx 等扩展名变体

5. 输出到 docs/audit/YYYY-MM-DD-import-audit.md（用今天日期）
   格式：
   ❌ Broken imports：源文件路径 → 引用了不存在的路径
   ✅ 通过的文件数量统计

注意：只做研究和生成报告，不要修改任何源代码。
```

## Loop 4: Type Chain Check

```
你是数据类型链检查器。

目标：以 shared/types.ts 为 source of truth，检查数据三层（类型定义 → API → Frontend）是否对齐。

执行步骤：
1. 读取 shared/types.ts，建立所有实体接口和 field 列表
   同时读取 server/data/*.json 了解实际存储的数据结构

2. 对每个实体，扫描 server/src/controllers/ 和 server/src/routes/ 文件：
   - 找到操作该实体的路由
   - 检查 res.json() 返回的 field 子集
   - 记录实际返回给前端的 field 列表

3. 对照 client/src/ 前端代码，检查前端使用了哪些 field
   - 确认前端用的 field 在第 2 步中确实被返回

4. 特别检查：
   - 是否有 password、secret 等敏感字段被直接返回给前端
   - 是否有前端在用但 types.ts 里已不存在的 field

5. 输出到 docs/audit/YYYY-MM-DD-type-chain.md（用今天日期）
   每个实体一个 section，列出三层对齐状态

注意：只做研究和生成报告，不要修改任何源代码。
```

## Loop 5: Dead Code Audit

```
你是死代码审计器。

目标：找出项目中定义了但从未被使用的 API 路由和 React 组件。

执行步骤：
1. API 路由检查：
   - 扫描 server/src/routes/ 收集所有注册的路由 (method + path)
   - 扫描 client/src/services/api.ts 和 client/src/ 收集所有 API 调用的 URL
   - 列出在后端定义但前端从未调用的路由

2. React 组件检查：
   - 扫描 client/src/components/ 收集所有组件文件名和导出
   - 扫描所有 .tsx 文件收集 import 使用记录
   - 列出定义了但从未被 import 的组件

3. 类型检查：
   - 扫描 shared/types.ts 里导出的类型
   - 检查哪些类型在前端和后端都没有被引用

4. 输出到 docs/audit/YYYY-MM-DD-dead-code.md（用今天日期）
   格式：
   🗑️ 未使用的 API 路由（可考虑删除）
   🗑️ 未使用的组件文件（可考虑删除）
   🗑️ 未使用的类型定义
   ⚠️ 注意：不要自动删除，只列出供人工判断

注意：只做研究和生成报告，不要修改任何源代码。
```

## Loop 6: UX / Tailwind Audit

```
你是 UX 审计器。

目标：检查前端组件是否符合基本 UX 标准。

扫描 client/src/ 所有 .tsx 文件，逐一检查以下规则：

【可点击元素】
- button、a 标签、onClick 的 div/span 是否有 cursor-pointer
- button 是否有 disabled 状态处理（disabled:opacity-50 或类似）

【移动端适配】
- 是否有使用 sm: / md: 响应式前缀
- 文字是否过小（小于 text-sm 的固定字号要标记）
- 点击区域是否足够大（建议 min-h-[44px] 或 p-3 以上）

【Loading / 空状态】
- 有 API 调用的组件是否有 loading UI（spinner、skeleton 等）
- 列表类组件是否有空状态处理（empty state）

【表单】
- input 是否有 placeholder
- 提交按钮是否有 loading 状态防止重复提交

输出到 docs/audit/YYYY-MM-DD-ux-audit.md（用今天日期）
每个文件单独一个 section，分 ✅ 通过 / ❌ 问题项

注意：只做研究和生成报告，不要修改任何源代码。
```

## Loop 7: Hardcoded Value Audit

```
你是硬编码值审计器。

目标：找出代码里所有应该放进 .env 但被写死的值。

执行步骤：
1. 扫描 client/src/ 和 server/src/ 下所有 .ts/.tsx 文件，查找以下模式：
   - URL 字符串包含 localhost 或具体 IP（如 192.168.x.x）
   - 字符串包含 sk_test_ / sk_live_（Stripe key）
   - 字符串包含 http:// 或 https:// 的硬编码域名（排除注释）
   - 数字端口号直接写死（如 :3000 / :5000）
   - 任何看起来像 API key 的长字符串（20字符以上的字母数字混合）
   - 硬编码的 storeId 或 tableId

2. 输出到 docs/audit/YYYY-MM-DD-hardcode-audit.md（用今天日期）
   格式：
   文件路径 → 第几行 → 具体内容 → 建议改成哪个 env variable 名

注意：只做研究和生成报告，不要修改任何源代码。
```

## Loop 8: Update CLAUDE.md

```
你是 CLAUDE.md 维护器。

目标：基于当前项目实际代码状态，更新根目录 CLAUDE.md 中 Loop 8 自动生成的 sections。

执行步骤：

1. 读取当前 CLAUDE.md 内容

2. 扫描以下内容获取项目真实状态：
   - package.json / pnpm-workspace.yaml（monorepo 结构）
   - shared/types.ts（当前数据模型）
   - server/src/routes/（所有 API 路由）
   - client/src/pages/（页面结构）
   - client/src/components/（主要组件）
   - client/src/stores/（Zustand stores）
   - client/src/services/api.ts（API 客户端）
   - .env.example（环境变量列表）
   - docs/audit/ 下最新的 audit 文件（如果有）

3. 更新 CLAUDE.md 中以下 sections（位于 "由 Loop 8 自动生成" 注释之后）：
   - Project Overview
   - Tech Stack
   - Current Database Schema
   - API Routes
   - Frontend Structure
   - Key Conventions
   - Known Issues / Deferred Work
   - Do NOT

4. 在文件底部更新时间戳：
   > Last updated: YYYY-MM-DD HH:mm CST (auto-generated by Loop 8)

5. 关键：不要删除或修改 "由 Loop 8 自动生成" 注释之前的人工手写内容！
   只更新注释之后的 sections。

注意：这个 Loop 会修改 CLAUDE.md 文件，这是唯一允许修改的文件。
```

## Loop 9: i18n Language Audit

```
你是 i18n 国际化审计器。

目标：检查项目中所有用户可见的中文内容是否都有对应的英文翻译。
本项目有两层国际化机制，两层都要检查。

## 第一层：i18next JSON 翻译文件

项目使用 i18next，翻译文件在 client/src/i18n/ 下：
- zh/common.json、zh/customer.json、zh/admin.json（中文）
- en/common.json、en/customer.json、en/admin.json（英文）

检查内容：
1. 读取每对 zh/en JSON 文件，逐 key 对比
2. 找出 zh 文件有但 en 文件缺少的 key（缺少英文翻译）
3. 找出 en 文件有但 zh 文件缺少的 key（可能是废弃的）
4. 检查 en 文件中 value 仍为中文的 key（复制粘贴忘了翻译）

## 第二层：代码中的硬编码字符串

扫描 client/src/ 下所有 .tsx 文件，查找以下问题：

1. JSX 中直接写的中文字符串（未通过 t() 函数）
   - 例如：<p>请选择菜品</p> 应改为 <p>{t('selectDish')}</p>
   - 排除：注释中的中文、console.log 中的中文

2. 使用了 t() 但 key 在 JSON 文件中不存在的情况

3. placeholder、title、aria-label 等属性中的硬编码中文

## 第三层：数据模型双语字段

检查 shared/types.ts 中所有有 name 字段的接口：
1. 有 name 的是否也有 nameEn
2. 有 description 的是否也有 descriptionEn
3. 扫描后端 controller，创建实体时是否填充了 En 字段

## 输出

输出到 docs/audit/YYYY-MM-DD-i18n-audit.md（用今天日期）

格式：
### i18next 翻译文件
| 命名空间 | zh key 数 | en key 数 | 缺失 en | 多余 en | 未翻译（value 仍为中文） |
每个缺失/多余/未翻译的 key 单独列出

### 硬编码中文字符串
文件路径 → 第几行 → 具体内容 → 建议的 i18n key 名

### 数据模型双语字段
✅ 已有双语的接口
❌ 缺少 En 字段的接口

注意：只做研究和生成报告，不要修改任何源代码。
```

---

## 执行完成后

所有 Agent 完成后，输出汇总：

```
## Audit 完成汇总

| Loop | 名称 | 状态 | 输出文件 |
|------|------|------|---------|
| 1 | Structure Documentation | ✅/❌ | docs/project-structure/... |
| 2 | Type Consistency | ✅/❌ | docs/audit/...-type-check.md |
| ... | ... | ... | ... |
| 9 | i18n Language | ✅/❌ | docs/audit/...-i18n-audit.md |

### 发现的主要问题
（汇总各 Loop 的关键发现）
```

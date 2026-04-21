# Phase 5 State Snapshot

> **读者**: 下一个 Opus chat instance
> **性质**: **覆盖式**文档,每对话启动前由 Ian(或上轮 Opus 收尾)全文重写,**不累积历史时点**
> **使用方式**: 每对话启动必读附件之一。提供"当前项目实时状态"的唯一 source of truth
> **配套文件**:
> - `phase-5-governance-digest.md` — 治理体系静态参考(累积)
> - `phase-5-fabrication-archive.md` — Fabrication 历史(累积)
>
> **覆盖机制要点**: 本文件最新版即最终版。任何"当前状态"问题读本文件;读 Archive 可查历史 fabrication;读 Digest 查规则。**Mode C stale handoff 类 fabrication**(Archive #14)的防御就来自覆盖式机制——文字写于特定时点,但本文件永远是 live。

---

## 1. 当前时点

- **最后更新**: 2026-04-20(v3 对话收尾后整合产出,本文件首版)
- **最后 commit on main**: `f06f333d`(Task 9a impl)
- **下一对话目标**: Phase B Task 9b(seed-production 或类似)+ Task 10(docker-compose.yml + SYSTEM_DATABASE_URL)

---

## 2. Phase 进度表

| Phase | 内容 | Plan | 实施 |
|---|---|---|---|
| A | ~~备份~~ SKIPPED(Ian calibration 2026-04-19) | N/A | N/A |
| B | 基础设施(schema + migration + seed + docker) | ✅ 完整 | 🟢 **8/10**(Task 2/3/4/5/6/7/8/9a ✅,剩 9b + 10) |
| C | 测试 DB | ✅ 完整 | ⏸️ 未启动 |
| D | Repository(11 个语义化 repo) | ✅ 完整 | ⏸️ 未启动 |
| E | 外围域(3 agent) | ✅ 完整 | ⏸️ 未启动 |
| F | Platform Admin | ✅ 完整 | ⏸️ 未启动 |
| G | 核心业务链 + SOP | ✅ 5/5 + SOP | ⏸️ 未启动 |
| H | 集成测试 | 🟡 1/3(Task 43 ✅,44/45 待) | ⏸️ 未启动 |
| I | 清理 | ⏸️ 批 2 待写 | ⏸️ 未启动 |
| J | 部署 | ⏸️ 批 2 待写 | ⏸️ 未启动 |
| K | e2e 验收 | ⏸️ 批 2 待写 | ⏸️ 未启动 |

**Phase 5 整体实施约 ~10%**(Phase B 8/10 = 80% × Phase B 占 ~15% = ~12%)。

---

## 3. 最近 commit 链(按时间倒序,~最近 20 个)

### v3 对话(2026-04-20,6 commit)

| SHA | 性质 | 内容 |
|---|---|---|
| `f06f333d` | feat | Task 9a impl(seed.ts + seed-data/store.ts + package.json prisma.seed;3 次规则 8 暂停全 resolved: @types/bcryptjs / Docker daemon / prisma generate gap) |
| `1187b50f` | plan | Task 9a Patch 6 γ(migration drift: `20260417000001_init` → `extend_schema` + γ notation 兼容 pre-applied migrations scenarios) |
| `d9a21d66` | work-log | Task 9a pre-grep fact base(3 主 grep + 2 附带 grep;Mode C 桶 2/4 0 match;schema migration 5 match;migration 命名 drift 新发现) |
| `820389a9` | feat | Task 8 impl(tenant-aware.ts 136 行 + prisma-client.ts append G7-4 helper,tsc 0 NEW errors + 0 cascade) |
| `b8ef8fd4` | plan | Task 8 Patch 5(Express 5 types 兼容;declare global namespace Express 替 declare module 'express-serve-static-core';req.params narrow guard 替 `as string` cast;hook 显式类型) |
| `9531f364` | plan | Task 8 β refinement supplement(Patch 0-4: signature 一致性 + Step 1.5 G7-4 helper + tsc/commit 模式 + 单元测试 defer) |

### v2 对话(2026-04-20,8 commit)

| SHA | 性质 | 内容 |
|---|---|---|
| `60fdcfe0` | feat | Task 7 shared/types.ts impl(OrderStatus 6→5 + RoleDefinition 切换 + DraftOrder/SubmittedOrder 判别联合) |
| `39d297a7` | plan | Task 7 二次 β refinement(Order.tableNameEn / Table.status / Staff.role blast) |
| `49a53a3a` | feat | Task 6 prisma-client.ts impl(96 行 TS) |
| `fff4f27f` | plan | Task 6 β refinement(3 注释级 GAP) |
| `ad27caba` | feat | Task 5 seed_platform_admin(18 行 SQL 极简) |
| `2effedb5` | feat | Task 4 RLS migration impl(β type cast fix) |
| `bb1428ac` | plan | Task 4 L1 verify work-log |
| `75fd9084` | feat | Task 2 impl + Mode C δ 桶 1 RESOLVED(16 MVP 必需字段扩展) |

### 更早(v1 + Phase B 启动期)

| SHA | 性质 | 内容 |
|---|---|---|
| `9153f076` | plan | Phase B Task 2/3/9 plan partial(C1/C2/C3/C4 confirmation,Mode C pending) |
| `4f6517e1` | work-log | Phase B 第一轮前置 grep |
| `4f63f5a4` | docs | Phase G Task 41 atomic commit SOP |
| `1ac058b0` | plan | Phase H Task 43 映射表 + D51 三类判定 + D64-D66 候选 |
| `6ab0a4ae` | plan | Phase H Task 43 initial |
| `231dbe4e` | docs | Phase A-1 SKIP 落地 |
| `130736e8` | plan | 规则 7.2 升格(任务必要性需 Ian confirm)|
| `49be9dd5` | plan | 更早期 Phase B Task 2 partial |

---

## 4. Phase B 剩余 task(实施序)

| Task | 内容 | 状态 | 启动前置 |
|---|---|---|---|
| 9b | seed 后置 / production seed | 待 | docker container Up(`postgres-seed-test`)+ DATABASE_URL re-export |
| 10 | docker-compose.yml + SYSTEM_DATABASE_URL 定义 | 待 | **必须定义 SYSTEM_DATABASE_URL**(Task 6 prisma-client.ts cross-ref 已加);`stores.tipBase @map` 顺手项可在此处理(touch schema.prisma 概率高) |

### Task 9b 启动 cheat sheet

1. **容器检查**: `docker ps | grep postgres-seed-test` —— v3 对话末端容器保留未关
2. **DATABASE_URL re-export**: Task 9a Stage 6 已导,新 shell/新对话需 re-export
3. **Prisma Client types**: v3 对话末已 `pnpm prisma generate`,tipBase 等字段 Client 端可用
4. **seed.ts.pre-phase5 backup**: untracked,Phase I `_archive/` 归档(per Task 9a plan line 1631)
5. **CC 启动消息附件**: RESUME + phase-b-infrastructure.md(Task 9b 段)+ Task 9a 收尾 work-log(若有)+ 启动消息本身。**不含本 Snapshot / Digest / Archive**

---

## 5. Mode C 状态(δ 分桶 matrix,live)

**决议**: Ian 2026-04-20 前在对话中选 δ(分类处理),按桶不同策略。Task 9a pre-grep 已 verify 桶 2/4 在 Task 9a scope 0 match。

| 桶 | 字段数 | 内容 | 状态 |
|---|---|---|---|
| 1 | 16 | MVP 必需字段(Table rename+5 / Store+5 / Order+2 / Coupon+1 / MenuItem+1 / Category+1) | ✅ **RESOLVED** in `75fd9084`(Task 2 impl scope 扩展) |
| 2 | 6 | Floor plan(`x / y / width / height / shape / zone`) | 🔵 **delegated Phase I/J** |
| 3 | 3 | Deprecated(`Table.currentBillId / Table.currentOrderId / Table.paymentMode`) | ⚫ **不补**(Store 级 paymentMode 已够) |
| 4 | 6 | 次要扩展(`Waitlist.estimatedWait/notifiedAt / Printer.address / MenuItem.dietary/isRecommended/quickTags / Category.hideQuickTags`) | 🔵 **delegated Phase H/I** |

**⚠️ 防 stale handoff**: v1 §9.3 文字写于 `49be9dd5`("Mode C pending"),**那是过时描述**。本表 live。下 Opus 不要凭"v1 文字"判断 Mode C 状态,读本 Snapshot。

---

## 6. D 候选累积清单(Phase H Task 45 升格队列)

**累积 16 项**,按来源分段:

### v1 既有(7 项)

- **D67** 反向 drift 处理(types.ts > JSON)
- **D68** Order snapshot 哲学
- **D69** maxTables 留 Store 级
- **D70** Coupon schema 完整补入
- **D71** Seed-as-SSOT(label 缺失但 seed.ts 代码本身就是 SSOT 行为)
- **D72** OrderStatus 派生状态前端展示
- **D73** JWT 不向后兼容部署纪律

### v2 新增(4 项)

- **D74** Plan 行数预算 + 实时预警 + **双向校准**(×0.8 简单 / ×1.25 复杂,live 数据 7+ 数据点)
- **D75** 数据 guard(live 应用 7+ task 0 fail)
- **D76** Commit 后强制 push + verify origin SHA(live 应用 7 task 0 fail,CC memory 已落)
- **D77** Task 4 注释 E 事实修正 + β 决议理由更新

### v3 新增(5 项)

- **D78** Patch spec range mandatory grep-verify terminus
- **D79** Plan-as-code dryrun 前置(新依赖/framework module/type 系统 feature 引入时)
- **D80** @types/express v5 vs express v4 版本 skew
- **D81** Seed hardcode vs source SSOT drift 防御模式(α/β/γ)
- **D82** Schema-write tasks must enforce `prisma generate` step

**全文**: 见 `phase-5-governance-digest.md` §6。

**D74 精细化最新**(v3 延伸):

- 原桶: 简单 ×0.8 / 复杂 ×1.25(v2 建立,v3 2/2 验证)
- **新桶 1**: Patch spec w/ inline code heredoc **×1.07**(v3 3 数据点 +7%/+7%/+2.7%)
- **新桶 2**(候选,不足升格): Work-log w/ grep 结果 embed **×1.5-1.8**(v3 1 数据点 +47-78%)

---

## 7. Pending drifts(本对话未修,转下对话或 Phase H Task 45)

### 7.1 Line 17 Phase B batch summary 表 Task 3 subject drift

- **位置**: `phase-b-infrastructure.md` line 17
- **当前**: `| 3 | 生成 20260417000001_init/migration.sql |`
- **正确**: `| 3 | 生成 20260417000001_extend_schema/migration.sql |`(Task 3 β 增量路径,实际 migration 命名)
- **性质**: Task 3 subject drift,与 Patch 6 γ(Task 9a Step 4 literal)根因相同但 scope 不同
- **处理**: 后续 Patch 7(Task 3 subject reconcile 单独起)或 Phase H Task 45 spec reconcile 批处理
- **外化锚**: `1187b50f` commit body 已 mention

### 7.2 `seed.ts.pre-phase5` backup untracked

- **位置**: `server/prisma/seed.ts.pre-phase5`(64 行,Task 9a Stage 2 备份产出)
- **状态**: untracked,不在 `f06f333d` commit scope
- **处理**: Phase I `_archive/` 归档 per Task 9a plan line 1631
- **外化锚**: `f06f333d` commit body 已 mention

### 7.3 Task 6 plan 缺 `pnpm prisma generate` step(D82 触发事件)

- **位置**: `phase-b-infrastructure.md` Task 6 段
- **缺失**: 无 schema→Client types 同步 step,导致 Task 9a Stage 4c runtime fail(Fabrication #19)
- **性质**: plan design omission,不是当前可修复的 fabrication
- **本对话决议**: 不起 Patch 8(scope 限制),D82 候选登记入 Digest
- **处理**: Phase H Task 45 reconcile 时 apply 到 Task 6 plan(或 Task 2/3 plan,Ian + 下 Opus 判)
- **外化锚**: `f06f333d` commit body 已 mention

### 7.4 `stores.tipBase` 无 `@map("tip_base")`(顺手项)

- **位置**: `schema.prisma` stores.tipBase 字段
- **性质**: 与其他 snake_case 列名不一致
- **处理**: Task 8/10/H/I 任何会 touch schema.prisma 的 task 顺手补
- **当前**: Task 4-9a 都不 touch,持续传递到 Task 10

### 7.5 Task 8 注释 E 事实陈述错误(D77 触发事件)

- **位置**: `2effedb5` migration.sql 注释 E("storeId is TEXT ... cuid format strings, NOT UUID-format")
- **事实**: schema.prisma 用 `@default(uuid())`,实际 UUID v4
- **对 β 决议无影响**: 双侧 ::text cast 仍对,理由需修正
- **处理**: Phase H Task 45 spec reconcile
- **不能 amend**: 已 push

---

## 8. 环境状态

| 项 | 状态 | 备注 |
|---|---|---|
| `postgres-seed-test` container | Up(v3 末端保留) | Task 9b 可直接 consume |
| Prisma Client types | 已 regenerate(v3 Stage 4c) | tipBase / taxRate / serviceFeeRate 等可用 |
| `server/prisma/seed.ts.pre-phase5` | untracked | Phase I `_archive/` 归档 |
| @types/bcryptjs | 不需要(bcryptjs v3+ bundled types) | Task 9a Stage 0.3 check 已删除 |
| Docker Desktop | Running | v3 Stage 4a 重启过 |
| tsc status | Total 102 errors,baseline 自 Task 7 起 unchanged | Task 8 0 NEW / 0 cascade |

---

## 9. 下一对话第一件事(Task 9b 启动)

1. **读**: 本 Snapshot + Governance Digest + `phase-b-infrastructure.md`(Task 9b 段)+ Task 9a 收尾 work-log(若有)
2. **Grep verify**: `git log -10 --format="%h %s"` 确认 commit 链对齐本 §3 记录
3. **L1 verify 判断**: Task 9b 复杂度未知,需读 plan 后决定 L1 / L2
4. **CC 启动消息**: 按 §4 cheat sheet 准备附件
5. **规则应用提醒**:
   - **Opus Spec Pre-Flight Checklist**(Digest §7): 所有"期望/应该/不存在/成对"断言需 grep fact base
   - **D74 双向校准**: 预估行数时主动分桶应用系数
   - **D82 候选**: 若 Task 9b 涉及 schema write,必含 `pnpm prisma generate` step

**不启动原则**: 不直接实施 Task 9b,先 L1/L2 verify plan + Ian 明批。

---

## 10. 当前修订轨迹(本 Snapshot 版本内)

- **2026-04-20 首版**: 由 v3 对话收尾后整合产出。覆盖 Task 8 impl + Task 9a 完整 + Mode C δ 桶 1 RESOLVED + 16 D 候选 + 5 Pending drifts。

---

*Phase 5 State Snapshot · 覆盖式,每对话更新 · 首版 2026-04-20 · 与 Governance Digest + Fabrication Archive 配套*

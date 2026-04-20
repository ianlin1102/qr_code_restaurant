# 2026-04-20 Phase B Task 9a 前置 grep (D 路径 Stage 1)

Created: Task 8 impl (`820389a9`) land 后,Task 9a 启动前。
性质: 5-grep fact base 输出,供 Opus L2 verify 消费。Task 9a plan 本身不修改。

锚:
- Task 8 impl commit: `820389a9`
- Phase B 进度: 7/10 (Task 2/3/4/5/6/7/8)
- Mode C δ 桶 1 (16 MVP 必需字段) 已 RESOLVED in `75fd9084`
- Task 9a plan 段: `phase-b-infrastructure.md` line 1727-1956 (231 行)
- Task 9a subject: "seed.ts — platform admin + demo store + ModuleLicense"
- 性质校准 (Ian/Opus 本对话共识): Task 9a 非"极简"(vs Task 5 18 行 SQL),是 231 行 plan + seed.ts Prisma Client API,中等复杂度,含 D71 Seed-as-SSOT 设计哲学 reference

---

## 1. Grep 目的 (3 主 + 2 附带)

| 类 | 内容 | 判定规则 |
|---|---|---|
| 桶 2 Floor plan | Task 9a 是否引用 Mode C 桶 2 字段 (x/y/width/height/shape/zone) | 0 match = 无阻塞 / >0 match = Task 9a 在 Phase I/J delegate 前就引用该字段,需 Opus L2 判 |
| 桶 4 次要扩展 | Task 9a 是否引用 Mode C 桶 4 字段 (dietary/isRecommended/quickTags/hideQuickTags/estimatedWait/notifiedAt/Printer.address) | 同上,Phase H/I delegate 前引用需 Opus L2 判 |
| schema migration | Task 9a 是否含 migration / schema.prisma / seed 命令 reference | 供 Opus L2 验 seed 执行时机是否跟 Task 3/4/5 migration 一致 |
| assertUuid (附带) | Task 9a seed 是否用 crypto.randomUUID / assertUuid | 供 Phase D Task 8 fixture 警告对齐 verify |
| D71 Seed-as-SSOT (附带) | Task 9a plan 是否声明 Seed-as-SSOT 哲学 | 本对话 Ian 确认 D71 涉及 Task 9a 设计哲学 |

---

## 2. Grep 结果

### 2.1 桶 2 Floor plan 6 字段 (x / y / width / height / shape / zone)

**floor plan keyword**:
```
(0 match)
```

**Table.x / Table.y / x: / y:** (粗 grep, 高误匹配风险):
```
(0 match)
```

**width / height / shape / zone**:
```
(0 match)
```

**结论**: 桶 2 字段 **0 reference in Task 9a plan**. 无阻塞.

---

### 2.2 桶 4 次要扩展 6 字段 + rename

**Waitlist rename: estimatedWait / notifiedAt**:
```
(0 match)
```

**Printer.address rename (→ host+port)**:
```
(0 match)
```

**MenuItem 次要扩展: dietary / isRecommended / quickTags**:
```
(0 match)
```

**Category.hideQuickTags**:
```
(0 match)
```

**结论**: 桶 4 字段 **0 reference in Task 9a plan**. 无阻塞.

---

### 2.3 schema migration reference

**migration path**:
```
60:  // The admin row is inserted by migration 20260417000003_seed_platform_admin.
65:    // Upsert (not update) — if migration 20260417000003 rolled back or was
171:Applying migration `20260417000001_init`
172:Applying migration `20260417000002_rls_and_roles`
173:Applying migration `20260417000003_seed_platform_admin`
```

**schema.prisma**:
```
(0 match)
```

**prisma db seed / run seed**:
```
166:pnpm prisma db seed
```

**结论**:
- Task 9a plan 引用 migration `20260417000003_seed_platform_admin` (Task 5 产物),作为前置依赖
- Task 9a plan 引用 `pnpm prisma db seed` 执行命令 (line 166)
- Task 9a plan 不引用 `schema.prisma` (0 match) — 预期 Task 9a seed.ts 直接用 Prisma Client generated types,不读 schema
- **⚠️ Plan-code 命名 drift**: line 171 plan 写 `Applying migration 20260417000001_init` — 实际 Task 3 命名为 `20260417000001_extend_schema` (land in commit `c831d3b8`). Plan 预期输出与实际 migration 名称不一致,供 Opus L2 判 (是否更新 plan, 或仅是 literal output 示例)

---

### 2.4 assertUuid / crypto.randomUUID (附带)

```
(0 match)
```

**结论**: Task 9a plan **不显式引用** `crypto.randomUUID` / `assertUuid`. 可能原因:
- seed.ts 使用 Prisma schema `@default(uuid())` 让 DB 层生成 UUID (非手工 crypto.randomUUID)
- 或 seed.ts 使用已定义 demo store ID / admin ID 常量 (非动态生成)
- Opus L2 可 verify 是哪种,以确认 Phase D Task 8 fixture 警告 (assertUuid strict UUID v4 regex) 对 Task 9a 不会 false-reject

---

### 2.5 D71 Seed-as-SSOT 哲学 (附带)

```
(0 match)
```

**结论**: Task 9a plan **不显式 mention** "D71" / "Seed-as-SSOT" / "SSOT" 关键词. 设计哲学可能 implicit (通过 seed.ts 代码结构体现), 但无 plan-level 声明. 若 Ian 判 D71 需要 Task 9a plan 显式声明,需 β refinement.

---

## 3. Opus L2 verify 交接要点

本 work-log 仅 fact base 输出,Opus 基于此做 L2 verify,可能维度:

| 维度 | 内容 | 本 grep 提示 |
|---|---|---|
| 1 | 桶 2/4 字段 reference | **全 0 match**, 无阻塞 |
| 2 | schema.prisma reference | **0 match**, Task 9a seed.ts 不重写 schema,走 Prisma Client 生成类型 |
| 3 | seed 执行时机 | `pnpm prisma db seed` @ line 166,migration deploy 后 (line 171-173) |
| 4 | assertUuid 兼容 | **0 match**,可能 seed 走 Prisma `@default(uuid())` 或常量 ID,Opus L2 可 verify |
| 5 | D71 Seed-as-SSOT 哲学一致性 | **0 match**,隐式或缺声明,Opus L2 可判是否需 β refinement 添加 |
| 6 (可选) | ModuleLicense seed 数据形态 | grep 未覆盖,L2 直接读 plan 段确认 |
| 7 (新发现) | **Plan-code migration 命名 drift**: line 171 "20260417000001_init" vs Task 3 实际 "20260417000001_extend_schema" | 供 Opus L2 判 |

**不含 D 决议候选升格** — L2 verify 时 Opus 若发现新议题再登记.

---

**End of pre-grep fact base. Task 9a plan 未修改, Opus L2 verify 后再决定是否 β refinement.**

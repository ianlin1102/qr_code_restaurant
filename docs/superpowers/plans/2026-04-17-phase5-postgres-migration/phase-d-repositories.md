# Phase 5 Plan — Phase D：Stage 2 Repository 层

> **如何使用本文件**
>
> - 全局规则见 [`00-index.md`](./00-index.md#全局规则所有-task-遵守)
> - 本 phase 前置：[`phase-c-test-db.md`](./phase-c-test-db.md) 全部完成
> - 本 phase 输出：10 个 repository 文件 + `stores.ts` choke point 重写；业务代码层这之后才开始切换到 Prisma（Phase E 开始）
> - 规则 3 严格适用：所有写操作 repo 方法的 `db` 参数必填，读操作默认 `prisma`
> - 下一个 phase：Phase E（待批 2 写出）

## Task 列表（待填详情）

| Task | 内容 |
|---|---|
| 16 | 重写 `repositories/stores.ts`（choke point —— 所有业务代码的 import 汇聚点） |
| 17 | 写 `repositories/orders.ts`（B2 核心：findSubmitted / findDraft / upsertDraft / submitDraft / createDraftOrder） |
| 18 | 写 `repositories/sessions.ts` |
| 19 | 写 `repositories/payments.ts` |
| 20 | 写 `repositories/split-bills.ts` |
| 21 | 写 `repositories/menu.ts` |
| 22 | 写 `repositories/staff.ts` |
| 23 | 写 `repositories/roles.ts` + `resolveLicensedPermissions` helper |
| 24 | 写 `repositories/coupons.ts` |
| 25 | 写 `repositories/waitlist.ts` |
| 26 | 写 `repositories/platform-admin.ts` |

---

## 状态：待填

**段 2 段 2** 展开 Phase D 的详细 task（16-26）。

写作前需要读的依赖文件：
- `shared/types.ts`（Phase B Task 7 产出 —— 判别联合 `DraftOrder` / `SubmittedOrder`）
- `server/src/repositories/prisma-client.ts`（Phase B Task 6 产出 —— `withTenantContext` + `Db` 类型 + `set_config` 严格模式）
- `server/src/__tests__/fixtures.ts`（Phase C Task 13 产出 —— 测试 fixture 示范了事务里如何写入）
- `server/prisma/schema.prisma`（Phase B Task 2 产出 —— 所有 Prisma model 字段 + 关系）

写作时要落地的设计决策（来自 spec + plan 阶段补强）：

- **D23 / D24** 类型判别 + Repository 默认排除 draft：`orderRepo.findSubmitted` 默认、`orderRepo.findDraft` 显式
- **D30** 乐观锁在 `order.version`：`submitDraft` 用 `WHERE version=? AND status='draft'` 原子更新
- **D52 / 规则 3** 写操作 `db: Db` 必填，读操作 `db: Db = prisma` 默认
- **D14** Platform admin repo 独立（不和 staff repo 混）
- **D16** `roles.ts` 包含 `resolveLicensedPermissions(storeId, db)` helper —— 读 ModuleLicense 展开成 permission 集合

---

_占位符 —— 段 2 段 2 填充具体 task 内容。_

# Phase G Handoff Work-Log

记录 Phase D 期间发现的、需要在 Phase E/F/G 执行阶段落地的具体实施任务。Phase G agent 开工时先读本文档。

---

## 1. `server/src/lib/legacy-itemkey.ts` — 实现任务（D56 薄兼容层）

**归属**：Phase G Task 34 之前的基础设施子任务（Agent E、Agent F、Agent G 任一都可做，实际独立无冲突）

**设计要点**（D56 精确定义：Controller 1cm 薄转换层）：

```ts
// server/src/lib/legacy-itemkey.ts
import type { Prisma } from '@prisma/client'

/**
 * Parse legacy "orderId:idx:qty" string into relational (orderItemId, quantity) pair.
 * Requires tx (read under tenant context).
 */
export async function parseItemKey(
  key: string,
  tx: Prisma.TransactionClient
): Promise<{ orderItemId: string; quantity: number }> {
  const parts = key.split(':')
  if (parts.length < 2) throw new Error(`Invalid itemKey: ${key}`)
  const orderId = parts[0]
  const position = parseInt(parts[1], 10)
  const quantity = parts.length >= 3 ? parseInt(parts[2], 10) : Infinity

  const item = await tx.orderItem.findFirst({
    where: { orderId, position },
  })
  if (!item) throw new Error(`No OrderItem found for ${orderId}:${position}`)
  return { orderItemId: item.id, quantity }
}

/**
 * Format (orderItemId, quantity) back to legacy "orderId:idx:qty" string.
 * Caller passes pre-loaded order.items to avoid extra DB hit.
 */
export function formatItemKey(
  orderItemId: string,
  quantity: number,
  orderItemsInOrder: { id: string; position: number; orderId: string }[]
): string {
  const item = orderItemsInOrder.find(i => i.id === orderItemId)
  if (!item) throw new Error(`formatItemKey: orderItemId ${orderItemId} not in provided items`)
  return `${item.orderId}:${item.position}:${quantity}`
}
```

**使用方**：
- Controller 层 Request 进来：`request.itemKeys: string[]` → `parseItemKey` 转 (orderItemId, quantity) 对，传给 repo
- Controller 层 Response 出去：repo 返回 `PaymentItem[]` → `formatItemKey` 转回字符串给前端

**前端契约不变**：前端依然发/收 `"orderId:idx:qty"` 字符串。

---

## 2. 5 处散落 `.split(':')` 废弃 checklist

Phase G 迁移时把下列 5 处代码统一替换为 `parseItemKey()` 调用（不再手动 `.split(':')` + 自行解析）：

| # | 文件 | 行号 | 当前逻辑 | 迁移后 |
|---|---|---|---|---|
| 1 | `server/src/controllers/session-settlement.ts` | 101 | 解析 `paidItemIds` 的 `orderId:idx:qty` | 从 `PaymentItem` 查 FK 对 |
| 2 | `server/src/lib/session-state.ts` | 121 | FIFO 归因生成 `${baseKey}:${qty}` | 直接创建 PaymentItem `(orderItemId, paidQuantity)` |
| 3 | `server/src/controllers/split-bill.service.ts` | 47 | 冲突检测解析 itemKey | SplitBillItem FK 关系 + 聚合查 paid_qty |
| 4 | `server/src/controllers/split-bill-summary.ts` | 64 | 计算 split subtotal 从 itemKey 解析 | JOIN SplitBillItem + OrderItem 直接聚合 |
| 5 | `server/src/settlement/rules.ts` | 57 | 规则检查解析 itemKey | 同上 |

**迁移后 `grep -rn "split(':')"` 在 server/src/controllers + server/src/lib + server/src/settlement 应返回 0**（仅 `legacy-itemkey.ts` 内部保留一处）。

---

## 3. `OPTIMISTIC_LOCK_CONFLICT` 错误码升级为 class

**现状**（Phase D Task 17 `orders.ts`）：
```ts
const err = new Error('Draft order version mismatch...')
;(err as any).code = 'OPTIMISTIC_LOCK_CONFLICT'
throw err
```

**Phase G 实施时**：在 `server/src/lib/errors.ts`（或类似位置）定义：

```ts
export class OptimisticLockError extends Error {
  readonly code = 'OPTIMISTIC_LOCK_CONFLICT' as const
  constructor(message: string) {
    super(message)
    this.name = 'OptimisticLockError'
  }
}
```

`orders.ts` / `sessions.ts` / 其他乐观锁位置全部改用 `throw new OptimisticLockError(...)`。Route 层 `catch (err) { if (err instanceof OptimisticLockError) return 409 }`——类型安全，不再用 `(err as any).code`。

**grep 清单**：实施时 `grep -rn "OPTIMISTIC_LOCK_CONFLICT" server/src` 应只在 `errors.ts` 定义和 route 层 `instanceof` 检查，repo 层不直接用字符串。

---

## 4. Phase D → Phase G 其他 handoff 条目

（Phase D 后续 task 完成时可能追加更多条目；此文档持续更新到 Phase G 开工为止）

- [ ] Client OrderStatus switch sites（`2026-04-17-phase5-client-orderstatus-todos.md`）→ Phase G Task 34
- [ ] Phase C `tenant-isolation.test.ts` Case 2 修正（真实 table setup 让 RLS/WITH CHECK 真正失败）→ Phase D 末尾或 Phase G 开头

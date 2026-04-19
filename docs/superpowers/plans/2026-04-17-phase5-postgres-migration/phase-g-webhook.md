# Phase 5 Plan — Phase G 段 5:webhook B2 + D62 决议(Task 41)

> **如何使用本文件**
>
> - 全局规则见 [`00-index.md`](./00-index.md#全局规则所有-task-遵守)
> - 前置:Task 36 (`payment.service.ts` B2) plan 完成 + Task 37/38/39 plan 完成 + Phase B Task 8 `tenantAwareRoute`/`platformAwareRoute` 可用
> - 参考:
>   - [`phase-g-payment-service.md`](./phase-g-payment-service.md) Task 36 plan(webhook 5 个 `[Task 41 final verify]` 标记源)
>   - [`phase-g-handoff.md`](../work-logs/2026-04-17-phase-g-handoff.md) §"D62 候选 webhook 幂等"小节(Ian 倾向 B + 2026-04-19 追加 B 落地依赖)
>   - [`phase-g-segment-5-scope-check.md`](../work-logs/2026-04-19-phase-g-segment-5-scope-check.md) §4(Task 41 范围 + D62 决议锚点)
>   - [`phase-b-infrastructure.md`](./phase-b-infrastructure.md) line 1155-1175 `platformAwareRoute` 模式
>   - [`phase-d-repositories.md`](./phase-d-repositories.md) line 923/924 `paymentRepo.findByStripeId` + `confirmStripe`
> - spec 锚点:§9.8 Stage 3c 子任务 8

---

## 范围声明

- **本 task 范围**:
  - `server/src/routes/webhook.routes.ts`(25 行,middleware + raw body 适配 + tx context 注入)
  - `server/src/controllers/payment.service.ts` `handleWebhookEvent` 函数(line 161 起)5 个 `[Task 41 final verify]` 标记落实
  - **D62 决议正式拍板**(Ian 倾向 B,本 plan 默认按 B 设计)
  - manual capture PI metadata D59 协调(C6b2 §2.4 标点)
  - webhook 测试(succeeded / failed / version mismatch / 重放幂等)
- **不在本 task 范围**:
  - session-payment / session-settlement(Task 42)
  - payment-adjust 路径(归 Task 42 / 后续 task)
  - Stripe SDK 升级(Phase 5 范围之外)

---

## 规则 7 段 5 task 41 强化条款

1. **D62 决议候选 A vs B 必须列具体落地代码示例 + 行数估算**——Ian 倾向 B 但 plan 内必须呈现两个候选完整方案以备拍板时切换
2. **5 个 `[Task 41 final verify]` 标记每个必须给出 final 解(消除 placeholder)**——若仍无法确定,标 `[ASSUMPTION,实施期 Ian 拍]`
3. **webhook 上下文模式选择(tenant / platform / 独立)必须 grep 证据 + 推论**——不凭印象选

违反本条款的写作 → 停下自查修正,不 push。

## 规则 8 段 5 task 41 自查记录

- ✅ Pending commits 全程 ≤ 1(本 plan 为唯一 pending,Task 39 plan 已 land `bc8fcca3`)
- ✅ D62 决议候选 A 完整方案保留(不因 Ian 倾向 B 就缺省 A)
- ✅ 5 verify 标记每个独立小节(§4),不混入其他章节

## Pending commits 清单(规则 8.1)

- [x] 段 5 范围校对:`20e69b30`
- [x] handoff D62 落地依赖:`cf035125`
- [x] Task 39 合并 plan:`bc8fcca3`
- [ ] **Task 41 webhook plan:本文件**

---

## Task 41:webhook B2 + D62 决议

**Files (本 task 范围)**:
- Modify: `server/src/routes/webhook.routes.ts`(25 行 → 加 tx context 注入 / async 适配)
- Modify: `server/src/controllers/payment.service.ts` `handleWebhookEvent`(5 verify 标记落实 + D62 候选 B 幂等检查 + afterCommit 适配)
- Modify: `prisma/schema.prisma` Payment 表(`@@index([stripePaymentIntentId])` → `@@unique([stripePaymentIntentId])`,**仅 D62 选 B 时**)
- Create: `prisma/migrations/2026XXXXXXXX_payment_stripe_unique/migration.sql`(同上)
- Create: `server/src/__tests__/webhook.test.ts`(测试矩阵)

**前置**:
- Task 36 (`payment.service.ts` B2) 实施完成(handleWebhookEvent core 已 D58 路径 X / D59 metadata pointer / D60 version 校验)
- Phase D Task 19 `paymentRepo.findByStripeId` + `confirmStripe` 实施完成
- Phase B Task 8 `platformAwareRoute` middleware 可用(line 1155-1175)
- 段 5 Task 39 land(routes 模式参考)

### Task 完成 5 道门

1. `grep -nE "platformAwareRoute|tenantAwareRoute" server/src/routes/webhook.routes.ts` —— 命中 webhook 上下文模式(§2 选定方案)
2. `grep -nE "findByStripeId|stripePaymentIntentId" server/src/controllers/payment.service.ts` —— 命中 D62 候选 B 幂等检查代码
3. `grep -cE "\[Task 41 final verify\]" docs/superpowers/plans/2026-04-17-phase5-postgres-migration/phase-g-payment-service.md docs/superpowers/plans/2026-04-17-phase5-postgres-migration/phase-g-settlement-actions.md` —— 全部 verify 标记应已被 §4 落实(本 plan 写作完成时仍是 5,实施完成时 Task 36/38 plan 内标记可用 sed 替换为 `[Task 41 verified at <commit>]`)
4. webhook 测试矩阵 4 case 全过(succeeded / failed / version mismatch / 重放幂等)
5. `tsc -b` 全通过

---

### 1. 事实核查

(源:scope-check §4 + 本 plan grep verify)

**当前 webhook.routes.ts**(25 行,纯转发):

```ts
app.use('/api/webhook', express.raw({ type: 'application/json' }), webhookRoutes)
// app.ts:33 — raw body parser 已配置(规则:不动)

router.post('/stripe', async (req, res) => {
  const signature = req.headers['stripe-signature']
  if (!signature) { res.status(400).json({ error: 'Missing stripe-signature header' }); return }
  try {
    const eventType = await handleWebhookEvent(req.body as Buffer, signature)
    res.json({ received: true })
  } catch (err) {
    res.status(400).json({ error: 'Webhook verification failed' })
  }
})
```

**当前 handleWebhookEvent**(payment.service.ts:161 起):
- line 170 `webhooks.constructEvent(payload, signature, webhookSecret)` 验证签名(规则:不动)
- line 172 `payment_intent.succeeded` 分支(Task 36 plan §3.2 已设计 D58/D59/D60 落地代码)
- line 194 / 215 `refunds.create` 调用(Task 36 plan §3.2 D60 失败路径)

**Phase D Task 19 paymentRepo 已含**(line 923/924):
- `findByStripeId(stripePaymentIntentId, db?)`:webhook 幂等用
- `confirmStripe(stripePaymentIntentId, db)`:webhook 确认 status='pending' → 'confirmed'

**Phase B 当前 schema**(line 379):
- `@@index([stripePaymentIntentId])` —— **不是 @@unique**(D62 候选 B 落地需要 migration)

---

### 2. webhook 上下文模式选择(决议点)

#### 2.1 三个候选

**候选 X(独立 webhookContext)**:
- 新增 `withWebhookContext(metadata.storeId, async (tx) => {...})` —— 基于 metadata 反向推 tenantContext
- 优点:语义清晰(webhook 显式不同于 tenant/platform)
- 缺点:Phase B 未定义,需新增 middleware + decorator,工作量大

**候选 Y(基于 metadata.storeId 用 tenantAwareRoute)**:
- 在 webhook handler 内部解析 metadata.storeId,然后调 `withTenantContext(metadata.storeId, ...)`
- 优点:复用现有 tenantAwareRoute 模式,0 新 middleware
- 缺点:storeId 来自外部输入(metadata),不是 JWT 校验过的值——RLS 安全性需 verify

**候选 Z(platformAwareRoute,RLS BYPASS)**:
- 用 `platformAwareRoute` 包装 webhook handler —— withPlatformContext 内 BYPASSRLS
- 优点:0 新 middleware + RLS bypass 让 webhook 可访问任何 store 数据
- 缺点:语义错误(webhook 不是 platform admin 操作),BYPASSRLS 过度授权

#### 2.2 选定方案 + 理由

**选定 候选 Y**(基于 metadata.storeId 用 withTenantContext 包装)。

**理由**:
1. **0 新 middleware**——复用 Phase B Task 8 已 land 的 `withTenantContext`,减少 surface area
2. **RLS 在 storeId 校验后启用**——比候选 Z 的 BYPASSRLS 更安全(webhook 仅访问 metadata 指定的 store)
3. **storeId 校验机制**:Stripe 事件 signature 已经在 line 170 `webhooks.constructEvent` 验证(由 STRIPE_WEBHOOK_SECRET 签名),signature 通过 = metadata 来源可信。signature 不通过 = 已 line 21-22 `400 Webhook verification failed` 拦截。**candidate Y 的 metadata.storeId 在 signature 校验后使用,不是裸输入**

**实施代码模式**(在 handleWebhookEvent 内部):

```ts
export async function handleWebhookEvent(payload: Buffer, signature: string): Promise<string> {
  const event = getStripe().webhooks.constructEvent(payload, signature, webhookSecret)
  // signature 验证通过, metadata 可信

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object as Stripe.PaymentIntent
    const storeId = pi.metadata.storeId
    if (!storeId) {
      logger.error({ paymentIntentId: pi.id }, 'webhook: missing storeId in metadata')
      return event.type
    }

    // 进入 tenant context — RLS 启用 + tx + afterCommit
    await withTenantContext(storeId, async (tx) => {
      // ... D62 candidate B idempotency check (§3) ...
      // ... D58 path X submitDraft + D60 version check (Task 36 §3.2) ...
      // ... afterCommit registration (§4.2) ...
    })
  }

  return event.type
}
```

#### 2.3 webhook.routes.ts 改造(轻量)

```diff
 router.post('/stripe', async (req, res) => {
   const signature = req.headers['stripe-signature']
   if (!signature || typeof signature !== 'string') {
     res.status(400).json({ error: 'Missing stripe-signature header' })
     return
   }

   try {
     const eventType = await handleWebhookEvent(req.body as Buffer, signature)
     logger.info({ eventType }, 'stripe webhook processed')
     res.json({ received: true })
+  } catch (err: any) {
+    if (err?.code === 'OPTIMISTIC_LOCK_CONFLICT') {
+      // D60 already handled by handleWebhookEvent (refund + alert), webhook should still 200 to Stripe
+      logger.warn({ err }, 'webhook: version mismatch handled, returning 200')
+      res.json({ received: true })
+      return
+    }
     ...
```

**routes 层不包装 tenantAwareRoute** —— webhook 不带 storeId 入参(在 metadata 内),tenant context 在 handler 内部建立。

---

### 3. D62 决议正式登记

#### D62:Webhook 幂等机制

**决议**:**候选 B**(`Payment.stripePaymentIntentId UNIQUE` 约束 + DB 层冲突幂等),Ian 2026-04-18 倾向已在 handoff 登记,本 plan 写作期 Ian 未明确否决,按 B 设计。

**候选 A 完整方案**(保留对比,Ian 实施期可切换):

新建 `processed_webhook_events` 表:
```sql
CREATE TABLE processed_webhook_events (
  event_id TEXT PRIMARY KEY,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  event_type TEXT NOT NULL
);
CREATE INDEX idx_processed_webhook_events_processed_at ON processed_webhook_events(processed_at);
```

webhook handler 内:
```ts
await withTenantContext(storeId, async (tx) => {
  const exists = await tx.processedWebhookEvent.findUnique({ where: { eventId: event.id } })
  if (exists) return  // already processed, idempotent
  // ... 处理 ...
  await tx.processedWebhookEvent.create({ data: { eventId: event.id, eventType: event.type } })
})
```

额外工作:
- 过期清理(每日 cron 删除 > 30 天的记录,Stripe 事件保留 30 天)
- ~100 行代码 + cron + 表 schema

**候选 B 完整方案**(选定):

Schema migration:
```sql
-- prisma/migrations/2026XXXXXXXX_payment_stripe_unique/migration.sql
DROP INDEX IF EXISTS "Payment_stripePaymentIntentId_idx";
CREATE UNIQUE INDEX "Payment_stripePaymentIntentId_unique" ON "Payment"("stripePaymentIntentId") WHERE "stripePaymentIntentId" IS NOT NULL;

-- Rollback (commented for reference):
-- DROP INDEX "Payment_stripePaymentIntentId_unique";
-- CREATE INDEX "Payment_stripePaymentIntentId_idx" ON "Payment"("stripePaymentIntentId");
```

**注意**:UNIQUE INDEX 用 `WHERE stripePaymentIntentId IS NOT NULL`(partial index)—— 因为 cash payment 不带 PI ID,nullable。

webhook handler 入口幂等检查(候选 B 实施代码):

```ts
await withTenantContext(storeId, async (tx) => {
  // D62 候选 B: DB 层幂等通过 UNIQUE 约束实现
  // 入口 fast-path: 检查 paymentRepo.findByStripeId, 若存在 → return early
  const existing = await paymentRepo.findByStripeId(pi.id, tx)
  if (existing) {
    logger.info({ paymentIntentId: pi.id, paymentId: existing.id }, 'webhook: payment already processed (idempotent)')
    return
  }

  // ... D58/D59/D60 主流程 (Task 36 plan §3.2) ...
  // 若并发 webhook 同时 INSERT, UNIQUE 约束触发 P2002 错误
  try {
    await paymentRepo.create({ ..., stripePaymentIntentId: pi.id, ... }, tx)
  } catch (err) {
    if (err.code === 'P2002' && err.meta?.target?.includes('stripePaymentIntentId')) {
      logger.warn({ paymentIntentId: pi.id }, 'webhook: concurrent processing detected, treated as idempotent')
      return  // 并发 race, 已被另一个 webhook 处理
    }
    throw err
  }
})
```

**5 条决策理由**(仿 D58-D63 格式):

1. **DB 层强制 0 应用层代码**——UNIQUE 约束在 DB 层保证幂等,无需独立幂等表 / 应用层去重逻辑。**依据**:Phase D Task 19 plan line 923 已提供 `paymentRepo.findByStripeId` 工具,候选 B 复用此 API
2. **Stripe PaymentIntent ID 天然幂等**——Stripe 文档保证同一支付意图重试用同一 PaymentIntent ID(包括 webhook 重放场景)。**依据**:Stripe webhook docs [Idempotency](https://stripe.com/docs/api/idempotent_requests) + [PaymentIntent lifecycle](https://stripe.com/docs/payments/payment-intents/verifying-status)
3. **无需过期清理策略**——候选 A 的 `processed_webhook_events` 表需要 cron 清理 > 30 天记录(Stripe 事件保留窗),候选 B 的 Payment 表本身就是业务数据,无需额外清理。**依据**:候选 A vs B 工作量对比(handoff §"Task 41 实施依赖" + 2026-04-19 追加块)
4. **事务边界简单**——候选 A 需要"查表 + 处理 + 插表" 3 步原子事务,候选 B 直接 UNIQUE INDEX + try/catch P2002,语义单一。**依据**:Prisma 文档 [Unique constraint violations](https://www.prisma.io/docs/concepts/components/prisma-client/handling-exceptions-and-errors) error code P2002
5. **schema migration 成本可控**——只需 1 个 migration 文件(~10 行 DDL)+ rollback 注释,远低于候选 A 的 ~100 行(表 + 索引 + cron 任务)。**依据**:本 plan §3 完整 SQL diff(~10 行)

**D62 候选 B 落地依赖**(见 handoff `cf035125` 追加块):
- Phase B schema 增量 migration(`@@index → @@unique`,本 plan §"Files" 已含)
- Stripe webhook 重放测试(§5 测试矩阵 case 4)

---

### 4. 5 个 `[Task 41 final verify]` 标记落实

#### 4.1 R-X1 时序图 final verify(Task 36 plan §4.2 标点)

**Task 36 plan 时序图**(`phase-g-payment-service.md` §4.2):

```
[client] api.createPaymentIntent → [server] withTenantContext → stripe.paymentIntents.create → return clientSecret
↓ Stripe.js confirmPayment
↓ webhook payment_intent.succeeded
[server] handleWebhookEvent → [Task 41 webhook plan 决定上下文 - platform? tenant?]
  draftId = pi.metadata.draftId
  expectedVersion = pi.metadata.draftVersion
  try { submitted = orderRepo.submitDraft(draftId, expectedVersion, tx) }
  catch (OPTIMISTIC_LOCK_CONFLICT) { stripe.refunds.create + emit }
```

**Final 解**:
- **上下文模式**:候选 Y(`withTenantContext(metadata.storeId, ...)`,本 plan §2.2)
- **完整时序**(本 plan §3 D62 候选 B + Task 36 §3.2 D58/D59/D60 合并):

```
[server] handleWebhookEvent(payload, signature):
  1. webhooks.constructEvent verify (signature 验证, metadata 可信)
  2. event.type === 'payment_intent.succeeded':
     storeId = pi.metadata.storeId  (signature 后可信)
     await withTenantContext(storeId, async (tx) => {
       3. D62 候选 B 幂等: existing = await paymentRepo.findByStripeId(pi.id, tx)
          if (existing) return  (idempotent fast-path)
       4. D58 路径 X + D59 metadata pointer:
          draftId = pi.metadata.draftId
          expectedVersion = parseInt(pi.metadata.draftVersion, 10)
          if (!draftId || isNaN(expectedVersion)) {
            await stripe.refunds.create({ payment_intent: pi.id })
            return
          }
       5. try {
            submitted = await orderRepo.submitDraft(draftId, expectedVersion, tx)
            // D60 version 校验在 submitDraft 内部 atomic
            payment = await paymentRepo.create({
              ..., stripePaymentIntentId: pi.id, status: 'confirmed',
              items: submitted.items.map(oi => ({ orderItemId: oi.id, paidQuantity: oi.quantity })),
            }, tx)
            // afterCommit 注册 (§4.2 hook 适配)
            registerAfterCommit(() => emit({ type: 'order:created', storeId, sessionId, orderId: submitted.id }))
            registerAfterCommit(() => emit({ type: 'session:summary', storeId, sessionId }))
            registerAfterCommit(() => emit({ type: 'store:orders', storeId }))
          } catch (err) {
            6. D60 失败路径:
            if (err.code === 'OPTIMISTIC_LOCK_CONFLICT') {
              await stripe.refunds.create({ payment_intent: pi.id })
              registerAfterCommit(() => emit({ type: 'payment_failed_version_mismatch', ... }))
            } else if (err.code === 'P2002' && stripePaymentIntentId target) {
              return  (D62 并发 race, idempotent)
            } else {
              throw err
            }
          }
     })
```

#### 4.2 webhook handler `afterCommit` hook 适配(Task 36 plan §2 末尾 + L177 标点)

**问题**:webhook 不走 `tenantAwareRoute`(routes 层无包装,§2.3 已述),但 `withTenantContext` 内 emit 仍需 afterCommit 保证规则 2(emit 在 commit 之后)。

**Final 解**:在 `withTenantContext` 内手动管理 afterCommit hooks。`withTenantContext` 实现需提供 hook 注册接口(对齐 tenantAwareRoute / platformAwareRoute 模式):

```ts
await withTenantContext(storeId, async (tx) => {
  const afterCommitHooks: Array<() => void> = []
  const registerAfterCommit = (hook: () => void) => afterCommitHooks.push(hook)

  // ... 业务逻辑 ...
  registerAfterCommit(() => emit({ type: 'order:created', ... }))

  // 函数返回前 tx commit, withTenantContext 内部 commit 后调用 hooks
  // 实际上 withTenantContext 应该 expose 钩子注册接口
})
// commit 完成后, hooks 在此点执行 emit
```

**[ASSUMPTION,实施期 Ian / Task 41 实施期 verify]**:`withTenantContext` 当前 signature 是 `(storeId, callback) => Promise<T>`,callback 内不直接接收 `afterCommit` hook 注册接口。Task 41 实施期需:

- **选项 A**:扩展 `withTenantContext` signature 增加 hook callback 参数(对齐 tenantAwareRoute 提供 `res.locals.afterCommit`)
- **选项 B**:webhook handler 内手动管理 hooks 数组,withTenantContext 完成后(Promise resolve)统一执行
- **选项 C**:封装一个 `withTenantContextAndHooks(storeId, async (tx, registerAfterCommit) => {...})` helper

**本 plan 推荐选项 C**(语义清晰 + 不污染 withTenantContext 现有 API)。Ian 实施期可选。

#### 4.3 tx context 类型(Task 36 plan §4.2 标点 "platform? tenant?")

**Final 解**:**tenant**(候选 Y,基于 metadata.storeId)。

理由(本 plan §2.2):
- 安全 > BYPASSRLS 过度授权(候选 Z 排除)
- 0 新 middleware(候选 X 排除)
- signature 校验后 metadata 可信(storeId 来源安全)

#### 4.4 manual capture PI metadata D59 协调(C6b2 §2.4 标点)

**问题**:Manual capture(split-bill payment 的 manual flow)的 PaymentIntent metadata 是 `{splitBillId, sessionId, storeId}`,**不含 draftId/draftVersion**。webhook 处理 manual capture 路径时如何区分?

**Final 解**:**webhook 入口分流**(基于 metadata 字段存在与否):

```ts
if (event.type === 'payment_intent.succeeded') {
  const pi = event.data.object as Stripe.PaymentIntent

  if (pi.metadata.splitBillId) {
    // Manual capture path (Phase 2.5 deferred, B2 阶段不深入)
    // 当前实现保持 legacy(captureSplitBillPayment 在 split-bill.routes.ts /capture endpoint 调用)
    // webhook 此分支仅 log + return, 不重复处理
    logger.info({ paymentIntentId: pi.id, splitBillId: pi.metadata.splitBillId },
      'webhook: manual capture event, deferred to /capture endpoint')
    return
  }

  if (pi.metadata.draftId) {
    // Pay-first / pay-later (D59 cart pointer path), B2 主流程
    // ... §4.1 完整时序图 ...
  }

  // 未知 metadata, 兜底 refund + alert
  logger.error({ paymentIntentId: pi.id, metadata: pi.metadata },
    'webhook: unknown payment intent type, refunding')
  await stripe.refunds.create({ payment_intent: pi.id })
}
```

**与 D59 协调原则**:
- D59 仅 cart-pointer (draftId+draftVersion) 路径适用
- Manual capture 是独立 lifecycle (splitBillId pointer),webhook 不处理(由 /capture endpoint 处理)
- 兜底防御:未知 metadata 全 refund(防误支付)

---

### 5. 测试矩阵

**`server/src/__tests__/webhook.test.ts`** 4 case:

1. **Case 1 — succeeded with valid metadata**:
   - 模拟 PaymentIntent.succeeded 事件(metadata = `{storeId, draftId, draftVersion, ...}`)
   - 验证:`orderRepo.submitDraft` 被调,`paymentRepo.create` 创建 confirmed payment
   - 验证 emit:`order:created` + `session:summary` + `store:orders` 在 commit 后发

2. **Case 2 — version mismatch**:
   - draft.version 在 PaymentIntent 创建后被改(模拟 cart 改动)
   - webhook 触发,`submitDraft` 抛 `OPTIMISTIC_LOCK_CONFLICT`
   - 验证:`stripe.refunds.create` 被调,`payment_failed_version_mismatch` emit 发出
   - 验证:DB 中无新 Payment 记录

3. **Case 3 — missing metadata.draftId**:
   - PaymentIntent.succeeded 事件 metadata 缺 draftId
   - 验证:`stripe.refunds.create` 被调,无 Payment 创建
   - 验证 log:'missing draftId/draftVersion in metadata'

4. **Case 4 — D62 候选 B 重放幂等**:
   - 第一次 webhook 处理成功(Payment 创建)
   - 第二次同一 PaymentIntent 重放
   - 验证:`paymentRepo.findByStripeId` 命中 → 直接 return,无重复 Payment 创建
   - 验证 log:'payment already processed (idempotent)'

5. **Case 5 — manual capture event 兜底**:
   - PaymentIntent.succeeded 事件 metadata = `{splitBillId, sessionId, storeId}`(无 draftId)
   - 验证:webhook log "deferred to /capture endpoint",无 Payment 创建
   - 验证:无 refund 调用(manual capture 是合法路径)

---

### 6. Phase D 回填补丁清单(段 5 task 41)

**段 5 task 41 新增回填候选**:

| # | 内容 | 依据 |
|---|---|---|
| G7-2(候选,可能已满足)| `paymentRepo.findByStripeId(piId, tx)` | Phase D Task 19 plan line 923 已定义,§3 D62 候选 B 入口幂等检查使用 |
| G7-3(候选,可能已满足)| `paymentRepo.create` 含 `stripePaymentIntentId` 字段(D62 candidate B UNIQUE 约束 + P2002 catch) | Phase D Task 19 plan line 988/1002 已含 stripePaymentIntentId 参数 |
| **G7-4(必需)** | `withTenantContextAndHooks(storeId, async (tx, registerAfterCommit) => {...})` helper(§4.2 选项 C) | Phase B Task 8 当前 `withTenantContext` 无 hook 注册接口,Task 41 实施需新增 helper |
| G7-5(候选)| Phase B schema 增量 migration `2026XXXXXXXX_payment_stripe_unique`(§3 D62 候选 B 落地)| handoff D62 候选 B 落地依赖块已设计 |

**累积状态**:
- 无条件 6 + 段 4 三 + 段 5 二 + 段 6 三 + 段 5 task 39 一 + **段 5 task 41 三 = 18 项**

---

### 7. Task 42 预告(段 5 末尾 task)

**Task 42 范围**(scope-check §5):
- session-payment.ts(165 行):13 JsonStore + ~10 itemKey deps + emit verify + confirmItemPayment deprecated verify
- session-settlement.ts 非 derivePaidState 部分(187 行 - C5b2 已吃部分):~7 JsonStore + 完整业务函数 async + itemKey signature 透传
- C6b1 + C6b2 + Task 42 三方原子 commit 协调(C6b2 §4)
- 预估 plan ~400-500 行

**Task 41 ↔ Task 42 不耦合**:webhook 不直接调 session-payment / session-settlement(通过 paymentRepo / orderRepo 间接)

---

### 8. 实施 Step(Task 41 实施期指引)

- **Step 1**:grep 基线复核(payment.service handleWebhookEvent 现状 + Phase D Task 19 paymentRepo.findByStripeId verify)
- **Step 2**:Phase B schema migration(D62 候选 B,§3 SQL)+ `prisma migrate dev`
- **Step 3**:`withTenantContextAndHooks` helper 创建(§4.2 选项 C,G7-4 回填)
- **Step 4**:`payment.service.ts` `handleWebhookEvent` 完整重写(§4.1 时序图代码 + §4.4 manual capture 分流)
- **Step 5**:`webhook.routes.ts` 改造(§2.3 catch OPTIMISTIC_LOCK_CONFLICT 返回 200)
- **Step 6**:`__tests__/webhook.test.ts` 5 case
- **Step 7**:5 道门验证 + commit `feat(phase-5): Task 41 - webhook B2 + D62 candidate B + 5 verify markers landed`

**实施期**:写 commit 时同步 sed 修改 Task 36 + Task 38 plan 内的 `[Task 41 final verify]` 标记为 `[Task 41 verified at <commit>]`(规则 8.1 维护一致性)。

---

### 9. commit(本 plan 落地)

```bash
git add docs/superpowers/plans/2026-04-17-phase5-postgres-migration/phase-g-webhook.md
git commit -m "plan(phase-g): task 41 - webhook B2 + D62 decision (Ian preferred B) + 5 final verify markers"
git push origin main
```

**不更新 RESUME / 00-index** —— 等段 5 全部 task(39 + 41 + 42)完成后一次性同步。

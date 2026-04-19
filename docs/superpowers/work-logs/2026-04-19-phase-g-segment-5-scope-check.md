# Phase G Segment 5 Scope Check (Task 39/40/41/42 Remaining Work Verification)

Created: 2026-04-19, Phase G 段 5 启动前的范围校对——交接包 Task 39-42 定义 vs C5b1/C5b2/C6b1/C6b2 实际覆盖差集。命名延伸 C2a/C4a/C5a/C6a 模式,但本文件功能是"范围 reconciliation",不是单 task 前置 grep。

**Scope hard boundary**:
- 校对 4 task(Task 39 split-bill.service / Task 40 split-bill-invalidation / Task 41 webhook / Task 42 session-payment + session-settlement)
- 仅 grep,不写 plan / 不做决议
- 不展开任何 task plan 写作

---

## 1. 文件清单 + 当前规模

```bash
$ ls server/src/routes/ | grep -iE "split|webhook|payment"
payment-adjust.routes.ts
payment.routes.ts
split-bill.routes.ts
webhook.routes.ts

$ ls server/src/controllers/ | grep -iE "split|payment|session"
payment-adjust.service.ts
payment.service.ts        # Task 36 plan 已完成
session-cart.ts           # Task 34 plan 已完成
session-coupon.ts         # 段 5 候选?
session-crud.ts           # Task 32 plan 已完成
session-payment.ts        # Task 42 候选
session-settlement.ts     # Task 42 候选
session.service.ts        # Task 32-33 部分
split-bill-invalidation.ts        # Task 40 / C6b2 §2.2
split-bill-payment.service.ts     # C6b2 §2.4
split-bill-summary.ts             # C6b2 §2.3
split-bill.service.ts             # Task 39 / C6b2 §2.1

$ wc -l <Task 41/42 候选 + routes>
     165 server/src/controllers/session-payment.ts
     187 server/src/controllers/session-settlement.ts
      25 server/src/routes/webhook.routes.ts
     101 server/src/routes/split-bill.routes.ts
```

---

## 2. Task 39 (split-bill.service.ts) 剩余范围

**原交接包定义**:Task 39 = split-bill.service.ts B2 适配

**C6b2 §2.1 实际覆盖**:
- `createSplitBill` signature FK + paymentItems 解析(line 47-61).split(':') 消除
- `buildAssignedQtyMap` Key orderItemId(line 144 .split(':') 消除)
- 9 JsonStore 切 Repo
- `splitBillStore.create` → `splitBillRepo.create` D56 FK 模型
- `sessionStore.update(settlementMode)` → `sessionRepo.update`
- async + tx 化

**差集 = Task 39 真实剩余工作**:
- ❌ 无 service 层剩余工作(C6b2 §2.1 完整覆盖)
- ⚠️ **routes 层 `split-bill.routes.ts` 改造未明确归属**:101 行,调用 `executeSettlement` / `pay.createManualCaptureIntent` / `svc.getSplitBills` / `svc.getMainBillSummary` —— 这些函数 C5b1+C6b2 已 async,routes 层需 await + tx + middleware 适配

**Task 39 结论**:**service 层完全被 C6b2 吃掉**;routes 层归属待 Ian 判(可能归 Task 39 / 可能归独立 routes-层 task / 可能跟随实施期同 service commit)

---

## 3. Task 40 (split-bill-invalidation.ts) 剩余范围

**原交接包定义**:Task 40 = split-bill-invalidation.ts B2 适配

**C6b2 §2.2 实际覆盖**:
- `invalidateConflictingSplits` signature 改 async + tx
- `sb.itemKeys` overlap 检测 → FK orderItemId Set(line 37 .split(':') 消除)
- 3 JsonStore 切 Repo
- `derivePaidState` 消费切 paidItems(C5b2 已 D63 落地)
- B2 语义保持自查(机械替换 baseKey → orderItemId)

**差集 = Task 40 真实剩余工作**:
- ❌ 无 service 层剩余工作(C6b2 §2.2 完整覆盖)
- ⚠️ caller payment.service:222 已 Task 36 async,**already-coordinated**

**Task 40 结论**:**完全被 C6b2 吃掉**(无 routes 层文件,内部 helper 调用)

---

## 4. Task 41 (webhook) 范围确认

### 4.1 webhook 文件清单

```bash
$ wc -l server/src/routes/webhook.routes.ts
      25 server/src/routes/webhook.routes.ts
```

webhook.routes.ts 25 行 = **纯转发**(C4a §4 已确认):

```ts
router.post('/stripe', async (req, res) => {
  const signature = req.headers['stripe-signature']
  ...
  const eventType = await handleWebhookEvent(req.body as Buffer, signature)
  res.json({ received: true })
})
```

**核心业务在** `payment.service.ts:handleWebhookEvent`(Task 36 plan 已部分覆盖,但留 [Task 41 final verify] 标记点)

### 4.2 [Task 41 webhook plan 时 final verify] 标记点回收

```bash
$ grep -rn "Task 41" docs/superpowers/plans/2026-04-17-phase5-postgres-migration/
```

**Task 36 (phase-g-payment-service.md) 内 4 个标记点**:
- L17 R-X1 时序图 final verify(metadata → webhook → submitDraft 全流程)
- L83 webhook handler `afterCommit` hook 适配(webhook 不走 tenantAwareRoute,需 platformAwareRoute 或独立机制)
- L177 webhook handler `afterCommit` hook 适配重申
- L210 时序图 tx context 类型(platform 还是 tenant)

**Task 38 (phase-g-settlement-actions.md L379) 内 1 标记点**:
- manual capture PI metadata 兼容性 verify([Task 41 webhook 协调])

**回收清单**:**5 处独立 verify 工作**,Task 41 plan 写作时需要逐项落实。

### 4.3 D62 候选 webhook 幂等决议所需决策点

**D62 候选**(Ian 倾向 B):
- 候选 A:processed_webhook_events 表(独立幂等表)
- 候选 B:`Payment.stripePaymentIntentId UNIQUE` 约束(DB 层冲突幂等)

**Phase D 现状**(grep `phase-d-repositories.md` + `phase-b-infrastructure.md`):
- ✅ `paymentRepo.findByStripeId(stripePaymentIntentId, db?)`(Task 19 plan line 923):"webhook 幂等用"
- ✅ `paymentRepo.confirmStripe(stripePaymentIntentId, db)`(Task 19 plan line 924):"webhook 确认"
- ✅ `Payment.stripePaymentIntentId` 字段(Phase B Task 2 line 371,有 `String?` 类型)
- ⚠️ 当前 schema 是 `@@index([stripePaymentIntentId])`(line 379)**不是 `@@unique`** —— D62 候选 B 落地需要把 `@@index` 改 `@@unique` + migration

**D62 候选 B 落地工作量**:
- Phase B Task 2 schema 增量 migration(`@@index` → `@@unique` + 加 NOT NULL 或保留 nullable 处理)
- webhook handler 内 try/catch UNIQUE constraint violation → 返回 idempotent 响应
- 测试:重放同一 PaymentIntent.succeeded 事件验证不重复 addPayment

**D62 候选 A 落地工作量**:
- Phase B Task 2 schema 加 `processed_webhook_events` 表 + migration
- webhook handler 内 events 表 INSERT-then-process 模式
- 过期清理策略

### 4.4 Task 41 真实工作量

- webhook.routes.ts 改造(25 行,可能加 raw body parser middleware verify + tx context 注入)
- payment.service.ts handleWebhookEvent 内 5 处 [Task 41 final verify] 落实
- D62 决议正式拍板 + 落地(候选 A 或 B 任一)
- manual capture PI metadata D59 协调(C6b2 标点)
- 测试:webhook 完整路径(succeeded / failed / version mismatch / 重放幂等)

**Task 41 结论**:**未触及,独立工作量充足**(预估 plan ~400-500 行)

---

## 5. Task 42 (session-payment + session-settlement) 范围确认

### 5.1 session-payment.ts 当前状态(165 行)

```bash
$ grep -nE "Store[.\s]|new JsonStore|itemKey|emit\(|derivePaidState|\.split\(':'\)" server/src/controllers/session-payment.ts | head -40
```

**JsonStore 调用**:
- storeStore × 2(line 11/16)
- sessionStore × 5(line 30/82/97/132/161/163)
- paymentStore × 6(line 69/101/115/116/144/147/151/154)
- **小计 13 处**

**itemKey 依赖**:
- `addPayment` signature `itemKeys?: string[]`(line 27)
- 内部 `resolvedItemKeys`(line 53-56)+ payment.itemKeys 字段 set(line 65)
- `recordCashPayment` signature `itemKeys?: string[]`(line 108,line 112 transparent forward)
- `confirmItemPayment(sessionId, itemKeys: string[])`(line 131,**注释 line 128** "Production webhook no longer calls this — possibly deprecated 实施期 verify")
- **小计 ~10 处** itemKey 依赖

**derivePaidState 消费**:1 处(line 41,仅 totalPaid)—— Task 37 C5b2 已切 D63,本文件实施期 await + tx

**Task 42 session-payment.ts 真实工作**:
- 13 JsonStore → Prisma 切换(全文件)
- ~10 处 itemKey signature/内部解析改 FK(D61 落地,actions C6b1 调用端已 paymentItems FK,**本文件 service 端必须对齐**)
- `confirmItemPayment` deprecated verify(若已 deprecated,本 task 删除;若未 deprecated,FK 切换)
- emit afterCommit(grep 未触发——可能本文件无直接 emit,实施期 verify)

### 5.2 session-settlement.ts 当前状态(187 行)

```bash
$ grep -nE "Store[.\s]|...." server/src/controllers/session-settlement.ts
```

**JsonStore 调用**:
- sessionStore × 5(line 11/16/76/89/96/154)
- orderStore × 2(line 18/98)
- storeStore × 3(line 20/140/141/158)
- **小计 ~10 处**(总 grep 29 含 derivePaidState 消费 string match,精确去重 ~10 处真实 Store 调用)

**derivePaidState 消费**:**3 处**(line 24/99/162,**Task 37 C5b2 范围 #1/#2/#3**——已声明在 C5b2 plan §3)

**.split(':') 解析**:**3 处**(line 38/104/112,**Task 37 C5b2 范围**)

**收窄声明对照**(C5b1 §7):
- ✅ session-settlement 的 3 derivePaidState 调用点 → C5b2 范围
- ✅ session-settlement 的 3 .split(':') → C5b2 范围
- ⚠️ **C5b2 plan §3 声明 Modify session-settlement.ts(3 调用点切 FK + 3 .split(':') 消除),但 session-settlement.ts 整文件还有 ~7 处 JsonStore 不在 C5b2 范围**

**Task 42 session-settlement.ts 真实剩余工作**:
- ~7 处非 derivePaidState 相关 JsonStore → Prisma 切换(line 11/16/18/20/76/82/89/140/141/154/158 中除 24/99/162 derivePaidState 调用前后的)
- 完整业务函数 async 化(`getSessionSummary` / `setSettlementMode` / `payByItems` / `payByPercent` 等)
- itemKey 透传层(line 87 `payByItems(storeId, sessionId, itemKeys: string[])` signature 改 FK,gateway/actions 调用端已 FK)

### 5.3 Task 42 真实工作量汇总

- session-payment.ts:13 JsonStore + 10 itemKey + emit verify + deprecated cleanup
- session-settlement.ts:~7 JsonStore + 完整业务函数 async + itemKey signature
- **总规模**:~30 改造点 / 2 文件 / 352 行代码

**Task 42 结论**:**实质性独立工作量**,**不被 Task 37/38 吃掉**(C5b2 仅吃了 session-settlement 的 derivePaidState 部分 + 3 .split(':'))

---

## 6. 段 5 结构建议(数据驱动)

**预设**:CC 不预设倾向(对齐 C6b 拆分 Hold 时模式),Ian 数据驱动判断。

### 选项 A:保持交接包 Task 39-42 4 task 结构

**适用条件**:每个 task 都有足够独立工作量

**校对结果对照**:
- Task 39 split-bill.service:**service 层 0 剩余**(C6b2 完整吃),routes 层归属未明
- Task 40 split-bill-invalidation:**完全 0 剩余**(C6b2 完整吃)
- Task 41 webhook:**完整独立**(5 verify 标记 + D62 决议 + manual capture 协调,~400-500 行)
- Task 42 session-payment + session-settlement:**完整独立**(~30 改造点,~400-500 行)

**结论**:Task 39/40 不满足"足够独立"——选项 A **不推荐**(不是 CC 倾向,是数据观察)

### 选项 B:合并 Task 39+40 为单 task("split-bill routes + handoff 验证")

**内容**:
- split-bill.routes.ts 改造(101 行,await + tx + middleware)
- payment.routes.ts routes 层 await 适配(若有未覆盖)
- C6b2 service 端 plan 与实施期对接 handoff 验证
- 段 5 总 task 数:3(合并 39+40 / 41 / 42)

**预估 plan**:~250-350 行(routes 层薄,无 D 决议层面新东西)

### 选项 C:Task 39+40 完全降级为 "pointer to Task 38"

**内容**:
- 段 5 task 编号重排:Task 39 = webhook(原 41)/ Task 40 = session-payment + session-settlement(原 42)
- 取消 Task 39/40 独立编号,在 00-index 标"已并入 Task 38 / C6b2 §2"
- **routes 层归属**:跟随 Task 38 / Task 41 / Task 42 实施期同步处理
- 段 5 总 task 数:2(webhook / session-payment+session-settlement)

**预估 plan**:Task 41 + Task 42 各 ~400-500 行 = ~900 行 / 2 文件

### 选项 D(数据驱动新发现):routes 层独立 task

**内容**:
- 段 5 重新切分:
  - Task 39 = routes 层独立 task(split-bill.routes + payment.routes / etc 全部 routes 改造)
  - Task 40 = ??? (空槽,或保留 Task 编号占位指向 routes-task)
  - Task 41 = webhook(原)
  - Task 42 = session-payment + session-settlement(原)
- 段 5 总 task 数:4(routes / placeholder / webhook / session-pay+settle)
- **优点**:routes 层 100+ 行 in 4-5 文件,有独立工作量
- **缺点**:Task 40 编号悬空,不符合 task 序号连续性

---

## 7. CC 不给倾向声明

本汇报仅列 grep 数据 + 4 选项分析。**CC 不预设倾向**——拆分策略 / 编号重排 / 风险权衡属设计偏好领域,Ian 数据驱动判断。

校对触发 **规则 8 边界**:Task 37/38 plan 实际覆盖 vs 交接包原定义有冲突点(Task 39/40 大部分被吃掉)—— 本 work-log 即规则 8 汇报载体,等 Ian 拍段 5 结构后再启动 Task 39 或合并后的 plan 写作。

---

## 8. Pending 清单

- [ ] **本 work-log commit + push**(段 5 范围校对,本 session 唯一 pending)
- [ ] 段 5 plan 写作(待 Ian 拍 A/B/C/D 选项)

---

**End of segment 5 scope check.**

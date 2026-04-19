# Phase 5 Plan — Phase G 段 5:split-bill routes B2 适配 + handoff §2 验证回收(Task 39 合并)

> **如何使用本文件**
>
> - 全局规则见 [`00-index.md`](./00-index.md#全局规则所有-task-遵守)
> - 前置:Task 38 全 land(C6b1 + C6b2)+ Task 37 全 land(C5b1 + C5b2)+ Phase B Task 8 `tenantAwareRoute` middleware 可用
> - 参考:
>   - [`phase-g-segment-5-scope-check.md`](../work-logs/2026-04-19-phase-g-segment-5-scope-check.md) 段 5 范围校对(commit `20e69b30`)—— 本 task 合并的数据来源
>   - [`phase-g-settlement-actions.md`](./phase-g-settlement-actions.md) C6b1 §2 actions signature FK
>   - [`phase-g-settlement-split-bill.md`](./phase-g-settlement-split-bill.md) C6b2 §2.1-§2.4 split-bill service 4 文件 B2
>   - [`phase-b-infrastructure.md`](./phase-b-infrastructure.md) line 1043-1132 `tenantAwareRoute` 模式定义(`res.locals.tx` + `res.locals.afterCommit`)
> - spec 锚点:§9.8 Stage 3c 子任务 7

---

## Task 合并声明(规则 8 正向应用,B.2 编号处理)

**本 task 原为 Task 39 + Task 40 合并**:

- **Task 39**(原计划):`split-bill.service.ts` B2 改造 → **已在 Task 38 C6b2 §2.1 完整处理**(createSplitBill FK + 9 JsonStore + 2 .split(':') 消除 + buildAssignedQtyMap orderItemId Key)
- **Task 40**(原计划):`split-bill-invalidation.ts` B2 改造 → **已在 Task 38 C6b2 §2.2 完整处理**(invalidateConflictingSplits async+tx + 3 JsonStore + 1 .split(':') 消除)
- **本 task 范围**:两者 service 层之外的剩余工作(routes 层 + handoff §2 最终 verify)

**编号处理**:

- 本 task 保持 **Task 39** 编号
- **Task 40 编号悬空**(不再使用)
- 原因锚点:段 5 范围校对 work-log `2026-04-19-phase-g-segment-5-scope-check.md`(commit `20e69b30`)

**规则 8 精神**:Task 编号跳跃(39 → 41,40 悬空)保留历史痕迹 + 书面化原因,比假装编号连续更诚实。
Phase G 段 5 最终 task 数 = **3**(Task 39 合并 / Task 41 webhook / Task 42 session-pay+settle),非原交接包 4。

---

## 范围声明

- **本 task 范围**:`split-bill.routes.ts` B2 适配(101 行,6 routes handlers 全 async + tx + afterCommit) + handoff §2 5 处 .split(':') 最终验证回收
- **不在本 task 范围**:
  - split-bill 域 4 service 文件(C6b2 已 plan)
  - `payment.routes.ts` tenantAwareRoute 包装(归属 Task 36 实施期 verify,**[Task 36 实施期 verify]** 标记)
  - webhook routes(Task 41)
  - session-payment / session-settlement routes(Task 42)

---

## 规则 7 段 5 task 39 强化条款

1. **任何 "split-bill routes 需要改 X" 断言必须有 grep 证据**——本 plan 基于 routes 文件完整 read(101 行) + scope-check work-log 数据
2. **任何 "C6b2 已处理某部分" 必须有 C6b2 plan 具体小节引用**——避免双计/漏计
3. **handoff §2 最终验证命令必须可独立执行**——产出后下 session 实施期可直接复制运行
4. **payment.routes.ts 是否需 tenantAwareRoute 包装的边界判定** = 本 task 不处理,挂 [Task 36 实施期 verify] 标记

违反本条款的写作 → 停下自查修正,不 push。

## 规则 8 段 5 task 39 自查记录

- ✅ Pending commits 全程 ≤ 1(本 plan 为唯一 pending,handoff D62 更新已落地 `cf035125`)
- ✅ Task 合并声明放在 plan 顶部独立小节,不散落其他小节
- ✅ Task 40 编号悬空原因锚点引用 scope-check work-log(`20e69b30`),非凭印象
- ✅ payment.routes 边界判定明示 [Task 36 实施期 verify],不扩散范围

## Pending commits 清单(规则 8.1 严格定义)

- [x] 段 5 范围校对:`20e69b30`
- [x] handoff D62 候选 B 落地依赖:`cf035125`
- [ ] **Task 39 合并 plan:本文件**(段 5 task 39)

---

## Task 39 合并:split-bill routes B2 适配 + handoff §2 最终 verify

**Files (本 task 范围)**:
- Modify: `server/src/routes/split-bill.routes.ts`(6 routes handlers 改 `tenantAwareRoute` 包装 + service 调用加 tx)
- Verify: handoff §2 5 处 .split(':') 最终消除状态(C6b1 + C6b2 实施完成后)

**前置**:
- Task 38 C6b1 + C6b2 land(actions FK + split-bill 4 文件 service 改造完成)
- Phase B Task 8 `tenantAwareRoute` middleware 可用(line 1043-1132)
- Task 37 C5b1 + C5b2 land(settlement gateway + derivePaidState FK)

### Task 完成 4 道门

1. `grep -cE "(svc|pay)\.\w+\(" server/src/routes/split-bill.routes.ts` 调用全部 `await` + 传 `res.locals.tx`(无同步调用残留)
2. `grep -c "tenantAwareRoute" server/src/routes/split-bill.routes.ts` = **6**(6 routes handlers 全包装)
3. `grep -rn "split(':')" server/src/` = **仅 `legacy-itemkey.ts` 内部 1 处**(handoff §2 最终验证标准:5 处全消除,见 §3)
4. `tsc -b` 全通过(routes 层 + service 层 signature 对齐)

---

### 1. 事实核查(引用 scope-check + C6b2 + Phase B)

(源:`phase-g-segment-5-scope-check.md` + 本 plan grep verify)

**split-bill.routes.ts 现状**(scope-check §2 + 本 plan 完整 read):
- 101 行 / 6 routes handlers
- middleware:`requireAuth` + `requirePermission`(已 line 13)
- 未用 `tenantAwareRoute`(scope-check §2 已识别为待改造 routes 层)
- 调用面:
  - `executeSettlement` from settlement gateway(C5b1 已 async + tx)
  - `svc.getSplitBills` / `svc.getMainBillSummary` from split-bill.service(C6b2 §2.1/§2.3 已 async + tx)
  - `pay.createManualCaptureIntent` / `pay.captureSplitBillPayment` from split-bill-payment.service(C6b2 §2.4 已 async + tx)
- 0 直接 emit 调用(emit 在 service / settlement gateway 层)

**Phase B Task 8 `tenantAwareRoute` 模式**(`phase-b-infrastructure.md` line 1043-1132):

```ts
router.post('/...', tenantAwareRoute(async (req, res) => {
  const result = await someService(res.locals.storeId!, ..., res.locals.tx)
  res.locals.afterCommit!(() => emit(...))  // 如有 emit
  res.json(result)
}))
```

提供:`res.locals.tx`(Prisma TransactionClient) + `res.locals.storeId` + `res.locals.afterCommit(hook)`(规则 2 合规)

---

### 2. split-bill.routes.ts B2 适配(6 routes handlers)

#### 2.1 GET / (列 split bills + main bill)

**当前**(line 16-24):

```ts
router.get('/', requirePermission('tables:read'), (req: Request, res: Response) => {
  const { storeId, sessionId } = req.params
  const splits = svc.getSplitBills(sessionId)
  const mainBill = svc.getMainBillSummary(sessionId, storeId)
  res.json({ splits, mainBill })
})
```

**改造**:

```diff
-router.get('/', requirePermission('tables:read'), (req: Request, res: Response) => {
-  const { storeId, sessionId } = req.params
-  const splits = svc.getSplitBills(sessionId)
-  const mainBill = svc.getMainBillSummary(sessionId, storeId)
-  res.json({ splits, mainBill })
-})
+router.get('/', requirePermission('tables:read'), tenantAwareRoute(async (req, res) => {
+  const { sessionId } = req.params
+  const [splits, mainBill] = await Promise.all([
+    svc.getSplitBills(sessionId, res.locals.tx!),
+    svc.getMainBillSummary(sessionId, res.locals.storeId!, res.locals.tx!),
+  ])
+  res.json({ splits, mainBill })
+}))
```

#### 2.2 POST / (创建 split bill,通过 executeSettlement gateway)

**当前**(line 27-39):**含 itemKey signature 兼容**(line 31:`itemKeys || items`)

**改造**:

```diff
-router.post('/', requirePermission('tables:write'), (req: Request, res: Response) => {
-  const { storeId, sessionId } = req.params
-  const { method, type, items, itemKeys, percent, label } = req.body
-  const splitType = type || method
-  const splitItemKeys = itemKeys || items
-  const result = executeSettlement(storeId, sessionId, {
-    type: 'create-split', splitType, itemKeys: splitItemKeys, percent, label,
-  })
-  res.status(result.ok ? 201 : httpStatus((result as any).code)).json(result)
-})
+router.post('/', requirePermission('tables:write'), tenantAwareRoute(async (req, res) => {
+  const { sessionId } = req.params
+  const { method, type, items, itemKeys, paymentItems: bodyPaymentItems, percent, label } = req.body
+  const splitType = type || method
+
+  // D61 controller 边界薄层:legacy itemKey string[] → FK paymentItems[]
+  // C6b1 §2.1 actions create-split 已要求 paymentItems FK signature
+  const itemKeyStrings = itemKeys || items  // legacy 入口
+  const paymentItems = bodyPaymentItems
+    ?? (itemKeyStrings && itemKeyStrings.length > 0
+        ? await Promise.all(itemKeyStrings.map((k: string) => parseItemKey(k, res.locals.tx!)))
+        : undefined)
+
+  const result = await executeSettlement(res.locals.storeId!, sessionId, {
+    type: 'create-split', splitType, paymentItems, percent, label,
+  }, res.locals.tx!, res.locals.afterCommit!)
+  res.status(result.ok ? 201 : httpStatus((result as any).code)).json(result)
+}))
```

**关键变化**:
- 接 `paymentItems` 优先(B2 客户端逐步迁移),否则从 legacy `itemKeys` parse(D61 controller 边界,handoff §1 设计)
- `parseItemKey` 在 controller 边界调用(对齐 Task 36 §5.1 模式 + handoff §1 薄层)

#### 2.3 DELETE /:splitBillId

**改造**(同模式 tenantAwareRoute + tx 传入 executeSettlement):

```diff
-router.delete('/:splitBillId', requirePermission('tables:write'), (req: Request, res: Response) => {
-  const result = executeSettlement(req.params.storeId, req.params.sessionId, {
-    type: 'delete-split', splitBillId: req.params.splitBillId,
-  })
-  res.status(result.ok ? 200 : httpStatus((result as any).code)).json(result)
-})
+router.delete('/:splitBillId', requirePermission('tables:write'), tenantAwareRoute(async (req, res) => {
+  const result = await executeSettlement(res.locals.storeId!, req.params.sessionId, {
+    type: 'delete-split', splitBillId: req.params.splitBillId,
+  }, res.locals.tx!, res.locals.afterCommit!)
+  res.status(result.ok ? 200 : httpStatus((result as any).code)).json(result)
+}))
```

#### 2.4 POST /:splitBillId/pay-card(含 manual capture 分支)

**改造关键点**:
- Manual capture 路径(`captureMethod === 'manual'`)仍 bypass gateway,直接调 `pay.createManualCaptureIntent`(C6b2 §2.4 已 async + tx)
- 普通 card 路径走 executeSettlement
- 都需 tenantAwareRoute 包装

```diff
-router.post('/:splitBillId/pay-card', requirePermission('tables:write'), async (req: Request, res: Response) => {
-  const { storeId, splitBillId, sessionId } = req.params
-  const { tipAmount, captureMethod } = req.body
-  if (captureMethod === 'manual') {
-    const result = await pay.createManualCaptureIntent(storeId, splitBillId)
-    if ('error' in result) { res.status(400).json(result); return }
-    res.json(result); return
-  }
-  const result = executeSettlement(storeId, sessionId, {
-    type: 'pay-split-card', splitBillId, tipAmount,
-  })
-  res.status(result.ok ? 200 : httpStatus((result as any).code)).json(result)
-})
+router.post('/:splitBillId/pay-card', requirePermission('tables:write'), tenantAwareRoute(async (req, res) => {
+  const { splitBillId, sessionId } = req.params
+  const { tipAmount, captureMethod } = req.body
+
+  if (captureMethod === 'manual') {
+    const result = await pay.createManualCaptureIntent(res.locals.storeId!, splitBillId, res.locals.tx!)
+    if ('error' in result) { res.status(400).json(result); return }
+    res.json(result); return
+  }
+
+  const result = await executeSettlement(res.locals.storeId!, sessionId, {
+    type: 'pay-split-card', splitBillId, tipAmount,
+  }, res.locals.tx!, res.locals.afterCommit!)
+  res.status(result.ok ? 200 : httpStatus((result as any).code)).json(result)
+}))
```

#### 2.5 POST /:splitBillId/pay-cash(同模式)

`tenantAwareRoute` + `await executeSettlement(..., res.locals.tx!, res.locals.afterCommit!)`

#### 2.6 POST /:splitBillId/capture(manual capture 完成)

```diff
-router.post('/:splitBillId/capture', requirePermission('tables:write'), async (req: Request, res: Response) => {
-  const tipResult = sanitizeTip(req.body.tipAmount)
-  if ('error' in tipResult) { res.status(400).json({ error: tipResult.error }); return }
-  const result = await pay.captureSplitBillPayment(req.params.storeId, req.params.splitBillId, tipResult.value)
-  if ('error' in result) { res.status(400).json(result); return }
-  res.json(result)
-})
+router.post('/:splitBillId/capture', requirePermission('tables:write'), tenantAwareRoute(async (req, res) => {
+  const tipResult = sanitizeTip(req.body.tipAmount)
+  if ('error' in tipResult) { res.status(400).json({ error: tipResult.error }); return }
+  const result = await pay.captureSplitBillPayment(
+    res.locals.storeId!, req.params.splitBillId, tipResult.value, res.locals.tx!,
+  )
+  if ('error' in result) { res.status(400).json(result); return }
+  res.json(result)
+}))
```

---

### 3. handoff §2 最终验证回收(C6b1 + C6b2 完成后)

**handoff §2 5 处 .split(':') 完整消除状态对照**(C5b1 §6 + C6b1 §3 + C6b2 §3):

| handoff §2 # | 文件:行号 | 消除位置 | 验证状态 |
|---|---|---|---|
| 1 | rules.ts:46 | C6b1 §3 | ⏳ 等 C6b1 实施 |
| 2 | split-bill.service.ts:48 | C6b2 §2.1 | ⏳ 等 C6b2 实施 |
| 3 | split-bill.service.ts:144 | C6b2 §2.1(buildAssignedQtyMap) | ⏳ 等 C6b2 实施 |
| 4 | split-bill-invalidation.ts:37 | C6b2 §2.2 | ⏳ 等 C6b2 实施 |
| 5 | split-bill-summary.ts:53 | C6b2 §2.3 | ⏳ 等 C6b2 实施 |

**最终验证命令**(Task 39 实施完成后,所有 plan 实施落地后执行):

```bash
$ grep -rn "split(':')" server/src/
# 期望: 仅 server/src/lib/legacy-itemkey.ts 内部保留 1 处(D56 入口转换,handoff §1 设计)
```

**若验证失败**(>1 处命中):
- 检查 C6b1 / C6b2 实施期是否漏切
- 排查未发现的 itemKey 字符串解析点(scope-check 未覆盖的散落 grep)
- 在 Task 41 / Task 42 plan 内追加补丁

---

### 4. typecheck 稳定性

**Task 39 完成后稳定范围**:
- split-bill.routes.ts 6 handlers 全 async + tx + 调用面对齐 C6b1/C6b2 service signatures
- `tsc -b` 应通过(前置:C6b1 + C6b2 完整 land + actions paymentItems FK signature 对齐)

**与 Task 41 / Task 42 的协调**:
- Task 39 routes 改造**不依赖** Task 41 webhook(routes 层不调 webhook)
- Task 39 routes 改造**不依赖** Task 42 session-payment(routes 层不直接调 session-payment 函数,通过 executeSettlement 间接)
- **Task 39 可独立 land**——在 Task 41 / Task 42 plan 写作前实施完成不影响其他

**Unstable 风险**:
- 若 Task 38 C6b1 + C6b2 + Task 42 三方原子 commit 要求(C6b2 §4)未满足,routes 层 typecheck 可能失败(因 service signature unstable)
- **建议 deploy 顺序**:Task 38 C6b1+C6b2+Task 42 原子 land → Task 39 routes 改造跟进 → Task 41 webhook 独立

---

### 5. Phase D 回填补丁清单(段 5 task 39)

**段 5 task 39 新增回填候选**:

| # | 内容 | 依据 |
|---|---|---|
| G7-1(候选,可能已满足)| `parseItemKey(key, tx)` from `legacy-itemkey.ts` —— Task 39 §2.2 controller 边界调用 | handoff §1 已设计(controller 边界薄层),Task 36 实施期创建。本 task 实施期 verify 文件已存在 + signature 一致 |

**累积状态**:
- 无条件 6 + 段 4 新增 3 + 段 5 新增 2 + 段 6 新增 3 + **段 5 task 39 新增 1 = 15 项**

(注:G7 编号沿用"段编号-候选号"模式;段 5 新增 G5-1/G5-2 原属于 Task 37 范围,本 G7-1 属 Task 39 范围,编号不冲突)

---

### 6. Task 41 / Task 42 预告

**Task 41 webhook**(段 5 下个 task):
- webhook.routes.ts 改造(25 行 + 可能加 raw body parser middleware verify)
- payment.service.ts handleWebhookEvent 内 5 处 [Task 41 final verify] 落实(R-X1 时序图 / afterCommit hook 适配 × 2 / tx context 类型 / manual capture metadata D59 协调)
- D62 决议正式拍板(Ian 倾向 B,落地依赖见 handoff §"Phase G Task 41 handoff: D62 候选 webhook 幂等" + 2026-04-19 追加的 D62 候选 B 落地依赖)
- 预估 plan ~400-500 行

**Task 42 session-payment + session-settlement**(段 5 末尾 task):
- session-payment.ts:13 JsonStore + 10 itemKey + emit verify + confirmItemPayment deprecated verify
- session-settlement.ts 非 derivePaidState 部分:7 JsonStore + 完整业务函数 async + itemKey 透传 signature
- C6b1 + C6b2 + Task 42 三方原子 commit 协调(C6b2 §4)
- 预估 plan ~400-500 行

---

### 7. 实施 Step(Task 39 实施期指引)

- **Step 1**:grep 基线复核 + C6b1 + C6b2 + Task 38 三方协调 land 状态 verify
- **Step 2**:`split-bill.routes.ts` import 加 `tenantAwareRoute` + `parseItemKey`(若 G7-1 已 land)
- **Step 3**:6 routes handlers 改造(§2.1-§2.6)—— 顺序建议 GET / → POST / (含 itemKey 边界)→ DELETE → POST /pay-card → POST /pay-cash → POST /capture
- **Step 4**:`tsc -b` 验证(routes + service signature 对齐)
- **Step 5**:handoff §2 最终验证(§3 grep 命令)
- **Step 6**:4 道门验证 + commit `feat(phase-5): Task 39 - split-bill routes B2 adaptation + handoff §2 final verify`

**注意**:测试更新归 `__tests__/split-billing-integration.test.ts`(C6b2 §10 已含 FK signature 测试更新),Task 39 routes 改造若引入新行为需追加测试(预期 0 新行为,仅重构)。

---

### 8. commit(本 plan 落地)

```bash
git add docs/superpowers/plans/2026-04-17-phase5-postgres-migration/phase-g-split-bill-routes.md
git commit -m "plan(phase-g): task 39 merged (Task 40 absorbed) - split-bill routes B2 adaptation"
git push origin main
```

**不更新 RESUME / 00-index** —— 等段 5 全部 task(39 + 41 + 42)完成后一次性同步。

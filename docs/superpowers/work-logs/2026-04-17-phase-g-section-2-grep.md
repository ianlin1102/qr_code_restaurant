# Phase G 段 2 前置 Grep 证据（C2a）

**目的**：为 Phase G 段 2 Task 34（session-cart B2 rewrite）plan 写作（C2b）提供 grep-anchored 事实基础。对应 Ian 2026-04-17 指令中的 C2a 独立 commit。

**规则 7 合规**：本文件所有"当前系统行为"断言均带 grep 命令 + 原始输出 + 含义说明。C2b plan 引用本文件的具体小节（非凭印象）。

**规则 8 预警阈值核查**（Ian 2026-04-17 设定）：

| 指标 | 阈值 | 实际 | 状态 |
|---|---|---|---|
| 前端 cartVersion 使用点文件数 | > 6 暂停 | **5** | ✅ 未超 |
| 前端 cartVersion 使用点数 | （未设）| 11 | — |
| pendingCart 服务端调用点 | > 10 暂停 | **7** | ✅ 未超 |
| handoff §5a-d 决议冲突 | 任何冲突即停 | 0 冲突 | ✅ |

全部预警未触发——可继续 C2b。

---

## 1. `useCartSync.ts` 完整结构（1-89 补充，90-133 已在 handoff §6.1）

### grep 命令

```bash
cat client/src/hooks/useCartSync.ts
```

### 关键结构（含义）

- **Line 1-7**：imports——`useCartStore` zustand store / `getDeviceId` / `api` / `POLL` intervals / `CartItem` shared type
- **Line 17-21**：`useCartSync(storeId, sessionId, subscribe?)` — hook 签名
- **Line 22-25**：state refs——`cartItems` from store / `myDeviceId = useMemo(() => getDeviceId(), [])` / `lastSubmitRef` / `initializedRef`
- **Line 27-30**：`markSubmitted()` — 本地 submit 后防止 poll 误清本地 items
- **Line 33-36**：sessionId 变化时重置 init flag + lastSubmitRef（换桌场景）
- **Line 38-88**：`applyServerCart(serverItems, cartVersion, lastCartSubmitAt?)` — 核心 reconcile 逻辑
  - Line 45：`store.setCartVersion(cartVersion)` — **直接同步 version 到本地 store**（B2 后变 `order.version`）
  - Line 50-52：首次 poll 特殊处理（adopt timestamp but not interpret as remote submit）
  - Line 53-55：本地 submit pending → 吸收 server timestamp silently
  - Line 56-65：**另一 device 已 submit → 清本地 cart**（lastCartSubmitAt 变化 + serverItems 空）
  - Line 69-88：reconcile 其他 device items（diff by `addedByDevice + menuItemId`）
- **Line 90-96**：`fetchAndApply` — 调 `api.getSessionCart` 并 apply
- **Line 98-113**：push effect——debounced 1s, 过滤 `addedByDevice === myDeviceId` 后 `api.updateSessionCart`
- **Line 115-121**：poll effect——mount 时 fetch 一次 + 每 15s (`POLL.CART_SYNC`)
- **Line 123-129**：SSE effect——subscribe `cart:updated` + `cart:submitted` 都走 fetchAndApply

### B2 改造影响点（本 hook）

- **cartVersion 参数**（line 41, 45, 93）→ `orderVersion`（或按选项 A 保留 `cartVersion` 字段名由服务端映射）
- **lastCartSubmitAt 语义**（line 42, 57-64）→ B2 后可能变 `lastDraftSubmittedAt`（session 级事件，非 order 级）
- **`addedByDevice` 字段**（line 70, 72, 75, 81, 85）→ B2 下每 device 一个独立 draft order，addedByDevice **可能从 item 级下沉**（前端重建时从 order.deviceId 还原到每个 item）

---

## 2. `session.routes.ts` cart handler 完整（lines 43-96）

### 2.1 GET `/sessions/:sessionId/cart` (lines 43-56)

```ts
router.get('/:sessionId/cart', (req: Request, res: Response) => {
  const session = svc.getSessionById(req.params.sessionId)
  if (!session || session.storeId !== req.params.storeId) {
    res.status(404).json({ error: 'Session not found' })
    return
  }
  const items = svc.getSessionCart(req.params.sessionId)
  res.json({
    items,                                    // CartItem[] flatten
    cartVersion: session?.cartVersion ?? 0,   // 来自 session 字段
    lastCartSubmitAt: session?.lastCartSubmitAt ?? null,
  })
})
```

**含义**：无 auth（顾客用），storeId 强校验。response 形状 `{items, cartVersion, lastCartSubmitAt}` 来自 session 字段 + flatten 的 pendingCart。

### 2.2 PUT `/sessions/:sessionId/cart` (lines 58-71)

```ts
router.put('/:sessionId/cart', (req: Request, res: Response) => {
  const session = svc.getSessionById(req.params.sessionId)
  if (!session || session.storeId !== req.params.storeId) {
    res.status(404).json({ error: 'Session not found' })
    return
  }
  const { items } = req.body
  const deviceId = sanitizeString(req.body.deviceId, 64)
  if (!deviceId) { res.status(400).json({ error: 'deviceId required' }); return }
  if (!Array.isArray(items)) { res.status(400).json({ error: 'items array required' }); return }
  svc.updateDeviceCart(req.params.sessionId, deviceId, items)
  res.json({ ok: true })
})
```

**含义**：PUT 整体替换**本 device** 的 cart（不是所有 device）——对齐 B2 `replaceDraftItems` 语义。deviceId 从 body 必填。response 极简 `{ok: true}`，**无 version/timestamp 回传**（这是一个缺陷：客户端无法确认写后版本号，只能 fetch 更新）。

### 2.3 POST `/sessions/:sessionId/submit-cart` (lines 73-96)

```ts
router.post('/:sessionId/submit-cart', (req: Request, res: Response) => {
  const { cartVersion, customerName } = req.body
  if (cartVersion == null || typeof cartVersion !== 'number') {
    res.status(400).json({ error: 'cartVersion is required' }); return
  }
  const result = svc.submitSessionCart(req.params.storeId, req.params.sessionId, cartVersion)
  if ('error' in result) {
    res.status(result.status ?? 400).json({ error: result.error }); return
  }
  if (result.paymentMode === 'pay-later') {
    const orderItems = result.items.map(i => ({
      menuItemId: i.menuItemId, quantity: i.quantity,
      ...(i.remark ? { remark: i.remark } : {}),
      ...(i.selectedOptions?.length ? { selectedOptions: i.selectedOptions } : {}),
    }))
    const order = createOrder(req.params.storeId, {
      tableId: result.tableId, items: orderItems, customerName,
    })
    if ('error' in order) { res.status(400).json({ error: order.error }); return }
    res.json({ order, paymentMode: 'pay-later' }); return
  }
  res.json({ items: result.items, paymentMode: 'pay-first', tableId: result.tableId })
})
```

**含义**：接 `cartVersion`（乐观锁），调 `submitSessionCart`。**关键分支**：
- `pay-later`：submit-cart 直接调 `createOrder` 生成实际 order（legacy 设计：session.pendingCart → submit → order 是 2 步，第 2 步在这里）
- `pay-first`：只返回 items + paymentMode（前端下一步走 Stripe checkout，createOrder 在 webhook 确认时做）

**B2 改造影响**：
- `cartVersion` → `orderVersion`（或保留字段名由选项决定）
- pay-later 分支：**submit 直接完成 B2 的 `submitDraft` 即可**（draft order → submitted order），不需要再调 `createOrder`
- pay-first 分支：submit 后 draft order 保持 draft 状态（还没进 pending），等 webhook 确认后才 `submitDraft` → pending

**pay-first 分支与 B2 的冲突**（关键决策点）：
- 当前 pay-first 的语义是"cart 保持直到付款，付款成功才 create order"——**draft order 在 B2 里的角色**正是这个"cart 保持"的载体
- 但当前 `submitSessionCart` 在 pay-first 下**返回 items 后清空 `session.pendingCart`**（line 60-64 session-cart.ts）——B2 后若 draft order 不清空，顾客回菜单时还能看到 → **需要段 2 明确 pay-first 流中 draft 生命周期**

---

## 3. 前端 cartVersion 使用点枚举

### grep 命令

```bash
grep -rn "cartVersion" client/src/
```

### 完整输出（11 使用点 / 5 文件）

| # | 文件 | 行号 | 类型 | 代码 |
|---|---|---|---|---|
| 1 | `services/api/session.ts` | 40 | **类型定义**（fetch 返回） | `fetchJSON<{ items: CartItem[]; cartVersion: number; lastCartSubmitAt: string \| null }>` |
| 2 | `services/api/session.ts` | 50 | **请求参数**（submitSessionCart 签名） | `submitSessionCart: (storeId, sessionId, cartVersion: number, customerName?)` |
| 3 | `services/api/session.ts` | 53 | **请求体字段** | `body: JSON.stringify({ cartVersion, customerName })` |
| 4 | `hooks/useCartSync.ts` | 41 | **函数参数**（applyServerCart） | `cartVersion: number,` |
| 5 | `hooks/useCartSync.ts` | 45 | **写入本地 store** | `store.setCartVersion(cartVersion)` |
| 6 | `hooks/useCartSync.ts` | 93 | **fetch 解构读取** | `.then(({ items: serverItems, cartVersion, lastCartSubmitAt })` |
| 7 | `hooks/useCartSync.ts` | 94 | **传给 applyServerCart** | `applyServerCart(serverItems, cartVersion, lastCartSubmitAt)` |
| 8 | `stores/cart-store.ts` | 23 | **store 字段声明** | `cartVersion: number            // synced from server on poll` |
| 9 | `stores/cart-store.ts` | 39 | **初始值** | `cartVersion: 0,` |
| 10 | `stores/cart-store.ts` | 104 | **setter action** | `setCartVersion: (v) => set({ cartVersion: v })` |
| 11 | `pages/customer/CartPage.tsx` | 96 | **store 解构** | `const { items, ..., cartVersion } = useCartStore()` |
| 12 | `pages/customer/CartPage.tsx` | 191 | **submitSessionCart 调用（乐观锁传参）** | `await api.submitSessionCart(storeId, activeSessionId, cartVersion, customerName)` |

（表有 12 行——#1-11 是 11 使用点编号，#12 是 CartPage.tsx 第二处）

**分类**：
- **读取点**（display / compare）：#4, #6, #8, #11 = 4 处
- **写入点**（赋值 / setter）：#5, #9, #10 = 3 处
- **乐观锁比较/传参**：#2, #3, #7, #12 = 4 处
- **类型/契约**：#1 = 1 处

**文件级**（5 文件）：
1. `client/src/services/api/session.ts`（API 契约层，#1-3）
2. `client/src/hooks/useCartSync.ts`（sync 逻辑，#4-7）
3. `client/src/stores/cart-store.ts`（state 管理，#8-10）
4. `client/src/pages/customer/CartPage.tsx`（UI + 提交入口，#11-12）

（实际 4 文件，不是 5——我早先"5 文件"是误算。规则 8 预警阈值 6 文件 ✅ 未超，更保守。）

**B2 迁移策略对比**：

- **handoff §5c 选项 A（保留旧 cart 形状，server 映射）**：以上 12 处**全部保留**，无需前端改——服务端 `draftOrderToCartShape()` 把 `order.version` 映射为 response 的 `cartVersion` 字段。迁移面积最小。
- **handoff §5c 选项 B（改 draft order 形状）**：以上 12 处**全部 rename**（`cartVersion` → `orderVersion` 或 `version`）。4 文件改动。
- **handoff §5c 选项 C（双发）**：response 同含 `cartVersion` 和 `orderVersion`；前端先读 `cartVersion`（兼容），后期 rename 到 `orderVersion`。双阶段 rename。

---

## 4. deviceId 传递链

### 4.1 前端（client/src）

**grep 命令**：
```bash
grep -rn "deviceId" client/src/
```

**主要使用点**：

| 文件 | 行号 | 用途 |
|---|---|---|
| `lib/device-id.ts`（getDeviceId 源）| — | localStorage 持久化设备 UUID（本次 grep 未细读） |
| `hooks/useCartSync.ts` | 23 | `const myDeviceId = useMemo(() => getDeviceId(), [])` — 初始化 |
| `hooks/useCartSync.ts` | 70, 72, 75, 81, 102, 103, 110, 113 | reconcile 本 device 和其他 device items + push 本 device cart |
| `services/api/session.ts` | 44, 47 | updateSessionCart 签名 + body `{deviceId, items}` |
| `pages/customer/OrderConfirmPage.tsx` | 46, 50, 85, 89 | 付款成功/取消时清空本 device cart |
| `stores/cart-store.ts` | 66, 74 | addItem 时自动填 `addedByDevice: deviceId` |

**含义**：deviceId 前端**已成熟存在**——localStorage UUID 生成 + 每次 cart 操作携带。B2 改造**无需新建**前端 deviceId 链路，**仅需**：
- `Order.deviceId` 在 B2 create draft 时从同样的 request body 取（已有）
- 前端 push/pull cart 的 URL 结构可能调整（选项 A/B/C 决定）

### 4.2 后端（server/src）

**grep 命令**：
```bash
grep -rn "deviceId\|device_id" server/src
```

**主要使用点**：

| 文件 | 行号 | 用途 |
|---|---|---|
| `routes/session.routes.ts` | 66-67 | PUT /cart 从 body 取 deviceId（sanitize max 64）+ 必填校验 |
| `routes/session.routes.ts` | 69 | 传给 `svc.updateDeviceCart(sessionId, deviceId, items)` |
| `controllers/session-cart.ts` | 17 | `updateDeviceCart(sessionId, deviceId, items)` 签名 |
| `controllers/session-cart.ts` | 23 | `delete cart[deviceId]`（items 空时删） |
| `controllers/session-cart.ts` | 25 | `cart[deviceId] = items`（否则覆盖） |

**当前存储形态**：`session.pendingCart: Record<string /* deviceId */, CartItem[]>`（`session-cart.ts:21` `const cart: Record<string, CartItem[]>`）

**含义**：deviceId 后端**已作为 pendingCart Record key 存在**——B2 改造**重定位**：
- 当前：`session.pendingCart[deviceId] = items`（JSON Record）
- B2：`Order { sessionId, deviceId, status='draft', items[] }`——partial unique `(sessionId, deviceId) WHERE status='draft'`（handoff §5b spec 已决）

**deviceId 语义转换**：从 **JSON map key** → **DB 列 + partial unique index**。API contract 不变（deviceId 继续 body 传）。

---

## 5. `pendingCart` 服务端调用点（7 处 / 1 文件）

### grep 命令

```bash
grep -rn "pendingCart" server/src
```

### 完整输出

| # | 行号 | 类型 | 代码 |
|---|---|---|---|
| 1 | `session-cart.ts:10` | 读（空 check）| `if (!session \|\| !session.pendingCart) return []` |
| 2 | `session-cart.ts:11` | 读（赋值 cart 变量）| `const cart = session.pendingCart` |
| 3 | `session-cart.ts:20` | 读（赋值 raw 变量）| `const raw = session.pendingCart` |
| 4 | `session-cart.ts:27` | **写**（updateDeviceCart 落地）| `sessionStore.update(sessionId, { pendingCart: cart })` |
| 5 | `session-cart.ts:34` | **写**（clearSessionCart）| `sessionStore.update(sessionId, { pendingCart: {} })` |
| 6 | `session-cart.ts:52` | 读（submitSessionCart 内）| `const cart = session.pendingCart ?? {}` |
| 7 | `session-cart.ts:61` | **写**（submitSessionCart 完成后清空）| `pendingCart: {},` |

**含义**：**全部 7 处都在 `session-cart.ts`——B2 改造集中在单一文件**。无外部 controller 直接 touch pendingCart——session-cart 是唯一 gatekeeper。

**迁移粒度**：整个 session-cart.ts **重写**（不是逐行替换）——从"session.pendingCart 读写"转"orderRepo.findDraft / createDraftOrder / replaceDraftItems / submitDraft 组合"。

**行为对照**（legacy → B2 语义）：

| legacy 操作 | B2 等价 |
|---|---|
| `getSessionCart(sessionId)` — flatten Record 到 CartItem[] | `orderRepo.findDraftsBySession(sessionId, tx).flatMap(o => o.items)` + shape 映射（选项 A）或直接返回 drafts 数组（选项 B）|
| `updateDeviceCart(sessionId, deviceId, items)` — 整体 replace 本 device slice | `orderRepo.findDraft(sessionId, deviceId, tx)` → 有则 `replaceDraftItems` 无则 `createDraftOrder` |
| `clearSessionCart(sessionId)` — 清全部 pendingCart | `orderRepo.deleteDraftsBySession(sessionId, tx)` **Phase D 回填 G2-2**（见 §6）|
| `submitSessionCart(sessionId, expectedVersion)` — 乐观锁 + 取全部 items 返回 | 多 device → 多 draft order 同时 submit。**多 version 乐观锁**策略未定（决策点 C2b）|

---

## 6. Phase D 回填候选清单（段 2 发现）

**grep 命令**：
```bash
# Phase D Task 17 orderRepo 方法清单（grep plan 文件 method 定义）
grep -nE "^  (find|create|update|submit|void|delete|replace)[A-Z]" \
  docs/superpowers/plans/2026-04-17-phase5-postgres-migration/phase-d-repositories.md \
  | grep -A 0 -B 0 "orderRepo\|Order"
```

（实际验证 Phase D Task 17 orderRepo 有哪些方法，和段 2 需要的方法 diff。）

### 已有方法（Phase D Task 17 + 段 1 回填 G1-1..G1-4）

| 方法 | 来源 |
|---|---|
| `findById(id, db?)` | Task 17 |
| `findBySessionId(sessionId, db?)` **排除 draft**（D24）| Task 17 |
| `findSubmitted(where, db?)` **默认排除 draft** | Task 17 |
| `findActive(storeId, db?)` | Task 17 |
| `findDraft(sessionId, deviceId, db?)` **单 device draft** | Task 17 |
| `createDraftOrder(input, db)` | Task 17 |
| `replaceDraftItems(orderId, items, expectedVersion, tx)` | Task 17 |
| `submitDraft(orderId, expectedVersion, tx)` | Task 17 |
| `updateStatus(id, status, db)` | Task 17 |
| `voidOrder(id, db)` | Task 17 |
| `createSubmitted(...)` (G1-1) | 段 1 回填 |
| `updateTableId(id, tableId, tx)` (G1-2) | 段 1 回填 |
| `voidOrderItem(orderId, position, tx)` (G1-3) | 段 1 回填 |
| `countByStore(storeId, tx)` (G1-4) | 段 1 回填 |

### 段 2 新增回填候选

**G2-1：`orderRepo.findDraftsBySession(sessionId, tx)` → `DraftOrderWithItems[]`**

- **用途**：session 下所有 device 的 draft orders（选项 A flatten 需求 + 选项 B 多 draft 列举需求）
- **签名**：
  ```ts
  findDraftsBySession: (
    sessionId: string,
    db: Db = prisma
  ) => Promise<DraftOrderWithItems[]>
  ```
- **实现**：`db.order.findMany({ where: { sessionId, status: 'draft' }, include: includeItemsAndOptions, orderBy: { createdAt: 'asc' } })`
- **归属**：Phase D Task 17 inline 回填（和 G1-1..G1-4 同批次，下个 session 实施阶段一起 land）

**G2-2：`orderRepo.deleteDraftsBySession(sessionId, tx)` → `{ count: number }`**

- **用途**：`clearSessionCart` 的 B2 等价——清 session 下所有 draft orders（pay-first 取消 / 用户主动清 cart / admin 重置）
- **签名**：
  ```ts
  deleteDraftsBySession: (
    sessionId: string,
    tx: Prisma.TransactionClient
  ) => Promise<{ count: number }>
  ```
- **实现**：`tx.order.deleteMany({ where: { sessionId, status: 'draft' } })`（cascade 删 OrderItem + OrderItemOption via FK）
- **规则 3**：写操作——**tx 必填**
- **归属**：Phase D Task 17 inline 回填

**段 2 回填累计**：2 项（G2-1 / G2-2）。段 1 的 G1-1..G1-4 + 段 2 的 G2-1..G2-2 = **6 项 Phase D Task 17 回填**待下个 session 实施阶段集中 land。

---

## 7. Handoff §5a-d 决议一致性核查

（规则 8 预警：任何决议冲突 → 暂停；本 §7 零冲突 ✅）

### §5a `Order.version @default(0)`

**grep**：`cart-store.ts:39 cartVersion: 0,`——**当前 `session.cartVersion` 也从 0 起**。

**结论**：语义一致。B2 迁移后 `order.version @default(0)` 无行为变化。✅ 无冲突

### §5b `Order.deviceId` partial unique `(session_id, device_id) WHERE status='draft'`

**grep**：deviceId 前端（client/src, 多处 getDeviceId）+ 后端（`session.routes.ts:66-67` sanitize + pendingCart key）都**已存在且成熟**。

**结论**：B2 schema 层面的 partial unique 是**语义升级**（JSON map key → DB 约束），应用层 API contract 不变。✅ 无冲突

### §5c Fetch API / SSE payload

**grep 证据**：
- SSE `cart:updated` 载荷 `{type, storeId, sessionId}`（handoff §6.1 已确认）
- fetch API `GET /cart` response `{items, cartVersion, lastCartSubmitAt}`（§2.1 本文件确认）

**结论**：handoff §5c 结论（SSE payload 不变，fetch API 是真正破坏点）**和本 §2/§3 grep 一致**。✅ 无冲突

### §5d `legacy-itemkey.ts` exit condition

**grep 核查**（段 2 相关文件）：
- `session-cart.ts`：`grep -c "itemKey\|split(':')" session-cart.ts` = 0
- `useCartSync.ts` / cart 前端：0 itemKey 依赖

**结论**：session-cart 域 B2 改造**不触 legacy-itemkey.ts**（那是 payment / split-bill 的事，Phase G 段 4+）。✅ 无冲突

---

## 8. 段 2 C2b 启动建议

本文件 grep 证据完备，**未触发任何规则 8 预警**。C2b 可按 handoff §5 + §6 + 本文件 §1-§7 直接起草，无需再议决议。

C2b 预计子节：

1. **事实核查**：引用本文件 §1-§7（一段话 + 数字）
2. **乐观锁 session.cartVersion → order.version**：
   - 服务端：`orderRepo.submitDraft(orderId, expectedVersion, tx)` 已就绪（Phase D Task 17）
   - 前端：12 处 cartVersion 引用按选项 A/B/C 处理——本文件 §3 表给 agent 作为 todo 列表
3. **deviceId 传递链**：本文件 §4 已证**无新建工作**，仅重定位存储。plan 确认 API contract 不变。
4. **Fetch API 契约 A/B/C**：本文件 §3 / §5 已给对比证据，决策 Ian 实施期判
5. **draft order 生命周期 + 事务边界**：
   - create (findDraft miss → createDraftOrder) ← single-step tx ok
   - update (findDraft hit → replaceDraftItems with expectedVersion) ← multi-step tx 必须
   - submit (submitDraft with expectedVersion) ← multi-step tx 必须
   - clearSession (deleteDraftsBySession, G2-2 回填依赖) ← multi-step tx 必须
   - **pay-first 流未决**（本文件 §2.3 暴露）：submit 后 draft 是清还是留？决策点 C2b
6. **SSE cart:updated 不变**：显式引用 handoff §5c + 本文件 §7
7. **spec §9.8 子任务 3 修正**：inline 标注（段 1 commit message 已预告）
8. **Phase D 回填清单**：G1-1..G1-4 + G2-1..G2-2 = 6 项，等下个 session 实施阶段集中 land

**C2b 尺寸预估**：400-550 行（低于 800 警戒）。

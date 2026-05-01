# QR Code 扫码点餐 — 项目规范

## 项目背景

QR 扫码点餐 SaaS 系统，多租户（每个餐厅 = 一个 Tenant）。
MVP 阶段：JSON 文件存储，迁移路径 → PostgreSQL（Prisma schema 已定义）。
技术栈：React + Vite + TypeScript / Express + TypeScript / pnpm Monorepo。

---

## 架构原则

- 共享类型统一在 `shared/types.ts`，前后端不重复定义
- API 路径必须带 `storeId`：`/api/stores/:storeId/...`
- 价格用**分（cents）**存储，前端 `/100` 展示，禁止浮点数
- 前端：pages/ → components/ → hooks/ → stores/(Zustand) → services/api.ts → lib/
- 后端：routes/(参数解析) → controllers/(业务逻辑) → repositories/(数据访问)
- JsonStore 单例集中在 `repositories/stores.ts`，禁止在其他地方创建实例
- 单文件 ≤200 行，单函数 ≤50 行

---

## Do NOT

- **不动 `bee/`** — 旧版小程序参考，不参与构建
- **不改 webhook 签名验证** — `webhook.routes.ts` 使用 raw body parser
- **不把 `express.json()` 放在 webhook 路由前** — webhook 需要 raw body
- **不直接操作 `server/data/*.json`** — 通过 `json-store.ts` 读写，直接改文件后必须重启
- **不在 routes/ 写业务逻辑** — 路由只做参数解析+响应
- **不在页面组件调 fetch** — 用 `services/api.ts`
- **不用浮点数存价格** — 全部整数（分）
- **不在 `shared/types.ts` 外定义共享类型**
- **不用 fallback 默认值替代环境变量** — 关键配置缺失必须 throw
- **不绕过 RBAC** — 受保护端点用 `requirePermission()`，不用旧 `requireRole()`

---

## Key Conventions

- **支付流程**: PaymentIntent 创建 → Stripe 支付 → webhook 确认 → 才执行副作用（创建订单/标记已付）。Tip 独立于菜品金额，Payment.tipAmount 记录小费
- **分账系统**: SplitBill 实体（by-item/by-percent），主账单隐式存在（未分配的 items）。支持 Stripe manual capture（签单写小费）
- **订单状态**: pending → confirmed → preparing → served → (closed)。`served` ≠ 已结账，结账逻辑不能排除 served
- **Session 是桌台的 source of truth**: 有 currentSessionId → 显示该 session 订单；无 → 空
- **菜品行价格**: `(item.price + Σ opt.priceAdjust) * item.quantity`，永远不要用 `item.price * quantity`
- **金额计算唯一数据源**: 所有金额显示从 server session summary 读取，前端不独立算税/remaining
- **i18n 双系统**: 顾客端 react-i18next（JSON），管理端 `useT()` hook（admin.ts 内联）
- **RBAC**: Permission 类型 18 种权限（6 个模块：core/analytics/coupons/waitlist/staff-management/printer），JWT 携带 permissions 数组，NavItem 通过 perm 字段过滤。模块注册在 `shared/modules.ts`，`server/src/lib/module-permissions.ts` 按店铺许可过滤
- **SSE 实时事件**: `event-bus.ts` 发布 AppEvent → `sse.ts` 路由到 SSE 客户端。两种作用域：session-scoped（顾客/结算页）和 store-scoped（管理端）。事件类型：`session:summary`、`order:created`、`order:updated`、`cart:updated`、`cart:submitted`、`split:changed`、`store:tables`、`store:orders`。SSE 为主通道，轮询为降级备用。nginx 需配置 `proxy_buffering off` + 长超时
- **共享计算库**: `@qr-order/shared/pricing` 提供纯函数（unitPrice/lineTotal/calcTax/calcBillSummary/calcSplitByItem 等），server 和 client 共用，有 vitest 测试覆盖
- **Session 付清不自动关闭**: 付清后不再自动 close session。安全网定时器（`auto-close.ts`）每 5 分钟检查，仅在付清且 15 分钟无活动后才自动关闭过期 session。管理员通过 `closeSession` action 显式关闭
- **Docker**: `restart` 不重读代码/env，必须 `down && up -d --build`。本地 Stripe 需 `stripe listen --forward-to localhost:3001/api/webhook/stripe`

---

## 防御规则（历史 Bug 总结）

### 结算操作必须经过 Settlement Gateway
所有结算操作必须通过 `settlement/gateway.ts` 的 `executeSettlement()` 入口。Gateway 负责加载 SettlementContext、分发到 `actions/` 下的具体 action（pay-items, pay-percent, cash-payment, add-payment, create-split, delete-split, pay-split, close-session, reopen-session）、重新计算 allowedActions、发射 SSE 事件、记录日志。不要直接从路由调用 service 函数。`settlement/rules.ts` 提供 check* 校验函数，`settlement/mode.ts` 在 split 删除/失效后重算 settlementMode，`settlement/allowed-actions.ts` 计算当前合法操作。

### 前端 UI 由 allowedActions 控制
前端不自己判断操作是否合法，只读 API 响应中的 `allowedActions` 来显示/隐藏按钮。错误响应也带 `allowedActions`，收到就更新 UI。

### totalPaid 不含小费
`addPayment` 的第 6 参数是 tipAmount，`totalPaid += amount - tip`。小费记录在 Payment.tipAmount 上但不影响 remaining 计算。

### remaining 在 by-item 模式下从未付菜品计算
`getSessionSummary` 在 `settlementMode === 'by-item'` 时，remaining = 未付菜品 subtotal + tax，不是 `totalWithTax - totalPaid`。这避免了历史支付误差累积。

### 副作用必须在确认后执行
`payByItems` 是纯计算器，不改数据。`confirmItemPayment` 只在 webhook 确认支付后由 server 调用。前端传的 amount 只是"请求金额"，server 有权拒绝或调整。

### Split 支付后更新 paidItemIds
`paySplitBillCard/Cash` 支付后调用 `markSplitItemsPaid(sb)` 将 split 的 itemKeys 加入 session.paidItemIds。这样 by-item remaining 计算能反映 split 已付菜品。

### 支付后自动失效冲突 Split
`split-bill-invalidation.ts` 的 `invalidateConflictingSplits()` 在 webhook 确认支付后调用。by-item split 若 itemKeys 与已付菜品重叠则删除；by-percent split 若 remaining 金额变化导致 subtotal 偏差则删除。删除后调用 `recalculateMode()` 重算 settlementMode。

### payByPercent 不双重征税
`payByPercent` 的 `remaining` 已含税。返回的 `amount` 直接按 remaining 比例切割，不额外算税。tax/serviceFee 是反推显示值。

### 重命名/改签名后的检查
1. `grep -r "旧名字" client/ server/ shared/` — 包括 useEffect 依赖数组
2. `tsc --noEmit`（client + server）
3. React hooks 依赖数组中的变量名 TypeScript 不检查

### Agent/并行修改后
1. `cd client && ./node_modules/.bin/tsc -b`（Docker 用 `tsc -b`，比 `--noEmit` 更严格）
2. `cd server && ./node_modules/.bin/tsc --noEmit`（Express 类型问题是预期的）
3. 0 新增 error 才算完成

### 同一概念统一过滤逻辑
"活跃订单"在所有页面必须用相同过滤。改一处时 grep 搜索所有使用同概念的地方。

### 管理端 vs 顾客端 API
管理端用 `getMenuItems`（含 staffOnly），顾客端用 `getMenu`（过滤 staffOnly）。

### SSE + 轮询双通道
前端 hooks 优先走 SSE（`useSessionEvents`/`useStoreEvents`），同时保留低频轮询作为降级。`useSettlementPoll` 整合两者：SSE 事件触发 `refresh()`，轮询间隔 10s（结算弹窗）或 30s（支付状态）。`useCartSync` 处理多设备共享购物车同步（push 本设备变更 + SSE/poll 其他设备变更）。

### Settlement Gateway 发射 SSE 事件
`executeSettlement()` 成功后自动 `emit()` 相关事件。所有结算操作发 `session:summary` + `store:orders`；split 相关操作额外发 `split:changed`；close/reopen 额外发 `store:tables`。不需要在 routes 手动发事件。

---

## 设计约束 / Design Constraints

### Cart Merge Key 必须覆盖所有用户可见区分字段

**Rule**: 当定义"合并键"用于 entity merging（cart 的 addItem 把同款合并 + quantity 累加）时，必须穷举枚举**所有用户可见且可不同的字段**。任何 UI 上可见且用户输入会不同的字段，**必须参与 key**。否则 "add same dish with different input" 会静默合并并通过 spread operator 覆盖后续输入。

**Failure mode**:
- 用户加 冰红茶 quick tag "不要加盐"
- 用户加 冰红茶 quick tag "不要加味精"（期望 2 个独立 entry）
- 旧逻辑: match key = `menuItemId + selectedOptions only` → 2 items 合并成 quantity=2，"不要加味精" 静默丢失
- Fix (commit a58930a7): include trimmed remark in match key

**General principle (推广到任何 derived match key)**:
> 当为 entity merging 定义 derived match key，必须穷举所有 user-visible distinguishing fields。如果某字段在 UI 可见且用户输入可不同，**必须**进 key。Tests 应包含 "same entity, different optional field value" cases。

**Files affected**:
- `client/src/stores/cart-store.ts` — addItem() match logic (3-tuple: menuItemId + sortedSelectedOptions + trimmedRemark)
- 任何未来在 user-input entity 上加 "merge by key" 逻辑的代码

---

## 安全待修复（P0）

- **凭据泄漏**: AWS Key、Stripe Secret、DB 密码在 `.env` 和 git 历史中，需轮换 + `git filter-repo` 清除
- **输入校验缺失**: 数值字段无 typeof/isFinite、字符串无 maxLength、express.json() 无 body limit
- **多租户隔离**: `getMenuItemById` 无 storeId 过滤（可跨店下单）、`optionalAuth` 允许 storeId 缺失
- **JsonStore 并发**: read-modify-write 非原子，并发请求可覆盖写入

---

## 技术债

- Prisma 迁移未执行（仅 Store/StoreUser 已定义）
- api.ts 超 500 行需拆分
- 多个文件 >200 行待拆分
- `useCartSync` 内有重复的 poll/SSE 处理逻辑需抽取
- S3 bucket/URL 硬编码、货币硬编码 `'usd'`

> Last updated: 2026-04-09

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
- **RBAC**: Permission 类型 9 种权限，JWT 携带 permissions 数组，NavItem 通过 perm 字段过滤
- **Docker**: `restart` 不重读代码/env，必须 `down && up -d --build`。本地 Stripe 需 `stripe listen --forward-to localhost:3001/api/webhook/stripe`

---

## 防御规则（历史 Bug 总结）

### 结算操作必须经过 Settlement Gateway
所有结算操作（payByItems, payByPercent, createSplit, paySplit, cashPayment 等）必须通过 `settlement/gateway.ts` 的 `executeSettlement()` 入口。不要直接从路由调用 service 函数。Gateway 负责校验、执行、计算 allowedActions、记录日志。Service 函数是 trusted internal，不做校验。

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

---

## 安全待修复（P0）

- **凭据泄漏**: AWS Key、Stripe Secret、DB 密码在 `.env` 和 git 历史中，需轮换 + `git filter-repo` 清除
- **输入校验缺失**: 数值字段无 typeof/isFinite、字符串无 maxLength、express.json() 无 body limit
- **多租户隔离**: `getMenuItemById` 无 storeId 过滤（可跨店下单）、`optionalAuth` 允许 storeId 缺失
- **JsonStore 并发**: read-modify-write 非原子，并发请求可覆盖写入

---

## 技术债

- Prisma 迁移未执行（仅 Store/StoreUser 已定义）
- api.ts 超限需拆分
- 多个文件 >200 行待拆分
- 自定义 Hooks 不完整（数据获取逻辑仍在页面中）
- S3 bucket/URL 硬编码、货币硬编码 `'usd'`

> Last updated: 2026-04-05

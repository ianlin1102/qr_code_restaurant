# QR Code 扫码点餐 — 项目规范

## 项目背景

QR 扫码点餐 SaaS 系统，目标是支持多租户（每个餐厅 = 一个 Tenant）。
当前阶段：MVP，JSON 文件存储，未来迁移路径：SQLite → PostgreSQL。
技术栈：React + Vite + TypeScript（前端）/ Express + TypeScript（后端）/ pnpm Monorepo。

---

## 架构原则

### 全局
- 所有共享类型定义在 `shared/types.ts`，前后端不得重复定义类型
- 所有 API 路径必须带 `storeId` 前缀：`/api/stores/:storeId/...`
- 价格统一用**分（cents）**存储，前端展示时 `/100`，绝不用浮点数存价格

### 前端（client/）
- 页面组件放 `pages/`，不用 `views/`
- 可复用 UI 组件放 `components/`，shadcn 组件放 `components/ui/`
- 数据获取逻辑封装成自定义 Hook，放 `hooks/`，不直接在页面里写 useEffect fetch
- HTTP 调用全部集中在 `services/api.ts`，页面不直接调用 fetch
- 全局状态用 Zustand，放 `stores/`
- 工具函数放 `lib/`

### 后端（server/）
- 路由只负责接收请求和返回响应，放 `routes/`
- 业务逻辑放 `controllers/`，不写在 routes 里
- 数据访问层放 `repositories/`，controllers 不直接操作 JSON 文件
- 中间件放 `middleware/`（租户验证、错误处理等）
- `app.ts` 只负责配置 Express（注册路由和 middleware）
- `server.ts` 只负责 `listen()`，启动服务器

### 目录结构参考

```
client/src/
├── components/
│   └── ui/           # shadcn 组件
├── pages/
│   ├── customer/
│   └── admin/
├── hooks/            # 自定义 Hook（useMenu, useOrders 等）
├── stores/           # Zustand（session-store, cart-store）
├── services/         # HTTP 客户端（api.ts）
└── lib/              # 工具函数（format.ts, utils.ts）

server/src/
├── routes/           # 路由入口
├── controllers/      # 业务逻辑
├── repositories/     # 数据访问层
├── middleware/        # 中间件
├── app.ts            # Express 配置
└── server.ts         # 启动入口
```

---

## 多租户扩展规范

当前 MVP 阶段通过 URL 参数传递 `storeId`，未来正式多租户需要注意：

- 每个查询必须带 `storeId` 过滤，不能跨租户读取数据
- 未来加 Row-Level Security 时，所有查询必须通过 `repositories/` 层，不能绕过
- 订阅状态变更（取消订阅）必须立即阻断该 `storeId` 的所有 API 请求
- 新增租户相关字段统一在 `shared/types.ts` 的 `Store` interface 上扩展

---

## 代码质量规范

- 单个文件不超过 **200 行**，超过必须拆分
- 单个函数不超过 **50 行**
- 一个文件只做一件事（单一职责）
- 禁止在 `routes/` 里写业务逻辑
- 禁止在页面组件里直接调用 `fetch`
- 禁止硬编码价格、storeId、tableId 等业务数据

---

## 架构检查 Skill

当我说**「架构检查」**时，按以下步骤执行，不要跳过任何步骤：

### Step 1 — 收集结构数据（只看数字，不读代码内容）

```bash
# 所有 ts/tsx 文件行数，按行数降序排列
find . -type f \( -name "*.ts" -o -name "*.tsx" \) \
  | grep -v node_modules | grep -v ".d.ts" \
  | xargs wc -l | sort -rn | head -30

# 每个文件的 import 数量
find . -type f \( -name "*.ts" -o -name "*.tsx" \) \
  | grep -v node_modules \
  | xargs grep -c "^import" 2>/dev/null | sort -t: -k2 -rn | head -20
```

### Step 2 — 生成问题清单

基于 Step 1 数据，输出以下格式：

```
🔴 需要立即拆分（>300 行或 import >12 个）
   - 文件路径（X 行，Y 个 import）

🟡 需要关注（200-300 行或 import 8-12 个）
   - 文件路径（X 行，Y 个 import）

🟢 正常
   - 文件数量（不逐一列出）

⚠️  架构违规
   - 列出不符合架构原则的文件（如 views/ 命名、routes 里有业务逻辑等）
```

### Step 3 — 深入分析问题文件

对每个 🔴 文件：
1. 读取文件内容
2. 识别这个文件现在做了几件不同的事
3. 给出具体拆分方案：
   - 拆成哪几个文件
   - 每个新文件的职责是什么
   - 大致的文件名

### Step 4 — 输出重构优先级

```
立即处理：（影响可读性和扩展性）
下一阶段：（技术债，不紧急）
多租户前必须完成：（不改会影响扩展）
```

---

## 生成代码规范

每次生成代码时，自动检查：

- [ ] 新文件是否放在正确的目录层级？
- [ ] 是否复用了 `shared/types.ts` 里已有的类型？
- [ ] API 路径是否带了 `storeId` 前缀？
- [ ] 价格字段是否用整数（分）？
- [ ] 页面组件是否直接调用了 fetch（应该用 services/api.ts）？
- [ ] 新增业务逻辑是否写在了正确的层（controllers 不是 routes）？

如果有违规，**在生成代码之前先指出**，确认后再生成。

---

## 迁移路径备忘

```
现在：   JSON 文件存储（json-store.ts / repositories/）
下一步：  SQLite + Prisma（只改 repositories/ 层，其他不动）
上线：    PostgreSQL + Prisma + Row-Level Security
```

换数据库时只改 `repositories/`，`controllers/` 和 `routes/` 不需要动。

---

## 不熟悉的库 — 自动生成 Skill

当你遇到项目中使用的库/框架，但你对其 API 或最佳实践不够熟悉时，用 `skill-seekers` 抓取官方文档生成知识：

```bash
# 1. 抓取文档（替换为实际文档 URL）
skill-seekers create <文档URL> -p quick

# 2. 打包成 Claude 可读格式
skill-seekers package output/<name>/ --target claude

# 3. 读取生成的 SKILL.md 内容作为参考
```

使用场景举例：
- 遇到不熟悉的 npm 包，先抓取其文档再写代码
- 需要使用某个库的高级 API 但不确定用法时
- 用户指出你对某个库的理解有误时

注意：需要用户确认后再执行抓取，不要未经同意自动运行。

---

<!-- ============================================================ -->
<!-- 以下 sections 由自动扫描生成，请勿手动编辑                         -->
<!-- ============================================================ -->

## Project Overview

QR 扫码点餐 SaaS 系统 — 顾客扫桌台二维码浏览菜单、选规格下单、Stripe 在线支付（含小费）；管理端实时看板处理订单、管理菜品/分类/桌台/门店设置。

**Monorepo 结构（pnpm workspace）：**

| 包 | 路径 | 职责 |
|---|------|------|
| `client` | `client/` | React 前端（Vite + React Router），顾客端 + 管理端 |
| `@qr-order/server` | `server/` | Express 后端，REST API + Stripe webhook |
| `@qr-order/shared` | `shared/` | 共享 TypeScript 类型定义（`types.ts`） |
| *(archive)* | `bee/` | 旧版微信小程序（参考用，不参与构建） |

---

## Tech Stack

### 前端（client/）
- **框架**: React 19.2 + Vite 7.3 + TypeScript 5.9
- **路由**: React Router DOM 7.13
- **UI 库**: shadcn/ui (radix-ui 1.4) + Tailwind CSS 4.2 + Lucide React 0.577 icons
- **状态管理**: Zustand 5（session-store, auth-store, cart-store, admin-lang-store）
- **i18n**: i18next 25 + react-i18next 16 + i18next-browser-languagedetector 8（中英双语）
- **支付**: @stripe/react-stripe-js 5 + @stripe/stripe-js 8
- **字体**: @fontsource/inter, @fontsource/plus-jakarta-sans
- **其他**: qrcode.react 4（QR 码生成）, uuid 11, class-variance-authority 0.7

### 后端（server/）
- **框架**: Express 4 + TypeScript（tsx watch 热重载）
- **ORM**: Prisma 6.19（schema 已定义，当前 MVP 仍用 JSON 文件存储）
- **数据库**: PostgreSQL 16（docker-compose，Prisma schema 已就绪）
- **认证**: JWT (jsonwebtoken 9) + bcryptjs 3
- **支付**: Stripe SDK 20（PaymentIntent + Webhook）
- **存储**: AWS S3 (@aws-sdk/client-s3 3，图片上传)
- **日志**: Pino 10 + pino-pretty 13 + Morgan 1
- **文件上传**: Multer 2（JPEG/PNG, 5MB 限制）
- **环境变量**: dotenv 16

### 部署
- **容器**: Docker Compose（postgres + adminer + server + nginx）
- **前端**: Nginx 容器，Vite 构建静态文件
- **后端**: Node.js 容器，tsx watch
- **数据库**: PostgreSQL 16-alpine，Adminer 管理界面（:8081）

---

## Current Database Schema

> Prisma schema 位于 `server/prisma/schema.prisma`，当前 MVP 仍用 JSON 文件，Prisma 迁移待执行。

### Store（门店）
```
id           String    @id @default(uuid())
name         String
description  String?
openingHours String?
announcement String?
logo         String?
createdAt    DateTime
updatedAt    DateTime
→ has many StoreUser
```

### StoreUser（门店用户）
```
id        String   @id @default(uuid())
username  String
password  String
role      String   @default("staff")   // 'owner' | 'staff'
storeId   String   → Store.id
createdAt DateTime
@@unique([storeId, username])
```

> **注意**：Menu/Category/Table/Order 等模型尚未迁移到 Prisma，仍在 JSON 文件中（`server/data/*.json`），类型定义在 `shared/types.ts`。

---

## API Routes

**Base URL**: `/api` — Vite dev proxy 转发到 `localhost:3001`

### 健康检查
| Method | Path | Auth | 说明 |
|--------|------|------|------|
| GET | `/api/health` | - | 服务状态检查 |

### 认证 `/api/stores/:storeId/auth`
| Method | Path | Auth | 说明 |
|--------|------|------|------|
| POST | `/login` | - | 管理员登录（用户名+密码） |
| GET | `/me` | JWT | 获取当前用户信息 |

### 门店 `/api/stores/:storeId`
| Method | Path | Auth | 说明 |
|--------|------|------|------|
| GET | `/` | - | 获取门店信息 |
| PUT | `/` | JWT | 更新门店信息（名称/描述/营业时间/公告/autoAcceptOrders） |

### 菜单 `/api/stores/:storeId/menu`
| Method | Path | Auth | 说明 |
|--------|------|------|------|
| GET | `/` | - | 顾客菜单（仅上架，含分类） |
| GET | `/items` | JWT | 管理端所有菜品（含下架） |
| POST | `/items` | JWT | 添加菜品 |
| PUT | `/items/:itemId` | JWT | 修改菜品 |
| DELETE | `/items/:itemId` | JWT | 删除菜品 |
| GET | `/categories` | JWT | 所有分类 |
| POST | `/categories` | JWT | 添加分类 |
| PUT | `/categories/:catId` | JWT | 修改分类 |
| DELETE | `/categories/:catId` | JWT | 删除分类 |

### 桌台 `/api/stores/:storeId/tables`
| Method | Path | Auth | 说明 |
|--------|------|------|------|
| GET | `/` | JWT | 获取所有桌台 |
| GET | `/:tableId` | - | 获取单个桌台（顾客扫码用） |
| POST | `/` | JWT | 创建桌台 |
| PUT | `/:tableId` | JWT | 修改桌台 |
| DELETE | `/:tableId` | JWT | 删除桌台（占用中不可删） |
| POST | `/:tableId/settle` | JWT | 结账（所有订单→completed，桌台→idle） |
| POST | `/:tableId/close` | JWT | 关台（订单→closed，桌台→idle） |

### 订单 `/api/stores/:storeId/orders`
| Method | Path | Auth | 说明 |
|--------|------|------|------|
| POST | `/` | - | 创建订单（验证菜品+计算总价+更新桌台） |
| GET | `/` | optionalAuth | 订单列表（未认证需 tableId；可选 ?status=&tableId= 筛选） |
| PATCH | `/:orderId/status` | JWT | 更新订单状态 |
| POST | `/:orderId/transfer` | JWT | 转桌（将订单移到目标桌台） |
| PUT | `/:orderId/items` | JWT | 修改订单项（增删菜品/改规格/重算价格） |

### 支付
| Method | Path | Auth | 说明 |
|--------|------|------|------|
| POST | `/api/stores/:storeId/checkout` | - | 创建 Stripe PaymentIntent（新购物车或已有未付订单 orderIds），支持 tipAmount |
| POST | `/api/webhook/stripe` | - | Stripe webhook（payment_intent.succeeded 时创建订单） |

### 数据分析 `/api/stores/:storeId/analytics`
| Method | Path | Auth | 说明 |
|--------|------|------|------|
| GET | `/` | JWT | 获取分析数据（可选 ?startDate=&endDate= 日期范围） |

### 优惠券 `/api/stores/:storeId/coupons`
| Method | Path | Auth | 说明 |
|--------|------|------|------|
| GET | `/` | JWT | 获取所有优惠券 |
| POST | `/` | JWT | 创建优惠券 |
| PUT | `/:couponId` | JWT | 修改优惠券 |
| DELETE | `/:couponId` | JWT | 删除优惠券 |

### 候位 `/api/stores/:storeId/waitlist`
| Method | Path | Auth | 说明 |
|--------|------|------|------|
| GET | `/` | JWT | 获取候位列表 |
| POST | `/` | JWT | 添加候位（name, partySize, phone?） |
| PATCH | `/:entryId` | JWT | 更新候位信息 |
| DELETE | `/:entryId` | JWT | 移除候位 |
| POST | `/:entryId/seat` | JWT | 标记为已入座 |

### 分账 `/api/stores/:storeId/split-bill`
| Method | Path | Auth | 说明 |
|--------|------|------|------|
| POST | `/` | JWT | 创建分账（equal 或 by-item 模式） |

### 打印 `/api/stores/:storeId/printer`
| Method | Path | Auth | 说明 |
|--------|------|------|------|
| GET | `/config` | JWT | 获取打印机配置 |
| PUT | `/config` | JWT | 更新打印机配置 |
| POST | `/print/:orderId` | JWT | 重新打印订单 |

### 员工 `/api/stores/:storeId/staff`
| Method | Path | Auth | 说明 |
|--------|------|------|------|
| GET | `/` | JWT (owner) | 获取所有员工 |
| POST | `/` | JWT (owner) | 添加员工账号 |
| PATCH | `/:userId` | JWT (owner) | 修改员工角色 |
| DELETE | `/:userId` | JWT (owner) | 删除员工（不可删除最后一个 owner） |

### 上传
| Method | Path | Auth | 说明 |
|--------|------|------|------|
| POST | `/api/upload` | JWT | 上传图片到 S3（JPEG/PNG, ≤5MB） |

---

## Frontend Structure

### 顾客端页面
| 路由 | 组件 | 说明 |
|------|------|------|
| `/scan/:storeId/:tableId` | ScanPage | 扫码着陆页，设置 session 后跳转 |
| `/lang-select/:storeId/:tableId` | LangSelectPage | 语言选择页 |
| `/menu/:storeId` | MenuPage | 分类导航 + 菜品列表 + 规格选择 Sheet |
| `/cart` | CartPage | 购物车（规格/备注/小计） |
| `/store/:storeId/checkout` | CheckoutPage | Stripe 支付页面（含小费选择） |
| `/order/confirm` | OrderConfirmPage | 下单成功确认页（订单号/明细） |
| `/orders/:storeId` | OrderHistoryPage | 订单历史（按桌台查询当前订单） |

### 管理端页面（需登录）
| 路由 | 组件 | 说明 |
|------|------|------|
| `/admin/login` | LoginPage | 管理员登录 |
| `/admin/dashboard` | DashboardPage | 订单面板（筛选/状态更新/修改订单） |
| `/admin/menu` | MenuManagePage | 菜品管理（表格/预览/内联编辑） |
| `/admin/categories` | CategoryManagePage | 分类管理 |
| `/admin/tables` | TablesPage | 桌台管理（QR 码生成/打印/结账/关台/转桌/分账） |
| `/admin/floor-plan` | FloorPlanPage | 楼层平面图（桌台可视化+候位+活跃订单侧栏） |
| `/admin/floor-plan/editor` | FloorPlanEditorPage | 楼层编辑器（拖拽布局桌台位置） |
| `/admin/analytics` | AnalyticsPage | 数据分析（订单/收入/热门菜品/员工，支持日期范围+CSV导出） |
| `/admin/coupons` | CouponManagePage | 优惠券管理（CRUD，支持百分比/固定/买赠类型） |
| `/admin/staff` | StaffManagePage | 员工管理（owner 专属，CRUD 员工账号/角色） |
| `/admin/settings` | StoreSettingsPage | 门店设置 |
| `*` | → `/admin/dashboard` | 默认跳转 |

### Zustand Stores
| Store | 文件 | 说明 |
|-------|------|------|
| `useSessionStore` | `stores/session-store.ts` | 顾客会话（storeId/tableId），localStorage 持久化 |
| `useAuthStore` | `stores/auth-store.ts` | 管理员认证（JWT token/user），localStorage 持久化 |
| `useCartStore` | `stores/cart-store.ts` | 购物车，localStorage 持久化（key `qr-order-cart`） |
| `useAdminLangStore` | `stores/admin-lang-store.ts` | 管理端语言偏好（zh/en），localStorage 持久化 |

### 共享组件（components/）
| 组件 | 说明 |
|------|------|
| `AdminLayout` | 管理端布局框架（侧栏导航+内容区） |
| `ProtectedRoute` | 路由守卫（未登录跳转 LoginPage） |
| `OrderDetailDialog` | 订单详情弹窗（明细/规格/备注） |
| `OrderReceipt` | 订单小票（打印格式） |
| `CloseTableDialog` | 关台确认弹窗 |
| `ImageUpload` | 图片上传组件（S3） |
| `MenuItemDetailSheet` | 菜品详情 Sheet（规格选择+加购，顾客端） |
| `OrderingSheet` | 桌内加单 Sheet（菜品浏览+规格选择+直接下单，顾客端） |
| `ItemCustomizeView` | 菜品规格自定义视图（选项选择+数量，OrderingSheet 内嵌） |
| `ActiveOrdersSidebar` | 活跃订单侧栏（按状态分组，15s 自动刷新） |
| `TableGrid` | 桌台网格（楼层平面图用，状态色标） |
| `TableDetailPanel` | 桌台详情面板（当前订单+历史订单） |
| `TableCrudDialog` | 桌台创建/编辑/删除弹窗（TablesPage 用） |
| `TransferTableDialog` | 转桌弹窗（选择空闲桌台转移订单） |
| `WaitlistPanel` | 候位管理面板（添加/入座/移除，30s 自动刷新） |
| `OrderEditMode` | 订单内联编辑（增删菜品/改数量/重算价格） |
| `SplitBillDialog` | 分账弹窗（均分/按菜品分，生成支付链接） |
| `OrderCard` | 订单卡片（订单摘要+重打印+编辑入口，Dashboard 用） |
| `MenuItemForm` | 菜品创建/编辑表单弹窗（含规格/选项/中英文） |
| `OrderEditDialog` | 订单编辑弹窗（调整数量/增删菜品/改选项/备注） |
| `MenuItemTable` | 菜品列表（桌面表格/移动卡片/预览网格，内联编辑） |
| `TipSelector` | 小费选择器（预设百分比+自定义，CheckoutPage 用） |

### i18n
| 文件 | 说明 |
|------|------|
| `i18n/index.ts` | i18next 初始化配置（browser language detector） |
| `i18n/useT.ts` | 管理端 i18n hook（自动读取 admin-lang-store 语言偏好） |
| `i18n/admin.ts` | 管理端翻译资源（zh/en 内联定义，429 行） |
| `i18n/en/*.json` | 英文翻译（admin.json + customer.json） |
| `i18n/zh/*.json` | 中文翻译（admin.json + customer.json） |

### 工具函数
| 文件 | 导出 | 说明 |
|------|------|------|
| `lib/utils.ts` | `cn()` | Tailwind class 合并（clsx + tailwind-merge） |
| `lib/format.ts` | `formatPrice()`, `formatPriceUSD()` | 分→元/USD 格式化 |
| `lib/i18n-utils.ts` | `localized()`, `localizedDesc()` | 中英双语字段解析 |
| `lib/qr-pdf.ts` | `printQrCodes()` | 生成桌台 QR 码打印页（HTML+print dialog） |

---

## Key Conventions

- **价格**: 全部用整数（分/cents）存储和传输，前端展示时 `/100`
- **多租户**: 所有 API 路径带 `/api/stores/:storeId/` 前缀，middleware 校验 JWT storeId 与 URL storeId 一致
- **订单快照**: OrderItem 冻结下单时的菜名/价格/规格，菜单改价不影响历史订单
- **支付流程**: 两阶段 — 先创建 PaymentIntent（不建订单），Stripe webhook 确认支付后才创建订单（`isPaid: true`）；支持新购物车结账和已有未付订单结账（`orderIds`），可选 `tipAmount`
- **cartKey**: 同一菜品不同规格 = 购物车中不同条目，通过 menuItemId + 选项组合区分
- **i18n 字段命名**: 中文用 `name`/`description`，英文用 `nameEn`/`descriptionEn`，`localized()` 按语言选择
- **i18n 双系统**: 顾客端用 react-i18next（JSON 文件），管理端用 `useT()` hook + `admin-lang-store`（内联翻译资源 `i18n/admin.ts`）
- **文件命名**: 页面 `XxxPage.tsx`，路由 `xxx.routes.ts`，控制器 `xxx.service.ts` / `xxx.controller.ts`
- **监听地址**: `0.0.0.0:3001`（支持局域网手机扫码 + 电脑后台）
- **订单号**: A001-A999, B001-B999... 循环递增，人类可读
- **JsonStore 单例**: 每个 JSON 数据文件只能有一个 `JsonStore` 实例，多个 service 共享同一实例（避免内存不同步 bug）

---

## Known Issues / Deferred Work

### 架构 & 数据层
- **Prisma 迁移未执行**: `schema.prisma` 只定义了 Store 和 StoreUser，Menu/Category/Table/Order 等核心模型仍用 JSON 文件存储，Prisma migration 待完成
- **自定义 Hooks 缺失**: `client/src/hooks/` 目录为空，数据获取逻辑直接写在页面组件中（违反架构原则，待提取为 `useMenu`/`useOrders` 等 hooks）
- **控制器命名不一致**: 部分用 `.service.ts`（menu/order/table/store/analytics/coupon/waitlist/split-bill/printer/staff/payment），部分用 `.controller.ts`（auth），待统一
- **`api.ts` 超过 200 行限制**: 当前 286 行，需拆分（如按模块拆为 `api/menu.ts`、`api/orders.ts` 等）
- **7 个文件严重超限（>300 行）**: `MenuPage.tsx`（500 行）、`CategoryManagePage.tsx`（423 行）、`MenuItemForm.tsx`（375 行）、`OrderEditDialog.tsx`（372 行）、`TablesPage.tsx`（352 行）、`AnalyticsPage.tsx`（317 行）、`MenuItemTable.tsx`（317 行）均远超 200 行限制，需优先拆分
- **12 个文件轻微超限（200-291 行）**: `MenuManagePage.tsx`（291 行）、`MenuItemDetailSheet.tsx`（250 行）、`CouponManagePage.tsx`（225 行）、`TableDetailPanel.tsx`（223 行）、`DashboardPage.tsx`（214 行）、`AdminLayout.tsx`（212 行）、`ActiveOrdersSidebar.tsx`（210 行）、`StaffManagePage.tsx`（206 行）、`OrderDetailDialog.tsx`（206 行）、`order.service.ts`（206 行）、`CartPage.tsx`（204 行）、`FloorPlanEditorPage.tsx`（202 行）
- ~~**AuthUser 类型重复**~~: ✅ 已修复 — `AuthUser` 已提取到 `shared/types.ts`，`auth-store.ts` 通过 import 引用
- **session-store 与 URL 双数据源**: `session-store` 持久化 storeId/tableId 到 localStorage，但 URL 参数中也包含这些值，存在状态不一致风险。未来应以 URL 为 source of truth

### 安全 & 配置（来自 hardcode-audit 2026-03-20）
- **CORS 未限制**: `app.ts` 使用 `cors()` 无 origin 限制，应通过 `CORS_ORIGIN` 环境变量配置
- ~~**LoginPage 密码占位符**~~: ✅ 已修复 — placeholder 已改为 `t('login.passwordPlaceholder')` 带 defaultValue 回退
- **LoginPage 用户名占位符**: `placeholder="admin"` 仍硬编码，应改为 `t('login.usernamePlaceholder')`
- **S3 bucket 硬编码**: fallback `'qr-restaurant-images'` 应改为必需环境变量
- **S3 URL 硬编码**: `s3.ts` 中 `https://${bucket}.s3.${region}.amazonaws.com/` 需提取为 `CDN_BASE_URL` 环境变量支持 CloudFront
- **货币硬编码**: `payment.service.ts` 中 Stripe 固定用 `'usd'`（出现两处），`format.ts` 中 `$` 符号硬编码，待提取为 `DEFAULT_CURRENCY` 配置
- **JWT 过期硬编码**: `auth.controller.ts` 中 `'7d'` 固定写死，待提取为环境变量
- ~~**server.ts 调试日志**~~: ✅ 已修复 — "HELLO FROM IAN" debug 消息已清除
- **缺少根 `.env.example`**: 只有 `server/.env.example`，根目录缺少统一的环境变量文档

### i18n（来自 i18n-audit 2026-03-20）
- **staff 模块缺失翻译 key（~20 个）**: `StaffManagePage.tsx` 全部使用 `defaultValue` 回退（title/addStaff/username/role/actions/delete/addTitle/password/cancel/create/saving 等），i18n JSON 文件中无 `staff.*` 命名空间（仅有 `nav.staff`）
- **splitBill 模块缺失翻译 key（~12 个）**: `SplitBillDialog.tsx` 全部使用 inline default 回退（title/desc/equal/byItem/generate/generating/numPeople/total/perPerson/assign/paid/unpaid 等），i18n JSON 文件中无 `splitBill.*` 命名空间
- **orders.transfer 缺失翻译 key（~3 个）**: `TransferTableDialog.tsx` 和 `TableDetailPanel.tsx` 使用 `defaultValue` 回退（transferTitle/transferFrom/transferConfirm）
- **analytics 散落 key（~2 个）**: `AnalyticsPage.tsx` 中 `analytics.staffPerformance`、`analytics.noStaff` 使用字面量 defaultValue
- **dashboard 散落 key（~2 个）**: `OrderCard.tsx` 中 `dashboard.reprint`、`dashboard.printed` 使用 defaultValue
- ~~**orderConfirm.loadingOrder 无 defaultValue**~~: ✅ 已修复 — key 已定义在 en/zh customer.json 中
- **15+ 处硬编码英文字符串**: "Access restricted to store owners"（3 处：CouponManagePage/FloorPlanEditorPage/AnalyticsPage）、"Owner"/"Staff" 标签（StaffManagePage SelectItem + 角色显示共 3 处）、"Loading..."（FloorPlanEditorPage）、error catch fallback 等
- ~~**ScanPage 硬编码中文错误**~~: ✅ 已修复 — 现使用 `t('scan.error')` 获取翻译
- **Store 缺 `announcementEn`**: 公告是顾客可见内容但不支持双语
- **server 端硬编码中文错误消息**: `table.service.ts` 中 3 处中文错误返回（`桌台"${name}"已存在`、`该桌台正在使用中，无法删除`）
- **login.passwordPlaceholder 缺 i18n 定义**: LoginPage 使用 `t('login.passwordPlaceholder', 'Enter password')` 但 key 未定义在任何 i18n JSON 文件中

### 数据 & 类型（来自 type-chain / type-check audit）
- ~~**OrderItem 缺 nameEn**~~: ✅ 已修复 — `order.service.ts` 创建订单项时已填充 `nameEn`
- ~~**备注不可见**~~: ✅ 验证为误报 — `remark` 已在 OrderDetailDialog、OrderReceipt、DashboardPage 中显示

### 死代码（来自 dead-code audit 2026-03-20）
- **未使用的 API 路由**: `GET /auth/me`（前端未调用）、`GET/PUT /printer/config`（前端无对应方法）
- **`api.seatWaitlistEntry()` 与 `updateWaitlistEntry` 重复**: WaitlistPanel 同时使用两者（`seatWaitlistEntry` 调 POST `/seat`，`updateWaitlistEntry` 调 PATCH），功能可能重叠
- **未使用的类型**: `StoreUser`、`LoginRequest`、`UpdateOrderStatusRequest`、`UpdateOrderItemsRequest`（共 4 个，均在 `shared/types.ts` 中定义但从未被 import）

### UX（来自 ux-audit 2026-03-20）
- **OrderEditMode 按钮严重过小**: 数量/删除/折扣按钮仅 24px（`icon-xs`/`xs`），远低于 44px 最小触摸目标
- **多处管理端按钮过小**: CategoryManagePage 排序箭头、CouponManagePage/StaffManagePage 表格行按钮（32px）、WaitlistPanel Seat/Remove 按钮（32px）
- **表格不响应式**: CouponManagePage、StaffManagePage 无移动端卡片视图替代
- **FloorPlanEditorPage 不响应式**: 属性面板始终可见（`w-64`），多处英文硬编码
- ~~**CheckoutPage 缺 loading**~~: ✅ 已修复 — Stripe 元素初始化时已有 Loader2 spinner
- ~~**CheckoutPage 部分未国际化**~~: ✅ 已修复 — 无 clientSecret 时的 fallback 文案已使用 `t('checkout.noSession')` 和 `t('checkout.noSessionDesc')`
- ~~**TablesPage 无空状态**~~: ✅ 已修复 — 无桌台时已有空状态 UI（图标+提示+添加按钮）
- ~~**ScanPage 无重试按钮**~~: ✅ 已修复 — 错误时显示 retry 按钮和描述文案
- ~~**ScanPage loading 无动画**~~: ✅ 已修复 — 使用自定义 spinner 动画 + 双语加载文案
- **FloorPlanEditorPage loading 无 spinner**: 使用纯文本 "Loading..." 无动画
- **MenuPage 空分类无提示**: 非搜索模式下，无菜品的分类缺少空状态提示
- **键盘无障碍缺失**: TableGrid 和 TransferTableDialog 的卡片缺少 `role="button"`/`tabIndex`/`onKeyDown`

### 其他
- **购物车 localStorage 残留**: 购物车已持久化（persist，key `qr-order-cart`），但同一桌台旧购物车数据未清理，可能导致错误订单
- **`/auth/me` 端点未使用**: auth.routes.ts 定义了 GET `/me`，但前端未调用

### 2026-03-23 测试发现的问题（已修复）
- ✅ **OrderConfirmPage 无限加载**: `o.status === 'paid'` 永远匹配不到（webhook 设 `isPaid: true` 但 status 保持 `pending`）→ 改为 `o.isPaid` 查找 + polling 5次 + 超时兜底
- ✅ **Stripe metadata 超 500 字符**: 购物车 items+options JSON 超过 Stripe metadata 限制 → 精简为单字母 key + 自动分片
- ✅ **Stripe webhook 400**: `STRIPE_WEBHOOK_SECRET` 未更新为 Stripe CLI 的临时密钥；`docker compose restart` 不会重新读取 `.env`（需要 `docker compose up -d`）
- ✅ **分类 Switch 不工作**: TableRow `draggable` 属性拦截了 Switch 的点击事件 → 加 `onPointerDown/onDragStart stopPropagation`
- ✅ **分类字体跳跃**: Switch 切换后 `hiddenDesc` 空字符串仍占位 → 条件渲染 + 固定列宽 + `tabular-nums`
- ✅ **OrderCard/TableDetailPanel 规格不显示**: selectedOptions 只显示 choiceName → 改为 badge 样式 `optionName: choiceName`
- ✅ **TablesPage 图片不显示**: 订单项用灰色占位符 → 改为首字母头像（OrderItem 无 image 字段）
- ✅ **autoAcceptOrders 未保存**: `store.service.ts` 的 `updateStore` 漏了该字段
- ✅ **MenuItemEditSheet 死代码**: 已删除（MenuItemForm 已接管全部编辑功能）
- ✅ **POST /orders 泄露 paymentIntentId**: 加了 `stripSensitive`
- ✅ **optionNameEn/choiceNameEn 未填充**: order.service.ts 从 menuItem 定义中查找并填充

### 2026-03-23 已知但未修复的问题
- **Call Waiter 无真实通知**: 顾客端按钮只有 3 秒本地反馈，无 WebSocket 通知管理端（需要后续实现）
- **Stripe webhook 依赖 CLI**: 本地开发必须运行 `stripe listen --forward-to localhost:3001/api/webhook/stripe`，否则支付后订单不会创建
- **Docker `.env` 陷阱**: `docker compose restart` 不会重读 `.env`，必须用 `docker compose up -d` 重新创建容器
- **Seed 后菜品 categoryId 失效**: seed 脚本重新生成分类 ID，导致旧 menu-items.json 的 categoryId 不匹配 → 需要按菜名重新映射
- **服务器内存缓存**: 直接修改 `server/data/*.json` 文件后必须重启服务器（JsonStore 在启动时加载到内存）
- **Tax/Service 费率不一致**: TablesPage 用 10% service + 5% tax，MenuManagePage 用 8% tax（应统一提取为配置）

### 2026-03-23 追加修复
- ✅ **selectedOptions 中文名为空**: Stripe compact metadata 解压时 `optionName/choiceName` 设为空字符串 → `order.service.ts` enrichedOptions 现在从 menuItem 定义填充中文名
- ✅ **前端规格显示空括号**: 所有 12 个显示 `choiceName` 的文件加了 fallback: `o.choiceName || o.choiceNameEn || ''`
- ✅ **Cart 按钮 Submit/Submitting 跳动**: 移除双语嵌套 span，统一单行 i18n + Loader2 spinner + 固定 min-w
- ✅ **MenuPage Header 不可折叠**: 添加滚动检测，下滑自动收起店名/按钮，只保留搜索栏
- ✅ **TablesPage 不显示图片**: 添加 menuItemMap（按 menuItemId 查 image URL），有图显示图片，无图显示首字母
- ✅ **11 个 i18n key 缺失**: closeConfirm/confirmCloseTitle/grandTotal/splitBill.*/transferTable.* 补全
- ✅ **OrderingSheet/ItemCustomizeView 内容和 X 叠加**: 添加 `pr-12 pt-4` padding

### 2026-03-24 追加修复
- ✅ **桌台状态不更新（occupied/idle）**: JsonStore 多实例 bug — `order.service.ts` 和 `table.service.ts` 各自 `new JsonStore('tables.json')` 导致内存不同步 → 改为单例 export/import 共享
- ✅ **stores.json 也有 3 个实例**: menu.service + order.service + store.service → 统一从 store.service 导出

### 待实现功能
- **FloorPlan 交互式地图**: 将 FloorPlanPage 从卡片网格改为按 x/y 坐标渲染桌台（复用 FloorPlanEditorPage 的布局数据），让运营视图和编辑器视图一致
- **Checkout Session 优化**: Stripe metadata 改为服务端存 checkout_session 表 + metadata 只存 session ID，彻底绕开 500 char 限制

### 当前仍未修复的问题
- **Call Waiter 无真实通知**: 需要 WebSocket
- **Stripe webhook 依赖 CLI**: 本地必须运行 `stripe listen`
- **Docker `.env` 陷阱**: `docker compose restart` 不重读 `.env`
- **Seed 后 categoryId 失效**: 需要按菜名重映射
- **服务器内存缓存**: 改 JSON 文件后必须重启
- **Tax/Service 费率不一致**: 应统一提取为配置
- **购物车 localStorage 残留**: 同桌台旧购物车数据可能导致错误订单
- **FloorPlan/Tables polling 延迟**: 10s 间隔，订单创建后最多等 10s 才更新状态
- **`/auth/me` 端点未使用**
- **部分管理端页面缺少 mobile 底部导航**

---

## Do NOT

- **不要动 `bee/` 目录** — 这是旧版微信小程序的参考代码，不参与当前项目构建
- **不要修改 Stripe webhook 签名验证逻辑** — `webhook.routes.ts` 使用 raw body parser，改动可能导致签名校验失败
- **不要在 `app.ts` 中把 `express.json()` 放到 webhook 路由之前** — webhook 需要 raw body
- **不要直接操作 `server/data/*.json` 文件** — 必须通过 `repositories/json-store.ts` 读写
- **不要在 `routes/` 文件中写业务逻辑** — 路由只做参数解析和响应，逻辑放 `controllers/`
- **不要在页面组件中直接调用 `fetch`** — 使用 `services/api.ts` 中的封装函数
- **不要用浮点数存储价格** — 全部用整数（分）
- **不要新增公开 API 端点返回全量数据** — 未认证请求必须限定范围（如 `tableId`），防止数据泄漏。参考 `GET /orders` 的 `optionalAuth` 模式
- **不要在 `shared/types.ts` 之外重复定义类型** — 前后端共享类型统一在 `shared/types.ts`，组件/store 通过 import 引用
- **不要在环境变量缺失时使用 fallback 默认值** — 关键配置（`JWT_SECRET`、`DATABASE_URL` 等）缺失时必须 throw，不允许 `|| 'dev-secret'`
- **不要为同一 JSON 数据文件创建多个 JsonStore 实例** — 必须共享单例，否则内存缓存不同步

---

> Last updated: 2026-03-24 CST (auto-generated)

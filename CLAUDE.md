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

QR 扫码点餐 SaaS 系统 — 顾客扫桌台二维码浏览菜单、选规格下单、Stripe 在线支付（含小费）；管理端实时看板处理订单、管理菜品/分类/桌台/门店设置。支持 RBAC 权限控制、账单/分账管理、自定义角色。

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
- **权限**: RBAC — `permission.middleware.ts` + `role.service.ts`（基于 `Permission` 类型的细粒度权限控制）
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
> JSON 数据文件位于 `server/data/`：bills.json, categories.json, coupons.json, menu-items.json, orders.json, roles.json, splits.json, staff.json, stores.json, tables.json, waitlist.json

### Store（门店）
```
id               String    @id @default(uuid())
name             String
nameEn           String?
logo             String?
description      String?
descriptionEn    String?
openingHours     String?
announcement     String?
announcementEn   String?
autoAcceptOrders Boolean?
maxTables        Number?
paymentMode      'pay-first' | 'pay-later'
createdAt        DateTime
updatedAt        DateTime
→ has many StoreUser, RoleDefinition
```

### StoreUser（门店用户）
```
id        String   @id @default(uuid())
storeId   String   → Store.id
username  String
password  String
role      String   @default("staff")   // legacy field
roleId    String?  → RoleDefinition.id  // new RBAC
createdAt DateTime
@@unique([storeId, username])
```

### RoleDefinition（角色定义）
```
id          String       @id @default(uuid())
storeId     String       → Store.id
name        String
nameEn      String?
permissions Permission[] // 细粒度权限列表
isSystem    Boolean      // 系统内置角色不可删除
createdAt   DateTime
```

### Bill（账单）
```
id                 String   @id @default(uuid())
storeId            String   → Store.id
tableId            String   → Table.id
version            Number   // 乐观锁
status             'pending-payment' | 'open' | 'partially-paid' | 'settled'
splitMethod        'equal' | 'percentage' | 'by-item' | 'full'
orderIds           String[]
subtotal           Number   // cents
couponId           String?
couponCode         String?
couponDiscountType DiscountType?
couponDiscountValue Number?
discountAmount     Number   // cents
totalDue           Number   // cents
paidAmount         Number   // cents
createdAt          DateTime
settledAt          DateTime?
→ has many Split
```

### Split（分账）
```
id              String   @id @default(uuid())
billId          String   → Bill.id
storeId         String   → Store.id
amount          Number   // cents
percentage      Number?
status          'unpaid' | 'paid'
paidBy          'customer' | 'waiter'
paymentIntentId String?
itemIds         String[]?
customerName    String?
createdAt       DateTime
```

> **注意**：Menu/Category/Table/Order 等模型尚未迁移到 Prisma，仍在 JSON 文件中（`server/data/*.json`），类型定义在 `shared/types.ts`。

### Permission 类型（RBAC）
```
'orders:read' | 'orders:write'
'menu:read' | 'menu:write'
'tables:read' | 'tables:write'    // includes floor plan + bill operations
'billing:read' | 'billing:write'  // includes coupons
'analytics:read'
'staff:manage'
'settings:read' | 'settings:write'
```

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
| PUT | `/` | JWT | 更新门店信息（名称/描述/营业时间/公告/autoAcceptOrders/maxTables/paymentMode） |

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
| GET | `/` | JWT (tables:read) | 获取所有桌台（?includeDisabled=true 含禁用桌台） |
| GET | `/next-number` | JWT (tables:write) | 获取下一个可用桌台编号 |
| GET | `/:tableId` | - | 获取单个桌台（顾客扫码用） |
| POST | `/enable` | JWT (tables:write) | 启用桌台（从 ID 池分配，number + name + nameEn） |
| PUT | `/:tableId` | JWT (tables:write) | 修改桌台 |
| POST | `/:tableId/disable` | JWT (tables:write) | 禁用桌台（占用中不可禁用） |
| POST | `/:tableId/regenerate-qr` | JWT (tables:write) | 重新生成桌台 QR 码（新随机 ID，旧 QR 失效） |
| POST | `/:tableId/settle` | JWT (tables:write) | 结账（所有订单→completed，桌台→idle） |
| POST | `/:tableId/close` | JWT (tables:write) | 关台（订单→closed，桌台→idle） |

### 订单 `/api/stores/:storeId/orders`
| Method | Path | Auth | 说明 |
|--------|------|------|------|
| POST | `/` | - | 创建订单（验证菜品+计算总价+更新桌台） |
| GET | `/` | optionalAuth | 订单列表（未认证需 tableId；可选 ?status=&tableId= 筛选） |
| PATCH | `/:orderId/status` | JWT | 更新订单状态 |
| POST | `/:orderId/transfer` | JWT | 转桌（将订单移到目标桌台） |
| PUT | `/:orderId/items` | JWT | 修改订单项（增删菜品/改规格/重算价格） |

### 账单 `/api/stores/:storeId/bills`
| Method | Path | Auth | 说明 |
|--------|------|------|------|
| GET | `/?tableId=` | - | 获取桌台的活跃账单（含 splits） |
| GET | `/:billId` | - | 获取单个账单（含 splits） |
| POST | `/:billId/splits` | JWT (tables:write) | 创建分账（method + count + version 乐观锁） |
| PATCH | `/:billId/splits/:splitId` | JWT (tables:write) | 标记分账已付（waiter） |
| POST | `/:billId/apply-coupon` | JWT (billing:write) | 账单应用优惠券 |
| DELETE | `/:billId/coupon` | JWT (billing:write) | 移除账单优惠券 |
| POST | `/:billId/settle` | JWT (tables:write) | 整单结账（paidBy + version 乐观锁） |

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

### 角色 `/api/stores/:storeId/roles`
| Method | Path | Auth | 说明 |
|--------|------|------|------|
| GET | `/` | JWT (staff:manage) | 获取所有角色定义 |
| POST | `/` | JWT (staff:manage) | 创建角色（name + nameEn + permissions） |
| PUT | `/:roleId` | JWT (staff:manage) | 修改角色 |
| DELETE | `/:roleId` | JWT (staff:manage) | 删除角色（系统角色不可删） |

### 打印 `/api/stores/:storeId/printer`
| Method | Path | Auth | 说明 |
|--------|------|------|------|
| GET | `/config` | JWT | 获取打印机配置 |
| PUT | `/config` | JWT | 更新打印机配置 |
| POST | `/print/:orderId` | JWT | 重新打印订单 |

### 员工 `/api/stores/:storeId/staff`
| Method | Path | Auth | 说明 |
|--------|------|------|------|
| GET | `/` | JWT (staff:manage) | 获取所有员工 |
| POST | `/` | JWT (staff:manage) | 添加员工账号 |
| PATCH | `/:userId` | JWT (staff:manage) | 修改员工角色 |
| DELETE | `/:userId` | JWT (staff:manage) | 删除员工（不可删除最后一个 owner） |

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
| `/admin/tables` | TablesPage | 桌台管理（启用/禁用/QR 码/结账/关台/分账） |
| `/admin/floor-plan` | FloorPlanPage | 楼层平面图（桌台可视化+候位+活跃订单侧栏） |
| `/admin/floor-plan/editor` | FloorPlanEditorPage | 楼层编辑器（拖拽布局桌台位置） |
| `/admin/analytics` | AnalyticsPage | 数据分析（订单/收入/热门菜品/员工，支持日期范围+CSV导出） |
| `/admin/coupons` | CouponManagePage | 优惠券管理（CRUD，支持百分比/固定/买赠类型） |
| `/admin/staff` | StaffManagePage | 员工管理（RBAC，CRUD 员工账号/角色分配） |
| `/admin/settings` | StoreSettingsPage | 门店设置 |
| `*` | → `/admin/dashboard` | 默认跳转 |

### Zustand Stores
| Store | 文件 | 说明 |
|-------|------|------|
| `useSessionStore` | `stores/session-store.ts` | 顾客会话（storeId/tableId），localStorage 持久化 |
| `useAuthStore` | `stores/auth-store.ts` | 管理员认证（JWT token/user/permissions），localStorage 持久化 |
| `useCartStore` | `stores/cart-store.ts` | 购物车，localStorage 持久化（key `qr-order-cart`） |
| `useAdminLangStore` | `stores/admin-lang-store.ts` | 管理端语言偏好（zh/en），localStorage 持久化 |

### 组件（components/ — 按领域分子目录）

#### components/order/
| 组件 | 说明 |
|------|------|
| `OrderCard` | 订单卡片（订单摘要+重打印+编辑入口，Dashboard 用） |
| `OrderDetailDialog` | 订单详情弹窗（明细/规格/备注） |
| `OrderEditDialog` | 订单编辑弹窗（调整数量/增删菜品/改选项/备注） |
| `OrderEditMode` | 订单内联编辑（增删菜品/改数量/重算价格） |
| `OrderingSheet` | 桌内加单 Sheet（菜品浏览+规格选择+直接下单，顾客端） |
| `OrderReceipt` | 订单小票（打印格式） |

#### components/table/
| 组件 | 说明 |
|------|------|
| `BillSettleDialog` | 账单结账弹窗（分账/应用优惠券/整单结账） |
| `CloseTableDialog` | 关台确认弹窗 |
| `SplitBillDialog` | 分账弹窗（均分/按菜品分） |
| `TableCrudDialog` | 桌台启用/编辑弹窗（桌台号+名称） |
| `TableDetailPanel` | 桌台详情面板（当前订单+历史订单） |
| `TableGrid` | 桌台网格（楼层平面图用，状态色标） |
| `TransferTableDialog` | 转桌弹窗（选择空闲桌台转移订单） |

#### components/menu/
| 组件 | 说明 |
|------|------|
| `CsvImportDialog` | CSV 菜品批量导入弹窗 |
| `ItemCustomizeView` | 菜品规格自定义视图（选项选择+数量，OrderingSheet 内嵌） |
| `MenuItemDetailSheet` | 菜品详情 Sheet（规格选择+加购，顾客端） |
| `MenuItemForm` | 菜品创建/编辑表单弹窗（含规格/选项/中英文） |
| `MenuItemTable` | 菜品列表（桌面表格/移动卡片/预览网格，内联编辑） |

#### components/floor/
| 组件 | 说明 |
|------|------|
| `ActiveOrdersSidebar` | 活跃订单侧栏（按状态分组，15s 自动刷新） |
| `FloorCanvas` | 楼层画布（按 x/y 坐标渲染桌台形状） |
| `FloorTableShape` | 单个桌台形状组件（square/round/long） |
| `WaitlistPanel` | 候位管理面板（添加/入座/移除，30s 自动刷新） |

#### components/layout/
| 组件 | 说明 |
|------|------|
| `AdminLayout` | 管理端布局框架（侧栏导航+内容区） |
| `ProtectedRoute` | 路由守卫（未登录跳转 LoginPage） |

#### components/shared/
| 组件 | 说明 |
|------|------|
| `ImageUpload` | 图片上传组件（S3） |
| `TipSelector` | 小费选择器（预设百分比+自定义，CheckoutPage 用） |

### Hooks（hooks/）
| Hook | 说明 |
|------|------|
| `usePermission(perm)` | 检查当前用户是否有指定权限（支持 legacy role 降级） |
| `useIsOwner()` | 检查当前用户是否有 `staff:manage` 权限 |

### i18n
| 文件 | 说明 |
|------|------|
| `i18n/index.ts` | i18next 初始化配置（browser language detector） |
| `i18n/useT.ts` | 管理端 i18n hook（自动读取 admin-lang-store 语言偏好） |
| `i18n/admin.ts` | 管理端翻译资源（zh/en 内联定义，523 行） |
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
- **RBAC 权限**: JWT 中携带 `permissions` 数组，`permission.middleware.ts` 按端点校验；legacy token 通过 `resolvePermissions()` 降级兼容
- **订单快照**: OrderItem 冻结下单时的菜名/价格/规格，菜单改价不影响历史订单
- **账单流程**: 桌台结账时自动创建 Bill（聚合该桌所有订单），支持分账（equal/by-item）、优惠券、乐观锁（version）防并发冲突
- **支付流程**: 两阶段 — 先创建 PaymentIntent（不建订单），Stripe webhook 确认支付后才创建订单（`isPaid: true`）；支持新购物车结账和已有未付订单结账（`orderIds`），可选 `tipAmount`
- **桌台 ID 池**: 桌台使用 enable/disable 模型，禁用的桌台保留数据但不可扫码；`regenerate-qr` 生成新随机 ID 使旧 QR 码失效
- **cartKey**: 同一菜品不同规格 = 购物车中不同条目，通过 menuItemId + 选项组合区分
- **i18n 字段命名**: 中文用 `name`/`description`，英文用 `nameEn`/`descriptionEn`，`localized()` 按语言选择
- **i18n 双系统**: 顾客端用 react-i18next（JSON 文件），管理端用 `useT()` hook + `admin-lang-store`（内联翻译资源 `i18n/admin.ts`）
- **文件命名**: 页面 `XxxPage.tsx`，路由 `xxx.routes.ts`，控制器 `xxx.service.ts`
- **监听地址**: `0.0.0.0:3001`（支持局域网手机扫码 + 电脑后台）
- **订单号**: A001-A999, B001-B999... 循环递增，人类可读
- **JsonStore 单例**: 所有 JsonStore 实例集中在 `repositories/stores.ts`，各 service 通过 import 共享（避免内存不同步 bug）。当前单例：orderStore, tableStore, storeStore, billStore, splitStore, roleStore

---

## Known Issues / Deferred Work

### 架构 & 数据层
- **Prisma 迁移未执行**: `schema.prisma` 只定义了 Store 和 StoreUser，Menu/Category/Table/Order/Bill/Split/Role 等核心模型仍用 JSON 文件存储，Prisma migration 待完成
- **自定义 Hooks 不完整**: `client/src/hooks/` 目前仅有 `usePermission.ts`，数据获取逻辑仍直接写在页面组件中（违反架构原则，待提取为 `useMenu`/`useOrders` 等 hooks）
- **`api.ts` 超过 200 行限制**: 当前 361 行（含 bills + roles API），需拆分（如按模块拆为 `api/menu.ts`、`api/orders.ts`、`api/bills.ts` 等）
- **11 个文件严重超限（>300 行）**: `MenuPage.tsx`（623 行）、`i18n/admin.ts`（539 行）、`TablesPage.tsx`（484 行）、`CategoryManagePage.tsx`（447 行）、`MenuManagePage.tsx`（429 行）、`MenuItemForm.tsx`（429 行）、`OrderEditDialog.tsx`（410 行）、`api.ts`（361 行）、`StaffManagePage.tsx`（342 行）、`FloorPlanEditorPage.tsx`（337 行）、`MenuItemTable.tsx`（320 行）、`AnalyticsPage.tsx`（317 行）均远超 200 行限制，需优先拆分
- **6 个文件轻微超限（200-300 行）**: `CsvImportDialog.tsx`（284 行）、`order.service.ts`（282 行）、`BillSettleDialog.tsx`（269 行）、`FloorPlanPage.tsx`（259 行）、`MenuItemDetailSheet.tsx`（250 行）、`payment.service.ts`（208 行）
- **session-store 与 URL 双数据源**: `session-store` 持久化 storeId/tableId 到 localStorage，但 URL 参数中也包含这些值，存在状态不一致风险。未来应以 URL 为 source of truth

### 安全 & 配置
- **S3 bucket 硬编码**: fallback `'qr-restaurant-images'` 应改为必需环境变量
- **S3 URL 硬编码**: `s3.ts` 中 `https://${bucket}.s3.${region}.amazonaws.com/` 需提取为 `CDN_BASE_URL` 环境变量支持 CloudFront
- **货币硬编码**: `payment.service.ts` 中 Stripe 固定用 `'usd'`（出现两处），`format.ts` 中 `$` 符号硬编码，待提取为 `DEFAULT_CURRENCY` 配置
- **无 Rate Limiting**: 登录、下单、支付创建等端点均无频率限制，上线前需加 `express-rate-limit`
- **Session 端点无认证**: `GET/PUT /sessions/:sessionId/cart`、`pay-items`、`pay-percent` 等顾客端点无需认证，依赖 UUID 不可猜测性。上线前应加 session token 校验
- **缺少根 `.env.example`**: 只有 `server/.env.example`，根目录缺少统一的环境变量文档

### 安全审计（2026-04-04）

#### 凭据泄漏（CRITICAL）
- **AWS Access Key 明文存在仓库**: `.env`、`server/.env`、`Qr_code_manage_accessKeys.csv` 均含 AWS Key，需立即轮换并用 `git filter-repo` 从历史清除
- **AWS SSH 私钥**: `aws_secret.pem` 在仓库根目录
- **Stripe Secret Key + Webhook Secret**: `.env` 中明文，需轮换
- **数据库密码明文**: `server/.env.example` 含 `qrorder123`
- **JWT Secret 弱默认值**: `server/.env.example` 中 `dev-secret-change-in-production`
- **硬编码测试账号**: `server/prisma/seed.ts`（`admin123`/`staff123`）、`server/src/scripts/test-payment-flow.ts`（`admin123`/`ian123`）
- **bcrypt 哈希在版本控制中**: `server/data/staff.json` 含密码哈希

#### 输入校验缺失
- **数值字段缺 typeof/isFinite 校验**: `session.routes.ts` 的 `amount`/`receivedAmount`、`order.service.ts` 的 `quantity`、`menu.service.ts` 的 `price` 均不检查 NaN/Infinity
- **applyCoupon 参数完全无校验**: `session.routes.ts:153` 直接传 `req.body` 到 service
- **coupon/role 创建无字段校验**: `coupon.routes.ts:18`、`role.routes.ts:15` 直接传 `req.body`
- **字符串无长度限制**: `customerName`、`remark`、`name`、`description`、`announcement`、`phone`、`username`、`couponCode` 均无 maxLength
- **express.json() 无 body size limit**: `app.ts` 未设 `{ limit: '1mb' }`
- **Prototype Pollution 风险**: `json-store.ts:50` 展开用户输入 `{ ...data, ...updates }`，未过滤 `__proto__`/`constructor`/`id`/`storeId`
- **update 操作无字段白名单**: table/menu/coupon service 的 update 直接接受 `req.body`

#### JSON.parse 无 try-catch（会 crash webhook）
- `payment.service.ts:162` — `JSON.parse(pi.metadata.itemKeys)`
- `payment.service.ts:192` — `JSON.parse(cartDataRaw)`
- `json-store.ts:22` — `JSON.parse(raw)` 加载数据文件

#### 多租户隔离缺陷
- **`getMenuItemById` 无 storeId 过滤**: `menu.service.ts:53`，被公开端点 order 创建调用，攻击者可用其他店的 menuItemId 下单
- **`getSessionById` 无 storeId 参数**: `session.service.ts:24`，依赖调用方检查
- **`getRoleById` 无 storeId 参数**: `role.service.ts:74`
- **`optionalAuth` 允许 storeId 缺失跳过校验**: `auth.middleware.ts:38`

#### RBAC 缺陷
- **无权限变更审计日志**: `staff.service.ts:55-69`
- **自定义角色可授予 `staff:manage` 造成提权**: 无限制哪些角色可以修改角色
- **Legacy token 降级逻辑可能给出过期权限**: `permission.middleware.ts:11-20`
- **JWT 无注销黑名单**: logout 后 token 仍有效至过期

#### JsonStore 并发问题
- **Race Condition**: `json-store.ts` 的 read-modify-write 非原子操作，并发请求可互相覆盖写入导致数据静默丢失

### i18n
- **i18n JSON 文件缺失多个模块**: `admin.ts`（TypeScript 内联定义）中有完整的 `staff`/`splitBill`/`transferTable`/`analytics`/`dashboard` 翻译 key，但 `en/admin.json` 和 `zh/admin.json` 缺失这些模块。管理端使用 `useT()` hook 读取 `admin.ts`，功能正常但 JSON 文件与 TS 定义不同步
- **硬编码字符串**: FloorPlanEditorPage 中 prompt 对话框（"New zone/floor name:" 等）、StaffManagePage 中 tab 标签（`'Staff'`/`'Roles'`）、OrderCard 中时间文案（`'Just now'`/`'m ago'`）、AnalyticsPage 中 `"No data"` 等

### 死代码
- **未使用的 API 路由**: `GET /auth/me`（前端未调用）、`GET/PUT /printer/config`（前端无对应方法）

### UX
- **OrderEditMode discount 按钮过小**: 主操作按钮已设 `min-h-[44px]`，但折扣按钮（`size="xs"`）仍低于 44px 触摸目标
- **多处管理端按钮过小**: CategoryManagePage 排序箭头、CouponManagePage/StaffManagePage 表格行按钮（32px）、WaitlistPanel Seat/Remove 按钮（32px）
- **表格不响应式**: CouponManagePage、StaffManagePage 无移动端卡片视图替代
- **FloorPlanEditorPage 不响应式**: 属性面板始终可见（`w-64`），多处英文硬编码
- **MenuPage 空分类无提示**: 非搜索模式下，无菜品的分类缺少空状态提示
- **键盘无障碍缺失**: TableGrid 和 TransferTableDialog 的卡片缺少 `role="button"`/`tabIndex`/`onKeyDown`
- **FloorPlan/Tables polling 延迟**: 10s 间隔，订单创建后最多等 10s 才更新状态
- **部分管理端页面缺少 mobile 底部导航**

### 运维 & 其他
- **Call Waiter 无真实通知**: 顾客端按钮只有 3 秒本地反馈，无 WebSocket 通知管理端
- **Stripe webhook 依赖 CLI**: 本地开发必须运行 `stripe listen --forward-to localhost:3001/api/webhook/stripe`
- **Docker `.env` 陷阱**: `docker compose restart` 不会重读 `.env`，必须用 `docker compose up -d`
- **Seed 后菜品 categoryId 失效**: seed 脚本重新生成分类 ID，导致旧 menu-items.json 的 categoryId 不匹配
- **服务器内存缓存**: 直接修改 `server/data/*.json` 文件后必须重启服务器
- **购物车 localStorage 残留**: 同一桌台旧购物车数据未清理，`clearCart()` 存在但换桌/换 session 时未自动调用

### 共享购物车剩余问题
- **Poll 间隔 5s**: A 加菜后 B 要等 5s 才看到，期间 cart 不同步（可考虑 WebSocket 替代）
- **Session cart 无认证保护**: `GET/PUT /sessions/:sessionId/cart` 无需认证，知道 sessionId 即可读写
- **localStorage 混合多设备数据**: poll 拉下的"别人的 items"持久化在本地，刷新后可能过时

### 待实现功能
- **FloorPlan 交互式地图**: 将 FloorPlanPage 从卡片网格改为按 x/y 坐标渲染桌台
- **Checkout Session 优化**: Stripe metadata 改为服务端存 checkout_session 表 + metadata 只存 session ID
- **Apple Pay / Google Pay**: 需要 HTTPS + 域名 + Apple Pay domain verification

---

## TODO — 待修改项（按优先级）

### P0 — 影响正确性
- [ ] **S3 bucket/URL 硬编码** → bucket 改为必需环境变量（`AWS_S3_BUCKET`），URL 提取为 `CDN_BASE_URL` 支持 CloudFront
- [ ] **货币硬编码 `'usd'` + `$`** → 提取为 `DEFAULT_CURRENCY` 配置（`payment.service.ts` 两处 + `format.ts`）
- [ ] **购物车 localStorage 残留** → `ScanPage` 切桌时已调 `clearCart()`，但同桌 session 关闭后再扫不清理；MenuPage 检测到 session 已关闭时应 `clearCart()`

### P1 — 影响开发体验
- [ ] **缺少根 `.env.example`** → 汇总 client + server 所有环境变量，创建根目录 `.env.example`
- [ ] **i18n JSON 与 admin.ts 不同步** → 将 `admin.ts` 中 `staff`/`splitBill`/`transferTable`/`analytics`/`dashboard` 完整模块同步到 JSON 文件
- [ ] **硬编码英文字符串** → FloorPlanEditorPage prompt 对话框、StaffManagePage tab 标签、OrderCard 时间文案、AnalyticsPage "No data"
- [ ] **未使用 API 路由清理** → 删除 `GET /auth/me`、`GET/PUT /printer/config`（或补前端调用）

### P2 — 影响 UX
- [ ] **管理端按钮过小** → OrderEditMode discount 按钮、CategoryManagePage 排序箭头、CouponManagePage/StaffManagePage/WaitlistPanel 表格行按钮（统一 ≥44px）
- [ ] **表格不响应式** → CouponManagePage、StaffManagePage 添加移动端卡片视图
- [ ] **FloorPlanEditorPage 不响应式** → 属性面板 `w-64` 固定宽度
- [ ] **MenuPage 空分类无提示** → 非搜索模式下添加空状态 UI
- [ ] **键盘无障碍** → TableGrid、TransferTableDialog 添加 `role="button"` + `tabIndex` + `onKeyDown`
- [ ] **管理端 mobile 底部导航** → 部分页面缺少

### P3 — 技术债
- [ ] **自定义 Hooks 提取** → 将页面中数据获取逻辑提取为 `useMenu`/`useOrders`/`useTables` 等
- [ ] **api.ts 拆分** → 361 行，按模块拆为 `api/menu.ts`、`api/orders.ts`、`api/bills.ts` 等
- [ ] **12 个文件 >300 行** → 需拆分（详见架构 & 数据层）
- [ ] **session-store 与 URL 双数据源** → 以 URL 为 source of truth

### 结账系统重构（待实现）

**目标**: 完善 pay-later 模式下的顾客结账 + 管理端收款流程。

#### 数据层改动
- `Store` 新增 `taxRate?: number`（百分比，如 8.875）、`serviceFeeRate?: number`（可选）
- `Session` 新增 `settlementMode?: 'by-item' | 'by-percent'`（一旦有人选百分比，后续锁定为百分比）
- `Session` 新增 `paidItemIds?: string[]`（已付菜品 ID，按菜品结账时标记）
- `Payment` 新增 `method?: 'stripe' | 'cash'`（支付方式）

#### 顾客端结账流程（pay-later）
1. MenuPage "结账" 按钮 → 打开 `SettlementSheet`
2. 分账模式选择（二选一）：
   - **按菜品**: 勾选整桌任意未付菜品 → 计算小计
   - **按百分比**: 滑块 1-100%，金额 = 剩余未付食物总价 × 百分比（不含小费）
3. 规则：先选菜品的人可以继续按菜品 → 一旦有人选百分比 → 后续只能百分比
4. 金额上限 = 剩余未付菜品总价（不含 tip）
5. 税额 = 小计 × `store.taxRate / 100`，在结账时显示单独行
6. 确认后 → Stripe 支付 → 支付完成后记录到 Session
7. 全额支付后 Session 关闭 → 桌台 idle → 可开新 Session

#### 管理端收款流程
1. TablesPage 桌台 → "结账" → 弹出 `AdminSettleDialog`
2. 显示账单明细（所有订单 + 税 + 已付/未付）
3. 支付方式二选一：
   - **刷卡** → 创建 Stripe PaymentIntent → 管理端完成支付
   - **现金** → `CashPaymentPad` 数字键盘 → 输入收到金额 → 自动算找零 → 确认收款
4. 记录 `Payment { method: 'cash' | 'stripe' }`
5. 全额支付 → 关 Session → 桌台 idle

#### API 新增/修改
- `PATCH /sessions/:sessionId/start-settlement` — 设置 `settlementMode`
- `POST /sessions/:sessionId/pay-items` — 按菜品结账（标记 `paidItemIds`，创建 PaymentIntent）
- `POST /sessions/:sessionId/pay-percent` — 按百分比结账
- `POST /sessions/:sessionId/cash-payment` — 现金收款（管理端，需 auth）
- `GET /stores/:storeId` 返回 `taxRate`
- `PUT /stores/:storeId` 支持更新 `taxRate`/`serviceFeeRate`
- 设置页新增税率/服务费配置 UI

---

## Do NOT

- **不要动 `bee/` 目录** — 这是旧版微信小程序的参考代码，不参与当前项目构建
- **不要修改 Stripe webhook 签名验证逻辑** — `webhook.routes.ts` 使用 raw body parser，改动可能导致签名校验失败
- **不要在 `app.ts` 中把 `express.json()` 放到 webhook 路由之前** — webhook 需要 raw body
- **不要直接操作 `server/data/*.json` 文件** — 必须通过 `repositories/json-store.ts` 读写
- **不要在 `repositories/stores.ts` 之外创建 JsonStore 实例** — 所有单例集中管理，否则内存缓存不同步
- **不要在 `routes/` 文件中写业务逻辑** — 路由只做参数解析和响应，逻辑放 `controllers/`
- **不要在页面组件中直接调用 `fetch`** — 使用 `services/api.ts` 中的封装函数
- **不要用浮点数存储价格** — 全部用整数（分）
- **不要新增公开 API 端点返回全量数据** — 未认证请求必须限定范围（如 `tableId`），防止数据泄漏。参考 `GET /orders` 的 `optionalAuth` 模式
- **不要在 `shared/types.ts` 之外重复定义类型** — 前后端共享类型统一在 `shared/types.ts`，组件/store 通过 import 引用
- **不要在环境变量缺失时使用 fallback 默认值** — 关键配置（`JWT_SECRET`、`DATABASE_URL` 等）缺失时必须 throw，不允许 `|| 'dev-secret'`
- **不要绕过 RBAC 权限检查** — 新增的受保护端点必须使用 `requirePermission()` middleware，不要用旧的 `requireRole('owner')` 模式

---

## 改名 / 重构必须执行的检查清单

> 以下规则来自本项目多次踩过的坑。每次涉及**重命名函数、变量、类型、API 签名**时，必须逐条检查。

### 踩过的坑

| Bug | 根因 | 影响 |
|-----|------|------|
| `ReferenceError: clearCart is not defined` | `clearCart` 改名为 `clearMyItems`，但 useEffect 依赖数组 `[..., clearCart]` 未同步更新 | OrderConfirmPage 白屏 |
| `updateSessionCart` 调用参数不匹配 | 函数签名从 3 参数改为 4 参数（加了 `deviceId`），但 `OrderConfirmPage.tsx` 两处调用仍用旧的 3 参数 | 购物车同步失败 |
| Session `totalAmount` 始终为 0 | 订单在 session 集成之前创建，缺少 `sessionId` 字段，session 不知道有哪些订单 | Pay Now banner 永远不显示 |
| `served` 被错误等同于"已完成/已结账" | TablesPage 用 `status !== 'served'` 过滤 activeOrders → 菜上齐后 currentOrder 为 null → 结账按钮灰掉。MenuPage 同样把 served 归入"历史"并排除出 sessionOrders | 管理端：全部上菜后无法结账。顾客端：sessionOrders 只含 served，丢失 preparing/pending 的菜品 |
| 菜品行价格不含规格加价 | 5 个文件用 `item.price * item.quantity` 显示价格，遗漏 `selectedOptions[].priceAdjust` | 麻婆豆腐+大份(+$3) 显示 $12.99 而非 $15.99。订单总价正确但行项明细错误 |
| Ghost payment — 选菜品后未付款，items 被标记为 paid | `payByItems` 在计算时就执行了 `sessionStore.update(paidItemIds)`，用户放弃支付后状态无法回滚 | 选中的菜品卡在 "已付" 状态，无法再选，settlementMode 被锁定 |
| Stripe 支付后 session 不关闭 | `addPayment` 自动关闭检查用 `netDue`（不含税），但支付金额含税 → 全额付清后 `totalPaid >= netDue` 虽然为 true，但 `allServed` 检查时 orders 可能未全部 served | 付完钱但 session 保持 active，桌台不回到 idle |
| 管理端结账按钮打开 CloseTableDialog 而非 BillSettleDialog | 绿色"结账"按钮直接调 `closeTable()`（强制关 session 不管有没有付钱），蓝色"Session"按钮才是真正的结账入口但用户不知道 | 管理员点结账 → session 直接关闭 → 钱没收到 |
| 管理端刷卡只创建 PaymentIntent 不处理 | BillSettleDialog "刷卡" 按钮调 `createCheckoutForSession` 创建 intent 后就 refresh，没有实际收款流程 | 点刷卡 → 看起来成功 → 但没有支付记录，session 不会关闭 |
| 小费选择器在 pay-later 无效 | CheckoutPage `applyTip` 检查 `if (!state?.items) return`，pay-later 流程没有 items 只有 sessionId → 直接 return | 选小费后金额不变 |
| Stripe 支付金额不含税 | `createPaymentIntentForSession` 用 `remaining = netDue - totalPaid`（不含税）做上限，`Math.min(含税amount, 不含税remaining)` 把税截掉 | 客户实际被收 $31.98 而非 $34.82（缺少 $2.84 税） |
| 支付成功后显示错误订单金额 | OrderConfirmPage poll 取 `最近一笔订单` 而非 session 总支付，session 结账 $100 后显示单笔订单 $15.99 | 确认页显示金额与实际支付不符 |
| TablesPage 价格客户端自算与 session 不一致 | 桌台管理底部用 `orders.reduce(totalPrice)` + 硬编码税率 `0.1`/`0.05` 独立计算，不读 session summary | 显示金额与 BillSettleDialog 不一致，不反映优惠券和已付金额 |
| XSS via dangerouslySetInnerHTML | MenuPage 用自制 `sanitizeHtml()` 处理公告内容（不可靠），通过 `dangerouslySetInnerHTML` 渲染 | 恶意公告可执行 JS，窃取 localStorage token |
| Session 关闭后桌台仍显示已付订单 | `sessionOrders` 在 `currentSessionId` 为空时 fallback 到全桌 `status !== 'closed'`，但已付订单的 status 是 `served` 不是 `closed` | 桌台已结账 idle，当前 tab 仍显示所有历史订单，金额看起来未付 |
| Announcement 只显示中文 | MenuPage 弹窗始终用 `menu.store.announcement`，不检查 `lang` 和 `announcementEn` | 英文用户也看到中文公告 |
| OrderingSheet 用顾客 API 看不到 staffOnly 菜品 | `api.getMenu()`（顾客接口）过滤掉 `staffOnly` 的特殊菜品，管理端添加菜品时应该用 `api.getMenuItems()` | 管理员在桌台管理添加菜品时看不到 staffOnly 的特殊订单 |
| 小费无自定义金额输入 | TipSelector "Custom" 按钮 `onSelect(null)` → 小费归零，没有输入框 | 用户只能选 15%/18%/20%，无法输入自定义金额 |
| 税率/服务费标签硬编码百分比 | `admin.ts` 中 `taxFee: '税费 (5%)'`, `serviceFee: '服务费 (10%)'` 固定写死 | 修改税率后标签仍显示旧百分比 |
| 价格多处独立计算不一致 | TablesPage/SettlementSheet/BillSettleDialog 各自算税，和 server `getSessionSummary` 结果不同 | 同一笔账单在不同页面显示不同金额 |

### 必须执行的检查流程

**显示菜品行价格时：**
1. **永远不要用 `item.price * quantity`** — 必须加上 `selectedOptions` 的 `priceAdjust`
2. 正确公式: `(item.price + Σ opt.priceAdjust) * item.quantity`
3. `order.totalPrice` 是订单总价（已含 priceAdjust），但单品行需要自己算

**订单状态过滤时：**
1. `served` = 菜已送到桌上 ≠ 已结账。结账相关逻辑不能排除 `served`
2. `closed` = 已取消/已关闭。只有 `closed` 的订单才应该从结账流程中排除
3. 前端和后端过滤条件必须语义一致——同一个"活跃订单"概念不能在不同页面用不同过滤

**重命名函数/变量时：**
1. `grep -r "旧名字" client/ server/ shared/` — 找到所有引用，**包括 useEffect 依赖数组、回调参数名、解构名**
2. 全部替换后，`tsc --noEmit`（client + server 都跑）
3. 特别注意：React `useEffect` / `useCallback` / `useMemo` 的依赖数组中的变量名 — TypeScript 不会检查这些

**修改函数签名（加参数/改类型）时：**
1. `grep -r "函数名" client/ server/` — 列出所有调用点
2. 逐个检查参数是否匹配新签名
3. `tsc --noEmit` 验证

**修改 shared/types.ts 字段时：**
1. 改完类型后立即跑 `tsc --noEmit`（client + server）
2. 如果是 optional → required，所有构造该类型的地方都需要补字段
3. 如果是 required → 删除，grep 确认没有消费方还在读这个字段

**Agent / 并行修改后：**
1. 必须跑 `cd client && ./node_modules/.bin/tsc --noEmit`
2. 必须跑 `cd server && ./node_modules/.bin/tsc --noEmit`（过滤已知 Express 类型问题）
3. 0 新增 error 才算完成

---

## 通用防御规则（General Preventative Measures）

> 从本次 20+ 个 bug 中归纳的系统性规则。每次写新代码或修改现有代码时应用。

### 规则 1: 金额计算必须有唯一数据源

**问题模式**: 前端自己算税/总价/remaining，和后端算的不一致。
**规则**: 所有金额显示必须从 server session summary 读取，前端不得独立计算税/服务费/remaining。
**唯一例外**: 用户交互中的即时预览（如 SettlementSheet 的 debounce 计算），但最终提交金额必须以 server 返回为准。

### 规则 2: 副作用必须在确认后执行

**问题模式**: `payByItems` 在用户点击时就标记 `paidItemIds`，用户放弃支付后无法回滚。
**规则**: 任何改变数据状态的操作（标记已付、锁定模式、关闭 session）必须在支付/操作**确认成功后**才执行。计算和提交是两个独立步骤。
**Stripe 场景**: 计算 → 创建 PaymentIntent（含 metadata）→ 用户支付 → Webhook 确认 → 才执行副作用。

### 规则 3: Session 状态是桌台的 source of truth

**问题模式**: `currentSessionId` 为空时 fallback 到全桌订单 → 显示已付完的历史订单。
**规则**:
- 有 `currentSessionId` → 当前 tab 只显示该 session 的订单
- 无 `currentSessionId` → 当前 tab 为空，所有订单归入历史
- 不要用 `order.status` 来判断是否属于当前用餐，用 `sessionId` 匹配

### 规则 4: 同一概念在所有页面必须用同一过滤逻辑

**问题模式**: TablesPage 用 `status !== 'served'` 过滤，MenuPage 用另一套过滤，两边"活跃订单"定义不同。
**规则**: 提取为共享函数或常量。如果 A 页面改了过滤条件，B 页面必须同步。改一个地方时 `grep` 搜索所有使用同一概念的地方。

### 规则 5: 前端显示的比较基准必须和后端一致

**问题模式**: `addPayment` 用 `netDue`（不含税）判断是否付清，`getSessionSummary` 用 `totalWithTax`（含税）。
**规则**: 同一个判断（"是否付清"、"剩余金额"、"可选金额上限"）在前后端所有出现的地方，必须用完全相同的公式。改一处时 grep 搜索所有 `remaining`/`netDue`/`isPaid` 的计算点。

### 规则 6: i18n 不能硬编码动态值

**问题模式**: `taxFee: '税费 (5%)'` — 税率改了但标签还是 5%。
**规则**: i18n key 只放静态文案（"税费"、"服务费"），动态值（百分比、金额）在渲染时从数据拼接。

### 规则 7: 管理端和顾客端用不同的 API 端点

**问题模式**: OrderingSheet（管理端组件）用 `api.getMenu()`（顾客 API），看不到 `staffOnly` 菜品。
**规则**: 管理端组件必须用带 auth 的管理 API（`getMenuItems`/`getCategories`），顾客端用公开 API（`getMenu`）。新建组件时先确认它属于哪一端。

### 规则 8: 安全 — 不信任客户端，副作用在 server 执行

**问题模式**: 前端传 `amount` 给 `createCheckoutForSession`，server 用 `Math.min(amount, remaining)` 截断但 remaining 算错。
**规则**:
- Server 必须独立验证所有金额，不能信任客户端传的数字
- 状态变更（`paidItemIds`、`settlementMode`）只在 webhook 确认后由 server 执行
- 前端的 `amount` 只是"请求金额"，server 有权拒绝或调整

> Last updated: 2026-04-02 CST

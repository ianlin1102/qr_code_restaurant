# QR Code 扫码点餐 — 项目结构

## 目录结构

```
QR_Code/
├── client/                           # React 前端 (Vite + React Router)
│   ├── src/
│   │   ├── components/ui/           # shadcn/ui 组件库
│   │   │   ├── badge.tsx
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── input.tsx
│   │   │   ├── scroll-area.tsx
│   │   │   ├── select.tsx
│   │   │   ├── separator.tsx
│   │   │   ├── sheet.tsx
│   │   │   ├── switch.tsx
│   │   │   ├── table.tsx
│   │   │   └── textarea.tsx
│   │   ├── pages/
│   │   │   ├── customer/
│   │   │   │   ├── ScanPage.tsx         # 扫码着陆页，设置 session 后跳转菜单
│   │   │   │   ├── MenuPage.tsx         # 菜单浏览 + 规格选择 + 加购
│   │   │   │   ├── CartPage.tsx         # 购物车 + 下单
│   │   │   │   └── OrderConfirmPage.tsx # 下单成功确认页
│   │   │   └── admin/
│   │   │       ├── DashboardPage.tsx    # 订单面板 + 状态管理 + 订单修改
│   │   │       ├── MenuManagePage.tsx   # 菜品 CRUD + 规格管理 + 内联编辑
│   │   │       └── TablesPage.tsx       # 桌台 QR 码生成 & 打印
│   │   ├── hooks/                       # 自定义 React Hooks
│   │   ├── stores/
│   │   │   ├── session-store.ts     # Zustand: storeId / tableId 会话
│   │   │   └── cart-store.ts        # Zustand: 购物车（支持规格区分）
│   │   ├── services/
│   │   │   └── api.ts               # API 客户端（fetchJSON 封装）
│   │   ├── lib/
│   │   │   ├── format.ts            # 价格格式化 (分→元, ¥38.00)
│   │   │   └── utils.ts             # Tailwind cn() 工具
│   │   ├── App.tsx                  # React Router 路由配置
│   │   └── main.tsx                 # 入口文件
│   ├── vite.config.ts               # Vite 配置 (host: true, API proxy)
│   ├── tsconfig.json
│   └── package.json
│
├── server/                           # Express 后端
│   ├── src/
│   │   ├── routes/
│   │   │   ├── menu.routes.ts       # 菜单 & 分类路由
│   │   │   ├── order.routes.ts      # 订单路由
│   │   │   └── table.routes.ts      # 桌台路由
│   │   ├── controllers/
│   │   │   ├── menu.service.ts      # 菜单业务逻辑 (CRUD)
│   │   │   ├── order.service.ts     # 订单业务逻辑 (创建/状态/修改)
│   │   │   └── table.service.ts     # 桌台业务逻辑
│   │   ├── repositories/
│   │   │   └── json-store.ts        # 通用 JSON 文件存储 (CRUD)
│   │   ├── middleware/              # Express 中间件（租户验证、错误处理等）
│   │   ├── scripts/
│   │   │   └── print-table-urls.ts  # CLI: 打印桌台扫码 URL
│   │   ├── app.ts                   # Express 配置（middleware + 路由注册）
│   │   ├── server.ts                # 服务器启动入口 (0.0.0.0:3001)
│   │   └── seed.ts                  # 生成演示数据
│   ├── data/                         # JSON 数据文件（运行时持久化）
│   │   ├── stores.json
│   │   ├── categories.json
│   │   ├── menu-items.json
│   │   ├── tables.json
│   │   └── orders.json
│   ├── tsconfig.json
│   └── package.json
│
├── shared/                           # 共享 TypeScript 类型
│   ├── types.ts                      # 所有接口定义
│   └── package.json
│
├── docs/
│   ├── feature-checklist.md          # 功能清单 & 进度
│   ├── project-structure.md          # 本文件
│   └── plans/                        # 设计文档 & 实施计划
│
├── pnpm-workspace.yaml               # pnpm monorepo 配置
└── package.json                       # 根 package.json
```

---

## 数据结构 (shared/types.ts)

### Store 门店

```typescript
interface Store {
  id: string              // "store-demo-001"
  name: string            // "Demo Restaurant"
  logo?: string
  description?: string
  openingHours?: string   // "09:00-22:00"
  createdAt: string
}
```

### Category 分类

```typescript
interface Category {
  id: string
  storeId: string
  name: string            // "热菜", "凉菜", "饮品", "主食"
  sortOrder: number
}
```

### MenuItem 菜品

```typescript
interface MenuItem {
  id: string
  storeId: string
  categoryId: string       // → Category.id
  name: string             // "宫保鸡丁"
  description?: string     // "经典川菜"
  price: number            // 3800 = ¥38.00（分为单位）
  image?: string
  available: boolean       // 上架/下架
  sortOrder: number
  options?: MenuItemOption[]  // 规格选项组
}

interface MenuItemOption {
  id: string
  name: string             // "辣度", "口味", "份量"
  required: boolean        // 是否必选
  choices: MenuItemOptionChoice[]
}

interface MenuItemOptionChoice {
  id: string
  name: string             // "微辣", "大份"
  priceAdjust: number      // 加价（分），0 = 不加价
}
```

### Table 桌台

```typescript
interface Table {
  id: string
  storeId: string
  name: string             // "A1", "B2"
  qrCode?: string
  status: 'idle' | 'occupied'
  currentOrderId?: string  // → Order.id
}
```

### Order 订单

```typescript
type OrderStatus = 'pending' | 'preparing' | 'completed'

interface Order {
  id: string
  orderNumber: string      // 人类可读编号 "A001", "A002"
  storeId: string
  tableId: string          // → Table.id
  tableName: string        // 快照桌号
  items: OrderItem[]
  totalPrice: number       // 总价（分），含规格加价
  status: OrderStatus
  customerName?: string
  createdAt: string
  updatedAt: string
}

interface OrderItem {
  menuItemId: string       // → MenuItem.id
  name: string             // 快照菜名（下单时冻结）
  price: number            // 快照基础价（下单时冻结）
  quantity: number
  remark?: string
  selectedOptions?: SelectedOption[]  // 快照已选规格
}

interface SelectedOption {
  optionId: string
  optionName: string       // "辣度"
  choiceId: string
  choiceName: string       // "中辣"
  priceAdjust: number      // 加价（分）
}
```

### CartItem 购物车项（前端）

```typescript
interface CartItem {
  menuItemId: string
  name: string
  price: number            // 基础价
  quantity: number
  remark?: string
  selectedOptions?: SelectedOption[]
}

// cart-store 内部扩展
type CartEntry = CartItem & { cartKey: string }
// cartKey = menuItemId + 规格组合，同一菜不同规格 = 不同条目
```

---

## API 端点

**基础 URL**: `http://localhost:3001/api`
**代理**: Vite dev server `/api` → `localhost:3001`

### 健康检查

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 服务状态 |

### 菜单 `/api/stores/:storeId/menu`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/` | 顾客菜单（仅上架菜品） → `MenuResponse` |
| GET | `/items` | 管理端所有菜品（含下架） → `MenuItem[]` |
| POST | `/items` | 添加菜品 |
| PUT | `/items/:itemId` | 修改菜品 |
| DELETE | `/items/:itemId` | 删除菜品 |
| GET | `/categories` | 所有分类 |
| POST | `/categories` | 添加分类 |
| PUT | `/categories/:catId` | 修改分类 |
| DELETE | `/categories/:catId` | 删除分类 |

### 订单 `/api/stores/:storeId/orders`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/` | 创建订单（验证菜品、计算总价、更新桌台状态） |
| GET | `/` | 获取订单列表，可选 `?status=pending` 筛选 |
| PATCH | `/:orderId/status` | 更新状态 (pending→preparing→completed) |
| PUT | `/:orderId/items` | 服务员修改订单项（增删菜品、改规格/备注、重算价格） |

### 桌台 `/api/stores/:storeId/tables`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/` | 获取所有桌台 |

---

## 前端路由

### 顾客端

| 路径 | 组件 | 说明 |
|------|------|------|
| `/scan/:storeId/:tableId` | ScanPage | 扫码入口，设置 session 后跳转菜单 |
| `/menu/:storeId` | MenuPage | 分类侧边栏 + 菜品列表 + 规格选择 Sheet |
| `/cart` | CartPage | 购物车（显示规格、备注、小计） |
| `/order/confirm` | OrderConfirmPage | 下单成功页（订单号、明细） |

### 管理端

| 路径 | 组件 | 说明 |
|------|------|------|
| `/admin/dashboard` | DashboardPage | 订单面板（筛选/状态更新/修改订单） |
| `/admin/menu` | MenuManagePage | 菜品管理（表格视图/预览视图/内联编辑） |
| `/admin/tables` | TablesPage | QR 码生成 & 打印 |
| `*` | → `/admin/dashboard` | 默认跳转 |

---

## 文件引用关系

```
App.tsx (路由)
  ├── 顾客端
  │   ├── ScanPage → session-store (setSession) → 跳转 MenuPage
  │   ├── MenuPage → cart-store (addItem) + api.getMenu()
  │   ├── CartPage → cart-store + api.createOrder()
  │   └── OrderConfirmPage → 显示 order state
  └── 管理端
      ├── DashboardPage → api.getOrders/updateStatus/updateItems + api.getMenu
      ├── MenuManagePage → api.getMenuItems/createMenuItem/updateMenuItem/deleteMenuItem
      └── TablesPage → fetch(/api/.../tables)

api.ts (HTTP 客户端)
  └── 调用 Express 路由 /api/stores/:storeId/...

Express app.ts → server.ts (服务端)
  ├── menu.routes.ts → controllers/menu.service.ts → repositories/JsonStore<MenuItem>, JsonStore<Category>
  ├── order.routes.ts → controllers/order.service.ts → repositories/JsonStore<Order>, JsonStore<Table>
  └── table.routes.ts → controllers/table.service.ts → repositories/JsonStore<Table>

JsonStore<T> (通用存储)
  ├── stores.json      → Store
  ├── categories.json  → Category
  ├── menu-items.json  → MenuItem
  ├── tables.json      → Table
  └── orders.json      → Order
```

---

## 关键设计决策

| 决策 | 说明 |
|------|------|
| 价格用分 (cents) | 避免浮点精度问题，3800 = ¥38.00 |
| 订单快照 | OrderItem 冻结菜名/价格/规格，菜单改价不影响历史订单 |
| cartKey 区分规格 | 同一菜品不同规格 = 购物车中不同条目 |
| JSON 文件存储 | MVP 阶段简单可靠，后续迁移到 SQLite → PostgreSQL |
| 0.0.0.0 监听 | 支持局域网访问（手机扫码 + 电脑后台） |
| 订单号生成 | A001-A999, B001-B999... 人类可读 |

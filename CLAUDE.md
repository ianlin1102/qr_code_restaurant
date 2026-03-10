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

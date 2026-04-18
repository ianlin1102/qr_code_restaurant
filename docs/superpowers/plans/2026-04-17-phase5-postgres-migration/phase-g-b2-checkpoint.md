# Phase 5 Plan — Phase G 段 3：B2 Manual Checkpoint（Task 35）

> **如何使用本文件**
>
> - 全局规则见 [`00-index.md`](./00-index.md#全局规则所有-task-遵守)
> - 前置：段 1 + 段 2 plan 完成（Task 32-34）**且**实施到位（DB migration + session-cart B2 重写 + D58 路径 X 落地 + 前端字段迁移 + 6 项 Phase D 回填）
> - spec 锚点：`§9.8 line 1282-1301` MANUAL CHECKPOINT (D50) 原文 7 场景清单
> - 模板源：[`phase-g-handoff.md`](../work-logs/2026-04-17-phase-g-handoff.md) §5e（Task 35 粒度约定，2026-04-17 Ian 补齐）
> - **执行方式**：Phase G agent 写完段 2 实施后**停下**，顺序执行 a-g 7 场景。每场景独立 pass/fail 反馈——**不等全跑完一起报**（后面失败会被前面副作用淹没）

## 规则 8 写作期自查记录

段 3 写作期规则 8 预警信号全部未触发：
- ✅ 每场景 intent 基于 spec 明确规则（B2 设计 / spec §9.8 场景 d / deviceId 隔离 / partial unique 语义）或 D58 决议，非凭印象构造
- ✅ UI / URL / 按钮位置不确定处**全标 `[NEEDS FRONTEND VERIFICATION, Phase G implementation]`**，不编造
- ✅ 场景 e 在 D58 路径 X 下 pay-later 分支语义核对：路径 X 仅约束 pay-first 流，pay-later 走 submit = transitionStatus draft→pending（和 Y/Z 行为一致），**无未覆盖边界**——未触发暂停
- ✅ Pending commits ≤ 1（本 C3 是唯一 pending）

## Pending commits 清单（规则 8.1 实时打勾）

- [x] C1 段 1：`phase-g-session-order.md` — `cfee51be`
- [x] C2a：`phase-g-section-2-grep.md` — `257e470f`
- [x] C2b-amended：`phase-g-session-cart-b2.md` D58 路径 X 决议 + 选项 A 成本 + 5 理由 — `ccf7fce8`
- [ ] **C3：本文件** `phase-g-b2-checkpoint.md`（Task 35, 7 场景 a-g）

段 3 push 后：3/4 → **4/4 done**（本 session pending 清零）。收尾 commit 另计（阶段 3 流程）。

## D50 原文摘抄（规则 7 强化：原文先行）

spec `§9.8 line 1282-1301`：

> `>>> 🛑 MANUAL CHECKPOINT (D50) <<<`
>
> 主 agent 停下，通知用户手动验证 7 个场景（a-g 独立 pass/fail，不要等全跑完才反馈）：
>
> - a. 顾客扫码进桌 → 加 3 道菜 → 购物车数据落在 draft order
> - b. 关页面重开 → 购物车菜品还在（从 draft order 恢复）
> - c. 换设备扫同一桌 → 不看到 A 设备的购物车（deviceId 隔离）
> - d. Pay-first 付款：点先付 → Stripe 取消 → 回菜单购物车菜还在（B2 修复的 bug）
> - e. 多设备同时加菜到各自购物车 → 都能独立提交成独立 order
> - f. 提交后的 order 在 kitchen 视图可见
> - g. 提交后的 draft 行消失（允许同一 deviceId 重新加菜建新 draft）
>
> 执行规则：
> - a-g 按顺序独立验证，每条单独报 passed/failed
> - 不要等全跑完一起反馈（后面失败会被前面副作用淹没）
> - 用户回复"checkpoint passed"才继续后续步骤
> - 任意一条 failed → 主 agent 修复该条 → 重跑
> - 该 commit 打 tag `phase5-b2-checkpoint` 作为已知稳定回滚点

---

## 场景 a：顾客扫码进桌 → 加 3 道菜 → draft order 有

**Verification intent**（为什么测这个）：

验证最基础的 B2 写入路径——从扫码进桌到 cart 加菜的完整链路能从 legacy `session.pendingCart` 切换到 `Order (status='draft')`，且 draft 行持久化到 DB。**这是所有其他场景的基础**，失败则 b-g 都无意义（它们都依赖"a 产出的 draft 存在"）。

**Concrete steps**（当下怎么做）：

1. 设置环境：local dev stack 运行（`docker compose up` + `pnpm dev`），至少 1 个 menu item 存在于测试 store
2. 打开浏览器 incognito 窗口（排除 localStorage 干扰）
3. 访问桌 T 的扫码 URL `[NEEDS FRONTEND VERIFICATION, Phase G implementation: 扫码 URL pattern 应包含 storeId + tableId，实施期确认参数格式]`
4. UI 展示菜单页 + 顶部"桌 T"标识
5. 依次点击 3 个不同 menu items 的"加入购物车"按钮
6. cart 图标数字变 3
7. 打开 Prisma Studio（`cd server && npx prisma studio`）或 psql 连 dev DB
8. 执行查询：
   ```sql
   SELECT o.id, o.status, o.device_id, o.version, o.created_at,
          (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) AS item_count
   FROM orders o
   JOIN sessions s ON s.id = o.session_id
   WHERE s.table_id = (SELECT id FROM tables WHERE name = 'T' LIMIT 1)
     AND o.status = 'draft';
   ```
9. 验证点 1：返回 **1 行**
10. 验证点 2：`item_count = 3`
11. 验证点 3：`device_id` 非空（和浏览器 `getDeviceId()` 返回值一致——`[NEEDS FRONTEND VERIFICATION: DevTools Console 读 localStorage.getItem('deviceId')]`）
12. 验证点 4：`version = 0`（初始 draft，未被 replace）**或** `version = 1`（如果加菜是 3 次独立 replaceDraftItems）`[DESIGN CLARIFICATION: 前端加菜是批量 debounce 1 次 push 还是每次加菜独立 push？C2a §1 显示 useCartSync:99 debounce 1s——答案应是 1，但 version 精确值依赖实施期 debounce 边界情况]`

**Failure mode handling**：

如果 DB 查询返回 0 行但 session.pendingCart 有数据 → 说明 Task 34 session-cart.ts 重写**未 rewire 到 orderRepo**，仍在写 legacy `session.pendingCart` JSON 字段。回到 intent：验证"B2 切换到 draft Order 表"——检查 `session-cart.ts` 的 `updateDeviceCart` 实现是否调用 `orderRepo.createDraftOrder` / `replaceDraftItems`（而非 `sessionStore.update({pendingCart: ...})`）。

如果 DB 有多行 draft（不是 1 行）→ 说明 partial unique `(session_id, device_id) WHERE status='draft'` 约束未生效（可能 Prisma migration 未包含 partial index）或 debounce 失败（每次加菜产生新 draft）。Intent 是"单 deviceId 单 draft"——查 migration + findDraft 实现。

**Pass criteria**：DB 查询返回恰好 1 行 status='draft' order，item_count = 3，device_id 和 browser localStorage deviceId 一致。

**Tag on pass**：记录 `phase5-b2-checkpoint.scenario-a.pass` 到 work-log（下方 tag 操作小节）。

---

## 场景 b：关页面重开 → 购物车从 draft 恢复

**Verification intent**（为什么测这个）：

验证 draft Order 的**服务端持久化语义** + 前端的 fetch-restore 路径——关掉页面（本地 React state 全清）再重开，`fetchAndApply`（`useCartSync.ts:90-96`）能从 GET /cart API 拉到 draft 数据还原 cart UI。这个场景的失败模式通常是"前端误依赖 localStorage/sessionStorage 存 cart items"（legacy 遗留逻辑），B2 后的正确设计是 **deviceId 存 localStorage + items 服务端权威**。

**Concrete steps**：

1. 承接场景 a：3 道菜已落在 draft Order
2. 关闭浏览器 tab
3. DevTools → Application → **Session Storage** 全清（本标签页临时 state）`[NEEDS FRONTEND VERIFICATION: 当前应用是否在 session storage 存 cart items，实施期 grep client/src 确认]`
4. **不要**清 Local Storage——deviceId 存在那里，清了就模拟成"新设备"，变成场景 c
5. 重新打开浏览器（或重开 tab）→ 访问同桌 T 的扫码 URL
6. 验证点 1：cart 图标数字显示 3（从 fetchAndApply 还原）
7. 验证点 2：打开 cart 详情，列表显示场景 a 加的 3 道菜
8. 操作："+" 第 4 道菜
9. DB 验证：
   ```sql
   SELECT (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) AS items
   FROM orders o WHERE o.status='draft' AND o.device_id = '<A 的 deviceId>';
   ```
   返回 **4**
10. DB `orders.version` 值相比场景 a 结束时 +1 或更多（replaceDraftItems 发生）

**Failure mode handling**：

如果重开后 cart 显示为空 → 检查：
- **fetch 是否发起**：DevTools Network 看 `GET /api/stores/:storeId/sessions/:sessionId/cart` 是否 200 + 非空响应
- **deviceId 是否保留**：Console 读 `localStorage.getItem('deviceId')` 和场景 a 时一致
- **sessionId 是否一致**：扫码 URL 解析出的 session 是否和场景 a 是同一个（如果 legacy 代码清 session 会变成新 session）

Intent 是"draft 服务端持久化 + fetch 还原"——**不是**"前端 state 持久化"。如果发现 "关页面 + 清 localStorage = cart 消失"说明逻辑反了（items 在 localStorage 存了）。

**Pass criteria**：重开后 cart UI 显示 3 道菜 + 能继续加到 4 道。

**Tag on pass**：`phase5-b2-checkpoint.scenario-b.pass`

---

## 场景 c：换设备扫同桌 → 不看到 A 的购物车（deviceId 隔离）

本场景是 handoff §5e 模板的**示例场景**，Task 35 粒度模板就以场景 c 为范本。本 plan 按模板字面应用到 B2 实际行为。

**Verification intent**（为什么测这个）：

防止同一 sessionId 下 deviceId A 的 cart 泄露到 deviceId B。这是 **B2 deviceId 隔离的核心不变量**。违反会导致多人同桌时购物车互相污染——顾客 A 加的菜出现在顾客 B 手机上，顾客 B 误删 / 误下单，是**严重体验事故**。

spec §4.1 Order `@@unique([session_id, device_id]) WHERE status='draft'`（handoff §5b）直接约束这个隔离——Partial unique 从 DB 层让"一个 session + 一个 device = 最多一个 draft"，B 无法看到 A 的 draft（B 查 `findDraft(session, B)` 只返 B 自己的）。

**Concrete steps**：

1. 承接场景 a / b：Device A 已有 4 道菜在 draft
2. 拿另一台物理设备（或另一个浏览器 incognito 窗口，保证 `getDeviceId()` 返回不同值）
3. Device B 访问**同一桌 T 的扫码 URL**
4. Device B 的 cart UI 加载
5. 验证点 1：Device B 的 cart 图标数字 = **0**（空）`[NEEDS FRONTEND VERIFICATION: cart 图标是否显示 0 或隐藏——实施期检查 UI 设计]`
6. 验证点 2：打开 Device B 的 cart 详情，列表为空（不含 A 的 4 道菜）
7. Device B 加一道菜 Y（选 menu 中任意一项）
8. DB 验证：
   ```sql
   SELECT device_id, (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) AS items
   FROM orders o WHERE o.session_id = '<T 的 session id>' AND o.status = 'draft'
   ORDER BY o.created_at;
   ```
   返回 **2 行**：
   - (deviceId=A, items=4)
   - (deviceId=B, items=1)
9. 验证点 3：回 Device A 界面，刷新 cart（useCartSync poll / SSE）
10. 验证点 4：Device A 的 cart 仍含原 4 道菜（**未被 B 污染**）

**Failure mode handling**：

如果 Device B 打开后**看到 A 的 cart items** → 说明 fetch API 没按 deviceId 过滤或 server 端 `flatten` 返回了所有 device items（选项 A 实施错误）。检查 D58 选项 A/B/C 哪个选定 + 对应的服务端实现。如果选了选项 A 的 flatten，需要前端按 `item.addedByDevice` 过滤"非本 device items 只读展示不可操作"（legacy 行为）——但场景 c 语义是**完全隐藏他 device items**，需要 clarify 产品意图。

如果 DB 只 1 行 draft（B 的写覆盖了 A）→ **partial unique 约束失效**或 `updateDeviceCart` 没按 deviceId 分派。检查 migration 里的 partial index 定义 + `orderRepo.findDraft(sessionId, deviceId, tx)` 的 where 子句是否含 `deviceId`。

Intent 永远不会过期：deviceId 隔离。steps 过期时参考 intent 重写。

**Pass criteria**：Device B 初始 cart 空 + 加自己的菜后 DB 2 行 draft（deviceId 各一） + Device A cart 未被影响。

**Tag on pass**：`phase5-b2-checkpoint.scenario-c.pass`

---

## 场景 d：Pay-first 付款 → Stripe 取消 → 回菜单购物车菜还在（B2 修复的 bug，D58 路径 X）

**Verification intent**（为什么测这个）：

**B2 修复的核心 bug 验证**（spec §1 line 13 + D6 原文："B2 天然解决 Pay-first 购物车丢失 bug"）。Legacy 行为：pay-first 模式点"去付款"后服务端清空 `session.pendingCart`，如果 Stripe 付款失败/取消，顾客回菜单看到**空 cart**——要重新加菜，糟糕体验。

**D58 路径 X 语义**（ccf7fce8 决议）：submit 不删 draft，draft 保持 `status='draft'` 直到 webhook 确认支付成功才 `submitDraft` 转 pending。取消/失败路径下 draft **零动作**——顾客回菜单 cart 自然还在。

场景 d 是 D58 路径 X 的**直接功能验证**。失败意味着路径 X 未正确实施（有人写了"submit 清 draft"的 legacy 习惯代码），或前端 fetch 路径问题。

**Concrete steps**：

1. 确保 Store 配置 `payment_mode='pay-first'`：
   ```sql
   UPDATE stores SET payment_mode = 'pay-first' WHERE id = '<test store id>';
   ```
2. 清理环境：Device A 重新扫码进桌 T（新 session 或复用）
3. 加 3 道菜 → DB 有 1 行 draft（类似场景 a 产出）
4. 点击 cart 页"去付款"按钮 `[NEEDS FRONTEND VERIFICATION, Phase G implementation: 按钮 label + 位置]`
5. DB 验证点 1（**D58 路径 X 核心**）：
   ```sql
   SELECT status, version FROM orders WHERE device_id = '<A>' AND session_id = '<T 的 session>';
   ```
   返回 `status = 'draft'`（**不是 'pending'**——路径 X 语义：submit 不翻状态）
6. Stripe checkout iframe/redirect 展示
7. 输入 Stripe 测试卡 `4000 0000 0000 0002`（Stripe 文档："This card will always be declined."——用户可感知 decline 模拟取消路径；**若要测 explicit cancel 走 `payment_intent.canceled` webhook，使用 Stripe Dashboard 手动取消 PaymentIntent** `[NEEDS VERIFICATION: checkpoint 预期是 card decline 还是 user cancel，两者 webhook 事件不同：card decline → payment_intent.payment_failed，cancel → payment_intent.canceled]`）
8. Stripe 返回失败 → 浏览器导航回菜单页 `[NEEDS FRONTEND VERIFICATION: Stripe 返回 URL 配置]`
9. 验证点 2：菜单页 cart 图标显示 3（**非空**）
10. 验证点 3：打开 cart 详情，列表显示场景 d step 3 加的 3 道菜
11. 验证点 4（DB）：
    ```sql
    SELECT status, version, (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) AS items
    FROM orders o WHERE o.device_id = '<A>' AND o.session_id = '<T 的 session>';
    ```
    返回 1 行：`status = 'draft'` + `items = 3`（draft 仍在，items 完整）
12. 验证点 5（事件记录）：`payment_intents` 相关日志或 Stripe Dashboard 看到 PaymentIntent 失败事件——确认**webhook 正确识别失败**（否则 draft 可能被错误 submitDraft）

**Failure mode handling**：

如果回菜单 **cart 空** → D58 路径 X 未正确实施。常见错误：
- `submitSessionCart` 仍有"清 draft / 清 items"代码（legacy 遗留）——**删掉这段**
- webhook handler 在 `payment_intent.payment_failed` / `canceled` 分支**错误调用 submitDraft**——只有 `payment_intent.succeeded` 才能 submitDraft
- 前端取消后**主动调用 `api.updateSessionCart(..., [])`**（legacy `OrderConfirmPage.tsx:46-50` / `85-89` 代码路径，B2 后不该保留）

如果 cart 含**其他设备的菜** → 混进了场景 c 的 bug（deviceId 隔离失效），优先修场景 c。

如果 DB `status = 'pending'` 但 cart 页仍展示——**数据不一致**：DB 说已 submit 但 UI 说还在 cart。检查 submitDraft 是否在 pay-first 分支被**错误调用**（路径 X 严格禁止此 pre-webhook）。

Intent 永远不变：pay-first 取消后购物车持久化——D58 路径 X 在服务端的实现就是 "submit 不触 draft，webhook 确认才动"。

**Pass criteria**：Stripe 取消后 DB draft 仍 `status='draft'` + `items = 3` + 菜单页 cart UI 显示完整 3 道菜。

**Tag on pass**：`phase5-b2-checkpoint.scenario-d.pass`

---

## 场景 e：多设备各自 draft → 各自提交成独立 order

**Verification intent**（为什么测这个）：

验证 B2 deviceId 粒度下的**并发提交**——两个 device 同时有各自 draft，独立 submit 后各生成独立 submitted order（不混 items、不丢失、不覆盖）。场景 c 验证**读**隔离（device 不看他 device 的 cart），场景 e 验证**写**独立（device 的 submit 不影响他 device 的 draft）。

**D58 路径 X 语义核对**：路径 X 只约束 pay-first 流（submit 不删 draft）。场景 e 是 **pay-later 流**（submit 直接 transitionStatus draft→pending）——pay-later 下路径 X 和 Y/Z 行为一致，所以场景 e 不强依赖路径 X 决议，但仍受 deviceId 隔离和 partial unique 约束。

**Concrete steps**：

1. 设置 Store `payment_mode='pay-later'`：
   ```sql
   UPDATE stores SET payment_mode = 'pay-later' WHERE id = '<test store id>';
   ```
2. 清理：两个 devices（A、B）都清 browser session storage，但保 localStorage（deviceId）
3. Device A 扫码进桌 T → 加菜品 X1, X2
4. Device B 扫码进同桌 T → 加菜品 Y1, Y2
5. DB 验证点 1：
   ```sql
   SELECT device_id, (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) AS items
   FROM orders o WHERE o.session_id = '<T 的 session>' AND o.status = 'draft'
   ORDER BY device_id;
   ```
   返回 **2 行**：
   - (A, items=2 with X1/X2)
   - (B, items=2 with Y1/Y2)
6. Device A 点"提交订单"按钮 `[NEEDS FRONTEND VERIFICATION: 按钮位置——cart 页底部 or top bar]`
7. 前端调 `POST /submit-cart`
8. DB 验证点 2（A 提交后）：
   ```sql
   SELECT device_id, status, (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) AS items
   FROM orders o WHERE o.session_id = '<T 的 session>'
   ORDER BY o.created_at;
   ```
   返回 2 行：
   - (A, status='pending', items=2) ← A 的 draft 已 submitDraft
   - (B, status='draft', items=2) ← B 的 draft **不受影响**
9. Device B 点"提交订单"
10. DB 验证点 3（B 提交后）：
    返回 2 行：
    - (A, status='pending', items=2)
    - (B, status='pending', items=2)
11. 验证点 4：A 和 B 是**两个独立 Order 行**（不同 order.id），items 完整分离（X 不到 B 那边，Y 不到 A 那边）

**Failure mode handling**：

如果 A submit 后 **B 的 draft 也被影响**（items 变、status 翻） → 说明 `submitDraft` 未按 orderId 精确定位，而是广播式处理 session 下所有 draft。检查 `orderRepo.submitDraft(orderId, expectedVersion, tx)` 的 where 子句是否含 `id = orderId`。

如果 A submit 报错 `OPTIMISTIC_LOCK_CONFLICT` 但 A 没被并发改过——检查 `expectedVersion` 传递链（前端 cart store 的 `cartVersion` → `api.submitSessionCart` 参数 → 服务端 `submitDraft` expectedVersion）是否正确跟踪。

如果两个 submit 共享一个 order（只 1 行 pending）——**严重**：deviceId 隔离完全失效，partial unique 约束未生效，或 submitDraft 错误地把 A/B 合并。立刻停，检查 migration + submitDraft 实现。

Intent 不变：deviceId 粒度独立提交，多 draft 变多 independent pending orders。

**Pass criteria**：两次 submit 后 DB 有 2 独立 pending orders（A 和 B 各一），items 完整分离。

**Tag on pass**：`phase5-b2-checkpoint.scenario-e.pass`

---

## 场景 f：提交后 kitchen 视图可见

**Verification intent**（为什么测这个）：

验证 submit 链路完成 → kitchen KDS 端能看到新 order。B2 下 `orderRepo.findActive(storeId, tx)` 按 `status IN ('pending', 'preparing')` 过滤（`phase-d-repositories.md` Task 17 签名确认），submit 后的 `pending` order 应出现在 kitchen。失败说明 findActive 语义未对齐 submitDraft 的目标状态，或 kitchen 视图前端调了错的 API。

**Concrete steps**：

1. 承接场景 e 末：DB 有 2 行 pending orders（A 和 B）
2. 开新 tab，访问 admin dashboard URL `[NEEDS FRONTEND VERIFICATION, Phase G implementation: admin dashboard URL 路径]`
3. 管理员登录 `[NEEDS FRONTEND VERIFICATION: 登录凭据——dev 环境默认账号或 seed 的 owner]`
4. 导航到 "Kitchen" 或 "KDS" 视图 `[NEEDS FRONTEND VERIFICATION: 菜单项精确 label + 路径]`
5. 验证点 1：kitchen 视图列出 2 个 orders，分别显示 items X1/X2 和 Y1/Y2
6. 验证点 2：每个 order 显示 table = T（来自 `order.tableId`）
7. 点击其中一个 order 的"开始制作"或"preparing"按钮 `[NEEDS FRONTEND VERIFICATION: 按钮 label]`
8. DB 验证：
   ```sql
   SELECT status FROM orders WHERE id = '<点击的 order id>';
   ```
   返回 `status = 'preparing'`（`orderRepo.updateStatus` 成功）
9. 验证点 3：kitchen 视图该 order 状态更新（或移到 "preparing" 区域）

**Failure mode handling**：

如果 kitchen 视图看不到 order → 检查：
- **SSE 是否推送**：`store:orders` 事件（phase-g-session-order.md 段 1 Task 33 emit 清单的 line 130/159/227/262/319）应在 submitDraft 后触发——DevTools Network 看 SSE 流
- **findActive 查询**：kitchen 视图背后的 `listKitchenOrders` API → `orderRepo.findActive(storeId)` 是否含 `status IN ('pending', 'preparing')`
- **RLS**：如果 admin 和 customer 是跨租户，kitchen 视图的 tenant context 是否对（Phase B `withTenantContext` 传 storeId）

如果 kitchen 显示但 items 不对（只有 X 没有 Y 或反）→ submitDraft 没为 B 独立生成 order（场景 e 失败）。

Intent：submit 后 order 进入 kitchen 可见范围——findActive 包含 pending/preparing。

**Pass criteria**：kitchen 视图显示场景 e 的 2 个 orders + items 完整 + status 能翻 pending → preparing。

**Tag on pass**：`phase5-b2-checkpoint.scenario-f.pass`

---

## 场景 g：提交后 draft 消失 + 同 deviceId 可建新 draft

**Verification intent**（为什么测这个）：

验证 submit 释放 partial unique 约束——submit 后原 draft 的 `status` 从 `'draft'` 翻到 `'pending'`，从 `(sessionId, device_id) WHERE status='draft'` unique 空间**消失**，同 deviceId **可以重新加菜创建新 draft**（一顿饭多轮加菜：吃完主菜再加甜点的场景）。这验证 partial unique constraint 的正确语义——**已 submit 的 order 不占 draft slot**。

**Concrete steps**：

1. 承接场景 e/f：Device A 已 submit，DB 有 `(A, status='pending')` 一行
2. DB 验证点 1：
   ```sql
   SELECT COUNT(*) FROM orders WHERE device_id = '<A>'
     AND session_id = '<T 的 session>' AND status = 'draft';
   ```
   返回 **0**（A 的 draft 已转 pending，draft slot 空出）
3. Device A 继续在菜单页加一道菜 Z（吃完主菜加甜点的用户行为）
4. 前端 useCartSync 触发 `api.updateSessionCart(storeId, sessionId, deviceId=A, items=[Z])`
5. 服务端：
   - `orderRepo.findDraft(sessionId, 'A', tx)` → `null`（partial unique 不阻挡）
   - → 分支到 `orderRepo.createDraftOrder({storeId, sessionId, tableId, deviceId='A', items=[Z]}, tx)`
   - → 插入新 draft Order（partial unique 允许，因为原 A pending 不占约束）
6. DB 验证点 2：
   ```sql
   SELECT id, status, version, (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) AS items
   FROM orders o WHERE o.device_id = '<A>' AND o.session_id = '<T 的 session>'
   ORDER BY o.created_at;
   ```
   返回 **2 行**：
   - (先前的 submitted order, status='pending', items=2) ← 场景 e 那个
   - (新 draft, status='draft', items=1) ← 新加的 Z
7. 验证点 3：两行的 `id` 不同（是独立 orders，不是同一行 status 翻回）
8. 验证点 4：Device A cart 图标显示 1（只含 Z，不含已 submit 的 X1/X2）

**Failure mode handling**：

如果 step 4 报 `P2002 unique constraint failed` → **partial index 定义错**。检查 migration SQL：
- 正确：`CREATE UNIQUE INDEX order_draft_unique ON orders (session_id, device_id) WHERE status = 'draft';`
- 错误：去掉 `WHERE` 子句 → 全量 unique，submit 后原行仍占约束 → 新 draft 插不进
- 错误：`WHERE status != 'closed'` → 过宽

如果 DB 只 1 行（新 draft 覆盖了原 pending 或反）→ `createDraftOrder` 的 insert 语义错误（可能是 upsert 不是 insert），或者 pending order 被意外 update 成 draft。

如果 cart UI 还显示已 submit 的 X1/X2 → `fetchAndApply` 没过滤 draft-only（session 里所有 orders 都 flatten 进 cart 视图）。检查 GET /cart API 是否只返 draft items（选项 A）还是返所有 orders（错误）。

Intent：partial unique 语义正确——已 submit 的 order 不占 draft slot，同 deviceId 可建新 draft。

**Pass criteria**：新 draft 创建成功（DB 新增 1 行 status='draft'），原 pending order 不受影响（仍 status='pending'），cart UI 只显示新 draft items。

**Tag on pass**：`phase5-b2-checkpoint.scenario-g.pass`

---

## 7 场景全 pass 后的 tag 操作

**仅当 a-g 全部独立 pass** 后执行下方步骤。任一 scenario fail → 主 agent 修复该条 → 重跑该 scenario + 向后的 scenario（依赖关系）。

**步骤 1**：确认所有 scenario tag 已登记（work-log / 用户回复 "checkpoint passed"）：

```
phase5-b2-checkpoint.scenario-a.pass
phase5-b2-checkpoint.scenario-b.pass
phase5-b2-checkpoint.scenario-c.pass
phase5-b2-checkpoint.scenario-d.pass
phase5-b2-checkpoint.scenario-e.pass
phase5-b2-checkpoint.scenario-f.pass
phase5-b2-checkpoint.scenario-g.pass
```

**步骤 2**：在 main 分支打 git tag：

```bash
# 确保 main 分支是当前 B2 重写完成的 HEAD
git checkout main
git pull origin main  # 同步最新

# 打轻量 tag（如需带 message 用 -a）
git tag -a phase5-b2-checkpoint -m "Phase 5 B2 重写完成 + 7 scenarios all pass (D50 checkpoint)

Scenarios passed:
- a. scan → add 3 items → draft order exists
- b. close + reopen → cart restored from draft
- c. another device on same table → no cross-device leak
- d. pay-first cancel → cart survives (D58 path X)
- e. multi-device concurrent draft → independent submitted orders
- f. submitted order visible in kitchen view
- g. draft slot released after submit → same deviceId can create new draft

Stable rollback point before Phase G section 4+ (Task 36-42).
"

git push origin phase5-b2-checkpoint
```

**步骤 3**：验证 tag 上 remote：

```bash
git ls-remote --tags origin | grep phase5-b2-checkpoint
# 预期：返回 1 行 tag reference
```

**步骤 4**：tag 作为稳定回滚点——后续 Phase G 段 4-5（Task 36-42，下个 session）实施**任何破坏性操作**前应能 `git reset --hard phase5-b2-checkpoint` 退回 B2 完成状态。

---

## commit

```bash
cd "$(git rev-parse --show-toplevel)"
git add docs/superpowers/plans/2026-04-17-phase5-postgres-migration/phase-g-b2-checkpoint.md
git commit -m "plan(phase-g): section 3 - B2 manual checkpoint 7 scenarios (Task 35)

Phase G 段 3 plan: Task 35 D50 manual checkpoint 7 场景 (a-g) 按 handoff
§5e 模板展开 intent + concrete steps + failure mode + pass criteria + tag.

spec §9.8 line 1282-1301 D50 原文引用 (规则 7 原文先行) + handoff §5e
Task 35 粒度模板 (2026-04-17 Ian 补齐).

场景要点:
  - a. 基础写入验证 (sessionless fallback → draft Order 表持久化)
  - b. 关页面重开 fetch 还原 (draft 服务端权威, 非前端 localStorage items)
  - c. deviceId 隔离 (handoff §5e 模板直接应用, B2 核心不变量)
  - d. D58 路径 X 核心验证 (Stripe 4000 0000 0000 0002 测试卡 / submit
    不删 draft / 取消后 cart 还在 / spec §1 line 13 + D6 声明 B2 天然解决)
  - e. 多 device 并发提交独立性 (pay-later 流, 路径 X 在此无约束)
  - f. submit 后 kitchen 视图可见 (orderRepo.findActive 语义验证)
  - g. submit 释放 partial unique slot (同 deviceId 建新 draft, 一顿饭
    多轮加菜场景)

规则 8 段 3 自查 (写作期未触发任何暂停信号):
  - Intent 全部基于 spec / handoff 明确规则 / D58 决议, 非凭印象
  - 不确定的 UI / URL / 按钮位置全标 [NEEDS FRONTEND VERIFICATION,
    Phase G implementation], 未编造
  - 场景 e 核对: 路径 X 只约束 pay-first, pay-later submit 行为和 Y/Z
    一致, 无未覆盖边界
  - Pending ≤ 1 (本 C3 是唯一 pending)

全 pass 后 tag 操作写入文件末尾: git tag -a phase5-b2-checkpoint
+ push origin + 验证 remote, 作为 Phase G 段 4-5 (Task 36-42, 下个
session) 的稳定回滚点.

Pending commits 清单: 4/4 落地 (C1 + C2a + C2b-amended + C3 本 commit).
本 session 段 1-3 plan 全部完成, 等 Ian 一句 '收尾' 进阶段 3
(RESUME + 00-index 同步).

Co-Authored-By: Claude <noreply@anthropic.com>"
```

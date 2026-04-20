# 2026-04-19 Phase B Task 8 L2 Verify — afterCommit 机制 + G7-4 接口就绪度

Created: 2026-04-19,Phase B Task 7 β refinement(`77baab58`)+ D74 治理候选(`59732834`)落地后,对 Task 8 `middleware/tenant-aware.ts` 做 L2 速读 verify。L2 预算 ~10 min,5 维度简化(vs L1 8 维度)。

**行数预算估算(D74 实时预警)**:
- §1 现状速读 ~30 行 / §2 plan summary ~20 / §3 5 维度 ~40 / §4 规则 8 ~20 / §5 修订 ~25 / §6 Ian 决议 ~20 / header+tail ~15 = **预估 ~170 行**。L2 合理区间 150-180,D74 预警阈值 (50% = 85) 仅 Warn if >85 partial-accumulated。

---

## 1. 现状速读(阶段 A)

### 1.1 Task 8 plan 规模 + 位置

```bash
$ grep -n "^### Task 8\|^### Task 9" phase-b-infrastructure.md
1292: ### Task 8：写 `middleware/tenant-aware.ts` 装饰器
1480: ### Task 9a ...
```

**篇幅**:line 1292-1480 = **188 行**(之前 L2 估 776 偏大,纠正)。

### 1.2 G7-4 / G7-6 在 plan 中的 inline 状态

```bash
$ grep -n "withTenantContextAndHooks\|attachItems" phase-b-infrastructure.md
(0 matches)
```

**Task 8 plan 完全不含 G7-4 或 G7-6**。

**Phase G plan 中的 G7-4 / G7-6 声明**:
- `phase-g-webhook.md:371`:`withTenantContextAndHooks(storeId, async (tx, registerAfterCommit) => {...})` 签名定义(§4.2 选项 C)
- `phase-g-webhook.md:463`:**G7-4 必需**级标注 — "Phase B Task 8 当前 `withTenantContext` 无 hook 注册接口,Task 41 实施需新增 helper"
- `phase-g-session-payment-settlement.md:436`:**G7-6 必需**级 — `paymentRepo.attachItems(paymentId, paymentItems, tx)` — "Phase D Task 19 plan verify 是否已含"
- `RESUME.md:34-35`:G7-4 挂 Task 41 依赖,G7-6 挂 Task 42 依赖

**关键**:
- **G7-4** scope 属 Task 8(middleware/helper 层),**plan 缺失**
- **G7-6** scope 属 **Phase D Task 19**(repo 层),**不是 Task 8 scope**

### 1.3 afterCommit 机制在 Task 8 plan 中分布

```bash
$ grep -n "afterCommit" phase-b-infrastructure.md | head -14
1299, 1307, 1318, 1355, 1366, 1378, 1394, 1404, 1420, 1432, 1439, 1469, 1470
```

13 处 afterCommit 分布(**line 1299-1478**):Phase E 事后补丁完整覆盖 `tenantAwareRoute` + `platformAwareRoute` + `Locals.afterCommit` + hook 注册机制。

### 1.4 现有 server/src `withTenantContext` 使用(Task 6 前置)

```bash
$ grep -rn "withTenantContext" server/src --include="*.ts"
(0 matches)
```

符合预期:Task 6(prisma-client.ts)未实施 → `withTenantContext` 0 使用。G7-4 升级 blast radius **潜在 0**(纯新增 helper,不改 `withTenantContext` 原签名)。

---

## 2. Task 8 plan 内容 Summary

| Block | 内容 | 行数 |
|---|---|---|
| **Phase E 事后补丁 header**(line 1299)| afterCommit 机制背景 + 规则 2 动机 | ~40 |
| **Step 1:写完整 `middleware/tenant-aware.ts`**(line 1338)| `tenantAwareRoute` + `platformAwareRoute` + Locals 类型扩展 + afterCommit 实现 | ~100 |
| **Step 2:tsc 验证**(line 1443)| `tsc --noEmit` 本文件无 error | ~10 |
| **Step 3:commit**(line 1456)| commit message 模板 | ~25 |

Plan Step **缺失 G7-4 `withTenantContextAndHooks` helper 创建**。

---

## 3. 5 维度 verify 表

| # | 维度 | Task 8 plan 现状 | Gap 严重性 | 修订建议 |
|---|---|---|---|---|
| **1** | G7-4 接口签名就绪度 | **0 行涉及**,完全缺失 | 🔴 **高**(已知 gap)| 加 Step 1.5(或类似):`withTenantContextAndHooks` helper 实现,参考 `phase-g-webhook.md:371` §4.2 选项 C 签名 |
| **2** | G7-6 接口签名就绪度 | 0 行涉及(**非 Task 8 scope**)| N/A | **不改 Task 8 plan**;delegate Phase D Task 19 plan verify(另起 task)|
| **3** | afterCommit 机制原理(规则 2)| Task 8 完整覆盖(Phase E 事后补丁 line 1299-1478)+ 规则 2 语义(tx rollback → hooks 不触发 / hook 错 → log 不 break)| 🟢 **无** | Phase E 已在 plan 中实现,G7-4 可直接 reuse 该机制 |
| **4** | withTenantContext 升级 blast radius | G7-4 是 **新增 helper**(不升级原 `withTenantContext` 签名)+ 现有 0 使用 | 🟢 **无** | blast radius = 0,纯新增无破坏 |
| **5** | tenantAwareRoute / G7-4 关系 | Task 8 plan 含 tenantAwareRoute(Express 中间件,绑 HTTP req/res) + platformAwareRoute,但 0 提 G7-4 的 **非 Express 场景**(webhook handler 直接用 helper,不走 Express route)| 🟡 **中** | Step 1.5 内标注两者关系:tenantAwareRoute 用于 Express routes,G7-4 用于 webhook / cron / 测试 / 其他非 Express 场景 |

---

## 4. 规则 8 触发项(超 scope 发现)

### 发现 1 · G7-4 0 行 plan(已知 gap,非新发现)

**状态**:Phase G Task 41 webhook plan(`phase-g-webhook.md:463`)已明标"G7-4 必需级 Phase D 回填"—— 这是 Phase G 写作时就识别的 handoff,不是本次 verify 新发现。

**影响**:Phase G Task 41 webhook 实施**直接阻塞**,除非:
- α)Task 8 plan 修订吸收 G7-4 实现
- β)Task 41 实施期作为 sub-step 补(Phase D 回填本来就有此项)
- γ)Task 41 plan 重构,不依赖 G7-4(放弃 afterCommit 机制,直接双重 emit)

**不触发规则 8 暂停**(已知 + 解决路径明确),但需 Ian 决议 α/β/γ 之一。

### 发现 2 · G7-6 Ian instruction scope 偏差(轻量规则 7.2)

**问题**:Ian L2 instruction 要求 "Task 8 plan 是否含 G7-6 接口签名"。实际:
- G7-6 `paymentRepo.attachItems` 属 **Phase D Task 19 repo 层**
- Task 8 是 **middleware 层**(tenant-aware helper)
- **不同层,G7-6 从设计就不属 Task 8 scope**

**CC 处理**:regards G7-6 verify 对象转为 Phase D Task 19 plan,本 Task 8 verify 不涉及。这是 scope 粒度澄清,不阻塞。

### 发现 3 · Task 8 plan 实际篇幅(L2 速读前估偏差)

- Ian L2 instruction 估 Task 8 ~776 行
- 实际:**188 行**(line 1292-1480)
- 差异源:L2 速读前 CC 错算("Task 8 起始 line 1185,Task 9 起始 line 1961" 推导 776,实际 Task 8 line 1292,Task 9a line 1480 差 188)

**不影响 verify 结果**,但行数预算未用满(预算 10 min 实际 7 min)。

---

## 5. Task 8 plan 修订建议(优先级排序)

| 序 | 修订点 | 优先级 | 内容 |
|---|---|---|---|
| 1 | **Step 1.5 新增:G7-4 `withTenantContextAndHooks` helper** | 🔴 高 | 函数签名 + 实现(复用 Task 6 `withTenantContext` 开 tx + Phase E afterCommit hook 注册)+ 使用示例(webhook handler + 非 Express 场景)|
| 2 | **inline 说明:G7-4 vs tenantAwareRoute 关系** | 🟡 中 | 在 Step 1 `tenantAwareRoute` 定义附近加 note:"G7-4 是同机制的非 HTTP 变体,webhook 用 G7-4,Express route 用 tenantAwareRoute" |
| 3 | **G7-6 delegate Phase D Task 19 verify**(非 Task 8 修订)| 🟢 外部 | Phase D Task 19 plan verify 单独启动,与 Task 8 无关 |

**预估修订 diff**:~30-40 行(Step 1.5 主体 + note 小段)。

---

## 6. Ian 决议候选

| 序 | 路径 | 内容 | 预期后续 |
|---|---|---|---|
| **α** | Task 8 plan 修订(Step 1.5 G7-4 + relation note) + Phase D Task 19 verify | 合并 commit 补齐 Phase B Task 8 | Phase B 全线就绪,unblock Phase G 实施 |
| **β** | 仅修订 Task 8 plan(G7-4 helper)+ Phase D Task 19 延后 | 单 commit 填 G7-4 gap | Phase D Task 19 verify 独立对话启动 |
| **γ** | 跳 Task 8 修订,G7-4 放 Phase G Task 41 实施期 sub-step | 0 修订 | Phase G Task 41 实施时临时加 helper,污染 plan/实施边界 |
| **δ** | Task 8 / 9a / 9b / 10 合并 L2 verify(Phase B 剩余 4 task 批量过)| 新 verify 工作 | 更全面但拖长 Phase B 启动时间 |

**CC 执行倾向**:**β**(Task 8 G7-4 是 Phase B 阻塞,单 commit 修;Phase D Task 19 单独启动避免 scope 扩散)。α 次之(更完整但 commit 更大)。γ 不推荐(污染边界)。

---

## 7. D74 复盘(行数预算实时预警)

**预估 170 / 实际**:见下方 wc -l 输出。D74 机制本次首次应用:
- Edit 前估算每区块行数 ✅(见文件顶部)
- Edit 中 CC 无预警触发(按区块铺陈,未累计超 85)
- Edit 后 wc -l verify(commit 前)

---

**End of Task 8 L2 verify.**

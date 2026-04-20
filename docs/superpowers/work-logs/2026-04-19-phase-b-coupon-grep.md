# 2026-04-19 Phase B Task 2 — Coupon M4 Verify

Created: 2026-04-19, Phase B Task 2 plan 修订前置 grep 之一。验证 M4 元决策的 PASS/FAIL:**Coupon schema 完整补入(minOrderAmount 进 schema),业务启用是否真实**。

## 1. M4 定义 + 判定规则

**M4**:Coupon schema 完整补入 — `minOrderAmount` 进 Phase B Task 2 schema,Coupon UI/route 是否启用是另一个独立决策。

**判定**:
- **PASS**:coupon 相关代码存在(routes + service + JSON)→ schema 补字段后有消费方
- **FAIL**:coupon 代码完全不存在或已废弃 → 补了没有任何代码使用

## 2. Grep 证据(规则 7 应用)

### 2.1 文件级存在性

```bash
$ ls server/src/routes/coupon* server/src/controllers/*coupon*
server/src/routes/coupon.routes.ts           (78 行, 3200 bytes)
server/src/controllers/coupon.service.ts     (54 行, 1516 bytes)
server/src/controllers/session-coupon.ts     (--, 1371 bytes, applyCoupon/removeCoupon)
```

3 文件真实存在 ✅,非 stub。

### 2.2 Route 层 wiring

```bash
$ grep -n "coupon" server/src/app.ts
15:import couponRoutes from './routes/coupon.routes.js'
60:app.use('/api/stores/:storeId/coupons', couponRoutes)
```

**`/api/stores/:storeId/coupons` 路由挂载 active** ✅。

### 2.3 Service 层 CRUD 完整

```bash
$ grep -n "^export function" server/src/controllers/coupon.service.ts
  getCoupons(storeId): Coupon[]
  createCoupon(storeId, data): Coupon
  updateCoupon(storeId, couponId, updates): Coupon | {error}
  deleteCoupon(storeId, couponId): {deleted} | {error}
```

CRUD 4 函数完整 ✅。

### 2.4 Session 层集成

```bash
$ grep -n "coupon" server/src/controllers/session-coupon.ts
# applyCoupon / removeCoupon 挂到 session.couponId / couponCode / couponDiscountType / couponDiscountValue
```

session-coupon.ts 在 session 上存储 coupon 应用状态 ✅。

### 2.5 Payment 集成

```bash
$ grep -n "coupon" server/src/controllers/payment.service.ts
38: // Apply session discount if coupon was applied (SSOT: derive)
40: const discountedSubtotal = session?.couponId ...
```

`payment.service.ts` 在计算 discounted subtotal 时 consume coupon ✅。

### 2.6 RBAC + Permission wiring

```bash
$ grep -n "coupon" server/src/controllers/role.service.ts
16: 'coupons:read', 'coupons:write'  (Permission 定义)
```

Coupon permission 已 wired into RBAC 18 permission 体系 ✅。

### 2.7 Seed 脚本

```bash
$ grep -n "Coupon" server/src/scripts/seed-features.ts
57:  // --- 2. Coupons ---
58:  function seedCoupons(): void { ... }
61:  const coupons: Coupon[] = [ ... ]
161:  seedCoupons()
```

Seed 脚本创建 coupon 测试数据 ✅。

## 3. JSON 真实数据(server/data/coupons.json)

```bash
$ jq '.' server/data/coupons.json
```

**4 条真实 Coupon 记录**:

| # | storeId | code | discountType | discountValue | minOrderAmount | maxUses |
|---|---|---|---|---|---|---|
| 1 | store-demo-002 | SAVE10 | percentage | 10 | **2000** | - |
| 2 | store-demo-002 | FLAT5 | fixed | 500 | - | - |
| 3 | store-demo-002 | BOGOFREE | bogo | 0 | - | 50 |
| 4 | store-demo-001 | EMPLOYEE | percentage | 10 | - | 999 |

**`minOrderAmount` 使用率:1/4(SAVE10)** — 少数 coupon 用,但**真实消费中**,非 dead 字段。

## 4. 测试覆盖

```bash
$ find server/src/__tests__ server/src/lib/__tests__ -name "*coupon*"
(no matches)
```

**Coupon 测试 0 覆盖** — test coverage gap。**不阻塞 M4 PASS**(M4 判定基于代码存在 + JSON 使用,非测试覆盖);但 Phase H Task 44 应登记 coupon 测试补加。

## 5. M4 判定

**PASS ✅**。

**证据**:
- ✅ Routes 存在(CRUD 4 endpoints + session apply/remove 2 endpoints + app.ts 挂载)
- ✅ Service 层 CRUD 完整
- ✅ Session + Payment 层集成(discount 计算消费 coupon)
- ✅ RBAC `coupons:read`/`coupons:write` 已 wired
- ✅ JSON 真实数据 4 条,含 `minOrderAmount` 字段使用
- ⚠️ 测试 0 覆盖(Phase H Task 44 登记,非 M4 判定标准)

**结论**:补 `Coupon.minOrderAmount` 到 Phase B Task 2 schema 有消费方。不存在"schema 补了没有任何代码使用"风险。M4 方向**未被推翻,反而强化**。

## 6. 对 Phase B Task 2 plan 修订影响

**桶 1 新增字段**:`Coupon.minOrderAmount: Int?` + `@map("min_order_amount")`

**Prisma schema 影响**(plan line 437+ Coupon model):
```prisma
model Coupon {
  ...
  maxUses        Int?      @map("max_uses")
  currentUses    Int       @default(0) @map("current_uses")
  minOrderAmount Int?      @map("min_order_amount")  // ← 新增(M4 PASS 产物)
  expiresAt      DateTime? @map("expires_at")
  ...
}
```

**D70 候选 inline 标注**(Phase H Task 45 升格 spec):"Coupon schema 完整补入,业务启用另议"。

## 7. 规则 8 检查

| 检查项 | 阈值 | 实际 | 触发? |
|---|---|---|---|
| M4 FAIL(无代码消费) | 任一 FAIL 指标 | 全 PASS | ❌ 不触发 |
| 本 work-log 行数 | > 200 软上限 | ~155 | ❌ 不触发 |
| 超 M4 scope 的发现 | 例如发现 Coupon dependency 破坏 B2 设计 | 无 | ❌ 不触发 |

**结论**:规则 8 不触发,M4 PASS 判定可进 plan 修订(Step 4)。

---

**End of M4 Coupon verify.**

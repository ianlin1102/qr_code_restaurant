# Phase 5 Plan — Phase C：Stage 1 测试 DB

> **如何使用本文件**
>
> - 全局规则见 [`00-index.md`](./00-index.md#全局规则所有-task-遵守)
> - 本 phase 前置：[`phase-b-infrastructure.md`](./phase-b-infrastructure.md) 全部完成（Prisma + migrations + seed 都可跑）
> - 本 phase 输出：独立测试 DB（`postgres-test` on :5433 + tmpfs）+ vitest setup + fixtures + RLS 覆盖测试 + 幽灵权限测试
> - 关键防御验证：Task 14 的 `tenant-isolation.test.ts` 必须验证 A2 的 `set_config` 严格模式（裸 prisma query 抛错）+ `WITH CHECK` 挡 mismatched storeId insert
> - 下一个 phase：[`phase-d-repositories.md`](./phase-d-repositories.md)

## Task 列表

| Task | 内容 |
|---|---|
| 11 | 写 `docker-compose.test.yml` |
| 12 | 写 `vitest.config.ts` + `setup.ts` |
| 13 | 写 `fixtures.ts` |
| 14 | 写 `rls-coverage.test.ts` + `tenant-isolation.test.ts` |
| 15 | 写 `module-registry.test.ts` |

---

## Phase C：Stage 1 测试 DB

### Task 11：写 `docker-compose.test.yml`

**Files:**
- Create: `docker-compose.test.yml`（独立 compose，不覆盖 base）
- Modify: `server/package.json` 加 `test:db:up` / `test:db:down` 脚本

**前置**：Task 10 完成。

- [ ] **Step 1：创建 `docker-compose.test.yml`**

```bash
cd "$(git rev-parse --show-toplevel)"
cat > docker-compose.test.yml <<'EOF'
# 独立 Postgres 用于 vitest 集成测试。
# 数据放 tmpfs（内存），测试结束容器停掉一切蒸发。
# 端口 5433（和 dev postgres 5432 错开，允许同时跑）。

services:
  postgres-test:
    image: postgres:16-alpine
    container_name: qr-order-postgres-test
    environment:
      POSTGRES_DB: qr_order_test
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: test
    ports:
      - "5433:5432"
    tmpfs:
      - /var/lib/postgresql/data
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "postgres", "-d", "qr_order_test"]
      interval: 2s
      timeout: 2s
      retries: 15
EOF
```

- [ ] **Step 2：加 package.json 脚本**

在 `server/package.json` 的 `scripts` 里追加：

```json
{
  "scripts": {
    "test": "vitest run --exclude 'src/__tests__/integration/**'",
    "test:watch": "vitest --exclude 'src/__tests__/integration/**'",
    "test:db:up": "cd .. && docker compose -f docker-compose.test.yml up -d postgres-test && docker compose -f docker-compose.test.yml exec -T postgres-test bash -c 'until pg_isready -U postgres; do sleep 1; done'",
    "test:db:down": "cd .. && docker compose -f docker-compose.test.yml down",
    "test:db:migrate": "TEST_DATABASE_URL=$TEST_DATABASE_URL pnpm prisma migrate deploy",
    "test:integration": "pnpm test:db:up && TEST_DATABASE_URL=postgresql://postgres:test@localhost:5433/qr_order_test DATABASE_URL=postgresql://postgres:test@localhost:5433/qr_order_test vitest run 'src/__tests__/integration/**'"
  }
}
```

**关键**：
- `test:db:up` 等 pg_ready 再返回（避免 race）
- `test:integration` 脚本把 `DATABASE_URL` 和 `TEST_DATABASE_URL` 都指到测试库——`setup.ts` 会用 TEST_DATABASE_URL 跑 migrate

**分流设计（γ3c 目录隔离）**：
- Phase C 新 test 全部落 `src/__tests__/integration/` 子目录（fixtures.ts / setup.ts / global-setup.ts / *.test.ts 全在此）
- `test` / `test:watch` 用 CLI `--exclude 'src/__tests__/integration/**'` 绕开，保留 existing JsonStore-era unit test（module-permissions / settlement-gateway / split-billing-integration）运行不变
- `test:integration` 显式只跑 `src/__tests__/integration/**`，起 Docker + migrate
- Phase H Task 44 existing 3 test 迁 Prisma 完成后可评估是否合并 script（延后）

- [ ] **Step 3：验证 compose 能起**

```bash
cd server
pnpm test:db:up
docker ps --format "{{.Names}}\t{{.Status}}" | grep postgres-test
# 预期：qr-order-postgres-test    Up X seconds (healthy)

pnpm test:db:down
```

- [ ] **Step 4：commit**

```bash
cd "$(git rev-parse --show-toplevel)"
git add docker-compose.test.yml server/package.json
git commit -m "feat(phase-5): add docker-compose.test.yml + test db scripts

- postgres-test on port 5433, tmpfs data dir (in-memory, no persistence)
- Isolated from dev postgres (allows parallel run)
- pnpm test:db:up/down manage lifecycle

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 12：写 `vitest.config.ts` + `setup.ts`

**Files:**
- Modify: `server/vitest.config.ts`（现有的大概只有基础配置，加 setupFiles + globalSetup）
- Create: `server/src/__tests__/integration/setup.ts`
- Create: `server/src/__tests__/integration/global-setup.ts`

**前置**：Task 11 完成。

- [ ] **Step 1：读现有 vitest.config.ts**

```bash
cat server/vitest.config.ts 2>/dev/null || echo "no file"
```

如果有，保留现有的 config，只追加 `setupFiles` / `globalSetup`。如果没有，整体创建。

- [ ] **Step 2：写/更新 `server/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/lib/__tests__/**/*.test.ts', 'src/__tests__/**/*.test.ts'],
    globalSetup: './src/__tests__/integration/global-setup.ts',
    setupFiles: ['./src/__tests__/integration/setup.ts'],
    // 集成测试跑起来需要一点时间（migrate、truncate）
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // 单进程跑,避免多 worker 争抢同一个测试 DB
    // vitest 4 migration: poolOptions 拍扁到顶级,singleFork 字段 deprecated
    // 完整等价 singleFork: maxWorkers: 1(单 worker) + isolate: false(同 worker module cache 不 re-init,保持 testDb 单例)
    pool: 'forks',
    maxWorkers: 1,
    isolate: false,
  },
})
```

**关键**：`maxWorkers: 1 + isolate: false`——所有测试共享一个 Prisma client 连接池，避免多 worker 对同一个 DB 并发 TRUNCATE 引发死锁。v3 语义用 `poolOptions: { forks: { singleFork: true } }`，vitest 4 拆分为两顶级字段。

- [ ] **Step 3：写 `global-setup.ts`（整套测试跑一次）**

```bash
cat > server/src/__tests__/integration/global-setup.ts <<'EOF'
import { execSync } from 'node:child_process'

/**
 * Global setup — runs once before the entire test suite.
 * Applies Prisma migrations to the test database.
 * Container must already be up (pnpm test:db:up).
 */
export async function setup() {
  const url = process.env.TEST_DATABASE_URL
  if (!url) {
    // Non-integration run (pnpm test path) — skip migrate. Main routing happens
    // in package.json scripts via --exclude 'src/__tests__/integration/**'.
    return
  }

  console.log('[global-setup] Applying migrations to test DB…')
  execSync('pnpm prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'inherit',
  })
  console.log('[global-setup] Migrations applied.')
}

export async function teardown() {
  // tmpfs container dies on compose down — no explicit cleanup needed
}
EOF
```

- [ ] **Step 4：写 `setup.ts`（每个测试文件的 beforeEach）**

```bash
cat > server/src/__tests__/integration/setup.ts <<'EOF'
import { beforeEach, afterAll } from 'vitest'
import { PrismaClient, Prisma } from '@prisma/client'

const testDbUrl = process.env.TEST_DATABASE_URL

/**
 * Shared Prisma client for integration tests.
 *
 * Main routing for Phase C is via package.json CLI (--exclude / positional include):
 *   pnpm test             → --exclude 'src/__tests__/integration/**'  (no integration test loads)
 *   pnpm test:integration → vitest run 'src/__tests__/integration/**' (this file instantiated)
 *
 * null-guard below is defense-in-depth: if a future test outside integration/ imports
 * testDb, it will fail fast at null deref instead of silently connecting to dev DB.
 */
export const testDb: PrismaClient = testDbUrl
  ? new PrismaClient({ datasources: { db: { url: testDbUrl } } })
  : (null as unknown as PrismaClient)

beforeEach(async () => {
  if (!testDb) return // non-integration run — no DB to truncate
  // TRUNCATE all non-Prisma-meta tables. RESTART IDENTITY CASCADE resets
  // sequences and follows FKs. Fast — tmpfs + in-memory WAL.
  const tables = await testDb.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables
    WHERE schemaname='public' AND tablename NOT LIKE '_prisma%'
  `
  for (const { tablename } of tables) {
    await testDb.$executeRawUnsafe(`TRUNCATE TABLE "${tablename}" RESTART IDENTITY CASCADE`)
  }
})

afterAll(async () => {
  if (!testDb) return
  await testDb.$disconnect()
})

/**
 * Tenant-scoped test helper — mirrors production withTenantContext
 * but uses testDb so tests don't hit the dev DB.
 */
export async function withTestTenant<T>(
  storeId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return testDb.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_store_id', ${storeId}, true)`
    return fn(tx)
  })
}

/**
 * Platform-scoped test helper — BYPASSRLS via SET LOCAL ROLE.
 * Note: requires test DB user to have been GRANTed platform_admin role,
 * which is done by the rls_and_roles migration.
 */
export async function withTestPlatform<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return testDb.$transaction(async (tx) => {
    await tx.$executeRaw`SET LOCAL ROLE platform_admin`
    return fn(tx)
  })
}
EOF
```

**注意**：`withTestTenant` 和 production `withTenantContext` 的实现形同——故意为之，测试和实现同构，一眼看懂。

- [ ] **Step 5：验证 setup 能跑（无实际测试用例）**

```bash
cd server
pnpm test:db:up
pnpm test --run 2>&1 | tail -20
pnpm test:db:down
```

预期(vitest 4 behavior,Phase C patch v2):
```
No test files found, exiting with code 1

filter:  src/__tests__/integration/**
include: src/lib/__tests__/**/*.test.ts, src/__tests__/**/*.test.ts
exclude: **/node_modules/**, **/.git/**
```

**vitest 4 note**: vitest 4 在 filter 命中 0 test files 时 skip globalSetup 直接 exit 1。plan 原语义"dry run 验 globalSetup 能跑"由此降级为"verify 配置 parse 成功 + filter 生效 + no panic"。真正的 globalSetup migrate 触发延迟到 Task 13 fixtures.test.ts 首次 land 时自然验证。

定性 acceptance:
- 出现 `No test files found` + `filter: src/__tests__/integration/**` + `include: ...` 三行
- 不出现 Prisma error / config parse error / TypeError
- exit 1 是 vitest 4 expected,不是 failure signal

若以上任一不符 → 规则 8 暂停,Opus 判。

- [ ] **Step 6：commit**

```bash
git add server/vitest.config.ts \
        server/src/__tests__/integration/setup.ts \
        server/src/__tests__/integration/global-setup.ts
git commit -m "feat(phase-5): vitest setup with test DB + tenant helpers

- global-setup.ts applies Prisma migrations to test DB once
- setup.ts TRUNCATE CASCADE before each test, single-worker forks pool (maxWorkers: 1 + isolate: false)
- withTestTenant / withTestPlatform mirror production wrappers

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 13：写 `fixtures.ts`（测试数据工厂）

**Files:**
- Create: `server/src/__tests__/integration/fixtures.ts`

**前置**：Task 12 完成。

**关键**：所有 fixture 函数第一个参数是 `tx: Prisma.TransactionClient`——**显式传入**，遵守规则 3（写操作 db 参数必填）。测试代码自己开 `withTestTenant` 拿到 tx 再传给 fixture，fixture 不自己开 tx。

- [ ] **Step 1：写 `fixtures.ts`**

```bash
cat > server/src/__tests__/integration/fixtures.ts <<'EOF'
import type { Prisma } from '@prisma/client'
import bcrypt from 'bcryptjs'

const MODULES_FULL = ['core', 'analytics', 'coupons', 'waitlist', 'printer', 'staff-management']

type Tx = Prisma.TransactionClient

/**
 * Seed just a store + empty module license. Caller provides tx (rule 3).
 * Returns the created store.
 */
export async function seedMinimalStore(
  tx: Tx,
  overrides?: { id?: string; name?: string; modules?: string[] }
) {
  const id = overrides?.id ?? crypto.randomUUID()
  const store = await tx.store.create({
    data: {
      id,
      name: overrides?.name ?? 'Test Store',
      tipBase: 'pretax',
    },
  })
  await tx.moduleLicense.create({
    data: {
      storeId: store.id,
      modules: overrides?.modules ?? ['core'],
      grantedAt: new Date(),
      grantedBy: 'test-fixture',
    },
  })
  return store
}

/**
 * Store + 1 category + 2 menu items + 1 table. No staff.
 * Useful for menu/cart/order tests.
 */
export async function seedStoreWithMenu(tx: Tx, storeOverrides?: Parameters<typeof seedMinimalStore>[1]) {
  const store = await seedMinimalStore(tx, storeOverrides)
  const category = await tx.category.create({
    data: { storeId: store.id, name: 'Test Category', sortOrder: 0 },
  })
  const menuItem1 = await tx.menuItem.create({
    data: { storeId: store.id, categoryId: category.id, name: 'Item A', price: 1000, sortOrder: 0 },
  })
  const menuItem2 = await tx.menuItem.create({
    data: { storeId: store.id, categoryId: category.id, name: 'Item B', price: 2000, sortOrder: 1 },
  })
  const table = await tx.table.create({
    data: {
      storeId: store.id,
      name: 'T1',
      number: 1,
      qrCode: `test-${store.id.slice(0, 8)}-t1`,
    },
  })
  return { store, category, menuItems: [menuItem1, menuItem2], table }
}

/**
 * Full tenant: store + modules + system roles + owner staff + menu + tables.
 * Use when tests need auth/login or session creation flows.
 */
export async function seedFullTenant(tx: Tx, storeOverrides?: { modules?: string[] }) {
  const { store, category, menuItems, table } = await seedStoreWithMenu(tx, {
    modules: storeOverrides?.modules ?? MODULES_FULL,
  })

  // Minimal system roles (real ensureSystemRoles exercised in Phase E/H tests)
  const ownerRole = await tx.role.create({
    data: { storeId: store.id, name: 'owner', permissions: ['*'], isSystem: true },
  })
  await tx.role.create({
    data: { storeId: store.id, name: 'staff', permissions: ['orders:read', 'menu:read'], isSystem: true },
  })

  const passwordHash = await bcrypt.hash('test-password', 4)  // cost=4 for speed in tests
  const ownerStaff = await tx.staff.create({
    data: {
      storeId: store.id,
      username: 'owner@test.local',
      passwordHash,
      roleId: ownerRole.id,
      displayName: 'Test Owner',
    },
  })

  return { store, category, menuItems, table, ownerRole, ownerStaff }
}
EOF
```

- [ ] **Step 2：写一个简单的 fixture 自测（验证 fixture 本身能跑）**

```bash
cat > server/src/__tests__/integration/fixtures.test.ts <<'EOF'
import { describe, it, expect } from 'vitest'
import { testDb, withTestTenant } from './setup.js'
import { seedMinimalStore, seedStoreWithMenu, seedFullTenant } from './fixtures.js'

describe('fixtures', () => {
  it('seedMinimalStore creates a store with module license', async () => {
    // fixture 传 testDb（非事务）给它，不开 tenant context——因为 store/module_license 的
    // RLS policy 要求 storeId，而我们此时还在 *创建* store。
    // 正确做法：用 platform context 创建，然后在 tenant context 下验证。
    const result = await testDb.$transaction(async (tx) => {
      await tx.$executeRaw`SET LOCAL ROLE platform_admin`
      return seedMinimalStore(tx, { name: 'Fixture Test' })
    })
    expect(result.id).toBeTruthy()
    expect(result.name).toBe('Fixture Test')

    const license = await testDb.moduleLicense.findUnique({ where: { storeId: result.id } })
    expect(license?.modules).toEqual(['core'])
  })

  it('seedStoreWithMenu creates menu items', async () => {
    const { store, menuItems, table } = await testDb.$transaction(async (tx) => {
      await tx.$executeRaw`SET LOCAL ROLE platform_admin`
      return seedStoreWithMenu(tx)
    })
    expect(menuItems).toHaveLength(2)
    expect(menuItems[0].price).toBe(1000)
    expect(table.name).toBe('T1')
  })

  it('seedFullTenant includes owner + roles', async () => {
    const { ownerRole, ownerStaff } = await testDb.$transaction(async (tx) => {
      await tx.$executeRaw`SET LOCAL ROLE platform_admin`
      return seedFullTenant(tx)
    })
    expect(ownerRole.name).toBe('owner')
    expect(ownerStaff.username).toBe('owner@test.local')
    expect(ownerStaff.roleId).toBe(ownerRole.id)
  })
})
EOF
```

**注意**：fixture 在 `platform_admin` 上下文里跑（BYPASSRLS），因为 fixture 本身就是在创建一个新租户的全部基础数据——此时没有"已有 storeId 的上下文"可设。这和 Phase F/J 的 `createStore` 平台管理员动作一致。

- [ ] **Step 3：跑测试**

```bash
cd server
pnpm test:db:up
pnpm test:integration fixtures 2>&1 | tail -20
```

预期：
```
 ✓ server/src/__tests__/integration/fixtures.test.ts  (3 tests)
   ✓ seedMinimalStore creates a store with module license
   ✓ seedStoreWithMenu creates menu items
   ✓ seedFullTenant includes owner + roles

Test Files  1 passed (1)
     Tests  3 passed (3)
```

- [ ] **Step 4：commit**

```bash
git add server/src/__tests__/integration/fixtures.ts server/src/__tests__/integration/fixtures.test.ts
git commit -m "feat(phase-5): test fixtures with mandatory tx param

- seedMinimalStore / seedStoreWithMenu / seedFullTenant
- First param is tx (rule 3: write ops require explicit db)
- Fixtures run in platform_admin context to bypass RLS during setup
- Self-test exercises all three factories

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 14：RLS 覆盖 + tenant isolation 测试

**Files:**
- Create: `server/src/__tests__/integration/rls-coverage.test.ts`
- Create: `server/src/__tests__/integration/tenant-isolation.test.ts`

**前置**：Task 13 完成。

**设计要点**：tenant-isolation.test.ts 必须验证 A2 的 set_config 严格模式生效——"不设 tenant context 查 orders 必须抛错"。这是整个迁移最重要的安全防御之一。

- [ ] **Step 1：写 `rls-coverage.test.ts`**

```bash
cat > server/src/__tests__/integration/rls-coverage.test.ts <<'EOF'
import { describe, it, expect } from 'vitest'
import { testDb } from './setup.js'

/**
 * For every table with a store_id column, verify:
 *   1. Row-level security is ENABLED
 *   2. At least one policy exists (named tenant_isolation by convention)
 *
 * If a future migration adds a new store_id table without enabling RLS,
 * this test catches it — preventing silent cross-tenant data leaks.
 */
describe('RLS coverage', () => {
  it('every table with store_id has RLS enabled + policy', async () => {
    const tables = await testDb.$queryRaw<Array<{ table_name: string }>>`
      SELECT DISTINCT table_name FROM information_schema.columns
      WHERE column_name = 'store_id' AND table_schema = 'public'
    `
    expect(tables.length).toBeGreaterThan(0)

    const missing: string[] = []
    for (const { table_name } of tables) {
      const rlsEnabled = await testDb.$queryRaw<Array<{ relrowsecurity: boolean }>>`
        SELECT relrowsecurity FROM pg_class WHERE relname = ${table_name}
      `
      if (!rlsEnabled[0]?.relrowsecurity) {
        missing.push(`${table_name}: RLS DISABLED`)
        continue
      }
      const policies = await testDb.$queryRaw<Array<{ policyname: string }>>`
        SELECT policyname FROM pg_policies WHERE tablename = ${table_name}
      `
      if (policies.length === 0) {
        missing.push(`${table_name}: no policy`)
      }
    }

    expect(missing).toEqual([])
  })

  it('policies enforce both USING and WITH CHECK', async () => {
    // WITH CHECK is the plan-stage defense against missing-storeId INSERT.
    const policies = await testDb.$queryRaw<
      Array<{ tablename: string; qual: string | null; with_check: string | null }>
    >`
      SELECT tablename, qual, with_check FROM pg_policies
      WHERE policyname = 'tenant_isolation' AND schemaname = 'public'
    `
    const missingCheck = policies.filter(p => !p.with_check)
    expect(missingCheck.map(p => p.tablename)).toEqual([])
  })
})
EOF
```

- [ ] **Step 2：写 `tenant-isolation.test.ts`（A2 防御验证 + 跨租户隔离）**

```bash
cat > server/src/__tests__/integration/tenant-isolation.test.ts <<'EOF'
import { describe, it, expect } from 'vitest'
import { testDb, withTestTenant } from './setup.js'
import { seedStoreWithMenu } from './fixtures.js'

describe('tenant isolation — RLS strict mode', () => {
  it('bare prisma query without tenant context throws', async () => {
    // A2 防御：set_config 严格模式下，current_setting 无 fallback → 抛 unrecognized configuration parameter。
    // 证明忘记包 withTenantContext 不会静默返回空，而是显式失败。
    await expect(
      testDb.order.findMany()
    ).rejects.toThrow(/app\.current_store_id|unrecognized configuration/i)
  })

  it('INSERT without tenant context throws (WITH CHECK defense)', async () => {
    // Plan 阶段补强：WITH CHECK 挡住 "漏写 store_id 的 insert"。
    // Prisma 要求 storeId 在 payload 里，即使给了也要经过 RLS policy 校验 current_setting。
    await expect(
      testDb.order.create({
        data: {
          storeId: '00000000-0000-0000-0000-000000000999',
          tableId: '00000000-0000-0000-0000-000000000000',
          status: 'pending' as any,
          version: 0,
        } as any,
      })
    ).rejects.toThrow()  // 具体 error message 取决于哪个 constraint 先挡
  })

  it('tenant A cannot see tenant B data', async () => {
    // 用 platform role 建两个 store + 各自的订单，然后用租户 context 验证看不到对方
    const { storeA, storeB } = await testDb.$transaction(async (tx) => {
      await tx.$executeRaw`SET LOCAL ROLE platform_admin`
      const a = await seedStoreWithMenu(tx, { name: 'Store A' })
      const b = await seedStoreWithMenu(tx, { name: 'Store B' })
      // 各自建一个 order
      await tx.order.create({
        data: { storeId: a.store.id, tableId: a.table.id, status: 'pending' as any, version: 0 },
      })
      await tx.order.create({
        data: { storeId: b.store.id, tableId: b.table.id, status: 'pending' as any, version: 0 },
      })
      return { storeA: a.store, storeB: b.store }
    })

    const ordersA = await withTestTenant(storeA.id, (tx) => tx.order.findMany())
    const ordersB = await withTestTenant(storeB.id, (tx) => tx.order.findMany())

    expect(ordersA).toHaveLength(1)
    expect(ordersA[0].storeId).toBe(storeA.id)
    expect(ordersB).toHaveLength(1)
    expect(ordersB[0].storeId).toBe(storeB.id)
  })

  it('INSERT with mismatching storeId in tenant context is rejected by WITH CHECK', async () => {
    const { storeA, storeB } = await testDb.$transaction(async (tx) => {
      await tx.$executeRaw`SET LOCAL ROLE platform_admin`
      const a = await seedStoreWithMenu(tx, { name: 'A' })
      const b = await seedStoreWithMenu(tx, { name: 'B' })
      return { storeA: a.store, storeB: b.store }
    })

    // 在 storeA 的 context 里试图 insert 一个属于 storeB 的 order
    await expect(
      withTestTenant(storeA.id, (tx) =>
        tx.order.create({
          data: {
            storeId: storeB.id,  // ❌ 不匹配
            tableId: '00000000-0000-0000-0000-000000000000',
            status: 'pending' as any,
            version: 0,
          },
        })
      )
    ).rejects.toThrow(/row-level security|new row violates/i)
  })
})
EOF
```

- [ ] **Step 3：跑测试**

```bash
cd server
pnpm test:integration tenant-isolation rls-coverage 2>&1 | tail -30
```

预期：
```
 ✓ rls-coverage.test.ts  (2 tests)
 ✓ tenant-isolation.test.ts  (4 tests)

Test Files  2 passed (2)
     Tests  6 passed (6)
```

**若任一挂掉**：
- `bare prisma query throws` 挂 → A2 的 set_config 防御没生效，Task 6 的 prisma-client 要重新审
- `WITH CHECK` 挂 → Task 4 的 `WITH CHECK` 没加到 policy 里，或 Prisma 有 bypass
- `tenant A/B isolation` 挂 → RLS `USING` 表达式写错，或测试 DB 的 role 是 superuser（BYPASSRLS）

- [ ] **Step 4：commit**

```bash
git add server/src/__tests__/integration/rls-coverage.test.ts \
        server/src/__tests__/integration/tenant-isolation.test.ts
git commit -m "test(phase-5): RLS coverage + tenant isolation integration tests

- rls-coverage: every store_id table has RLS enabled + tenant_isolation policy + WITH CHECK
- tenant-isolation: bare query without context throws (A2 set_config strict defense)
- tenant-isolation: cross-tenant SELECT returns nothing
- tenant-isolation: INSERT with mismatching storeId rejected by WITH CHECK

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 15：写 `module-registry.test.ts`（幽灵权限检测）

**Files:**
- Create: `server/src/__tests__/integration/module-registry.test.ts`

**前置**：Task 14 完成；`shared/modules.ts` 存在（设计阶段已确认是单一注册中心，spec §4.4）。

**目的**：防止"代码里用了 `requirePermission('xxx')` 但 `MODULES` 里没声明"这种幽灵权限。CI 挂住这类问题。

- [ ] **Step 1：读 shared/modules.ts 确认 API**

```bash
cat shared/modules.ts 2>/dev/null | head -50
```

如果文件不存在或结构不同，按 spec §4.4 的预期导出：`MODULES` 和 `ALL_PERMISSIONS`。

- [ ] **Step 2：写测试**

```bash
cat > server/src/__tests__/integration/module-registry.test.ts <<'EOF'
import { describe, it, expect } from 'vitest'
import { execSync } from 'node:child_process'
import { ALL_PERMISSIONS } from '@qr-order/shared/modules'

/**
 * Ghost permission guard — scans codebase for requirePermission('xxx') calls
 * and verifies every referenced permission string is registered in MODULES.
 * If someone adds a new route with requirePermission('orders:refund') but
 * forgets to extend shared/modules.ts, this test fails in CI.
 */
describe('module registry', () => {
  it('every requirePermission() call references a registered permission', () => {
    const registered = new Set(ALL_PERMISSIONS as readonly string[])

    // grep for requirePermission('...') + resolvePermission('...') + requireModule('...')
    // across server/src — handles both single and double quotes.
    const raw = execSync(
      `grep -rhnE "requirePermission\\(['\\\"]([^'\\\"]+)['\\\"]\\)" server/src 2>/dev/null || true`,
      { encoding: 'utf-8' }
    )

    const referenced = new Set<string>()
    const pattern = /requirePermission\(['"]([^'"]+)['"]\)/g
    for (const line of raw.split('\n')) {
      let m: RegExpExecArray | null
      while ((m = pattern.exec(line)) !== null) {
        referenced.add(m[1])
      }
    }

    const ghosts = Array.from(referenced).filter(p => !registered.has(p))
    if (ghosts.length > 0) {
      console.error('Ghost permissions (referenced in code but not in shared/modules.ts):')
      console.error(ghosts)
    }
    expect(ghosts).toEqual([])
  })

  it('MODULES export has expected shape', async () => {
    const mod = await import('@qr-order/shared/modules')
    expect(mod.MODULES).toBeDefined()
    expect(mod.ALL_PERMISSIONS).toBeDefined()
    expect(Array.isArray(mod.ALL_PERMISSIONS)).toBe(true)
    expect(mod.ALL_PERMISSIONS.length).toBeGreaterThan(0)
  })
})
EOF
```

- [ ] **Step 3：跑测试**

```bash
cd server
pnpm test:integration module-registry 2>&1 | tail -15
```

预期：
```
 ✓ module-registry.test.ts  (2 tests)
   ✓ every requirePermission() call references a registered permission
   ✓ MODULES export has expected shape

Test Files  1 passed (1)
     Tests  2 passed (2)
```

**若第一个测试挂**：说明现有代码里有 requirePermission 引用了 MODULES 没声明的权限——现状就是幽灵权限。记录 ghost 清单给 Phase E 的 role/permission 迁移处理（是否补进 MODULES 还是改代码由 Phase E 决定）。

这种情况下**不回滚测试**——让测试红着，作为 Phase E 的显式 TODO。但如果现在就能确认是打字错误，直接在 `shared/modules.ts` 里加上对应权限让测试过。

- [ ] **Step 4：commit**

```bash
git add server/src/__tests__/integration/module-registry.test.ts
git commit -m "test(phase-5): ghost permission guard

Scans server/src for requirePermission() calls and verifies each
permission string is registered in shared/modules.ts MODULES.
Prevents drift where code references a permission no one declared.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

**Phase C 完成。**下一个 phase：[`phase-d-repositories.md`](./phase-d-repositories.md)。

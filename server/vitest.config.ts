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

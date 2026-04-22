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

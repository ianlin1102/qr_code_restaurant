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

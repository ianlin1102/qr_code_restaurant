import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['pricing/__tests__/**/*.test.ts'],
  },
})

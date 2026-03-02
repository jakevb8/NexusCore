import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['apps/api/src/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      // Only measure coverage on API service logic — not NestJS DI boilerplate,
      // controllers (tested via e2e), decorators, or other apps in the monorepo
      include: ['apps/api/src/modules/**/*.service.ts'],
      exclude: [],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
})

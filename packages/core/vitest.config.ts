import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      thresholds: { lines: 85, statements: 85, branches: 80, functions: 85 },
    },
    environment: 'node',
  },
});

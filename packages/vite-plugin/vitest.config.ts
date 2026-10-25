import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    environment: 'node',
    // Keeps Vitest away from the examples' Playwright specs.
    include: ['src/**/*.test.ts'],
  },
});

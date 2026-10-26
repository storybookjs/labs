import { configDefaults, defineConfig } from 'vite-plus';

export default defineConfig({
  fmt: {
    tabWidth: 2,
    useTabs: false,
    singleQuote: true,
    semi: true,
    printWidth: 100,
    trailingComma: 'es5',
    endOfLine: 'lf',
    sortPackageJson: false,
    ignorePatterns: [],
  },
  lint: {
    plugins: ['typescript', 'unicorn', 'oxc'],
    categories: {
      correctness: 'error',
    },
    rules: {
      'vite-plus/prefer-vite-plus-imports': 'error',
    },
    env: {
      builtin: true,
      node: true,
    },
    overrides: [
      {
        files: ['**/*.test.ts'],
        plugins: ['vitest'],
      },
    ],
    options: {
      typeAware: true,
      typeCheck: true,
    },
    jsPlugins: [
      {
        name: 'vite-plus',
        specifier: 'vite-plus/oxlint-plugin',
      },
    ],
  },
  test: {
    projects: ['packages/*'],
    forceRerunTriggers: [
      ...configDefaults.forceRerunTriggers,
      '**/pnpm-lock.yaml',
      '**/tsconfig*.json',
    ],
    passWithNoTests: true,
  },
});

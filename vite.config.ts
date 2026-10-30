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
      {
        files: ['packages/*/examples/*/src/**', 'packages/*/examples/*/.storybook/preview.{js,ts}'],
        env: {
          node: false,
          browser: true,
        },
      },
      {
        // Examples are plain Vite apps, so their configs import `vite` and `vitest` directly.
        files: ['packages/*/examples/**'],
        rules: {
          'vite-plus/prefer-vite-plus-imports': 'off',
        },
      },
      {
        files: ['packages/vite-plugin/examples/react/**/*.{js,jsx,ts,tsx}'],
        plugins: ['react', 'jsx-a11y'],
      },
      {
        files: ['packages/vite-plugin/examples/vue/**/*.{js,ts,vue}'],
        plugins: ['vue'],
      },
    ],
    options: {
      typeAware: true,
      // tsgolint can't check `.vue`/Angular/Nuxt sources; `typecheck` scripts own type errors.
      typeCheck: false,
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

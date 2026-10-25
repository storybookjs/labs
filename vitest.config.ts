import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: ["packages/*"],
    forceRerunTriggers: [
      ...configDefaults.forceRerunTriggers,
      "**/pnpm-lock.yaml",
      "**/tsconfig*.json",
    ],
    passWithNoTests: true,
  },
});

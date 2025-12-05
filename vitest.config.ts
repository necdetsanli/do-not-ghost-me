// vitest.config.ts
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import path from "node:path";

/**
 * Resolve the project root directory from the current module URL.
 * This is used to build stable, cross-platform paths in the config.
 */
const projectRootDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  test: {
    /**
     * Use a pure Node.js environment. This is appropriate for
     * library code, Prisma, and backend-oriented logic.
     */
    environment: "node",

    /**
     * Enable global test APIs (describe/it/expect) without
     * importing them in every test file.
     */
    globals: true,

    /**
     * Only pick up files that follow the *.test.ts/tsx naming convention
     * under the tests/ directory.
     */
    include: ["tests/**/*.test.{ts,tsx}"],

    /**
     * Load a single bootstrap file before running any tests.
     * This is where we normalize process.env for tests.
     */
    setupFiles: ["tests/setup/test-env.ts"],

    coverage: {
      provider: "v8",
      reportsDirectory: "coverage",
    },

    // Optional, but helpful if you start using vi.spyOn / vi.mock heavily:
    // clearMocks: true,
    // restoreMocks: true,
  },

  /**
   * Support "@/..." imports in tests by pointing the alias to src/.
   */
  resolve: {
    alias: {
      "@": path.resolve(projectRootDir, "src"),
    },
  },
});

// vitest.config.ts
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import path from "node:path";

/**
 * Absolute path to the project root directory resolved from this config file.
 *
 * @type {string}
 */
const projectRootDir: string = fileURLToPath(new URL(".", import.meta.url));

/**
 * Shared setup file (Node-safe) for all test projects.
 *
 * @type {string}
 */
const baseSetupFile: string = path.resolve(
  projectRootDir,
  "tests/setup/test-env.ts",
);

/**
 * Optional DOM-specific setup (only for jsdom tests).
 * Create this file if you want jest-dom matchers, etc.
 *
 * @type {string}
 */
const domSetupFile: string = path.resolve(
  projectRootDir,
  "tests/setup/test-dom.ts",
);

export default defineConfig({
  test: {
    /**
     * Enable global test APIs (describe / it / expect) without importing them.
     */
    globals: true,

    /**
     * Explicitly ignore common output / cache directories.
     */
    exclude: ["node_modules", "dist", ".next", ".turbo", "coverage"],

    /**
     * Coverage configuration based on the V8 engine.
     */
    coverage: {
      provider: "v8",
      reportsDirectory: path.resolve(projectRootDir, "coverage"),
    },

    /**
     * Run different subsets of tests under different environments.
     *
     * - *.test.ts  -> node (backend/lib tests)
     * - *.test.tsx -> jsdom (React hooks/components)
     */
    projects: [
      {
        extends: true,
        test: {
          name: { label: "node", color: "green" },
          environment: "node",
          include: ["tests/**/*.test.ts"],
          setupFiles: [baseSetupFile],
          restoreMocks: true,
          clearMocks: true,
        },
      },
      {
        extends: true,
        test: {
          name: { label: "jsdom", color: "cyan" },
          environment: "jsdom",
          include: ["tests/**/*.test.tsx"],
          setupFiles: [baseSetupFile, domSetupFile],
          clearMocks: true,
          restoreMocks: true,
        },
      },
    ],
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

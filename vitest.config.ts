// vitest.config.ts
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import path from "node:path";

/**
 * Absolute path to the project root directory resolved from this config file.
 * This ensures all subsequent paths are stable and cross-platform.
 *
 * @type {string}
 */
const projectRootDir: string = fileURLToPath(new URL(".", import.meta.url));

/**
 * Vitest configuration for this project.
 *
 * - Uses a pure Node.js environment for backend / library tests.
 * - Supports "@/..." imports by aliasing to the src/ directory.
 * - Boots a single test env setup file before running any tests.
 */
export default defineConfig({
  test: {
    /**
     * Use a pure Node.js environment. This is appropriate for
     * library code, Prisma, and backend-oriented logic.
     *
     * For React / DOM-heavy tests you can override this per-test
     * file or suite (e.g. with jsdom or happy-dom).
     */
    environment: "node",

    /**
     * Enable global test APIs (describe / it / expect) without
     * importing them in every test file.
     */
    globals: true,

    /**
     * Only pick up files that follow the *.test.ts/tsx naming convention
     * under the tests/ directory.
     */
    include: ["tests/**/*.test.{ts,tsx}"],

    /**
     * Explicitly ignore common output / cache directories.
     */
    exclude: ["node_modules", "dist", ".next", ".turbo", "coverage"],

    /**
     * Load a single bootstrap file before running any tests.
     * This is where we normalize process.env for tests and apply
     * any global mocks.
     */
    setupFiles: [path.resolve(projectRootDir, "tests/setup/test-env.ts")],

    /**
     * Coverage configuration based on the V8 engine.
     * The reports directory is resolved from the project root
     * for consistency across environments.
     */
    coverage: {
      provider: "v8",
      reportsDirectory: path.resolve(projectRootDir, "coverage"),
    },

    /**
     * If you start using vi.spyOn / vi.mock heavily, consider enabling:
     *
     * clearMocks: true,
     * restoreMocks: true,
     *
     * Keeping them commented out for now avoids surprising behavior
     * in tests that rely on manual mock lifecycle control.
     */
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

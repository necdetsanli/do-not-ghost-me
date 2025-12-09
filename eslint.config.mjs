// eslint.config.mjs
// Strict, production-leaning ESLint config for Next.js + TypeScript (flat config, ESM).

import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { fileURLToPath } from "node:url";
import path from "node:path";

// __dirname is not available in ESM; recreate it here.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig([
  // Next.js base + Core Web Vitals rules.
  ...nextVitals,
  // Next.js + TypeScript-aware rules.
  ...nextTs,

  /**
   * 1) Rules that require type information (typed linting) for application source.
   *    This block is where we enable the most security-focused TS rules.
   */
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        // Enable typed linting by pointing to the project tsconfig.
        project: ["./tsconfig.json"],
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      // Async / Promise safety.
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": [
        "error",
        {
          checksVoidReturn: {
            // Do not over-enforce on JSX attributes (onClick, etc).
            attributes: false,
            properties: true,
          },
        },
      ],
      "@typescript-eslint/require-await": "error",

      // Strict boolean logic: no accidental truthy/falsy checks.
      "@typescript-eslint/strict-boolean-expressions": [
        "error",
        {
          allowString: false,
          allowNumber: false,
          allowNullableObject: false,
          allowNullableBoolean: true,
          allowNullableString: false,
          allowNullableNumber: false,
        },
      ],

      // Unsafe TS escape hatches (we want to catch these early).
      "@typescript-eslint/no-unsafe-assignment": "error",
      "@typescript-eslint/no-unsafe-member-access": "error",
      "@typescript-eslint/no-unsafe-call": "error",
      "@typescript-eslint/no-unsafe-return": "error",
      "@typescript-eslint/no-non-null-assertion": "error",

      // Encourage safer null-handling patterns.
      "@typescript-eslint/prefer-nullish-coalescing": [
        "error",
        {
          ignoreConditionalTests: true,
          ignoreMixedLogicalExpressions: true,
        },
      ],
    },
  },

  /**
   * 2) TypeScript rules that do NOT require full type information (app source).
   *    These run fast and enforce project-wide style / conventions.
   */
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/explicit-function-return-type": [
        "error",
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
        },
      ],
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      "@typescript-eslint/boolean-type": [
        "error",
        {
          allowBoolean: true,
        },
      ],
    },
  },

  /**
   * 3) General JS/TS quality rules for all app *and test* source.
   *    These complement the TS-specific rules above.
   */
  {
    files: ["src/**/*.{ts,tsx,js,jsx}", "tests/**/*.{ts,tsx,js,jsx}"],
    rules: {
      // General code quality.
      "no-var": "error",
      "prefer-const": [
        "error",
        {
          destructuring: "all",
          ignoreReadBeforeAssign: false,
        },
      ],
      eqeqeq: ["error", "always", { null: "ignore" }],
      curly: ["error", "all"],
      "no-unused-vars": "off", // handled by @typescript-eslint/no-unused-vars.
      "no-implicit-globals": "error",
      "no-implied-eval": "error",
      "no-alert": "error",
      "no-return-await": "error",
      "no-template-curly-in-string": "error",
      "no-unsafe-optional-chaining": "error",

      // Logging (allowed only for warnings/errors).
      "no-console": [
        "warn",
        {
          allow: ["warn", "error"],
        },
      ],

      // React / JSX.
      "react/jsx-key": "error",
      "react/jsx-no-target-blank": [
        "error",
        {
          allowReferrer: false,
          enforceDynamicLinks: "always",
        },
      ],
    },
  },

  /**
   * 4) Test-specific config (Vitest globals, etc.).
   */
  {
    files: ["tests/**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      // Tell ESLint about Vitest globals so it does not flag them as undefined.
      globals: {
        describe: "readonly",
        it: "readonly",
        test: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
        vi: "readonly",
      },
    },
    rules: {
      // Keep tests reasonably strict; relax or extend here if needed later.
    },
  },

  /**
   * 5) Global ignores (build artifacts, generated files, etc.).
   */
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "test-results/**",
    "playwright-report/**",
    "next-env.d.ts",
  ]),
]);

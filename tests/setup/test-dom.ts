// tests/setup/test-dom.ts
import "@testing-library/jest-dom/vitest";

/**
 * React 18+ act() warnings fix for Vitest + JSDOM.
 */
(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

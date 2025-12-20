import { randomBytes } from "node:crypto";

/**
 * Generates a cryptographically strong random hex string.
 *
 * @param {number} bytes - Number of random bytes to generate.
 * @returns {string} Hex-encoded string.
 */
function randomHex(bytes: number): string {
  return randomBytes(bytes).toString("hex");
}

/**
 * Per-process test values to avoid hardcoded secret/password literals.
 *
 * Values are generated at runtime and remain stable for the lifetime of the process.
 */
export const TEST_RATE_LIMIT_IP_SALT: string = randomHex(32);

export const TEST_ADMIN_PASSWORD: string = randomHex(16);

/**
 * Ensure the wrong password can never equal the correct password.
 */
export const TEST_ADMIN_PASSWORD_WRONG: string = `${TEST_ADMIN_PASSWORD}-wrong-${randomHex(4)}`;

export const TEST_ADMIN_SESSION_SECRET: string = randomHex(32);
export const TEST_ADMIN_CSRF_SECRET: string = randomHex(32);

// scripts/coverage/playwright-to-nyc.mjs
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

/**
 * Istanbul libraries are CommonJS.
 * In ESM (.mjs), do NOT use named imports from CJS modules.
 * Use default import and destructure safely.
 */
import coverageLib from "istanbul-lib-coverage";

const { createCoverageMap } = coverageLib;

/**
 * Where Playwright coverage JSON fragments are expected to be written.
 *
 * You can override by setting:
 * - PW_COVERAGE_DIR=some/dir
 *
 * The directory should contain one or more *.json files,
 * each being a valid Istanbul coverage map object.
 */
const DEFAULT_INPUT_DIRS = [
  "coverage/e2e/raw",
  "test-results/coverage",
  "coverage/playwright",
];

const inputDirFromEnv = process.env.PW_COVERAGE_DIR;
const inputDirs =
  typeof inputDirFromEnv === "string" && inputDirFromEnv.trim().length > 0
    ? [inputDirFromEnv.trim()]
    : DEFAULT_INPUT_DIRS;

const NYC_OUTPUT_DIR = ".nyc_output";
const NYC_OUTPUT_FILE = "out.json";

/**
 * Recursively collects all .json files under a directory.
 *
 * @param {string} dir
 * @returns {Promise<string[]>}
 */
async function collectJsonFiles(dir) {
  const files = [];

  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return files;
  }

  for (const entry of entries) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory() === true) {
      const nested = await collectJsonFiles(full);
      for (const f of nested) files.push(f);
      continue;
    }

    if (entry.isFile() === true && entry.name.endsWith(".json") === true) {
      files.push(full);
    }
  }

  return files;
}

/**
 * Attempts to parse a JSON file as an Istanbul coverage map object.
 *
 * @param {string} filePath
 * @returns {Promise<Record<string, unknown> | null>}
 */
async function readCoverageJson(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = JSON.parse(raw);

  const isObject =
    typeof parsed === "object" && parsed !== null && Array.isArray(parsed) === false;

  if (isObject === false) {
    return null;
  }

  return parsed;
}

/**
 * Main: merge Istanbul fragments into a single NYC-compatible output file.
 *
 * @returns {Promise<void>}
 */
async function main() {
  const allJsonFiles = [];

  for (const dir of inputDirs) {
    const found = await collectJsonFiles(dir);
    for (const f of found) allJsonFiles.push(f);
  }

  if (allJsonFiles.length === 0) {
    console.error(
      `[coverage] No coverage JSON files found. Searched: ${inputDirs.join(", ")}`,
    );
    console.error(
      `[coverage] Ensure your Playwright fixtures write Istanbul coverage fragments into one of these dirs, or set PW_COVERAGE_DIR.`,
    );
    process.exitCode = 1;
    return;
  }

  const map = createCoverageMap({});

  let mergedCount = 0;

  for (const filePath of allJsonFiles) {
    const obj = await readCoverageJson(filePath);

    if (obj === null) {
      console.warn(`[coverage] Skipping non-object coverage JSON: ${filePath}`);
      continue;
    }

    map.merge(obj);
    mergedCount += 1;
  }

  if (mergedCount === 0) {
    console.error("[coverage] Found JSON files, but none were valid Istanbul coverage maps.");
    process.exitCode = 1;
    return;
  }

  await fs.mkdir(NYC_OUTPUT_DIR, { recursive: true });

  const outPath = path.join(NYC_OUTPUT_DIR, NYC_OUTPUT_FILE);
  await fs.writeFile(outPath, JSON.stringify(map.toJSON()), "utf8");

  console.log(
    `[coverage] Merged ${String(mergedCount)} coverage fragments into ${outPath}`,
  );
}

await main();

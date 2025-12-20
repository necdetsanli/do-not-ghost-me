import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import coverageLib from "istanbul-lib-coverage";
import V8ToIstanbul from "v8-to-istanbul";

const { createCoverageMap } = coverageLib;

const NYC_OUTPUT_DIR = ".nyc_output";
const NYC_OUTPUT_FILE = "out.json";

/**
 * Returns the directory where Playwright raw V8 coverage fragments are written.
 *
 * @returns {string}
 */
function resolveInputDir() {
  const fromEnv = process.env.PW_COVERAGE_DIR;

  if (typeof fromEnv === "string" && fromEnv.trim().length > 0) {
    return fromEnv.trim();
  }

  return "coverage/e2e/raw";
}

/**
 * Converts a served script URL (/_next/static/...) into a local file path under .next/static.
 *
 * @param {string} url
 * @returns {string | null}
 */
function urlToLocalPath(url) {
  if (typeof url !== "string" || url.length === 0) {
    return null;
  }

  const idx = url.indexOf("/_next/static/");
  if (idx === -1) {
    return null;
  }

  const rel = url.slice(idx + "/_next/static/".length);
  return path.join(process.cwd(), ".next", "static", rel);
}

/**
 * Collects *.json files under a directory (non-recursive is enough for our case).
 *
 * @param {string} dir
 * @returns {Promise<string[]>}
 */
async function listJsonFiles(dir) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  return entries
    .filter((e) => e.isFile() === true && e.name.endsWith(".json") === true)
    .map((e) => path.join(dir, e.name));
}

/**
 * Main: Convert Playwright V8 coverage fragments into a single NYC-compatible Istanbul map.
 *
 * @returns {Promise<void>}
 */
async function main() {
  const inputDir = resolveInputDir();
  const files = await listJsonFiles(inputDir);

  if (files.length === 0) {
    console.error(`[coverage] No coverage JSON files found. Searched: ${inputDir}`);
    console.error(
      `[coverage] Ensure PW_COLLECT_V8_COVERAGE=1 is set and your fixtures write V8 coverage into ${inputDir}.`,
    );
    process.exitCode = 1;
    return;
  }

  const map = createCoverageMap({});
  let convertedScripts = 0;

  for (const filePath of files) {
    const raw = JSON.parse(await fs.readFile(filePath, "utf8"));

    if (Array.isArray(raw) === false) {
      console.warn(`[coverage] Skipping non-array V8 coverage JSON: ${filePath}`);
      continue;
    }

    for (const scriptCov of raw) {
      if (
        typeof scriptCov !== "object" ||
        scriptCov === null ||
        typeof scriptCov.url !== "string" ||
        Array.isArray(scriptCov.functions) === false
      ) {
        continue;
      }

      const localPath = urlToLocalPath(scriptCov.url);
      if (localPath === null) {
        continue;
      }

      try {
        await fs.access(localPath);
      } catch {
        continue;
      }

      try {
        const converter = new V8ToIstanbul(localPath, 0, { source: null });
        await converter.load();
        converter.applyCoverage(scriptCov.functions);
        map.merge(converter.toIstanbul());
        convertedScripts += 1;
      } catch {
        // Ignore scripts we cannot convert (external/inline/internal)
      }
    }
  }

  if (convertedScripts === 0) {
    console.error("[coverage] No scripts were converted. Most likely no sourcemapped Next assets were found.");
    console.error("[coverage] Tip: run E2E coverage against a production build with browser sourcemaps enabled.");
    process.exitCode = 1;
    return;
  }

  await fs.mkdir(NYC_OUTPUT_DIR, { recursive: true });

  const outPath = path.join(NYC_OUTPUT_DIR, NYC_OUTPUT_FILE);
  await fs.writeFile(outPath, JSON.stringify(map.toJSON()), "utf8");

  console.log(`[coverage] Converted ${String(convertedScripts)} scripts into ${outPath}`);
}

await main();

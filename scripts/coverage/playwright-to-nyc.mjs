import { globSync } from "glob";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { createCoverageMap } from "istanbul-lib-coverage";
import v8toIstanbul from "v8-to-istanbul";

const files = globSync("test-results/**/v8-coverage.json", { nodir: true });
const map = createCoverageMap({});

for (const file of files) {
  const raw = JSON.parse(readFileSync(file, "utf8"));

  /** @type {Array<{url:string, functions:any, source?:string}>} */
  const entries = Array.isArray(raw?.js) ? raw.js : [];

  for (const entry of entries) {
    if (typeof entry?.url !== "string" || entry.url.length === 0) continue;

    // İstersen sadece kendi app bundle’larını dahil et:
    // if (!entry.url.includes("/_next/")) continue;

    const converter = v8toIstanbul(entry.url, 0, { source: entry.source });
    await converter.load();
    converter.applyCoverage(entry.functions);

    map.merge(converter.toIstanbul());
  }
}

mkdirSync(".nyc_output", { recursive: true });
writeFileSync(".nyc_output/playwright.json", JSON.stringify(map.toJSON()));
console.log(`Wrote .nyc_output/playwright.json from ${files.length} test artifact(s).`);

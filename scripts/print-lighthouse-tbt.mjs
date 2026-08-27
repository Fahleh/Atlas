import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Prints route and real measured Total Blocking Time for every LHR JSON
 * file in .lighthouseci, independent of what `lhci assert` later passes
 * or fails. See docs/decisions.md, "CI performance gate": a single lab
 * run is not a valid sample, and `assert`'s own output only surfaces
 * failing assertions by default, so this reads the same LHR files
 * `assert` reads from directly, before that filtering happens.
 *
 * The threshold is read from the same lighthouserc file `assert` uses
 * for this matrix leg, not hardcoded here, so there is one source of
 * truth for the number. It's constant across every row in a single
 * invocation (one config per run), so it prints once as a header line,
 * not per row. Form factor is likewise constant per matrix leg and is
 * already known from which leg's log this is, so it isn't a column.
 */
const LHCI_DIR = ".lighthouseci";

const [, , lighthousercPath] = process.argv;

if (!lighthousercPath) {
  console.error(
    "::error::Usage: node scripts/print-lighthouse-tbt.mjs <path-to-lighthouserc.json>",
  );
  process.exit(1);
}

const lighthouserc = JSON.parse(readFileSync(lighthousercPath, "utf-8"));
const tbtThreshold =
  lighthouserc.ci?.assert?.assertions?.["total-blocking-time"]?.[1]
    ?.maxNumericValue;

if (typeof tbtThreshold !== "number") {
  console.error(
    `::error::Could not read total-blocking-time maxNumericValue from ${lighthousercPath}`,
  );
  process.exit(1);
}

const reportFiles = readdirSync(LHCI_DIR).filter((file) =>
  /^lhr-\d+\.json$/.test(file),
);

if (reportFiles.length === 0) {
  console.error(`::error::No lhr-*.json files found in ${LHCI_DIR}`);
  process.exit(1);
}

console.log(`total-blocking-time threshold: ${tbtThreshold}`);
console.log("route\ttotal_blocking_time_ms");

for (const file of reportFiles) {
  const lhr = JSON.parse(readFileSync(join(LHCI_DIR, file), "utf-8"));
  const route = lhr.finalUrl;
  const tbt = lhr.audits?.["total-blocking-time"]?.numericValue;

  console.log(`${route}\t${tbt}`);
}

import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Reads csp-violations.json written by authenticated-lighthouse.mts and
 * fails if it's non-empty. Kept as a separate script rather than an
 * assertion inside authenticated-lighthouse.mts itself, matching how
 * lhci assert already gates on that script's report output instead of
 * the script asserting on its own results.
 */
const [, , outputDir] = process.argv;

if (!outputDir) {
  console.error(
    "::error::Usage: node scripts/assert-no-csp-violations.mjs <output-directory>",
  );
  process.exit(1);
}

const violationsPath = join(outputDir, "csp-violations.json");
const violations = JSON.parse(readFileSync(violationsPath, "utf-8"));

if (violations.length > 0) {
  console.error(`::error::${violations.length} CSP violation(s) during authenticated Lighthouse run:`);
  for (const violation of violations) {
    console.error(
      `  ${violation.violatedDirective}: blocked ${violation.blockedURI} (${violation.sourceFile}:${violation.lineNumber})`,
    );
  }
  process.exit(1);
}

console.log("No CSP violations during authenticated Lighthouse run.");

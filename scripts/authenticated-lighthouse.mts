/**
 * Standalone script, not part of the shipped app. Logs into Atlas with a
 * persistent Playwright Chromium context, then runs playwright-lighthouse's
 * playAudit against that same authenticated instance for each authenticated
 * route and preset, RUNS_PER_ROUTE times each, writing reports to the given
 * directory. lhci assert, not this script, aggregates the resulting files
 * (median, see lighthouserc.*.json).
 *
 * One continuous authenticated browser throughout. Replaces the old
 * --extra-headers cookie hand-off (scripts/get-auth-cookie.ts, deleted):
 * that flag sets a header on outgoing requests, it never populates a
 * browser's actual cookie storage, so client-side code never had a session
 * regardless of how the cookie value was sourced. See docs/decisions.md.
 *
 * Public routes (/login, /signup) need no session and stay on the plain
 * `lighthouse` CLI. This script only covers authenticated routes.
 *
 * Runs as native ESM (.mts, not .ts): playwright-lighthouse and lighthouse
 * are both pure ESM packages, and running through tsx triggers a known,
 * unresolved issue (privatenumber/tsx#113), a ReferenceError for __name
 * inside Playwright's in-page evaluation. ts-node's ESM loader doesn't use
 * esbuild and doesn't share that failure mode. See docs/decisions.md.
 *
 * Usage: node --loader ts-node/esm scripts/authenticated-lighthouse.mts <output-directory>
 * Requires LIGHTHOUSE_AUTH_EMAIL and LIGHTHOUSE_AUTH_PASSWORD in .env.local.
 */
import { config } from "dotenv";
import { mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, type Page } from "playwright";
import { playAudit } from "playwright-lighthouse";
import desktopConfig from "lighthouse/core/config/desktop-config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, "..", ".env.local") });

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
const DEBUG_PORT = 9222;
const LOGIN_TIMEOUT_MS = 15000;

// The four categories this project has always measured. Passed explicitly:
// playwright-lighthouse falls back to Object.keys(defaultThresholds) when
// opts.onlyCategories is unset, and that default set includes "pwa", not a
// registered category in this installed Lighthouse version.
const CATEGORIES = ["performance", "accessibility", "best-practices", "seo"];

// A single lab run per route is not a valid sample for a performance gate;
// lab variance alone moved TBT by 2-4x between otherwise-identical runs
// during verification. Each route/form-factor combination is audited this
// many times, and lhci assert (given the median aggregationMethod in
// lighthouserc.*.json) does the actual averaging across the resulting
// files, not this script. See docs/decisions.md.
const RUNS_PER_ROUTE = 3;

const ROUTES = [
  { name: "dashboard", path: "/" },
  { name: "profile", path: "/profile" },
  { name: "projects", path: "/projects" },
];

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// playwright-lighthouse strips reports.name from its last "." onward before
// appending the file extension, so a trailing dot is required to land on
// the established "<name>.report.<ext>" filenames rather than "<name>.<ext>".
function reportName(base: string): string {
  return `${base}.report.`;
}

async function runAudit(params: {
  page: Page;
  routeName: string;
  desktop: boolean;
  runIndex: number;
  outputDir: string;
}): Promise<void> {
  const { page, routeName, desktop, runIndex, outputDir } = params;
  const name = desktop ? `${routeName}-desktop-${runIndex}` : `${routeName}-${runIndex}`;

  await playAudit({
    page,
    port: DEBUG_PORT,
    thresholds: {},
    opts: {
      disableStorageReset: true,
      onlyCategories: CATEGORIES,
    },
    config: desktop ? desktopConfig : undefined,
    reports: {
      formats: { html: true, json: true },
      name: reportName(name),
      directory: outputDir,
    },
    ignoreError: true,
  });
  console.log(`Wrote ${name} report to ${outputDir}`);
}

async function main() {
  const outputDir = process.argv[2];
  if (!outputDir) {
    throw new Error(
      "Usage: node --loader ts-node/esm scripts/authenticated-lighthouse.mts <output-directory>",
    );
  }
  mkdirSync(outputDir, { recursive: true });

  const email = requireEnv("LIGHTHOUSE_AUTH_EMAIL");
  const password = requireEnv("LIGHTHOUSE_AUTH_PASSWORD");

  const userDataDir = path.join(os.tmpdir(), `atlas-lighthouse-${Date.now()}`);
  const context = await chromium.launchPersistentContext(userDataDir, {
    args: [`--remote-debugging-port=${DEBUG_PORT}`],
  });

  try {
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/login`);
    await page.locator("#email").fill(email);
    await page.locator("#password").fill(password);

    try {
      await Promise.all([
        page.waitForURL((url) => url.pathname !== "/login", {
          timeout: LOGIN_TIMEOUT_MS,
        }),
        page.locator("button[type=submit]").click(),
      ]);
    } catch (error) {
      throw new Error(
        `Login did not complete within ${LOGIN_TIMEOUT_MS}ms (still on /login, ` +
          `or navigation failed): ${error instanceof Error ? error.message : error}`,
      );
    }

    for (const route of ROUTES) {
      for (let runIndex = 1; runIndex <= RUNS_PER_ROUTE; runIndex++) {
        await page.goto(`${BASE_URL}${route.path}`);
        await runAudit({ page, routeName: route.name, desktop: false, runIndex, outputDir });
      }

      for (let runIndex = 1; runIndex <= RUNS_PER_ROUTE; runIndex++) {
        await page.goto(`${BASE_URL}${route.path}`);
        await runAudit({ page, routeName: route.name, desktop: true, runIndex, outputDir });
      }
    }
  } finally {
    await context.close();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

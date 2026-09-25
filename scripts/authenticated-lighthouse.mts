/**
 * Standalone script, not part of the shipped app. Logs into Atlas with a
 * persistent Playwright Chromium context, then runs playwright-lighthouse's
 * playAudit against that same authenticated instance for each authenticated
 * route and preset, RUNS_PER_ROUTE times each, writing reports to the given
 * directory. lhci assert, not this script, aggregates the resulting files
 * (median, see lighthouserc.*.json).
 *
 * One continuous authenticated browser throughout, replacing the old
 * --extra-headers cookie hand-off. See docs/decisions.md ("Replacing
 * --extra-headers with a persistent authenticated context").
 *
 * Public routes (/login, /signup) need no session and stay on the plain
 * `lighthouse` CLI. This script only covers authenticated routes.
 *
 * Runs as native ESM (.mts, not .ts) via ts-node's ESM loader, not tsx.
 * See docs/decisions.md ("Using ts-node's ESM loader instead of tsx for
 * authenticated-lighthouse.mts").
 *
 * Default scope, no flags, is exactly the script's original behavior:
 * the three routes below, both form factors, RUNS_PER_ROUTE times each,
 * no theme forcing, no interaction states. Two flags add to that scope,
 * independently:
 *
 * --full-contrast-pass: forces both light and dark theme, via the same
 * "atlas-theme" localStorage key app/layout.tsx's own inline theme-flash
 * script reads, not a query param or cookie, neither exists, and adds
 * all three modal interaction states, captured once per theme each, no
 * desktop/mobile split, since color-contrast is a deterministic function
 * of rendered CSS, not a timing metric subject to lab variance the way
 * LCP/TBT are. Each interaction state's "reach" function clicks only as
 * far as the confirm button appearing, never the confirm button itself,
 * that would perform a real destructive write against the real account
 * this script logs into.
 *
 * --smoke-test: shrinks scope size, independent of --full-contrast-pass.
 * Restricts to the dashboard route, desktop only, one run. Composes with
 * --full-contrast-pass rather than being folded into it: used alone it
 * smoke tests the original default scope (1 audit); used together it
 * smoke tests the full enhanced scope, both themes plus the first
 * interaction state (4 audits). Neither flag implies the other.
 *
 * Per-audit resilience (one failing audit or unreachable interaction
 * state never aborts the rest of the run) is unconditional, not gated
 * behind either flag, baseline correctness for any use of this script.
 *
 * Usage: node --loader ts-node/esm scripts/authenticated-lighthouse.mts <output-directory> [--smoke-test] [--full-contrast-pass]
 * Flags may appear in either order. Requires LIGHTHOUSE_AUTH_EMAIL and
 * LIGHTHOUSE_AUTH_PASSWORD in .env.local.
 */
import { config } from "dotenv";
import { mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, type Page } from "playwright";
import { playAudit } from "playwright-lighthouse";
import desktopConfig from "lighthouse/core/config/desktop-config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, "..", ".env.local") });

// Can't import lib/baseUrl.ts here, see docs/decisions.md for why.
// This script never runs on Vercel, so this matches its fallback exactly.
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
const DEBUG_PORT = 9222;
const LOGIN_TIMEOUT_MS = 15000;
const INTERACTION_TIMEOUT_MS = 10000;

// Passed explicitly: playwright-lighthouse's default category set includes
// "pwa", not registered in this installed Lighthouse version.
const CATEGORIES = ["performance", "accessibility", "best-practices", "seo"];

// See docs/decisions.md ("Why each route/form-factor combination runs 3
// times, median aggregated").
const RUNS_PER_ROUTE = 3;

const THEMES = ["light", "dark"] as const;
type Theme = (typeof THEMES)[number];

const ROUTES = [
  { name: "dashboard", path: "/" },
  { name: "profile", path: "/profile" },
  { name: "projects", path: "/projects" },
];

// /projects's own project list is fetched client-side (React Query), so it
// is not present in the DOM the instant page.goto() resolves. Waits for the
// first project link to actually mount before reading hrefs, the same class
// of bug as checking a button with isVisible() instead of waitFor(): an
// immediate DOM read has no reason to see async-fetched content yet.
async function getProjectHrefs(page: Page): Promise<string[]> {
  await page.goto(`${BASE_URL}/projects`);
  const projectLinks = page.locator('a[href^="/projects?project="]');

  try {
    await projectLinks.first().waitFor({ state: "visible", timeout: INTERACTION_TIMEOUT_MS });
  } catch {
    return [];
  }

  const count = await projectLinks.count();
  const hrefs: string[] = [];
  for (let i = 0; i < count; i++) {
    const href = await projectLinks.nth(i).getAttribute("href");
    if (href) hrefs.push(href);
  }
  return hrefs;
}

// Each reach() function drives the already-authenticated page to the exact
// interaction state named, then returns once the confirm control is visible.
// None of them click that confirm control. Doing so would perform a real
// write (delete a task, remove a member, transfer project ownership) against
// whatever real account LIGHTHOUSE_AUTH_EMAIL points at.
const INTERACTION_STATES: {
  name: string;
  reach: (page: Page) => Promise<void>;
}[] = [
  {
    name: "task-delete-confirm",
    reach: async (page) => {
      const hrefs = await getProjectHrefs(page);

      for (const href of hrefs) {
        await page.goto(`${BASE_URL}${href}`);

        // Scoped to TaskList's own "Project tasks" list, not a bare
        // page-wide "^Open " match: confirmed by a direct diagnostic run
        // against this account that next dev renders two devtools toggles
        // whose accessible names also start with "Open " ("Open Next.js
        // Dev Tools", "Open Tanstack query devtools") and sit earlier in
        // DOM order than any task row. An unscoped regex clicked one of
        // those instead of a task, and TaskModal never opened. Scoping to
        // the real list rules out any such overlay by construction, rather
        // than naming each one as it's discovered.
        const openTaskButton = page
          .getByRole("list", { name: "Project tasks" })
          .getByRole("button", { name: /^Open /, exact: false })
          .first();
        try {
          await openTaskButton.waitFor({ state: "visible", timeout: INTERACTION_TIMEOUT_MS });
        } catch {
          continue;
        }

        await openTaskButton.click();
        const deleteButton = page.getByRole("button", { name: "Delete task" });
        await deleteButton.waitFor({ state: "visible", timeout: INTERACTION_TIMEOUT_MS });
        await deleteButton.click();
        await page
          .getByRole("button", { name: "Confirm delete?" })
          .waitFor({ state: "visible", timeout: INTERACTION_TIMEOUT_MS });
        return;
      }

      throw new Error(
        "Couldn't confirm task-delete-confirm: no project with at least one task was found.",
      );
    },
  },
  {
    name: "member-remove-confirm",
    reach: async (page) => {
      const hrefs = await getProjectHrefs(page);

      for (const href of hrefs) {
        await page.goto(`${BASE_URL}${href}`);

        const removeButton = page.locator('button[aria-label^="Remove "]').first();
        try {
          await removeButton.waitFor({ state: "visible", timeout: INTERACTION_TIMEOUT_MS });
        } catch {
          continue;
        }

        await removeButton.click();
        await page
          .locator('button[aria-label^="Confirm remove "]')
          .waitFor({ state: "visible", timeout: INTERACTION_TIMEOUT_MS });
        return;
      }

      throw new Error(
        "Couldn't confirm member-remove-confirm: no removable collaborator was found on any project.",
      );
    },
  },
  {
    name: "ownership-transfer-confirm",
    reach: async (page) => {
      const hrefs = await getProjectHrefs(page);

      for (const href of hrefs) {
        await page.goto(`${BASE_URL}${href}`);

        const transferButton = page
          .locator('button[aria-label^="Transfer ownership to "]')
          .first();
        try {
          await transferButton.waitFor({ state: "visible", timeout: INTERACTION_TIMEOUT_MS });
        } catch {
          continue;
        }

        await transferButton.click();
        await page
          .locator('button[aria-label^="Confirm transfer ownership to "]')
          .waitFor({ state: "visible", timeout: INTERACTION_TIMEOUT_MS });
        return;
      }

      throw new Error(
        "Couldn't confirm ownership-transfer-confirm: no transferable collaborator was found on any project.",
      );
    },
  },
];

type CspViolation = {
  violatedDirective: string;
  blockedURI: string;
  sourceFile: string | null;
  lineNumber: number | null;
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// Keep the trailing dot: playwright-lighthouse strips everything from the
// last "." onward before appending the file extension.
function reportName(base: string): string {
  return `${base}.report.`;
}

// Sets the same "atlas-theme" key app/layout.tsx's inline theme-flash script
// and ThemeContext both read. Called once per theme block, not before every
// single goto: localStorage is origin-scoped and survives navigation, and
// nothing in this script ever toggles the theme through the UI, so one call
// per theme is enough. See docs/decisions.md for why a raw localStorage
// write here reliably forces what useDisplayedTheme renders: neither the
// inline script nor useDisplayedTheme falls back to matchMedia once
// localStorage already holds an explicit "light" or "dark" value.
async function forceTheme(page: Page, theme: Theme): Promise<void> {
  await page.evaluate((t) => localStorage.setItem("atlas-theme", t), theme);
}

async function runAudit(params: {
  page: Page;
  name: string;
  desktop: boolean;
  outputDir: string;
}): Promise<void> {
  const { page, name, desktop, outputDir } = params;

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
      "Usage: node --loader ts-node/esm scripts/authenticated-lighthouse.mts <output-directory> [--smoke-test] [--full-contrast-pass]",
    );
  }
  const flags = process.argv.slice(3);
  const smokeTest = flags.includes("--smoke-test");
  const fullContrastPass = flags.includes("--full-contrast-pass");
  mkdirSync(outputDir, { recursive: true });

  const email = requireEnv("LIGHTHOUSE_AUTH_EMAIL");
  const password = requireEnv("LIGHTHOUSE_AUTH_PASSWORD");

  const routes = smokeTest ? ROUTES.filter((r) => r.name === "dashboard") : ROUTES;
  const runsPerRoute = smokeTest ? 1 : RUNS_PER_ROUTE;
  // null means "no theme forcing", the script's original, pre-contrast-audit
  // behavior: run once through the routes with whatever theme the browser
  // already has, never write to localStorage at all.
  const themesToRun: (Theme | null)[] = fullContrastPass ? [...THEMES] : [null];
  const interactionStates = fullContrastPass
    ? smokeTest
      ? INTERACTION_STATES.slice(0, 1)
      : INTERACTION_STATES
    : [];

  const userDataDir = path.join(os.tmpdir(), `atlas-lighthouse-${Date.now()}`);
  const context = await chromium.launchPersistentContext(userDataDir, {
    args: [`--remote-debugging-port=${DEBUG_PORT}`],
  });

  const cspViolations: CspViolation[] = [];

  // Bound on the context, not the page, so it survives every page.goto()
  // in the route loop below, not just the first navigation.
  await context.exposeFunction("__reportCspViolation", (violation: CspViolation) => {
    cspViolations.push(violation);
  });

  await context.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (event) => {
      (window as unknown as { __reportCspViolation: (v: unknown) => void }).__reportCspViolation({
        violatedDirective: event.violatedDirective,
        blockedURI: event.blockedURI,
        sourceFile: event.sourceFile,
        lineNumber: event.lineNumber,
      });
    });
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

    // One failing audit or one unreachable interaction state should not
    // cost every other audit in the matrix. Each unit below is caught and
    // logged individually rather than left to propagate out of main().
    const failures: string[] = [];

    for (const theme of themesToRun) {
      if (theme) await forceTheme(page, theme);
      const themeSuffix = theme ? `-${theme}` : "";

      for (const route of routes) {
        if (!smokeTest) {
          for (let runIndex = 1; runIndex <= runsPerRoute; runIndex++) {
            const name = `${route.name}${themeSuffix}-${runIndex}`;
            try {
              await page.goto(`${BASE_URL}${route.path}`);
              await runAudit({ page, name, desktop: false, outputDir });
            } catch (error) {
              const message = error instanceof Error ? error.message : String(error);
              console.error(`Failed ${name}: ${message}`);
              failures.push(`${name}: ${message}`);
            }
          }
        }

        for (let runIndex = 1; runIndex <= runsPerRoute; runIndex++) {
          const name = `${route.name}${themeSuffix}-desktop-${runIndex}`;
          try {
            await page.goto(`${BASE_URL}${route.path}`);
            await runAudit({ page, name, desktop: true, outputDir });
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error(`Failed ${name}: ${message}`);
            failures.push(`${name}: ${message}`);
          }
        }
      }

      // interactionStates is only ever non-empty when fullContrastPass is
      // set, which is also the only case themesToRun holds real themes, so
      // theme is never null here in practice.
      for (const state of interactionStates) {
        const name = `${state.name}${themeSuffix}-desktop-1`;
        try {
          await state.reach(page);
          await runAudit({ page, name, desktop: true, outputDir });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error(`Failed ${name}: ${message}`);
          failures.push(`${name}: ${message}`);
        }
      }
    }

    if (failures.length > 0) {
      console.error(`\n${failures.length} audit(s) failed:\n${failures.join("\n")}`);
      process.exitCode = 1;
    }
  } finally {
    writeFileSync(
      path.join(outputDir, "csp-violations.json"),
      JSON.stringify(cspViolations, null, 2),
    );
    await context.close();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

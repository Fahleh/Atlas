import { defineConfig, devices } from "@playwright/test";

const BASE_URL = "http://localhost:3000";

/**
 * E2E config. Points the dev server Playwright spawns at the local Supabase
 * stack via webServer.env, scoped only to that child process. See
 * docs/decisions.md ("Removing .env.development.local") for why this
 * replaced a recognized Next.js env filename. Not run as part of `npm test`;
 * see docs/testing.md for the separate e2e command.
 */
export default defineConfig({
  // Keep specs named *.spec.ts, not *.test.ts: jest.config.ts's testMatch
  // (**/tests/**/*.test.ts) isn't scoped to exclude tests/e2e/, and would
  // try to load these as Jest tests otherwise.
  testDir: "./tests/e2e",
  fullyParallel: false,
  // Specs share the same seeded primary/secondary accounts and mutate real
  // project/task data; parallel workers would race on that shared state.
  workers: 1,
  retries: 0,
  reporter: "list",
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 60 * 1000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
        "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH",
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});

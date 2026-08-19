import { defineConfig, devices } from "@playwright/test";

const BASE_URL = "http://localhost:3000";

/**
 * E2E config. Points at the local Supabase stack via .env.development.local
 * (Next's own loader picks it up, takes priority over .env.local, see
 * docs/decisions.md for why NODE_ENV=test was rejected for this). Not run
 * as part of `npm test`; see docs/testing.md for the separate e2e command.
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
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});

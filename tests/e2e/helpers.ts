import type { Page } from "@playwright/test";

/**
 * Logs in through the real login form and waits for the dashboard to load.
 * Shared by every spec that needs an authenticated starting point.
 */
export async function loginAs(
  page: Page,
  account: { email: string; password: string },
): Promise<void> {
  await page.goto("/login");
  await page.locator("#email").fill(account.email);
  await page.locator("#password").fill(account.password);

  await Promise.all([
    page.waitForURL((url) => url.pathname === "/"),
    page.locator("button[type=submit]").click(),
  ]);
}

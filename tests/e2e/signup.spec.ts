import { test, expect } from "@playwright/test";

test("signing up shows the confirmation-required state and creates no session", async ({
  page,
}) => {
  await page.goto("/signup");

  await page.locator("#name").fill("E2E Signup");
  await page.locator("#email").fill("e2e-signup@atlas.test");
  await page.locator("#password").fill("e2e-signup-password-1");
  await page.locator("#confirmPassword").fill("e2e-signup-password-1");
  await page.locator("button[type=submit]").click();

  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
  await expect(page).toHaveURL(/\/signup/);

  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
});

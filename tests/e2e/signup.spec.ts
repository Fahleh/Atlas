import { test, expect } from "@playwright/test";
import { getLatestEmailLink } from "./helpers";

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

test("clicking the real confirmation email link confirms the account and signs it in", async ({
  page,
}) => {
  const email = "e2e-signup-confirm@atlas.test";

  await page.goto("/signup");
  await page.locator("#name").fill("E2E Signup Confirm");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill("e2e-signup-password-1");
  await page.locator("#confirmPassword").fill("e2e-signup-password-1");
  await page.locator("button[type=submit]").click();

  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();

  const confirmationLink = await getLatestEmailLink(
    email,
    "Confirm email address",
  );

  await page.goto(confirmationLink);

  // Confirms the token_hash link shape (docs/auth.md) the default GoTrue
  // template doesn't produce, the gap real emails caught earlier in this branch.
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
});

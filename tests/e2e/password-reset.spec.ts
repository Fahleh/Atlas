import { test, expect } from "@playwright/test";
import { RESET_ACCOUNT } from "./accounts";
import { getLatestEmailLink, loginAs } from "./helpers";

const NEW_PASSWORD = "e2e-reset-password-2";

test("requesting a reset, following the real email, and setting a new password replaces the old one", async ({
  page,
}) => {
  await page.goto("/reset-password");
  await page.locator("#email").fill(RESET_ACCOUNT.email);
  await page.locator("button[type=submit]").click();

  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();

  const recoveryLink = await getLatestEmailLink(
    RESET_ACCOUNT.email,
    "Choose a new password",
  );

  await page.goto(recoveryLink);

  // recovery-confirm's verifyOtp() redirect lands here already authenticated.
  await expect(page).toHaveURL(/\/update-password/);
  await expect(
    page.getByRole("heading", { name: "Set a new password" }),
  ).toBeVisible();

  await page.locator("#password").fill(NEW_PASSWORD);
  await page.locator("#confirmPassword").fill(NEW_PASSWORD);
  await page.locator("button[type=submit]").click();

  await expect(page.getByRole("heading", { name: "Password updated" })).toBeVisible();

  // updatePassword() leaves a live session behind; log out first so the
  // check below is a real, unauthenticated login attempt.
  await page.getByRole("link", { name: "Continue to Atlas" }).click();
  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page).toHaveURL(/\/login/);

  // The reset only actually took effect if the old password now fails and
  // the new one works, not just that the update-password form said success.
  await page.goto("/login");
  await page.locator("#email").fill(RESET_ACCOUNT.email);
  await page.locator("#password").fill(RESET_ACCOUNT.password);
  await page.locator("button[type=submit]").click();

  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);

  await loginAs(page, { email: RESET_ACCOUNT.email, password: NEW_PASSWORD });

  await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
});

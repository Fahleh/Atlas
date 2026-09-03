import { test, expect } from "@playwright/test";
import { PRIMARY_ACCOUNT } from "./accounts";

/**
 * React 19 clears every uncontrolled form field on any settled form
 * action, success or failure alike. See docs/decisions.md.
 */

const ERROR_BANNER = '[role="alert"]:not(#__next-route-announcer__)';

test("login retains the submitted email, but clears the password, on a failed sign-in", async ({
  page,
}) => {
  await page.goto("/login");
  await page.locator("#email").fill(PRIMARY_ACCOUNT.email);
  await page.locator("#password").fill("definitely-wrong-password");
  await page.locator("button[type=submit]").click();

  await expect(page.locator(ERROR_BANNER)).toHaveText("Invalid email or password.");
  await expect(page.locator("#email")).toHaveValue(PRIMARY_ACCOUNT.email);
  await expect(page.locator("#password")).toHaveValue("");
});

test("signup retains the submitted name and email, but clears both password fields, on a failed submission", async ({
  page,
}) => {
  await page.goto("/signup");
  await page.locator("#name").fill("Form Reset Check");
  await page.locator("#email").fill("form-reset-check@atlas.test");
  await page.locator("#password").fill("mismatch-password-1");
  await page.locator("#confirmPassword").fill("does-not-match-1");
  await page.locator("button[type=submit]").click();

  await expect(page.locator(ERROR_BANNER)).toHaveText("Passwords do not match.");
  await expect(page.locator("#name")).toHaveValue("Form Reset Check");
  await expect(page.locator("#email")).toHaveValue("form-reset-check@atlas.test");
  await expect(page.locator("#password")).toHaveValue("");
  await expect(page.locator("#confirmPassword")).toHaveValue("");
});

test("reset-password retains the submitted email on a failed submission", async ({
  page,
}) => {
  await page.goto("/reset-password");
  // Passes the browser's native email check but fails lib/utils.ts's
  // stricter EMAIL_REGEX, so this reaches the server action.
  await page.locator("#email").fill("invalid@localhost");
  await page.locator("button[type=submit]").click();

  await expect(page.locator(ERROR_BANNER)).toHaveText(
    "Please enter a valid email address.",
  );
  await expect(page.locator("#email")).toHaveValue("invalid@localhost");
});

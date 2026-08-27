import { test, expect } from "@playwright/test";
import { PRIMARY_ACCOUNT } from "./accounts";
import { loginAs } from "./helpers";

test("logging out clears the session and protected routes redirect to login", async ({
  page,
}) => {
  await loginAs(page, PRIMARY_ACCOUNT);

  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page).toHaveURL(/\/login/);

  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
});

import { test, expect } from "@playwright/test";
import { PRIMARY_ACCOUNT } from "./accounts";
import { loginAs } from "./helpers";

test("logging in reaches the dashboard, and the session survives a hard reload", async ({
  page,
}) => {
  await loginAs(page, PRIMARY_ACCOUNT);

  await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();

  await page.reload();

  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
});

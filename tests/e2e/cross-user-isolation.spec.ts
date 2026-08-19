import { test, expect } from "@playwright/test";
import { PRIMARY_ACCOUNT, SECONDARY_ACCOUNT } from "./accounts";
import { loginAs } from "./helpers";

test("logging out and into a different account never shows the previous user's data", async ({
  page,
}) => {
  await loginAs(page, PRIMARY_ACCOUNT);
  await page.goto("/projects");

  const projectName = `E2E Isolation Project ${Date.now()}`;
  await page.getByRole("button", { name: "New project" }).click();
  await page.getByLabel("Name").fill(projectName);
  await page
    .getByRole("dialog", { name: "New project" })
    .getByRole("button", { name: "Create project" })
    .click();
  await expect(page.getByRole("dialog", { name: "New project" })).not.toBeVisible();
  await expect(page.getByText(projectName)).toBeVisible();

  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page).toHaveURL(/\/login/);

  await loginAs(page, SECONDARY_ACCOUNT);
  await page.goto("/projects");

  // Confirms the page actually finished loading real, correct (empty) data
  // for this account, not just that the primary user's project hasn't
  // rendered yet.
  await expect(page.getByText("No projects yet.")).toBeVisible();
  await expect(page.getByText(projectName)).not.toBeVisible();
});

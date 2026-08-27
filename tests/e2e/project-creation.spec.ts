import { test, expect } from "@playwright/test";
import { PRIMARY_ACCOUNT } from "./accounts";
import { loginAs } from "./helpers";

test("creating a project shows it in the list without a manual refresh", async ({
  page,
}) => {
  await loginAs(page, PRIMARY_ACCOUNT);
  await page.goto("/projects");

  const projectName = `E2E Project ${Date.now()}`;

  await page.getByRole("button", { name: "New project" }).click();
  await page.getByLabel("Name").fill(projectName);
  await page.getByRole("dialog", { name: "New project" }).getByRole("button", { name: "Create project" }).click();

  await expect(page.getByRole("dialog", { name: "New project" })).not.toBeVisible();
  await expect(page.getByText(projectName)).toBeVisible();
});

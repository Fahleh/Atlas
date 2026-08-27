import { test, expect } from "@playwright/test";
import { PRIMARY_ACCOUNT } from "./accounts";
import { loginAs } from "./helpers";

test("creating a task updates the project card's task count without a manual refresh", async ({
  page,
}) => {
  await loginAs(page, PRIMARY_ACCOUNT);
  await page.goto("/projects");

  const projectName = `E2E Task Count Project ${Date.now()}`;

  await page.getByRole("button", { name: "New project" }).click();
  await page.getByLabel("Name").fill(projectName);
  await page
    .getByRole("dialog", { name: "New project" })
    .getByRole("button", { name: "Create project" })
    .click();
  await expect(page.getByRole("dialog", { name: "New project" })).not.toBeVisible();

  // The project name and its task count sit in separate sibling sections
  // inside the card, so the card itself is the smallest div containing
  // both texts, not the innermost div containing just the name.
  const card = page
    .locator("div")
    .filter({ hasText: projectName })
    .filter({ hasText: "tasks" })
    .last();
  await expect(card.getByText("0/0 tasks")).toBeVisible();

  await page.getByText(projectName).click();
  const slideOver = page.getByRole("dialog", { name: `${projectName} details` });
  await expect(slideOver).toBeVisible();

  await page.getByRole("button", { name: "Add task" }).click();
  await page.locator("#task-title").fill("E2E task");
  await page
    .getByRole("dialog", { name: "New task" })
    .getByRole("button", { name: "Create task" })
    .click();
  await expect(page.getByRole("dialog", { name: "New task" })).not.toBeVisible();
  await expect(
    page.getByRole("list", { name: "Project tasks" }).getByText("E2E task"),
  ).toBeVisible();

  await slideOver.getByRole("button", { name: "Close project details" }).click();

  await expect(card.getByText("0/1 tasks")).toBeVisible();
});

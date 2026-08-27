import { test, expect } from "@playwright/test";
import { PRIMARY_ACCOUNT, SECONDARY_ACCOUNT } from "./accounts";
import { loginAs } from "./helpers";

test("full project CRUD and membership round trip", async ({ page }) => {
  await loginAs(page, PRIMARY_ACCOUNT);
  await page.goto("/projects");

  const projectName = `E2E CRUD Project ${Date.now()}`;
  const updatedName = `${projectName} (edited)`;

  // Create
  await page.getByRole("button", { name: "New project" }).click();
  await page.getByLabel("Name").fill(projectName);
  await page
    .getByRole("dialog", { name: "New project" })
    .getByRole("button", { name: "Create project" })
    .click();
  await expect(page.getByRole("dialog", { name: "New project" })).not.toBeVisible();
  await expect(page.getByText(projectName)).toBeVisible();

  // Open slide-over, edit
  await page.getByText(projectName).click();
  const slideOver = page.getByRole("dialog", { name: `${projectName} details` });
  await expect(slideOver).toBeVisible();

  await slideOver.getByRole("button", { name: "Edit project" }).click();
  const editDialog = page.getByRole("dialog", { name: "Edit project" });
  await editDialog.getByLabel("Name").fill(updatedName);
  await editDialog.getByRole("button", { name: "Save changes" }).click();
  await expect(editDialog).not.toBeVisible();

  const updatedSlideOver = page.getByRole("dialog", { name: `${updatedName} details` });
  await expect(updatedSlideOver).toBeVisible();

  // Add member
  await updatedSlideOver
    .getByPlaceholder("Add member by email")
    .fill(SECONDARY_ACCOUNT.email);
  await updatedSlideOver.getByRole("button", { name: "Add", exact: true }).click();
  await expect(updatedSlideOver.getByText("Collaborator")).toBeVisible();

  // Remove member (two-step confirm)
  await updatedSlideOver.getByLabel(/^Remove /).click();
  await updatedSlideOver.getByLabel(/^Confirm remove /).click();
  await expect(updatedSlideOver.getByText("Collaborator")).not.toBeVisible();

  // Delete project
  await updatedSlideOver.getByRole("button", { name: "Delete project" }).click();
  const deleteDialog = page.getByRole("dialog", { name: "Delete project" });
  await deleteDialog.getByRole("button", { name: "Delete project" }).click();
  await expect(deleteDialog).not.toBeVisible();

  await expect(page.getByText(updatedName)).not.toBeVisible();
});

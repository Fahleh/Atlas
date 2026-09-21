import { test, expect } from "@playwright/test";
import { PRIMARY_ACCOUNT, SECONDARY_ACCOUNT } from "./accounts";
import { loginAs } from "./helpers";

// Read from global-setup.ts's real `supabase status -o env` output,
// not hardcoded, since these change per machine and stack restart.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be set by global-setup.ts before this spec runs.",
  );
}

test("a user with no membership on a project cannot read, update, or delete a task row they don't own, and the row is left untouched", async ({
  page,
  request,
}) => {
  // Set up as primary: create a project and a task. Secondary is never
  // added as a member of this project.
  await loginAs(page, PRIMARY_ACCOUNT);
  await page.goto("/projects");

  const projectName = `E2E Row Isolation Project ${Date.now()}`;
  await page.getByRole("button", { name: "New project" }).click();
  await page.getByLabel("Name").fill(projectName);
  await page
    .getByRole("dialog", { name: "New project" })
    .getByRole("button", { name: "Create project" })
    .click();
  await expect(page.getByText(projectName)).toBeVisible();

  await page.getByText(projectName).click();
  const slideOver = page.getByRole("dialog", { name: `${projectName} details` });
  await expect(slideOver).toBeVisible();

  const taskTitle = `E2E Row Isolation Task ${Date.now()}`;
  await page.getByRole("button", { name: "Add task" }).click();
  await page.locator("#task-title").fill(taskTitle);
  await page
    .getByRole("dialog", { name: "New task" })
    .getByRole("button", { name: "Create task" })
    .click();
  await expect(page.getByRole("dialog", { name: "New task" })).not.toBeVisible();

  const projectId = new URL(page.url()).searchParams.get("project");

  // Authenticates as primary directly against GoTrue, independent of the
  // browser session, so the row's real starting state comes from PostgREST
  // itself, not from anything rendered in the UI.
  const primaryTokenResponse = await request.post(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
      data: { email: PRIMARY_ACCOUNT.email, password: PRIMARY_ACCOUNT.password },
    },
  );
  const { access_token: primaryToken } = await primaryTokenResponse.json();

  const originalRowResponse = await request.get(
    `${SUPABASE_URL}/rest/v1/tasks?project_id=eq.${projectId}&title=eq.${encodeURIComponent(taskTitle)}&select=*`,
    {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${primaryToken}` },
    },
  );
  const [originalRow] = await originalRowResponse.json();
  expect(originalRow).toBeTruthy();
  const taskId = originalRow.id;

  // Authenticates as secondary directly against GoTrue, independent of the
  // browser session, for a real token without app cookies.
  const secondaryTokenResponse = await request.post(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
      data: { email: SECONDARY_ACCOUNT.email, password: SECONDARY_ACCOUNT.password },
    },
  );
  const { access_token: secondaryToken } = await secondaryTokenResponse.json();

  // Bypasses the UI (there's no UI path to another user's task anyway) to
  // prove the database itself refuses this at the row level, in all three
  // read/write directions, not just that the app never offers the button.

  const selectAsSecondary = await request.get(
    `${SUPABASE_URL}/rest/v1/tasks?id=eq.${taskId}&select=*`,
    {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${secondaryToken}` },
    },
  );
  expect(await selectAsSecondary.json()).toHaveLength(0);

  // Prefer: return=representation makes PostgREST echo back the rows the
  // statement actually touched, an empty array here means RLS filtered the
  // update down to zero rows before it could apply, not that the value
  // happened to match.
  const updateAsSecondary = await request.patch(
    `${SUPABASE_URL}/rest/v1/tasks?id=eq.${taskId}`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${secondaryToken}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      data: { title: "Tampered by secondary" },
    },
  );
  expect(await updateAsSecondary.json()).toHaveLength(0);

  const deleteAsSecondary = await request.delete(
    `${SUPABASE_URL}/rest/v1/tasks?id=eq.${taskId}`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${secondaryToken}`,
        Prefer: "return=representation",
      },
    },
  );
  expect(await deleteAsSecondary.json()).toHaveLength(0);

  // Re-reads as primary to confirm the row wasn't silently modified despite
  // the zero-affected-row responses above.
  const finalRowResponse = await request.get(
    `${SUPABASE_URL}/rest/v1/tasks?id=eq.${taskId}&select=*`,
    {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${primaryToken}` },
    },
  );
  const [finalRow] = await finalRowResponse.json();
  expect(finalRow).toEqual(originalRow);
});

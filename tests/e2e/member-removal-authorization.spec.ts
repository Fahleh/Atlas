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

test("a collaborator cannot remove a member, even by calling the API directly", async ({
  page,
  request,
}) => {
  // Set up as primary: create a project, add secondary as a collaborator.
  await loginAs(page, PRIMARY_ACCOUNT);
  await page.goto("/projects");

  const projectName = `E2E Authorization Project ${Date.now()}`;
  await page.getByRole("button", { name: "New project" }).click();
  await page.getByLabel("Name").fill(projectName);
  await page
    .getByRole("dialog", { name: "New project" })
    .getByRole("button", { name: "Create project" })
    .click();
  await expect(page.getByText(projectName)).toBeVisible();

  await page.getByText(projectName).click();
  const slideOver = page.getByRole("dialog", { name: `${projectName} details` });
  await slideOver.getByPlaceholder("Add member by email").fill(SECONDARY_ACCOUNT.email);
  await slideOver.getByRole("button", { name: "Add", exact: true }).click();
  await expect(slideOver.getByText("Collaborator")).toBeVisible();

  const projectId = new URL(page.url()).searchParams.get("project");

  // Authenticates as secondary directly against GoTrue, independent
  // of the browser session, for a real token without app cookies.
  const tokenResponse = await request.post(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
      data: { email: SECONDARY_ACCOUNT.email, password: SECONDARY_ACCOUNT.password },
    },
  );
  const { access_token, user } = await tokenResponse.json();

  // Bypasses the UI (already covered by ProjectSlideOver.test.tsx) to
  // prove the database itself refuses this, not just a hidden button.

  // Own row is enough: the USING clause checks who's calling, not
  // which row they targeted.
  await request.delete(
    `${SUPABASE_URL}/rest/v1/project_members?project_id=eq.${projectId}&user_id=eq.${user.id}`,
    {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${access_token}` },
    },
  );

  // RLS filters this delete to zero visible rows rather than
  // throwing, only reading the row back confirms it survived.
  const verifyResponse = await request.get(
    `${SUPABASE_URL}/rest/v1/project_members?project_id=eq.${projectId}&user_id=eq.${user.id}&select=user_id`,
    {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${access_token}` },
    },
  );
  const remainingRows = await verifyResponse.json();
  expect(remainingRows).toHaveLength(1);
});

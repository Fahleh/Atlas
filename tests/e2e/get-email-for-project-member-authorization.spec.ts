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

test("get_email_for_project_member returns null for a real user who isn't a member of the target project, and the real email for one who is", async ({
  page,
  request,
}) => {
  // Primary creates a project. Secondary is never added to it, a real,
  // existing account with no membership here, the exact shape the prior
  // version of this RPC got wrong (it only checked the caller's own
  // membership, not the target's).
  await loginAs(page, PRIMARY_ACCOUNT);
  await page.goto("/projects");

  const projectName = `E2E RPC Authorization Project ${Date.now()}`;
  await page.getByRole("button", { name: "New project" }).click();
  await page.getByLabel("Name").fill(projectName);
  await page
    .getByRole("dialog", { name: "New project" })
    .getByRole("button", { name: "Create project" })
    .click();
  await expect(page.getByText(projectName)).toBeVisible();

  // Opening the project is what puts ?project=<id> in the URL, the list
  // view itself doesn't carry it.
  await page.getByText(projectName).click();
  await expect(
    page.getByRole("dialog", { name: `${projectName} details` }),
  ).toBeVisible();
  const projectId = new URL(page.url()).searchParams.get("project");
  expect(projectId).toBeTruthy();

  // Both tokens fetched directly against GoTrue, independent of the
  // browser session, for real access tokens and real user ids.
  const primaryTokenResponse = await request.post(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
      data: { email: PRIMARY_ACCOUNT.email, password: PRIMARY_ACCOUNT.password },
    },
  );
  const { access_token: primaryToken, user: primaryUser } =
    await primaryTokenResponse.json();

  const secondaryTokenResponse = await request.post(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
      data: { email: SECONDARY_ACCOUNT.email, password: SECONDARY_ACCOUNT.password },
    },
  );
  const { user: secondaryUser } = await secondaryTokenResponse.json();

  // Calling the RPC directly, bypassing the app entirely, proves the
  // database itself enforces this, not just the route handler's own
  // checks in front of it.
  const notMemberResponse = await request.post(
    `${SUPABASE_URL}/rest/v1/rpc/get_email_for_project_member`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${primaryToken}`,
        "Content-Type": "application/json",
      },
      data: { _user_id: secondaryUser.id, _project_id: projectId },
    },
  );
  expect(await notMemberResponse.json()).toBeNull();

  const isMemberResponse = await request.post(
    `${SUPABASE_URL}/rest/v1/rpc/get_email_for_project_member`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${primaryToken}`,
        "Content-Type": "application/json",
      },
      data: { _user_id: primaryUser.id, _project_id: projectId },
    },
  );
  expect(await isMemberResponse.json()).toBe(PRIMARY_ACCOUNT.email);
});

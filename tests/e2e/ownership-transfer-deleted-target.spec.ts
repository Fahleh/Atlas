import { test, expect, type APIRequestContext } from "@playwright/test";
import { PRIMARY_ACCOUNT, DELETED_ACCOUNT_REFRESH } from "./accounts";
import { loginAs } from "./helpers";

// Read from global-setup.ts's real `supabase status -o env` output,
// not hardcoded, same convention as member-removal-authorization.spec.ts.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be set by global-setup.ts before this spec runs.",
  );
}

// Reuses DELETED_ACCOUNT_REFRESH instead of seeding a seventh account.
// Signs in as it and PATCHes its own profiles.deleted_at, the same
// RLS-gated update account-deletion-login-block.spec.ts's own
// softDeleteAccount helper performs, so this exercises the real
// deletion write path rather than a shortcut around it. service_role
// has no grant on profiles in this schema (checked directly with
// psql \dp), so there is no bypass route here even if one were wanted.
//
// If that spec already ran earlier in this suite (it sorts first
// alphabetically, and this project runs Playwright with workers: 1,
// fullyParallel: false, so file order is deterministic), the account
// is already soft-deleted and the sign-in below is rejected outright
// by reject_deleted_user_token. That is treated as success too, since
// the end state this test needs, a soft-deleted target, is already
// true. Either way this test does not assume which run it is.
async function ensureSoftDeleted(
  request: APIRequestContext,
  account: { email: string; password: string },
): Promise<void> {
  const tokenResponse = await request.post(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      headers: { apikey: SUPABASE_ANON_KEY!, "Content-Type": "application/json" },
      data: { email: account.email, password: account.password },
    },
  );
  if (!tokenResponse.ok()) return;

  const { access_token, user } = await tokenResponse.json();
  const updateResponse = await request.patch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
      },
      data: { deleted_at: new Date().toISOString() },
    },
  );
  expect(updateResponse.ok()).toBe(true);
}

test("a transfer to a soft-deleted collaborator is rejected, and ownership does not change", async ({
  page,
  request,
}) => {
  await ensureSoftDeleted(request, DELETED_ACCOUNT_REFRESH);

  await loginAs(page, PRIMARY_ACCOUNT);
  await page.goto("/projects");

  const projectName = `E2E Ownership Transfer Project ${Date.now()}`;
  await page.getByRole("button", { name: "New project" }).click();
  await page.getByLabel("Name").fill(projectName);
  await page
    .getByRole("dialog", { name: "New project" })
    .getByRole("button", { name: "Create project" })
    .click();
  await expect(page.getByText(projectName)).toBeVisible();

  await page.getByText(projectName).click();
  const slideOver = page.getByRole("dialog", { name: `${projectName} details` });
  await slideOver
    .getByPlaceholder("Add member by email")
    .fill(DELETED_ACCOUNT_REFRESH.email);
  await slideOver.getByRole("button", { name: "Add", exact: true }).click();
  await expect(slideOver.getByText("Collaborator")).toBeVisible();

  const projectId = new URL(page.url()).searchParams.get("project");

  const primaryTokenResponse = await request.post(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
      data: { email: PRIMARY_ACCOUNT.email, password: PRIMARY_ACCOUNT.password },
    },
  );
  const { access_token: primaryAccessToken, user: primaryUser } =
    await primaryTokenResponse.json();

  // Reads the collaborator's user id back off the row the UI step above
  // just created, rather than signing in as that account, which may
  // already be blocked by reject_deleted_user_token at this point.
  const membersResponse = await request.get(
    `${SUPABASE_URL}/rest/v1/project_members?project_id=eq.${projectId}&role=eq.collaborator&select=user_id`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${primaryAccessToken}`,
      },
    },
  );
  const [{ user_id: targetUserId }] = await membersResponse.json();

  // profiles: authenticated users can read has no deleted_at condition
  // on either side, so primary can confirm the precondition directly
  // instead of assuming it held.
  const profileResponse = await request.get(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${targetUserId}&select=deleted_at`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${primaryAccessToken}`,
      },
    },
  );
  const [{ deleted_at: deletedAt }] = await profileResponse.json();
  expect(deletedAt).not.toBeNull();

  const transferResponse = await request.post(
    `${SUPABASE_URL}/rest/v1/rpc/transfer_project_ownership`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${primaryAccessToken}`,
        "Content-Type": "application/json",
      },
      data: { _project_id: projectId, _new_owner_id: targetUserId },
    },
  );
  expect(transferResponse.ok()).toBe(false);
  const transferBody = await transferResponse.json();
  expect(transferBody.message).toBe(
    "Target must be an active, existing collaborator on this project.",
  );

  const projectResponse = await request.get(
    `${SUPABASE_URL}/rest/v1/projects?id=eq.${projectId}&select=owner_id`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${primaryAccessToken}`,
      },
    },
  );
  const [{ owner_id: ownerId }] = await projectResponse.json();
  expect(ownerId).toBe(primaryUser.id);
});

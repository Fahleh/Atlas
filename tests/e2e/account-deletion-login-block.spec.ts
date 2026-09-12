import { test, expect, type APIRequestContext } from "@playwright/test";
import { DELETED_ACCOUNT, DELETED_ACCOUNT_REFRESH } from "./accounts";

// Read from global-setup.ts's real `supabase status -o env` output,
// not hardcoded, same convention as member-removal-authorization.spec.ts.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be set by global-setup.ts before this spec runs.",
  );
}

/**
 * Signs in as the given account and PATCHes profiles.deleted_at through
 * the same RLS-gated update deleteAccount() performs for real, not a
 * shortcut around it.
 */
async function softDeleteAccount(
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

test("signing in with a soft-deleted account shows the account_deleted message, not a generic one", async ({
  page,
  request,
}) => {
  await softDeleteAccount(request, DELETED_ACCOUNT);

  await page.goto("/login");
  await page.locator("#email").fill(DELETED_ACCOUNT.email);
  await page.locator("#password").fill(DELETED_ACCOUNT.password);
  await page.locator("button[type=submit]").click();

  await page.waitForURL(
    (url) => url.pathname === "/login" && url.searchParams.get("error") === "account_deleted",
  );
  await expect(
    page.getByText("This account has been deleted. You have been signed out."),
  ).toBeVisible();
});

test("refreshing a token issued before deletion is denied the same way after the account is deleted", async ({
  request,
}) => {
  const tokenResponse = await request.post(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      headers: { apikey: SUPABASE_ANON_KEY!, "Content-Type": "application/json" },
      data: {
        email: DELETED_ACCOUNT_REFRESH.email,
        password: DELETED_ACCOUNT_REFRESH.password,
      },
    },
  );
  const { refresh_token } = await tokenResponse.json();

  await softDeleteAccount(request, DELETED_ACCOUNT_REFRESH);

  const refreshResponse = await request.post(
    `${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,
    {
      headers: { apikey: SUPABASE_ANON_KEY!, "Content-Type": "application/json" },
      data: { refresh_token },
    },
  );

  expect(refreshResponse.status()).toBe(403);
  const body = await refreshResponse.json();
  expect(body.msg).toBe("account_deleted");
});

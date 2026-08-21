import { SUPABASE_URL } from "./handlers/baseUrl";

/**
 * Builds the { name, value } pair @supabase/ssr's server client reads a
 * session from, for seeding via nextHeadersMock's __setCookie().
 */
const PROJECT_REF = new URL(SUPABASE_URL).hostname.split(".")[0];
export const SESSION_COOKIE_NAME = `sb-${PROJECT_REF}-auth-token`;

function toBase64Url(value: string): string {
  return Buffer.from(value, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function buildSessionCookieValue(
  overrides: { accessToken?: string } = {},
): string {
  const session = {
    access_token: overrides.accessToken ?? "fake-access-token",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: "fake-refresh-token",
    user: {
      id: "00000000-0000-4000-8000-000000000000",
      aud: "authenticated",
      app_metadata: {},
      user_metadata: {},
    },
  };
  return `base64-${toBase64Url(JSON.stringify(session))}`;
}

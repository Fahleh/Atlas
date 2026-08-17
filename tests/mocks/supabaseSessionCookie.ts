import { SUPABASE_URL } from "./handlers/baseUrl";

/**
 * Builds the { name, value } pair @supabase/ssr's server client reads a
 * session from, for seeding via nextHeadersMock's __setCookie() in Server
 * Action tests that need an existing session (e.g. logout's signOut call).
 *
 * Cookie name: confirmed by reading @supabase/supabase-js's SupabaseClient
 * constructor directly — the default storageKey is
 * `sb-${new URL(supabaseUrl).hostname.split(".")[0]}-auth-token`, since
 * lib/supabase/server.ts never overrides cookieOptions.name.
 *
 * Cookie value: @supabase/ssr defaults cookieEncoding to "base64url" and
 * prefixes the encoded payload with "base64-" (confirmed in cookies.js's
 * decodeChunkedCookieValue, which strips exactly that prefix before
 * JSON.parse). No real JWT signature needed here — signOut() only reads
 * access_token as an opaque string to send in the Authorization header,
 * it never verifies it locally (unlike getClaims(), which does).
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

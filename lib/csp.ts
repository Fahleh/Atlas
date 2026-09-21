export const PROD_SUPABASE_ORIGIN = "https://hgyygkysbljijxmltbgt.supabase.co";

/**
 * Builds the Content-Security-Policy header value. Takes the skeleton
 * hash list as a parameter rather than importing it directly, so a test
 * can call this with a fixture list instead of mocking a module with
 * real filesystem side effects. Still reads process.env internally for
 * NODE_ENV and NEXT_PUBLIC_SUPABASE_URL, same pattern as lib/baseUrl.ts's
 * getBaseUrl(), so its output depends on ambient env state at call time,
 * not a pure function in the strict sense.
 *
 * @param skeletonHashes - the generated style-src-attr hash list
 * @returns the full CSP header value for the current environment
 */
export function buildCsp(skeletonHashes: string[]): string {
  const isDev = process.env.NODE_ENV === "development";

  // Dev-only derivation, not always-from-env: see docs/decisions.md
  // ("Deriving SUPABASE_ORIGIN from env in dev only").
  const supabaseOrigin =
    isDev && process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
      : PROD_SUPABASE_ORIGIN;

  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self'${isDev ? " 'unsafe-inline'" : ""}`,
    `style-src-attr 'unsafe-hashes' ${skeletonHashes.join(" ")}`,
    "img-src 'self'",
    "font-src 'self'",
    `connect-src 'self' ${supabaseOrigin}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
    ...(isDev
      ? []
      : ["require-trusted-types-for 'script'", "trusted-types default"]),
  ].join("; ");
}

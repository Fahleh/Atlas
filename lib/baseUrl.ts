/**
 * Resolves Atlas's own base origin, used to validate that a user-provided
 * redirect destination stays same-origin. See docs/auth.md's Open-Redirect
 * Protection section for why this is gated on VERCEL rather than NODE_ENV,
 * and a real caveat about Vercel's System Environment Variables setting.
 *
 * @returns the base origin to validate redirects against
 * @throws when running on Vercel with NEXT_PUBLIC_BASE_URL unset
 */
export function getBaseUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

  if (process.env.VERCEL) {
    if (!baseUrl) {
      throw new Error("NEXT_PUBLIC_BASE_URL must be set when running on Vercel.");
    }
    return baseUrl;
  }

  return baseUrl ?? "http://localhost:3000";
}

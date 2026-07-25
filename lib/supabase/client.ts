import { Database } from "@/types/database.types";
import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for use in client components.
 * Uses cookie-based authentication via @supabase/ssr
 */

// PostgREST responses carry Cache-Control: public, max-age=600 with no
// Authorization in Vary, so the browser's HTTP disk cache treats identical
// request URLs as interchangeable regardless of which user's bearer token
// requested them — after logging out User A and logging in as User B, a
// request for the same URL can be served straight from disk cache with
// User A's data, never reaching the network with User B's credentials.
// Confirmed via manual two-user testing (Network tab showed 200 OK from
// disk cache). Bypassing the HTTP cache entirely closes this.
const fetchWithoutCache = (url: RequestInfo | URL, init?: RequestInit) =>
  fetch(url, { ...init, cache: "no-store" });

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { global: { fetch: fetchWithoutCache } },
  );
}

import { Database } from "@/types/database.types";
import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for use in client components.
 * Uses cookie-based authentication via @supabase/ssr
 */

// Prevents cross-user cache leaks via the browser's HTTP disk cache — see
// docs/decisions.md ("Bypassing fetch caching in both Supabase clients").
const fetchWithoutCache = (url: RequestInfo | URL, init?: RequestInit) =>
  fetch(url, { ...init, cache: "no-store" });

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { global: { fetch: fetchWithoutCache } },
  );
}

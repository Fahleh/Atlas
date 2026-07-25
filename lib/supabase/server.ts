/**
 * Supabase client for use in Server Components, Server Actions, and Route Handlers.
 * Reads and writes cookies via next/headers.
 */

import { Database } from "@/types/database.types";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// The browser disk-cache mechanism this same override fixes in client.ts
// doesn't apply server-side, but Next.js patches the global `fetch` to add
// its own Data Cache layer by default in Server Components — a structurally
// similar risk, where a cached response from one request context could leak
// into another. Not independently confirmed as an active bug here, but this
// is the second cross-user caching leak found in one session; "not yet
// observed" isn't sufficient grounds to leave the server client unfixed
// while the browser client is. Same override, for consistency and
// defense-in-depth.
const fetchWithoutCache = (url: RequestInfo | URL, init?: RequestInit) =>
  fetch(url, { ...init, cache: "no-store" });

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            // Update the incoming request cookies
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // setAll called from a Server Component.
            // Cookies can only be set from Server Actions or Route Handlers
          }
        },
      },
      global: { fetch: fetchWithoutCache },
    },
  );
}

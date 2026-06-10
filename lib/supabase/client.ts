import { Database } from "@/types/database.types";
import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for use in client components.
 * Uses cookie-based authentication via @supabase/ssr
 */

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}

/**
 * Shared base URL every handler file builds its request matchers against.
 * Read from the same env var lib/supabase/client.ts and server.ts use, so
 * handlers can never silently drift from the URL the real client calls.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

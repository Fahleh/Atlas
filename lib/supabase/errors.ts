import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

// ---- Types ------------------------------------------------------------------

export type SupabaseWriteErrorKind = "sessionExpired" | "forbidden";

export type SupabaseWriteErrorResult = {
  error: string;
  errorKind: SupabaseWriteErrorKind | null;
};

const SESSION_EXPIRED_MESSAGE =
  "Your session has expired — log in again to continue.";
const FORBIDDEN_MESSAGE = "You don't have permission to do that.";

// ---- Interpretation -----------------------------------------------------------

/**
 * Distinguishes a dead session from a legitimate RLS denial for a failed
 * Postgrest write. `PGRST301` (expired JWT) is unambiguous. `42501`
 * (insufficient privilege) is not — a live, correctly-authenticated user can
 * also be denied by RLS for a real reason (e.g. a collaborator calling an
 * owner-only action) — so it's resolved with a follow-up `getClaims()` check.
 *
 * @param error - The PostgrestError returned by a failed write
 * @param supabase - The client that produced the error, used to check session liveness
 * @returns A user-facing message plus a discriminant for session-expired vs. forbidden vs. an ordinary error
 */
export async function interpretSupabaseWriteError(
  error: PostgrestError,
  supabase: SupabaseClient,
): Promise<SupabaseWriteErrorResult> {
  if (error.code === "PGRST301") {
    return { error: SESSION_EXPIRED_MESSAGE, errorKind: "sessionExpired" };
  }

  if (error.code === "42501") {
    const { data } = await supabase.auth.getClaims();
    if (!data?.claims) {
      return { error: SESSION_EXPIRED_MESSAGE, errorKind: "sessionExpired" };
    }
    return { error: FORBIDDEN_MESSAGE, errorKind: "forbidden" };
  }

  return { error: error.message, errorKind: null };
}

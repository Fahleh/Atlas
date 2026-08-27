import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

// ---- Types ------------------------------------------------------------------

export type SupabaseWriteErrorKind = "sessionExpired" | "forbidden";

export type SupabaseWriteErrorResult = {
  error: string;
  errorKind: SupabaseWriteErrorKind | null;
};

const SESSION_EXPIRED_MESSAGE =
  "Your session has expired. Log in again to continue.";
const FORBIDDEN_MESSAGE = "You don't have permission to perform that action.";

// ---- Interpretation -----------------------------------------------------------

/**
 * Distinguishes a dead session from a legitimate RLS denial for a failed
 * Postgrest write. See docs/decisions.md ("Distinguishing sessionExpired
 * from forbidden on failed Postgrest writes").
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

// ---- Read-side interpretation --------------------------------------------------

export type SupabaseReadErrorKind = "sessionExpired";

export type SupabaseReadErrorResult = {
  error: string;
  errorKind: SupabaseReadErrorKind | null;
};

const CONNECTION_ERROR_MESSAGE =
  "Couldn't connect. Check your connection and try again.";

/**
 * Interprets a failed Supabase read. Unlike writes, `42501` has no legitimate
 * "forbidden" case here: this schema's RLS is default-deny and denies reads
 * by filtering rows out, not by throwing, so a `42501` on a `SELECT` means a
 * missing `GRANT`, not a live user correctly denied. Only `PGRST301` (expired
 * JWT) is distinguished; everything else, including a read with no Postgrest
 * response at all (network/timeout failures carry no `.code`), collapses into
 * one generic message. There's no case here where surfacing the raw
 * Postgrest/JS error message is safe or actionable for a user.
 *
 * @param error - The error thrown by a failed read (PostgrestError or a raw network/JS Error)
 * @returns A user-facing message plus a discriminant for session-expired vs. an ordinary failure
 */
export function interpretSupabaseReadError(
  error: unknown,
): SupabaseReadErrorResult {
  const code = (error as { code?: string } | null)?.code;
  if (code === "PGRST301") {
    return { error: SESSION_EXPIRED_MESSAGE, errorKind: "sessionExpired" };
  }
  return { error: CONNECTION_ERROR_MESSAGE, errorKind: null };
}

/**
 * Thrown by read hooks' `queryFn` in place of the raw Postgrest/network
 * error, so `errorKind` survives on React Query's `error` object at every
 * consuming component without re-running interpretation at each call site.
 * Interpretation happens once, at the hook layer, matching `toCamelCase`/
 * `parseDates`'s existing transform-at-the-hook-layer convention.
 */
export class SupabaseReadError extends Error {
  errorKind: SupabaseReadErrorKind | null;

  constructor(result: SupabaseReadErrorResult) {
    super(result.error);
    this.name = "SupabaseReadError";
    this.errorKind = result.errorKind;
  }
}

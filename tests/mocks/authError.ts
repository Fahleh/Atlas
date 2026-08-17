import { HttpResponse } from "msw";

/**
 * Builds a GoTrue-shaped auth error response. Confirmed by reading
 * @supabase/auth-js's handleError() directly: the client only reads
 * data.code as the error code when the response carries a recognized
 * X-Supabase-Api-Version header (date >= 2024-01-01); without it, the
 * client falls back to the older data.error_code field instead. Setting
 * both the header and both fields means `error.code` reliably ends up
 * what the test expects, matching either code path.
 *
 * @param code - GoTrue error code, e.g. "email_not_confirmed", "user_already_exists"
 * @param message - Human-readable message; only msg is actually read by
 *   this codebase (login/signup never surface it), included for realism
 */
export function authError(
  { code, message = "" }: { code: string; message?: string },
  status = 400,
) {
  return HttpResponse.json(
    { code, error_code: code, msg: message },
    { status, headers: { "X-Supabase-Api-Version": "2024-01-01" } },
  );
}

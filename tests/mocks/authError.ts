import { HttpResponse } from "msw";

/**
 * Builds a GoTrue-shaped auth error response.
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

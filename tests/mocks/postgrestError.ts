import { HttpResponse } from "msw";

/**
 * Builds a PostgREST-shaped error response body, matching PostgrestError's
 * real constructor shape ({ message, details, hint, code }). Tests override
 * a default success handler with this via server.use() for a specific error
 * path, e.g. server.use(http.delete(url, () => postgrestError({ code: "PGRST301" }))).
 *
 * @param params - code is required; message/details/hint default to empty/generic
 * @param status - HTTP status PostgREST would send for this code (not
 *   load-bearing: supabase-js reads the JSON body's .code, not the status)
 */
export function postgrestError(
  {
    code,
    message = "",
    details = "",
    hint = "",
  }: { code: string; message?: string; details?: string; hint?: string },
  status = 400,
) {
  return HttpResponse.json({ message, details, hint, code }, { status });
}

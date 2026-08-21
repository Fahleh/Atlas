import { http, HttpResponse } from "msw";
import { SUPABASE_URL } from "./baseUrl";

/**
 * Default happy-path handler for avatar uploads, matches any path under
 * the avatars bucket since the real path is per-user/extension. See
 * docs/decisions.md ("Test mocks verified against real dependency source,
 * not assumed") for the POST/x-upsert confirmation and the response-shape
 * caveat.
 */
export const storageHandlers = [
  http.post(`${SUPABASE_URL}/storage/v1/object/avatars/*`, () => {
    return HttpResponse.json({ path: "avatars/mock-path" }, { status: 200 });
  }),
];

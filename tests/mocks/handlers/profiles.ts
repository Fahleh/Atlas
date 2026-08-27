import { http, HttpResponse } from "msw";
import { SUPABASE_URL } from "./baseUrl";

/**
 * Default happy-path row for the `profiles` table GET handler, shaped like a
 * real PostgREST row for useCurrentUserProfile's own toCamelCase transform.
 */
export const FAKE_PROFILE_ROW = {
  id: "00000000-0000-4000-8000-000000000000",
  name: "Fake User",
  avatar_url: null,
};

/**
 * Default happy-path handlers for the `profiles` table. PATCH is
 * updateProfile's name/avatar_url update. GET (`.single()`) is
 * useCurrentUserProfile's real read path.
 */
export const profilesHandlers = [
  http.get(`${SUPABASE_URL}/rest/v1/profiles`, () => {
    return HttpResponse.json(FAKE_PROFILE_ROW);
  }),
  http.patch(`${SUPABASE_URL}/rest/v1/profiles`, () => {
    return new HttpResponse(null, { status: 204 });
  }),
];

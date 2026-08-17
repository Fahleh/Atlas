import { http, HttpResponse } from "msw";
import { SUPABASE_URL } from "./baseUrl";

/**
 * Default happy-path handler for the `profiles` table
 * (updateProfile's name/avatar_url update).
 */
export const profilesHandlers = [
  http.patch(`${SUPABASE_URL}/rest/v1/profiles`, () => {
    return new HttpResponse(null, { status: 204 });
  }),
];

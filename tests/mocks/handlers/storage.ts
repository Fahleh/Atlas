import { http, HttpResponse } from "msw";
import { SUPABASE_URL } from "./baseUrl";

/**
 * Default happy-path handler for avatar uploads, matches any path under
 * the avatars bucket since the real path is per-user/extension.
 */
export const storageHandlers = [
  http.post(`${SUPABASE_URL}/storage/v1/object/avatars/*`, () => {
    return HttpResponse.json(
      {
        Key: "avatars/00000000-0000-4000-8000-000000000000/avatar.jpg",
        Id: "00000000-0000-4000-8000-000000000004",
      },
      { status: 200 },
    );
  }),
];

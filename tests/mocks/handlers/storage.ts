import { http, HttpResponse } from "msw";
import { SUPABASE_URL } from "./baseUrl";

/**
 * Default happy-path handler for avatar uploads. Confirmed by reading
 * @supabase/storage-js's source directly: .upload() (used with
 * { upsert: true }, not .update()) always sends POST, upsert is carried as
 * an `x-upsert` header, not a different HTTP method. Matches any path under
 * the avatars bucket since the real path is `{userId}/avatar.{ext}`, both
 * parts variable per test. Storage's success body shape ({ path }) is a
 * reasonable inference, not independently confirmed — updateProfile doesn't
 * read anything off this response, so it isn't load-bearing for these tests.
 */
export const storageHandlers = [
  http.post(`${SUPABASE_URL}/storage/v1/object/avatars/*`, () => {
    return HttpResponse.json({ path: "avatars/mock-path" }, { status: 200 });
  }),
];

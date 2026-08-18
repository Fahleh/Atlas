import { http, HttpResponse } from "msw";
import { SUPABASE_URL } from "./baseUrl";

/**
 * Default happy-path row for the `project_members` GET handler, shaped like
 * useMembersByProject's real join (`profiles(id, name, avatar_url)`
 * embedded, snake_case throughout since toCamelCase only transforms
 * top-level keys).
 */
export const FAKE_PROJECT_MEMBER_ROW = {
  project_id: "00000000-0000-4000-8000-000000000002",
  role: "owner",
  joined_at: "2026-01-01T00:00:00.000Z",
  profiles: {
    id: "00000000-0000-4000-8000-000000000000",
    name: "Fake User",
    avatar_url: null,
  },
};

/**
 * Default happy-path handlers for the `project_members` table. POST/DELETE
 * are addMember's insert and removeMember's delete. GET is
 * useMembersByProject's real read path.
 */
export const projectMembersHandlers = [
  http.get(`${SUPABASE_URL}/rest/v1/project_members`, () => {
    return HttpResponse.json([FAKE_PROJECT_MEMBER_ROW]);
  }),
  http.post(`${SUPABASE_URL}/rest/v1/project_members`, () => {
    return new HttpResponse(null, { status: 201 });
  }),
  http.delete(`${SUPABASE_URL}/rest/v1/project_members`, () => {
    return new HttpResponse(null, { status: 204 });
  }),
];

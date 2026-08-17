import { http, HttpResponse } from "msw";
import { SUPABASE_URL } from "./baseUrl";

/**
 * Default happy-path handlers for the `project_members` table
 * (addMember's insert, removeMember's delete).
 */
export const projectMembersHandlers = [
  http.post(`${SUPABASE_URL}/rest/v1/project_members`, () => {
    return new HttpResponse(null, { status: 201 });
  }),
  http.delete(`${SUPABASE_URL}/rest/v1/project_members`, () => {
    return new HttpResponse(null, { status: 204 });
  }),
];

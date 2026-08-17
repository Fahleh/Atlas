import { http, HttpResponse } from "msw";
import { SUPABASE_URL } from "./baseUrl";

/**
 * Default happy-path handlers for the `projects` table. None of these calls
 * use `.select()` in the real actions, so PostgREST's default
 * `Prefer: return=minimal` applies — success responses carry no body.
 * Tests override these per-case via server.use() for error paths.
 */
export const projectsHandlers = [
  http.post(`${SUPABASE_URL}/rest/v1/projects`, () => {
    return new HttpResponse(null, { status: 201 });
  }),
  http.patch(`${SUPABASE_URL}/rest/v1/projects`, () => {
    return new HttpResponse(null, { status: 204 });
  }),
  http.delete(`${SUPABASE_URL}/rest/v1/projects`, () => {
    return new HttpResponse(null, { status: 204 });
  }),
];

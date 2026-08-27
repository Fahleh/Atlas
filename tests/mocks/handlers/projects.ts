import { http, HttpResponse } from "msw";
import { SUPABASE_URL } from "./baseUrl";

/**
 * Default happy-path row for the `projects` table GET handler, shaped like a
 * real PostgREST row for useProjects's own toCamelCase/parseDates transform.
 */
export const FAKE_PROJECT_ROW = {
  id: "00000000-0000-4000-8000-000000000002",
  owner_id: "00000000-0000-4000-8000-000000000000",
  name: "Fake Project",
  description: "",
  status: "active",
  due_date: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

/**
 * Default happy-path handlers for the `projects` table. POST/PATCH/DELETE
 * use PostgREST's default `Prefer: return=minimal` (no `.select()` in the
 * real actions), so those success bodies are empty. GET is useProjects's
 * real read path.
 */
export const projectsHandlers = [
  http.get(`${SUPABASE_URL}/rest/v1/projects`, () => {
    return HttpResponse.json([FAKE_PROJECT_ROW]);
  }),
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

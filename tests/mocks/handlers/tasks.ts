import { http, HttpResponse } from "msw";
import { SUPABASE_URL } from "./baseUrl";

/**
 * Default happy-path row for the `tasks` table GET handler, shaped like a
 * real PostgREST row (snake_case, raw timestamp strings) since useTasks does
 * its own toCamelCase/parseDates transform on whatever the network returns.
 */
export const FAKE_TASK_ROW = {
  id: "00000000-0000-4000-8000-000000000001",
  assignee_id: null,
  project_id: "00000000-0000-4000-8000-000000000002",
  title: "Fake task",
  description: "",
  status: "todo",
  due_date: null,
  created_at: "2026-01-01T00:00:00.000Z",
};

/**
 * Default happy-path handlers for the `tasks` table. POST/PATCH/DELETE match
 * projects.ts's Prefer: return=minimal reasoning — no `.select()` anywhere in
 * taskActions.ts, so those success bodies are empty. GET is useTasks's real
 * read path. HEAD is useDueSoonTaskCount's `{ count: "exact", head: true }`
 * query: PostgREST carries the count in Content-Range, no body, confirmed by
 * reading postgrest-js's own count-parsing (`count = parseInt(contentRange[1])`
 * from `res.headers.get('content-range')`), not the response body.
 */
export const tasksHandlers = [
  http.get(`${SUPABASE_URL}/rest/v1/tasks`, () => {
    return HttpResponse.json([FAKE_TASK_ROW]);
  }),
  http.head(`${SUPABASE_URL}/rest/v1/tasks`, () => {
    return new HttpResponse(null, {
      status: 200,
      headers: { "Content-Range": "*/2" },
    });
  }),
  http.post(`${SUPABASE_URL}/rest/v1/tasks`, () => {
    return new HttpResponse(null, { status: 201 });
  }),
  http.patch(`${SUPABASE_URL}/rest/v1/tasks`, () => {
    return new HttpResponse(null, { status: 204 });
  }),
  http.delete(`${SUPABASE_URL}/rest/v1/tasks`, () => {
    return new HttpResponse(null, { status: 204 });
  }),
];

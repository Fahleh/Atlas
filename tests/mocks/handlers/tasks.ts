import { http, HttpResponse } from "msw";
import { SUPABASE_URL } from "./baseUrl";

/**
 * Default happy-path handlers for the `tasks` table. Same
 * Prefer: return=minimal reasoning as projects.ts — no `.select()`
 * anywhere in taskActions.ts, so success bodies are empty.
 */
export const tasksHandlers = [
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

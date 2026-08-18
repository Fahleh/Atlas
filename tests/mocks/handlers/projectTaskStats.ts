import { http, HttpResponse } from "msw";
import { SUPABASE_URL } from "./baseUrl";

/**
 * Default happy-path row for the `project_task_stats` view GET handler,
 * shaped like useTaskCountsByProject's real read (snake_case, matching the
 * view's own columns).
 */
export const FAKE_PROJECT_TASK_STATS_ROW = {
  project_id: "00000000-0000-4000-8000-000000000002",
  total_tasks: 4,
  done_tasks: 1,
};

/**
 * Default happy-path handler for the `project_task_stats` view. Read-only,
 * no write path exists for this table.
 */
export const projectTaskStatsHandlers = [
  http.get(`${SUPABASE_URL}/rest/v1/project_task_stats`, () => {
    return HttpResponse.json([FAKE_PROJECT_TASK_STATS_ROW]);
  }),
];

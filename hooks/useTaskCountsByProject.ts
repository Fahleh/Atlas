import { createClient } from "@/lib/supabase/client";
import {
  interpretSupabaseReadError,
  SupabaseReadError,
} from "@/lib/supabase/errors";
import { toCamelCase } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

type ProjectTaskStatsRow = {
  projectId: string | null;
  totalTasks: number | null;
  doneTasks: number | null;
};

export type TaskCounts = { total: number; done: number };

/**
 * Groups project_task_stats rows into a Record keyed by project ID.
 *
 * @param rows - project_task_stats rows, camelCased
 * @returns Task counts grouped by project ID
 */
function groupTaskCountsByProject(
  rows: ProjectTaskStatsRow[],
): Record<string, TaskCounts> {
  return rows.reduce<Record<string, TaskCounts>>((acc, row) => {
    // project_id is the view's own GROUP BY key over tasks.project_id (NOT NULL
    // at the schema level). The generated type is only conservative about views.
    acc[row.projectId!] = {
      total: row.totalTasks ?? 0,
      done: row.doneTasks ?? 0,
    };
    return acc;
  }, {});
}

/**
 * Fetches task counts from the project_task_stats view for all given project
 * IDs in a single batched query, grouped into a Record<projectId, TaskCounts>.
 *
 * @param projectIds - All currently-loaded project IDs to fetch task counts for
 * @returns React Query result with `data: Record<string, TaskCounts>`
 */
export function useTaskCountsByProject(projectIds: string[]) {
  const sortedIds = [...projectIds].sort();

  return useQuery<
    ProjectTaskStatsRow[],
    SupabaseReadError,
    Record<string, TaskCounts>
  >({
    queryKey: ["taskCountsByProject", sortedIds],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("project_task_stats")
        .select("project_id, total_tasks, done_tasks")
        .in("project_id", sortedIds);

      if (error) throw new SupabaseReadError(interpretSupabaseReadError(error));

      return data.map((row) => toCamelCase<ProjectTaskStatsRow>(row));
    },
    select: groupTaskCountsByProject,
    enabled: sortedIds.length > 0,
    staleTime: 2 * 60 * 1000,
  });
}

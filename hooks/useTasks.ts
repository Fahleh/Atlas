// TODO: add tests

import { createClient } from "@/lib/supabase/client";
import { toCamelCase } from "@/lib/utils";
import { Task } from "@/types/atlas.types";
import { useQuery } from "@tanstack/react-query";

/**
 * Custom hook for fetching tasks from the supabase database.
 *
 * Utilizes React Query for data fetching.
 * snake_case properties are transformed to camelCase.
 *
 * @returns React Query result with `data: Task[]`, `isLoading`, and `isError` state.
 */

export function useTasks(projectId: string) {
  return useQuery({
    enabled: !!projectId,
    queryKey: ["tasks", projectId],
    queryFn: async () => {
      // const supabase = createClient();

      // const { data, error } = await supabase
      //   .from("tasks")
      //   .select("*")
      //   .eq("project_id", projectId);

      // if (error) throw error;

      // const transformedData: Task[] = data.map((tasks) => toCamelCase(tasks));

      // return transformedData;

      const mockTasks: Task[] = [
        {
          id: crypto.randomUUID(),
          projectId,
          assigneeId: null,
          title: "Set up CI pipeline",
          description: "Configure GitHub Actions for lint, test, build",
          status: "in_progress",
          dueDate: null,
          createdAt: new Date(),
        },
        {
          id: crypto.randomUUID(),
          projectId,
          assigneeId: null,
          title: "Write onboarding docs",
          description: "Document setup steps for new contributors",
          status: "todo",
          dueDate: new Date("2026-07-15"),
          createdAt: new Date(),
        },
      ];
      return mockTasks;
    },
    staleTime: 2 * 60 * 1000,
  });
}

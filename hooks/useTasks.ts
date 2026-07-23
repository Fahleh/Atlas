// TODO: add tests

import { createClient } from "@/lib/supabase/client";
import { parseDates, toCamelCase } from "@/lib/utils";
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
      const supabase = createClient();

      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("project_id", projectId);

      if (error) throw error;

      const transformedData: Task[] = data.map((task) =>
        parseDates(toCamelCase(task), ["createdAt", "dueDate"]),
      );

      return transformedData;
    },
    staleTime: 2 * 60 * 1000,
  });
}

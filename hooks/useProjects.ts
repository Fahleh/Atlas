// TODO: add tests

import { createClient } from "@/lib/supabase/client";
import {
  interpretSupabaseReadError,
  SupabaseReadError,
} from "@/lib/supabase/errors";
import { parseDates, toCamelCase } from "@/lib/utils";
import { Project } from "@/types/atlas.types";
import { useQuery } from "@tanstack/react-query";

/**
 * Custom hook for fetching projects from the supabase database.
 *
 * Utilizes React Query for data fetching.
 * Projects are ordered by most recently updated first, snake_case
 * properties are transformed to camelCase.
 *
 * @returns React Query result with `data: Project[]`, `isLoading`, and `isError` state.
 */

export function useProjects() {
  return useQuery<Project[], SupabaseReadError>({
    queryKey: ["projects"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("updated_at", { ascending: false });

      if (error) throw new SupabaseReadError(interpretSupabaseReadError(error));

      const transformedData: Project[] = data.map((project) =>
        parseDates(toCamelCase(project), ["createdAt", "dueDate", "updatedAt"]),
      );

      return transformedData;
    },
    staleTime: 2 * 60 * 1000,
  });
}

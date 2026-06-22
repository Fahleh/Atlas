// TODO: add tests

import { createClient } from "@/lib/supabase/client";
import { toCamelCase } from "@/lib/utils";
import { Project } from "@/types/atlas.types";
import { useQuery } from "@tanstack/react-query";

/**
 * Custom hook for fetching projects from the supabase database.
 *
 * Utilizes React Query for data fetching.
 * Projects are ordered by creation date with the most recent first and,
 * snake_case properties are transformed to camelCase.
 *
 * @returns React Query result with `data: Project[]`, `isLoading`, and `isError` state.
 */

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      // const supabase = createClient();
      // const { data, error } = await supabase
      //   .from("projects")
      //   .select("*")
      //   .order("created_at", { ascending: false });

      // if (error) throw error;

      // const transformedData: Project[] = data.map((project) =>
      //   toCamelCase(project),
      // );

      // return transformedData;

      // TODO: remove mock data when auth is implemented
      const mockProjects: Project[] = [
        {
          id: crypto.randomUUID(),
          name: "Atlas Dashboard",
          description: "Building the project management dashboard",
          status: "active",
          ownerId: "user-123",
          dueDate: new Date("2026-12-31"),
          createdAt: new Date(),
        },
        {
          id: crypto.randomUUID(),
          name: "Design System",
          description: "Component library and token architecture",
          status: "completed",
          ownerId: "user-123",
          dueDate: null,
          createdAt: new Date(),
        },
        {
          id: crypto.randomUUID(),
          name: "API Integration",
          description: "Connect frontend to backend services",
          status: "archived",
          ownerId: "user-123",
          dueDate: null,
          createdAt: new Date(),
        },
      ];
      return mockProjects;
    },
    staleTime: 2 * 60 * 1000,
  });
}

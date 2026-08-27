import { createClient } from "@/lib/supabase/client";
import {
  interpretSupabaseReadError,
  SupabaseReadError,
} from "@/lib/supabase/errors";
import { parseDates, toCamelCase } from "@/lib/utils";
import type { Member, MemberRole } from "@/types/atlas.types";
import { useQuery } from "@tanstack/react-query";

// toCamelCase only transforms top-level keys, so the nested `profiles` object
// (embedded via the Supabase join) keeps its snake_case column names.
type ProjectMemberRow = {
  projectId: string;
  role: string | null;
  joinedAt: Date;
  profiles: { id: string; name: string; avatar_url: string | null } | null;
};

const VALID_ROLES: readonly MemberRole[] = ["owner", "collaborator"];

function isMemberRole(value: string | null): value is MemberRole {
  return value !== null && (VALID_ROLES as readonly string[]).includes(value);
}

/**
 * Groups project_members join rows into a Record keyed by project ID,
 * sorted within each project by join date (oldest first).
 *
 * @param rows - project_members rows joined with profiles, camelCased with joinedAt parsed
 * @returns Members grouped by project ID
 */
function groupMembersByProject(
  rows: ProjectMemberRow[],
): Record<string, Member[]> {
  const sorted = rows
    .filter((row) => row.profiles !== null)
    .sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime());

  return sorted.reduce<Record<string, Member[]>>((acc, row) => {
    const profile = row.profiles!;
    const member: Member = {
      id: profile.id,
      name: profile.name,
      avatarUrl: profile.avatar_url,
      role: isMemberRole(row.role) ? row.role : "collaborator",
    };
    acc[row.projectId] = [...(acc[row.projectId] ?? []), member];
    return acc;
  }, {});
}

/**
 * Fetches project_members joined with profiles for all given project IDs
 * in a single batched query, grouped into a Record<projectId, Member[]>.
 *
 * @param projectIds - All currently-loaded project IDs to fetch members for
 * @returns React Query result with `data: Record<string, Member[]>`
 */
export function useMembersByProject(projectIds: string[]) {
  const sortedIds = [...projectIds].sort();

  return useQuery<
    ProjectMemberRow[],
    SupabaseReadError,
    Record<string, Member[]>
  >({
    queryKey: ["projectMembers", sortedIds],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("project_members")
        .select("project_id, role, joined_at, profiles(id, name, avatar_url)")
        .in("project_id", sortedIds);

      if (error) throw new SupabaseReadError(interpretSupabaseReadError(error));

      return data.map((row) =>
        parseDates(toCamelCase<ProjectMemberRow>(row), ["joinedAt"]),
      );
    },
    select: groupMembersByProject,
    enabled: sortedIds.length > 0,
    staleTime: 2 * 60 * 1000,
  });
}

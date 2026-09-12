import { createClient } from "@/lib/supabase/client";
import {
  interpretSupabaseReadError,
  SupabaseReadError,
} from "@/lib/supabase/errors";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useQuery } from "@tanstack/react-query";

export type OwnedMultiMemberProject = {
  id: string;
  name: string;
};

// project_members is only present to make the !inner join filter which
// projects come back, its contents are never read.
type ProjectRow = {
  id: string;
  name: string;
  project_members: { user_id: string }[];
};

/**
 * Fetches every project the current user owns that also has at least one
 * other member. Account deletion is blocked by RLS (migration 018,
 * `owner_has_multi_member_project()`) whenever this list is non-empty,
 * ownership transfer isn't built, so the only way out is deleting the
 * project or removing every other member first.
 *
 * This is the client-side nicety that surfaces the block before the
 * delete-account flow is even reachable, the real enforcement lives in
 * the database, not here.
 *
 * @returns React Query result with `data: OwnedMultiMemberProject[]`
 */
export function useOwnedMultiMemberProjects() {
  const { data: currentUser } = useCurrentUser();

  return useQuery<OwnedMultiMemberProject[], SupabaseReadError>({
    enabled: !!currentUser?.id,
    queryKey: ["ownedMultiMemberProjects", currentUser?.id],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, project_members!inner(user_id)")
        .eq("owner_id", currentUser!.id)
        .neq("project_members.user_id", currentUser!.id);

      if (error) throw new SupabaseReadError(interpretSupabaseReadError(error));

      return (data as ProjectRow[]).map((row) => ({
        id: row.id,
        name: row.name,
      }));
    },
  });
}

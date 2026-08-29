import { createClient } from "@/lib/supabase/client";
import {
  interpretSupabaseReadError,
  SupabaseReadError,
} from "@/lib/supabase/errors";
import { parseDates, toCamelCase } from "@/lib/utils";
import type {
  ActivityEntityType,
  ActivityLogEntry,
  ActivityVerb,
} from "@/types/atlas.types";
import { useQuery } from "@tanstack/react-query";

const RECENT_ACTIVITY_LIMIT = 4;

// toCamelCase only transforms top-level keys, so the nested `profiles`
// and `projects` objects keep their snake_case column names.
type ActivityLogRow = {
  id: string;
  projectId: string;
  actorId: string | null;
  actorName: string;
  verb: ActivityVerb;
  entityType: ActivityEntityType;
  entityId: string | null;
  entityName: string;
  metadata: unknown;
  createdAt: Date;
  profiles: { avatar_url: string | null } | null;
  projects: { name: string } | null;
};

function toActivityLogEntry(row: ActivityLogRow): ActivityLogEntry {
  return {
    id: row.id,
    projectId: row.projectId,
    projectName: row.projects?.name ?? null,
    actorId: row.actorId,
    actorName: row.actorName,
    actorAvatarUrl: row.profiles?.avatar_url ?? null,
    verb: row.verb,
    entityType: row.entityType,
    entityId: row.entityId,
    entityName: row.entityName,
    metadata: row.metadata,
    createdAt: row.createdAt,
  };
}

/**
 * Fetches the most recent activity_log entries across every project the
 * current user belongs to, joined with the actor's avatar and the
 * project's name. RLS (is_project_member) already scopes rows to the
 * user's own projects, no manual project filtering is needed.
 *
 * @returns React Query result with `data: ActivityLogEntry[]`
 */
export function useActivityLog() {
  return useQuery<ActivityLogRow[], SupabaseReadError, ActivityLogEntry[]>({
    queryKey: ["activityLog"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("activity_log")
        .select(
          "id, project_id, actor_id, actor_name, verb, entity_type, entity_id, entity_name, metadata, created_at, profiles(avatar_url), projects(name)",
        )
        .order("created_at", { ascending: false })
        .limit(RECENT_ACTIVITY_LIMIT);

      if (error) throw new SupabaseReadError(interpretSupabaseReadError(error));

      return data.map((row) =>
        parseDates(toCamelCase<ActivityLogRow>(row), ["createdAt"]),
      );
    },
    select: (rows) => rows.map(toActivityLogEntry),
    staleTime: 60 * 1000,
  });
}

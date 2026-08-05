import { createClient } from "@/lib/supabase/client";
import { useQuery } from "@tanstack/react-query";

export const DUE_SOON_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Fetches a single aggregate count of not-done tasks due within the next 7
 * days, across every project the current user can see. Scoped safely by
 * `tasks`'s existing per-row RLS policy (see docs/database.md), which
 * evaluates project membership per row regardless of the query's filters —
 * no project_id filter is needed or applied here.
 *
 * @param nowMs - Mount-time reference timestamp, in milliseconds
 * @returns React Query result with `data: number`
 */
export function useDueSoonTaskCount(nowMs: number) {
  return useQuery({
    queryKey: ["dueSoonTaskCount", nowMs],
    queryFn: async () => {
      const supabase = createClient();
      const { count, error } = await supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .neq("status", "done")
        .gte("due_date", new Date(nowMs).toISOString())
        .lte("due_date", new Date(nowMs + DUE_SOON_WINDOW_MS).toISOString());

      if (error) throw error;

      return count ?? 0;
    },
    staleTime: 2 * 60 * 1000,
  });
}

import { createClient } from "@/lib/supabase/client";
import { useQuery } from "@tanstack/react-query";

export type CurrentUser = {
  id: string;
};

/**
 * Custom hook exposing the logged-in user's ID for client-side ownership checks.
 *
 * Verifies the JWT locally via `getClaims()` (no network call under Atlas's
 * asymmetric ECC P-256 signing keys). `staleTime` is a bounded safety net, not
 * the primary correctness mechanism — `AuthListenerProvider` invalidates this
 * query key on real sign-in/sign-out transitions.
 *
 * @returns React Query result with `data: CurrentUser | null`, `isLoading`, and `isError` state.
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: ["currentUser"],
    queryFn: async (): Promise<CurrentUser | null> => {
      const supabase = createClient();
      const { data, error } = await supabase.auth.getClaims();
      if (error || !data?.claims) return null;
      return { id: data.claims.sub };
    },
    staleTime: 5 * 60 * 1000,
  });
}

import { createClient } from "@/lib/supabase/client";
import {
  interpretSupabaseReadError,
  SupabaseReadError,
} from "@/lib/supabase/errors";
import { toCamelCase } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useQuery } from "@tanstack/react-query";

export type CurrentUserProfile = {
  id: string;
  name: string;
  avatarUrl: string | null;
};

/**
 * Fetches the logged-in user's full profile (name, avatar) for identity
 * display in the header. Separate from `useCurrentUser`: that hook
 * stays minimal (JWT-claims-only `{ id }`) for cheap ownership checks, while
 * this one is a genuinely heavier concern: a `profiles` row fetch.
 *
 * The query key includes `currentUser?.id`, so it naturally refetches (or
 * clears) when `AuthListenerProvider` invalidates `["currentUser"]` on
 * sign-in/sign-out; no separate invalidation of this key is needed.
 *
 * @returns React Query result with `data: CurrentUserProfile | undefined`
 */
export function useCurrentUserProfile() {
  const { data: currentUser } = useCurrentUser();

  return useQuery<CurrentUserProfile, SupabaseReadError>({
    enabled: !!currentUser?.id,
    queryKey: ["currentUserProfile", currentUser?.id],
    queryFn: async (): Promise<CurrentUserProfile> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, avatar_url")
        .eq("id", currentUser!.id)
        .single();

      if (error) throw new SupabaseReadError(interpretSupabaseReadError(error));

      return toCamelCase<CurrentUserProfile>(data);
    },
  });
}

"use client";

import { createClient } from "@/lib/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";

type AuthListenerProviderProps = {
  children: ReactNode;
};

/**
 * Clears the React Query cache on SIGNED_OUT only, a secondary safeguard,
 * not the primary mechanism. QueryProvider's own scoped mount/unmount
 * lifecycle in `app/(dashboard)/layout.tsx` is the primary cross-user
 * cache isolation defense; `ClearQueryCacheOnMount.tsx` is deleted. See
 * docs/decisions.md ("Scoping QueryProvider to app/(dashboard)/layout.tsx,
 * deleting ClearQueryCacheOnMount.tsx") for why SIGNED_IN is deliberately
 * excluded here and why that entry's mechanism, not this one, is primary.
 *
 * @param children - React subtree that should have the listener active for its lifetime
 */
export function AuthListenerProvider({
  children,
}: AuthListenerProviderProps) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        queryClient.clear();
      }
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

  return <>{children}</>;
}

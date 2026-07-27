"use client";

import { createClient } from "@/lib/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";

type AuthListenerProviderProps = {
  children: ReactNode;
};

/**
 * Clears the React Query cache on SIGNED_OUT only — a secondary safeguard,
 * not the primary mechanism. See docs/decisions.md ("Clearing the React
 * Query cache on layout mount") for why SIGNED_IN is deliberately excluded
 * and why ClearQueryCacheOnMount.tsx is the real fix.
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

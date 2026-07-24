"use client";

import { createClient } from "@/lib/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";

type AuthListenerProviderProps = {
  children: ReactNode;
};

/**
 * Invalidates the `currentUser` query on real auth identity transitions.
 *
 * Registered once at the app root, inside `QueryProvider`, since it needs
 * `useQueryClient()`. Only SIGNED_IN and SIGNED_OUT represent an identity
 * change — INITIAL_SESSION fires once on subscribe (not a transition, and
 * `useCurrentUser`'s queryFn already runs on mount regardless), and
 * TOKEN_REFRESHED changes only token freshness, not who the user is.
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
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      }
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

  return <>{children}</>;
}

"use client";

import { createClient } from "@/lib/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";

type AuthListenerProviderProps = {
  children: ReactNode;
};

/**
 * Clears the React Query cache on SIGNED_OUT — a low-risk, currently-dormant
 * secondary safeguard, not the mechanism this app's correctness depends on.
 *
 * Does NOT handle SIGNED_IN, deliberately. `onAuthStateChange` fires
 * SIGNED_IN on any fresh client initialization that finds an existing valid
 * session — this is Supabase's own documented behavior, not a bug — which
 * includes an ordinary hard refresh by the same, still-logged-in user, not
 * just a genuine new login. Clearing on SIGNED_IN caused a confirmed bug: a
 * stuck-loading skeleton on refresh, from every other query mounting in the
 * same commit racing against this listener's clear() and having their
 * in-flight fetch orphaned (confirmed via React Query Devtools showing zero
 * registered queries despite a real, resolved 200 in the Network tab). If a
 * future reader is tempted to add SIGNED_IN back here to "double up" on
 * protection: don't — this is exactly the bug that removing it fixed.
 *
 * The actual, deterministic mechanism protecting both the login and logout
 * transitions is `components/ClearQueryCacheOnMount.tsx`, mounted in both
 * `(auth)/layout.tsx` and `(dashboard)/layout.tsx` — see that file and
 * docs/decisions.md. This listener is not load-bearing for Atlas's current
 * Server-Action-driven logout flow (`onAuthStateChange` cannot reliably fire
 * from a server-side auth call to begin with — supabase-js#1618). It's kept
 * only as a safeguard for a hypothetical future direct client-side
 * `supabase.auth.signOut()` call, which *would* fire SIGNED_OUT reliably.
 *
 * Registered once at the app root, inside `QueryProvider`, since it needs
 * `useQueryClient()`.
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

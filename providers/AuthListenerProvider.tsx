"use client";

import { createClient } from "@/lib/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";

type AuthListenerProviderProps = {
  children: ReactNode;
};

/**
 * Wipes the entire React Query cache on real auth identity transitions —
 * a **secondary**, not primary, defense against cross-user cache leaks.
 *
 * `onAuthStateChange` is not a reliable primary signal for this: Atlas's
 * login/signup/logout all happen via Server Actions using the *server*
 * Supabase client, and the *browser* client's `onAuthStateChange` (which this
 * listens on) is never itself told a sign-in/sign-out happened server-side —
 * a confirmed, Supabase-team-acknowledged limitation (supabase-js#1618:
 * "onAuthStateChange cannot trigger on a server call as it's a client side
 * only thing"). This explains why relying on it alone produced intermittent
 * results in manual two-browser testing. The actual, deterministic fix is
 * `components/ClearQueryCacheOnMount.tsx`, rendered in both
 * `(auth)/layout.tsx` and `(dashboard)/layout.tsx` — see that file and
 * docs/decisions.md for the full reasoning.
 *
 * This listener is kept as-is rather than removed: it's a legitimate
 * secondary path for any future client-side auth call (e.g. a client-side
 * `signOut()`) that would fire this event correctly, and removing working
 * (if insufficient-alone) code isn't warranted.
 *
 * Registered once at the app root, inside `QueryProvider`, since it needs
 * `useQueryClient()`. Only SIGNED_IN and SIGNED_OUT represent an identity
 * change — INITIAL_SESSION fires once on subscribe (not a transition), and
 * TOKEN_REFRESHED changes only token freshness, not who the user is.
 *
 * `clear()`, not a narrow `invalidateQueries(["currentUser"])`: every
 * user-scoped query (`["projects"]`, `["tasks", projectId]`,
 * `["projectMembers", sortedIds]`, `["currentUserProfile", id]`, ...) has no
 * user-identity component in its key, so a narrower invalidation leaves them
 * untouched — their cached values would survive an auth transition and can
 * render on screen for a different, now-logged-in user.
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
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        queryClient.clear();
      }
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

  return <>{children}</>;
}

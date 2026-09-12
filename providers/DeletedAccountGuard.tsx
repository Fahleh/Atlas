"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useCurrentUserProfile } from "@/hooks/useCurrentUserProfile";
import { createClient } from "@/lib/supabase/client";

/**
 * Forces a sign-out when the current account has been soft-deleted.
 *
 * proxy.ts only verifies the access token's signature via getClaims(), it
 * never looks at profiles.deleted_at, so a token issued before deletion
 * stays valid there until natural expiry. This is the actual checkpoint:
 * useCurrentUserProfile keeps succeeding for a deleted account, since
 * "profiles: authenticated users can read" is unconditional (migration 018),
 * and returns deletedAt rather than getting filtered out by RLS.
 *
 * Not folded into AuthListenerProvider, which was deliberately narrowed to
 * SIGNED_OUT only after a documented incident, see docs/decisions.md
 * ("Moving AuthListenerProvider..."). That listener reacts to auth events,
 * not profile data, and this check needs the latter.
 */
export function DeletedAccountGuard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: profile } = useCurrentUserProfile();

  // Guards against firing signOut twice (e.g. a second render before the
  // redirect lands). Not render state, so a ref, not useState.
  const hasHandledRef = useRef(false);

  useEffect(() => {
    if (!profile?.deletedAt || hasHandledRef.current) return;
    hasHandledRef.current = true; // set before the first attempt, not after, so a second effect run can't start a parallel retry chain

    const RETRY_DELAYS_MS = [2000, 5000, 15000];
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    function attemptSignOut(attempt: number) {
      const supabase = createClient();
      supabase.auth
        .signOut({ scope: "local" })
        .then(() => {
          if (cancelled) return;
          queryClient.clear();
          router.replace("/login?error=account_deleted");
        })
        .catch(() => {
          if (cancelled) return;
          const delay = RETRY_DELAYS_MS[attempt];
          if (delay === undefined) return;
          timeoutId = setTimeout(() => attemptSignOut(attempt + 1), delay);
        });
    }

    attemptSignOut(0);

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [profile, queryClient, router]);

  return null;
}

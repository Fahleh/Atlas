"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useCurrentUserProfile } from "@/hooks/useCurrentUserProfile";
import { createClient } from "@/lib/supabase/client";

/**
 * Forces a sign-out, with a short backoff-retried signOut call, when the
 * current account has been soft-deleted. See docs/auth.md
 * ("Deleted-Account Detection") for why this exists and why it isn't
 * folded into AuthListenerProvider.
 */
export function DeletedAccountGuard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: profile } = useCurrentUserProfile();

  // Guards against starting a second parallel retry chain. Not render
  // state, so a ref, not useState.
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

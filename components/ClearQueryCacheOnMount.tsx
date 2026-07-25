"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

/**
 * Wipes the React Query cache once, on mount — rendered inside both
 * `(auth)/layout.tsx` and `(dashboard)/layout.tsx`, which Next.js fully
 * remounts on every crossing between those route groups (and does not
 * remount on navigation within either group). This is the deterministic
 * signal `AuthListenerProvider`'s `onAuthStateChange` couldn't reliably be
 * (see its JSDoc) — see docs/decisions.md for the full writeup, including
 * the assumption this correctness depends on.
 */
export function ClearQueryCacheOnMount() {
  const queryClient = useQueryClient();
  useEffect(() => {
    queryClient.clear();
  }, [queryClient]);
  return null;
}

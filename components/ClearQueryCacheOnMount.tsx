"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

/**
 * Wipes the React Query cache once, on mount — rendered in both
 * `(auth)/layout.tsx` and `(dashboard)/layout.tsx`, which Next.js fully
 * remounts on every crossing between those route groups. See
 * docs/decisions.md ("Clearing the React Query cache on layout mount").
 */
export function ClearQueryCacheOnMount() {
  const queryClient = useQueryClient();
  useEffect(() => {
    queryClient.clear();
  }, [queryClient]);
  return null;
}

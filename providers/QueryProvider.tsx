"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

type QueryProviderProps = {
  children: ReactNode;
};

/**
 * Provides React Query client to the component tree.
 * Initializes a single QueryClient instance with default options:
 * - staleTime: 60s — data considered fresh for 1 minute before background refetch
 * - retry: 1 — failed requests retry once before reporting an error
 * @param children - React subtree that will have access to the query client
 */
export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {process.env.NODE_ENV === "development" && <ReactQueryDevtools initialIsOpen={false} />}
      {children}
      </QueryClientProvider>
  );
}

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  render,
  renderHook,
  type RenderHookOptions,
  type RenderOptions,
} from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";

/**
 * One fresh QueryClient per call, matching the "fresh client per mount, not
 * a singleton" pattern QueryProvider itself uses (see docs/decisions.md).
 * `retry: false` so error-path tests don't sit through React Query's default
 * retry backoff, unlike QueryProvider's own `retry: 1` in production.
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

/**
 * Renders a hook wrapped in a fresh QueryClientProvider, for hooks that call
 * useQuery/useMutation. Returns the same result renderHook does, plus the
 * QueryClient itself so a test can inspect cache state or spy on it directly.
 *
 * @param hook - The hook to render, e.g. () => useTasks(projectId)
 * @param options - Optional renderHook options; `wrapper` is always overridden
 * @returns renderHook's result plus the QueryClient instance used
 */
export function renderHookWithClient<Result, Props>(
  hook: (initialProps: Props) => Result,
  options?: Omit<RenderHookOptions<Props>, "wrapper">,
) {
  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return { ...renderHook(hook, { ...options, wrapper }), queryClient };
}

/**
 * Renders a component wrapped in a fresh QueryClientProvider, for components
 * that call useQueryClient()/useQuery() directly (not just via a mocked hook).
 * Same fresh-per-call reasoning as renderHookWithClient above.
 *
 * @param ui - The element to render, e.g. <ProfileForm />
 * @param options - Optional render options; `wrapper` is always overridden
 * @returns render's result plus the QueryClient instance used
 */
export function renderWithClient(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
) {
  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return { ...render(ui, { ...options, wrapper }), queryClient };
}

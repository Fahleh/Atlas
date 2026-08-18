/** @jest-environment ./tests/mocks/hookTestEnvironment.ts */
import "@/jest.setup";

import { waitFor } from "@testing-library/react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { renderHookWithClient } from "@/tests/mocks/queryClient";
import { mockNoSession, mockLiveSession } from "@/tests/mocks/getClaims";

afterEach(() => {
  jest.restoreAllMocks();
});

describe("useCurrentUser", () => {
  it("should start in a loading state before getClaims resolves", () => {
    mockLiveSession();

    const { result } = renderHookWithClient(() => useCurrentUser());

    expect(result.current.isLoading).toBe(true);
  });

  it("should return the user id on a live session", async () => {
    mockLiveSession("user-123");

    const { result } = renderHookWithClient(() => useCurrentUser());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({ id: "user-123" });
  });

  it("should resolve to null, not an error state, when getClaims finds no session", async () => {
    mockNoSession();

    const { result } = renderHookWithClient(() => useCurrentUser());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBeNull();
    expect(result.current.isError).toBe(false);
  });

  it("should configure a 5 minute staleTime, not Infinity", async () => {
    mockLiveSession();
    const { result, queryClient } = renderHookWithClient(() => useCurrentUser());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const query = queryClient.getQueryCache().find({ queryKey: ["currentUser"] });
    // Query.options is typed as the narrower QueryOptions; staleTime lives on
    // QueryObserverOptions but is present on the real merged object at runtime.
    expect((query?.options as { staleTime?: number })?.staleTime).toBe(5 * 60 * 1000);
  });
});

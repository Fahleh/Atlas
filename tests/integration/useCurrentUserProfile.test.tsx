/** @jest-environment ./tests/mocks/hookTestEnvironment.ts */
import "@/jest.setup";

import { waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { useCurrentUserProfile } from "@/hooks/useCurrentUserProfile";
import { renderHookWithClient } from "@/tests/mocks/queryClient";
import { mockNoSession, mockLiveSession } from "@/tests/mocks/getClaims";
import { server } from "@/tests/mocks/server";
import { postgrestError } from "@/tests/mocks/postgrestError";
import { SUPABASE_URL } from "@/tests/mocks/handlers/baseUrl";
import { FAKE_PROFILE_ROW } from "@/tests/mocks/handlers/profiles";

afterEach(() => {
  jest.restoreAllMocks();
});

describe("useCurrentUserProfile", () => {
  it("should stay disabled (fetchStatus idle) until useCurrentUser resolves an id", async () => {
    let profileFetchCalled = false;
    server.use(
      http.get(`${SUPABASE_URL}/rest/v1/profiles`, () => {
        profileFetchCalled = true;
        return HttpResponse.json(FAKE_PROFILE_ROW);
      }),
    );
    mockLiveSession("user-123");

    const { result } = renderHookWithClient(() => useCurrentUserProfile());

    expect(result.current.fetchStatus).toBe("idle");
    expect(profileFetchCalled).toBe(false);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(profileFetchCalled).toBe(true);
  });

  it("should never enable when useCurrentUser resolves to null", async () => {
    let profileFetchCalled = false;
    server.use(
      http.get(`${SUPABASE_URL}/rest/v1/profiles`, () => {
        profileFetchCalled = true;
        return HttpResponse.json(FAKE_PROFILE_ROW);
      }),
    );
    mockNoSession();

    const { result, queryClient } = renderHookWithClient(() => useCurrentUserProfile());

    // fetchStatus is "idle" by default too, so wait on currentUser's own
    // cache entry reaching "success" first, to prove it actually resolved.
    await waitFor(() =>
      expect(
        queryClient.getQueryCache().find({ queryKey: ["currentUser"] })?.state.status,
      ).toBe("success"),
    );

    expect(result.current.fetchStatus).toBe("idle");
    expect(profileFetchCalled).toBe(false);
  });

  it("should return the camelCased profile on success", async () => {
    mockLiveSession("user-123");

    const { result } = renderHookWithClient(() => useCurrentUserProfile());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({
      id: FAKE_PROFILE_ROW.id,
      name: FAKE_PROFILE_ROW.name,
      avatarUrl: FAKE_PROFILE_ROW.avatar_url,
    });
  });

  it("should surface a SupabaseReadError on a failed profile fetch", async () => {
    mockLiveSession("user-123");
    server.use(
      http.get(`${SUPABASE_URL}/rest/v1/profiles`, () =>
        postgrestError({ code: "500", message: "boom" }, 500),
      ),
    );

    const { result } = renderHookWithClient(() => useCurrentUserProfile());

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.name).toBe("SupabaseReadError");
  });
});

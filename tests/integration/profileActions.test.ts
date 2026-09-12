import "@/jest.setup";

import { QueryClient } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { GoTrueClient } from "@supabase/auth-js";
import { deleteAccount, updateProfile } from "@/features/profile/profileActions";
import { server } from "@/tests/mocks/server";
import { postgrestError } from "@/tests/mocks/postgrestError";
import { SUPABASE_URL } from "@/tests/mocks/handlers/baseUrl";
import { mockLiveSession } from "@/tests/mocks/getClaims";

function buildAvatarFile(
  { type = "image/png", sizeBytes = 1024 }: { type?: string; sizeBytes?: number } = {},
): File {
  return new File([new Uint8Array(sizeBytes)], "avatar.png", { type });
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe("updateProfile", () => {
  it("should update only the name and never call Storage when no avatar file is given", async () => {
    let storageCalled = false;
    let patchBody: unknown;
    server.use(
      http.post(`${SUPABASE_URL}/storage/v1/object/avatars/*`, () => {
        storageCalled = true;
        return HttpResponse.json({ path: "mock-path" });
      }),
      http.patch(`${SUPABASE_URL}/rest/v1/profiles`, async ({ request }) => {
        patchBody = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const queryClient = new QueryClient();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");
    const userId = crypto.randomUUID();

    const result = await updateProfile(userId, { name: "New Name" }, queryClient);

    expect(result).toEqual({ error: null, errorKind: null });
    expect(patchBody).toEqual({ name: "New Name" });
    expect(storageCalled).toBe(false);
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["currentUserProfile"],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["projectMembers"],
    });
  });

  it("should upload the avatar and update avatar_url with a cache-busted URL, with no name field, for an avatar-only change", async () => {
    let patchBody: { name?: string; avatar_url?: string } | undefined;
    server.use(
      http.patch(`${SUPABASE_URL}/rest/v1/profiles`, async ({ request }) => {
        patchBody = (await request.json()) as typeof patchBody;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const queryClient = new QueryClient();
    const userId = crypto.randomUUID();

    const result = await updateProfile(
      userId,
      { avatarFile: buildAvatarFile() },
      queryClient,
    );

    expect(result).toEqual({ error: null, errorKind: null });
    expect(patchBody?.name).toBeUndefined();
    expect(patchBody?.avatar_url).toMatch(/\?t=\d+$/);
  });

  it("should include both name and avatar_url in the update when both change", async () => {
    let patchBody: { name?: string; avatar_url?: string } | undefined;
    server.use(
      http.patch(`${SUPABASE_URL}/rest/v1/profiles`, async ({ request }) => {
        patchBody = (await request.json()) as typeof patchBody;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const queryClient = new QueryClient();
    const userId = crypto.randomUUID();

    const result = await updateProfile(
      userId,
      { name: "New Name", avatarFile: buildAvatarFile() },
      queryClient,
    );

    expect(result).toEqual({ error: null, errorKind: null });
    expect(patchBody?.name).toBe("New Name");
    expect(patchBody?.avatar_url).toMatch(/\?t=\d+$/);
  });

  it("should reject a non-image avatar type before any network call", async () => {
    let storageCalled = false;
    let patchCalled = false;
    server.use(
      http.post(`${SUPABASE_URL}/storage/v1/object/avatars/*`, () => {
        storageCalled = true;
        return HttpResponse.json({ path: "mock-path" });
      }),
      http.patch(`${SUPABASE_URL}/rest/v1/profiles`, () => {
        patchCalled = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const queryClient = new QueryClient();
    const userId = crypto.randomUUID();

    const result = await updateProfile(
      userId,
      { avatarFile: buildAvatarFile({ type: "application/pdf" }) },
      queryClient,
    );

    expect(result).toEqual({
      error: "Photo must be a JPEG, PNG, or WEBP image.",
      errorKind: null,
    });
    expect(storageCalled).toBe(false);
    expect(patchCalled).toBe(false);
  });

  it("should reject an oversized avatar before any network call", async () => {
    let storageCalled = false;
    server.use(
      http.post(`${SUPABASE_URL}/storage/v1/object/avatars/*`, () => {
        storageCalled = true;
        return HttpResponse.json({ path: "mock-path" });
      }),
    );
    const queryClient = new QueryClient();
    const userId = crypto.randomUUID();

    const result = await updateProfile(
      userId,
      { avatarFile: buildAvatarFile({ sizeBytes: 3 * 1024 * 1024 }) },
      queryClient,
    );

    expect(result).toEqual({
      error: "Photo must be 2MB or smaller.",
      errorKind: null,
    });
    expect(storageCalled).toBe(false);
  });

  it("should surface a Storage upload error's raw message, bypassing interpretSupabaseWriteError", async () => {
    server.use(
      http.post(`${SUPABASE_URL}/storage/v1/object/avatars/*`, () =>
        HttpResponse.json(
          { statusCode: "403", error: "Forbidden", message: "new row violates row-level security policy" },
          { status: 403 },
        ),
      ),
    );
    const queryClient = new QueryClient();
    const userId = crypto.randomUUID();

    const result = await updateProfile(
      userId,
      { avatarFile: buildAvatarFile() },
      queryClient,
    );

    expect(result).toEqual({
      error: "new row violates row-level security policy",
      errorKind: null,
    });
  });

  it("should return sessionExpired for PGRST301 on the profiles update", async () => {
    server.use(
      http.patch(`${SUPABASE_URL}/rest/v1/profiles`, () =>
        postgrestError({ code: "PGRST301", message: "JWT expired" }, 401),
      ),
    );
    const queryClient = new QueryClient();
    const userId = crypto.randomUUID();

    const result = await updateProfile(userId, { name: "New Name" }, queryClient);

    expect(result).toEqual({
      error: "Your session has expired. Log in again to continue.",
      errorKind: "sessionExpired",
    });
  });

  it("should skip the PATCH entirely but still invalidate and succeed when nothing actually changed", async () => {
    let patchCalled = false;
    server.use(
      http.patch(`${SUPABASE_URL}/rest/v1/profiles`, () => {
        patchCalled = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const queryClient = new QueryClient();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");
    const userId = crypto.randomUUID();

    const result = await updateProfile(userId, {}, queryClient);

    expect(result).toEqual({ error: null, errorKind: null });
    expect(patchCalled).toBe(false);
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["currentUserProfile"],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["projectMembers"],
    });
  });
});

describe("deleteAccount", () => {
  it("should set deleted_at, sign out, and clear the cache on success", async () => {
    let patchBody: { deleted_at?: string } | undefined;
    server.use(
      http.patch(`${SUPABASE_URL}/rest/v1/profiles`, async ({ request }) => {
        patchBody = (await request.json()) as typeof patchBody;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    // auth-js's signOut() only hits the network when a real session is in
    // storage (confirmed by reading GoTrueClient.js's _signOut), which this
    // test harness never populates. Spying on signOut itself, rather than
    // asserting a network call, is what actually proves deleteAccount calls it.
    const signOutSpy = jest
      .spyOn(GoTrueClient.prototype, "signOut")
      .mockResolvedValue({ error: null });
    const queryClient = new QueryClient();
    const clearSpy = jest.spyOn(queryClient, "clear");
    const userId = crypto.randomUUID();

    const result = await deleteAccount(userId, queryClient);

    expect(result).toEqual({ error: null, errorKind: null });
    expect(patchBody?.deleted_at).toEqual(expect.any(String));
    expect(signOutSpy).toHaveBeenCalledWith({ scope: "local" });
    expect(clearSpy).toHaveBeenCalled();
  });

  it("should surface the blocked-deletion write as a generic forbidden error, never sign out", async () => {
    mockLiveSession();
    const signOutSpy = jest
      .spyOn(GoTrueClient.prototype, "signOut")
      .mockResolvedValue({ error: null });
    server.use(
      http.patch(`${SUPABASE_URL}/rest/v1/profiles`, () =>
        postgrestError({ code: "42501", message: "new row violates row-level security policy" }),
      ),
    );
    const queryClient = new QueryClient();
    const userId = crypto.randomUUID();

    const result = await deleteAccount(userId, queryClient);

    expect(result).toEqual({
      error: "You don't have permission to perform that action.",
      errorKind: "forbidden",
    });
    expect(signOutSpy).not.toHaveBeenCalled();
  });

  it("should return sessionExpired for PGRST301 on the deleting update", async () => {
    server.use(
      http.patch(`${SUPABASE_URL}/rest/v1/profiles`, () =>
        postgrestError({ code: "PGRST301", message: "JWT expired" }, 401),
      ),
    );
    const queryClient = new QueryClient();
    const userId = crypto.randomUUID();

    const result = await deleteAccount(userId, queryClient);

    expect(result).toEqual({
      error: "Your session has expired. Log in again to continue.",
      errorKind: "sessionExpired",
    });
  });
});

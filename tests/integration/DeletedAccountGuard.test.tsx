/** @jest-environment ./tests/mocks/hookTestEnvironment.ts */
import "@/jest.setup";
import "@testing-library/jest-dom";

import * as nextNavigationHooksMock from "@/tests/mocks/nextNavigationHooksMock";

jest.mock("next/navigation", () => nextNavigationHooksMock);
jest.mock("@/hooks/useCurrentUserProfile", () => ({
  useCurrentUserProfile: jest.fn(),
}));

import { waitFor } from "@testing-library/react";
import { GoTrueClient } from "@supabase/auth-js";
import { DeletedAccountGuard } from "@/providers/DeletedAccountGuard";
import { useCurrentUserProfile } from "@/hooks/useCurrentUserProfile";
import { renderWithClient } from "@/tests/mocks/queryClient";
import { mockReplace } from "@/tests/mocks/nextNavigationHooksMock";

const mockUseCurrentUserProfile = useCurrentUserProfile as jest.MockedFunction<
  typeof useCurrentUserProfile
>;

function mockProfile(profile: { deletedAt: Date | null } | undefined) {
  mockUseCurrentUserProfile.mockReturnValue({
    data: profile,
  } as unknown as ReturnType<typeof useCurrentUserProfile>);
}

afterEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe("DeletedAccountGuard", () => {
  it("should render nothing regardless of state", () => {
    mockProfile({ deletedAt: null });
    const { container } = renderWithClient(<DeletedAccountGuard />);
    expect(container).toBeEmptyDOMElement();
  });

  it("should sign out, clear the cache, then redirect, in that order, when deletedAt is set", async () => {
    const signOutSpy = jest
      .spyOn(GoTrueClient.prototype, "signOut")
      .mockResolvedValue({ error: null });
    mockProfile({ deletedAt: new Date("2026-01-01T00:00:00.000Z") });

    const { queryClient } = renderWithClient(<DeletedAccountGuard />);
    const clearSpy = jest.spyOn(queryClient, "clear");

    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith("/login?error=account_deleted"),
    );

    expect(signOutSpy).toHaveBeenCalledWith({ scope: "local" });
    expect(signOutSpy.mock.invocationCallOrder[0]).toBeLessThan(
      clearSpy.mock.invocationCallOrder[0],
    );
    expect(clearSpy.mock.invocationCallOrder[0]).toBeLessThan(
      mockReplace.mock.invocationCallOrder[0],
    );
  });

  it("should do nothing when deletedAt is null", async () => {
    const signOutSpy = jest.spyOn(GoTrueClient.prototype, "signOut");
    mockProfile({ deletedAt: null });

    renderWithClient(<DeletedAccountGuard />);

    expect(signOutSpy).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("should do nothing when the profile is still undefined, as a separate case from deletedAt being null", async () => {
    const signOutSpy = jest.spyOn(GoTrueClient.prototype, "signOut");
    mockProfile(undefined);

    renderWithClient(<DeletedAccountGuard />);

    expect(signOutSpy).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("should not start a second retry chain on a later render where deletedAt is still set", async () => {
    const signOutSpy = jest
      .spyOn(GoTrueClient.prototype, "signOut")
      .mockResolvedValue({ error: null });
    const deletedAt = new Date("2026-01-01T00:00:00.000Z");
    mockProfile({ deletedAt });

    const { rerender } = renderWithClient(<DeletedAccountGuard />);
    await waitFor(() => expect(signOutSpy).toHaveBeenCalledTimes(1));

    // A new profile object with the same deletedAt value, not the same
    // reference, forces the effect's dependency array to actually change
    // and re-run, so this isolates hasHandledRef as the reason a second
    // chain never starts, not React bailing out on an unchanged dependency.
    mockProfile({ deletedAt: new Date(deletedAt) });
    rerender(<DeletedAccountGuard />);

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(signOutSpy).toHaveBeenCalledTimes(1);
  });

  it("should retry after the first backoff delay and succeed on the second attempt", async () => {
    jest.useFakeTimers();
    const signOutSpy = jest.spyOn(GoTrueClient.prototype, "signOut");
    signOutSpy.mockRejectedValueOnce(new Error("network down"));
    signOutSpy.mockResolvedValueOnce({ error: null });
    mockProfile({ deletedAt: new Date("2026-01-01T00:00:00.000Z") });

    renderWithClient(<DeletedAccountGuard />);

    // Let the first attempt's rejection settle without advancing the clock.
    await jest.advanceTimersByTimeAsync(0);
    expect(signOutSpy).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();

    // Advance exactly past the first backoff delay (2s).
    await jest.advanceTimersByTimeAsync(2000);

    expect(signOutSpy).toHaveBeenCalledTimes(2);
    expect(mockReplace).toHaveBeenCalledWith("/login?error=account_deleted");
  });

  it("should stop after four failed attempts (one initial call plus three retries), never call signOut a fifth time, and never redirect", async () => {
    jest.useFakeTimers();
    const signOutSpy = jest
      .spyOn(GoTrueClient.prototype, "signOut")
      .mockRejectedValue(new Error("network down"));
    mockProfile({ deletedAt: new Date("2026-01-01T00:00:00.000Z") });

    renderWithClient(<DeletedAccountGuard />);

    await jest.runAllTimersAsync();

    expect(signOutSpy).toHaveBeenCalledTimes(4);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("should stop retrying after unmounting mid-backoff", async () => {
    jest.useFakeTimers();
    const signOutSpy = jest
      .spyOn(GoTrueClient.prototype, "signOut")
      .mockRejectedValue(new Error("network down"));
    mockProfile({ deletedAt: new Date("2026-01-01T00:00:00.000Z") });

    const { unmount } = renderWithClient(<DeletedAccountGuard />);

    await jest.advanceTimersByTimeAsync(0);
    expect(signOutSpy).toHaveBeenCalledTimes(1);

    unmount();

    await jest.runAllTimersAsync();

    expect(signOutSpy).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
  });
});

/**
 * @jest-environment jsdom
 */

import "@testing-library/jest-dom";
import * as nextNavigationHooksMock from "@/tests/mocks/nextNavigationHooksMock";

jest.mock("next/navigation", () => nextNavigationHooksMock);
jest.mock("@/hooks/useCurrentUserProfile", () => ({
  useCurrentUserProfile: jest.fn(),
}));

import { render, screen } from "@testing-library/react";
import { Header } from "@/components/Header";
import { useCurrentUserProfile } from "@/hooks/useCurrentUserProfile";
import { SupabaseReadError } from "@/lib/supabase/errors";

const mockUseCurrentUserProfile = useCurrentUserProfile as jest.MockedFunction<
  typeof useCurrentUserProfile
>;

const FAKE_PROFILE = { id: "user-1", name: "Jane Doe", avatarUrl: null };

afterEach(() => {
  jest.clearAllMocks();
});

describe("Header profile identity", () => {
  it("should render a loading skeleton while the profile is loading", () => {
    mockUseCurrentUserProfile.mockReturnValue({
      data: undefined,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useCurrentUserProfile>);

    render(<Header onMenuClick={jest.fn()} />);

    expect(
      screen.getByRole("status", { name: "Loading user profile" }),
    ).toBeInTheDocument();
  });

  it("should render the profile name and avatar on success", () => {
    mockUseCurrentUserProfile.mockReturnValue({
      data: FAKE_PROFILE,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useCurrentUserProfile>);

    render(<Header onMenuClick={jest.fn()} />);

    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
  });

  it("should render a login link for a sessionExpired error", () => {
    mockUseCurrentUserProfile.mockReturnValue({
      data: undefined,
      isError: true,
      error: new SupabaseReadError({
        error: "Your session has expired. Log in again to continue.",
        errorKind: "sessionExpired",
      }),
    } as unknown as ReturnType<typeof useCurrentUserProfile>);

    render(<Header onMenuClick={jest.fn()} />);

    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute(
      "href",
      "/login",
    );
  });

  it("should render a dash placeholder for a non-session error", () => {
    mockUseCurrentUserProfile.mockReturnValue({
      data: undefined,
      isError: true,
      error: new SupabaseReadError({
        error: "Couldn't connect. Check your connection and try again.",
        errorKind: null,
      }),
    } as unknown as ReturnType<typeof useCurrentUserProfile>);

    render(<Header onMenuClick={jest.fn()} />);

    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Log in" })).not.toBeInTheDocument();
  });
});

describe("Header page title", () => {
  beforeEach(() => {
    mockUseCurrentUserProfile.mockReturnValue({
      data: FAKE_PROFILE,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useCurrentUserProfile>);
  });

  it.each([
    ["/", "Dashboard"],
    ["/projects", "Projects"],
    ["/projects/123", "Projects"],
    ["/profile", "Profile"],
    ["/some-unknown-route", "Dashboard"],
  ])("should show %s as %s", (pathname, expectedTitle) => {
    nextNavigationHooksMock.mockUsePathname.mockReturnValue(pathname);

    render(<Header onMenuClick={jest.fn()} />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      expectedTitle,
    );
  });
});

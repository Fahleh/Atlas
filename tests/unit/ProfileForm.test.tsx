/**
 * @jest-environment jsdom
 */

import "@testing-library/jest-dom";

jest.mock("@/hooks/useCurrentUser", () => ({ useCurrentUser: jest.fn() }));
jest.mock("@/hooks/useCurrentUserProfile", () => ({
  useCurrentUserProfile: jest.fn(),
}));
jest.mock("@/features/profile/profileActions", () => {
  const actual = jest.requireActual("@/features/profile/profileActions");
  return { ...actual, updateProfile: jest.fn() };
});

import { act, fireEvent, screen } from "@testing-library/react";
import { ProfileForm } from "@/features/profile/ProfileForm";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useCurrentUserProfile } from "@/hooks/useCurrentUserProfile";
import { updateProfile } from "@/features/profile/profileActions";
import { renderWithClient } from "@/tests/mocks/queryClient";
import { SupabaseReadError } from "@/lib/supabase/errors";

const mockUseCurrentUser = useCurrentUser as jest.MockedFunction<typeof useCurrentUser>;
const mockUseCurrentUserProfile = useCurrentUserProfile as jest.MockedFunction<
  typeof useCurrentUserProfile
>;
const mockUpdateProfile = updateProfile as jest.MockedFunction<typeof updateProfile>;

const FAKE_PROFILE = { id: "user-1", name: "Jane Doe", avatarUrl: null };

function setUp({
  profile,
  isError = false,
  error = null as SupabaseReadError | null,
  refetch = jest.fn(),
}: {
  profile: typeof FAKE_PROFILE | undefined;
  isError?: boolean;
  error?: SupabaseReadError | null;
  refetch?: jest.Mock;
}) {
  mockUseCurrentUser.mockReturnValue({
    data: { id: "user-1" },
  } as unknown as ReturnType<typeof useCurrentUser>);
  mockUseCurrentUserProfile.mockReturnValue({
    data: profile,
    isError,
    error,
    refetch,
  } as unknown as ReturnType<typeof useCurrentUserProfile>);
  return { refetch };
}

function buildFile({
  type = "image/png",
  sizeBytes = 1024,
  name = "avatar.png",
}: { type?: string; sizeBytes?: number; name?: string } = {}): File {
  return new File([new Uint8Array(sizeBytes)], name, { type });
}

beforeAll(() => {
  URL.createObjectURL = jest.fn(() => "blob:mock-preview");
  URL.revokeObjectURL = jest.fn();
});

afterEach(() => {
  jest.clearAllMocks();
});

describe("ProfileForm loading/error", () => {
  it("should render a loading skeleton while the profile is loading", () => {
    setUp({ profile: undefined });
    renderWithClient(<ProfileForm />);

    expect(screen.getByRole("status", { name: "Loading profile" })).toBeInTheDocument();
  });

  it("should render an error with a retry that calls refetch", () => {
    const { refetch } = setUp({
      profile: undefined,
      isError: true,
      error: new SupabaseReadError({ error: "Couldn't connect.", errorKind: null }),
    });
    renderWithClient(<ProfileForm />);

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});

describe("ProfileForm dirty-state gating", () => {
  it("should disable Save when nothing has changed", () => {
    setUp({ profile: FAKE_PROFILE });
    renderWithClient(<ProfileForm />);

    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("should enable Save after editing the name, and call updateProfile on submit", async () => {
    setUp({ profile: FAKE_PROFILE });
    mockUpdateProfile.mockResolvedValue({ error: null, errorKind: null });
    renderWithClient(<ProfileForm />);

    fireEvent.change(screen.getByLabelText("Display name"), {
      target: { value: "Jane Smith" },
    });
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save" }));
    });

    expect(mockUpdateProfile).toHaveBeenCalledWith(
      "user-1",
      { name: "Jane Smith", avatarFile: undefined },
      expect.anything(),
    );
  });
});

describe("ProfileForm avatar staging", () => {
  it("should stage a valid file, show a preview name, and enable Save", () => {
    setUp({ profile: FAKE_PROFILE });
    renderWithClient(<ProfileForm />);

    fireEvent.change(screen.getByLabelText("Profile photo"), {
      target: { files: [buildFile({ name: "new-avatar.png" })] },
    });

    expect(screen.getByText("Staged: new-avatar.png")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
  });

  it("should reject an invalid file type without staging it", () => {
    setUp({ profile: FAKE_PROFILE });
    renderWithClient(<ProfileForm />);

    fireEvent.change(screen.getByLabelText("Profile photo"), {
      target: { files: [buildFile({ type: "application/pdf" })] },
    });

    expect(
      screen.getByText("Photo must be a JPEG, PNG, or WEBP image."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/^Staged:/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });
});

describe("ProfileForm save outcomes", () => {
  it("should show the error banner when updateProfile fails", async () => {
    setUp({ profile: FAKE_PROFILE });
    mockUpdateProfile.mockResolvedValue({
      error: "Couldn't connect. Check your connection and try again.",
      errorKind: null,
    });
    renderWithClient(<ProfileForm />);

    fireEvent.change(screen.getByLabelText("Display name"), {
      target: { value: "Jane Smith" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save" }));
    });

    expect(
      screen.getByText("Couldn't connect. Check your connection and try again."),
    ).toBeInTheDocument();
  });

  it("should show the success banner after a successful save", async () => {
    setUp({ profile: FAKE_PROFILE });
    mockUpdateProfile.mockResolvedValue({ error: null, errorKind: null });
    renderWithClient(<ProfileForm />);

    fireEvent.change(screen.getByLabelText("Display name"), {
      target: { value: "Jane Smith" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save" }));
    });

    expect(screen.getByText("Profile updated.")).toBeInTheDocument();
  });
});

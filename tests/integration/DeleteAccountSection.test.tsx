/** @jest-environment ./tests/mocks/hookTestEnvironment.ts */
import "@/jest.setup";
import "@testing-library/jest-dom";

import * as nextNavigationHooksMock from "@/tests/mocks/nextNavigationHooksMock";

jest.mock("next/navigation", () => nextNavigationHooksMock);
jest.mock("@/features/profile/profileActions", () => {
  const actual = jest.requireActual("@/features/profile/profileActions");
  return { ...actual, deleteAccount: jest.fn() };
});

import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { GoTrueClient } from "@supabase/auth-js";
import { DeleteAccountSection } from "@/features/profile/DeleteAccountSection";
import { deleteAccount } from "@/features/profile/profileActions";
import { renderWithClient } from "@/tests/mocks/queryClient";
import { mockLiveSession, type GetClaimsResult } from "@/tests/mocks/getClaims";
import { server } from "@/tests/mocks/server";
import { SUPABASE_URL } from "@/tests/mocks/handlers/baseUrl";
import { mockPush } from "@/tests/mocks/nextNavigationHooksMock";

const mockDeleteAccount = deleteAccount as jest.MockedFunction<typeof deleteAccount>;

const ACCOUNT_EMAIL = "user@example.com";

/**
 * mockLiveSession's claims carry only `sub`, no email, since most tests
 * never need it. DeleteAccountSection's type-to-confirm field checks the
 * claims email specifically, so tests that exercise it need a claims
 * object with email present.
 */
function mockLiveSessionWithEmail(sub: string, email: string) {
  return jest.spyOn(GoTrueClient.prototype, "getClaims").mockResolvedValue({
    data: { claims: { sub, email }, header: {}, signature: new Uint8Array() },
    error: null,
  } as GetClaimsResult);
}

function mockNoBlockingProjects() {
  server.use(
    http.get(`${SUPABASE_URL}/rest/v1/projects`, () => HttpResponse.json([])),
  );
}

function mockBlockingProjects(
  projects: { id: string; name: string }[],
) {
  server.use(
    http.get(`${SUPABASE_URL}/rest/v1/projects`, () =>
      HttpResponse.json(
        projects.map((p) => ({
          id: p.id,
          name: p.name,
          project_members: [{ user_id: "someone-else" }],
        })),
      ),
    ),
  );
}

afterEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

describe("DeleteAccountSection", () => {
  it("should hide the confirm field entirely and list the offending projects when blocked", async () => {
    mockLiveSession("owner-1");
    mockBlockingProjects([{ id: "project-1", name: "Shared Project" }]);

    renderWithClient(<DeleteAccountSection />);

    await waitFor(() =>
      expect(screen.getByText("Shared Project")).toBeInTheDocument(),
    );

    expect(
      screen.queryByLabelText(/Type your account email/),
    ).not.toBeInTheDocument();
  });

  it("should show the confirm field, disabled until the email matches exactly", async () => {
    mockLiveSessionWithEmail("owner-1", ACCOUNT_EMAIL);
    mockNoBlockingProjects();

    renderWithClient(<DeleteAccountSection />);

    const input = await screen.findByLabelText(/Type your account email/);
    const button = screen.getByRole("button", { name: "Delete account" });

    expect(button).toBeDisabled();

    fireEvent.change(input, { target: { value: "wrong@example.com" } });
    expect(button).toBeDisabled();

    fireEvent.change(input, { target: { value: ACCOUNT_EMAIL } });
    expect(button).toBeEnabled();
  });

  it("should call deleteAccount and redirect to /login on success", async () => {
    mockLiveSessionWithEmail("owner-1", ACCOUNT_EMAIL);
    mockNoBlockingProjects();
    mockDeleteAccount.mockResolvedValue({ error: null, errorKind: null });

    renderWithClient(<DeleteAccountSection />);

    const input = await screen.findByLabelText(/Type your account email/);
    fireEvent.change(input, { target: { value: ACCOUNT_EMAIL } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Delete account" }));
    });

    expect(mockDeleteAccount).toHaveBeenCalledWith("owner-1", expect.anything());
    expect(mockPush).toHaveBeenCalledWith("/login");
  });

  it("should show the returned error and not redirect on failure", async () => {
    mockLiveSessionWithEmail("owner-1", ACCOUNT_EMAIL);
    mockNoBlockingProjects();
    mockDeleteAccount.mockResolvedValue({
      error: "You don't have permission to perform that action.",
      errorKind: "forbidden",
    });

    renderWithClient(<DeleteAccountSection />);

    const input = await screen.findByLabelText(/Type your account email/);
    fireEvent.change(input, { target: { value: ACCOUNT_EMAIL } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Delete account" }));
    });

    expect(
      screen.getByText("You don't have permission to perform that action."),
    ).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });
});

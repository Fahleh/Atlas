import "@/jest.setup";

import * as nextHeadersMock from "@/tests/mocks/nextHeadersMock";
import * as nextNavigationMock from "@/tests/mocks/nextNavigationMock";

jest.mock("next/headers", () => nextHeadersMock);
jest.mock("next/navigation", () => nextNavigationMock);

import { updatePassword } from "@/app/(auth)/update-password/actions";
import {
  SESSION_COOKIE_NAME,
  buildSessionCookieValue,
} from "@/tests/mocks/supabaseSessionCookie";

afterEach(() => {
  nextHeadersMock.__resetCookies();
  jest.clearAllMocks();
});

function buildFormData(fields: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value);
  }
  return formData;
}

describe("updatePassword", () => {
  it("should require both fields", async () => {
    const result = await updatePassword(
      { error: null, sessionExpired: false, success: false },
      buildFormData({ password: "", confirmPassword: "" }),
    );

    expect(result).toEqual({
      error: "Both fields are required.",
      sessionExpired: false,
      success: false,
    });
  });

  it("should reject a password shorter than the minimum", async () => {
    const result = await updatePassword(
      { error: null, sessionExpired: false, success: false },
      buildFormData({ password: "short1", confirmPassword: "short1" }),
    );

    expect(result).toEqual({
      error: "Password must be at least 8 characters long.",
      sessionExpired: false,
      success: false,
    });
  });

  it("should reject mismatched passwords", async () => {
    const result = await updatePassword(
      { error: null, sessionExpired: false, success: false },
      buildFormData({
        password: "password123",
        confirmPassword: "somethingElse123",
      }),
    );

    expect(result).toEqual({
      error: "Passwords do not match.",
      sessionExpired: false,
      success: false,
    });
  });

  it("should set sessionExpired, not a generic error, when there is no session", async () => {
    // No cookie seeded: updateUser() throws AuthSessionMissingError before
    // any network call, the same way an expired or already-consumed
    // recovery link would behave for a real user.
    const result = await updatePassword(
      { error: null, sessionExpired: false, success: false },
      buildFormData({ password: "password123", confirmPassword: "password123" }),
    );

    expect(result).toEqual({
      error: "Your session has expired.",
      sessionExpired: true,
      success: false,
    });
  });

  it("should succeed and clear sessionExpired when a valid session exists", async () => {
    nextHeadersMock.__setCookie(SESSION_COOKIE_NAME, buildSessionCookieValue());

    const result = await updatePassword(
      { error: null, sessionExpired: false, success: false },
      buildFormData({ password: "password123", confirmPassword: "password123" }),
    );

    expect(result).toEqual({ error: null, sessionExpired: false, success: true });
  });
});

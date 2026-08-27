import "@/jest.setup";

import * as nextHeadersMock from "@/tests/mocks/nextHeadersMock";
import * as nextNavigationMock from "@/tests/mocks/nextNavigationMock";

jest.mock("next/headers", () => nextHeadersMock);
jest.mock("next/navigation", () => nextNavigationMock);

import { http } from "msw";
import { login } from "@/app/(auth)/login/actions";
import { redirect } from "next/navigation";
import { server } from "@/tests/mocks/server";
import { authError } from "@/tests/mocks/authError";
import { SUPABASE_URL } from "@/tests/mocks/handlers/baseUrl";

afterEach(() => {
  jest.clearAllMocks();
});

function buildFormData(fields: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value);
  }
  return formData;
}

describe("login", () => {
  it("should return a validation error and never call Supabase when email and password are blank", async () => {
    let tokenCalled = false;
    server.use(
      http.post(`${SUPABASE_URL}/auth/v1/token`, () => {
        tokenCalled = true;
        return new Response(null, { status: 200 });
      }),
    );

    const result = await login(
      { error: null },
      buildFormData({ email: "  ", password: "  " }),
    );

    expect(result).toEqual({
      error: "Email and password are required.",
    });
    expect(tokenCalled).toBe(false);
    expect(redirect).not.toHaveBeenCalled();
  });

  it("should return a specific message for an unconfirmed email, without redirecting", async () => {
    server.use(
      http.post(`${SUPABASE_URL}/auth/v1/token`, () =>
        authError({ code: "email_not_confirmed" }, 400),
      ),
    );

    const result = await login(
      { error: null },
      buildFormData({ email: "user@example.com", password: "password123" }),
    );

    expect(result).toEqual({
      error: "Please confirm your email before signing in.",
    });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("should redirect to / when signInWithPassword succeeds with no redirectTo", async () => {
    await expect(
      login(
        { error: null },
        buildFormData({ email: "user@example.com", password: "password123" }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(redirect).toHaveBeenCalledWith("/");
  });

  it("should redirect to a same-origin relative redirectTo on success", async () => {
    await expect(
      login(
        { error: null },
        buildFormData({
          email: "user@example.com",
          password: "password123",
          redirectTo: "/projects?project=abc",
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(redirect).toHaveBeenCalledWith("/projects?project=abc");
  });

  it("should fall back to / for a different-origin redirectTo, not follow it", async () => {
    await expect(
      login(
        { error: null },
        buildFormData({
          email: "user@example.com",
          password: "password123",
          redirectTo: "https://attacker.example.com/phish",
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(redirect).toHaveBeenCalledWith("/");
  });

  it("should fall back to / for a malformed redirectTo that throws when parsed", async () => {
    // See docs/decisions.md ("Why loginAction.test.ts's malformed-redirectTo
    // test uses an unclosed IPv6-bracket host").
    await expect(
      login(
        { error: null },
        buildFormData({
          email: "user@example.com",
          password: "password123",
          redirectTo: "http://[invalid",
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(redirect).toHaveBeenCalledWith("/");
  });
});

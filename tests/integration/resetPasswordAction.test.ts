import "@/jest.setup";

import * as nextHeadersMock from "@/tests/mocks/nextHeadersMock";
import * as nextNavigationMock from "@/tests/mocks/nextNavigationMock";

jest.mock("next/headers", () => nextHeadersMock);
jest.mock("next/navigation", () => nextNavigationMock);

import { http, HttpResponse } from "msw";
import { requestPasswordReset } from "@/app/(auth)/reset-password/actions";
import { server } from "@/tests/mocks/server";
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

describe("requestPasswordReset", () => {
  it("should return a validation error and never call Supabase for a malformed email", async () => {
    let recoverCalled = false;
    server.use(
      http.post(`${SUPABASE_URL}/auth/v1/recover`, () => {
        recoverCalled = true;
        return HttpResponse.json({});
      }),
    );

    const result = await requestPasswordReset(
      { error: null, success: false, email: "" },
      buildFormData({ email: "not-an-email" }),
    );

    expect(result).toEqual({
      error: "Please enter a valid email address.",
      success: false,
      email: "not-an-email",
    });
    expect(recoverCalled).toBe(false);
  });

  it("should return a validation error for a blank email", async () => {
    const result = await requestPasswordReset(
      { error: null, success: false, email: "" },
      buildFormData({ email: "  " }),
    );

    expect(result).toEqual({
      error: "Please enter a valid email address.",
      success: false,
      email: "  ",
    });
  });

  it("should succeed for a valid, real request", async () => {
    const result = await requestPasswordReset(
      { error: null, success: false, email: "" },
      buildFormData({ email: "user@example.com" }),
    );

    expect(result).toEqual({ error: null, success: true, email: "" });
  });

  it("should return the exact same success state whether or not the account exists", async () => {
    // Asserts the action's output is identical for both cases, not just
    // that the code has no visible branch.
    const existingAccountResult = await requestPasswordReset(
      { error: null, success: false, email: "" },
      buildFormData({ email: "existing@example.com" }),
    );

    const noAccountResult = await requestPasswordReset(
      { error: null, success: false, email: "" },
      buildFormData({ email: "no-such-account@example.com" }),
    );

    expect(existingAccountResult).toEqual(noAccountResult);
    expect(existingAccountResult).toEqual({
      error: null,
      success: true,
      email: "",
    });
  });
});

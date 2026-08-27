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
      { error: null, success: false },
      buildFormData({ email: "not-an-email" }),
    );

    expect(result).toEqual({
      error: "Please enter a valid email address.",
      success: false,
    });
    expect(recoverCalled).toBe(false);
  });

  it("should return a validation error for a blank email", async () => {
    const result = await requestPasswordReset(
      { error: null, success: false },
      buildFormData({ email: "  " }),
    );

    expect(result).toEqual({
      error: "Please enter a valid email address.",
      success: false,
    });
  });

  it("should succeed for a valid, real request", async () => {
    const result = await requestPasswordReset(
      { error: null, success: false },
      buildFormData({ email: "user@example.com" }),
    );

    expect(result).toEqual({ error: null, success: true });
  });

  it("should return the exact same success state whether or not the account exists", async () => {
    // The real non-enumeration guarantee lives in Supabase's own /recover
    // endpoint (identical response either way), but this action must not
    // reintroduce a leak by branching on the result — so this asserts the
    // action's own output is identical for both cases, not just that the
    // code has no visible branch.
    const existingAccountResult = await requestPasswordReset(
      { error: null, success: false },
      buildFormData({ email: "existing@example.com" }),
    );

    const noAccountResult = await requestPasswordReset(
      { error: null, success: false },
      buildFormData({ email: "no-such-account@example.com" }),
    );

    expect(existingAccountResult).toEqual(noAccountResult);
    expect(existingAccountResult).toEqual({ error: null, success: true });
  });
});

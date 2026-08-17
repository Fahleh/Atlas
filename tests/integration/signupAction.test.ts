import "@/jest.setup";

import * as nextHeadersMock from "@/tests/mocks/nextHeadersMock";
import * as nextNavigationMock from "@/tests/mocks/nextNavigationMock";

jest.mock("next/headers", () => nextHeadersMock);
jest.mock("next/navigation", () => nextNavigationMock);

import { http } from "msw";
import { signup } from "@/app/(auth)/signup/actions";
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

const validFields = {
  name: "Jane Doe",
  email: "jane@example.com",
  password: "password123",
  confirmPassword: "password123",
};

describe("signup", () => {
  it("should require all fields", async () => {
    const result = await signup(
      { error: null, accountExists: false, success: false },
      buildFormData({ ...validFields, name: "" }),
    );

    expect(result).toEqual({
      error: "All fields are required.",
      accountExists: false,
      success: false,
    });
  });

  it("should reject a name shorter than 3 characters", async () => {
    const result = await signup(
      { error: null, accountExists: false, success: false },
      buildFormData({ ...validFields, name: "Al" }),
    );

    expect(result).toEqual({
      error: "Name must be at least 3 characters long.",
      accountExists: false,
      success: false,
    });
  });

  it("should reject a name longer than 100 characters", async () => {
    const result = await signup(
      { error: null, accountExists: false, success: false },
      buildFormData({ ...validFields, name: "A".repeat(101) }),
    );

    expect(result).toEqual({
      error: "Name must be at most 100 characters long.",
      accountExists: false,
      success: false,
    });
  });

  it("should reject an invalid email format", async () => {
    const result = await signup(
      { error: null, accountExists: false, success: false },
      buildFormData({ ...validFields, email: "not-an-email" }),
    );

    expect(result).toEqual({
      error: "Please enter a valid email address.",
      accountExists: false,
      success: false,
    });
  });

  it("should reject a password shorter than 8 characters", async () => {
    const result = await signup(
      { error: null, accountExists: false, success: false },
      buildFormData({ ...validFields, password: "short1", confirmPassword: "short1" }),
    );

    expect(result).toEqual({
      error: "Password must be at least 8 characters long.",
      accountExists: false,
      success: false,
    });
  });

  it("should reject mismatched passwords", async () => {
    const result = await signup(
      { error: null, accountExists: false, success: false },
      buildFormData({ ...validFields, confirmPassword: "somethingElse123" }),
    );

    expect(result).toEqual({
      error: "Passwords do not match.",
      accountExists: false,
      success: false,
    });
  });

  it("should set accountExists and a specific message for user_already_exists", async () => {
    server.use(
      http.post(`${SUPABASE_URL}/auth/v1/signup`, () =>
        authError({ code: "user_already_exists" }, 422),
      ),
    );

    const result = await signup(
      { error: null, accountExists: false, success: false },
      buildFormData(validFields),
    );

    expect(result).toEqual({
      error:
        "An account with this email already exists. Try logging in instead.",
      accountExists: true,
      success: false,
    });
  });

  it("should return success with no error and no accountExists on success", async () => {
    const result = await signup(
      { error: null, accountExists: false, success: false },
      buildFormData(validFields),
    );

    expect(result).toEqual({
      error: null,
      accountExists: false,
      success: true,
    });
    expect(redirect).not.toHaveBeenCalled();
  });
});

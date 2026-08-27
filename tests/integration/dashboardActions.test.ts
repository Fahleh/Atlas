import "@/jest.setup";

import * as nextHeadersMock from "@/tests/mocks/nextHeadersMock";
import * as nextNavigationMock from "@/tests/mocks/nextNavigationMock";

jest.mock("next/headers", () => nextHeadersMock);
jest.mock("next/navigation", () => nextNavigationMock);

import { http, HttpResponse } from "msw";
import { logout } from "@/app/(dashboard)/actions";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE_NAME,
  buildSessionCookieValue,
} from "@/tests/mocks/supabaseSessionCookie";
import { server } from "@/tests/mocks/server";
import { SUPABASE_URL } from "@/tests/mocks/handlers/baseUrl";

afterEach(() => {
  nextHeadersMock.__resetCookies();
  jest.clearAllMocks();
});

describe("logout", () => {
  it("should sign out and redirect to /login when signOut succeeds", async () => {
    nextHeadersMock.__setCookie(SESSION_COOKIE_NAME, buildSessionCookieValue());

    await expect(logout()).rejects.toThrow("NEXT_REDIRECT");

    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("should discard a signOut error and still redirect to /login", async () => {
    nextHeadersMock.__setCookie(SESSION_COOKIE_NAME, buildSessionCookieValue());
    server.use(
      http.post(`${SUPABASE_URL}/auth/v1/logout`, () =>
        HttpResponse.json(
          { code: 500, msg: "Something went wrong signing out" },
          { status: 500 },
        ),
      ),
    );

    await expect(logout()).rejects.toThrow("NEXT_REDIRECT");

    expect(redirect).toHaveBeenCalledWith("/login");
  });
});

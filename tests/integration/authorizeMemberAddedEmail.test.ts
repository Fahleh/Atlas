import "@/jest.setup";

import { http, HttpResponse } from "msw";
import { createClient } from "@/lib/supabase/client";
import { authorizeMemberAddedEmail } from "@/lib/authorizeMemberAddedEmail";
import { server } from "@/tests/mocks/server";
import { SUPABASE_URL } from "@/tests/mocks/handlers/baseUrl";
import { FAKE_PROJECT_ROW } from "@/tests/mocks/handlers/projects";
import { FAKE_PROFILE_ROW } from "@/tests/mocks/handlers/profiles";
import { mockNoSession, mockLiveSession } from "@/tests/mocks/getClaims";

const OWNER_ID = FAKE_PROJECT_ROW.owner_id;

describe("authorizeMemberAddedEmail", () => {
  // Shared projects/profiles MSW handlers return arrays; .single() needs
  // a bare object, so this file overrides both defaults.
  beforeEach(() => {
    server.use(
      http.get(`${SUPABASE_URL}/rest/v1/projects`, () =>
        HttpResponse.json(FAKE_PROJECT_ROW),
      ),
      http.get(`${SUPABASE_URL}/rest/v1/profiles`, () =>
        HttpResponse.json(FAKE_PROFILE_ROW),
      ),
    );
  });

  it("returns 401 when there is no session", async () => {
    mockNoSession();
    const supabase = createClient();

    const result = await authorizeMemberAddedEmail(supabase, {
      projectId: FAKE_PROJECT_ROW.id,
      email: "someone@example.com",
    });

    expect(result).toEqual({
      authorized: false,
      status: 401,
      error: "Not authenticated.",
    });
  });

  it("returns 403 when the caller is not the project's owner", async () => {
    mockLiveSession("not-the-owner");
    const supabase = createClient();

    const result = await authorizeMemberAddedEmail(supabase, {
      projectId: FAKE_PROJECT_ROW.id,
      email: "someone@example.com",
    });

    expect(result).toEqual({
      authorized: false,
      status: 403,
      error: "Not authorized.",
    });
  });

  it("returns 403 when the owner checks out but the email has no Atlas account", async () => {
    mockLiveSession(OWNER_ID);
    server.use(
      http.post(`${SUPABASE_URL}/rest/v1/rpc/lookup_user_id_by_email`, () =>
        HttpResponse.json(null),
      ),
    );
    const supabase = createClient();

    const result = await authorizeMemberAddedEmail(supabase, {
      projectId: FAKE_PROJECT_ROW.id,
      email: "nobody@example.com",
    });

    expect(result).toEqual({
      authorized: false,
      status: 403,
      error: "No member found for that email.",
    });
  });

  it("returns 403 when the account exists but isn't actually a member of this project", async () => {
    mockLiveSession(OWNER_ID);
    server.use(
      http.get(`${SUPABASE_URL}/rest/v1/project_members`, () =>
        HttpResponse.json([]),
      ),
    );
    const supabase = createClient();

    const result = await authorizeMemberAddedEmail(supabase, {
      projectId: FAKE_PROJECT_ROW.id,
      email: "not-a-member@example.com",
    });

    expect(result).toEqual({
      authorized: false,
      status: 403,
      error: "That person is not a member of this project.",
    });
  });

  it("authorizes and returns the actor and project name when every check passes", async () => {
    mockLiveSession(OWNER_ID);
    const supabase = createClient();

    const result = await authorizeMemberAddedEmail(supabase, {
      projectId: FAKE_PROJECT_ROW.id,
      email: "member@example.com",
    });

    expect(result).toEqual({
      authorized: true,
      actorName: "Fake User",
      projectName: "Fake Project",
    });
  });
});

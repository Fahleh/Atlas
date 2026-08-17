import { http, HttpResponse } from "msw";
import { SUPABASE_URL } from "./baseUrl";

/**
 * Default happy-path handlers for GoTrue (Supabase Auth) endpoints used by
 * login/signup/logout. Response shapes here are a reasonable inference from
 * GoTrue's documented session/user shape, not independently confirmed against
 * a real Network tab capture yet — flagged per CLAUDE.md's confirmed-vs-inferred
 * rule. Revisit if a real auth test surfaces a shape mismatch.
 */
const fakeUser = {
  id: "00000000-0000-4000-8000-000000000000",
  email: "user@example.com",
  app_metadata: {},
  user_metadata: {},
  aud: "authenticated",
  created_at: new Date().toISOString(),
};

const fakeSession = {
  access_token: "fake-access-token",
  token_type: "bearer",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  refresh_token: "fake-refresh-token",
  user: fakeUser,
};

export const authHandlers = [
  http.post(`${SUPABASE_URL}/auth/v1/token`, () => {
    return HttpResponse.json(fakeSession);
  }),
  http.post(`${SUPABASE_URL}/auth/v1/signup`, () => {
    // Atlas requires email confirmation before a session exists — real
    // signUp() returns { user, session: null } for this configuration, not
    // a live session. Confirmed by signupAction.test.ts's own success test
    // (asserts no redirect happens) and the doc comment on signup() itself
    // ("no redirect, as the session does not exist until the user confirms
    // their email"). Returning fakeSession here would mismatch Atlas's
    // actual, deliberate account-creation flow.
    return HttpResponse.json({ user: fakeUser, session: null });
  }),
  http.post(`${SUPABASE_URL}/auth/v1/logout`, () => {
    return new HttpResponse(null, { status: 204 });
  }),
];

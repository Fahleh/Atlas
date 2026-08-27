import { http, HttpResponse } from "msw";
import { SUPABASE_URL } from "./baseUrl";

/**
 * Default happy-path handlers for GoTrue (Supabase Auth) endpoints used by
 * login/signup/logout/password reset. Every shape below was captured
 * directly from the local Supabase stack (signInWithPassword, signUp,
 * signOut, resetPasswordForEmail, updateUser each triggered for real and
 * the literal response read back), not inferred from documentation.
 */
const fakeIdentity = {
  identity_id: "00000000-0000-4000-8000-000000000003",
  id: "00000000-0000-4000-8000-000000000000",
  user_id: "00000000-0000-4000-8000-000000000000",
  identity_data: {
    email: "user@example.com",
    email_verified: false,
    phone_verified: false,
    sub: "00000000-0000-4000-8000-000000000000",
  },
  provider: "email",
  last_sign_in_at: "2026-01-01T00:00:00.000Z",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  email: "user@example.com",
};

// GoTrue's /token and /user response, confirmed real: a bare user object
// with confirmation/sign-in fields set, not the smaller signup shape below.
const fakeUser = {
  id: "00000000-0000-4000-8000-000000000000",
  aud: "authenticated",
  role: "authenticated",
  email: "user@example.com",
  email_confirmed_at: "2026-01-01T00:00:00.000Z",
  phone: "",
  confirmed_at: "2026-01-01T00:00:00.000Z",
  last_sign_in_at: "2026-01-01T00:00:00.000Z",
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: {},
  identities: [fakeIdentity],
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  is_anonymous: false,
};

const fakeSession = {
  access_token: "fake-access-token",
  token_type: "bearer",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  refresh_token: "fake-refresh-token",
  user: fakeUser,
  weak_password: null,
};

// GoTrue's real /signup response when confirmation is required: a bare user
// object, no confirmed_at yet, confirmation_sent_at instead. Confirmed real.
const fakeUnconfirmedUser = {
  id: "00000000-0000-4000-8000-000000000000",
  aud: "authenticated",
  role: "authenticated",
  email: "user@example.com",
  phone: "",
  confirmation_sent_at: "2026-01-01T00:00:00.000Z",
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: {},
  identities: [fakeIdentity],
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  is_anonymous: false,
};

export const authHandlers = [
  http.post(`${SUPABASE_URL}/auth/v1/token`, () => {
    return HttpResponse.json(fakeSession);
  }),
  http.post(`${SUPABASE_URL}/auth/v1/signup`, () => {
    // Atlas requires email confirmation, so signUp() never gets a live
    // session here; see signup()'s own doc comment in actions.ts.
    return HttpResponse.json(fakeUnconfirmedUser);
  }),
  http.post(`${SUPABASE_URL}/auth/v1/logout`, () => {
    return new HttpResponse(null, { status: 204 });
  }),
  http.post(`${SUPABASE_URL}/auth/v1/recover`, () => {
    // Confirmed real: an empty JSON 200 either way, whether or not the
    // email matches an actual account, GoTrue's non-enumeration guarantee.
    return HttpResponse.json({});
  }),
  http.put(`${SUPABASE_URL}/auth/v1/user`, () => {
    return HttpResponse.json(fakeUser);
  }),
];

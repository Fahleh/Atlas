import { GoTrueClient } from "@supabase/auth-js";

// Matches getClaims()'s real return type without depending on auth-js's
// unexported JwtHeader/JwtPayload types.
export type GetClaimsResult = Awaited<ReturnType<GoTrueClient["getClaims"]>>;

// Real getClaims() returns { data: null, error: null } when getSession()
// finds no session at all, confirmed by reading GoTrueClient.js directly.
export function mockNoSession() {
  return jest
    .spyOn(GoTrueClient.prototype, "getClaims")
    .mockResolvedValue({ data: null, error: null } as GetClaimsResult);
}

export function mockLiveSession(sub = "user-123") {
  return jest.spyOn(GoTrueClient.prototype, "getClaims").mockResolvedValue({
    data: { claims: { sub }, header: {}, signature: new Uint8Array() },
    error: null,
  } as GetClaimsResult);
}

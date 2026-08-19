/**
 * Fixed E2E test account identities. Shared between the seed script
 * (tests/e2e/seed.ts) and any spec that needs to log in as one of these.
 */
export const PRIMARY_ACCOUNT = {
  email: "e2e-primary@atlas.test",
  password: "e2e-primary-password-1",
};

export const SECONDARY_ACCOUNT = {
  email: "e2e-secondary@atlas.test",
  password: "e2e-secondary-password-1",
};

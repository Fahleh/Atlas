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

// Separate from PRIMARY/SECONDARY because password-reset.spec.ts mutates
// this one's password; globalSetup's db reset restores the seed every run.
export const RESET_ACCOUNT = {
  email: "e2e-reset@atlas.test",
  password: "e2e-reset-password-1",
};

// Both get soft-deleted by account-deletion-login-block.spec.ts. Kept
// separate from each other so the password-grant and refresh-grant cases
// each get a never-shared account, and separate from PRIMARY/SECONDARY/
// RESET so no other spec's account gets mutated.
export const DELETED_ACCOUNT = {
  email: "e2e-deleted-login@atlas.test",
  password: "e2e-deleted-login-password-1",
};

export const DELETED_ACCOUNT_REFRESH = {
  email: "e2e-deleted-refresh@atlas.test",
  password: "e2e-deleted-refresh-password-1",
};

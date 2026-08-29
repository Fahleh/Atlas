/**
 * Matches a same-origin Next.js static chunk URL, the only script URLs
 * the root Trusted Types policy allows through createScriptURL. Covers
 * both the local build's plain /_next/static/chunks/ shape and Vercel's
 * build adapter's /_next/static/immutable/chunks/ shape. See
 * docs/decisions.md, "Trusted Types createScriptURL".
 */
export const TRUSTED_TYPES_CHUNK_URL_SOURCE =
  "^/_next/static/(?:immutable/)?chunks/[a-zA-Z0-9_-]+\\.js(\\?.*)?$";

export const TRUSTED_TYPES_CHUNK_URL_PATTERN = new RegExp(
  TRUSTED_TYPES_CHUNK_URL_SOURCE,
);

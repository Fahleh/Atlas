import { TRUSTED_TYPES_CHUNK_URL_PATTERN } from "@/lib/trustedTypesChunkUrlPattern";

describe("TRUSTED_TYPES_CHUNK_URL_PATTERN", () => {
  describe("real chunk URLs it must accept", () => {
    it("should match the local build's plain chunks shape", () => {
      expect(TRUSTED_TYPES_CHUNK_URL_PATTERN.test("/_next/static/chunks/abc123.js")).toBe(true);
    });

    it("should match the real Vercel immutable chunks shape", () => {
      expect(
        TRUSTED_TYPES_CHUNK_URL_PATTERN.test("/_next/static/immutable/chunks/17tuxysuvqwd2.js"),
      ).toBe(true);
    });

    it("should match a real hash containing both underscore and hyphen", () => {
      expect(
        TRUSTED_TYPES_CHUNK_URL_PATTERN.test("/_next/static/immutable/chunks/24q4u2letpv-_.js"),
      ).toBe(true);
    });

    it("should match a chunk URL with a query string", () => {
      expect(TRUSTED_TYPES_CHUNK_URL_PATTERN.test("/_next/static/chunks/abc123.js?v=1")).toBe(true);
    });
  });

  describe("adversarial URLs it must reject", () => {
    it("should reject a URL missing the chunks segment", () => {
      expect(TRUSTED_TYPES_CHUNK_URL_PATTERN.test("/_next/static/immutable/abc123.js")).toBe(false);
    });

    it("should reject the wrong file extension", () => {
      expect(TRUSTED_TYPES_CHUNK_URL_PATTERN.test("/_next/static/chunks/abc123.css")).toBe(false);
    });

    it("should reject a URL with no extension at all", () => {
      expect(TRUSTED_TYPES_CHUNK_URL_PATTERN.test("/_next/static/chunks/abc123")).toBe(false);
    });

    it("should reject a directory traversal attempt", () => {
      expect(
        TRUSTED_TYPES_CHUNK_URL_PATTERN.test("/_next/static/chunks/../../../etc/passwd.js"),
      ).toBe(false);
    });

    it("should reject an absolute URL pointing at a different origin", () => {
      expect(
        TRUSTED_TYPES_CHUNK_URL_PATTERN.test("https://evil.com/_next/static/chunks/abc123.js"),
      ).toBe(false);
    });

    it("should reject a protocol-relative URL pointing at a different origin", () => {
      expect(
        TRUSTED_TYPES_CHUNK_URL_PATTERN.test("//evil.com/_next/static/chunks/abc123.js"),
      ).toBe(false);
    });

    it("should reject a bare javascript URI", () => {
      expect(TRUSTED_TYPES_CHUNK_URL_PATTERN.test("javascript:alert(1)")).toBe(false);
    });

    it("should reject immutable in the wrong position, after chunks instead of before", () => {
      expect(
        TRUSTED_TYPES_CHUNK_URL_PATTERN.test("/_next/static/chunks/immutable/abc123.js"),
      ).toBe(false);
    });

    it("should reject a chunks-like segment that isn't actually chunks", () => {
      expect(
        TRUSTED_TYPES_CHUNK_URL_PATTERN.test("/_next/static/chunksmalicious/abc123.js"),
      ).toBe(false);
    });

    it("should reject an empty hash before the extension", () => {
      expect(TRUSTED_TYPES_CHUNK_URL_PATTERN.test("/_next/static/chunks/.js")).toBe(false);
    });

    it("should reject disallowed characters inside the hash", () => {
      expect(
        TRUSTED_TYPES_CHUNK_URL_PATTERN.test(
          "/_next/static/chunks/abc<script>alert(1)</script>.js",
        ),
      ).toBe(false);
    });

    it("should reject a URL missing the required leading slash", () => {
      expect(TRUSTED_TYPES_CHUNK_URL_PATTERN.test("_next/static/chunks/abc123.js")).toBe(false);
    });
  });
});

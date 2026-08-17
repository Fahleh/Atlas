import type { SupabaseClient } from "@supabase/supabase-js";
import { PostgrestError } from "@supabase/postgrest-js";
import {
  interpretSupabaseWriteError,
  interpretSupabaseReadError,
  SupabaseReadError,
} from "@/lib/supabase/errors";

const buildPostgrestError = (code: string, message = "Postgrest error") =>
  new PostgrestError({ message, details: "", hint: "", code });

const buildSupabaseClient = (getClaims: jest.Mock) =>
  ({ auth: { getClaims } }) as unknown as SupabaseClient;

describe("interpretSupabaseWriteError", () => {
  it("should return sessionExpired for PGRST301 without calling getClaims", async () => {
    const getClaims = jest.fn();
    const error = buildPostgrestError("PGRST301");

    const result = await interpretSupabaseWriteError(
      error,
      buildSupabaseClient(getClaims),
    );

    expect(result).toEqual({
      error: "Your session has expired. Log in again to continue.",
      errorKind: "sessionExpired",
    });
    expect(getClaims).not.toHaveBeenCalled();
  });

  it("should return sessionExpired for 42501 when getClaims finds no claims", async () => {
    const getClaims = jest.fn().mockResolvedValue({ data: { claims: null } });
    const error = buildPostgrestError("42501");

    const result = await interpretSupabaseWriteError(
      error,
      buildSupabaseClient(getClaims),
    );

    expect(result).toEqual({
      error: "Your session has expired. Log in again to continue.",
      errorKind: "sessionExpired",
    });
    expect(getClaims).toHaveBeenCalledTimes(1);
  });

  it("should return sessionExpired for 42501 when getClaims returns no data at all", async () => {
    const getClaims = jest.fn().mockResolvedValue({ data: null });
    const error = buildPostgrestError("42501");

    const result = await interpretSupabaseWriteError(
      error,
      buildSupabaseClient(getClaims),
    );

    expect(result).toEqual({
      error: "Your session has expired. Log in again to continue.",
      errorKind: "sessionExpired",
    });
  });

  it("should return forbidden for 42501 when getClaims finds a live session", async () => {
    const getClaims = jest
      .fn()
      .mockResolvedValue({ data: { claims: { sub: "user-123" } } });
    const error = buildPostgrestError("42501");

    const result = await interpretSupabaseWriteError(
      error,
      buildSupabaseClient(getClaims),
    );

    expect(result).toEqual({
      error: "You don't have permission to perform that action.",
      errorKind: "forbidden",
    });
    expect(getClaims).toHaveBeenCalledTimes(1);
  });

  it("should pass through an unmatched error code's message and a null errorKind", async () => {
    const getClaims = jest.fn();
    const error = buildPostgrestError("23505", "duplicate key value");

    const result = await interpretSupabaseWriteError(
      error,
      buildSupabaseClient(getClaims),
    );

    expect(result).toEqual({ error: "duplicate key value", errorKind: null });
    expect(getClaims).not.toHaveBeenCalled();
  });
});

describe("interpretSupabaseReadError", () => {
  it("should return sessionExpired for PGRST301", () => {
    const error = buildPostgrestError("PGRST301");

    const result = interpretSupabaseReadError(error);

    expect(result).toEqual({
      error: "Your session has expired. Log in again to continue.",
      errorKind: "sessionExpired",
    });
  });

  it("should collapse 42501 into the generic connection message, not a forbidden case", () => {
    const error = buildPostgrestError("42501");

    const result = interpretSupabaseReadError(error);

    expect(result).toEqual({
      error: "Couldn't connect. Check your connection and try again.",
      errorKind: null,
    });
  });

  it("should collapse any other Postgrest code into the same generic message", () => {
    const error = buildPostgrestError("23505", "duplicate key value");

    const result = interpretSupabaseReadError(error);

    expect(result).toEqual({
      error: "Couldn't connect. Check your connection and try again.",
      errorKind: null,
    });
  });

  it("should handle a network/timeout error with no .code at all", () => {
    const result = interpretSupabaseReadError(new Error("Network request failed"));

    expect(result).toEqual({
      error: "Couldn't connect. Check your connection and try again.",
      errorKind: null,
    });
  });

  it("should not throw on a null or undefined error", () => {
    expect(interpretSupabaseReadError(null)).toEqual({
      error: "Couldn't connect. Check your connection and try again.",
      errorKind: null,
    });
    expect(interpretSupabaseReadError(undefined)).toEqual({
      error: "Couldn't connect. Check your connection and try again.",
      errorKind: null,
    });
  });

  it("should stay synchronous, returning a result directly rather than a Promise", () => {
    const result = interpretSupabaseReadError(buildPostgrestError("PGRST301"));

    expect(result).not.toBeInstanceOf(Promise);
  });
});

describe("SupabaseReadError", () => {
  it("should carry the interpreted message, name, and errorKind", () => {
    const error = new SupabaseReadError({
      error: "Your session has expired. Log in again to continue.",
      errorKind: "sessionExpired",
    });

    expect(error.message).toBe(
      "Your session has expired. Log in again to continue.",
    );
    expect(error.name).toBe("SupabaseReadError");
    expect(error.errorKind).toBe("sessionExpired");
  });

  it("should be a real Error instance", () => {
    const error = new SupabaseReadError({
      error: "Couldn't connect. Check your connection and try again.",
      errorKind: null,
    });

    expect(error).toBeInstanceOf(Error);
  });
});

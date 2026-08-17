import {
  toCamelCase,
  parseDates,
  getInitials,
  getMemberAvatarPaletteIndex,
  isValidEmail,
  AVATAR_PALETTE_SIZE,
} from "@/lib/utils";

describe("toCamelCase", () => {
  it("should convert snake_case keys to camelCase", () => {
    const result = toCamelCase<{ projectId: string; dueDate: null }>({
      project_id: "1",
      due_date: null,
    });

    expect(result).toEqual({ projectId: "1", dueDate: null });
  });

  it("should leave an already-camelCase key unchanged", () => {
    const result = toCamelCase<{ ownerId: string }>({ ownerId: "1" });

    expect(result).toEqual({ ownerId: "1" });
  });

  it("should convert a key with multiple underscores", () => {
    const result = toCamelCase<{ createdByUserId: string }>({
      created_by_user_id: "1",
    });

    expect(result).toEqual({ createdByUserId: "1" });
  });

  it("should return an empty object for an empty object", () => {
    expect(toCamelCase({})).toEqual({});
  });

  it("should carry non-string values through untouched", () => {
    const nested = { a: 1 };
    const result = toCamelCase<{ nestedValue: typeof nested; listValue: number[] }>(
      { nested_value: nested, list_value: [1, 2, 3] },
    );

    expect(result.nestedValue).toBe(nested);
    expect(result.listValue).toEqual([1, 2, 3]);
  });
});

describe("parseDates", () => {
  it("should convert a valid ISO timestamp string to a Date", () => {
    const result = parseDates<{ dueDate: Date | null }>(
      { dueDate: "2026-12-31T00:00:00.000Z" } as unknown as {
        dueDate: Date | null;
      },
      ["dueDate"],
    );

    expect(result.dueDate).toBeInstanceOf(Date);
    expect(result.dueDate?.toISOString()).toBe("2026-12-31T00:00:00.000Z");
  });

  it("should keep a null value as null, not epoch", () => {
    const result = parseDates({ dueDate: null }, ["dueDate"]);

    expect(result.dueDate).toBeNull();
  });

  it("should leave a key untouched when it isn't in dateKeys", () => {
    const result = parseDates({ dueDate: "2026-12-31T00:00:00.000Z" }, []);

    expect(result.dueDate).toBe("2026-12-31T00:00:00.000Z");
  });

  it("should produce an Invalid Date for a malformed date string, not throw", () => {
    const result = parseDates<{ dueDate: Date | null }>(
      { dueDate: "not-a-date" } as unknown as { dueDate: Date | null },
      ["dueDate"],
    );

    expect(result.dueDate).toBeInstanceOf(Date);
    expect(Number.isNaN(result.dueDate?.getTime() ?? NaN)).toBe(true);
  });

  it("should not mutate the original object and should handle multiple keys", () => {
    const original = {
      dueDate: "2026-12-31T00:00:00.000Z",
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    const clone = { ...original };

    const result = parseDates(original, ["dueDate", "createdAt"]);

    expect(original).toEqual(clone);
    expect(result.dueDate).toBeInstanceOf(Date);
    expect(result.createdAt).toBeInstanceOf(Date);
  });
});

describe("getInitials", () => {
  it("should return two initials for a two-word name", () => {
    expect(getInitials("Atlas Tasks")).toBe("AT");
  });

  it("should return one initial for a single word", () => {
    expect(getInitials("Atlas")).toBe("A");
  });

  it("should cap at three initials for more than three words", () => {
    expect(getInitials("A B C D")).toBe("ABC");
  });

  it("should collapse extra whitespace between words", () => {
    expect(getInitials("  Atlas   Tasks  ")).toBe("AT");
  });

  it("should uppercase lowercase input", () => {
    expect(getInitials("atlas tasks")).toBe("AT");
  });

  it("should return an empty string for an empty name", () => {
    expect(getInitials("")).toBe("");
  });
});

describe("getMemberAvatarPaletteIndex", () => {
  it("should return the same index for the same initials across calls", () => {
    const first = getMemberAvatarPaletteIndex("AT");
    const second = getMemberAvatarPaletteIndex("AT");

    expect(first).toBe(second);
  });

  it("should stay within the valid palette range", () => {
    const index = getMemberAvatarPaletteIndex("ZQ");

    expect(index).toBeGreaterThanOrEqual(0);
    expect(index).toBeLessThan(AVATAR_PALETTE_SIZE);
  });

  it("should return index 0 for an empty initials string", () => {
    expect(getMemberAvatarPaletteIndex("")).toBe(0);
  });

  it("should work for a single-character initials string", () => {
    const index = getMemberAvatarPaletteIndex("A");

    expect(index).toBeGreaterThanOrEqual(0);
    expect(index).toBeLessThan(AVATAR_PALETTE_SIZE);
  });
});

describe("isValidEmail", () => {
  it("should return true for a valid standard email", () => {
    expect(isValidEmail("user@domain.com")).toBe(true);
  });

  it("should return false when missing an @", () => {
    expect(isValidEmail("userdomain.com")).toBe(false);
  });

  it("should return false when missing a TLD", () => {
    expect(isValidEmail("user@domain")).toBe(false);
  });

  it("should accept consecutive dots in the local part, since this is UX-only validation", () => {
    expect(isValidEmail("user..name@domain.com")).toBe(true);
  });

  it("should return false for an empty string", () => {
    expect(isValidEmail("")).toBe(false);
  });

  it("should return false for a whitespace-padded valid email, since it isn't trimmed first", () => {
    expect(isValidEmail(" user@domain.com ")).toBe(false);
  });
});

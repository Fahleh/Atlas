import {
  truncateDescription,
  calculateProgressPercent,
} from "@/features/projects/projectUtils";

describe("truncateDescription", () => {
  it("should return a string shorter than maxLength unchanged", () => {
    expect(truncateDescription("Short description", 72)).toBe(
      "Short description",
    );
  });

  it("should return a string exactly at maxLength unchanged", () => {
    const description = "a".repeat(72);

    expect(truncateDescription(description, 72)).toBe(description);
  });

  it("should truncate and append an ellipsis when over maxLength", () => {
    const description = "a".repeat(80);

    const result = truncateDescription(description, 72);

    expect(result).toBe("a".repeat(72) + "…");
  });

  it("should trim trailing whitespace before appending the ellipsis", () => {
    const description = "a".repeat(71) + " " + "b".repeat(10);

    const result = truncateDescription(description, 72);

    expect(result).toBe("a".repeat(71) + "…");
  });

  it("should apply the default 72-char limit when maxLength is omitted", () => {
    const description = "a".repeat(80);

    const result = truncateDescription(description);

    expect(result).toBe("a".repeat(72) + "…");
  });

  it("should use a custom maxLength override", () => {
    const description = "a".repeat(20);

    const result = truncateDescription(description, 10);

    expect(result).toBe("a".repeat(10) + "…");
  });
});

describe("calculateProgressPercent", () => {
  it("should return 0 when total is 0, even though done === total is technically true", () => {
    expect(calculateProgressPercent({ done: 0, total: 0 })).toBe(0);
  });

  it("should return 0 when done is 0 and total is greater than 0", () => {
    expect(calculateProgressPercent({ done: 0, total: 10 })).toBe(0);
  });

  it("should return 100 when done equals total and total is greater than 0", () => {
    expect(calculateProgressPercent({ done: 10, total: 10 })).toBe(100);
  });

  it("should clamp up to 1 rather than round down to 0", () => {
    expect(calculateProgressPercent({ done: 1, total: 1000 })).toBe(1);
  });

  it("should clamp down to 99 rather than round up to 100", () => {
    expect(calculateProgressPercent({ done: 999, total: 1000 })).toBe(99);
  });
});

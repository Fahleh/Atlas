import { computeAppendPosition, computeDropPosition } from "@/lib/positionUtils";

describe("computeDropPosition", () => {
  it("should return the starting gap when the list is empty", () => {
    const result = computeDropPosition({ before: null, after: null });

    expect(result).toBe(1000);
  });

  it("should return a position before the first row when dropped at the start", () => {
    const result = computeDropPosition({ before: null, after: 2000 });

    expect(result).toBe(1000);
  });

  it("should return a position after the last row when dropped at the end", () => {
    const result = computeDropPosition({ before: 2000, after: null });

    expect(result).toBe(3000);
  });

  it("should return the midpoint when dropped between two rows", () => {
    const result = computeDropPosition({ before: 1000, after: 2000 });

    expect(result).toBe(1500);
  });

  it("should return null when the gap has collapsed below the renormalization threshold", () => {
    const result = computeDropPosition({ before: 1000, after: 1000.5 });

    expect(result).toBeNull();
  });
});

describe("computeAppendPosition", () => {
  it("should return the starting gap when the project has no tasks yet", () => {
    const result = computeAppendPosition(null);

    expect(result).toBe(1000);
  });

  it("should return one gap past the current highest position", () => {
    const result = computeAppendPosition(3000);

    expect(result).toBe(4000);
  });
});

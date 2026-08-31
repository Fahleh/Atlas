import { getBaseUrl } from "@/lib/baseUrl";

describe("getBaseUrl", () => {
  const originalVercel = process.env.VERCEL;
  const originalBaseUrl = process.env.NEXT_PUBLIC_BASE_URL;

  afterEach(() => {
    if (originalVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = originalVercel;

    if (originalBaseUrl === undefined) delete process.env.NEXT_PUBLIC_BASE_URL;
    else process.env.NEXT_PUBLIC_BASE_URL = originalBaseUrl;
  });

  it("returns NEXT_PUBLIC_BASE_URL when running on Vercel and it is set", () => {
    process.env.VERCEL = "1";
    process.env.NEXT_PUBLIC_BASE_URL = "https://atlas-murex-nine.vercel.app";

    expect(getBaseUrl()).toBe("https://atlas-murex-nine.vercel.app");
  });

  it("throws when running on Vercel and NEXT_PUBLIC_BASE_URL is unset", () => {
    process.env.VERCEL = "1";
    delete process.env.NEXT_PUBLIC_BASE_URL;

    expect(() => getBaseUrl()).toThrow(
      "NEXT_PUBLIC_BASE_URL must be set when running on Vercel.",
    );
  });

  it("returns NEXT_PUBLIC_BASE_URL when not on Vercel and it is set", () => {
    delete process.env.VERCEL;
    process.env.NEXT_PUBLIC_BASE_URL = "https://staging.example.com";

    expect(getBaseUrl()).toBe("https://staging.example.com");
  });

  it("falls back to localhost when not on Vercel and the var is unset", () => {
    delete process.env.VERCEL;
    delete process.env.NEXT_PUBLIC_BASE_URL;

    expect(getBaseUrl()).toBe("http://localhost:3000");
  });
});

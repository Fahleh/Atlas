import {
  getSmtpConfig,
  isPermanentSmtpFailure,
} from "@/lib/email/sendMemberAddedEmail";

describe("isPermanentSmtpFailure", () => {
  it("returns true for EAUTH", () => {
    expect(isPermanentSmtpFailure({ code: "EAUTH" })).toBe(true);
  });

  it("returns true for a 5xx responseCode", () => {
    expect(isPermanentSmtpFailure({ responseCode: 550 })).toBe(true);
    expect(isPermanentSmtpFailure({ responseCode: 500 })).toBe(true);
  });

  it("returns false for a 4xx responseCode", () => {
    expect(isPermanentSmtpFailure({ responseCode: 421 })).toBe(false);
  });

  it("returns false for a connection error with no responseCode", () => {
    expect(isPermanentSmtpFailure({ code: "ECONNECTION" })).toBe(false);
  });

  it("returns false for an error with neither code nor responseCode", () => {
    expect(isPermanentSmtpFailure({})).toBe(false);
  });
});

describe("getSmtpConfig", () => {
  const originalEnv = {
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASSWORD: process.env.SMTP_PASSWORD,
    SMTP_FROM: process.env.SMTP_FROM,
  };

  beforeEach(() => {
    process.env.SMTP_HOST = "smtp.office365.com";
    process.env.SMTP_PORT = "587";
    process.env.SMTP_USER = "notifications@example.com";
    process.env.SMTP_PASSWORD = "a-real-password";
    process.env.SMTP_FROM = "notifications@example.com";
  });

  afterEach(() => {
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("returns the parsed config when all five vars are set", () => {
    expect(getSmtpConfig()).toEqual({
      host: "smtp.office365.com",
      port: 587,
      user: "notifications@example.com",
      password: "a-real-password",
      from: "notifications@example.com",
    });
  });

  it("throws naming SMTP_HOST when it's missing", () => {
    delete process.env.SMTP_HOST;
    expect(() => getSmtpConfig()).toThrow("SMTP_HOST is not set.");
  });

  it("throws naming SMTP_PORT when it's missing", () => {
    delete process.env.SMTP_PORT;
    expect(() => getSmtpConfig()).toThrow("SMTP_PORT is not set.");
  });

  it("throws naming SMTP_USER when it's missing", () => {
    delete process.env.SMTP_USER;
    expect(() => getSmtpConfig()).toThrow("SMTP_USER is not set.");
  });

  it("throws naming SMTP_PASSWORD when it's missing", () => {
    delete process.env.SMTP_PASSWORD;
    expect(() => getSmtpConfig()).toThrow("SMTP_PASSWORD is not set.");
  });

  it("throws naming SMTP_FROM when it's missing", () => {
    delete process.env.SMTP_FROM;
    expect(() => getSmtpConfig()).toThrow("SMTP_FROM is not set.");
  });
});

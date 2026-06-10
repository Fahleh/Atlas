import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  testMatch: ["**/tests/**/*.test.ts", "**/tests/**/*.test.tsx"],
  fakeTimers: {
    enableGlobally: false,
  },
};

export default config;

import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: {
    "\\.module\\.css$": "<rootDir>/tests/mocks/cssModuleMock.js",
    "^@/(.*)$": "<rootDir>/$1",
  },
  testMatch: ["**/tests/**/*.test.ts", "**/tests/**/*.test.tsx"],
  collectCoverage: false,
  collectCoverageFrom: [
    "lib/**/*.{ts,tsx}",
    "features/**/*.{ts,tsx}",
    "components/**/*.{ts,tsx}",
    "hooks/**/*.{ts,tsx}",
    "providers/**/*.{ts,tsx}",
    "!**/*.d.ts",
  ],
  fakeTimers: {
    enableGlobally: false,
  },
};

export default config;

import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: {
    "\\.module\\.css$": "<rootDir>/tests/mocks/cssModuleMock.js",
    "^@/(.*)$": "<rootDir>/$1",
  },
  // msw's Node build depends on ESM-only packages with no CJS export
  // (rettime, until-async, @open-draft). Opt them back into transformation.
  transformIgnorePatterns: [
    "node_modules/(?!(rettime|until-async|@open-draft)/)",
  ],
  transform: {
    "^.+\\.[tj]sx?$": ["ts-jest", {}],
    "^.+\\.mjs$": ["ts-jest", {}],
  },
  testMatch: ["**/tests/**/*.test.ts", "**/tests/**/*.test.tsx"],
  setupFiles: ["<rootDir>/tests/setupEnv.ts"],
  collectCoverage: false,
  collectCoverageFrom: [
    "lib/**/*.{ts,tsx}",
    "features/**/*.{ts,tsx}",
    "components/**/*.{ts,tsx}",
    "hooks/**/*.{ts,tsx}",
    "providers/**/*.{ts,tsx}",
    "!**/*.d.ts",
  ],
  // jsdom's default "browser" export condition resolves "msw/node" wrong.
  // Forcing "node" fixes it, harmless for existing jsdom suites.
  testEnvironmentOptions: {
    customExportConditions: ["node"],
  },
  fakeTimers: {
    enableGlobally: false,
  },
};

export default config;

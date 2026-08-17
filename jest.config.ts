import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: {
    "\\.module\\.css$": "<rootDir>/tests/mocks/cssModuleMock.js",
    "^@/(.*)$": "<rootDir>/$1",
  },
  // msw's Node build depends on a few ESM-only packages with no CJS export
  // condition (rettime, until-async, @open-draft/deferred-promise). Jest
  // ignores node_modules by default, so these opt back into transformation,
  // run through ts-jest (tsconfig's isolatedModules: true already covers
  // plain JS/mjs syntax) so their `import` statements become `require`
  // calls Jest's CJS runtime can load.
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
  fakeTimers: {
    enableGlobally: false,
  },
};

export default config;

import type { Config } from "jest";
import nextJest from "next/jest.js";

/**
 * Jest config via next/jest so TypeScript path aliases (@/*) resolve like the app.
 * Canonical command: npm test (constitution).
 */
const createJestConfig = nextJest({
  dir: "./",
});

const config: Config = {
  testEnvironment: "node",
  clearMocks: true,
  testMatch: [
    "**/__tests__/**/*.test.ts",
    "**/__tests__/**/*.test.tsx",
    "**/*.test.ts",
    "**/*.test.tsx",
  ],
  modulePathIgnorePatterns: ["<rootDir>/.next/"],
  // Constitution: ≥80% line/branch on domain rules, validators, services only.
  // Pages, API routes, assets, and DB wiring helpers are out of the gate.
  collectCoverageFrom: [
    "lib/rules/**/*.{ts,tsx}",
    "lib/validators/**/*.{ts,tsx}",
    "lib/services/**/*.{ts,tsx}",
    "!lib/**/*.test.{ts,tsx}",
    "!lib/**/index.ts",
    "!lib/services/player-routes.ts",
    "!**/node_modules/**",
  ],
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/.next/",
    "/app/",
    "/public/",
    "page\\.tsx$",
    "layout\\.tsx$",
    "route\\.ts$",
  ],
  coverageThreshold: {
    global: {
      lines: 80,
      branches: 80,
      functions: 80,
      statements: 80,
    },
  },
};

export default createJestConfig(config);

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
  testMatch: ["**/__tests__/**/*.test.ts", "**/__tests__/**/*.test.tsx", "**/*.test.ts", "**/*.test.tsx"],
  modulePathIgnorePatterns: ["<rootDir>/.next/"],
};

export default createJestConfig(config);

module.exports = {
  testTimeout: 15000,
  collectCoverageFrom: [
    'src/plugin-system/**/*.{ts,tsx}',
    '!src/plugin-system/core/plugin-loader.ts',
    '!src/plugin-system/marketplace/auto-updater.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/__tests__/**',
  ],
  coverageThreshold: {
    global: {
      branches: 40,
      functions: 30,
      lines: 45,
      statements: 45,
    },
  },
  projects: [
    {
      displayName: 'unit',
      preset: 'ts-jest',
      testEnvironment: 'jsdom',
      roots: ['<rootDir>/src', '<rootDir>/src-electron'],
      testMatch: ['**/__tests__/**/*.+(spec|test).ts?(x)', '**/?(*.)+(spec|test).ts?(x)'],
      testPathIgnorePatterns: ['/node_modules/', '/src/__tests__/setup.ts'],
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@electron/(.*)$': '<rootDir>/src-electron/$1',
      },
      setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
    },
    {
      displayName: 'integration',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/test/integration/scenarios/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/test/integration/setup.ts'],
      globals: {
        'ts-jest': { tsconfig: { strict: false } },
      },
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
    },
  ],
};

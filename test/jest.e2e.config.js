/** @type {import('ts-jest').JestConfigWithTsJest} */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  clearMocks: true,
  roots: ['<rootDir>/e2e'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: './test/tsconfig.test.json' }],
    '^.+\\.(js)$': 'babel-jest'
  },
  transformIgnorePatterns: [],
  setupFilesAfterEnv: ['./setupTests.ts'],
  testMatch: ['<rootDir>/e2e/proxy-node-fetch.e2e.test.ts']
};

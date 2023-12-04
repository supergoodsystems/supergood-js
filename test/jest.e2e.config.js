/** @type {import('ts-jest').JestConfigWithTsJest} */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  clearMocks: true,
  roots: ['<rootDir>/e2e'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
    '^.+\\.(js)$': 'babel-jest'
  },
  transformIgnorePatterns: [],
  setupFilesAfterEnv: ['./setupTests.ts'],
};

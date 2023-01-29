/** @type {import('ts-jest').JestConfigWithTsJest} */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFiles: [`${__dirname}/.jest/setEnvVars.js`],
  clearMocks: true,
  roots: ['<rootDir>/src']
};

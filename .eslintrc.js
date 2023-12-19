module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es2021: true,
    node: true,
    'jest/globals': true
  },
  extends: ['eslint:recommended', 'prettier'],
  overrides: [],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    allowImportExportEverywhere: true
  },
  plugins: ['prettier', 'jest'],
  rules: {
    // 'indent': ['error', 2],
    // 'quotes': ['error', 'single'],
    // // we want to force semicolons
    // 'semi': ['error', 'always'],
    // // we want to avoid extraneous spaces
    // 'no-multi-spaces': ['error'],
    // 'max-len': ['error', 80],
    'prettier/prettier': 2
    // 'react/jsx-max-props-per-line': [
    //   1,
    //   {
    //     maximum: 1
    //   }
    // ]
  }
};

module.exports = {
  env: {
    browser: true,
    es6: true
  },
  extends: [
    'standard'
  ],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly'
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    // requireConfigFile: false,
    ecmaVersion: 2018,
    sourceType: 'module'
  },
  rules: {
    'brace-style': ['error', '1tbs'],
    curly: ['error', 'all']
  },
}

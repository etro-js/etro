module.exports = {
    'env': {
        'browser': true,
        'es6': true
    },
    'extends': [
        'standard'
    ],
    'globals': {
        'Atomics': 'readonly',
        'SharedArrayBuffer': 'readonly'
    },
    'parserOptions': {
        'ecmaVersion': 2018,
        'sourceType': 'module'
    },
    'plugins': [
        'html'
    ],
    'rules': {
        'brace-style': ['error', '1tbs', { 'allowSingleLine': false }],
        'curly': ['error', 'all']
    },
    'settings': {
      'html': {
        'indent': '+2'
      }
    }
}

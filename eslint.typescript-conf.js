const conf = require('./eslint.conf.js')
conf.extends.push('plugin:@typescript-eslint/recommended')
conf.parser = '@typescript-eslint/parser'
conf.plugins = ['@typescript-eslint']
module.exports = conf

const conf = require('./eslint.conf.js')
conf.env.mocha = conf.env.jasmine = true
conf.globals.vd = 'readonly'
module.exports = conf

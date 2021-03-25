const conf = require('./eslint.conf.js')
conf.globals.vd = 'readonly'
conf.plugins = ['html']
conf.settings = {
  html: {
    indent: '+2'
  }
}
module.exports = conf

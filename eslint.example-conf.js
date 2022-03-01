const conf = require('./eslint.conf.js')
conf.globals.etro = 'readonly'
conf.plugins = ['html']
conf.settings = {
  html: {
    indent: '+2'
  }
}
module.exports = conf

const conf = require('./eslint.conf.js')
conf.env.jasmine = true
conf.globals.define = 'readonly'
conf.globals.etro = 'readonly'

// Mocks
conf.globals.mockTime = 'readonly'
conf.globals.mockMediaElementSource = 'readonly'
conf.globals.mockAudioContext = 'readonly'
conf.globals.mockCanvas = 'readonly'
conf.globals.mockBaseEffect = 'readonly'
conf.globals.mockBaseLayer = 'readonly'
conf.globals.mockMovie = 'readonly'

module.exports = conf

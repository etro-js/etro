// Karma configuration
// Generated on Thu Sep 19 2019 02:05:06 GMT-0400 (Eastern Daylight Time)

const fs = require('fs')
let chromeBin = process.env.CHROME_BIN
if (!chromeBin) {
  try {
    chromeBin = require('puppeteer').executablePath()
  } catch (e) {}
}
if (!chromeBin || !fs.existsSync(chromeBin)) {
  if (process.platform === 'darwin' && fs.existsSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')) {
    chromeBin = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  }
}
process.env.CHROME_BIN = chromeBin

// Make sure TEST_SUITE is set
if (!process.env.TEST_SUITE) {
  console.error('TEST_SUITE environment variable must be set')
  process.exit(1)
}

module.exports = function (config) {
  config.set({

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',

    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['jasmine', 'karma-typescript'],

    // list of files / patterns to load in the browser
    files: [
      'src/**/*.ts',
      `spec/${process.env.TEST_SUITE}/**/*.ts`,
      { pattern: 'spec/assets/**/*', included: false }
    ],

    // list of files / patterns to exclude
    exclude: [
    ],

    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
      '**/*.ts': ['karma-typescript']
    },

    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['dots', 'karma-typescript'],

    // web server port
    port: 9876,

    // enable / disable colors in the output (reporters and logs)
    colors: true,

    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,

    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: true,

    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: (process.platform === 'darwin' && !fs.existsSync('/Applications/Firefox.app')) ? ['ChromeHeadlessWebGL'] : ['FirefoxHeadless'],

    customLaunchers: {
      'FirefoxHeadless': {
        base: 'Firefox',
        flags: ['-headless'],
        prefs: {
          'network.proxy.type': 0,
          'media.autoplay.default': 0  // Allow all autoplay
        }
      },
      'ChromeHeadlessWebGL': {
        base: 'ChromeHeadless',
        flags: [
          '--use-gl=angle',
          '--use-angle=swiftshader',
          '--no-sandbox',
          '--autoplay-policy=no-user-gesture-required'
        ]
      }
    },

    client: {
      captureConsole: true,
      jasmine: {
        timeoutInterval: 15000
      }
    },

    browserConsoleLogOptions: {
      level: 'log'
    },

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: true,

    // Concurrency level
    // how many browser should be started simultaneous
    concurrency: Infinity,

    karmaTypescriptConfig: {
      compilerOptions: {
        // Avoid type-checking third-party declaration packages in browser tests.
        skipLibCheck: true
      },
      bundlerOptions: {
        // Resemblejs only references the `canvas` dependency in the node
        // runtime. Since the tests are run in a browser, we need to exclude it
        // from the bundle to prevent false errors.
        exclude: ['canvas']
      }
    }
  })
}

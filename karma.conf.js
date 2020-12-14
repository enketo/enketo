module.exports = function(config) {
  process.env.CHROME_BIN = require('puppeteer').executablePath();
  process.env.TZ = 'America/Phoenix';
  config.set({
    frameworks: [
      'mocha'
    ],
    browsers: [
      'ChromeHeadless',
      'FirefoxHeadless',
    ],
    files: [
      'node_modules/chai/chai.js',
      'node_modules/lodash/lodash.js',
      'src/**/*.js',
      'test/**/*.spec.js'
    ],
    preprocessors: {
      'src/**/*.js': ['webpack'],
      'test/**/*.spec.js': ['webpack']
    },
    reporters: [
      'mocha',
      'coverage'
    ],
    singleRun: true,
    webpack: require('./webpack.test.config.js'),
    webpackMiddleware: {
      watchOptions: { poll: 100 }
    },
    coverageReporter: {
      type: 'lcov',
      subdir: '.'
    },
  });
};

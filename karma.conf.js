/* eslint-env node */
module.exports = function(config) {
  process.env.CHROME_BIN = require('puppeteer').executablePath();
  process.env.TZ = 'America/Phoenix';
  config.set({
    frameworks: [
      'mocha',
    ],
    browsers: [
      'ChromeHeadless',
      'FirefoxHeadless',
    ],
    files: [
      { pattern:'test/integration/index.js', watched:false },
    ],
    preprocessors: {
      'test/integration/index.js': ['webpack'],
    },
    webpack: {
      mode: 'development',
      devtool: false,
    },
  });
};
